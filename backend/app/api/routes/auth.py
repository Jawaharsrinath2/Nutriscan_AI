"""Authentication routes: signup, login, Google OAuth, and current-user info."""

from __future__ import annotations

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Request, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.config import get_settings
from app.db.models import User
from app.db.session import get_db
from app.schemas.auth import (
    ForgotPasswordRequest,
    GoogleAuthRequest,
    LoginRequest,
    MessageResponse,
    ResetPasswordRequest,
    SignupRequest,
    TokenResponse,
    UserInfo,
    VerifyResetCodeRequest,
)
from app.services.auth_service import (
    check_rate_limit,
    create_access_token,
    create_password_reset_code,
    get_current_user,
    get_lockout_remaining_minutes,
    hash_password,
    is_account_locked,
    record_failed_attempt,
    reset_failed_attempts,
    reset_password_with_code,
    verify_google_token,
    verify_password,
    verify_reset_code,
)
from app.services.email_service import (
    get_latest_dev_code,
    send_password_reset_email,
    send_welcome_email,
)

router = APIRouter(prefix="/api/auth", tags=["auth"])


def _user_info(user: User) -> UserInfo:
    return UserInfo(
        id=user.id,
        email=user.email,
        username=user.username,
        provider=user.provider,
        avatar_url=user.avatar_url,
    )


def _token_response(user: User) -> TokenResponse:
    token = create_access_token(user.id, user.email)
    return TokenResponse(access_token=token, user=_user_info(user))


# ── public config (e.g. Google client-id for the frontend) ──────────────────


@router.get("/config")
def auth_config() -> dict:
    settings = get_settings()
    return {"google_client_id": settings.google_client_id}


# ── signup ──────────────────────────────────────────────────────────────────


@router.post("/signup", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
def signup(
    body: SignupRequest,
    request: Request,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
) -> TokenResponse:
    client_ip = request.client.host if request.client else "127.0.0.1"
    check_rate_limit(client_ip)

    existing = db.execute(
        select(User).where((User.email == body.email) | (User.username == body.username))
    ).scalar_one_or_none()
    if existing:
        field = "email" if existing.email == body.email else "username"
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=f"An account with this {field} already exists.")

    user = User(
        email=body.email,
        username=body.username,
        hashed_password=hash_password(body.password),
        provider="local",
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    # Send welcome email asynchronously
    background_tasks.add_task(send_welcome_email, user.email, user.username)

    return _token_response(user)


# ── login ───────────────────────────────────────────────────────────────────


@router.post("/login", response_model=TokenResponse)
def login(body: LoginRequest, request: Request, db: Session = Depends(get_db)) -> TokenResponse:
    client_ip = request.client.host if request.client else "127.0.0.1"
    check_rate_limit(client_ip)

    user = db.execute(select(User).where(User.email == body.email)).scalar_one_or_none()
    if user is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid email or password.")

    if is_account_locked(user):
        minutes_left = get_lockout_remaining_minutes(user)
        raise HTTPException(
            status_code=423,
            detail=f"Account temporarily locked due to too many failed attempts. Try again in {minutes_left} minute(s).",
        )

    if user.hashed_password is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="This account uses Google sign-in. Please use the Google button instead.",
        )

    if not verify_password(body.password, user.hashed_password):
        record_failed_attempt(db, user)
        remaining = max(0, 5 - user.failed_attempts)
        msg = "Invalid email or password."
        if remaining > 0:
            msg += f" {remaining} attempt(s) remaining before lockout."
        else:
            msg += " Account is now locked for 15 minutes."
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=msg)

    reset_failed_attempts(db, user)
    return _token_response(user)


# ── google oauth ────────────────────────────────────────────────────────────


@router.post("/google", response_model=TokenResponse)
async def google_auth(
    body: GoogleAuthRequest,
    request: Request,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
) -> TokenResponse:
    client_ip = request.client.host if request.client else "127.0.0.1"
    check_rate_limit(client_ip)

    payload = await verify_google_token(body.credential)

    email: str = payload["email"]
    user = db.execute(select(User).where(User.email == email)).scalar_one_or_none()
    is_new = False

    if user is None:
        is_new = True
        # Auto-create an account for first-time Google users
        username = email.split("@")[0].replace(".", "_").replace("-", "_")[:100]
        # Ensure username uniqueness by appending a suffix if needed
        base_username = username
        counter = 1
        while db.execute(select(User).where(User.username == username)).scalar_one_or_none() is not None:
            username = f"{base_username}_{counter}"
            counter += 1

        user = User(
            email=email,
            username=username,
            provider="google",
            avatar_url=payload.get("picture"),
        )
        db.add(user)
        db.commit()
        db.refresh(user)

        background_tasks.add_task(send_welcome_email, user.email, user.username)
    else:
        # Update avatar on subsequent logins
        if payload.get("picture") and user.avatar_url != payload["picture"]:
            user.avatar_url = payload["picture"]
            db.commit()

    return _token_response(user)


# ── forgot / reset password flow ────────────────────────────────────────────


@router.post("/forgot-password", response_model=MessageResponse)
def forgot_password(
    body: ForgotPasswordRequest,
    request: Request,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
) -> MessageResponse:
    client_ip = request.client.host if request.client else "127.0.0.1"
    check_rate_limit(client_ip)

    email_clean = body.email.strip().lower()
    user = db.execute(select(User).where(User.email == email_clean)).scalar_one_or_none()
    if user is not None:
        code = create_password_reset_code(db, user)
        background_tasks.add_task(send_password_reset_email, user.email, user.username, code)

    return MessageResponse(
        detail="If an account matches that email address, a 6-digit verification code has been sent."
    )


@router.post("/verify-reset-code", response_model=MessageResponse)
def verify_code(
    body: VerifyResetCodeRequest,
    request: Request,
    db: Session = Depends(get_db),
) -> MessageResponse:
    client_ip = request.client.host if request.client else "127.0.0.1"
    check_rate_limit(client_ip)

    verify_reset_code(db, body.email.strip().lower(), body.code)
    return MessageResponse(detail="Verification code is valid.")


@router.post("/reset-password", response_model=MessageResponse)
def reset_password(
    body: ResetPasswordRequest,
    request: Request,
    db: Session = Depends(get_db),
) -> MessageResponse:
    client_ip = request.client.host if request.client else "127.0.0.1"
    check_rate_limit(client_ip)

    reset_password_with_code(db, body.email.strip().lower(), body.code, body.new_password)
    return MessageResponse(detail="Password reset successfully. You can now sign in with your new password.")


@router.get("/dev/latest-code")
def get_dev_code(email: str) -> dict:
    """Dev helper: view the latest verification code generated for an email."""
    code = get_latest_dev_code(email)
    return {"email": email, "code": code}


# ── current user ────────────────────────────────────────────────────────────


@router.get("/me", response_model=UserInfo)
def me(user: User = Depends(get_current_user)) -> UserInfo:
    return _user_info(user)
