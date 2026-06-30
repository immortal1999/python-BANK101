from datetime import datetime
from typing import Optional
from pydantic import BaseModel

class AuditLogCreate(BaseModel):
    user_id: int
    action: str
    entity_type: str # e.g. account, transaction, invoice, payment
    entity_id: int # ID of the affected entity
    details: Optional[str] = None # Additional info about the action

class AuditLogResponse(BaseModel):
    id: int
    user_id: int
    action: str
    entity_type: str
    entity_id: int
    details: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True
    

