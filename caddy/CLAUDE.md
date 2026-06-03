# CLAUDE.md — caddy (reverse proxy)

Read `/CLAUDE.md` and `/docs/06-security.md` first. This file covers Caddy configuration.

## Purpose
Caddy is the single entry point for all external HTTP/HTTPS traffic. It terminates TLS
(auto-provisioned via Let's Encrypt), reverse-proxies to the correct internal service,
and sets security headers. Cloudflare sits in front of Caddy.

## Cloudflare + Caddy — IMPORTANT
Because Cloudflare proxies traffic, Caddy sees Cloudflare's IP, not the visitor's real IP.
You MUST restore the real client IP or rate limiting and logging will be wrong:

```
{
    servers {
        trusted_proxies static <cloudflare-ip-ranges>
    }
}
```

Use the `cloudflare_ips` Caddy module or maintain the current Cloudflare IP list in the
Caddyfile. Set Cloudflare SSL mode to **Full (strict)** — Caddy presents a valid cert,
Cloudflare verifies it.

## Routing

| Public host/path | Internal target |
|---|---|
| `{{DOMAIN}}/` | `web:3000` (Next.js) |
| `{{DOMAIN}}/api/pm/*` | `pm:8000` (FastAPI) |
| `{{DOMAIN}}/cms/*` | `directus:8055` |
| `{{DOMAIN}}/assets/*` | `directus:8055` (Directus file serving) |

- Do **not** expose the Directus admin (`/admin`) to the public without IP restriction or
  at minimum HTTP basic auth as a second factor.
- FastAPI docs (`/docs`, `/redoc`, `/openapi.json`) must be **disabled or IP-restricted**
  in production. Never expose them publicly.

## Security headers
Every response must include:

```
Strict-Transport-Security "max-age=31536000; includeSubDomains; preload"
X-Content-Type-Options "nosniff"
X-Frame-Options "SAMEORIGIN"
Referrer-Policy "strict-origin-when-cross-origin"
Permissions-Policy "geolocation=(), microphone=(), camera=()"
```

Add `Content-Security-Policy` once the Next.js app is stable (inline scripts from
MapLibre and Next.js need to be accounted for first).

## Compression & performance
Enable `encode gzip zstd` for all text responses. Static assets served from Directus or
Next.js should have long `Cache-Control` headers set at the application layer — Caddy
passes them through.

## TLS
- Caddy auto-provisions Let's Encrypt certs. Ensure port 80 and 443 are open on the host.
- If Cloudflare "Full (strict)" mode is used, provision the cert for the origin domain
  (not the Cloudflare proxy domain). Use `tls internal` only for local dev.
- Do not disable TLS in production under any circumstance.

## Local development
For local dev, use `tls internal` (Caddy self-signed) or skip Caddy entirely and hit
services directly on their ports. Never use the production Caddyfile locally.

## File layout
```
caddy/
├── CLAUDE.md
├── Caddyfile          # production config
└── Caddyfile.dev      # local dev config (optional)
```
