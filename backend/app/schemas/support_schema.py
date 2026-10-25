from datetime import datetime
from typing import Any, Literal

from pydantic import BaseModel, Field


class TicketCreate(BaseModel):
    subject: str = Field(min_length=3, max_length=150)
    category: Literal["account", "card", "transaction", "statement", "technical", "other"]
    priority: Literal["low", "normal", "high"] = "normal"
    message: str = Field(min_length=10, max_length=4000)


class TicketResponse(BaseModel):
    id: int
    subject: str
    category: str
    priority: str
    message: str
    status: str
    created_at: datetime

    class Config:
        from_attributes = True


class ChatMessage(BaseModel):
    role: Literal["user", "assistant"]
    content: str = Field(min_length=1, max_length=2000)


class ChatRequest(BaseModel):
    # Whole session history, oldest first; the last message must be from the user.
    messages: list[ChatMessage] = Field(min_length=1, max_length=40)


class ChatResponse(BaseModel):
    reply: str
    # Analytics results computed server-side for the UI to render (see app/core/analytics.py).
    results: list[dict[str, Any]] = []
    # Optional follow-up prompts for the UI to offer as buttons.
    suggestions: list[str] = []


class ProfitsRequest(BaseModel):
    account_ids: list[int] = Field(min_length=1, max_length=20)  # 1 to all of the user's accounts
    months: int = Field(default=6, ge=1, le=12)
