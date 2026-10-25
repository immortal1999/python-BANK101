from sqlalchemy import Column, DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.sql import func
from app.db.database import Base

class SupportTicket(Base):
    __tablename__ = 'support_tickets'

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey('users.id'), nullable=False, index=True)
    subject = Column(String(150), nullable=False)
    category = Column(String(30), nullable=False)   # e.g., 'account', 'card', 'transaction', 'technical', 'other'
    priority = Column(String(20), nullable=False, default="normal")  # 'low', 'normal', 'high'
    message = Column(Text, nullable=False)
    status = Column(String(20), nullable=False, default="open")  # 'open', 'in_progress', 'resolved'
    created_at = Column(DateTime, nullable=False, server_default=func.now())
    updated_at = Column(DateTime, nullable=False, server_default=func.now(), onupdate=func.now())
