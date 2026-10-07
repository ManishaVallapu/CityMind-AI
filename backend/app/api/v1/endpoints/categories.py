from typing import List
from fastapi import APIRouter, Depends, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.models.category import ComplaintCategory
from app.schemas.category import CategoryRead

router = APIRouter(prefix="/categories", tags=["Categories"])


@router.get(
    "",
    response_model=List[CategoryRead],
    status_code=status.HTTP_200_OK,
    summary="List active municipal complaint categories",
)
async def list_categories(
    db: AsyncSession = Depends(get_db),
) -> List[ComplaintCategory]:
    """Retrieve list of active municipal complaint categories."""
    stmt = (
        select(ComplaintCategory)
        .where(ComplaintCategory.is_active.is_(True))
        .order_by(ComplaintCategory.id.asc())
    )
    result = await db.execute(stmt)
    return list(result.scalars().all())
