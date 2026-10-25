import secrets
from datetime import datetime
from decimal import Decimal
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.core.provisioning import CREDIT_TYPES
from app.db.database import get_db
from app.models.account import Account
from app.models.transaction import Transanction
from app.models.user import User
from app.schemas.account_schema import (
    AccountCreate, AccountResponse, AccountSummary, StatementMonth, StatementsResponse,
)
from app.schemas.transaction_schema import TransactionResponse

router = APIRouter(prefix="/accounts", tags=["accounts"])

@router.post("", response_model=AccountResponse, status_code=status.HTTP_201_CREATED)
def create_account(payload: AccountCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """Create a new bank account for the authenticated user."""
    # Generate a unique account number (e.g., 10-digit random number)
    account_number = str(secrets.randbelow(10**10)).zfill(10)

    # Ensure the account number is unique
    while db.query(Account).filter(Account.account_number == account_number).first():
        account_number = str(secrets.randbelow(10**10)).zfill(10)

    account = Account(
        user_id=current_user.id,
        account_number=account_number,
        account_type=payload.account_type,
    )
    db.add(account)
    db.commit()
    db.refresh(account)
    return account

@router.get("", response_model=list[AccountResponse])
def list_accounts(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """List all bank accounts for the authenticated user."""
    accounts = db.query(Account).filter(Account.user_id == current_user.id).all()
    return accounts


@router.get("/summary", response_model=AccountSummary)
def account_summary(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """Aggregate the authenticated user's accounts. All money math happens here, in
    exact Decimal, so the frontend never does float arithmetic on money."""
    accounts = db.query(Account).filter(Account.user_id == current_user.id).all()

    total_assets = sum((a.balance for a in accounts), Decimal("0"))

    by_type: dict[str, Decimal] = {}
    for a in accounts:
        by_type[a.account_type] = by_type.get(a.account_type, Decimal("0")) + a.balance

    return AccountSummary(
        total_assets=total_assets,
        account_count=len(accounts),
        by_type=by_type,
    )


def _month_bounds(month: str) -> tuple[datetime, datetime]:
    """"YYYY-MM" -> [first day of month, first day of next month)."""
    try:
        start = datetime.strptime(month, "%Y-%m")
    except ValueError:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="month must be YYYY-MM")
    end = start.replace(year=start.year + 1, month=1) if start.month == 12 else start.replace(month=start.month + 1)
    return start, end


def _owned_account(db: Session, user: User, account_id: int) -> Account:
    account = db.query(Account).filter(Account.id == account_id, Account.user_id == user.id).first()
    if not account:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Account not found")
    return account


def _signed(t: Transanction) -> Decimal:
    return t.amount if t.transaction_type in CREDIT_TYPES else -t.amount


@router.get("/transactions", response_model=list[TransactionResponse])
def list_transactions(
    limit: int = Query(10, ge=1, le=500),
    account_id: Optional[int] = None,
    month: Optional[str] = Query(None, description="YYYY-MM; only transactions in that month"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Transactions across the authenticated user's accounts (or one of them), newest first."""
    q = (
        db.query(Transanction, Account.account_number, Account.account_type)
        .join(Account, Transanction.account_id == Account.id)
        .filter(Account.user_id == current_user.id)
    )
    if account_id is not None:
        q = q.filter(Account.id == account_id)
    if month:
        start, end = _month_bounds(month)
        q = q.filter(Transanction.created_at >= start, Transanction.created_at < end)
    rows = q.order_by(Transanction.created_at.desc()).limit(limit).all()
    return [
        TransactionResponse(
            id=t.id,
            account_id=t.account_id,
            account_number=account_number,
            account_type=account_type,
            transaction_type=t.transaction_type,
            amount=t.amount,
            status=t.status,
            description=t.description,
            created_at=t.created_at,
        )
        for t, account_number, account_type in rows
    ]


@router.get("/statements", response_model=StatementsResponse)
def list_statements(
    account_id: Optional[int] = None,
    months: int = Query(12, ge=1, le=24),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Monthly statements for the last `months` calendar months (current month included),
    for one account or all accounts combined.

    Rolled forward from the transaction history and anchored on the live balance, so the
    current month's closing balance always equals the account balance shown elsewhere."""
    if account_id is not None:
        accounts = [_owned_account(db, current_user, account_id)]
    else:
        accounts = db.query(Account).filter(Account.user_id == current_user.id).all()
    ids = [a.id for a in accounts]
    txns = (
        db.query(Transanction).filter(Transanction.account_id.in_(ids)).order_by(Transanction.created_at).all()
        if ids else []
    )

    now = datetime.utcnow()
    keys = []
    y, m = now.year, now.month
    for _ in range(months):
        keys.append(f"{y:04d}-{m:02d}")
        y, m = (y - 1, 12) if m == 1 else (y, m - 1)
    keys.reverse()  # oldest first while rolling forward
    window_start, _ = _month_bounds(keys[0])

    # Balance before any recorded history (0 for provisioned accounts), then roll forward
    # to the start of the window.
    balance = sum((a.balance for a in accounts), Decimal("0")) - sum((_signed(t) for t in txns), Decimal("0"))
    balance += sum((_signed(t) for t in txns if t.created_at < window_start), Decimal("0"))

    buckets = {k: [Decimal("0"), Decimal("0"), 0] for k in keys}  # credits, debits, count
    for t in txns:
        b = buckets.get(t.created_at.strftime("%Y-%m"))
        if b is None:
            continue
        if t.transaction_type in CREDIT_TYPES:
            b[0] += t.amount
        else:
            b[1] += t.amount
        b[2] += 1

    result = []
    for k in keys:
        credits, debits, count = buckets[k]
        closing = balance + credits - debits
        result.append(StatementMonth(
            month=k, opening_balance=balance, total_credits=credits, total_debits=debits,
            closing_balance=closing, transaction_count=count,
        ))
        balance = closing
    result.reverse()
    return StatementsResponse(account_id=account_id, months=result)


@router.get("/{account_id}", response_model=AccountResponse)
def get_account(
    account_id: int, 
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return _owned_account(db, current_user, account_id)
