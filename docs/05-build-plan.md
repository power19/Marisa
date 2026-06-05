# 05 — Build Plan

Build in this order. Each milestone has an **exit criterion** — don't advance until it's met.
Cross-cutting services (worker, email, PDF, R2, auth) are introduced exactly when first needed,
then reused.

---

## M0 — Foundation
- `docker-compose.yml` with `postgres`, `directus`, `caddy`; `.env.example`.
- Directus up on Postgres; create roles (`admin`, `agent`, `registered_visitor`, `tenant`,
  `owner`); enable i18n locales `en/nl` (default `en`).
- Configure **R2** as the Directus storage adapter.
- Define core collections from `docs/03`: `listings`, `locations` (seed districts),
  `listing_media`, `amenities`, `agents`. Set agent item-level permission (`agent_id = $CURRENT_USER`).

**Exit:** an admin can create a fully-attributed listing with media in the Directus admin, and
it persists with images in R2.

## M1 — Public listing site (read path)
- `web` (Next.js) service. Read-only Directus public role/token.
- Home, search/results (SSR), listing detail (ISR) with gallery, attributes, exact-pin map
  (Leaflet/MapLibre + OSM), embeds.
- i18n routing `en/nl`; SEO (sitemap, `hreflang`, `schema.org/RealEstateListing`).
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

## M7 — Holiday themes

Automatically apply a seasonal visual theme to the public site based on the current date.
No manual toggling required — themes activate and deactivate on schedule.

### Holidays covered

| Holiday | Approx. window | Theme flavour |
|---|---|---|
| New Year | Dec 28 – Jan 2 | Fireworks, gold/silver, confetti |
| Valentine's Day | Feb 10 – Feb 14 | Reds, hearts, soft pink accents |
| Holi Phagwa | 3 days around the date | Bright multicolour, powder-paint splashes |
| Easter | Good Friday – Easter Monday | Pastels, spring greens |
| Keti Koti (Emancipation Day) | Jul 1 | Suriname flag colours, gold/green/red |
| Eid al-Fitr | 3 days around the date | Crescent/star motif, deep greens and gold |
| Diwali | 3 days around the date | Warm amber/orange, lantern motif |
| Independence Day | Nov 25 | Suriname flag colours, national pride |
| Christmas | Dec 15 – Dec 26 | Deep greens/reds, subtle snow effect |

### What changes per theme
- **Accent colour** — primary brand colour swapped for the theme colour via CSS custom property (`--color-accent`).
- **Hero banner** — optional seasonal illustration/overlay on the home page hero.
- **Favicon** — optional seasonal variant (e.g. Santa hat on logo).
- **Subtle decoration** — lightweight CSS animation (falling leaves, snow, confetti) — off by default, opt-in per theme.

### Technical approach
- `web/src/lib/theme/holidays.ts` — date-range definitions for each holiday, returns the active theme (or `null`).
- `web/src/lib/theme/ThemeProvider.tsx` — reads active theme server-side, injects CSS custom properties on `<html>`.
- Theme definitions: colour tokens + hero image path only. No heavy JS — pure CSS vars.
- Admin override: a `NEXT_PUBLIC_FORCE_THEME` env var lets you preview any theme locally without changing the date.
- Decorations (snow, confetti) are CSS-only, respect `prefers-reduced-motion`, and are disabled by default.

### Directus (optional)
- An optional `holiday_themes` singleton collection in Directus lets the admin override or disable any theme without a deploy.
- If the collection doesn't exist or no override is set, the code falls back to the date-based schedule.

**Exit:** the home page and listing pages automatically display the correct holiday theme based on today's date; switching date in `NEXT_PUBLIC_FORCE_THEME` previews any theme; animations respect `prefers-reduced-motion`; no theme is active outside its window.

---

## Parallel non-code track (unblocks M6 / branding)
- Decide brand **name** → register `.com` → logo + palette + typography.
- Source Sranantongo translations for UI strings + listing copy.
- Provide WhatsApp number(s), central inbox, and the first batch of real listings/photos.

## Suggested sequencing note
M0–M1 deliver a visible, indexable listing site early (the revenue/visibility part). M2–M3 add
acquisition (accounts, leads). M4–M5 deliver the PM differentiator. Keep each milestone
shippable so progress is demonstrable before the whole is done.
