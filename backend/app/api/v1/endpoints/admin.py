from datetime import datetime, timedelta

from fastapi import APIRouter, Depends
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.api.deps import require_admin
from app.core.presence import ONLINE_WINDOW_SECONDS, online_count
from app.db.database import get_db
from app.models.account import Account
from app.models.user import User
from app.schemas.admin_schema import AdminStats

# Every route here is admin-only via the router-level dependency.
router = APIRouter(prefix="/admin", tags=["admin"], dependencies=[Depends(require_admin)])


@router.get("/stats", response_model=AdminStats)
def stats(db: Session = Depends(get_db)):
    week_ago = datetime.utcnow() - timedelta(days=7)
    by_type = db.query(Account.account_type, func.count()).group_by(Account.account_type).all()
    by_status = db.query(Account.status, func.count()).group_by(Account.status).all()
    return AdminStats(
        users_total=db.query(func.count(User.id)).scalar(),
        users_new_7d=db.query(func.count(User.id)).filter(User.created_at >= week_ago).scalar(),
        online_now=online_count(),
        online_window_minutes=ONLINE_WINDOW_SECONDS // 60,
        accounts_total=sum(n for _, n in by_type),
        accounts_by_type=dict(by_type),
        accounts_by_status=dict(by_status),
    )
