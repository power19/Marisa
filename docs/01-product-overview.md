# 01 — Product Overview

## Vision

A professional, fully-owned real estate platform for the Suriname market that does what a
brokerage site like `kwsuriname.com` does (browse-and-inquire for sale and rental listings)
**plus** an internal property-management back office that such sites lack.

Reference site for structure and feel: `kwsuriname.com` (a Buy/Rent listing site with
status badges, district-based search, agent team, USD/EUR pricing, WhatsApp inquiry).
We match its public model and exceed it with the PM layer. We are **not** cloning its code
(that site runs a Laravel/October CMS); we build our own stack for full control.

## Users

- **Visitors / buyers / renters** — browse, search, filter, view listings, make contact,
  and (optionally) register to save searches and receive alerts.
- **Agents** — a small team. Self-register, get approved, then manage **their own** listings
  and work their leads in a CRM.
- **Admin (owner/operator)** — approves agents, manages everything, runs the PM back office.
- **Tenants** — log into a portal to view their lease and payments and submit maintenance.
- **Property owners** — receive periodic statements for properties managed on their behalf.

## Scope — v1 includes BOTH layers

**Public listing site:** sale + rent listings; six property types (residential, land,
commercial, apartment, vacation, expat); rich status taxonomy; district-based search with
faceted filters; exact-pin maps; multi-currency native display; multilingual (EN/NL/SRN);
four contact channels; visitor accounts with saved searches and email alerts.

**PM back office:** leases & tenants; maintenance tickets (tenant-submitted); rent recording
with reminders and receipts; owner/landlord statements; a tenant portal.

## Decisions log (locked during planning)

| # | Decision | Choice |
|---|---|---|
| Stack | Build custom, not WordPress | Directus + Postgres + Next.js + FastAPI |
| Reason | Priority | Full control + manageable admin + modifiable in-house |
| Scope | v1 layers | **Both** public site and PM back office together |
| Lang | Launch languages | **English + Dutch + Sranantongo** (default `en`) |
| Volume | Initial listings | **50–200** → plain Postgres filtering, no search engine |
| Money | Currencies | **USD, EUR, SRD**; native display; no live FX (SRD volatile) |
| Media | Per listing | Photo galleries, video tour, floor plans, PDF brochure, 360°/virtual tour |
| Attrs | Extra fields | Furnished status, amenities, year built/condition, separate lot & build area |
| Agents | Onboarding | **Self-register → admin approves** (email verification + pending state) |
| Agents | Permissions | Edit **own listings only** (item-level) |
| Public | Accounts | Yes — **saved searches + email alerts** |
| Map | Location display | **Exact pin** (lat/lng), Leaflet/MapLibre + OSM |
| Search | Filters | offer type, property type, price, district, keyword + bedrooms, furnished, area range, amenities |
| Search | Default sort | **Visitor-controlled, default newest** |
| Contact | Channels | **WhatsApp, phone link, email inquiry form, request-a-viewing** |
| Leads | Routing | **Both** the listing's agent **and** a central pipeline |
| Leads | Tracking | **Full CRM** (stages, notes, follow-ups) — built as Directus collections |
| PM | v1 modules | Leases & tenants, maintenance tickets, owner statements (+ rent tracking implied) |
| PM | Tenant portal | **Yes** — view lease & payments, submit/track maintenance |
| PM | Rent | **Manual marking + reminders + receipts** (no online collection) |
| Identity | Auth | One store: **Directus**; FastAPI verifies Directus tokens |
| Infra | Hosting | Single Docker Compose box; **8 GB/4 vCPU comfortable**, 4 GB/2 vCPU floor |
| Infra | Media | **Cloudflare R2** object storage from day one |
| Domain | TLD | **`.com`** (exact domain + brand name TBD) |
| Brand | Identity | Name/logo/colors **TBD** — design is a parallel track (blocker: name) |

## Out of scope for v1 (explicitly later)

- Online payments / rent collection (no viable Suriname gateway).
- Live currency conversion (native display only; optional manual indicative rate later).
- Owner self-service portal (owners get emailed PDF statements in v1).
- Per-listing "hide exact location / show area only" privacy toggle (future option).
- A dedicated search engine (Meilisearch/Elastic) — not needed at 50–200 listings.
- IDX/MLS feeds (no local MLS).

## Known content/business prerequisites (not code)

- Brand **name** (blocks domain registration, logo, palette).
- Sranantongo translation of UI strings and listing copy (translation labor).
- WhatsApp business number(s) and central inquiry inbox address.
- Real listing data + photos for the first import.
