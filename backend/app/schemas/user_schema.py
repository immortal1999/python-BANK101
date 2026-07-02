from typing import Optional
from pydantic import BaseModel, EmailStr, Field
from datetime import date, datetime

## User schema for request and response validation.
## Must comply with KYC (Know Your Customer), AML (Anti-Money Laundering),
## and data-privacy standards.


class UserCreate(BaseModel):
    email: EmailStr
    username: str = Field(min_length=3, max_length=30)
    password: str = Field(min_length=12, max_length=128)
    full_name: str = Field(min_length=2, max_length=100)
    date_of_birth: date
    address: str = Field(min_length=5, max_length=255)
    phone_number: str = Field(min_length=10, max_length=20)


class UserUpdate(BaseModel):
    email: Optional[EmailStr] = None
    password: Optional[str] = Field(default=None, min_length=12, max_length=128)
    full_name: Optional[str] = None
    date_of_birth: Optional[date] = None
    address: Optional[str] = None
    phone_number: Optional[str] = None


class UserResponse(BaseModel):
    id: int
    email: str
    username: str
    full_name: str
    date_of_birth: date
    address: str
    phone_number: str

    role: str
    is_active: bool

    kyc_status: str
    aml_status: str
    risk_level: str
    kyc_verified_at: Optional[datetime] = None
    kyc_provider: Optional[str] = None

    class Config:
        # allow reading from ORM objects (SQLAlchemy models)
        from_attributes = True
