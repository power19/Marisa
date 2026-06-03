# CLAUDE.md — web (Next.js public site)

Read `/CLAUDE.md` first. This file adds web-specific conventions.

## Purpose
Server-rendered public listing site. Read-only against the Directus API (public role token).
Never write business data except via dedicated Directus endpoints (inquiries, viewing requests,
account actions).

## Key constraints
- **App Router** with TypeScript strict mode.
- SSR for search/results pages; ISR for listing detail pages.
- i18n routing: `en` / `nl` / `srn` (default `en`). Every user-facing string must go through
  the i18n layer — no hardcoded copy.
- Maps: **MapLibre + OpenStreetMap** only. No Google Maps.
- No Directus write tokens in client-side code. All writes go through Next.js API routes
  which hold the write token server-side.

## Linting / formatting
`ESLint` + `Prettier`. Run `pnpm lint` and `pnpm format` before committing.

## Environment variables
See `.env.example` at the repo root. Web-specific vars are prefixed `NEXT_PUBLIC_` (public)
or unprefixed (server-only). Never expose Directus write tokens as `NEXT_PUBLIC_`.
