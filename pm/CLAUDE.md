# CLAUDE.md — pm (FastAPI property-management service)

Read `/CLAUDE.md` and `/docs/06-security.md` first. This file adds pm-specific conventions.

## Purpose
Property-management back office: leases, tenants, charges, payments, receipts, owner
statements, maintenance tickets. Owns the `pm` Postgres schema exclusively.

## Authentication — IMPORTANT
FastAPI does **not** manage users. On every request, validate the Directus-issued JWT:
- Directus signs JWTs with its configured secret/key (set `DIRECTUS_SECRET` in env).
- Extract `id` (user UUID) and `role` from the token payload for authorization.
- Reject requests with missing, expired, or invalid tokens with `401`.
- Never store user records in the `pm` schema.

## SQL injection — hard rules
- Use SQLAlchemy ORM for all queries. If raw SQL is unavoidable, use `text()` with bound
  parameters — never f-strings or `.format()`.
- All route parameters must be typed (e.g. `lease_id: UUID`) — Pydantic/FastAPI will
  reject anything that isn't a valid UUID before it reaches the query.
- Same rule applies in Alembic migration scripts.

## Schema ownership
- All `pm` schema changes go through **Alembic** migrations. Never touch Directus-owned tables.
- Money columns: `NUMERIC(14,2)` with a separate `currency` column (`USD`|`EUR`|`SRD`).
  Never use floats for money.

## PDF generation
WeasyPrint for receipts and owner statements. Templates must be locale-aware (`en`/`nl`/`srn`)
and currency-aware (display native currency only).

## Tests
Every money path (lease → charge → payment → receipt → statement) requires tests.
Use pytest. Run `pytest` before committing any PM logic.

## Linting / formatting
`ruff` + `black`. Run before committing.
