from sqlalchemy import Column, Integer, String, Boolean, Date, DateTime, Numeric, ForeignKey
from sqlalchemy.sql import func
from app.db.database import Base

class Account(Base):
    __tablename__ = 'accounts'

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    account_number = Column(String(20), unique=True, nullable=False, index=True)
    account_type = Column(String(30), nullable=False)
    balance = Column(Numeric(18,2), nullable=False, default=0)
    status = Column(String(20), nullable=False, default="active")

    created_at = Column(DateTime, nullable=False, server_default=func.now())
    updated_at = Column(DateTime, nullable=False, server_default=func.now(), onupdate=func.now())

    