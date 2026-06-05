"""
Rent reminder job — runs daily at 07:00 UTC.

Sends reminders:
  - 3 days before due_date (upcoming)
  - on due_date itself (due today)
  - 1 day after due_date (overdue)

Only sends if the charge is not yet paid or waived.
"""
import logging
from datetime import date, timedelta
import psycopg
import config
from email.sender import render, send_email

logger = logging.getLogger(__name__)

REMIND_DAYS_BEFORE = 3
REMIND_DAYS_AFTER = 1


def _get_remindable_charges(conn, today: date) -> list[dict]:
    target_dates = [
        today + timedelta(days=REMIND_DAYS_BEFORE),
        today,
        today - timedelta(days=REMIND_DAYS_AFTER),
    ]
    placeholders = ", ".join(["%s"] * len(target_dates))
    query = f"""
        SELECT
            rc.id            AS charge_id,
            rc.due_date,
            rc.amount_due,
            rc.currency,
            rc.amount_paid,
            rc.status,
            l.id             AS lease_id,
            t.name           AS tenant_name,
            t.email          AS tenant_email,
            u.label          AS unit_label
        FROM pm.rent_charges rc
        JOIN pm.leases l ON l.id = rc.lease_id
        JOIN pm.tenants t ON t.id = l.tenant_id
        JOIN pm.units u ON u.id = l.unit_id
        WHERE rc.due_date IN ({placeholders})
          AND rc.status NOT IN ('paid', 'waived')
          AND l.status = 'active'
    """
    with conn.cursor() as cur:
        cur.execute(query, target_dates)
        cols = [d[0] for d in cur.description]
        return [dict(zip(cols, row)) for row in cur.fetchall()]


def _label(charge: dict, today: date) -> str:
    delta = (charge["due_date"] - today).days
    if delta > 0:
        return f"due in {delta} day{'s' if delta != 1 else ''}"
    if delta == 0:
        return "due today"
    return f"{-delta} day{'s' if -delta != 1 else ''} overdue"


@config.celery_app.task(name="jobs.rent_reminders.run")
def run() -> None:
    today = date.today()
    sent = 0
    try:
        with psycopg.connect(config.DATABASE_URL) as conn:
            charges = _get_remindable_charges(conn, today)
            for ch in charges:
                try:
                    html = render(
                        "rent_reminder.html",
                        "en",
                        {
                            "tenant_name": ch["tenant_name"],
                            "unit_label": ch["unit_label"],
                            "due_date": ch["due_date"].strftime("%d %B %Y"),
                            "amount_due": f"{ch['currency']} {ch['amount_due']:.2f}",
                            "amount_paid": f"{ch['currency']} {ch['amount_paid']:.2f}",
                            "due_label": _label(ch, today),
                        },
                    )
                    send_email(
                        to=ch["tenant_email"],
                        subject=f"Rent reminder — {_label(ch, today)}",
                        html=html,
                    )
                    sent += 1
                except Exception:
                    logger.exception("Failed to send rent reminder for charge %s", ch["charge_id"])
    except Exception:
        logger.exception("rent_reminders: database error")
    logger.info("rent_reminders: sent %d reminder(s) for %s", sent, today)
