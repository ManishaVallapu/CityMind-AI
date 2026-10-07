import asyncio
import os
import sys
from typing import AsyncGenerator
import pytest
import pytest_asyncio
from httpx import ASGITransport, AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.pool import StaticPool

# Ensure backend root is on sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

# Configure test environment variables before importing app
os.environ["ENVIRONMENT"] = "testing"
os.environ["DEBUG"] = "False"
os.environ["JWT_SECRET"] = "test_super_secret_jwt_key_that_is_at_least_32_characters_long_for_security"
os.environ["DATABASE_URL"] = "sqlite+aiosqlite:///:memory:"

from app.core.config import settings
from app.core.security import create_access_token, get_password_hash
from app.db.base import Base
from app.db.session import get_db
from app.main import app
from app.models.category import ComplaintCategory
from app.models.department import Department
from app.models.role import Role
from app.models.user import User

# In-memory SQLite async engine with StaticPool for test isolation
test_engine = create_async_engine(
    "sqlite+aiosqlite:///:memory:",
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)

TestingSessionLocal = async_sessionmaker(
    bind=test_engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autocommit=False,
    autoflush=False,
)


@pytest_asyncio.fixture(scope="session", autouse=True)
async def init_test_db():
    """Create all tables in memory once for the test session."""
    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield
    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
    await test_engine.dispose()


@pytest_asyncio.fixture
async def db_session() -> AsyncGenerator[AsyncSession, None]:
    """Provide a clean transactional async session for each test."""
    async with TestingSessionLocal() as session:
        # Seed core roles and departments if not present
        from sqlalchemy import select

        role_check = await session.execute(select(Role).where(Role.name == "CITIZEN"))
        if not role_check.scalar_one_or_none():
            # Seed roles
            session.add_all(
                [
                    Role(name="CITIZEN", description="Citizen role"),
                    Role(name="OFFICER", description="Officer role"),
                    Role(name="ADMIN", description="Admin role"),
                ]
            )
            # Seed basic department
            session.add(
                Department(
                    name="Roads",
                    code="ROADS",
                    description="Roads department",
                    contact_email="roads@test.gov",
                    is_active=True,
                )
            )
            await session.commit()

        yield session
        await session.rollback()


@pytest_asyncio.fixture
async def client(db_session: AsyncSession) -> AsyncGenerator[AsyncClient, None]:
    """Provide an AsyncClient wired with the test database dependency override."""
    async def override_get_db():
        yield db_session

    app.dependency_overrides[get_db] = override_get_db

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://testserver") as ac:
        yield ac

    app.dependency_overrides.clear()


@pytest_asyncio.fixture
async def test_citizen_user(db_session: AsyncSession) -> User:
    """Fixture providing a persisted test citizen user."""
    from sqlalchemy import select
    from sqlalchemy.orm import selectinload

    stmt = select(User).options(selectinload(User.role)).where(User.email == "citizen.test@citymind.gov")
    user = (await db_session.execute(stmt)).scalar_one_or_none()
    if not user:
        role = (await db_session.execute(select(Role).where(Role.name == "CITIZEN"))).scalar_one()
        user = User(
            email="citizen.test@citymind.gov",
            hashed_password=get_password_hash("Password123!"),
            full_name="Jane Citizen",
            role_id=role.id,
            is_active=True,
        )
        db_session.add(user)
        await db_session.commit()
        await db_session.refresh(user)
    return user


@pytest_asyncio.fixture
async def test_admin_user(db_session: AsyncSession) -> User:
    """Fixture providing a persisted test admin user."""
    from sqlalchemy import select
    from sqlalchemy.orm import selectinload

    stmt = select(User).options(selectinload(User.role)).where(User.email == "admin.test@citymind.gov")
    user = (await db_session.execute(stmt)).scalar_one_or_none()
    if not user:
        role = (await db_session.execute(select(Role).where(Role.name == "ADMIN"))).scalar_one()
        user = User(
            email="admin.test@citymind.gov",
            hashed_password=get_password_hash("AdminPass123!"),
            full_name="Admin Test",
            role_id=role.id,
            is_active=True,
        )
        db_session.add(user)
        await db_session.commit()
        await db_session.refresh(user)
    return user


@pytest.fixture
def citizen_token(test_citizen_user: User) -> str:
    """Access token for citizen user."""
    return create_access_token(subject=test_citizen_user.id, role="CITIZEN")


@pytest.fixture
def admin_token(test_admin_user: User) -> str:
    """Access token for admin user."""
    return create_access_token(subject=test_admin_user.id, role="ADMIN")


@pytest_asyncio.fixture
async def test_officer_user(db_session: AsyncSession) -> User:
    """Fixture providing a persisted test officer user and profile."""
    from sqlalchemy import select
    from sqlalchemy.orm import selectinload
    from app.models.officer import Officer

    stmt = select(User).options(selectinload(User.role), selectinload(User.officer_profile)).where(User.email == "officer.test@citymind.gov")
    user = (await db_session.execute(stmt)).scalar_one_or_none()
    if not user:
        role = (await db_session.execute(select(Role).where(Role.name == "OFFICER"))).scalar_one()
        dept = (await db_session.execute(select(Department).where(Department.code == "ROADS"))).scalar_one()
        user = User(
            email="officer.test@citymind.gov",
            hashed_password=get_password_hash("OfficerPass123!"),
            full_name="Rajesh Officer",
            role_id=role.id,
            is_active=True,
        )
        db_session.add(user)
        await db_session.flush()

        officer_profile = Officer(
            user_id=user.id,
            department_id=dept.id,
            badge_number="TEST-ROADS-001",
            designation="Field Engineer",
            is_available=True,
        )
        db_session.add(officer_profile)
        await db_session.commit()
        
        stmt = select(User).options(selectinload(User.role), selectinload(User.officer_profile)).where(User.id == user.id)
        user = (await db_session.execute(stmt)).scalar_one()
    return user



@pytest.fixture
def officer_token(test_officer_user: User) -> str:
    """Access token for officer user."""
    return create_access_token(subject=test_officer_user.id, role="OFFICER")


@pytest_asyncio.fixture
async def another_citizen_user(db_session: AsyncSession) -> User:
    """Fixture providing another persisted test citizen user."""
    from sqlalchemy import select
    from sqlalchemy.orm import selectinload

    stmt = select(User).options(selectinload(User.role)).where(User.email == "other.citizen@citymind.gov")
    user = (await db_session.execute(stmt)).scalar_one_or_none()
    if not user:
        role = (await db_session.execute(select(Role).where(Role.name == "CITIZEN"))).scalar_one()
        user = User(
            email="other.citizen@citymind.gov",
            hashed_password=get_password_hash("Password123!"),
            full_name="Other Citizen",
            role_id=role.id,
            is_active=True,
        )
        db_session.add(user)
        await db_session.commit()
        await db_session.refresh(user)
    return user


@pytest.fixture
def another_citizen_token(another_citizen_user: User) -> str:
    """Access token for another citizen user."""
    return create_access_token(subject=another_citizen_user.id, role="CITIZEN")


@pytest_asyncio.fixture
async def test_category(db_session: AsyncSession) -> ComplaintCategory:
    """Fixture providing a persisted test category."""
    from sqlalchemy import select

    stmt = select(ComplaintCategory).where(ComplaintCategory.slug == "test-potholes")
    category = (await db_session.execute(stmt)).scalar_one_or_none()
    if not category:
        dept = (await db_session.execute(select(Department).where(Department.code == "ROADS"))).scalar_one()
        category = ComplaintCategory(
            name="Potholes & Road Cracks",
            slug="test-potholes",
            description="Road surface potholes and cracks",
            default_sla_hours=48,
            default_priority="HIGH",
            target_department_id=dept.id,
            is_active=True,
        )
        db_session.add(category)
        await db_session.commit()
        await db_session.refresh(category)
    return category

