import uuid
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from ....core.database import get_db
from ....core.auth import get_current_user, CurrentUser
from ....models.owner_statement import OwnerStatement
from ....schemas.owner_statement import OwnerStatementCreate, OwnerStatementOut
from ....services.statement_service import generate_statement

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
