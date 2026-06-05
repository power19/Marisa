"""
CRM follow-up reminder job — runs daily at 08:00 UTC.

Finds lead_followups that are due today (or overdue, not yet sent) where done=false,
looks up the assignee's email, and sends a reminder.
"""

from datetime import datetime, timezone, timedelta

import psycopg
import psycopg.rows

import config
from config import celery_app
from email.sender import render, send_email


@celery_app.task(name="jobs.crm_reminders.run")
def run() -> None:
    now = datetime.now(timezone.utc)
    # Remind for anything due within the next 24 h (today) that is not done
    window_end = now + timedelta(hours=24)

    with psycopg.connect(config.DATABASE_URL, row_factory=psycopg.rows.dict_row) as conn:
        rows = conn.execute(
            """
            SELECT
                lf.id,
                lf.due_at,
                lf.note,
                l.contact_name,
                l.email    AS lead_email,
                l.stage,
                du.email   AS assignee_email,
                du.first_name AS assignee_name
            FROM lead_followups lf
            JOIN leads l ON l.id = lf.lead_id
            LEFT JOIN directus_users du ON du.id = lf.assignee
            WHERE lf.done = false
              AND lf.due_at <= $1
              AND du.email IS NOT NULL
            ORDER BY lf.due_at ASC
            """,
            (window_end,),
        ).fetchall()

    for row in rows:
        assignee_name = row["assignee_name"] or row["assignee_email"].split("@")[0]
        overdue = row["due_at"] < now
        due_label = "overdue" if overdue else "due today"

        html = render(
            "crm_reminder.html",
            "en",
            {
                "assignee_name": assignee_name,
                "contact_name": row["contact_name"],
                "lead_email": row["lead_email"],
                "stage": row["stage"],
                "due_label": due_label,
                "due_at": row["due_at"].strftime("%Y-%m-%d %H:%M UTC"),
                "note": row["note"] or "",
            },
        )

        send_email(
            to=row["assignee_email"],
            subject=f"Follow-up {due_label}: {row['contact_name']} — Far East",
            html=html,
        )
