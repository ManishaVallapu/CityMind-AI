"""
End-to-End Verification of the complete Officer Workflow:
Citizen:
Submit complaint
↓
Admin:
Open complaint
Assign it to Officer A
↓
Officer A:
Login
Open Officer Dashboard
See the assigned complaint
Open complaint
View details/history/media
Update status:
ASSIGNED → IN_PROGRESS
↓
Citizen:
Open complaint history
See updated status

Also verify:
Officer B:
Login
Must NOT see Officer A's complaint.
"""

import io
import uuid
import pytest
import pytest_asyncio
from httpx import AsyncClient
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.security import create_access_token, get_password_hash
from app.models.category import ComplaintCategory
from app.models.department import Department
from app.models.officer import Officer
from app.models.role import Role
from app.models.user import User


@pytest_asyncio.fixture
async def officer_b_user(db_session: AsyncSession) -> User:
    """Provide Officer B belonging to Roads department."""
    stmt = select(User).where(User.email == "e2e.officer.b@citymind.gov")
    user = (await db_session.execute(stmt)).scalar_one_or_none()
    if not user:
        role = (await db_session.execute(select(Role).where(Role.name == "OFFICER"))).scalar_one()
        dept = (await db_session.execute(select(Department).where(Department.code == "ROADS"))).scalar_one()
        user = User(
            email="e2e.officer.b@citymind.gov",
            hashed_password=get_password_hash("OfficerBPass123!"),
            full_name="Priya Sharma (Officer B)",
            role_id=role.id,
            is_active=True,
        )
        db_session.add(user)
        await db_session.flush()

        profile = Officer(
            user_id=user.id,
            department_id=dept.id,
            badge_number="E2E-ROADS-002",
            designation="Field Engineer B",
            is_available=True,
        )
        db_session.add(profile)
        await db_session.commit()
        await db_session.refresh(user)

    stmt2 = (
        select(User)
        .options(
            selectinload(User.role),
            selectinload(User.officer_profile),
        )
        .where(User.id == user.id)
    )
    return (await db_session.execute(stmt2)).scalar_one()


@pytest.fixture
def officer_b_token(officer_b_user: User) -> str:
    return create_access_token(subject=officer_b_user.id, role="OFFICER")


@pytest.mark.asyncio
async def test_end_to_end_officer_workflow(
    client: AsyncClient,
    test_citizen_user: User,
    citizen_token: str,
    test_admin_user: User,
    admin_token: str,
    test_officer_user: User,
    officer_token: str,
    officer_b_user: User,
    officer_b_token: str,
    test_category: ComplaintCategory,
):
    c_headers = {"Authorization": f"Bearer {citizen_token}"}
    a_headers = {"Authorization": f"Bearer {admin_token}"}
    oa_headers = {"Authorization": f"Bearer {officer_token}"}
    ob_headers = {"Authorization": f"Bearer {officer_b_token}"}

    print("\n=================================================================")
    print("STEP 1: Citizen Submits Complaint with Photographic Media Evidence")
    print("=================================================================")
    complaint_payload = {
        "title": "Severe Water Main Fracture & Road Cave-In",
        "description": "High pressure water pipe damaged causing rapid erosion of road foundation.",
        "category_id": test_category.id,
        "latitude": 28.6145,
        "longitude": 77.2102,
        "address": "Ring Road Junction 14, Ward 7",
    }
    create_res = await client.post("/api/v1/complaints", json=complaint_payload, headers=c_headers)
    assert create_res.status_code == 201, create_res.text
    complaint_data = create_res.json()
    complaint_id = complaint_data["id"]
    ticket_number = complaint_data["ticket_number"]
    assert complaint_data["status"] == "SUBMITTED"
    print(f"   [OK] Complaint submitted: Ticket {ticket_number} (ID: {complaint_id})")

    # Upload attachment evidence
    png_bytes = (
        b"\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01\x00\x00\x00\x01\x08\x06\x00\x00\x00\x1f\x15c4"
        b"\x00\x00\x00\nIDATx\x9cc\x00\x01\x00\x00\x05\x00\x01\r\n-\xb4\x00\x00\x00\x00IEND\xaeB`\x82"
    )
    upload_res = await client.post(
        f"/api/v1/complaints/{complaint_id}/attachments",
        files={"file": ("rupture_photo.png", io.BytesIO(png_bytes), "image/png")},
        headers=c_headers,
    )
    assert upload_res.status_code == 201, upload_res.text
    attachment_id = upload_res.json()["id"]
    print(f"   [OK] Attached evidence: rupture_photo.png (ID: {attachment_id})")

    print("\n=================================================================")
    print("STEP 2: Admin Opens Complaint and Assigns it to Officer A")
    print("=================================================================")
    officer_a_profile_id = str(test_officer_user.officer_profile.id)
    assign_res = await client.patch(
        f"/api/v1/complaints/{complaint_id}/assign",
        json={"officer_id": officer_a_profile_id},
        headers=a_headers,
    )
    assert assign_res.status_code == 200, assign_res.text
    assign_data = assign_res.json()
    assert assign_data["status"] == "ASSIGNED"
    assert assign_data["assigned_officer_id"] == officer_a_profile_id
    print(f"   [OK] Admin assigned ticket to Officer A: {test_officer_user.full_name} (Badge: {test_officer_user.officer_profile.badge_number})")

    print("\n=================================================================")
    print("STEP 3: Officer A Logs in, Opens Dashboard & Work Queue")
    print("=================================================================")
    # Officer A checks their dashboard stats
    oa_stats_res = await client.get("/api/v1/complaints/stats/officer", headers=oa_headers)
    assert oa_stats_res.status_code == 200, oa_stats_res.text
    oa_stats = oa_stats_res.json()
    assert oa_stats["total"] >= 1
    assert oa_stats["assigned"] >= 1
    print(f"   [OK] Officer A Dashboard Stats: Total Assigned={oa_stats['total']}, Status Assigned={oa_stats['assigned']}")

    # Officer A views their assigned work queue
    oa_queue_res = await client.get("/api/v1/complaints?assigned_only=true", headers=oa_headers)
    assert oa_queue_res.status_code == 200, oa_queue_res.text
    oa_queue = oa_queue_res.json()
    assert any(c["id"] == complaint_id for c in oa_queue["items"])
    print(f"   [OK] Officer A sees ticket {ticket_number} in their assigned work queue.")

    print("\n=================================================================")
    print("STEP 4: Officer A Opens Complaint Details, Views History & Evidence")
    print("=================================================================")
    oa_detail_res = await client.get(f"/api/v1/complaints/{complaint_id}", headers=oa_headers)
    assert oa_detail_res.status_code == 200, oa_detail_res.text
    oa_detail = oa_detail_res.json()
    assert oa_detail["id"] == complaint_id
    assert oa_detail["assigned_officer_id"] == officer_a_profile_id
    assert len(oa_detail["attachments"]) >= 1
    assert len(oa_detail["status_history"]) >= 1
    print(f"   [OK] Officer A inspected details: Citizen={oa_detail['citizen']['full_name']}, Attachments={len(oa_detail['attachments'])}")

    # Officer A downloads the media attachment
    oa_media_res = await client.get(f"/api/v1/complaints/{complaint_id}/attachments/{attachment_id}", headers=oa_headers)
    assert oa_media_res.status_code == 200
    assert oa_media_res.headers["content-type"] == "image/png"
    print(f"   [OK] Officer A downloaded authenticated photographic evidence.")

    print("\n=================================================================")
    print("STEP 5: Officer A Updates Status: ASSIGNED -> IN_PROGRESS")
    print("=================================================================")
    oa_status_update = await client.patch(
        f"/api/v1/complaints/{complaint_id}/status",
        json={"status": "IN_PROGRESS", "remarks": "Excavation and shoring crew mobilized to Ring Road"},
        headers=oa_headers,
    )
    assert oa_status_update.status_code == 200, oa_status_update.text
    assert oa_status_update.json()["status"] == "IN_PROGRESS"
    print(f"   [OK] Officer A successfully transitioned status to IN_PROGRESS.")

    print("\n=================================================================")
    print("STEP 6: Citizen Checks Complaint History and Sees Updated Status")
    print("=================================================================")
    citizen_check = await client.get(f"/api/v1/complaints/{complaint_id}", headers=c_headers)
    assert citizen_check.status_code == 200, citizen_check.text
    c_check_data = citizen_check.json()
    assert c_check_data["status"] == "IN_PROGRESS"
    assert c_check_data["assigned_officer"]["badge_number"] == test_officer_user.officer_profile.badge_number
    # Verify status history includes the transition
    assert any(h["new_status"] == "IN_PROGRESS" and "Excavation" in (h["remarks"] or "") for h in c_check_data["status_history"])
    print(f"   [OK] Citizen verified IN_PROGRESS status and audit trail record.")

    print("\n=================================================================")
    print("STEP 7: Officer B Isolation Verification — Must NOT See Officer A's Complaint")
    print("=================================================================")
    # Officer B attempts to list complaints
    ob_queue_res = await client.get("/api/v1/complaints?assigned_only=true", headers=ob_headers)
    assert ob_queue_res.status_code == 200, ob_queue_res.text
    ob_items = ob_queue_res.json()["items"]
    assert all(c["id"] != complaint_id for c in ob_items)
    print(f"   [OK] Officer B does NOT see Officer A's complaint {ticket_number} in their queue.")

    # Officer B attempts to access Officer A's complaint details directly: MUST BE 403 FORBIDDEN
    ob_detail_res = await client.get(f"/api/v1/complaints/{complaint_id}", headers=ob_headers)
    assert ob_detail_res.status_code == 403, f"Expected 403 Forbidden, got {ob_detail_res.status_code}"
    print(f"   [OK] Officer B received 403 Forbidden attempting to view Officer A's complaint.")

    # Officer B attempts to update status: MUST BE 403 FORBIDDEN
    ob_update_res = await client.patch(
        f"/api/v1/complaints/{complaint_id}/status",
        json={"status": "RESOLVED", "remarks": "Unauthorized modification"},
        headers=ob_headers,
    )
    assert ob_update_res.status_code == 403, f"Expected 403 Forbidden, got {ob_update_res.status_code}"
    print(f"   [OK] Officer B received 403 Forbidden attempting to update status.")

    # Officer B attempts to download attachment: MUST BE 403 FORBIDDEN
    ob_media_res = await client.get(
        f"/api/v1/complaints/{complaint_id}/attachments/{attachment_id}",
        headers=ob_headers,
    )
    assert ob_media_res.status_code == 403, f"Expected 403 Forbidden, got {ob_media_res.status_code}"
    print(f"   [OK] Officer B received 403 Forbidden attempting to download attachment.")

    print("\n=================================================================")
    print(">>> COMPLETE END-TO-END OFFICER WORKFLOW VERIFIED SUCCESSFULLY! <<<")
    print("=================================================================\n")
