from datetime import datetime
from decimal import Decimal
from typing import Optional

from pydantic import BaseModel


class InvoiceCreate(BaseModel):
    user_id: int
    amount: Decimal
    description: str
    due_date: datetime
    

class InvoiceResponse(BaseModel):
    id: int
    user_id: int
    amount: Decimal
    status: str
    description: str
    due_date: datetime
    created_at: datetime
    updated_at: datetime
    paid_at: Optional[datetime] = None

    class Config:
        from_attributes = True