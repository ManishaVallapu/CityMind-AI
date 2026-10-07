import uuid
from typing import List, Optional
from fastapi import Depends, Header
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.exceptions import AuthenticationError, AuthorizationError
from app.core.security import decode_token
from app.db.session import get_db
from app.models.user import User
from app.services.auth_service import AuthService

oauth2_scheme = OAuth2PasswordBearer(
    tokenUrl=f"{settings.API_V1_STR}/auth/login",
    auto_error=False,
)


async def get_current_user(
    token: Optional[str] = Depends(oauth2_scheme),
    authorization: Optional[str] = Header(None),
    db: AsyncSession = Depends(get_db),
) -> User:
    """Dependency for extracting and validating the authenticated user from the JWT access token."""
    raw_token = token
    if not raw_token and authorization:
        parts = authorization.split()
        if len(parts) == 2 and parts[0].lower() == "bearer":
            raw_token = parts[1]

    if not raw_token:
        raise AuthenticationError("Authentication token is missing. Please provide a Bearer token.")

    payload = decode_token(raw_token)

    if payload.get("type") != "access":
        raise AuthenticationError("Invalid token type: expected an access token")

    sub = payload.get("sub")
    if not sub:
        raise AuthenticationError("Malformed token: missing subject claim")

    try:
        user_id = uuid.UUID(sub)
    except ValueError:
        raise AuthenticationError("Malformed token: invalid subject identifier")

    user = await AuthService.get_user_by_id(db, user_id)
    if not user:
        raise AuthenticationError("User associated with this token does not exist")

    return user


async def get_current_active_user(
    current_user: User = Depends(get_current_user),
) -> User:
    """Dependency verifying that the authenticated user account is active."""
    if not current_user.is_active:
        raise AuthenticationError("User account has been deactivated")
    return current_user


class RoleChecker:
    """
    Role-Based Access Control (RBAC) dependency validator.
    Ensures the authenticated user has one of the allowed roles.
    Raises HTTP 403 Forbidden if unauthorized.
    """

    def __init__(self, allowed_roles: List[str]):
        self.allowed_roles = [r.upper() for r in allowed_roles]

    def __call__(
        self,
        current_user: User = Depends(get_current_active_user),
    ) -> User:
        user_role = current_user.role.name.upper() if current_user.role else ""
        if user_role not in self.allowed_roles:
            raise AuthorizationError(
                f"Access denied. Requires one of roles: {', '.join(self.allowed_roles)}. Current role: '{user_role}'"
            )
        return current_user
