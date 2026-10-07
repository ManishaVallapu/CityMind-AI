import math
import uuid
from typing import List, Optional
from fastapi import APIRouter, Depends, File, Query, UploadFile, status
from fastapi.responses import FileResponse
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.dependencies import RoleChecker, get_current_active_user
from app.core.exceptions import AuthorizationError, NotFoundError
from app.db.session import get_db
from app.models.category import ComplaintCategory
from app.models.complaint import Complaint
from app.models.officer import Officer
from app.models.user import User
from app.schemas.category import CategoryRead
from app.schemas.complaint import (
    ComplaintAssign,
    ComplaintAttachmentRead,
    ComplaintCreate,
    ComplaintDetailRead,
    ComplaintListResponse,
    ComplaintRead,
    ComplaintStatusUpdate,
    OfficerStatsResponse,
)
from app.services.complaint_service import ComplaintService
from app.services.storage_service import storage_service

router = APIRouter(prefix="/complaints", tags=["Complaints"])


async def get_officer_profile(db: AsyncSession, user_id: uuid.UUID) -> Optional[Officer]:
    """Retrieve Officer profile linked to User account."""
    stmt = select(Officer).where(Officer.user_id == user_id)
    return (await db.execute(stmt)).scalar_one_or_none()


def can_access_complaint(user: User, complaint: Complaint, officer: Optional[Officer]) -> bool:
    """Evaluate RBAC read access to complaint."""
    role_name = user.role.name.upper()
    if role_name == "ADMIN":
        return True
    if role_name == "CITIZEN":
        return complaint.citizen_id == user.id
    if role_name == "OFFICER" and officer:
        # Officer can access if explicitly assigned to them
        if complaint.assigned_officer_id == officer.id:
            return True
        # If assigned to another officer, access is forbidden
        if complaint.assigned_officer_id is not None:
            return False
        # If unassigned, officer in matching department can view/triage
        if complaint.category and complaint.category.target_department_id == officer.department_id:
            return True
    return False


@router.post(
    "",
    response_model=ComplaintRead,
    status_code=status.HTTP_201_CREATED,
    summary="Submit a new civic complaint (CITIZEN only)",
)
async def create_complaint(
    complaint_in: ComplaintCreate,
    current_citizen: User = Depends(RoleChecker(["CITIZEN"])),
    db: AsyncSession = Depends(get_db),
) -> Complaint:
    """Create a new civic complaint with status SUBMITTED and generate ticket identifier."""
    return await ComplaintService.create_complaint(
        db=db,
        citizen=current_citizen,
        complaint_in=complaint_in,
    )


@router.get(
    "/my",
    response_model=ComplaintListResponse,
    status_code=status.HTTP_200_OK,
    summary="List complaints filed by authenticated citizen (CITIZEN only)",
)
async def list_my_complaints(
    page: int = Query(1, ge=1, description="Page number"),
    page_size: int = Query(10, ge=1, le=100, description="Items per page"),
    current_citizen: User = Depends(RoleChecker(["CITIZEN"])),
    db: AsyncSession = Depends(get_db),
) -> ComplaintListResponse:
    """Retrieve paginated list of complaints filed by the current citizen."""
    items, total = await ComplaintService.list_citizen_complaints(
        db=db,
        citizen_id=current_citizen.id,
        page=page,
        page_size=page_size,
    )
    total_pages = math.ceil(total / page_size) if total > 0 else 0
    return ComplaintListResponse(
        items=[ComplaintRead.model_validate(c) for c in items],
        total=total,
        page=page,
        page_size=page_size,
        total_pages=total_pages,
    )


@router.get(
    "",
    response_model=ComplaintListResponse,
    status_code=status.HTTP_200_OK,
    summary="List department work queue or all complaints (OFFICER and ADMIN only)",
)
async def list_complaints(
    status_filter: Optional[str] = Query(None, alias="status", description="Filter by status"),
    category_id: Optional[int] = Query(None, description="Filter by category ID"),
    department_id: Optional[int] = Query(None, description="Filter by department ID (ADMIN only)"),
    assigned_officer_id: Optional[uuid.UUID] = Query(None, description="Filter by assigned officer ID"),
    assigned_only: Optional[bool] = Query(None, description="Filter complaints assigned to authenticated officer"),
    search: Optional[str] = Query(None, description="Search ticket number, title, description, or address"),
    page: int = Query(1, ge=1, description="Page number"),
    page_size: int = Query(10, ge=1, le=100, description="Items per page"),
    current_user: User = Depends(RoleChecker(["OFFICER", "ADMIN"])),
    db: AsyncSession = Depends(get_db),
) -> ComplaintListResponse:
    """
    List complaints governed by RBAC:
    - Officers see complaints assigned to them (or department if assigned_only=False).
    - Admins see city-wide complaints with optional status, category, department, officer, and search filters.
    """
    role_name = current_user.role.name.upper()

    if role_name == "ADMIN":
        items, total = await ComplaintService.list_all_complaints(
            db=db,
            status=status_filter,
            category_id=category_id,
            department_id=department_id,
            assigned_officer_id=assigned_officer_id,
            search=search,
            page=page,
            page_size=page_size,
        )
    else:
        # Officer role
        officer = await get_officer_profile(db, current_user.id)
        if not officer:
            raise AuthorizationError("User does not have an active municipal officer profile")

        # Default assigned_only to True for officer work queue unless explicitly requested False
        is_assigned_only = True if assigned_only is None else assigned_only
        items, total = await ComplaintService.list_officer_complaints(
            db=db,
            officer=officer,
            status=status_filter,
            category_id=category_id,
            search=search,
            assigned_only=is_assigned_only,
            page=page,
            page_size=page_size,
        )

    total_pages = math.ceil(total / page_size) if total > 0 else 0
    return ComplaintListResponse(
        items=[ComplaintRead.model_validate(c) for c in items],
        total=total,
        page=page,
        page_size=page_size,
        total_pages=total_pages,
    )


@router.get(
    "/categories",
    response_model=List[CategoryRead],
    status_code=status.HTTP_200_OK,
    summary="List active complaint categories",
)
async def list_complaint_categories(
    db: AsyncSession = Depends(get_db),
) -> List[ComplaintCategory]:
    """Retrieve list of active complaint categories."""
    stmt = (
        select(ComplaintCategory)
        .where(ComplaintCategory.is_active.is_(True))
        .order_by(ComplaintCategory.id.asc())
    )
    result = await db.execute(stmt)
    return list(result.scalars().all())


@router.get(
    "/stats/officer",
    response_model=OfficerStatsResponse,
    status_code=status.HTTP_200_OK,
    summary="Get aggregated performance metrics for the authenticated officer (OFFICER only)",
)
async def get_officer_stats(
    current_user: User = Depends(RoleChecker(["OFFICER"])),
    db: AsyncSession = Depends(get_db),
) -> OfficerStatsResponse:
    """Calculate and return real metrics strictly for complaints assigned to the authenticated officer."""
    officer = await get_officer_profile(db, current_user.id)
    if not officer:
        raise AuthorizationError("User does not have an active municipal officer profile")

    stats = await ComplaintService.get_officer_stats(db, officer)
    return OfficerStatsResponse(**stats)


@router.get(
    "/{complaint_id}",
    response_model=ComplaintDetailRead,
    status_code=status.HTTP_200_OK,
    summary="Get complaint details with timeline and attachments",
)
async def get_complaint(
    complaint_id: uuid.UUID,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
) -> Complaint:
    """
    Retrieve complaint details adhering strictly to RBAC:
    - Citizen: only their own complaint.
    - Officer: only complaints within their jurisdiction/assignment.
    - Admin: any complaint.
    """
    complaint = await ComplaintService.get_complaint_by_id(db, complaint_id)
    if not complaint:
        raise NotFoundError("Complaint not found")

    officer = None
    if current_user.role.name.upper() == "OFFICER":
        officer = await get_officer_profile(db, current_user.id)

    if not can_access_complaint(current_user, complaint, officer):
        raise AuthorizationError("Access denied: You are not authorized to view this complaint")

    return complaint


@router.patch(
    "/{complaint_id}/status",
    response_model=ComplaintDetailRead,
    status_code=status.HTTP_200_OK,
    summary="Update complaint status according to state machine rules",
)
async def update_complaint_status(
    complaint_id: uuid.UUID,
    status_in: ComplaintStatusUpdate,
    current_user: User = Depends(RoleChecker(["OFFICER", "ADMIN"])),
    db: AsyncSession = Depends(get_db),
) -> Complaint:
    """
    Transition status according to allowed state transitions.
    Citizen cannot change status.
    Officer can update only if authorized for this complaint.
    """
    complaint = await ComplaintService.get_complaint_by_id(db, complaint_id)
    if not complaint:
        raise NotFoundError("Complaint not found")

    officer = None
    if current_user.role.name.upper() == "OFFICER":
        officer = await get_officer_profile(db, current_user.id)
        if not can_access_complaint(current_user, complaint, officer):
            raise AuthorizationError("Access denied: You are not authorized to update this complaint")

    return await ComplaintService.update_complaint_status(
        db=db,
        complaint=complaint,
        new_status=status_in.status.value,
        user=current_user,
        remarks=status_in.remarks,
    )


@router.patch(
    "/{complaint_id}/assign",
    response_model=ComplaintDetailRead,
    status_code=status.HTTP_200_OK,
    summary="Assign complaint to an officer (ADMIN only)",
)
async def assign_complaint(
    complaint_id: uuid.UUID,
    assign_in: ComplaintAssign,
    current_admin: User = Depends(RoleChecker(["ADMIN"])),
    db: AsyncSession = Depends(get_db),
) -> Complaint:
    """Assign an officer to the complaint. Transitions from SUBMITTED to ASSIGNED if initial."""
    complaint = await ComplaintService.get_complaint_by_id(db, complaint_id)
    if not complaint:
        raise NotFoundError("Complaint not found")

    return await ComplaintService.assign_complaint(
        db=db,
        complaint=complaint,
        officer_id=assign_in.officer_id,
        admin_user=current_admin,
    )


@router.post(
    "/{complaint_id}/attachments",
    response_model=ComplaintAttachmentRead,
    status_code=status.HTTP_201_CREATED,
    summary="Upload image evidence to complaint",
)
async def upload_attachment(
    complaint_id: uuid.UUID,
    file: UploadFile = File(..., description="JPEG, PNG, or WebP image file up to 5MB"),
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
) -> ComplaintAttachmentRead:
    """
    Upload image attachment.
    - Citizen can upload to their own complaint.
    - Officer can upload to complaints within department/assigned.
    - Admin can upload to any complaint.
    """
    complaint = await ComplaintService.get_complaint_by_id(db, complaint_id)
    if not complaint:
        raise NotFoundError("Complaint not found")

    officer = None
    if current_user.role.name.upper() == "OFFICER":
        officer = await get_officer_profile(db, current_user.id)

    if not can_access_complaint(current_user, complaint, officer):
        raise AuthorizationError("Access denied: You are not authorized to attach files to this complaint")

    content = await file.read()
    filename = file.filename or "attachment.jpg"
    content_type = file.content_type or "image/jpeg"

    attachment = await ComplaintService.add_attachment(
        db=db,
        complaint=complaint,
        user=current_user,
        content=content,
        original_filename=filename,
        content_type=content_type,
    )
    return ComplaintAttachmentRead.model_validate(attachment)


@router.get(
    "/{complaint_id}/attachments/{attachment_id}",
    summary="Download or view complaint attachment",
)
async def get_attachment(
    complaint_id: uuid.UUID,
    attachment_id: uuid.UUID,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    """Serve attachment file content adhering to RBAC access controls."""
    complaint = await ComplaintService.get_complaint_by_id(db, complaint_id)
    if not complaint:
        raise NotFoundError("Complaint not found")

    officer = None
    if current_user.role.name.upper() == "OFFICER":
        officer = await get_officer_profile(db, current_user.id)

    if not can_access_complaint(current_user, complaint, officer):
        raise AuthorizationError("Access denied: You are not authorized to view attachments for this complaint")

    attachment = next((a for a in complaint.attachments if a.id == attachment_id), None)
    if not attachment:
        raise NotFoundError("Attachment not found")

    file_path = (storage_service.base_dir / attachment.storage_path).resolve()
    if not file_path.exists():
        raise NotFoundError("Attachment file not found on disk")

    return FileResponse(
        path=str(file_path),
        media_type=attachment.content_type,
        filename=attachment.original_filename,
    )

