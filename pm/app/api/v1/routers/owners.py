import uuid
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from ....core.database import get_db
from ....core.auth import get_current_user, CurrentUser
from ....models.owner import Owner
from ....schemas.owner import OwnerCreate, OwnerUpdate, OwnerOut

router = APIRouter(prefix="/owners", tags=["owners"])


@router.get("", response_model=list[OwnerOut])
async def list_owners(
    db: AsyncSession = Depends(get_db),
    user: CurrentUser = Depends(get_current_user),
):
    user.require_agent()
    result = await db.execute(select(Owner))
    return result.scalars().all()


@router.post("", response_model=OwnerOut, status_code=201)
async def create_owner(
    body: OwnerCreate,
    db: AsyncSession = Depends(get_db),
    user: CurrentUser = Depends(get_current_user),
):
    user.require_agent()
    owner = Owner(**body.model_dump())
    db.add(owner)
    await db.commit()
    await db.refresh(owner)
    return owner


@router.get("/{owner_id}", response_model=OwnerOut)
async def get_owner(
    owner_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    user: CurrentUser = Depends(get_current_user),
):
    user.require_agent()
    result = await db.execute(select(Owner).where(Owner.id == owner_id))
    owner = result.scalar_one_or_none()
    if owner is None:
        raise HTTPException(status_code=404, detail="Owner not found")
    return owner


@router.patch("/{owner_id}", response_model=OwnerOut)
async def update_owner(
    owner_id: uuid.UUID,
    body: OwnerUpdate,
    db: AsyncSession = Depends(get_db),
    user: CurrentUser = Depends(get_current_user),
):
    user.require_agent()
    result = await db.execute(select(Owner).where(Owner.id == owner_id))
    owner = result.scalar_one_or_none()
    if owner is None:
        raise HTTPException(status_code=404, detail="Owner not found")
    for k, v in body.model_dump(exclude_none=True).items():
        setattr(owner, k, v)
    await db.commit()
    await db.refresh(owner)
    return owner
