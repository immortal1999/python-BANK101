from datetime import datetime
from decimal import Decimal
from typing import Optional

from pydantic import BaseModel


class TransactionResponse(BaseModel):
    id: int
    account_id: int
    account_number: str        # masked/display handle for the account
    account_type: str          # checking, savings, ...
    transaction_type: str      # deposit, purchase, transfer, ...
    amount: Decimal
    status: str
    description: Optional[str]
    created_at: datetime
