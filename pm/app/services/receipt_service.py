"""
Generate a receipt PDF for a payment using WeasyPrint + Jinja2.
Stores the PDF in R2 and returns the R2 key.
"""
from pathlib import Path
from jinja2 import Environment, FileSystemLoader, select_autoescape

from ..models.payment import Payment
from ..models.rent_charge import RentCharge
from ..models.lease import Lease
from ..models.tenant import Tenant
from ..models.unit import Unit
from . import r2_service

_TEMPLATES = Path(__file__).parent.parent / "templates" / "receipts"


def _render_html(payment: Payment, charge: RentCharge, lease: Lease, tenant: Tenant, unit: Unit) -> str:
    env = Environment(
        loader=FileSystemLoader(str(_TEMPLATES.parent)),
        autoescape=select_autoescape(["html"]),
    )
    tmpl = env.get_template("receipts/receipt.html")
    return tmpl.render(
        payment=payment,
        charge=charge,
        lease=lease,
        tenant=tenant,
        unit=unit,
    )


def generate_receipt(
    payment: Payment,
    charge: RentCharge,
    lease: Lease,
    tenant: Tenant,
    unit: Unit,
) -> str:
    """Generate PDF receipt, upload to R2, return R2 key."""
    from weasyprint import HTML  # lazy import so tests can mock without weasyprint installed
    html = _render_html(payment, charge, lease, tenant, unit)
    pdf_bytes = HTML(string=html).write_pdf()
    key = f"receipts/{lease.id}/{charge.period.isoformat()}/{payment.id}.pdf"
    r2_service.upload_bytes(key, pdf_bytes, content_type="application/pdf")
    return key
