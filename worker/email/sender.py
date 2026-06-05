from pathlib import Path
import httpx
from jinja2 import Environment, FileSystemLoader, select_autoescape
import config

_env: Environment | None = None


def _get_env() -> Environment:
    global _env
    if _env is None:
        _env = Environment(
            loader=FileSystemLoader(Path(__file__).parent / "templates"),
            autoescape=select_autoescape(["html"]),
        )
    return _env


def render(template_name: str, locale: str, context: dict) -> str:
    jinja = _get_env()
    try:
        tmpl = jinja.get_template(f"{locale}/{template_name}")
    except Exception:
        tmpl = jinja.get_template(f"en/{template_name}")
    return tmpl.render(**context)


def send_email(to: str, subject: str, html: str) -> None:
    if config.EMAIL_PROVIDER == "postmark":
        resp = httpx.post(
            "https://api.postmarkapp.com/email",
            headers={"X-Postmark-Server-Token": config.EMAIL_API_KEY},
            json={"From": config.EMAIL_FROM, "To": to, "Subject": subject, "HtmlBody": html},
            timeout=15,
        )
        resp.raise_for_status()
    elif config.EMAIL_PROVIDER == "resend":
        resp = httpx.post(
            "https://api.resend.com/emails",
            headers={"Authorization": f"Bearer {config.EMAIL_API_KEY}"},
            json={"from": config.EMAIL_FROM, "to": [to], "subject": subject, "html": html},
            timeout=15,
        )
        resp.raise_for_status()
    else:
        raise ValueError(f"Unsupported EMAIL_PROVIDER: {config.EMAIL_PROVIDER}")
