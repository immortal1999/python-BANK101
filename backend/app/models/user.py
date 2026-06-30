from sqlalchemy import Column, Integer, String, Boolean, Date, DateTime
from sqlalchemy.sql import func
from app.db.database import Base

class User(Base):
    __tablename__ = 'users'

    id = Column(Integer, primary_key=True, index=True)

    email = Column(String(254), unique=True, nullable=False, index=True)
    username = Column(String(30), unique=True, nullable=False, index=True)
    full_name = Column(String(120), nullable=False)
    date_of_birth = Column(Date, nullable=False)
    address = Column(String(255), nullable=False)
    phone_number = Column(String(20), nullable=False)

    hashed_password = Column(String(255), nullable=False)

    role = Column(String(30), nullable=False, default="customer")
    is_active = Column(Boolean, nullable=False, default=True)

    kyc_status = Column(String(30), nullable=False, default="pending")
    aml_status = Column(String(30), nullable=False, default="review_required")
    risk_level = Column(String(20), nullable=False, default="medium")
    kyc_verified_at = Column(DateTime, nullable=True)
    kyc_provider = Column(String(100), nullable=True)

    created_at = Column(DateTime, nullable=False, server_default=func.now())
    updated_at = Column(DateTime, nullable=False, server_default=func.now(), onupdate=func.now())

    