import secrets
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.db.database import get_db
from app.models.account import Account
from app.models.user import User
from app.schemas.account_schema import AccountCreate, AccountResponse

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


@router.get("/{account_id}", response_model=AccountResponse)
def get_account(
    account_id: int, 
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    account = db.query(Account).filter(Account.id == account_id, Account.user_id == current_user.id).first()
    if not account:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Account not found")
    return account
