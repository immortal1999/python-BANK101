from sqlalchemy import Column, DateTime, Integer, String, Float, Date, ForeignKey
from sqlalchemy.sql import func
from app.db.database import Base

class Invoice(Base):
    __tablename__ = 'invoices'

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey('users.id'), nullable=False)
    amount = Column(Float, nullable=False)
    status = Column(String(20), nullable=False)  # e.g., 'paid', 'unpaid', 'overdue'
    due_date = Column(Date, nullable=False)
    description = Column(String(255), nullable=True)
    paid_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, nullable=False, server_default=func.now())
    updated_at = Column(DateTime, nullable=False, server_default=func.now(), onupdate=func.now())

