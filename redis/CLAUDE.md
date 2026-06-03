# CLAUDE.md — redis

Read `/CLAUDE.md` and `/docs/06-security.md` first. This file covers Redis configuration
and how each service uses it.

## Purpose
Redis serves four roles in this stack:

| Role | Used by | Details |
|---|---|---|
| **Rate limiting** | Caddy / Next.js middleware | Shared counters across requests — more reliable than in-process memory |
| **Celery broker** | Worker | Task queue broker replacing APScheduler for background jobs |
| **API response cache** | Next.js (server-side) | Cache Directus listing responses to reduce Postgres load |
| **Session / token storage** | Directus / FastAPI | Short-lived tokens (email verification, password reset) with automatic TTL expiry |

---

## Connection

Redis runs as a Docker Compose service on the private `realty_net` network.
It is **never exposed externally** — no `ports:` mapping in production.

Connection string format: `redis://:${REDIS_PASSWORD}@redis:6379/0`

Use separate database numbers to namespace concerns:
| DB | Purpose |
|---|---|
| `0` | Celery broker + results |
| `1` | Rate limiting counters |
| `2` | API response cache |
| `3` | Session / token storage |

---

## Security hardening

- **Always set a password.** Set `REDIS_PASSWORD` in `.env` and configure Redis with
  `requirepass` in `redis.conf`. Never run Redis without authentication.
- Redis must have **no `ports:` mapping** in `docker-compose.yml`. It is only reachable
  by other containers on `realty_net`.
- Disable dangerous commands that have no use in this stack:
  ```
  rename-command FLUSHALL ""
  rename-command FLUSHDB ""
  rename-command DEBUG ""
  rename-command CONFIG ""
  ```
- Set a memory limit to prevent Redis from consuming all available RAM:
  ```
  maxmemory 256mb
  maxmemory-policy allkeys-lru
  ```
- Enable persistence (AOF) so rate limit state and tokens survive restarts:
  ```
  appendonly yes
  appendfsync everysec
  ```

---

## Rate limiting

The rate limiting layer uses Redis to share counters across all request handlers.

- **Next.js middleware** uses `@upstash/ratelimit` (or `ioredis` directly) to enforce
  limits on API routes: inquiries, viewing requests, account registration.
- **Caddy** uses Redis-backed rate limiting via the `caddy-ratelimit` module if configured,
  or defers to the Next.js middleware layer.
- Key pattern: `ratelimit:{route}:{ip}` with TTL matching the window.
- On limit exceeded: return `429 Too Many Requests` with `Retry-After` header.

Limits (match `docs/06-security.md`):
| Route | Limit |
|---|---|
| `/api/inquiries` | 10 req / 1 min / IP |
| `/api/viewing-requests` | 5 req / 1 min / IP |
| `/api/account` (register) | 3 req / 1 min / IP |
| `/cms/auth/login` | 10 req / 15 min / IP |
| `/cms/auth/password/request` | 3 req / 1 hour / IP |

---

## Celery (worker)

Redis is the Celery message broker and result backend.

```python
# worker/config.py
CELERY_BROKER_URL = "redis://:password@redis:6379/0"
CELERY_RESULT_BACKEND = "redis://:password@redis:6379/0"
```

Celery replaces APScheduler for background jobs:
| Job | Celery task | Schedule |
|---|---|---|
| Saved-search alerts | `jobs.saved_search_alerts.run` | Every 15 min (or on listing update) |
| CRM follow-up reminders | `jobs.crm_reminders.run` | Daily at 08:00 |
| Rent-due reminders | `jobs.rent_reminders.run` | Daily at 07:00 |

Use `celery beat` for scheduled tasks and `celery worker` for task execution.
Both run in the same `worker` container in v1 — split only if volume demands it.

---

## API response caching (Next.js)

Cache Directus listing API responses server-side to reduce Postgres load on the
public site. Use `ioredis` in Next.js server components / route handlers.

Cache key pattern: `cache:listings:{query_hash}` where `query_hash` is a hash of
the filter/sort/page parameters.

TTL rules:
| Data | TTL | Reason |
|---|---|---|
| Listing search results | 5 min | Listings change infrequently |
| Listing detail | 10 min | ISR handles most of this — Redis is a fallback |
| Home page featured listings | 15 min | Low change frequency |
| Locations / amenities | 24 hours | Almost never changes |

Cache invalidation: when an agent updates a listing in Directus, a hook
(`extensions/hooks/cache-invalidate.js`) calls the Next.js revalidation endpoint
to purge the relevant ISR and Redis cache entries.

---

## Session / token storage (FastAPI + Directus)

Short-lived tokens stored in Redis with automatic expiry — no DB table needed.

| Token type | Key pattern | TTL |
|---|---|---|
| Email verification | `token:verify:{uuid}` | 24 hours |
| Password reset | `token:reset:{uuid}` | 1 hour |
| Tenant portal session hint | `session:tenant:{user_id}` | 30 min |

Pattern:
```python
# Store
await redis.setex(f"token:verify:{token}", 86400, user_id)

# Retrieve and delete (single use)
user_id = await redis.getdel(f"token:verify:{token}")
if not user_id:
    raise HTTPException(status_code=400, detail="Invalid or expired token")
```

Never store sensitive data (passwords, ID document content) in Redis — only UUIDs
and short-lived references.

---

## Environment variables

```
REDIS_PASSWORD=          # strong random password — required
REDIS_URL=redis://:${REDIS_PASSWORD}@redis:6379
```

---

## Local development

Redis runs in Docker Compose locally the same as in production.
Use `redis-cli -a $REDIS_PASSWORD` for local inspection.
Do not disable the password locally — keep parity with production.
