import uuid
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from ....core.database import get_db
from ....core.auth import get_current_user, CurrentUser
from ....models.owner import Owner
from ....models.owner_statement import OwnerStatement
from ....schemas.owner_statement import OwnerStatementCreate, OwnerStatementOut
from ....services.statement_service import generate_statement
from ....services import r2_service

router = APIRouter(prefix="/owners/{owner_id}/statements", tags=["statements"])


@router.get("", response_model=list[OwnerStatementOut])
async def list_statements(
    owner_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    user: CurrentUser = Depends(get_current_user),
):
    user.require_agent()
    result = await db.execute(select(OwnerStatement).where(OwnerStatement.owner_id == owner_id))
    return result.scalars().all()


@router.post("", response_model=OwnerStatementOut, status_code=201)
async def create_statement(
    owner_id: uuid.UUID,
    body: OwnerStatementCreate,
    db: AsyncSession = Depends(get_db),
    user: CurrentUser = Depends(get_current_user),
):
    user.require_admin()
    try:
        stmt = await generate_statement(owner_id, body, db)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    return stmt


@router.post("/{statement_id}/send", response_model=OwnerStatementOut)
async def send_statement(
    owner_id: uuid.UUID,
    statement_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    user: CurrentUser = Depends(get_current_user),
):
    """Email the statement PDF to the owner and record sent_at."""
    user.require_admin()

    stmt_result = await db.execute(
        select(OwnerStatement).where(
            OwnerStatement.id == statement_id,
            OwnerStatement.owner_id == owner_id,
        )
    )
    statement = stmt_result.scalar_one_or_none()
    if statement is None:
        raise HTTPException(status_code=404, detail="Statement not found")

    owner_result = await db.execute(select(Owner).where(Owner.id == owner_id))
    owner = owner_result.scalar_one_or_none()
    if owner is None:
        raise HTTPException(status_code=404, detail="Owner not found")

    pdf_url = r2_service.public_url(statement.pdf) if statement.pdf else ""

    from ....services import email_service
    email_service.send_owner_statement(
        owner_email=owner.email,
        owner_name=owner.name,
        period_start=statement.period_start,
        period_end=statement.period_end,
        pdf_url=pdf_url,
    )

    statement.sent_at = datetime.now(timezone.utc)
    await db.commit()
    await db.refresh(statement)
    return statement
