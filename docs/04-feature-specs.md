# 04 — Feature Specs

Each feature lists behaviour and **acceptance criteria (AC)**. Build to the AC.

---

## A. Public site — home

Hero with a search widget over featured/new listing grids, mirroring the reference site.

- Search widget: offer type (Buy/Rent), property type, price range, district, keyword.
- Sections: New Listings, Featured, For Sale, For Rent, plus "Your Journey" CTAs (Buy/Sell/Team)
  and contact footer (address, email, phone, WhatsApp, socials).

**AC:** search submits to the results page with filters as query params; grids render newest
first; fully localized; LCP image optimized.

## B. Public site — search & results

- Filters: offer type, property type, price (currency-aware), district, keyword **plus**
  bedrooms, furnished status, area (m²) range, amenities.
- Sorting: visitor-selectable (newest, price ↑/↓, area); **default newest**.
- Pagination; result count; empty state.

**AC:** results are **server-rendered** by query params (SEO + shareable URLs); all filters
combine correctly; amenity/area facets work at 50–200 listings via Postgres; currency shown
natively per listing.

## C. Public site — listing detail

- Photo gallery; floor plans; PDF brochure download; embedded video and 360°/virtual tour.
- Attributes: type, status badge, price (native currency or "Price upon Request"), build &
  lot area, bedrooms/bathrooms, furnished, year built, condition, amenities.
- **Exact-pin map** (Leaflet/MapLibre + OSM).
- Agent card; four contact actions (see F).

**AC:** ISR page with `schema.org/RealEstateListing`; status badge reflects `listing_status`;
"Price upon Request" when `price_on_request`; map centers on lat/lng; localized.

## D. Agent admin (Directus)

- **Self-register → pending → admin approves** (email verification first).
- Agent CRUD on **own listings only**; status workflow; media upload (photos/floorplans/PDF to
  R2; video/360 as URLs); pin drop for location.

**AC:** unapproved agent cannot publish; item-level permission blocks editing others' listings;
uploads land in R2; required fields validated.

## E. Public accounts — saved searches & alerts

- Registered-visitor accounts (Directus role). Save a search's filter criteria; choose alert
  frequency (instant/daily/weekly).
- Worker matches new/updated listings to saved criteria and emails matches (localized).

**AC:** account email-verified; saved criteria reproduce the same results; alerts only include
genuinely matching new/updated listings; unsubscribe honored; `last_notified_at` prevents dupes.

## F. Contact channels

- **WhatsApp** click-to-chat (`wa.me`) pre-filled with listing reference.
- **Phone** `tel:` link.
- **Inquiry form** → stores `inquiries`, emails agent + central inbox, creates a lead.
- **Request a viewing** → `viewing_requests` with preferred date/time → notifies agent → lead.

**AC:** every channel records/notifies per the data model; routing hits **both** the listing's
agent and the central inbox; endpoints rate-limited.

## G. CRM (Directus collections)

- Leads with stages (configurable), notes, follow-ups. Auto-created from inquiries/viewings.
- Kanban/board view by stage in the admin; follow-up due dates drive reminders via the worker.

**AC:** inquiry/viewing creates a linked lead; stage changes persist; due follow-ups trigger a
reminder email to the assignee; notes timestamped and attributed.

## H. PM — leases & tenants

- Create owners, units (optionally linked to a listing), tenants (with restricted ID doc).
- Create leases (term, rent, deposit, billing day); activating a lease generates `rent_charges`
  per period.

**AC:** activating a lease produces correct charges on the billing day; charge currency = lease
currency; tenant ID document is access-restricted and never on the public API.

## I. PM — rent recording, reminders, receipts

- Mark charges paid/partial manually via `payments`; status auto-updates (due→partial→paid;
  overdue when past due_date).
- Worker sends reminders before/after due date; recording a payment generates a **receipt PDF**.

**AC:** payment updates charge status and remaining balance correctly; overdue computed from
`due_date`; receipt PDF generated in the correct currency and stored in R2; **no** online
payment is attempted anywhere.

## J. PM — maintenance & tenant portal

- Tenant logs in (Directus token) to: view their lease, view payment history + receipts, and
  **submit + track maintenance tickets** (with photos).
- Admin/assignee updates ticket status; tenant sees updates.

**AC:** tenant sees only their own lease/charges/tickets; ticket photos stored in R2;
status transitions follow `ticket_status`; notifications on create and status change.

## K. PM — owner statements

- Generate per-period statement per owner: rent collected, management fee, net payout.
- Render as **PDF**, email to owner. (Owner self-service portal is out of scope for v1.)

**AC:** statement totals reconcile against recorded payments for that owner's units in the
period; PDF localized + currency-correct; `sent_at` set on delivery.

## L. Content pages & footer (parity with reference)

About/Team, Buying, Selling, Renting, Expat Homes landing, Contact, Privacy Policy.
(Blog/News optional — confirm in a later round.)

**AC:** all pages localized; Team page lists approved agents with their listings; Privacy
Policy present (required for accounts + email).
