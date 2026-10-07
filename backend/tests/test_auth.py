import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_register_citizen_success(client: AsyncClient):
    """Test citizen registration creates active user with CITIZEN role."""
    payload = {
        "email": "new.citizen@citymind.gov",
        "password": "StrongPassword123!",
        "full_name": "Rohan Sharma",
        "phone_number": "+919876543210",
    }
    response = await client.post("/api/v1/auth/register", json=payload)
    assert response.status_code == 201

    data = response.json()
    assert data["email"] == payload["email"]
    assert data["full_name"] == payload["full_name"]
    assert data["role"]["name"] == "CITIZEN"
    assert data["is_active"] is True
    assert "password" not in data
    assert "hashed_password" not in data


@pytest.mark.asyncio
async def test_register_duplicate_email(client: AsyncClient):
    """Test duplicate registration returns 409 Conflict."""
    payload = {
        "email": "duplicate@citymind.gov",
        "password": "Password123!",
        "full_name": "First User",
    }
    resp1 = await client.post("/api/v1/auth/register", json=payload)
    assert resp1.status_code == 201

    resp2 = await client.post("/api/v1/auth/register", json=payload)
    assert resp2.status_code == 409
    assert "exists" in resp2.json()["detail"]["message"].lower()


@pytest.mark.asyncio
async def test_register_short_password(client: AsyncClient):
    """Test registration rejects password shorter than 8 characters."""
    payload = {
        "email": "short@citymind.gov",
        "password": "short",
        "full_name": "Short Password User",
    }
    response = await client.post("/api/v1/auth/register", json=payload)
    assert response.status_code == 422


@pytest.mark.asyncio
async def test_login_success(client: AsyncClient):
    """Test login with correct credentials returns tokens and user object."""
    register_payload = {
        "email": "login.user@citymind.gov",
        "password": "LoginSecret2026!",
        "full_name": "Login Tester",
    }
    await client.post("/api/v1/auth/register", json=register_payload)

    login_payload = {
        "email": "login.user@citymind.gov",
        "password": "LoginSecret2026!",
    }
    response = await client.post("/api/v1/auth/login", json=login_payload)
    assert response.status_code == 200

    data = response.json()
    assert "access_token" in data
    assert "refresh_token" in data
    assert data["token_type"] == "bearer"
    assert data["user"]["email"] == login_payload["email"]


@pytest.mark.asyncio
async def test_login_invalid_password(client: AsyncClient):
    """Test login with incorrect password returns 401."""
    login_payload = {
        "email": "citizen.test@citymind.gov",
        "password": "WrongPassword!",
    }
    response = await client.post("/api/v1/auth/login", json=login_payload)
    assert response.status_code == 401
    assert "incorrect" in response.json()["detail"]["message"].lower()


@pytest.mark.asyncio
async def test_login_nonexistent_user(client: AsyncClient):
    """Test login with non-existent email returns 401."""
    login_payload = {
        "email": "does.not.exist@citymind.gov",
        "password": "AnyPassword123!",
    }
    response = await client.post("/api/v1/auth/login", json=login_payload)
    assert response.status_code == 401


@pytest.mark.asyncio
async def test_get_me_with_valid_token(client: AsyncClient, citizen_token: str, test_citizen_user):
    """Test /me returns profile when provided valid Bearer token."""
    headers = {"Authorization": f"Bearer {citizen_token}"}
    response = await client.get("/api/v1/auth/me", headers=headers)
    assert response.status_code == 200

    data = response.json()
    assert data["email"] == test_citizen_user.email
    assert data["role"]["name"] == "CITIZEN"


@pytest.mark.asyncio
async def test_get_me_without_token(client: AsyncClient):
    """Test /me without Authorization header returns 401 Unauthorized."""
    response = await client.get("/api/v1/auth/me")
    assert response.status_code == 401


@pytest.mark.asyncio
async def test_get_me_with_invalid_token(client: AsyncClient):
    """Test /me with malformed or fake token returns 401 Unauthorized."""
    headers = {"Authorization": "Bearer fake.token.here"}
    response = await client.get("/api/v1/auth/me", headers=headers)
    assert response.status_code == 401


@pytest.mark.asyncio
async def test_refresh_token_flow(client: AsyncClient):
    """Test exchanging a valid refresh token for a new access token."""
    reg_payload = {
        "email": "refresh.user@citymind.gov",
        "password": "RefreshPass123!",
        "full_name": "Refresh Tester",
    }
    await client.post("/api/v1/auth/register", json=reg_payload)

    login_res = await client.post("/api/v1/auth/login", json={"email": reg_payload["email"], "password": reg_payload["password"]})
    tokens = login_res.json()
    refresh_token = tokens["refresh_token"]

    refresh_res = await client.post("/api/v1/auth/refresh", json={"refresh_token": refresh_token})
    assert refresh_res.status_code == 200

    data = refresh_res.json()
    assert "access_token" in data
    assert data["token_type"] == "bearer"
