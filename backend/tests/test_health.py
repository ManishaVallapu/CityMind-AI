import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_root_endpoint(client: AsyncClient):
    """Test root endpoint returns API metadata."""
    response = await client.get("/")
    assert response.status_code == 200
    data = response.json()
    assert "CityMind AI" in data["project"]
    assert "docs_url" in data


@pytest.mark.asyncio
async def test_health_check_healthy(client: AsyncClient):
    """Test health check returns 200 with healthy database status."""
    response = await client.get("/api/v1/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"
    assert data["database"] == "healthy"


@pytest.mark.asyncio
async def test_docs_endpoint_accessible(client: AsyncClient):
    """Test /api/v1/docs and OpenAPI specification endpoints are accessible."""
    response_docs = await client.get("/api/v1/docs")
    assert response_docs.status_code == 200

    response_openapi = await client.get("/api/v1/openapi.json")
    assert response_openapi.status_code == 200
    spec = response_openapi.json()
    assert "/api/v1/complaints" in spec["paths"]
    assert "/api/v1/complaints/my" in spec["paths"]
    assert "/api/v1/complaints/{complaint_id}" in spec["paths"]
    assert "/api/v1/complaints/{complaint_id}/status" in spec["paths"]
    assert "/api/v1/complaints/{complaint_id}/assign" in spec["paths"]
    assert "/api/v1/complaints/{complaint_id}/attachments" in spec["paths"]
