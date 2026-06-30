from typing import Optional
from pydantic import BaseModel, EmailStr, Field
from datetime import date, datetime

## User schema for request and response validation 
## must comply with Know Your Customer (KYC) regulations, 
## AML(Anti-Money Laundering) laws, and data privacy standards.

class UserCreate(BaseModel):
    email: EmailStr
    password: str = Field(min=12, max=128)
    full_name: str = Field (min=2, max=100)
    date_of_birth: date
    address: str = Field (min=5, max=255)
    phone_number: str = Field (min=10, max=20)


class UserUpdate(BaseModel):
    email: EmailStr[Optional] = None
    password: str[Optional] = None
    full_name: str[Optional] = None
    date_of_birth: date[Optional] = None
    address: str[Optional] = None
    phone_number: str[Optional] = None


class UserResponse(BaseModel):
    id: int
    email: str
    full_name: str
    date_of_birth: date
    address: str
    phone_number: str

    is_active: bool

    kycstatus: str
    amlstatus: str
    risk_level: str
    kyc_verified_at: Optional[datetime] = None
    kyc_provider: Optional[str] = None

    class Config:
        # allows to read from objects returned by ORM models (like SQLAlchemy)
        # old Pydantic use orm_mode = True
        from_attributes = True

