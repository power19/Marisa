# CLAUDE.md — Real Estate Platform (working codename: `realty`)

> This file is the entry point for any coding agent working on this project.
> Read it fully before writing code. Then read the relevant file in `docs/`.
> Each service subdirectory (`web/`, `pm/`, `worker/`) also has its own `CLAUDE.md`
> with service-specific conventions — read it before touching that service.

## What we are building

A professional real estate website for the Suriname market with **two layers**:

1. **Public listing site** — browse-and-inquire for properties **for sale and for rent**
   (residential, land, commercial, apartment, vacation, expat). Modelled on
   `kwsuriname.com` in structure, but built as a custom stack we fully control.
2. **Property-management (PM) back office** — leases & tenants, maintenance tickets,
   rent recording, and owner/landlord statements, with a tenant portal.

Both layers ship together in v1. This is a deliberately ambitious v1; build it in the
milestone order defined in `docs/05-build-plan.md`.

## The stack (do not substitute without asking)

| Concern | Technology | Notes |
|---|---|---|
| Database | **PostgreSQL** | Single instance, single source of truth. |
| Content + admin | **Directus** (on the Postgres above) | Auto admin UI for agents + REST/GraphQL API. Houses listings, agents, CRM, public users. |
| Public front end | **Next.js (App Router, React, TypeScript)** | SSR for search, ISR for listing detail. SEO-critical. |
| PM back office | **FastAPI (Python)** | Own schema (`pm`) in the same Postgres. Tenant/owner logic. |
| Background worker | **Python + APScheduler** | v1 choice (migrate to Celery+Redis only if volume demands it). Saved-search alerts, CRM follow-ups, rent reminders. |
| Maps | **MapLibre + OpenStreetMap** | v1 choice. No Google Maps (no billing/key). |
| Object storage | **Cloudflare R2** (S3-compatible) | All media. No egress fees, pairs with existing Cloudflare. |
| Email | **Transactional email provider** (e.g. Postmark/Resend/SES) | Deliverability out of Suriname matters. |
| Reverse proxy | **Caddy** (or Nginx) | Auto-TLS; Cloudflare in front. |
| Orchestration | **Docker Compose** | One stack for v1. |

## Identity model — IMPORTANT

**All human identities live in Directus** as roles. There is no second auth system.
FastAPI does **not** manage its own users; it **verifies Directus-issued JWTs**.

**How it works:** Directus issues a signed JWT on login. The `pm` FastAPI service validates
that JWT against Directus's public key (or shared secret) on every request. Extract the
user ID and role from the token payload; use those for authorization. Never store users in
the `pm` schema.

Roles: `admin`, `agent`, `registered_visitor`, `tenant`, `owner`.

## Repo layout (target)

```
/                      # docker-compose.yml, .env.example, this file
/directus              # Directus config, schema snapshot, extensions, migrations
/web                   # Next.js public site
/pm                    # FastAPI property-management service
/worker                # Background jobs (alerts, reminders, follow-ups)
/docs                  # The specification (read these)
```

## Where to find what

- `docs/01-product-overview.md` — scope, users, the full **decisions log**, what's out of scope.
- `docs/02-architecture.md` — service topology, cross-cutting services, deployment, hosting, NFRs.
- `docs/03-data-model.md` — the complete schema (Directus collections + `pm` Postgres schema). **Source of truth for data. Read this before creating or modifying any collection, table, or migration.**
- `docs/04-feature-specs.md` — functional specs with acceptance criteria, per feature. **Read this before implementing any user-facing feature.**
- `docs/05-build-plan.md` — milestones M0–M6 with tasks and exit criteria. **Build in this order.**
- `docs/06-security.md` — auth rules, PII handling, rate limiting, secrets, pre-launch checklist. **Read this before touching auth, public endpoints, or any user data.**

## Definition of done (per feature)

1. Matches the acceptance criteria in `docs/04-feature-specs.md`.
2. Works in all three locales (or falls back cleanly to `en`).
3. Respects the identity/role rules above.
4. Has tests for any money or permission logic.
5. No secrets committed; runs under `docker compose up`.

## Conventions

- **TypeScript** strict on the front end; **type hints + Pydantic** on FastAPI.
- **Linting/formatting:** `ESLint` + `Prettier` for TypeScript/Next.js; `ruff` + `black` for Python.
- **Multilingual**: every user-facing string and listing text supports `en`, `nl`, `srn`
  (Sranantongo) via Directus translations / i18n. Default locale `en`.
- **Currencies**: store `amount` + `currency` (`USD`|`EUR`|`SRD`) per listing/charge.
  Display **native currency only** in v1. Do **not** add live FX conversion (SRD is volatile).
- **Money**: integer minor units or `NUMERIC(14,2)`; never floats.
- **No online payments anywhere.** Rent is *recorded*, not collected (no Suriname gateway).
- **Migrations**: Directus owns its tables via schema snapshots; `pm` schema via Alembic.
  Never let two services migrate the same table.
- **Secrets** via env only; commit `.env.example`, never `.env`.
- **Tests**: every PM money path (lease → charge → payment → receipt → statement) needs tests.

## Placeholders (unresolved business decisions)

- `{{BRAND_NAME}}` — agency name is **TBD**. Use this token everywhere; do not invent a name.
- Domain: a **`.com`** will be used (exact domain TBD). DNS will sit on Cloudflare.
- Sranantongo (`srn`) content/translations are a **content task**, not a code task — leave
  translation strings empty/fallback-to-`en` until copy is supplied.
- Currency conversion policy: native-only for now; an optional manual indicative rate is a
  future enhancement, not v1.
