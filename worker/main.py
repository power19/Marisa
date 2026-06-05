from config import celery_app  # noqa: F401 — registers beat schedule

import jobs.saved_search_alerts  # noqa: F401
import jobs.crm_reminders  # noqa: F401
import jobs.rent_reminders  # noqa: F401
