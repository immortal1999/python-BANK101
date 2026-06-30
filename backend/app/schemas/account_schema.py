from pydantic import BaseModel, Field
from datetime import datetime
from typing import Optional
from decimal import Decimal

class AccountCreate(BaseModel):
    account_type: str = Field(description="checking, savings, credit, business")


class AccountUpdate(BaseModel):
    status: Optional[str] = None

class AccountResponse(BaseModel):
    id: int
    user_id: int
    account_number: str
    account_type: str
    balance: Decimal
    status: str
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

