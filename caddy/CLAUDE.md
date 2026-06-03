# CLAUDE.md — caddy (reverse proxy)

Read `/CLAUDE.md` and `/docs/06-security.md` first. This file covers Caddy configuration.

## Purpose
Caddy is the single entry point for all external HTTP/HTTPS traffic. It terminates TLS
(auto-provisioned via Let's Encrypt), reverse-proxies to the correct internal service,
and enforces security headers, rate limits, and connection controls.
Cloudflare sits in front of Caddy.

---

## Caddy hardening rules — follow all of these

### Keep Caddy updated
- Pin the exact Caddy version in `docker-compose.yml` (e.g. `caddy:2.x.x-alpine`).
  Never use `latest`.
- Run `caddy version` after deploy to confirm the running version.
- Check [Caddy releases](https://github.com/caddyserver/caddy/releases) before each
  deployment. Security fixes ship in patch releases — update within 2 weeks.

### HTTPS — enforce redirect
Caddy auto-provisions HTTPS, but always add an explicit HTTP → HTTPS redirect:
```
http:// {
    redir https://{host}{uri} permanent
}
```

### TLS — enforce strong protocols
Restrict to TLS 1.2 minimum, TLS 1.3 preferred:
```
tls {
    protocols tls1.2 tls1.3
    ciphers TLS_ECDHE_ECDSA_WITH_AES_256_GCM_SHA384 TLS_ECDHE_RSA_WITH_AES_256_GCM_SHA384
}
```

### Request body size limits
Prevent memory exhaustion from oversized uploads:
```
route /api/* {
    request_body {
        max_size 10MB
    }
}
route /cms/* {
    request_body {
        max_size 25MB   # Directus media uploads
    }
}
```

### Security headers — set on all responses
```
header /* {
    # Prevent MIME sniffing
    X-Content-Type-Options nosniff

    # Prevent clickjacking
    X-Frame-Options SAMEORIGIN

    # Force HTTPS for 1 year
    Strict-Transport-Security "max-age=31536000; includeSubDomains; preload"

    # Restrict referrer info
    Referrer-Policy strict-origin-when-cross-origin

    # Disable unnecessary browser features
    Permissions-Policy "geolocation=(), microphone=(), camera=()"

    # Remove Caddy server token — never reveal server software
    -Server
}
```

### Disable server tokens
The `-Server` header removal above prevents Caddy from advertising itself.
This denies attackers easy fingerprinting of your server software and version.

### Connection limits
Limit simultaneous connections to prevent DoS:
```
servers {
    max_concurrent_streams 100
}
```

### Rate limiting
Use the `caddy-ratelimit` module or Cloudflare rate limiting rules.
Apply limits to high-risk routes:
```
route /api/inquiries {
    rate_limit {
        zone inquiries {
            key {remote_host}
            events 10
            window 1m
        }
    }
}
route /api/viewing-requests {
    rate_limit {
        zone viewings {
            key {remote_host}
            events 5
            window 1m
        }
    }
}
route /cms/auth/login {
    rate_limit {
        zone login {
            key {remote_host}
            events 10
            window 15m
        }
    }
}
route /cms/auth/password/request {
    rate_limit {
        zone pwreset {
            key {remote_host}
            events 3
            window 1h
        }
    }
}
```

### Access & error logging
```
log {
    output file /var/log/caddy/access.log {
        roll_size 100mb
        roll_keep 10
    }
    format json
}
```
Separate error logging at ERROR level only — do not log DEBUG in production:
```
log {
    output file /var/log/caddy/error.log
    format console
    level ERROR
}
```

---

## Cloudflare + Caddy integration

Because Cloudflare proxies traffic, Caddy sees Cloudflare's IP — not the visitor's.
Restore the real client IP or rate limiting and logging will be broken:
```
servers {
    trusted_proxies cloudflare
}
```
Use the `caddy-cloudflare-ip` module or maintain the Cloudflare IP range list manually.
Set Cloudflare SSL/TLS mode to **Full (strict)**.

---

## Routing table

| Public path | Internal target | Notes |
|---|---|---|
| `/` | `web:3000` | Next.js public site |
| `/api/pm/*` | `pm:8000` | FastAPI PM service |
| `/cms/*` | `directus:8055` | Directus API + admin |
| `/assets/*` | `directus:8055` | Directus file serving |

### Restricted paths — block from public
```
# Block Directus admin to known IPs only
@admin {
    path /cms/admin*
    not remote_ip <YOUR_ADMIN_IP>
}
respond @admin 403

# Block internal health/info endpoints
@internal {
    path /cms/server/info* /cms/server/health*
    path /api/pm/docs* /api/pm/redoc* /api/pm/openapi.json*
}
respond @internal 403

# Block dotfiles and config files
@dotfiles {
    path /.env* /.git* /config*
}
respond @dotfiles 404
```

---

## File layout
```
caddy/
├── CLAUDE.md
├── Caddyfile          # production config
└── Caddyfile.dev      # local dev config (tls internal, no rate limits)
```

## Local development
Use `Caddyfile.dev` with `tls internal` (self-signed cert). Never apply production
rate limits, IP restrictions, or connection limits locally — they will block normal dev.
