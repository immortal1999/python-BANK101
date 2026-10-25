from pydantic import BaseModel


class AdminStats(BaseModel):
    """Site-wide aggregates only: counts, never balances or personal data."""
    users_total: int
    users_new_7d: int
    online_now: int | None  # None = Redis unavailable
    online_window_minutes: int
    accounts_total: int
    accounts_by_type: dict[str, int]
    accounts_by_status: dict[str, int]
