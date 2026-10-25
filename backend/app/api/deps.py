from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session

from app.core.presence import mark_seen
from app.core.security import decode_access_token
from app.db.database import get_db
from app.models.user import User

# Extracts the "Authorization: Bearer <token>" header. tokenUrl powers the
# /docs "Authorize" button (points at the login endpoint).
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="api/v1/auth/login")


def get_current_user(
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db),
) -> User:
    """Decode the JWT, load and return the current user, or raise 401."""
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )

    payload = decode_access_token(token)
    if payload is None:
        raise credentials_exception

    user_id = payload.get("sub")
    if user_id is None:
        raise credentials_exception

    user = db.query(User).filter(User.id == int(user_id)).first()
    if user is None:
        raise credentials_exception
    mark_seen(user.id)
    return user


def require_admin(current_user: User = Depends(get_current_user)) -> User:
    """Allow only active users with role 'admin'; everyone else gets 403."""
    if current_user.role != "admin" or not current_user.is_active:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Admin access required")
    return current_user
