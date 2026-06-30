

from sqlalchemy import Column, DateTime, Float, ForeignKey, Integer, String, func
from app.db.database import Base

class AuditLog(Base):
    __tablename__ = 'audit_logs'

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey('users.id'), nullable=False)
    action = Column(String(100), nullable=False)
    entity_type = Column(String(50), nullable=False)  # e.g., 'account', 'transaction', 'payment', 'invoice'
    entity_id = Column(Integer, nullable=False)
    source = Column(String(50), nullable=False)  # e.g., 'web', 'mobile', 'api'
    
    user_agent = Column(String(255), nullable=True)
    details = Column(String(255), nullable=True)
    created_at = Column(DateTime, nullable=False, server_default=func.now())