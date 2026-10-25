"""Demo provisioning: give a user a funded checking + savings account with 12 months of
realistic-looking history. Stands in for the accounts a branch would have opened in person.

Every account's balance is derived from its transactions (credits minus debits), so the
balance, the recent-transactions list and the monthly statements always agree.
"""
import random
import secrets
from datetime import datetime, timedelta
from decimal import Decimal

from sqlalchemy.orm import Session

from app.models.account import Account
from app.models.transaction import Transanction

# Transaction types that add money to an account; everything else is a debit.
# The frontend mirrors this list to colour amounts +/-.
CREDIT_TYPES = {"deposit", "refund", "credit", "payroll", "interest", "transfer_in"}

# The two accounts every user gets.
DEMO_ACCOUNT_TYPES = ("checking", "savings")

HISTORY_MONTHS = 12

EMPLOYERS = ["Acme Corp", "Globex Inc", "Initech", "Umbrella Holdings", "Stark Industries"]
MERCHANTS = [
    "Amazon", "eBay", "Walmart", "Target", "Netflix", "Apple", "Starbucks", "Uber",
    "Costco", "Best Buy", "Spotify", "Whole Foods", "DoorDash", "Shell", "Trader Joe's",
]
BILLS = [("PG&E Utilities", 90, 220), ("Verizon Wireless", 60, 120), ("Comcast Internet", 70, 110)]


def _unique_account_number(db: Session) -> str:
    number = str(secrets.randbelow(10**10)).zfill(10)
    while db.query(Account).filter(Account.account_number == number).first():
        number = str(secrets.randbelow(10**10)).zfill(10)
    return number


def _month_starts(now: datetime) -> list[datetime]:
    """First day of each of the last HISTORY_MONTHS calendar months (current one included), oldest first."""
    y, m = now.year, now.month
    starts = []
    for _ in range(HISTORY_MONTHS):
        starts.append(datetime(y, m, 1))
        y, m = (y - 1, 12) if m == 1 else (y, m - 1)
    return starts[::-1]


def _money(lo: int, hi: int) -> Decimal:
    return Decimal(f"{random.randint(lo, hi)}.{random.randint(0, 99):02d}")


def _checking_history(start: datetime, now: datetime) -> list[tuple]:
    """(type, amount, description, created_at) rows for a checking account.
    Spending each month is capped below that month's income so the balance never dips negative."""
    employer = random.choice(EMPLOYERS)
    salary = Decimal(random.randint(2400, 4200))  # per paycheck, twice a month
    rent = Decimal(random.randint(1200, 2200))
    rows = [("deposit", Decimal(random.randint(3000, 8000)), "Opening deposit", start)]

    for month_start in _month_starts(now):
        income = Decimal("0")
        for day in (1, 15):
            ts = month_start + timedelta(days=day - 1, hours=9)
            if ts < now:
                rows.append(("payroll", salary, f"Payroll — {employer}", ts))
                income += salary

        budget = income * Decimal("0.92")
        spent = Decimal("0")
        debits = [("payment", rent, "Rent — Parkview Apartments", 2)]
        debits += [("payment", _money(lo, hi), name, random.randint(3, 25)) for name, lo, hi in BILLS]
        debits += [("purchase", _money(8, 260), random.choice(MERCHANTS), random.randint(1, 28))
                   for _ in range(random.randint(10, 18))]
        for ttype, amount, desc, day in debits:
            ts = month_start + timedelta(days=day - 1, hours=random.randint(8, 21), minutes=random.randint(0, 59))
            if ts >= now or spent + amount > budget:
                continue
            rows.append((ttype, amount, desc, ts))
            spent += amount

        if random.random() < 0.25:
            ts = month_start + timedelta(days=random.randint(5, 25), hours=12)
            if ts < now:
                rows.append(("refund", _money(10, 120), f"Refund — {random.choice(MERCHANTS)}", ts))
    return rows


def _savings_history(start: datetime, now: datetime) -> list[tuple]:
    """Opening deposit, monthly auto-transfer in, monthly interest, an occasional withdrawal."""
    balance = Decimal(random.randint(15000, 60000))
    rows = [("deposit", balance, "Opening deposit", start)]
    monthly = Decimal(random.choice([250, 500, 750, 1000]))

    for month_start in _month_starts(now):
        transfer_ts = month_start + timedelta(days=2, hours=6)
        if transfer_ts < now:
            rows.append(("transfer_in", monthly, "Auto-save from Checking", transfer_ts))
            balance += monthly
        interest_ts = month_start + timedelta(days=27, hours=3)
        if interest_ts < now:
            interest = (balance * Decimal("0.0035")).quantize(Decimal("0.01"))  # ~4.2% APY
            rows.append(("interest", interest, "Monthly interest", interest_ts))
            balance += interest
        if random.random() < 0.15:
            ts = month_start + timedelta(days=random.randint(5, 20), hours=14)
            amount = Decimal(random.randint(500, 2000))
            if ts < now and amount < balance:
                rows.append(("withdrawal", amount, "Transfer to Checking", ts))
                balance -= amount
    return rows


def _create_account(db: Session, user_id: int, account_type: str) -> Account:
    now = datetime.utcnow()
    start = _month_starts(now)[0] - timedelta(days=3)  # opening deposit just before the first statement
    history = _checking_history(start, now) if account_type == "checking" else _savings_history(start, now)

    account = Account(
        user_id=user_id,
        account_number=_unique_account_number(db),
        account_type=account_type,
        balance=Decimal("0"),
        status="active",
    )
    db.add(account)
    db.flush()  # need account.id for the transaction rows

    balance = Decimal("0")
    for ttype, amount, desc, ts in history:
        balance += amount if ttype in CREDIT_TYPES else -amount
        db.add(Transanction(
            account_id=account.id,
            transaction_type=ttype,
            amount=amount,
            status="completed",
            description=desc,
            created_at=ts,
            updated_at=ts,
        ))
    account.balance = balance  # balance == sum of history, by construction
    db.flush()
    return account


def ensure_demo_accounts(db: Session, user_id: int) -> list[Account]:
    """Make sure the user has a checking and a savings account; create whichever is missing.
    Idempotent, so it's safe to call on every login. Caller is responsible for committing."""
    existing = {a.account_type for a in db.query(Account).filter(Account.user_id == user_id).all()}
    return [_create_account(db, user_id, t) for t in DEMO_ACCOUNT_TYPES if t not in existing]
