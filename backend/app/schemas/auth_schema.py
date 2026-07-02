from typing import Optional
from pydantic import BaseModel, EmailStr, Field


class LoginRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=12, max_length=128)


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    refresh_token: Optional[str] = None  # TODO: implement refresh tokens


class RefreshTokenRequest(BaseModel):
    refresh_token: str

## add refresh tokens + 2FA later
