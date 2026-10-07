from datetime import timedelta
import pytest
from app.core.exceptions import AuthenticationError
from app.core.security import (
    create_access_token,
    create_refresh_token,
    decode_token,
    get_password_hash,
    verify_password,
)


def test_password_hashing_not_plain_text():
    """Verify stored password is not plain text and uses Argon2id."""
    password = "MySecurePassword123!"
    hashed = get_password_hash(password)

    assert hashed != password
    assert hashed.startswith("$argon2id$")


def test_password_verification_success():
    """Verify password verification succeeds for correct password."""
    password = "CorrectHorseBatteryStaple!"
    hashed = get_password_hash(password)

    assert verify_password(password, hashed) is True


def test_password_verification_failure():
    """Verify password verification fails for incorrect password."""
    password = "CorrectPassword123!"
    wrong_password = "WrongPassword456!"
    hashed = get_password_hash(password)

    assert verify_password(wrong_password, hashed) is False
    assert verify_password("", hashed) is False
    assert verify_password("random", "") is False


def test_jwt_access_token_creation_and_decoding():
    """Verify access token contains expected claims and decodes successfully."""
    subject = "12345678-1234-5678-1234-567812345678"
    role = "CITIZEN"

    token = create_access_token(subject=subject, role=role)
    payload = decode_token(token)

    assert payload["sub"] == subject
    assert payload["role"] == role
    assert payload["type"] == "access"
    assert "exp" in payload
    assert "iat" in payload


def test_jwt_refresh_token_creation():
    """Verify refresh token has type 'refresh'."""
    subject = "12345678-1234-5678-1234-567812345678"
    role = "OFFICER"

    token = create_refresh_token(subject=subject, role=role)
    payload = decode_token(token)

    assert payload["sub"] == subject
    assert payload["role"] == role
    assert payload["type"] == "refresh"


def test_jwt_token_expiration():
    """Verify expired token raises AuthenticationError."""
    subject = "user-123"
    token = create_access_token(
        subject=subject,
        role="CITIZEN",
        expires_delta=timedelta(seconds=-10),  # Already expired
    )

    with pytest.raises(AuthenticationError) as exc_info:
        decode_token(token)

    assert "expired" in str(exc_info.value.detail).lower()


def test_jwt_invalid_token():
    """Verify invalid token string raises AuthenticationError."""
    with pytest.raises(AuthenticationError):
        decode_token("not.a.valid.jwt.token")
