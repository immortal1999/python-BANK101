from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.core.provisioning import ensure_demo_accounts
from app.core.security import create_access_token, hash_password, verify_password
from app.db.database import get_db
from app.models.user import User
from app.schemas.auth_schema import LoginRequest, TokenResponse
from app.schemas.user_schema import UserCreate, UserResponse

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/register", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
def register(payload: UserCreate, db: Session = Depends(get_db)):
    """Create a new user (inserts one row into the users table)."""
    existing = (
        db.query(User)
        .filter((User.email == payload.email) | (User.username == payload.username))
        .first()
    )
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Email or username already registered",
        )

    user = User(
        email=payload.email,
        username=payload.username,
        full_name=payload.full_name,
        date_of_birth=payload.date_of_birth,
        address=payload.address,
        phone_number=payload.phone_number,
        hashed_password=hash_password(payload.password),  # never store plaintext
    )
    db.add(user)
    db.flush()  # assigns user.id without committing yet (still one transaction)

    # Demo provisioning: funded checking + savings with 12 months of history, standing in
    # for the accounts a branch would have opened in person.
    ensure_demo_accounts(db, user.id)

    db.commit()
    db.refresh(user)
    return user


@router.post("/login", response_model=TokenResponse)
def login(payload: LoginRequest, db: Session = Depends(get_db)):
    """Verify credentials and return a signed JWT access token."""
    user = db.query(User).filter(User.email == payload.email).first()
    # Same error whether the email is unknown or the password is wrong
    # (avoids user enumeration).
    if not user or not verify_password(payload.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid credentials",
        )
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account is inactive",
        )
    # Backfill the demo accounts for users created before both were provisioned.
    if ensure_demo_accounts(db, user.id):
        db.commit()

    token = create_access_token(subject=user.id)
    return TokenResponse(access_token=token)


@router.get("/me", response_model=UserResponse)
def read_me(current_user: User = Depends(get_current_user)):
    """Return the currently authenticated user (protected route)."""
    return current_user
