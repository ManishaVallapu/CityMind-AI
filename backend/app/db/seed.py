import asyncio
import os
import sys
from typing import Dict
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

# Ensure backend root is on sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..")))

from app.core.security import get_password_hash
from app.db.session import async_session_maker
from app.models.category import ComplaintCategory
from app.models.department import Department
from app.models.officer import Officer
from app.models.role import Role
from app.models.user import User

INITIAL_ROLES = [
    {"name": "CITIZEN", "description": "Public citizen submitting and tracking urban complaints"},
    {"name": "OFFICER", "description": "Municipal department officer triaging and resolving complaints"},
    {"name": "ADMIN", "description": "Municipal administrator with cross-departmental management access"},
]

INITIAL_DEPARTMENTS = [
    {
        "name": "Roads",
        "code": "ROADS",
        "description": "Road maintenance, pothole repairs, street surfacing, and sidewalk infrastructure",
        "contact_email": "roads@citymind.gov",
    },
    {
        "name": "Water",
        "code": "WATER",
        "description": "Municipal water supply networks, main pipe leaks, pressure issues, and water purity",
        "contact_email": "water@citymind.gov",
    },
    {
        "name": "Waste Management",
        "code": "WASTE",
        "description": "Solid waste collection, street cleaning, dumpsters, and illegal garbage disposal",
        "contact_email": "waste@citymind.gov",
    },
    {
        "name": "Electricity",
        "code": "ELECTRICITY",
        "description": "Public streetlights, electric poles, wiring faults, and municipal grid issues",
        "contact_email": "electricity@citymind.gov",
    },
    {
        "name": "Traffic",
        "code": "TRAFFIC",
        "description": "Traffic signals, road signage, pedestrian crossings, and traffic bottlenecks",
        "contact_email": "traffic@citymind.gov",
    },
    {
        "name": "Health",
        "code": "HEALTH",
        "description": "Public health hazards, sanitation inspections, vector control, and drainage safety",
        "contact_email": "health@citymind.gov",
    },
]

# Initial baseline categories (target_department_id is a default reference fallback, NOT the final AI model)
INITIAL_CATEGORIES = [
    {
        "name": "Potholes & Road Damage",
        "slug": "roads-potholes",
        "description": "Surface potholes, road cratering, or eroded asphalt creating hazards",
        "default_sla_hours": 48,
        "default_priority": "HIGH",
        "dept_code": "ROADS",
    },
    {
        "name": "Water Supply Interruption",
        "slug": "water-interruption",
        "description": "Unscheduled cutoffs or critical pressure drops in potable water supply",
        "default_sla_hours": 24,
        "default_priority": "HIGH",
        "dept_code": "WATER",
    },
    {
        "name": "Garbage Overflow & Waste Dumping",
        "slug": "waste-overflow",
        "description": "Uncollected street bins or unauthorized illegal waste disposal",
        "default_sla_hours": 48,
        "default_priority": "MEDIUM",
        "dept_code": "WASTE",
    },
    {
        "name": "Streetlight Failure",
        "slug": "electricity-streetlight-out",
        "description": "Non-functioning, flickering, or damaged public street illumination",
        "default_sla_hours": 72,
        "default_priority": "LOW",
        "dept_code": "ELECTRICITY",
    },
    {
        "name": "Traffic Signal Malfunction",
        "slug": "traffic-signal-fault",
        "description": "Dead or stuck traffic lights causing vehicular gridlock and accident risks",
        "default_sla_hours": 12,
        "default_priority": "CRITICAL",
        "dept_code": "TRAFFIC",
    },
    {
        "name": "Drainage Overflow & Health Hazard",
        "slug": "health-drainage-overflow",
        "description": "Clogged open storm drains, sewage overflows posing health and sanitation risks",
        "default_sla_hours": 24,
        "default_priority": "HIGH",
        "dept_code": "HEALTH",
    },
]


async def seed_data(session: AsyncSession) -> None:
    """Seed foundational data: roles, departments, and sample categories."""
    print("-> Seeding Roles...")
    roles_map: Dict[str, Role] = {}
    for role_data in INITIAL_ROLES:
        stmt = select(Role).where(Role.name == role_data["name"])
        existing = (await session.execute(stmt)).scalar_one_or_none()
        if not existing:
            role = Role(name=role_data["name"], description=role_data["description"])
            session.add(role)
            await session.flush()
            roles_map[role.name] = role
            print(f"   + Created Role: {role.name}")
        else:
            roles_map[existing.name] = existing

    print("-> Seeding Departments...")
    depts_map: Dict[str, Department] = {}
    for dept_data in INITIAL_DEPARTMENTS:
        stmt = select(Department).where(Department.code == dept_data["code"])
        existing = (await session.execute(stmt)).scalar_one_or_none()
        if not existing:
            dept = Department(
                name=dept_data["name"],
                code=dept_data["code"],
                description=dept_data["description"],
                contact_email=dept_data["contact_email"],
                is_active=True,
            )
            session.add(dept)
            await session.flush()
            depts_map[dept.code] = dept
            print(f"   + Created Department: {dept.name} ({dept.code})")
        else:
            depts_map[existing.code] = existing

    print("-> Seeding Complaint Categories (Reference Defaults)...")
    for cat_data in INITIAL_CATEGORIES:
        stmt = select(ComplaintCategory).where(ComplaintCategory.slug == cat_data["slug"])
        existing = (await session.execute(stmt)).scalar_one_or_none()
        if not existing:
            target_dept = depts_map.get(cat_data["dept_code"])
            category = ComplaintCategory(
                name=cat_data["name"],
                slug=cat_data["slug"],
                description=cat_data["description"],
                default_sla_hours=cat_data["default_sla_hours"],
                default_priority=cat_data["default_priority"],
                target_department_id=target_dept.id if target_dept else None,
                is_active=True,
            )
            session.add(category)
            print(f"   + Created Category: {category.name} [Ref Dept: {cat_data['dept_code']}]")

    print("-> Seeding Default Development Users (Admin & Officer)...")
    # Default Admin User
    admin_email = "admin@citymind.gov"
    stmt = select(User).where(User.email == admin_email)
    existing_admin = (await session.execute(stmt)).scalar_one_or_none()
    if not existing_admin and "ADMIN" in roles_map:
        admin_user = User(
            email=admin_email,
            hashed_password=get_password_hash("Admin@CityMind2026!"),
            full_name="System Administrator",
            role_id=roles_map["ADMIN"].id,
            is_active=True,
        )
        session.add(admin_user)
        print("   + Created Default Admin: admin@citymind.gov (Password: Admin@CityMind2026!)")

    # Default Roads Officer User
    officer_email = "officer.roads@citymind.gov"
    stmt = select(User).where(User.email == officer_email)
    existing_officer = (await session.execute(stmt)).scalar_one_or_none()
    if not existing_officer and "OFFICER" in roles_map and "ROADS" in depts_map:
        officer_user = User(
            email=officer_email,
            hashed_password=get_password_hash("Officer@Roads2026!"),
            full_name="Rajesh Kumar (Roads Lead)",
            role_id=roles_map["OFFICER"].id,
            is_active=True,
        )
        session.add(officer_user)
        await session.flush()

        officer_profile = Officer(
            user_id=officer_user.id,
            department_id=depts_map["ROADS"].id,
            badge_number="ROADS-001",
            designation="Senior Engineer",
            is_available=True,
        )
        session.add(officer_profile)
        print("   + Created Default Officer: officer.roads@citymind.gov (Password: Officer@Roads2026!)")

    await session.commit()
    print("-> Seed completed successfully!")


async def main() -> None:
    async with async_session_maker() as session:
        await seed_data(session)


if __name__ == "__main__":
    asyncio.run(main())
