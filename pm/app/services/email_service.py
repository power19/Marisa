"""
Thin email service. Sends via HTTP to Postmark (or any provider with compatible API).
All calls are fire-and-forget; log errors but never let email failure break the main flow.
"""
import logging
from ..core.config import settings

logger = logging.getLogger(__name__)


def _send(to: str, subject: str, body_html: str) -> None:
    if not settings.EMAIL_API_KEY:
        logger.warning("EMAIL_API_KEY not set — skipping email to %s", to)
        return
    import httpx
    try:
        resp = httpx.post(
            "https://api.postmarkapp.com/email",
            headers={
                "X-Postmark-Server-Token": settings.EMAIL_API_KEY,
                "Content-Type": "application/json",
            },
            json={
                "From": settings.EMAIL_FROM,
                "To": to,
                "Subject": subject,
                "HtmlBody": body_html,
            },
            timeout=10,
        )
        resp.raise_for_status()
    except Exception as exc:
        logger.error("Failed to send email to %s: %s", to, exc)


def notify_ticket_created(ticket_id, title: str, unit_label: str, reported_by: str, central_inbox: str) -> None:
    subject = f"[Far East PM] New maintenance ticket: {title}"
    body = f"""
<p>A new maintenance ticket has been submitted.</p>
<ul>
  <li><strong>Unit:</strong> {unit_label}</li>
  <li><strong>Title:</strong> {title}</li>
  <li><strong>Ticket ID:</strong> {ticket_id}</li>
  <li><strong>Reported by:</strong> {reported_by}</li>
</ul>
<p>Please review and assign this ticket in the PM system.</p>
"""
    if central_inbox:
        _send(central_inbox, subject, body)


def notify_ticket_status_changed(
    tenant_email: str,
    ticket_id,
    title: str,
    new_status: str,
) -> None:
    subject = f"[Far East PM] Ticket update: {title}"
    body = f"""
<p>Your maintenance ticket status has been updated.</p>
<ul>
  <li><strong>Title:</strong> {title}</li>
  <li><strong>New Status:</strong> {new_status}</li>
  <li><strong>Ticket ID:</strong> {ticket_id}</li>
</ul>
<p>Thank you for your patience.</p>
"""
    _send(tenant_email, subject, body)


def send_owner_statement(
    owner_email: str,
    owner_name: str,
    period_start,
    period_end,
    pdf_url: str,
) -> None:
    subject = f"[Far East PM] Owner statement {period_start} – {period_end}"
    body = f"""
<p>Dear {owner_name},</p>
<p>Please find your owner statement for the period <strong>{period_start}</strong> to <strong>{period_end}</strong>.</p>
<p><a href="{pdf_url}">Download PDF Statement</a></p>
<p>Far East Property Management</p>
"""
    _send(owner_email, subject, body)
