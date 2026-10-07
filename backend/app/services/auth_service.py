import uuid
from typing import Optional
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.exceptions import AuthenticationError, ConflictError, NotFoundError
from app.core.security import (
    create_access_token,
    create_refresh_token,
    decode_token,
    get_password_hash,
    verify_password,
)
from app.models.role import Role
from app.models.user import User
from app.schemas.auth import LoginRequest, RefreshTokenResponse, TokenResponse
from app.schemas.user import UserCreate, UserRead


class AuthService:
    @staticmethod
    async def get_role_by_name(db: AsyncSession, role_name: str) -> Optional[Role]:
        stmt = select(Role).where(Role.name == role_name.upper())
        result = await db.execute(stmt)
        return result.scalar_one_or_none()

    @staticmethod
    async def get_user_by_email(db: AsyncSession, email: str) -> Optional[User]:
        stmt = select(User).options(selectinload(User.role)).where(User.email == email.lower().strip())
        result = await db.execute(stmt)
        return result.scalar_one_or_none()

    @staticmethod
    async def get_user_by_id(db: AsyncSession, user_id: uuid.UUID) -> Optional[User]:
        stmt = select(User).options(selectinload(User.role)).where(User.id == user_id)
        result = await db.execute(stmt)
        return result.scalar_one_or_none()

    @classmethod
    async def register_user(
        cls,
        db: AsyncSession,
        user_in: UserCreate,
        role_name: str = "CITIZEN",
    ) -> User:
        """Register a new user with Argon2id hashed password."""
        normalized_email = user_in.email.lower().strip()
        existing_user = await cls.get_user_by_email(db, normalized_email)
        if existing_user:
            raise ConflictError("A user with this email address already exists")

        role = await cls.get_role_by_name(db, role_name)
        if not role:
            raise NotFoundError(f"Role '{role_name}' does not exist in the system")

        hashed_password = get_password_hash(user_in.password)

        new_user = User(
            email=normalized_email,
            hashed_password=hashed_password,
            full_name=user_in.full_name.strip(),
            phone_number=user_in.phone_number.strip() if user_in.phone_number else None,
            role_id=role.id,
            is_active=True,
        )

        db.add(new_user)
        await db.commit()
        await db.refresh(new_user)
        # Ensure role is loaded for response schema
        stmt = select(User).options(selectinload(User.role)).where(User.id == new_user.id)
        result = await db.execute(stmt)
        return result.scalar_one()

    @classmethod
    async def authenticate_user(
        cls,
        db: AsyncSession,
        login_data: LoginRequest,
    ) -> TokenResponse:
        """Authenticate user credentials and issue access + refresh tokens."""
        user = await cls.get_user_by_email(db, login_data.email)
        if not user or not verify_password(login_data.password, user.hashed_password):
            raise AuthenticationError("Incorrect email or password")

        if not user.is_active:
            raise AuthenticationError("This user account is inactive. Please contact administration.")

        access_token = create_access_token(subject=user.id, role=user.role.name)
        refresh_token = create_refresh_token(subject=user.id, role=user.role.name)

        return TokenResponse(
            access_token=access_token,
            refresh_token=refresh_token,
            token_type="bearer",
            user=UserRead.model_validate(user),
        )

    @classmethod
    async def refresh_access_token(
        cls,
        db: AsyncSession,
        refresh_token_str: str,
    ) -> RefreshTokenResponse:
        """Validate refresh token and issue a new access token."""
        payload = decode_token(refresh_token_str)

        if payload.get("type") != "refresh":
            raise AuthenticationError("Invalid token type: expected a refresh token")

        sub = payload.get("sub")
        if not sub:
            raise AuthenticationError("Invalid token payload: missing subject")

        try:
            user_uuid = uuid.UUID(sub)
        except ValueError:
            raise AuthenticationError("Malformed user identifier in token")

        user = await cls.get_user_by_id(db, user_uuid)
        if not user:
            raise AuthenticationError("User associated with this token no longer exists")

        if not user.is_active:
            raise AuthenticationError("User account is inactive")

        new_access_token = create_access_token(subject=user.id, role=user.role.name)

        return RefreshTokenResponse(
            access_token=new_access_token,
            token_type="bearer",
        )
