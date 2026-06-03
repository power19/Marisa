# CLAUDE.md — worker (background jobs)

Read `/CLAUDE.md` first. This file adds worker-specific conventions.

## Purpose
Scheduled and triggered background jobs: saved-search alert matching, CRM follow-up reminders,
rent-due reminders. The **only** service allowed to send scheduled or bulk email.

## Scheduler
**APScheduler** for v1. Do not introduce Celery or Redis unless volume explicitly demands it
and the decision is confirmed with the team.

## Jobs
- Saved-search alerts: match new/updated listings against registered visitor saved searches →
  send localized alert email.
- CRM follow-up reminders: notify agents of due follow-ups.
- Rent-due reminders: notify tenants of upcoming/overdue charges (via FastAPI data).

## Email
One transactional email provider (configured via env). All emails must be localized
(`en`/`nl`/`srn`). The worker renders and sends; it does not expose an HTTP API.

## Linting / formatting
`ruff` + `black`. Run before committing.
