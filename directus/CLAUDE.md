# CLAUDE.md — directus

Read `/CLAUDE.md` and `/docs/06-security.md` first. This file adds Directus-specific conventions.

## Purpose
Directus is the content, CRM, and user admin layer. It owns all tables in the `public`
Postgres schema. It is the only auth system — all roles and users live here.

## Schema ownership
- All Directus schema changes go through **schema snapshots** (`directus/schema/snapshot.yaml`).
- Never use Alembic or raw SQL to alter Directus-owned tables.
- The `pm` schema is owned by FastAPI/Alembic — never create or touch `pm.*` tables from Directus.

## Roles & permissions — IMPORTANT
Configure in this order; never skip permission scoping:

| Role | What they can do |
|---|---|
| `admin` | Full access to all collections |
| `agent` | CRUD on `listings` where `agent_id = $CURRENT_USER` only. Read-only on `locations`, `amenities`. |
| `registered_visitor` | Read own `saved_searches` row only. No listing write access. |
| `tenant` | No Directus collection access (PM data is in FastAPI). |
| `owner` | No Directus collection access in v1. |
| Public (no token) | Read-only on `listings` (published fields only), `locations`, `amenities`, `agents` (display fields only). **No PII fields.** |

## Public role — field-level restrictions
The public Directus token used by Next.js must NEVER expose:
- Agent email, phone (only `display_name`, `photo`, `whatsapp` for click-to-chat)
- Any inquiry or viewing_request data
- Any CRM collection (`leads`, `lead_notes`, `lead_followups`)
- Any saved_search data
- Internal notes or admin-only fields

## Extensions
- `extensions/hooks/agent-approval.js` — fires on agent record update; sends approval email
  via the worker when `approved` transitions from `false` to `true`.
- `extensions/hooks/lead-autocreate.js` — fires on `inquiries` and `viewing_requests` insert;
  auto-creates or links a `leads` record and notifies agent + central inbox.
- `extensions/endpoints/saved-search-match.js` — internal endpoint called by the worker
  to fetch saved searches and matching listing criteria.

## Seed data
- `seed/locations.json` — Suriname districts (Paramaribo sub-areas, Wanica, Commewijne,
  Para, Saramacca, Nickerie, Coronie, Brokopondo). Load once at M0.
- `seed/amenities.json` — default amenities (AC, Pool, Parking, Garden, Security, etc.).

## i18n
Enable locales `en`, `nl`, `srn` in Directus settings. Default `en`. Translatable fields
on `listings` (title, description), `listing_media` (alt), `amenities` (name), `agents` (bio).

## Config
`config/config.js` — Directus env-driven config file. All secrets via env vars; nothing
hardcoded. See `.env.example` at the repo root for required Directus env vars.

---

## Security hardening — IMPORTANT

These rules exist because Directus has a documented history of CVEs. Follow all of them.

### Keep Directus updated
- Always run the **latest stable release**. Pin the exact version tag in `docker-compose.yml`
  (e.g. `directus/directus:11.x.x`) — never use `latest` which makes version auditing impossible.
- Check the [Directus releases page](https://github.com/directus/directus/releases) and
  [security advisories](https://github.com/directus/directus/security/advisories) before
  each deployment. Update within 2 weeks of any security release.
- Known CVEs to be aware of: CVE-2024-27296 (version disclosure), CVE-2025-55746
  (unauthenticated file manipulation → RCE), CVE-2025-64749 (collection name leakage),
  CVE-2026-26185 (user enumeration via timing), CVE-2026-35410 (SSRF via file import).

### Version & info disclosure
- Disable any Directus endpoints or headers that expose the running version to
  unauthenticated users. Set `DIRECTUS_PUBLIC_URL` correctly so error pages don't
  leak internal paths.
- Never expose `/server/info` or `/server/health` publicly. IP-restrict or remove these
  from the public-facing Caddy config — they are for internal health checks only.

### Admin panel access
- Restrict `/cms/admin` in Caddy to known admin IP addresses only.
  An attacker who cannot reach the login page cannot brute-force it.
- Do not advertise the Directus admin URL publicly.

### File upload hardening (critical — CVE-2025-55746)
- All uploads go to **Cloudflare R2**, not a local directory. R2 is object storage —
  files cannot be executed. This eliminates webshell execution risk entirely.
- Never switch Directus storage to a local filesystem directory that is served by
  a web server. Local disk + web-served = executable upload risk.
- The R2 bucket for listing media is public **read-only** via CDN URL only.
  Write access requires R2 credentials — never expose write keys publicly.
- Validate file MIME types in Directus settings. Allow only:
  `image/jpeg`, `image/png`, `image/webp`, `image/gif`, `application/pdf`.
  Reject all other types including `text/html`, `application/javascript`, `application/php`.
- Set a maximum file size limit in Directus settings (recommend: 20 MB for photos, 10 MB for PDFs).

### SSRF via file import (CVE-2026-35410)
- Disable or restrict the Directus `/files/import` endpoint if it is not actively needed.
- If file import is used, configure `IMPORT_IP_DENY_LIST` in Directus env to block
  private IP ranges: `0.0.0.0/8`, `10.0.0.0/8`, `127.0.0.0/8`, `169.254.0.0/16`
  (AWS metadata), `172.16.0.0/12`, `192.168.0.0/16`, `::1`, `fc00::/7`.
- This prevents an attacker from using Directus to reach your internal Docker network
  or cloud infrastructure metadata endpoints.

### User enumeration via password reset (CVE-2026-26185)
- Ensure the password reset endpoint returns identical responses and takes identical time
  whether or not the email exists in the system.
- Directus patches this in recent versions — keep updated.
- Rate-limit `/auth/password/request` to 3 requests per email per hour.

### Collection structure leakage (CVE-2025-64749)
- All non-public collections must have explicit `deny all` permissions for the public role.
  Do not rely on "no permission set = no access" — set it explicitly to deny.
- Hidden collections (CRM, PM-adjacent, internal) should return identical errors for
  unauthorized vs. non-existent to prevent enumeration.

### Revision history & secrets in logs
- Never use Directus "Log to Console" in production for sensitive fields.
- Audit the `directus_revisions` table periodically to ensure no API keys, tokens,
  or MFA secrets appear in delta records (known issue in some Directus versions).
- Set `LOG_LEVEL=warn` in production — do not use `debug` or `trace` which can
  leak sensitive field values to log output.

### OAuth / redirect validation
- If OAuth or SSO is configured in future, ensure all redirect URLs are validated
  against an explicit allowlist. Never allow open redirects in auth flows.
- In v1, Directus uses email/password only — no OAuth is configured.
