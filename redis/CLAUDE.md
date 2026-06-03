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

## Security hardening — IMPORTANT

Redis has a well-documented history of critical vulnerabilities when misconfigured.
Every rule below is non-negotiable.

### 1. Never expose Redis to the network
- **No `ports:` mapping in `docker-compose.yml`.** Redis is reachable only by containers
  on the private `realty_net` Docker network — never from the host or the internet.
- Bind Redis to the internal Docker network interface only via `bind 127.0.0.1` in
  `redis.conf`. This ensures Redis will not accept connections from outside the container.
- Verify after deploy: `docker compose exec redis redis-cli -a $REDIS_PASSWORD ping`
  should work. Connecting from outside the Docker network should fail.

### 2. Always require authentication
- Set a **strong, randomly generated password** via `requirepass` in `redis.conf`.
  Never run Redis without a password — unauthenticated Redis allows `KEYS *`, `GET`,
  and `FLUSHALL` with zero friction for an attacker.
- Use Redis ACLs (Redis 6+) for fine-grained per-user permissions if needed in future.
  In v1, a single strong password is sufficient given the network isolation above.
- Password must be set in `.env` as `REDIS_PASSWORD` — never hardcoded in `redis.conf`
  or `docker-compose.yml`.

### 3. Run as non-root — CRITICAL for RCE prevention
- The Redis container must run as a **non-root user**. If Redis runs as root and an
  attacker gains write access, they can use `CONFIG SET dir` + `SAVE` to write files
  anywhere on the host filesystem — including:
  - `/root/.ssh/authorized_keys` (SSH key injection → full server takeover)
  - `/var/spool/cron/` (cron job injection → reverse shell / crypto miner)
  - Webroot directories (web shell insertion → RCE via browser)
- In `docker-compose.yml`: `user: "999:999"` (Redis default non-root UID).
- This is the single most critical mitigation against Redis-based server takeover.

### 4. Disable dangerous commands
The following commands have no legitimate use in this stack and must be disabled
by renaming them to empty strings in `redis.conf`:

```
rename-command CONFIG   ""   # Prevents CONFIG SET dir attacks (RCE vector)
rename-command SAVE     ""   # Prevents manual filesystem writes
rename-command BGSAVE   ""   # Prevents background filesystem writes
rename-command BGREWRITEAOF ""
rename-command FLUSHALL ""   # Prevents wiping all data
rename-command FLUSHDB  ""   # Prevents wiping a database
rename-command DEBUG    ""   # Prevents debug-level exploits
rename-command EVAL     ""   # Prevents Lua sandbox escape (CVE-2022-0543)
rename-command SLAVEOF  ""   # Prevents replication abuse
rename-command REPLICAOF ""
```

> **EVAL / Lua:** CVE-2022-0543 demonstrated that the Lua sandbox in Redis can be
> escaped to execute arbitrary OS commands. Disabling EVAL removes this attack surface
> entirely. This stack does not use Lua scripts.

### 5. Protect against SSRF pivoting
If a web application on the same network has an SSRF vulnerability, an attacker can
send Gopher/HTTP requests to the internal Redis port and execute commands as if
they were a trusted client. Mitigations:
- Network isolation (rule 1) reduces the attack surface.
- Authentication (rule 2) means SSRF requests must still authenticate.
- Disabled dangerous commands (rule 4) limit what an SSRF attacker can do.
- Validate and sanitize all URLs in Directus file import (`IMPORT_IP_DENY_LIST`) —
  see `directus/CLAUDE.md`.

### 6. Prevent cache poisoning & command injection
Never construct Redis commands by concatenating user input:
```python
# DANGEROUS — never do this
redis.get(f"cache:{user_input}")

# SAFE — always sanitize or use typed keys
redis.get(f"cache:listings:{query_hash}")  # hash computed server-side
```
- Cache keys must always be derived server-side from validated, typed parameters.
- Never expose Redis key names or structure to the client.
- Never store raw user input as a Redis value without sanitization.

### 7. Memory limit
Set a hard memory limit to prevent Redis from consuming all available RAM
(which would crash the entire host):
```
maxmemory 256mb
maxmemory-policy allkeys-lru
```

### 8. Persistence
Enable AOF persistence so rate limit counters and tokens survive container restarts:
```
appendonly yes
appendfsync everysec
```
Do not use `appendfsync always` in production — it is too slow under load.

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
