"""Authentication helpers: password hashing, JWT, rate/attempt limiting, Google OAuth."""

from __future__ import annotations

import secrets
import time
from datetime import datetime, timedelta, timezone
from threading import Lock

import bcrypt
import httpx
import jwt
from fastapi import Depends, HTTPException, Request, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.config import get_settings
from app.db.models import PasswordResetCode, User
from app.db.session import get_db

# ---------------------------------------------------------------------------
# Password hashing (bcrypt)
# ---------------------------------------------------------------------------


def hash_password(password: str) -> str:
    pwd_bytes = password.encode("utf-8")[:72]
    salt = bcrypt.gensalt()
    return bcrypt.hashpw(pwd_bytes, salt).decode("utf-8")


def verify_password(plain: str, hashed: str) -> bool:
    pwd_bytes = plain.encode("utf-8")[:72]
    hashed_bytes = hashed.encode("utf-8")
    return bcrypt.checkpw(pwd_bytes, hashed_bytes)


# ---------------------------------------------------------------------------
# JWT tokens
# ---------------------------------------------------------------------------


def create_access_token(user_id: int, email: str) -> str:
    settings = get_settings()
    payload = {
        "sub": str(user_id),
        "email": email,
        "exp": datetime.now(timezone.utc) + timedelta(hours=settings.jwt_expire_hours),
        "iat": datetime.now(timezone.utc),
    }
    return jwt.encode(payload, settings.jwt_secret_key, algorithm=settings.jwt_algorithm)


def decode_token(token: str) -> dict:
    settings = get_settings()
    try:
        return jwt.decode(token, settings.jwt_secret_key, algorithms=[settings.jwt_algorithm])
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Token has expired.")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token.")


# ---------------------------------------------------------------------------
# In-memory rate limiting (per IP)
# ---------------------------------------------------------------------------

_rate_lock = Lock()
_rate_buckets: dict[str, list[float]] = {}

MAX_REQUESTS = 10
WINDOW_SECONDS = 300  # 5 minutes


def check_rate_limit(ip: str, *, max_requests: int = MAX_REQUESTS, window: int = WINDOW_SECONDS) -> None:
    """Raise 429 if *ip* has exceeded the allowed request count within *window* seconds."""
    now = time.monotonic()
    with _rate_lock:
        timestamps = _rate_buckets.get(ip, [])
        # Purge entries outside the window
        timestamps = [t for t in timestamps if now - t < window]
        if len(timestamps) >= max_requests:
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail=f"Too many requests. Try again in {window // 60} minutes.",
            )
        timestamps.append(now)
        _rate_buckets[ip] = timestamps


# ---------------------------------------------------------------------------
# Login-attempt limiting (database-backed, per user)
# ---------------------------------------------------------------------------

MAX_FAILED_ATTEMPTS = 5
LOCKOUT_MINUTES = 15


def is_account_locked(user: User) -> bool:
    if user.locked_until is None:
        return False
    locked_until = user.locked_until
    if locked_until.tzinfo is None:
        locked_until = locked_until.replace(tzinfo=timezone.utc)
    return datetime.now(timezone.utc) < locked_until


def get_lockout_remaining_minutes(user: User) -> int:
    if user.locked_until is None:
        return 0
    locked_until = user.locked_until
    if locked_until.tzinfo is None:
        locked_until = locked_until.replace(tzinfo=timezone.utc)
    delta = (locked_until - datetime.now(timezone.utc)).total_seconds()
    return max(1, int(delta // 60) + 1)


def record_failed_attempt(db: Session, user: User) -> None:
    user.failed_attempts += 1
    if user.failed_attempts >= MAX_FAILED_ATTEMPTS:
        user.locked_until = datetime.now(timezone.utc) + timedelta(minutes=LOCKOUT_MINUTES)
    db.commit()


def reset_failed_attempts(db: Session, user: User) -> None:
    if user.failed_attempts != 0 or user.locked_until is not None:
        user.failed_attempts = 0
        user.locked_until = None
        db.commit()


# ---------------------------------------------------------------------------
# Google OAuth — verify the ID token via Google's tokeninfo endpoint
# ---------------------------------------------------------------------------


async def verify_google_token(credential: str) -> dict:
    """Validate a Google ID token and return the decoded payload.

    Uses Google's ``tokeninfo`` endpoint which handles signature verification
    and audience validation on Google's side.
    """
    settings = get_settings()
    async with httpx.AsyncClient(timeout=10) as client:
        resp = await client.get(
            "https://oauth2.googleapis.com/tokeninfo",
            params={"id_token": credential},
        )
    if resp.status_code != 200:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid Google token.")

    payload = resp.json()

    # Verify audience matches our client ID (if configured)
    if settings.google_client_id and payload.get("aud") != settings.google_client_id:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Google token audience mismatch.")

    return payload


# ---------------------------------------------------------------------------
# FastAPI dependency: get the currently authenticated user
# ---------------------------------------------------------------------------


def get_current_user(request: Request, db: Session = Depends(get_db)) -> User:
    auth_header = request.headers.get("Authorization", "")
    if not auth_header.startswith("Bearer "):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Missing or invalid Authorization header.")

    token = auth_header.removeprefix("Bearer ")
    payload = decode_token(token)

    user = db.execute(select(User).where(User.id == int(payload["sub"]))).scalar_one_or_none()
    if user is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found.")
    if not user.is_active:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Account is deactivated.")
    return user


# ---------------------------------------------------------------------------
# Password Reset Codes (Database-backed, 15-min expiry, brute-force limited)
# ---------------------------------------------------------------------------

RESET_CODE_EXPIRY_MINUTES = 15
MAX_CODE_ATTEMPTS = 5


def generate_6digit_code() -> str:
    """Generate a cryptographically secure 6-digit numeric string."""
    return f"{secrets.randbelow(900000) + 100000}"


def create_password_reset_code(db: Session, user: User, expiry_minutes: int = RESET_CODE_EXPIRY_MINUTES) -> str:
    """Create a new 6-digit verification code and invalidate any previous unused codes."""
    existing_codes = db.execute(
        select(PasswordResetCode).where(
            (PasswordResetCode.user_id == user.id) & (PasswordResetCode.is_used == False)
        )
    ).scalars().all()
    for c in existing_codes:
        c.is_used = True

    code_str = generate_6digit_code()
    expires_at = datetime.now(timezone.utc) + timedelta(minutes=expiry_minutes)

    reset_record = PasswordResetCode(
        user_id=user.id,
        email=user.email,
        code=code_str,
        expires_at=expires_at,
        is_used=False,
        attempts=0,
    )
    db.add(reset_record)
    db.commit()
    return code_str


def verify_reset_code(db: Session, email: str, code_str: str) -> PasswordResetCode:
    """Validate a 6-digit code. Raises HTTPException on invalid/expired/exhausted code."""
    record = db.execute(
        select(PasswordResetCode)
        .where((PasswordResetCode.email == email) & (PasswordResetCode.is_used == False))
        .order_by(PasswordResetCode.id.desc())
    ).scalars().first()

    if record is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No active password reset request found for this email.",
        )

    if record.attempts >= MAX_CODE_ATTEMPTS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Too many failed code attempts. Please request a new verification code.",
        )

    expires_at = record.expires_at
    if expires_at.tzinfo is None:
        expires_at = expires_at.replace(tzinfo=timezone.utc)

    if datetime.now(timezone.utc) > expires_at:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Verification code has expired. Please request a new one.",
        )

    if record.code != code_str.strip():
        record.attempts += 1
        db.commit()
        remaining = max(0, MAX_CODE_ATTEMPTS - record.attempts)
        msg = "Invalid verification code."
        if remaining > 0:
            msg += f" {remaining} attempt(s) remaining."
        else:
            msg += " Please request a new code."
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=msg)

    return record


def reset_password_with_code(db: Session, email: str, code_str: str, new_password: str) -> User:
    """Verify code, update hashed_password, and unlock user account."""
    record = verify_reset_code(db, email, code_str)

    user = db.execute(select(User).where(User.id == record.user_id)).scalar_one_or_none()
    if user is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found.")

    # Update password and reset lockout state
    user.hashed_password = hash_password(new_password)
    user.failed_attempts = 0
    user.locked_until = None
    record.is_used = True

    db.commit()
    db.refresh(user)
    return user
