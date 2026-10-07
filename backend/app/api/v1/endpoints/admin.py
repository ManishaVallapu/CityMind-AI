from collections import defaultdict
from typing import Dict, List
from fastapi import APIRouter, Depends, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.dependencies import RoleChecker
from app.db.session import get_db
from app.models.category import ComplaintCategory
from app.models.complaint import Complaint, ComplaintStatus
from app.models.department import Department
from app.models.officer import Officer
from app.models.user import User
from app.schemas.admin import (
    AdminOfficerRead,
    AdminStatsResponse,
    CategorySummary,
    DepartmentSummary,
)
from app.schemas.department import DepartmentRead

router = APIRouter(prefix="/admin", tags=["Administration"])


@router.get(
    "/test",
    status_code=status.HTTP_200_OK,
    summary="Admin role restriction verification endpoint",
)
async def admin_role_check(
    current_admin: User = Depends(RoleChecker(["ADMIN"])),
) -> Dict[str, str]:
    """Protected endpoint accessible exclusively by users with ADMIN role."""
    return {
        "message": f"Welcome, Admin {current_admin.full_name}. Role authorization confirmed.",
        "admin_id": str(current_admin.id),
        "role": current_admin.role.name,
    }


@router.get(
    "/stats",
    response_model=AdminStatsResponse,
    status_code=status.HTTP_200_OK,
    summary="Aggregated city-wide complaint statistics (ADMIN only)",
)
async def get_admin_stats(
    current_admin: User = Depends(RoleChecker(["ADMIN"])),
    db: AsyncSession = Depends(get_db),
) -> AdminStatsResponse:
    """Derive real aggregate statistics across all complaints, departments, and officers."""
    # 1. Status aggregates
    status_stmt = select(Complaint.status, func.count(Complaint.id)).group_by(Complaint.status)
    status_rows = (await db.execute(status_stmt)).all()
    status_counts = {str(status_val): count for status_val, count in status_rows}

    submitted = status_counts.get(ComplaintStatus.SUBMITTED.value, 0)
    assigned = status_counts.get(ComplaintStatus.ASSIGNED.value, 0)
    in_progress = status_counts.get(ComplaintStatus.IN_PROGRESS.value, 0)
    resolved = status_counts.get(ComplaintStatus.RESOLVED.value, 0)
    closed = status_counts.get(ComplaintStatus.CLOSED.value, 0)
    rejected = status_counts.get(ComplaintStatus.REJECTED.value, 0)
    total = sum(status_counts.values())

    # 2. Active officers count
    officers_stmt = select(func.count(Officer.id)).where(Officer.is_available.is_(True))
    officers_count = (await db.execute(officers_stmt)).scalar() or 0

    # 3. Department summaries
    depts_stmt = (
        select(Department)
        .where(Department.is_active.is_(True))
        .order_by(Department.name.asc())
    )
    depts = (await db.execute(depts_stmt)).scalars().all()

    dept_status_stmt = (
        select(
            ComplaintCategory.target_department_id,
            Complaint.status,
            func.count(Complaint.id),
        )
        .join(Complaint, Complaint.category_id == ComplaintCategory.id)
        .group_by(ComplaintCategory.target_department_id, Complaint.status)
    )
    dept_status_rows = (await db.execute(dept_status_stmt)).all()

    dept_map: Dict[int, Dict[str, int]] = defaultdict(lambda: defaultdict(int))
    for dept_id, status_val, count in dept_status_rows:
        if dept_id is not None:
            dept_map[dept_id][str(status_val)] = count

    dept_summaries = []
    for d in depts:
        s_map = dept_map.get(d.id, {})
        dept_total = sum(s_map.values())
        dept_summaries.append(
            DepartmentSummary(
                id=d.id,
                name=d.name,
                code=d.code,
                total=dept_total,
                submitted=s_map.get(ComplaintStatus.SUBMITTED.value, 0),
                assigned=s_map.get(ComplaintStatus.ASSIGNED.value, 0),
                in_progress=s_map.get(ComplaintStatus.IN_PROGRESS.value, 0),
                resolved=s_map.get(ComplaintStatus.RESOLVED.value, 0),
                closed=s_map.get(ComplaintStatus.CLOSED.value, 0),
                rejected=s_map.get(ComplaintStatus.REJECTED.value, 0),
            )
        )

    # 4. Category summaries
    cats_stmt = (
        select(
            ComplaintCategory.id,
            ComplaintCategory.name,
            func.count(Complaint.id),
        )
        .outerjoin(Complaint, Complaint.category_id == ComplaintCategory.id)
        .where(ComplaintCategory.is_active.is_(True))
        .group_by(ComplaintCategory.id, ComplaintCategory.name)
        .order_by(ComplaintCategory.name.asc())
    )
    cat_rows = (await db.execute(cats_stmt)).all()
    category_summaries = [
        CategorySummary(id=row[0], name=row[1], total=row[2])
        for row in cat_rows
    ]

    return AdminStatsResponse(
        total=total,
        submitted=submitted,
        assigned=assigned,
        in_progress=in_progress,
        resolved=resolved,
        closed=closed,
        rejected=rejected,
        department_summaries=dept_summaries,
        category_summaries=category_summaries,
        officers_count=officers_count,
    )


@router.get(
    "/officers",
    response_model=List[AdminOfficerRead],
    status_code=status.HTTP_200_OK,
    summary="List all municipal officers for assignment (ADMIN only)",
)
async def list_admin_officers(
    current_admin: User = Depends(RoleChecker(["ADMIN"])),
    db: AsyncSession = Depends(get_db),
) -> List[AdminOfficerRead]:
    """Retrieve roster of officers with department and contact info for assignment without exposing secrets."""
    stmt = (
        select(Officer)
        .options(
            selectinload(Officer.user),
            selectinload(Officer.department),
        )
        .order_by(Officer.badge_number.asc())
    )
    officers = (await db.execute(stmt)).scalars().all()

    return [
        AdminOfficerRead(
            id=officer.id,
            user_id=officer.user.id,
            badge_number=officer.badge_number,
            designation=officer.designation,
            department_id=officer.department_id,
            department_name=officer.department.name if officer.department else None,
            department_code=officer.department.code if officer.department else None,
            is_available=officer.is_available,
            full_name=officer.user.full_name,
            email=officer.user.email,
        )
        for officer in officers
    ]


@router.get(
    "/departments",
    response_model=List[DepartmentRead],
    status_code=status.HTTP_200_OK,
    summary="List all municipal departments (ADMIN only)",
)
async def list_admin_departments(
    current_admin: User = Depends(RoleChecker(["ADMIN"])),
    db: AsyncSession = Depends(get_db),
) -> List[Department]:
    """Retrieve all active municipal departments for administrative filtering."""
    stmt = (
        select(Department)
        .where(Department.is_active.is_(True))
        .order_by(Department.name.asc())
    )
    return list((await db.execute(stmt)).scalars().all())
