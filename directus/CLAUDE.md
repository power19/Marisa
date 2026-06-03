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
