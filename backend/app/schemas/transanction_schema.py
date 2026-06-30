from pydantic import BaseModel, Field
from datetime import datetime
from decimal import Decimal
from typing import Optional

class TransactionCreate(BaseModel):
    account_id: int
    transaction_type: str = Field(description="deposit, withdrawal, transfer, payment, refund, fee, or interest")
    amount: Decimal = Field(gt=0, description="must be greater than zero")


class TransactionResponse(BaseModel):
    id: int
    account_id: int
    transaction_type: str
    amount: Decimal
    status: str
    description: str
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

    