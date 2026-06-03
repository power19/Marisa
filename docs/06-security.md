# 06 — Security

> Read this before touching auth, public endpoints, PII, permissions, or anything that
> handles user data. These rules are non-negotiable and apply across all services.

---

## 1. Authentication & authorization

### Single auth system — Directus JWTs
- **There is one identity store: Directus.** No service may maintain its own user table or
  issue its own tokens.
- FastAPI (`pm`) validates every inbound request against the Directus-issued JWT.
  - Verify signature using the shared secret (`DIRECTUS_SECRET` env var).
  - Reject expired, malformed, or missing tokens with `401 Unauthorized`.
  - Extract `user_id` and `role` from the payload — use these for all authorization checks.
  - Never trust a role or user ID that comes from the request body or query string.
- Next.js API routes that write data (inquiries, viewing requests, account actions) must
  either go through Directus directly or validate the Directus token server-side.
  Never perform writes from client-side code.

### Role enforcement
| Role | Allowed in |
|---|---|
| `admin` | Directus admin, FastAPI (full access) |
| `agent` | Directus admin (own listings only — item-level `agent_id = $CURRENT_USER`) |
| `registered_visitor` | Public Next.js site (saved searches, account) |
| `tenant` | FastAPI PM portal (own lease, charges, tickets only) |
| `owner` | Future — statements emailed in v1; no portal login yet |

- **Tenants must only see their own data.** Every PM endpoint that returns lease, charge,
  payment, or ticket data must filter by the authenticated user's `tenant_id`.
  A missing `WHERE tenant_id = ?` check is a critical security bug.
- **Agents may only CRUD their own listings.** Enforce at the Directus permission level
  (`agent_id = $CURRENT_USER`), not just in UI.

---

## 2. Sensitive data — tenant ID documents

Tenant identity documents (`pm.tenants.id_document`) are the most sensitive data in the system.

- **Store:** R2 key only in the database. The file in R2 must be in a **private bucket** (no
  public access). Generate pre-signed URLs with short TTL (≤ 15 minutes) for authorized access.
- **Encrypt at rest:** encrypt the R2 object using R2-managed encryption or a server-side
  KMS key. Never store the raw file in a public-readable location.
- **Access:** only `admin` role may retrieve or view ID documents. Never return the R2 key
  or a URL to a `tenant` or `owner` role.
- **Never expose via the public API.** The `pm.tenants` schema must never appear in any
  public Directus collection or Next.js API route.
- **Logging:** do not log the R2 key, URL, or any content of ID documents.

---

## 3. Public endpoint hardening

These endpoints are exposed to the internet and will attract spam and bots:

| Endpoint | Risk | Mitigation |
|---|---|---|
| `POST /api/inquiries` | Spam, scraping | Rate-limit by IP (10 req/min) |
| `POST /api/viewing-requests` | Spam | Rate-limit by IP (5 req/min) |
| `POST /api/account` (register) | Account creation abuse | Rate-limit by IP (3 req/min) |
| Directus `/auth/login` | Brute force | Directus built-in rate limiting; ensure it is enabled |

- Use a middleware layer (Next.js middleware or a lightweight in-memory store like
  `upstash/ratelimit` or a Redis counter) — do not rely on Cloudflare alone.
- Return `429 Too Many Requests` with a `Retry-After` header.
- No CAPTCHA in v1, but throttling must be in place before M3 ships.

---

## 4. Secrets management

- **No secrets in code or version control.** Use env vars only.
- Commit `.env.example` with placeholder values; never commit `.env`.
- Secrets required at runtime:
  - `DIRECTUS_SECRET` — JWT signing secret (shared between Directus and FastAPI)
  - `DIRECTUS_ADMIN_TOKEN` — server-side only, never `NEXT_PUBLIC_`
  - `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET_NAME`
  - `EMAIL_API_KEY` — transactional email provider
  - `DATABASE_URL` — Postgres connection string with credentials
- Next.js: any secret that must not reach the browser must **not** be prefixed `NEXT_PUBLIC_`.
  Audit every env var before adding it.

---

## 5. Data minimization & privacy

- **Public API (Directus public role):** expose only fields needed for listing display.
  Never include `agent_id` email, internal notes, or any PII in the public listing response.
- **Inquiries / viewing requests:** store name, email, phone — no more. Do not log these to
  stdout in production.
- **Saved searches:** store filter criteria only, not browsing history.
- **Consent:** saved-search alert emails must include an unsubscribe link. Honor
  `last_notified_at` to prevent duplicate emails.
- **Privacy policy page** is required before accounts or email collection go live (M2).

---

## 6. Transport security

- All traffic terminates TLS at **Caddy** (auto-provisioned via Let's Encrypt).
- **Cloudflare** sits in front: enable "Full (strict)" SSL mode so the Cloudflare ↔ origin
  connection is also encrypted.
- Internal Docker network traffic (postgres ↔ directus ↔ fastapi) stays on the private
  Compose network and does not need external TLS.
- Never disable TLS verification in production code (`verify=False`, `NODE_TLS_REJECT_UNAUTHORIZED=0`).

---

## 7. Database security

- Directus and FastAPI use **separate Postgres roles** with least-privilege grants:
  - `directus_user` — owns and accesses only the `public` (Directus) schema.
  - `pm_user` — owns and accesses only the `pm` schema.
  - Neither role can access the other's schema.
- The `pm` schema must never be exposed through Directus collections or the public API.
- Parameterize all SQL — no string interpolation in queries. SQLAlchemy ORM or
  `text()` with bound params only.

---

## 8. Dependency & container hygiene

- Pin dependency versions in `requirements.txt` and `package.json`.
- Run containers as non-root users in production Dockerfiles.
- Do not mount the Docker socket inside containers.
- Keep base images up to date; note any known CVEs in a comment if a pin is forced.

---

## 9. Security checklist (pre-launch, M6)

- [ ] Rate limits active on all public write endpoints
- [ ] Tenant ID documents in private R2 bucket, pre-signed URL access only
- [ ] No secrets in git history (`git log --all -- '*.env'`)
- [ ] Directus public role has read-only access to listing fields only
- [ ] FastAPI tenant endpoints filter by authenticated `tenant_id`
- [ ] Agent item-level permissions enforced in Directus
- [ ] TLS active end-to-end (Cloudflare → Caddy → services)
- [ ] Separate Postgres roles for `directus_user` and `pm_user`
- [ ] Privacy policy page live before any email collection
- [ ] Unsubscribe honored in all alert emails
