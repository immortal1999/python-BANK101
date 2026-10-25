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


class AccountSummary(BaseModel):
    """Aggregate view of a user's accounts, computed server-side as exact Decimals."""
    total_assets: Decimal            # sum of all balances (serialized as a string in JSON)
    account_count: int
    by_type: dict[str, Decimal]      # e.g. {"checking": "0.00", "savings": "1500.00"}



class StatementMonth(BaseModel):
    """One monthly statement. closing_balance of the current month == the live balance."""
    month: str                       # "YYYY-MM"
    opening_balance: Decimal
    total_credits: Decimal
    total_debits: Decimal
    closing_balance: Decimal
    transaction_count: int


class StatementsResponse(BaseModel):
    account_id: Optional[int]        # None = all accounts combined
    months: list[StatementMonth]     # newest first
