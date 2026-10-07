import pytest
from httpx import AsyncClient

from app.models.category import ComplaintCategory
from app.models.officer import Officer
from app.models.user import User


@pytest.mark.asyncio
async def test_admin_stats_endpoint(
    client: AsyncClient,
    admin_token: str,
    test_officer_user: User,
    test_category: ComplaintCategory,
    citizen_token: str,
):
    """Test /api/v1/admin/stats returns real counts across statuses and departments."""
    # 1. Create a complaint as citizen
    c_headers = {"Authorization": f"Bearer {citizen_token}"}
    payload = {
        "title": "Broken streetlight in Sector 9",
        "description": "Streetlight fixture broken and wires exposed.",
        "category_id": test_category.id,
        "latitude": 28.6139,
        "longitude": 77.2090,
        "address": "Sector 9 main road",
    }
    c_res = await client.post("/api/v1/complaints", json=payload, headers=c_headers)
    assert c_res.status_code == 201

    # 2. Get admin stats
    a_headers = {"Authorization": f"Bearer {admin_token}"}
    stats_res = await client.get("/api/v1/admin/stats", headers=a_headers)
    assert stats_res.status_code == 200
    data = stats_res.json()

    assert data["total"] >= 1
    assert data["submitted"] >= 1
    assert data["officers_count"] >= 1
    assert isinstance(data["department_summaries"], list)
    assert isinstance(data["category_summaries"], list)


@pytest.mark.asyncio
async def test_admin_stats_forbidden_for_citizen(client: AsyncClient, citizen_token: str):
    """Citizen must receive 403 Forbidden on /api/v1/admin/stats."""
    headers = {"Authorization": f"Bearer {citizen_token}"}
    res = await client.get("/api/v1/admin/stats", headers=headers)
    assert res.status_code == 403


@pytest.mark.asyncio
async def test_admin_officers_roster(
    client: AsyncClient,
    admin_token: str,
    test_officer_user: User,
):
    """Admin can list officers without exposing passwords, hashes, or JWTs."""
    headers = {"Authorization": f"Bearer {admin_token}"}
    res = await client.get("/api/v1/admin/officers", headers=headers)
    assert res.status_code == 200
    data = res.json()
    assert len(data) >= 1

    officer = data[0]
    assert "badge_number" in officer
    assert "full_name" in officer
    assert "email" in officer
    assert "department_id" in officer
    assert "is_available" in officer
    # Verify sensitive data is NOT exposed
    assert "password" not in officer
    assert "hashed_password" not in officer
    assert "token" not in officer


@pytest.mark.asyncio
async def test_admin_officers_forbidden_for_citizen(client: AsyncClient, citizen_token: str):
    """Citizen must receive 403 Forbidden on /api/v1/admin/officers."""
    headers = {"Authorization": f"Bearer {citizen_token}"}
    res = await client.get("/api/v1/admin/officers", headers=headers)
    assert res.status_code == 403


@pytest.mark.asyncio
async def test_admin_departments_list(client: AsyncClient, admin_token: str):
    """Admin can list departments."""
    headers = {"Authorization": f"Bearer {admin_token}"}
    res = await client.get("/api/v1/admin/departments", headers=headers)
    assert res.status_code == 200
    data = res.json()
    assert len(data) >= 1
    assert any(d["code"] == "ROADS" for d in data)


@pytest.mark.asyncio
async def test_admin_search_and_filter_complaints(
    client: AsyncClient,
    admin_token: str,
    citizen_token: str,
    test_category: ComplaintCategory,
):
    """Admin can search complaints by title/ticket and filter by status and department."""
    c_headers = {"Authorization": f"Bearer {citizen_token}"}
    unique_title = "Water pipeline leakage near Block 12 XYZ"
    payload = {
        "title": unique_title,
        "description": "Massive pipe burst causing drinking water loss.",
        "category_id": test_category.id,
        "latitude": 28.6139,
        "longitude": 77.2090,
        "address": "Block 12 XYZ",
    }
    c_res = await client.post("/api/v1/complaints", json=payload, headers=c_headers)
    assert c_res.status_code == 201
    created_id = c_res.json()["id"]

    a_headers = {"Authorization": f"Bearer {admin_token}"}

    # Search by keyword
    search_res = await client.get("/api/v1/complaints", params={"search": "Block 12 XYZ"}, headers=a_headers)
    assert search_res.status_code == 200
    search_data = search_res.json()
    assert any(c["id"] == created_id for c in search_data["items"])

    # Filter by status
    status_res = await client.get("/api/v1/complaints", params={"status": "SUBMITTED"}, headers=a_headers)
    assert status_res.status_code == 200
    status_data = status_res.json()
    assert all(c["status"] == "SUBMITTED" for c in status_data["items"])


@pytest.mark.asyncio
async def test_admin_assign_and_lifecycle_transition(
    client: AsyncClient,
    admin_token: str,
    citizen_token: str,
    test_officer_user: User,
    test_category: ComplaintCategory,
):
    """Test full Admin lifecycle: create -> assign officer -> update status to IN_PROGRESS -> RESOLVED -> CLOSED."""
    c_headers = {"Authorization": f"Bearer {citizen_token}"}
    a_headers = {"Authorization": f"Bearer {admin_token}"}

    # 1. Citizen creates complaint
    payload = {
        "title": "Damaged guard rail on highway flyover",
        "description": "High accident risk due to broken steel barrier.",
        "category_id": test_category.id,
        "latitude": 28.6139,
        "longitude": 77.2090,
        "address": "Flyover junction 4",
    }
    c_res = await client.post("/api/v1/complaints", json=payload, headers=c_headers)
    assert c_res.status_code == 201
    comp_id = c_res.json()["id"]

    # 2. Admin retrieves officer roster
    off_res = await client.get("/api/v1/admin/officers", headers=a_headers)
    assert off_res.status_code == 200
    officer_id = off_res.json()[0]["id"]

    # 3. Admin assigns officer
    assign_res = await client.patch(
        f"/api/v1/complaints/{comp_id}/assign",
        json={"officer_id": officer_id},
        headers=a_headers,
    )
    assert assign_res.status_code == 200
    assert assign_res.json()["status"] == "ASSIGNED"
    assert assign_res.json()["assigned_officer_id"] == officer_id

    # 4. Admin updates status to IN_PROGRESS
    progress_res = await client.patch(
        f"/api/v1/complaints/{comp_id}/status",
        json={"status": "IN_PROGRESS", "remarks": "Team dispatched to location"},
        headers=a_headers,
    )
    assert progress_res.status_code == 200
    assert progress_res.json()["status"] == "IN_PROGRESS"

    # 5. Admin updates status to RESOLVED
    resolved_res = await client.patch(
        f"/api/v1/complaints/{comp_id}/status",
        json={"status": "RESOLVED", "remarks": "Guard rail replaced and bolted"},
        headers=a_headers,
    )
    assert resolved_res.status_code == 200
    assert resolved_res.json()["status"] == "RESOLVED"
    assert resolved_res.json()["resolved_at"] is not None

    # 6. Admin updates status to CLOSED
    closed_res = await client.patch(
        f"/api/v1/complaints/{comp_id}/status",
        json={"status": "CLOSED", "remarks": "Inspection completed, ticket closed"},
        headers=a_headers,
    )
    assert closed_res.status_code == 200
    assert closed_res.json()["status"] == "CLOSED"
    assert closed_res.json()["closed_at"] is not None

    # 7. Citizen reads complaint and verifies history and assigned officer
    citizen_view = await client.get(f"/api/v1/complaints/{comp_id}", headers=c_headers)
    assert citizen_view.status_code == 200
    cv_data = citizen_view.json()
    assert cv_data["status"] == "CLOSED"
    assert len(cv_data["status_history"]) >= 4
