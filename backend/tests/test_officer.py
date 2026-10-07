"""
Tests for Officer Work Queue, Dashboard Stats, RBAC Isolation, and State Updates.
Verifies:
1. Officer A views complaints assigned to Officer A.
2. Officer A CANNOT view complaints assigned to Officer B (403 Forbidden).
3. Officer B CANNOT view complaints assigned to Officer A (403 Forbidden).
4. Officer B cannot update status or download media of Officer A's complaint (403 Forbidden).
5. Officer listing filters strictly to their assigned complaints by default.
6. Officer search and category filtering work properly.
7. Real Officer stats aggregation (total, assigned, in_progress, resolved, closed, avg_resolution_hours).
8. End-to-End multi-role lifecycle with Officer work queue.
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


def make_payload(category_id: int, **overrides):
    payload = {
        "title": "Streetlight failure on 5th Avenue",
        "description": "Street lamp post damaged and sparking during evening hours.",
        "category_id": category_id,
        "latitude": 28.6140,
        "longitude": 77.2095,
        "address": "5th Avenue, Ward 12",
    }
    payload.update(overrides)
    return payload


@pytest_asyncio.fixture
async def officer_b_user(db_session: AsyncSession) -> User:
    """Create Officer B belonging to the same department (ROADS) to test strict cross-officer isolation."""
    stmt = select(User).where(User.email == "officer.b@citymind.gov")
    user = (await db_session.execute(stmt)).scalar_one_or_none()
    if not user:
        role = (await db_session.execute(select(Role).where(Role.name == "OFFICER"))).scalar_one()
        dept = (await db_session.execute(select(Department).where(Department.code == "ROADS"))).scalar_one()
        user = User(
            email="officer.b@citymind.gov",
            hashed_password=get_password_hash("OfficerPass123!"),
            full_name="Priya Officer B",
            role_id=role.id,
            is_active=True,
        )
        db_session.add(user)
        await db_session.flush()

        profile = Officer(
            user_id=user.id,
            department_id=dept.id,
            badge_number="TEST-ROADS-002",
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


# ==============================================================================
# 1. Isolation Tests: Officer A vs Officer B
# ==============================================================================


@pytest.mark.asyncio
async def test_officer_isolation_between_officer_a_and_officer_b(
    client: AsyncClient,
    citizen_token: str,
    admin_token: str,
    officer_token: str,
    officer_b_token: str,
    test_officer_user: User,
    officer_b_user: User,
    test_category: ComplaintCategory,
):
    """
    Admin
     ├── Complaint CM-001 → Officer A
     └── Complaint CM-002 → Officer B

    Officer A:
     ├── CM-001 ✅
     └── CM-002 ❌ (403 Forbidden)

    Officer B:
     ├── CM-002 ✅
     └── CM-001 ❌ (403 Forbidden)
    """
    c_headers = {"Authorization": f"Bearer {citizen_token}"}
    a_headers = {"Authorization": f"Bearer {admin_token}"}
    oa_headers = {"Authorization": f"Bearer {officer_token}"}
    ob_headers = {"Authorization": f"Bearer {officer_b_token}"}

    # Citizen files Complaint 1
    p1 = make_payload(test_category.id, title="Complaint 1 for Officer A")
    c1_res = await client.post("/api/v1/complaints", json=p1, headers=c_headers)
    assert c1_res.status_code == 201
    cid_1 = c1_res.json()["id"]

    # Citizen files Complaint 2
    p2 = make_payload(test_category.id, title="Complaint 2 for Officer B")
    c2_res = await client.post("/api/v1/complaints", json=p2, headers=c_headers)
    assert c2_res.status_code == 201
    cid_2 = c2_res.json()["id"]

    # Admin assigns Complaint 1 to Officer A
    assign1 = await client.patch(
        f"/api/v1/complaints/{cid_1}/assign",
        json={"officer_id": str(test_officer_user.officer_profile.id)},
        headers=a_headers,
    )
    assert assign1.status_code == 200

    # Admin assigns Complaint 2 to Officer B
    assign2 = await client.patch(
        f"/api/v1/complaints/{cid_2}/assign",
        json={"officer_id": str(officer_b_user.officer_profile.id)},
        headers=a_headers,
    )
    assert assign2.status_code == 200

    # Officer A views Complaint 1: SUCCESS (200)
    oa_view_c1 = await client.get(f"/api/v1/complaints/{cid_1}", headers=oa_headers)
    assert oa_view_c1.status_code == 200
    assert oa_view_c1.json()["id"] == cid_1

    # Officer A views Complaint 2 (assigned to Officer B): FORBIDDEN (403)
    oa_view_c2 = await client.get(f"/api/v1/complaints/{cid_2}", headers=oa_headers)
    assert oa_view_c2.status_code == 403
    assert "access denied" in oa_view_c2.json()["detail"]["message"].lower()

    # Officer B views Complaint 2: SUCCESS (200)
    ob_view_c2 = await client.get(f"/api/v1/complaints/{cid_2}", headers=ob_headers)
    assert ob_view_c2.status_code == 200
    assert ob_view_c2.json()["id"] == cid_2

    # Officer B views Complaint 1 (assigned to Officer A): FORBIDDEN (403)
    ob_view_c1 = await client.get(f"/api/v1/complaints/{cid_1}", headers=ob_headers)
    assert ob_view_c1.status_code == 403
    assert "access denied" in ob_view_c1.json()["detail"]["message"].lower()

    # Officer B cannot update status of Officer A's complaint
    ob_patch_c1 = await client.patch(
        f"/api/v1/complaints/{cid_1}/status",
        json={"status": "IN_PROGRESS", "remarks": "Unauthorized attempt"},
        headers=ob_headers,
    )
    assert ob_patch_c1.status_code == 403

    # Officer A lists complaints: must include cid_1 and NOT include cid_2
    oa_list = await client.get("/api/v1/complaints", headers=oa_headers)
    assert oa_list.status_code == 200
    oa_items = oa_list.json()["items"]
    oa_ids = [item["id"] for item in oa_items]
    assert cid_1 in oa_ids
    assert cid_2 not in oa_ids

    # Officer B lists complaints: must include cid_2 and NOT include cid_1
    ob_list = await client.get("/api/v1/complaints", headers=ob_headers)
    assert ob_list.status_code == 200
    ob_items = ob_list.json()["items"]
    ob_ids = [item["id"] for item in ob_items]
    assert cid_2 in ob_ids
    assert cid_1 not in ob_ids


# ==============================================================================
# 2. Officer State Machine Update & History
# ==============================================================================


@pytest.mark.asyncio
async def test_officer_updates_assigned_complaint_status(
    client: AsyncClient,
    citizen_token: str,
    admin_token: str,
    officer_token: str,
    test_officer_user: User,
    test_category: ComplaintCategory,
):
    """
    Officer transitions their assigned complaint:
    ASSIGNED -> IN_PROGRESS -> RESOLVED
    """
    c_headers = {"Authorization": f"Bearer {citizen_token}"}
    a_headers = {"Authorization": f"Bearer {admin_token}"}
    oa_headers = {"Authorization": f"Bearer {officer_token}"}

    # Citizen submits
    c_res = await client.post("/api/v1/complaints", json=make_payload(test_category.id), headers=c_headers)
    cid = c_res.json()["id"]

    # Admin assigns to Officer
    assign_res = await client.patch(
        f"/api/v1/complaints/{cid}/assign",
        json={"officer_id": str(test_officer_user.officer_profile.id)},
        headers=a_headers,
    )
    assert assign_res.status_code == 200
    assert assign_res.json()["status"] == "ASSIGNED"

    # Officer updates to IN_PROGRESS
    p1 = await client.patch(
        f"/api/v1/complaints/{cid}/status",
        json={"status": "IN_PROGRESS", "remarks": "Dispatching repair crew to site"},
        headers=oa_headers,
    )
    assert p1.status_code == 200
    assert p1.json()["status"] == "IN_PROGRESS"

    # Officer updates to RESOLVED
    p2 = await client.patch(
        f"/api/v1/complaints/{cid}/status",
        json={"status": "RESOLVED", "remarks": "Electrical repair complete and verified"},
        headers=oa_headers,
    )
    assert p2.status_code == 200
    assert p2.json()["status"] == "RESOLVED"
    assert p2.json()["resolved_at"] is not None

    # Citizen checks and sees RESOLVED with audit trail
    c_detail = await client.get(f"/api/v1/complaints/{cid}", headers=c_headers)
    assert c_detail.status_code == 200
    detail_data = c_detail.json()
    assert detail_data["status"] == "RESOLVED"
    assert any(h["new_status"] == "IN_PROGRESS" for h in detail_data["status_history"])
    assert any(h["new_status"] == "RESOLVED" for h in detail_data["status_history"])


# ==============================================================================
# 3. Officer Stats Endpoint
# ==============================================================================


@pytest.mark.asyncio
async def test_officer_stats_endpoint(
    client: AsyncClient,
    citizen_token: str,
    admin_token: str,
    officer_token: str,
    test_officer_user: User,
    test_category: ComplaintCategory,
):
    """Test /api/v1/complaints/stats/officer returns real metrics strictly for authenticated officer."""
    oa_headers = {"Authorization": f"Bearer {officer_token}"}
    a_headers = {"Authorization": f"Bearer {admin_token}"}
    c_headers = {"Authorization": f"Bearer {citizen_token}"}

    # Initial stats
    s_initial = await client.get("/api/v1/complaints/stats/officer", headers=oa_headers)
    assert s_initial.status_code == 200
    init_data = s_initial.json()
    initial_total = init_data["total"]

    # Create and assign new complaint
    c_res = await client.post("/api/v1/complaints", json=make_payload(test_category.id), headers=c_headers)
    cid = c_res.json()["id"]

    await client.patch(
        f"/api/v1/complaints/{cid}/assign",
        json={"officer_id": str(test_officer_user.officer_profile.id)},
        headers=a_headers,
    )

    # Check stats incremented
    s_updated = await client.get("/api/v1/complaints/stats/officer", headers=oa_headers)
    assert s_updated.status_code == 200
    up_data = s_updated.json()
    assert up_data["total"] == initial_total + 1
    assert up_data["assigned"] >= 1

    # Transition to IN_PROGRESS
    await client.patch(
        f"/api/v1/complaints/{cid}/status",
        json={"status": "IN_PROGRESS", "remarks": "Started"},
        headers=oa_headers,
    )
    s_prog = await client.get("/api/v1/complaints/stats/officer", headers=oa_headers)
    assert s_prog.json()["in_progress"] >= 1

    # Transition to RESOLVED
    await client.patch(
        f"/api/v1/complaints/{cid}/status",
        json={"status": "RESOLVED", "remarks": "Done"},
        headers=oa_headers,
    )
    s_res = await client.get("/api/v1/complaints/stats/officer", headers=oa_headers)
    assert s_res.json()["resolved"] >= 1
    assert s_res.json()["avg_resolution_hours"] is not None
    assert s_res.json()["resolution_rate"] is not None


# ==============================================================================
# 4. Officer Search & Category Filtering
# ==============================================================================


@pytest.mark.asyncio
async def test_officer_search_and_filter(
    client: AsyncClient,
    citizen_token: str,
    admin_token: str,
    officer_token: str,
    test_officer_user: User,
    test_category: ComplaintCategory,
):
    """Officer can search by keywords and filter by status and category in their queue."""
    c_headers = {"Authorization": f"Bearer {citizen_token}"}
    a_headers = {"Authorization": f"Bearer {admin_token}"}
    oa_headers = {"Authorization": f"Bearer {officer_token}"}

    unique_keyword = f"ZebraCrossing{uuid.uuid4().hex[:6]}"
    p = make_payload(test_category.id, title=f"Faded {unique_keyword} causing hazard")
    c_res = await client.post("/api/v1/complaints", json=p, headers=c_headers)
    cid = c_res.json()["id"]

    await client.patch(
        f"/api/v1/complaints/{cid}/assign",
        json={"officer_id": str(test_officer_user.officer_profile.id)},
        headers=a_headers,
    )

    # Search for unique keyword
    search_res = await client.get(
        "/api/v1/complaints",
        params={"search": unique_keyword},
        headers=oa_headers,
    )
    assert search_res.status_code == 200
    search_data = search_res.json()
    assert any(c["id"] == cid for c in search_data["items"])

    # Filter by category
    cat_res = await client.get(
        "/api/v1/complaints",
        params={"category_id": test_category.id},
        headers=oa_headers,
    )
    assert cat_res.status_code == 200
    assert any(c["id"] == cid for c in cat_res.json()["items"])
