import os
from celery import Celery
from celery.schedules import crontab

REDIS_URL = os.environ["REDIS_URL"]
DATABASE_URL = os.environ["DATABASE_URL"].replace("postgresql+asyncpg://", "postgresql://")
DIRECTUS_PUBLIC_URL = os.environ["DIRECTUS_PUBLIC_URL"]
EMAIL_PROVIDER = os.environ.get("EMAIL_PROVIDER", "postmark")
EMAIL_API_KEY = os.environ["EMAIL_API_KEY"]
EMAIL_FROM = os.environ["EMAIL_FROM"]
EMAIL_CENTRAL_INBOX = os.environ["EMAIL_CENTRAL_INBOX"]
SITE_URL = os.environ.get("SITE_URL", "http://localhost:3000")

celery_app = Celery("worker", broker=REDIS_URL, backend=REDIS_URL)

celery_app.conf.update(
    task_serializer="json",
    result_serializer="json",
    accept_content=["json"],
    timezone="UTC",
    enable_utc=True,
    beat_schedule={
        "saved-search-alerts": {
            "task": "jobs.saved_search_alerts.run",
            "schedule": 900.0,  # every 15 minutes
        },
        "crm-reminders": {
            "task": "jobs.crm_reminders.run",
            "schedule": crontab(hour=8, minute=0),
        },
        "rent-reminders": {
            "task": "jobs.rent_reminders.run",
            "schedule": crontab(hour=7, minute=0),
        },
    },
)
