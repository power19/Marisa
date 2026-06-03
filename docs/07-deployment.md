# 07 — Deployment

> Read this before writing or modifying `docker-compose.yml`, Dockerfiles, env files,
> health checks, or anything related to running the stack in production.

---

## Stack overview

All services run as Docker Compose on a single VPS (comfortable: 8 GB RAM / 4 vCPU).

```
docker-compose.yml
├── postgres          # PostgreSQL — single source of truth
├── directus          # Content + admin + auth
├── web               # Next.js public site
├── pm                # FastAPI property-management
├── worker            # Background jobs (APScheduler)
├── caddy             # Reverse proxy + TLS
└── redis             # Optional — only add if worker volume grows
```

---

## Environment variables

### Why `.env` is used
Docker Compose needs a way to inject secrets into containers at runtime. The `.env` file
is the standard mechanism — Docker Compose reads it automatically. There is no way around
needing *some* file with real values on the server.

### What is safe vs sensitive

| File | Contains | Committed to git? |
|---|---|---|
| `.env.example` | Placeholder keys, no real values | ✅ Yes — it documents what's needed |
| `.env` | Real passwords, API keys, secrets | ❌ Never — it's in `.gitignore` |

### How to manage `.env` on the server
- Create `.env` directly on the VPS — never copy it via an unencrypted channel.
- Use `chmod 600 .env` so only the owner can read it.
- Do not store `.env` in Dropbox, Google Drive, email, or any sync service.
- Use a password manager (Bitwarden, 1Password) or a secrets vault to store the values
  securely — the `.env` on the server is the only place real values should exist.
- If a secret is compromised, rotate it immediately: generate a new value, update `.env`
  on the server, and restart the affected service (`docker compose up -d --no-deps directus`).

### Setup
```bash
# On the VPS
cp .env.example .env
nano .env          # fill in real values
chmod 600 .env
```

### Required vars (minimum)

```
# Postgres
POSTGRES_USER=
POSTGRES_PASSWORD=
POSTGRES_DB=

# Directus
DIRECTUS_SECRET=           # JWT signing secret — shared with FastAPI pm service
DIRECTUS_ADMIN_EMAIL=
DIRECTUS_ADMIN_PASSWORD=
DIRECTUS_PUBLIC_URL=       # e.g. https://yourdomain.com/cms

# R2 (Cloudflare)
R2_ACCESS_KEY_ID=
R2_SECRET_ACCESS_KEY=
R2_BUCKET_NAME=
R2_ENDPOINT=               # e.g. https://<account-id>.r2.cloudflarestorage.com
R2_PUBLIC_URL=             # Public base URL for listing media (CDN URL)

# Email
EMAIL_PROVIDER=            # postmark | resend | ses
EMAIL_API_KEY=
EMAIL_FROM=                # e.g. noreply@yourdomain.com
EMAIL_CENTRAL_INBOX=       # central inquiry recipient

# Next.js
NEXT_PUBLIC_DIRECTUS_URL=  # public Directus URL (readable by browser)
NEXT_PUBLIC_SITE_URL=      # canonical site URL
DIRECTUS_SERVER_TOKEN=     # server-only read token for SSR/ISR — NOT NEXT_PUBLIC_

# FastAPI
DATABASE_URL=              # postgresql+asyncpg://user:pass@postgres:5432/db
PM_SECRET_KEY=             # used for any internal signing if needed

# Caddy
DOMAIN=                    # your .com domain
```

---

## Docker Compose conventions

- Use **named volumes** for Postgres data (`postgres_data`). Never use bind mounts for DB.
- Media goes to R2 — no local volume for uploads.
- All services on a private internal network (`realty_net`). Only Caddy exposes ports 80/443.
- Use `depends_on` with `condition: service_healthy` so services wait for Postgres to be ready.
- Set `restart: unless-stopped` on all production services.

### Port exposure — IMPORTANT
**Only Caddy exposes ports to the host. Every other service has no `ports:` mapping.**

| Service | Rule |
|---|---|
| postgres | **No `ports:` mapping. Ever.** Reachable only on `realty_net` by service name. |
| directus | No `ports:` mapping. Caddy proxies `/cms/*` internally. |
| web | No `ports:` mapping. Caddy proxies `/` internally. |
| pm | No `ports:` mapping. Caddy proxies `/api/pm/*` internally. |
| worker | No `ports:` mapping. No HTTP server. |
| caddy | `80:80` and `443:443` only. |

Never add a `ports:` entry to the Postgres service — not even for local debugging.
If you need to inspect the DB locally, use `docker compose exec postgres psql`.
Additionally, ensure your VPS firewall (e.g. `ufw`) blocks port `5432` from all
external traffic — Docker can bypass `ufw` rules if misconfigured.

---

## Health checks

Every service must have a health check so `depends_on` and restart policies work correctly.

```yaml
# postgres
healthcheck:
  test: ["CMD-SHELL", "pg_isready -U $$POSTGRES_USER -d $$POSTGRES_DB"]
  interval: 10s
  timeout: 5s
  retries: 5

# directus
healthcheck:
  test: ["CMD", "wget", "-qO-", "http://localhost:8055/server/health"]
  interval: 15s
  timeout: 5s
  retries: 5

# web (Next.js)
healthcheck:
  test: ["CMD", "wget", "-qO-", "http://localhost:3000/api/health"]
  interval: 15s
  timeout: 5s
  retries: 3

# pm (FastAPI)
healthcheck:
  test: ["CMD", "curl", "-f", "http://localhost:8000/health"]
  interval: 15s
  timeout: 5s
  retries: 3
```

Add a `/health` endpoint to Next.js (`app/api/health/route.ts`) and FastAPI (`GET /health`)
that returns `200 OK`. Keep them trivial — no DB query needed.

---

## Dockerfiles

### web (Next.js)
- Multi-stage build: `deps` → `builder` → `runner`.
- Run as non-root user (`nextjs`).
- Set `NODE_ENV=production` and cap Node heap: `--max-old-space-size=512`.
- Output: `standalone` mode (`output: 'standalone'` in `next.config.ts`).

### pm (FastAPI)
- Base: `python:3.12-slim`.
- Run as non-root user.
- Install WeasyPrint dependencies (GTK libs) in the same layer as pip install.
- Entrypoint: `uvicorn app.main:app --host 0.0.0.0 --port 8000 --workers 2`.

### worker
- Base: `python:3.12-slim`.
- Run as non-root user.
- Entrypoint: `python main.py`.

---

## Migrations & first run

Run in this order on first deploy:

```bash
# 1. Start Postgres first
docker compose up -d postgres

# 2. Run Directus migrations (schema apply)
docker compose run --rm directus npx directus schema apply ./schema/snapshot.yaml

# 3. Seed locations and amenities
docker compose run --rm directus node seed/run.js

# 4. Run PM Alembic migrations
docker compose run --rm pm alembic upgrade head

# 5. Start everything
docker compose up -d
```

On subsequent deploys:
```bash
docker compose pull
docker compose up -d --no-deps --build web pm worker
docker compose run --rm pm alembic upgrade head
```

---

## Backups

- Nightly `pg_dump` via a cron job on the host or a sidecar container.
- Compress and upload to offsite storage (R2 bucket or separate provider).
- Retain 30 days minimum.
- Test restore quarterly.

```bash
# Example backup command
pg_dump -U $POSTGRES_USER $POSTGRES_DB | gzip > backup_$(date +%Y%m%d).sql.gz
```

---

## Scaling path (only if needed — not v1)

1. Move Postgres to its own box or managed service.
2. Move worker to its own Compose stack or switch to Celery + Redis.
3. Add a second web/pm container behind a load balancer.

Do not pre-optimize for scale in v1. The single-box Compose setup handles the expected load.

---

## Local development

For local dev, services can be run directly without Caddy:

```bash
# Start backing services only
docker compose up -d postgres directus

# Run web locally
cd web && pnpm dev          # http://localhost:3000

# Run pm locally
cd pm && uvicorn app.main:app --reload   # http://localhost:8000

# Run worker locally
cd worker && python main.py
```

Use `.env.local` (web) and `.env` (pm/worker) with local values. Never use production
secrets locally.
