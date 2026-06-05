"""
Saved-search alert job — runs every 15 minutes.

For each active saved_search, find listings created/updated since last_notified_at
that match the stored criteria_json. If matches found, send an alert email and
update last_notified_at.

Criteria JSON shape (mirrors the web search filter params):
  {
    "offer_type": "sale" | "rent" | null,
    "property_type": "residential" | ... | null,
    "location_id": int | null,
    "min_price": float | null,
    "max_price": float | null,
    "bedrooms": int | null,
    "furnished": "furnished" | "unfurnished" | "partially" | null,
    "keyword": str | null
  }
"""

import json
from datetime import datetime, timezone, timedelta
from decimal import Decimal

import psycopg
import psycopg.rows

import config
from config import celery_app
from email.sender import render, send_email

SITE_URL = config.SITE_URL


def _build_listing_query(criteria: dict) -> tuple[str, list]:
    conditions = ["l.status NOT IN ('sold', 'rented', 'archived')"]
    params: list = []

    if criteria.get("offer_type"):
        conditions.append(f"l.offer_type = ${len(params)+1}")
        params.append(criteria["offer_type"])

    if criteria.get("property_type"):
        conditions.append(f"l.property_type = ${len(params)+1}")
        params.append(criteria["property_type"])

    if criteria.get("location_id"):
        conditions.append(f"l.location_id = ${len(params)+1}")
        params.append(criteria["location_id"])

    if criteria.get("min_price") is not None:
        conditions.append(f"l.price_amount >= ${len(params)+1}")
        params.append(criteria["min_price"])

    if criteria.get("max_price") is not None:
        conditions.append(f"l.price_amount <= ${len(params)+1}")
        params.append(criteria["max_price"])

    if criteria.get("bedrooms") is not None:
        conditions.append(f"l.bedrooms >= ${len(params)+1}")
        params.append(criteria["bedrooms"])

    if criteria.get("furnished"):
        conditions.append(f"l.furnished = ${len(params)+1}")
        params.append(criteria["furnished"])

    if criteria.get("keyword"):
        kw = f"%{criteria['keyword']}%"
        conditions.append(f"(l.address ILIKE ${len(params)+1})")
        params.append(kw)

    # Only listings updated since the last notification
    conditions.append(f"l.updated_at > ${len(params)+1}")
    params.append(None)  # placeholder — replaced per search row

    where = " AND ".join(conditions)
    sql = f"""
        SELECT
            l.slug,
            COALESCE(lt.title, l.slug) AS title,
            loc.district AS location,
            l.price_amount,
            l.price_currency,
            l.price_on_request
        FROM listings l
        LEFT JOIN listings_translations lt
            ON lt.listings_id = l.id AND lt.languages_code = 'en'
        LEFT JOIN locations loc ON loc.id = l.location_id
        WHERE {where}
        ORDER BY l.updated_at DESC
        LIMIT 20
    """
    return sql, params


def _format_price(amount: Decimal | None, currency: str | None, on_request: bool) -> str:
    if on_request or amount is None:
        return "Price upon request"
    sym = {"USD": "$", "EUR": "€", "SRD": "SRD "}.get(currency or "USD", "")
    return f"{sym}{amount:,.0f}"


@celery_app.task(name="jobs.saved_search_alerts.run")
def run() -> None:
    with psycopg.connect(config.DATABASE_URL, row_factory=psycopg.rows.dict_row) as conn:
        searches = conn.execute(
            """
            SELECT ss.id, ss.user_id, ss.name, ss.criteria_json,
                   ss.alert_frequency, ss.last_notified_at,
                   du.email, du.first_name, du.last_name
            FROM saved_searches ss
            JOIN directus_users du ON du.id = ss.user_id
            WHERE ss.alert_frequency IS NOT NULL
              AND du.status = 'active'
            """
        ).fetchall()

    now = datetime.now(timezone.utc)

    for search in searches:
        freq = search["alert_frequency"]
        last = search["last_notified_at"]

        # Respect frequency gate
        if freq == "daily" and last and (now - last) < timedelta(hours=23):
            continue
        if freq == "weekly" and last and (now - last) < timedelta(days=6, hours=23):
            continue

        criteria = search["criteria_json"]
        if isinstance(criteria, str):
            criteria = json.loads(criteria)

        sql, params = _build_listing_query(criteria)
        # Replace the placeholder with the actual last_notified_at (or 24h ago for first run)
        cutoff = last or (now - timedelta(hours=24))
        params[-1] = cutoff

        with psycopg.connect(config.DATABASE_URL, row_factory=psycopg.rows.dict_row) as conn:
            listings = conn.execute(sql, params).fetchall()

            if not listings:
                continue

            user_name = search["first_name"] or search["email"].split("@")[0]
            listing_ctx = [
                {
                    "title": row["title"],
                    "location": row["location"] or "",
                    "price": _format_price(row["price_amount"], row["price_currency"], row["price_on_request"]),
                    "url": f"{SITE_URL}/en/listings/{row['slug']}",
                }
                for row in listings
            ]

            html = render(
                "alert.html",
                "en",
                {
                    "name": user_name,
                    "search_name": search["name"],
                    "count": len(listings),
                    "listings": listing_ctx,
                    "search_url": f"{SITE_URL}/en/search",
                    "unsubscribe_url": f"{SITE_URL}/en/account",
                },
            )

            send_email(
                to=search["email"],
                subject=f"New properties matching \"{search['name']}\" — Far East",
                html=html,
            )

            conn.execute(
                "UPDATE saved_searches SET last_notified_at = $1 WHERE id = $2",
                (now, search["id"]),
            )
            conn.commit()
