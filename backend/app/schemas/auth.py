"""Pydantic schemas for authentication endpoints."""

from __future__ import annotations

from pydantic import BaseModel, Field


class SignupRequest(BaseModel):
    email: str = Field(..., max_length=320)
    username: str = Field(..., min_length=3, max_length=100, pattern=r"^[a-zA-Z0-9_]+$")
    password: str = Field(..., min_length=8, max_length=128)


class LoginRequest(BaseModel):
    email: str
    password: str


class GoogleAuthRequest(BaseModel):
    credential: str  # Google ID token from the frontend


class UserInfo(BaseModel):
    id: int
    email: str
    username: str
    provider: str
    avatar_url: str | None = None
    role: str = "user"
    theme: str = "emerald"


class UpdateProfileRequest(BaseModel):
    username: str | None = Field(default=None, min_length=2, max_length=100)
    avatar_url: str | None = Field(default=None, max_length=500)
    theme: str | None = Field(default=None, max_length=30)


class AvatarUploadResponse(BaseModel):
    avatar_url: str
    user: UserInfo


class ChangePasswordRequest(BaseModel):
    current_password: str
    new_password: str = Field(..., min_length=8, max_length=128)



class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserInfo


class MessageResponse(BaseModel):
    detail: str


class ForgotPasswordRequest(BaseModel):
    email: str = Field(..., max_length=320)


class VerifyResetCodeRequest(BaseModel):
    email: str = Field(..., max_length=320)
    code: str = Field(..., min_length=4, max_length=10)


class ResetPasswordRequest(BaseModel):
    email: str = Field(..., max_length=320)
    code: str = Field(..., min_length=4, max_length=10)
    new_password: str = Field(..., min_length=8, max_length=128)
