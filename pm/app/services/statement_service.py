"""
Owner statement generation: aggregate payments for all units owned in a period.
"""
import uuid
from datetime import date
from decimal import Decimal
from pathlib import Path
from jinja2 import Environment, FileSystemLoader, select_autoescape
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from ..models.owner import Owner
from ..models.owner_statement import OwnerStatement
from ..models.unit import Unit
from ..models.lease import Lease
from ..models.rent_charge import RentCharge, ChargeStatus
from ..models.payment import Payment
from ..schemas.owner_statement import OwnerStatementCreate
from . import r2_service

_TEMPLATES = Path(__file__).parent.parent / "templates"


def _render_html(statement: OwnerStatement, owner: Owner, rows: list[dict]) -> str:
    env = Environment(
        loader=FileSystemLoader(str(_TEMPLATES)),
        autoescape=select_autoescape(["html"]),
    )
    tmpl = env.get_template("statements/statement.html")
    return tmpl.render(statement=statement, owner=owner, rows=rows)


async def generate_statement(
    owner_id: uuid.UUID,
    data: OwnerStatementCreate,
    db: AsyncSession,
) -> OwnerStatement:
    owner_result = await db.execute(select(Owner).where(Owner.id == owner_id))
    owner = owner_result.scalar_one_or_none()
    if owner is None:
        raise ValueError(f"Owner {owner_id} not found")

    # Collect payments across all units/leases in the period
    units_result = await db.execute(select(Unit).where(Unit.owner_id == owner_id))
    units = units_result.scalars().all()

    total_collected = Decimal("0")
    rows: list[dict] = []

    for unit in units:
        leases_result = await db.execute(
            select(Lease)
            .where(Lease.unit_id == unit.id)
            .options(selectinload(Lease.charges).selectinload(RentCharge.payments))
        )
        for lease in leases_result.scalars().all():
            for charge in lease.charges:
                if charge.period < data.period_start or charge.period > data.period_end:
                    continue
                for pmt in charge.payments:
                    if pmt.paid_on < data.period_start or pmt.paid_on > data.period_end:
                        continue
                    total_collected += pmt.amount
                    rows.append({
                        "unit": unit.label,
                        "period": charge.period,
                        "paid_on": pmt.paid_on,
                        "amount": pmt.amount,
                        "currency": pmt.currency,
                    })

    mgmt_fee = (total_collected * data.mgmt_fee_pct / Decimal("100")).quantize(Decimal("0.01"))
    net_payout = total_collected - mgmt_fee

    statement = OwnerStatement(
        owner_id=owner_id,
        period_start=data.period_start,
        period_end=data.period_end,
        rent_collected=total_collected,
        mgmt_fee=mgmt_fee,
        net_payout=net_payout,
        currency=data.currency,
    )
    db.add(statement)
    await db.flush()

    from weasyprint import HTML  # lazy import so tests can mock without weasyprint installed
    html = _render_html(statement, owner, rows)
    pdf_bytes = HTML(string=html).write_pdf()
    key = f"statements/{owner_id}/{statement.id}.pdf"
    r2_service.upload_bytes(key, pdf_bytes)
    statement.pdf = key

    await db.commit()
    await db.refresh(statement)
    return statement
