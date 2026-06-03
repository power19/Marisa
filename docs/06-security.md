# 06 — Security

> Read this before touching auth, public endpoints, PII, permissions, or anything that
> handles user data. These rules are non-negotiable and apply across all services.

---

## 1. SQL Injection (SQLi)

**Risk:** attackers input malicious code into forms or URL params to manipulate database
queries — bypassing auth, exposing records, or deleting data.

**Your exposure:** FastAPI + SQLAlchemy ORM. Low risk if ORM is used correctly.

- **Hard ban:** never use f-strings or `.format()` to build SQL strings. Any instance is
  a critical bug regardless of where the value comes from.
- Use SQLAlchemy ORM for all queries. If raw SQL is unavoidable, use `text()` with bound
  parameters only:
  ```python
  # SAFE
  db.execute(text("SELECT * FROM pm.leases WHERE id = :id"), {"id": lease_id})

  # CRITICAL BUG — never do this
  db.execute(f"SELECT * FROM pm.leases WHERE id = '{lease_id}'")
  ```
- Type all FastAPI route parameters (`lease_id: UUID`, `tenant_id: UUID`). Pydantic rejects
  non-UUID strings before they reach the query layer.
- Validate and sanitize filter values in Next.js API routes before forwarding to Directus.
  Never pass raw query string values into Directus filter objects.
- Alembic migration scripts: use bound parameters in `op.execute()`, not string formatting.

### Blind SQL Injection
**Risk:** attacker doesn't see query output but infers database structure by observing
response times or true/false behavior differences.

- Blind SQLi exploits the same root cause as regular SQLi — unparameterized queries.
- Following the ORM + typed params rules above eliminates blind SQLi as well.
- Never return different HTTP status codes or response bodies based on database errors
  that reveal query structure. All DB errors must return a generic `500` with no internal
  detail exposed to the client. Log the real error server-side only.
- Disable SQLAlchemy's `echo=True` in production — it logs full queries to stdout.

### NoSQL Injection
**Not applicable to this stack.** This project uses PostgreSQL exclusively.
Do not introduce MongoDB, Redis (beyond optional worker queue), or any document
database without an explicit architectural decision. Adding a NoSQL store introduces
a new injection surface with different mitigation requirements.

---

## 2. Cross-Site Scripting (XSS)

**Risk:** malicious scripts injected into pages steal session cookies, log keystrokes, or
redirect users to phishing pages.

**Your exposure:** Next.js (React) auto-escapes JSX output — this eliminates the majority
of XSS risk. The remaining risks are specific patterns.

- **Never use `dangerouslySetInnerHTML`** unless the content has been sanitized with
  a library like `DOMPurify`. Ban it in code review.
- User-supplied content stored in Directus (listing descriptions, agent bios) must be
  sanitized before rendering if it allows rich text. Use a whitelist-based sanitizer —
  do not trust HTML from the database.
- Set a `Content-Security-Policy` header in Caddy once the Next.js app is stable.
  MapLibre and Next.js require some inline script allowances — audit carefully.
- Cookies set by Directus for session management must have `HttpOnly` and `Secure` flags.
  Verify these are set in Directus config — `HttpOnly` prevents JavaScript from reading
  the cookie even if XSS occurs.
- The `SameSite=Strict` or `SameSite=Lax` cookie attribute prevents cross-site request
  forgery as a secondary benefit.

---

## 3. Insecure Direct Object References (IDOR)

**Risk:** attackers manipulate URL parameters or IDs to access another user's private data.
Example: tenant changes `/portal/leases/123` to `/portal/leases/124` and sees someone
else's lease.

**Your exposure:** HIGH — the PM tenant portal is the primary risk surface.

- **Every PM endpoint that returns tenant data must filter by the authenticated user's
  `tenant_id` extracted from the JWT.** A missing filter is a critical security bug.
- Never rely on the client to send their own `tenant_id` in the request body — always
  derive it from the verified JWT.
- Pattern for every portal endpoint:
  ```python
  # SAFE — tenant_id comes from the verified JWT, not the request
  @router.get("/leases/{lease_id}")
  async def get_lease(lease_id: UUID, current_user: TokenPayload = Depends(get_current_user)):
      lease = await lease_service.get_lease(lease_id)
      if lease.tenant_id != current_user.tenant_id:
          raise HTTPException(status_code=403)
      return lease
  ```
- Agent IDOR: enforce `agent_id = $CURRENT_USER` at the Directus permission level, not
  just in UI. An agent must not be able to edit another agent's listings via direct API call.
- Write a test for every portal endpoint that verifies a tenant cannot access another
  tenant's resource — treat a failing IDOR test as a critical security failure.

---

## 4. Authentication & Session Abuse

### Brute Force & Credential Stuffing
**Risk:** automated tools guess passwords (brute force) or replay leaked
email/password pairs from other breaches (credential stuffing).

- Enable Directus's built-in login rate limiting. Verify it is active before M2 ships.
- Rate-limit `/auth/login` at the Caddy or middleware level as a second layer:
  maximum 10 attempts per IP per 15 minutes.
- Return `429 Too Many Requests` with `Retry-After` header — do not return `401` on
  rate-limited attempts (reveals the account exists).
- Encourage strong passwords at account creation — enforce a minimum length (12+ chars)
  in Directus's password policy settings.
- Credential stuffing is partially mitigated by rate limiting. A future enhancement
  (post-v1) would be breach-detection via HaveIBeenPwned API.

### Unauthenticated Database Access
**Risk:** database left with no password or default credentials, visible to anyone
who scans the port.

- Postgres must have a strong, randomly generated password set in `.env` before first run.
  Never leave `POSTGRES_PASSWORD` empty or set to a default like `postgres` or `admin`.
- The `POSTGRES_USER` must not be `postgres` (the default superuser) for application use.
  Use dedicated roles (`directus_user`, `pm_user`) with minimal grants.
- As a check: run `docker compose exec postgres psql -U postgres -c "\du"` after setup
  and confirm application roles exist and the superuser is not used by any service.

### Cookie & Session Theft
**Risk:** active session tokens stolen over unencrypted connections or via XSS,
used to impersonate logged-in users.

- TLS is mandatory end-to-end (Cloudflare → Caddy) — session tokens are never sent
  in plaintext. See section 6.
- Directus session cookies must have `HttpOnly` (no JS access), `Secure` (HTTPS only),
  and `SameSite=Lax` flags. Verify in Directus config.
- JWTs used by FastAPI have a short expiry. Do not extend JWT TTL beyond what Directus
  defaults to without a clear reason.
- If a tenant or agent reports a compromised account: invalidate their Directus session
  immediately via the admin panel and force a password reset.

---

## 5. XML External Entity (XXE) Injection

**Risk:** malicious XML input sent to an unsecured parser to read internal server files
or trigger denial-of-service.

**Your exposure:** LOW — this stack does not use XML parsers. JSON is used throughout.

- Do not introduce any XML parsing library without explicit justification.
- If PDF generation with WeasyPrint processes any XML/HTML from user input, sanitize it
  first (see XSS rules above).
- No action required beyond awareness — do not add XML attack surface.

---

## 6. Transport Security

- All external traffic terminates TLS at **Caddy** (auto-provisioned via Let's Encrypt).
- **Cloudflare** sits in front: set SSL/TLS mode to **Full (strict)** — encrypts both
  the Cloudflare ↔ visitor and Cloudflare ↔ origin legs.
- Never disable TLS verification in production code:
  (`verify=False` in Python, `NODE_TLS_REJECT_UNAUTHORIZED=0` in Node).
- Internal Docker network traffic (postgres ↔ directus ↔ fastapi) stays on the private
  `realty_net` and does not need TLS — it never leaves the host machine.
- HSTS header must be set: `Strict-Transport-Security: max-age=31536000; includeSubDomains; preload`

---

## 7. Database Security

- **Postgres is never exposed outside the Docker network.** No `ports:` mapping on the
  postgres service. No exceptions — not in dev, not in staging, not in production.
- VPS firewall (`ufw`) must block port `5432`. Docker can bypass `ufw` by writing
  directly to `iptables` — verify with **both** `ufw status` AND `iptables -L`.
- To access DB locally: `docker compose exec postgres psql -U $POSTGRES_USER $POSTGRES_DB`
- Separate Postgres roles with least-privilege:
  - `directus_user` — accesses only the `public` (Directus) schema.
  - `pm_user` — accesses only the `pm` schema.
  - Neither role can access the other's schema.
- The `pm` schema is never exposed through Directus collections or the public API.

---

## 8. Secrets Management

- **No secrets in code or version control.** Env vars only.
- `.env.example` (placeholder values) is committed. `.env` (real values) is never committed.
- `chmod 600 .env` on the server. Store master copies in a password manager.
- Rotate any compromised secret immediately and restart affected services.
- Next.js: secrets not intended for the browser must **not** be prefixed `NEXT_PUBLIC_`.
  Audit every env var before adding it.
- Required secrets: `DIRECTUS_SECRET`, `DATABASE_URL`, `R2_ACCESS_KEY_ID`,
  `R2_SECRET_ACCESS_KEY`, `EMAIL_API_KEY`, `DIRECTUS_ADMIN_TOKEN`.

---

## 9. Dependency & Supply Chain Security

**Risk:** outdated packages with known CVEs, or malicious third-party scripts that
capture data (Magecart-style attacks).

- **Pin all dependency versions** in `requirements.txt` and `package.json`/`pnpm-lock.yaml`.
  A floating version (`requests>=2.0`) can silently pull in a compromised package.
- Keep a `pnpm-lock.yaml` (web) and commit it. Never delete lock files.
- No CDN-loaded third-party JavaScript. All JS dependencies must be installed via
  `pnpm install` and bundled — never loaded via a `<script src="https://cdn.example.com/...">`.
  This prevents Magecart-style supply chain attacks entirely.
- MapLibre must be installed as an npm package, not loaded from a CDN.
- Run `pip audit` (Python) and `pnpm audit` (Node) before each release to check for
  known CVEs in dependencies.
- Keep Docker base images updated. Check for image updates monthly.
- Do not mount the Docker socket (`/var/run/docker.sock`) inside any container.

---

## 10. Infrastructure Hardening

### Outdated software
- Set up automatic security updates on the VPS OS (`unattended-upgrades` on Ubuntu).
- Subscribe to security advisories for Directus, Next.js, and FastAPI.
- Directus releases security patches — update within 2 weeks of a security release.

### Malware & backdoors
- Containers run as non-root users (enforced in Dockerfiles).
- No Docker socket mounts.
- Restrict SSH access to the VPS: key-based auth only, disable password login
  (`PasswordAuthentication no` in `/etc/ssh/sshd_config`).
- Limit SSH to your IP(s) via `ufw allow from <your-ip> to any port 22`.
- Review server access logs periodically.

### DDoS
**Risk:** botnets flood the server with fake traffic to take it offline.

- **Cloudflare** is your primary DDoS mitigation layer — it absorbs volumetric attacks
  before they reach the VPS. Ensure the site is properly proxied through Cloudflare
  (orange cloud enabled) and the origin IP is not publicly known.
- Do not publish your VPS IP address anywhere. If it becomes known, Cloudflare can be
  bypassed. Rotate the IP if it leaks.
- Caddy rate limiting and Cloudflare's rate limiting rules provide a second layer for
  application-level floods.
- For v1 volume, Cloudflare's free plan DDoS protection is sufficient.

---

## 11. Google Dorking & Exposed Configuration Files

**Risk:** attackers use advanced Google search queries to find publicly indexed config files
containing plain-text credentials (e.g. `filetype:env DB_PASSWORD`).

- `.env` must be in `.gitignore` and never committed. Verify with:
  `git log --all --full-history -- '.env' '*.env'` — this should return nothing.
- GitHub repos must be **private** until you are certain no secrets were ever committed.
  If the repo was ever public with a `.env` present, rotate all secrets immediately.
- `.env.example` must contain only placeholder values — never real passwords, even old ones.
- Ensure your VPS does not serve dotfiles publicly. Caddy should return `403` or `404`
  for any request to `/.env`, `/.git`, or `/config*`. Add explicit deny rules in the Caddyfile.
- Do not store connection strings or API keys in:
  - Source code comments
  - `docker-compose.yml` (use env var references like `${DB_PASSWORD}`, never hardcoded values)
  - Log files
  - Any file that could be committed or served publicly

---

## 12. Malware, Keyloggers & Privilege Escalation

### Keyloggers & Spyware
**Risk:** malware on an admin's machine records keystrokes and steals Directus admin
credentials or server SSH keys.

- Admin and agent machines should have up-to-date antivirus/endpoint protection.
- Use a password manager — credentials typed into a browser are more exposed than those
  auto-filled by a password manager (reduces keylogger exposure).
- Enable two-factor authentication on GitHub, your email provider, Cloudflare, and R2.
  These are the accounts that, if compromised, give an attacker access to everything.
- SSH keys should be passphrase-protected. If a machine is compromised, revoke the key
  from the VPS immediately (`~/.ssh/authorized_keys`) and generate a new pair.

### Privilege Escalation
**Risk:** attacker compromises a low-privilege account (e.g. the `www` user or a web
container) and exploits misconfigurations to gain root access.

- Containers run as **non-root users** — enforce in all Dockerfiles. If a container is
  compromised, the attacker is limited to that container's user, not root on the host.
- Never run `docker compose` as root on the VPS. Create a dedicated deploy user with
  only the permissions needed to run Docker.
- Do not use `privileged: true` in any Compose service.
- Do not mount sensitive host paths (`/etc`, `/root`, `/home`) into containers.
- The Docker socket (`/var/run/docker.sock`) must never be mounted into a container —
  it grants full root-equivalent access to the host.
- Keep the VPS OS patched. An unpatched kernel vulnerability is the most common
  privilege escalation path. Enable `unattended-upgrades` for security patches.
- Use `docker compose exec` for admin tasks instead of leaving debug shells or
  management ports open.

---

## 13. Social Engineering & Phishing (Human Layer)

**Risk:** attackers trick admins into surrendering credentials or installing malware
disguised as a system update.

- The Directus admin panel URL should not be publicly advertised. Consider IP-restricting
  `/cms/admin` in Caddy to known admin IPs.
- Admin and agent accounts must use strong, unique passwords not reused from other services.
- Treat any unexpected email asking you to click a link and log in as suspicious — verify
  via a second channel before acting.
- Software updates should only come from official sources (npm registry, PyPI, Docker Hub
  official images) — never from an emailed file or a link in a chat message.

---

## 14. Redis-Specific Threats

Redis is a high-value target when misconfigured. Full hardening rules are in
`redis/CLAUDE.md` — this section summarises the critical threats and mitigations.

### Unauthenticated access & data exfiltration
**Risk:** Redis by default has no password. An exposed Redis instance allows any attacker
to run `KEYS *`, `GET <key>`, and `FLUSHALL` — stealing session tokens, API keys, and
wiping all data instantly.

- Redis has **no `ports:` mapping** — never reachable from outside the Docker network.
- `requirepass` is always set via `REDIS_PASSWORD` env var. Never run without a password.

### RCE via CONFIG SET + SAVE (SSH/cron/webshell injection)
**Risk:** if Redis runs as root and `CONFIG` + `SAVE` are enabled, an attacker can write
arbitrary files anywhere on the host filesystem:
- `/root/.ssh/authorized_keys` → passwordless SSH access to the server
- `/var/spool/cron/` → cron reverse shell or crypto miner
- Webroot → web shell executed via browser

**Mitigations (all three required):**
1. **Run Redis as non-root** (`user: "999:999"` in `docker-compose.yml`).
2. **Disable `CONFIG` and `SAVE`** via `rename-command` in `redis.conf`.
3. **Network isolation** — no external port exposure.

### Lua sandbox escape (CVE-2022-0543)
**Risk:** the `EVAL` command runs Lua scripts that can escape the sandbox and execute
arbitrary OS commands.

- `EVAL` and `EVALSHA` are disabled in `redis.conf`. This stack does not use Lua scripts.

### SSRF pivoting
**Risk:** an SSRF vulnerability in any web service on the same network can be used to
send commands to the internal Redis port, bypassing network restrictions entirely.

- Network isolation + authentication + disabled dangerous commands all contribute.
- Redis cannot be reached from external HTTP requests even via SSRF because it is
  bound to `127.0.0.1` inside the container.

### Cache poisoning & command injection
**Risk:** user input concatenated into Redis key names or values allows attackers to
overwrite cache entries, forge session tokens, or inject malicious data.

- Cache keys are always computed server-side from validated, typed parameters.
- Never construct Redis key names from raw user input.

---

## 15. Directus-Specific Threats

Directus has a documented CVE history. These threats apply specifically to this stack.
Full hardening rules are in `directus/CLAUDE.md` — this section is a summary.

### Version & information disclosure (CVE-2024-27296, CVE-2025-64749)
- Pin the exact Directus version tag in `docker-compose.yml` — never use `latest`.
- Check Directus security advisories before every deployment.
- Never expose `/server/info` or `/server/health` publicly — Caddy must block these
  from external access. Internal health checks only.
- All non-public collections must have explicit `deny` permissions for the public role.

### User enumeration via timing (CVE-2026-26185)
- Password reset endpoint must return identical responses and timing regardless of
  whether the email exists. Keep Directus updated — this is patched in recent versions.
- Rate-limit `/auth/password/request` to 3 requests per email per hour.

### File upload → Remote Code Execution (CVE-2025-55746)
- **All uploads go to Cloudflare R2 (object storage) — files cannot be executed.**
  This is the single most important mitigation. Never switch to local disk storage.
- Restrict allowed MIME types to images and PDF only. Reject JS, PHP, HTML uploads.
- Set maximum file size limits in Directus settings.

### SSRF via file import (CVE-2026-35410)
- The `/files/import` endpoint can be abused to make the server fetch internal URLs
  (e.g. AWS metadata at `169.254.169.254`, internal Docker services).
- Set `IMPORT_IP_DENY_LIST` to block all private/loopback IP ranges.
- Disable the endpoint entirely if file import from URL is not a required feature.

### Secrets in revision history (GHSA-mvv8-v4jj-g47j)
- Do not use `LOG_LEVEL=debug` or `trace` in production — sensitive field values leak.
- Audit `directus_revisions` periodically to ensure no API keys or tokens appear in
  delta records.

### Open redirect in auth flows (CVE-2026-35411)
- In v1 we use email/password only — no OAuth configured. Do not add OAuth without
  implementing strict redirect URL allowlist validation.

---

## 16. Security checklist (pre-launch, M6)

- [ ] Redis has no `ports:` mapping in docker-compose.yml
- [ ] Redis container runs as non-root user (`user: "999:999"`)
- [ ] Redis `requirepass` set — strong random password, never empty
- [ ] `CONFIG`, `SAVE`, `BGSAVE`, `EVAL`, `FLUSHALL`, `FLUSHDB`, `DEBUG` all disabled in redis.conf
- [ ] Redis bound to `127.0.0.1` in redis.conf
- [ ] `maxmemory 256mb` set — Redis cannot consume all host RAM
- [ ] No Redis key names constructed from raw user input
- [ ] Directus pinned to exact version tag (not `latest`) in docker-compose.yml
- [ ] Directus security advisories checked — no unpatched CVEs on running version
- [ ] `/server/info` and `/server/health` blocked from public access in Caddy
- [ ] All non-public Directus collections have explicit `deny` for public role
- [ ] Directus storage adapter is R2 (not local disk) — confirmed in config
- [ ] Allowed MIME types restricted in Directus (images + PDF only)
- [ ] `IMPORT_IP_DENY_LIST` set to block private IP ranges
- [ ] `LOG_LEVEL=warn` in production Directus config
- [ ] `directus_revisions` audited — no secrets in delta records
- [ ] `/auth/password/request` rate-limited to 3 req/email/hour
- [ ] Rate limits active on all public write endpoints (inquiries, viewing requests, registration, login)
- [ ] Tenant ID documents in private R2 bucket, pre-signed URL access only, admin-only
- [ ] No secrets in git history (`git log --all --full-history -- '.env' '*.env'`)
- [ ] GitHub repo is private (or confirmed clean if public)
- [ ] `.env` not served publicly — Caddy returns 403/404 for `/.env`, `/.git`, `/config*`
- [ ] `docker-compose.yml` uses `${VAR}` references — no hardcoded credentials
- [ ] Postgres password is strong and randomly generated — not a default value
- [ ] Application connects via `directus_user` / `pm_user` roles, not the superuser
- [ ] 2FA enabled on GitHub, Cloudflare, R2, and email provider accounts
- [ ] SSH keys are passphrase-protected; password login disabled on VPS
- [ ] No `privileged: true` or Docker socket mount in any Compose service
- [ ] VPS OS auto-updates enabled for security patches
- [ ] Directus public role: read-only, listing fields only, no PII
- [ ] FastAPI tenant portal endpoints all filter by JWT-derived `tenant_id`
- [ ] IDOR test exists for every tenant portal endpoint
- [ ] Agent item-level permissions enforced in Directus (`agent_id = $CURRENT_USER`)
- [ ] Directus session cookies: `HttpOnly`, `Secure`, `SameSite=Lax`
- [ ] TLS active end-to-end (Cloudflare Full Strict → Caddy → services)
- [ ] Caddy pinned to exact version tag in docker-compose.yml
- [ ] HSTS header set in Caddy (`max-age=31536000; includeSubDomains; preload`)
- [ ] `-Server` header set — Caddy server token removed from responses
- [ ] `X-Content-Type-Options: nosniff` and `X-Frame-Options: SAMEORIGIN` headers set
- [ ] Request body size limits applied (`10MB` for API, `25MB` for Directus)
- [ ] Rate limiting active on `/api/inquiries`, `/api/viewing-requests`, `/cms/auth/login`, `/cms/auth/password/request`
- [ ] Dotfiles and config paths return 404 (`/.env`, `/.git`, `/config*`)
- [ ] FastAPI `/docs`, `/redoc`, `/openapi.json` return 403
- [ ] Cloudflare `trusted_proxies` configured — real visitor IP restored
- [ ] Access and error logging to file (not stdout) in production
- [ ] Postgres has no `ports:` mapping in docker-compose.yml
- [ ] VPS firewall blocks port 5432 (verified with `iptables -L`, not just `ufw status`)
- [ ] Separate Postgres roles for `directus_user` and `pm_user`
- [ ] No CDN-loaded third-party JavaScript anywhere in the codebase
- [ ] `pnpm audit` and `pip audit` pass clean
- [ ] SSH: key-based auth only, password login disabled, port 22 IP-restricted
- [ ] Cloudflare proxying enabled (origin IP not publicly exposed)
- [ ] Directus admin IP-restricted in Caddy
- [ ] Privacy policy page live before any email collection
- [ ] Unsubscribe honored in all alert emails
