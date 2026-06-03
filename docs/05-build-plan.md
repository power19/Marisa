# 05 — Build Plan

Build in this order. Each milestone has an **exit criterion** — don't advance until it's met.
Cross-cutting services (worker, email, PDF, R2, auth) are introduced exactly when first needed,
then reused.

---

## M0 — Foundation
- `docker-compose.yml` with `postgres`, `directus`, `caddy`; `.env.example`.
- Directus up on Postgres; create roles (`admin`, `agent`, `registered_visitor`, `tenant`,
  `owner`); enable i18n locales `en/nl/srn` (default `en`).
- Configure **R2** as the Directus storage adapter.
- Define core collections from `docs/03`: `listings`, `locations` (seed districts),
  `listing_media`, `amenities`, `agents`. Set agent item-level permission (`agent_id = $CURRENT_USER`).

**Exit:** an admin can create a fully-attributed listing with media in the Directus admin, and
it persists with images in R2.

## M1 — Public listing site (read path)
- `web` (Next.js) service. Read-only Directus public role/token.
- Home, search/results (SSR), listing detail (ISR) with gallery, attributes, exact-pin map
  (Leaflet/MapLibre + OSM), embeds.
- i18n routing `en/nl/srn`; SEO (sitemap, `hreflang`, `schema.org/RealEstateListing`).
- Native multi-currency display.

**Exit:** a visitor can browse, filter, sort, and open a localized listing detail with a working
map; pages are server-rendered/ISR and indexable.

## M2 — Agents & public accounts
- Agent self-registration → email verification → **pending** → admin approval flow.
- Introduce **transactional email** (verification, approval notices).
- `registered_visitor` accounts; `saved_searches`.
- Introduce **background worker**; implement saved-search alert matching + emails.

**Exit:** an agent can self-register and be approved, then manage only their own listings; a
visitor can register, save a search, and receive a correct alert email.

## M3 — Contact & CRM
- Four contact channels (WhatsApp, phone, inquiry form, request-a-viewing) from `docs/04-F`.
- `inquiries`, `viewing_requests`; routing to agent + central inbox.
- CRM collections (`leads`, `lead_notes`, `lead_followups`); auto-create leads; board-by-stage
  admin view; follow-up reminders via the worker.
- Rate-limit public write endpoints.

**Exit:** an inquiry and a viewing request each notify the agent + central, create a linked lead,
and a due follow-up triggers a reminder.

## M4 — PM core (leases, rent, receipts)
- `pm` (FastAPI) service on the `pm` schema (Alembic). **Verify Directus tokens** (no new auth).
- Owners, units, tenants (restricted ID docs), leases; charge generation on activation.
- Manual payments; charge status logic; **PDF generation** for receipts; rent reminders via
  the worker.

**Exit:** activating a lease generates correct charges; recording a payment updates status and
produces a currency-correct receipt PDF in R2; reminders fire on schedule.

## M5 — Tenant portal & owner statements
- Tenant portal: view lease, payments + receipts, submit/track maintenance (photos to R2).
- `maintenance_tickets` workflow + notifications.
- `owner_statements` generation (PDF) + email delivery.

**Exit:** a tenant sees only their own data and can file a tracked maintenance ticket; an owner
statement reconciles to recorded payments and is emailed as a PDF.

## M6 — Hardening & launch
- Caddy TLS + Cloudflare in front; response caching; image/perf pass.
- Backups (`pg_dump` offsite); health checks; restart policies.
- Security review: rate limits, restricted tenant PII, no secrets committed.
- Content pages (About/Team, Buying/Selling/Renting, Expat, Contact, Privacy) localized.
- Register the **`.com`**, point DNS at Cloudflare, set canonical + redirects.

**Exit:** production deploy on the sized box, TLS live, backups running, all locales working,
launch checklist green.

---

## Parallel non-code track (unblocks M6 / branding)
- Decide brand **name** → register `.com` → logo + palette + typography.
- Source Sranantongo translations for UI strings + listing copy.
- Provide WhatsApp number(s), central inbox, and the first batch of real listings/photos.

## Suggested sequencing note
M0–M1 deliver a visible, indexable listing site early (the revenue/visibility part). M2–M3 add
acquisition (accounts, leads). M4–M5 deliver the PM differentiator. Keep each milestone
shippable so progress is demonstrable before the whole is done.
