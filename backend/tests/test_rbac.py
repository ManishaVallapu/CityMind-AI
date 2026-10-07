import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_admin_endpoint_success_with_admin_role(client: AsyncClient, admin_token: str):
    """Test user with ADMIN role successfully accesses admin endpoint."""
    headers = {"Authorization": f"Bearer {admin_token}"}
    response = await client.get("/api/v1/admin/test", headers=headers)
    assert response.status_code == 200
    data = response.json()
    assert "Admin" in data["message"]
    assert data["role"] == "ADMIN"


@pytest.mark.asyncio
async def test_admin_endpoint_forbidden_for_citizen_role(client: AsyncClient, citizen_token: str):
    """Test user with CITIZEN role is rejected with 403 Forbidden on admin endpoint."""
    headers = {"Authorization": f"Bearer {citizen_token}"}
    response = await client.get("/api/v1/admin/test", headers=headers)
    assert response.status_code == 403

    data = response.json()
    assert "Access denied" in data["detail"]["message"] or "permission" in data["detail"]["message"].lower()


@pytest.mark.asyncio
async def test_admin_endpoint_unauthorized_without_token(client: AsyncClient):
    """Test unauthenticated request to admin endpoint returns 401 Unauthorized."""
    response = await client.get("/api/v1/admin/test")
    assert response.status_code == 401
