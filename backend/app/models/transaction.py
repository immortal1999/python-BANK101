from sqlalchemy import Column, DateTime, Integer, String, Float, Date, ForeignKey
from sqlalchemy.sql import func
from app.db.database import Base

class Transanction(Base):
    __tablename__ = 'transactions'

    id = Column(Integer, primary_key=True, index=True)
    account_id = Column(Integer, ForeignKey('accounts.id'), nullable=False)
    transaction_type = Column(String(30), nullable=False)  # e.g., 'deposit', 'withdrawal', 'transfer'
    amount = Column(Float, nullable=False)
    status = Column(String(20), nullable=False)  # e.g., 'paid', 'unpaid', 'overdue'
    description = Column(String(255), nullable=True)
    created_at = Column(DateTime, nullable=False, server_default=func.now())
    updated_at = Column(DateTime, nullable=False, server_default=func.now(), onupdate=func.now())

