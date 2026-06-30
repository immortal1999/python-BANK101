from pydantic import BaseModel, Field
from datetime import datetime
from decimal import Decimal
from typing import Optional

class PaymentCreate(BaseModel):
    account_id: int
    invoice_id: int
    amount: Decimal = Field(gt=0, description="must be greater than zero")

class PaymentResponse(BaseModel):
    id: int
    account_id: int
    invoice_id: int
    amount: Decimal
    status: str
    description: str
    created_at: datetime
    updated_at: datetime
    completed_at: datetime

    class Config:
        from_attributes = True
