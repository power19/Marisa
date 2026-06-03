# Far East Property Management — Real Estate Platform

A professional real estate platform for the Suriname market. Built as a custom stack for full control.

Two layers ship together in v1:
- **Public listing site** — browse and inquire for properties for sale and rent
- **Property-management back office** — leases, tenants, rent recording, maintenance, owner statements

---

## Stack

| Concern | Technology |
|---|---|
| Database | PostgreSQL |
| Content + admin | Directus |
| Public front end | Next.js (App Router, TypeScript) |
| PM back office | FastAPI (Python) |
| Background worker | Python + APScheduler |
| Maps | MapLibre + OpenStreetMap |
| Object storage | Cloudflare R2 |
| Email | Transactional provider (Postmark / Resend / SES) |
| Reverse proxy | Caddy |
| Orchestration | Docker Compose |

---

## Repo structure

```
/
├── directus/        # Config, schema snapshot, extensions, seed data
├── web/             # Next.js public site
├── pm/              # FastAPI property-management service
├── worker/          # Background jobs (alerts, reminders)
├── docs/            # Full specification
└── docker-compose.yml
```

Each service directory has its own `CLAUDE.md` with service-specific conventions.

---

## Docs

| File | Contents |
|---|---|
| `docs/01-product-overview.md` | Scope, users, decisions log |
| `docs/02-architecture.md` | Service topology, deployment, NFRs |
| `docs/03-data-model.md` | Complete schema — source of truth |
| `docs/04-feature-specs.md` | Feature specs with acceptance criteria |
| `docs/05-build-plan.md` | Milestones M0–M6 with exit criteria |

---

## Getting started

Copy the example env file and fill in values:

```bash
cp .env.example .env
```

Start the full stack:

```bash
docker compose up
```

Services will be available at:
- Directus admin: `http://localhost:8055`
- Next.js public site: `http://localhost:3000`
- FastAPI (PM): `http://localhost:8000`
- API docs (FastAPI): `http://localhost:8000/docs`

---

## Development

### Web (Next.js)
```bash
cd web
pnpm install
pnpm dev
```

### PM (FastAPI)
```bash
cd pm
pip install -r requirements.txt
uvicorn app.main:app --reload
```

### Worker
```bash
cd worker
pip install -r requirements.txt
python main.py
```

### Run PM tests
```bash
cd pm
pytest
```

---

## Build milestones

| Milestone | Focus |
|---|---|
| M0 | Foundation — Postgres, Directus, R2, core collections |
| M1 | Public listing site (read path, SSR, maps, i18n) |
| M2 | Agents, public accounts, saved searches, worker |
| M3 | Contact channels, CRM, lead routing |
| M4 | PM core — leases, rent, receipts |
| M5 | Tenant portal, maintenance, owner statements |
| M6 | Hardening, TLS, backups, launch |

---

## Languages

All user-facing content supports **English (`en`)**, **Dutch (`nl`)**, and **Sranantongo (`srn`)**. Default locale is `en`. Sranantongo translations are a content task — strings fall back to `en` until copy is supplied.

## Currencies

Listings and charges store an `amount` + `currency` (`USD` | `EUR` | `SRD`). Native currency is displayed as-is. No live FX conversion in v1.

## Identity

All users are managed in **Directus**. The FastAPI PM service verifies Directus-issued JWTs — there is no second auth system. Roles: `admin`, `agent`, `registered_visitor`, `tenant`, `owner`.

---

> Domain is TBD. Logo file goes in `web/public/brand/logo.png`. See `docs/brand/brand-guide.md` for full brand usage rules.
