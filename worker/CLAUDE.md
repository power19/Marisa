# CLAUDE.md — worker (background jobs)

Read `/CLAUDE.md`, `/docs/06-security.md`, and `/redis/CLAUDE.md` first.
This file adds worker-specific conventions.

## Purpose
Scheduled and triggered background jobs: saved-search alert matching, CRM follow-up
reminders, rent-due reminders. The **only** service allowed to send scheduled or bulk email.

## Scheduler — Celery + Redis
Use **Celery** with Redis as the broker and result backend. Use `celery beat` for
scheduling and `celery worker` for task execution — both run in the same container in v1.

```python
# worker/config.py
CELERY_BROKER_URL    = "redis://:password@redis:6379/0"
CELERY_RESULT_BACKEND = "redis://:password@redis:6379/0"
```

Do not use APScheduler — Celery is the confirmed choice for this stack.

## Jobs

| Job | Module | Schedule |
|---|---|---|
| Saved-search alerts | `jobs.saved_search_alerts` | Every 15 min |
| CRM follow-up reminders | `jobs.crm_reminders` | Daily 08:00 |
| Rent-due reminders | `jobs.rent_reminders` | Daily 07:00 |

## Email
One transactional email provider (configured via env). All emails must be localized
(`en`/`nl`/`srn`). The worker renders and sends — it does not expose an HTTP API.
Never send real emails in tests — mock `worker/email/sender.py`.

## Linting / formatting
`ruff` + `black`. Run before committing.
