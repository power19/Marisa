# 02 — Architecture

## Topology — one database, three doors

```
                          ┌─────────────────────────────┐
        Agents ──────────▶│  Directus (admin UI + API)  │
   (admin/agent role)     │  listings, agents, CRM,     │
                          │  public users, media meta   │
                          └──────────────┬──────────────┘
                                         │
        Visitors ─────▶ Next.js ────────▶│   read-only API (public role)
  (registered_visitor)  (public site)    │
                                         ▼
                              ┌──────────────────────┐
                              │     PostgreSQL        │  ◀── single source of truth
                              │  directus schema      │
                              │  pm schema            │
                              └──────────┬────────────┘
                                         ▲
       Tenants / Owners ───▶ FastAPI ────┘  (verifies Directus tokens)
       Admin (PM)            (pm back office)
                                         │
                              ┌──────────┴────────────┐
                              │  Background worker      │ alerts, reminders, follow-ups
                              └─────────────────────────┘
```

- **Directus** owns listing/content/agent/CRM/public-user tables and exposes the API the
  public site reads. Agents work entirely inside the Directus admin.
- **Next.js** is read-only against Directus for public content; it never writes business data
  except via dedicated endpoints (inquiries, viewing requests, account actions) which go
  through Directus or a thin API.
- **FastAPI** owns the `pm` schema and all property-management logic. It authenticates users
  by **verifying Directus-issued JWTs** — no separate user store.
- **Worker** is the only thing allowed to send scheduled/bulk email.

## Cross-cutting services (build once, reuse everywhere)

1. **Background worker / scheduler** — drives: saved-search alerts (match new/updated
   listings → registered visitors), CRM follow-up reminders, rent-due reminders. Use
   APScheduler for v1 simplicity; move to Celery+Redis if volume grows.
2. **Transactional email** — one provider, one templating layer. All localized (`en/nl`).
   Used by: account verification, agent-approval notices, inquiry/viewing notifications,
   alerts, reminders, receipts, statements.
3. **PDF generation** — WeasyPrint or ReportLab in the PM service. Used by: rent receipts and
   owner statements. Templates localized and currency-aware.
4. **Object storage (Cloudflare R2)** — all hosted media (photos, floor plans, PDF brochures,
   maintenance photos, generated receipts/statements). Video and 360° tours are **external
   embeds** (YouTube/Matterport URLs), not hosted.

## Deployment — Docker Compose services

`postgres`, `directus`, `web` (Next.js), `pm` (FastAPI), `worker`, `caddy`, optional `redis`.

- Caddy terminates TLS and reverse-proxies; **Cloudflare** sits in front for CDN/cache/WAF.
- Env-driven config; `.env.example` committed.
- Volumes: Postgres data persisted; media goes to R2, **not** a local volume.

## Hosting & sizing

Footprint under light load ≈ 1.6–3 GB; the spikes are image processing (Next image optimizer,
Directus asset transforms) on upload.

- **Comfortable:** 8 GB RAM / 4 vCPU / NVMe (recommended).
- **Floor:** 4 GB / 2 vCPU — only with swap configured, Node heap capped, media offloaded.
- **Storage:** start 50–80 GB NVMe; media lives in R2 so the disk stays small.
- Do **not** co-locate this on a memory-constrained box shared with other heavy services.
- Scale path (only if needed): move Postgres to its own box, or worker to its own process.

## Backups & ops

- Nightly `pg_dump` to offsite/object storage (extend existing Ansible).
- R2 holds media; enable versioning/lifecycle as desired.
- Health checks per service; restart policies in Compose.

## Non-functional requirements

- **SEO** (high priority — most of a listing site's value): server-render search results;
  ISR for listing detail pages; `schema.org/RealEstateListing` structured data; XML sitemap;
  `hreflang` for `en/nl`; clean slugs.
- **Performance:** cache public API responses; optimize images via R2 + Next; lazy-load
  galleries and maps.
- **Security:** rate-limit the inquiry, viewing-request, and registration endpoints (spam
  will find them); CAPTCHA-free but throttled. **Tenant ID documents are sensitive** —
  store access-restricted, never expose via the public API, encrypt at rest.
- **Privacy:** privacy policy page required; minimal PII in the public site; consent for
  saved-search emails.
