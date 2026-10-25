"""Read-only analytics over a user's own accounts, offered to the support chat as tools.

Gemini only chooses which analysis to run and with what arguments. The numbers are
computed here and rendered directly by the chat UI; they are never sent back to Gemini,
so the user's financial data doesn't leave our server.

Every function is scoped by the user_id from the caller's JWT; the model has no way to
name another user or account.
"""
import math
import re
import statistics
from datetime import datetime
from decimal import Decimal
from typing import Any, Callable

from sqlalchemy.orm import Session

from app.core.provisioning import CREDIT_TYPES
from app.models.account import Account
from app.models.transaction import Transanction

CENT = Decimal("0.01")
ZERO = Decimal("0")
SAVINGS_MONTHLY_RATE = Decimal("0.0035")  # ~4.2% APY, matches provisioning

# (key, label, description keywords). First match wins; unmatched debits -> "other".
CATEGORIES = [
    ("housing", "Housing", ["rent"]),
    ("bills", "Bills & utilities", ["pg&e", "verizon", "comcast", "utilities"]),
    ("groceries", "Groceries", ["whole foods", "trader joe", "costco"]),
    ("dining", "Dining & coffee", ["starbucks", "doordash"]),
    ("transport", "Transport", ["uber", "shell"]),
    ("subscriptions", "Subscriptions", ["netflix", "spotify"]),
    ("shopping", "Shopping", ["amazon", "ebay", "walmart", "target", "best buy", "apple"]),
]
CATEGORY_LABELS = {k: label for k, label, _ in CATEGORIES} | {"other": "Other"}


def _money(d: Decimal) -> str:
    return str(d.quantize(CENT))


def _is_transfer(t: Transanction) -> bool:
    """Money moving between the user's own accounts, or the initial funding of an account:
    neither income nor spending."""
    if t.transaction_type in ("transfer_in", "transfer_out", "transfer"):
        return True
    desc = (t.description or "").lower()
    if t.transaction_type == "deposit" and desc.startswith("opening deposit"):
        return True
    return t.transaction_type == "withdrawal" and desc.startswith("transfer")


def _category(t: Transanction) -> str:
    desc = (t.description or "").lower()
    for key, _, words in CATEGORIES:
        if any(w in desc for w in words):
            return key
    return "other"


def _ym(dt: datetime) -> str:
    return f"{dt.year:04d}-{dt.month:02d}"


def _shift(ym: str, delta: int) -> str:
    y, m = map(int, ym.split("-"))
    idx = y * 12 + (m - 1) + delta
    return f"{idx // 12:04d}-{idx % 12 + 1:02d}"


def _complete_months(n: int, now: datetime) -> list[str]:
    """The last n fully-finished calendar months, oldest first."""
    last = _shift(_ym(now), -1)
    return [_shift(last, -i) for i in range(n - 1, -1, -1)]


def _month_label(ym: str) -> str:
    return datetime.strptime(ym, "%Y-%m").strftime("%b %Y")


def _period_label(keys: list[str]) -> str:
    return _month_label(keys[0]) if len(keys) == 1 else f"{_month_label(keys[0])} – {_month_label(keys[-1])}"


def _load(
    db: Session, user_id: int, since_ym: str, account_ids: list[int] | None = None,
) -> tuple[list[Account], list[Transanction]]:
    """The user's accounts (optionally narrowed to account_ids) and their transactions since
    since_ym. Always filtered by user_id, so foreign account ids simply match nothing."""
    q = db.query(Account).filter(Account.user_id == user_id)
    if account_ids is not None:
        q = q.filter(Account.id.in_(account_ids))
    accounts = q.all()
    ids = [a.id for a in accounts]
    since = datetime.strptime(since_ym, "%Y-%m")
    txns = (
        db.query(Transanction)
        .filter(Transanction.account_id.in_(ids), Transanction.created_at >= since)
        .all()
    ) if ids else []
    return accounts, txns


def account_label(a: Account) -> str:
    return f"{a.account_type.capitalize()} ••••{a.account_number[-4:]}"


def _flows(txns: list[Transanction], keys: list[str]) -> dict[str, dict[str, Decimal]]:
    """Per-month income / expenses / interest, excluding transfers between own accounts."""
    out = {k: {"income": ZERO, "expenses": ZERO, "interest": ZERO} for k in keys}
    for t in txns:
        row = out.get(_ym(t.created_at))
        if row is None or _is_transfer(t):
            continue
        if t.transaction_type in CREDIT_TYPES:
            row["income"] += t.amount
            if t.transaction_type == "interest":
                row["interest"] += t.amount
        else:
            row["expenses"] += t.amount
    return out


# ---------------------------------------------------------------------------
# Tools
# ---------------------------------------------------------------------------

def spending_habits(db: Session, user_id: int, months: int = 3, month: str | None = None) -> dict:
    now = datetime.utcnow()
    keys = [month] if month else _complete_months(months, now)
    prev_keys = [_shift(k, -len(keys)) for k in keys]
    _, txns = _load(db, user_id, prev_keys[0])

    spend = [t for t in txns if t.transaction_type not in CREDIT_TYPES and not _is_transfer(t)]
    current = [t for t in spend if _ym(t.created_at) in keys]
    prev_total = sum((t.amount for t in spend if _ym(t.created_at) in prev_keys), ZERO)
    total = sum((t.amount for t in current), ZERO)

    by_cat: dict[str, Decimal] = {}
    by_merchant: dict[str, list] = {}
    for t in current:
        c = _category(t)
        by_cat[c] = by_cat.get(c, ZERO) + t.amount
        m = by_merchant.setdefault(t.description or "Unknown", [ZERO, 0])
        m[0] += t.amount
        m[1] += 1

    largest = max(current, key=lambda t: t.amount, default=None)
    change = float((total - prev_total) / prev_total * 100) if prev_total else None
    return {
        "kind": "spending_habits",
        "title": "Spending habits",
        "period": _period_label(keys),
        "months": len(keys),
        "partial": keys[-1] == _ym(now),
        "total": _money(total),
        "monthly_average": _money(total / len(keys)),
        "previous_total": _money(prev_total),
        "change_pct": round(change, 1) if change is not None else None,
        "transaction_count": len(current),
        "categories": [
            {"key": k, "label": CATEGORY_LABELS[k], "amount": _money(v),
             "share": round(float(v / total * 100), 1) if total else 0}
            for k, v in sorted(by_cat.items(), key=lambda kv: kv[1], reverse=True)
        ],
        "top_merchants": [
            {"name": name, "amount": _money(v[0]), "count": v[1]}
            for name, v in sorted(by_merchant.items(), key=lambda kv: kv[1][0], reverse=True)[:5]
        ],
        "largest": largest and {
            "description": largest.description, "amount": _money(largest.amount),
            "date": largest.created_at.date().isoformat(),
        },
    }


def profits(db: Session, user_id: int, months: int = 6, account_ids: list[int] | None = None) -> dict:
    """Profit over the selected accounts (all of them when account_ids is None): combined
    totals plus a per-account breakdown. Transfers between the user's own accounts are
    excluded from income/expenses and reported separately per account."""
    keys = _complete_months(months, datetime.utcnow())
    accounts, txns = _load(db, user_id, keys[0], account_ids)
    flows = _flows(txns, keys)
    # Skip months before the history starts so the chart doesn't open with empty bars.
    while len(keys) > 1 and not (flows[keys[0]]["income"] or flows[keys[0]]["expenses"]):
        flows.pop(keys.pop(0))

    breakdown = []
    for a in accounts:
        own = [t for t in txns if t.account_id == a.id]
        f = _flows(own, keys)
        a_income = sum((m["income"] for m in f.values()), ZERO)
        a_expenses = sum((m["expenses"] for m in f.values()), ZERO)
        a_transfers = sum(
            (t.amount if t.transaction_type in CREDIT_TYPES else -t.amount
             for t in own if _ym(t.created_at) in f and _is_transfer(t)
             and not (t.description or "").lower().startswith("opening deposit")),
            ZERO,
        )
        breakdown.append({
            "id": a.id, "label": account_label(a), "income": _money(a_income),
            "expenses": _money(a_expenses), "net": _money(a_income - a_expenses),
            "transfers": _money(a_transfers),
        })

    income = sum((f["income"] for f in flows.values()), ZERO)
    expenses = sum((f["expenses"] for f in flows.values()), ZERO)
    interest = sum((f["interest"] for f in flows.values()), ZERO)
    net = income - expenses
    best = max(keys, key=lambda k: flows[k]["income"] - flows[k]["expenses"])
    return {
        "kind": "profits",
        "title": "Profit & savings",
        "period": _period_label(keys),
        "scope": "All accounts" if account_ids is None else " + ".join(b["label"] for b in breakdown),
        "accounts": breakdown,
        "income": _money(income),
        "expenses": _money(expenses),
        "net": _money(net),
        "interest": _money(interest),
        "savings_rate": round(float(net / income * 100), 1) if income else None,
        "best_month": _month_label(best),
        "months": [
            {"month": k, "label": _month_label(k), "income": _money(f["income"]),
             "expenses": _money(f["expenses"]), "net": _money(f["income"] - f["expenses"])}
            for k, f in flows.items()
        ],
    }


def account_picker(db: Session, user_id: int, tool: str, args: dict, preselect_types: list[str]) -> dict:
    """Ask the user which accounts to include before running `tool`. The model can only
    suggest account *types* to pre-tick; the user makes the actual choice in the UI."""
    accounts = db.query(Account).filter(Account.user_id == user_id).order_by(Account.id).all()
    return {
        "kind": "account_picker",
        "title": "Choose accounts",
        "tool": tool,
        "args": args,
        "accounts": [
            {"id": a.id, "label": account_label(a), "type": a.account_type,
             "selected": not preselect_types or a.account_type in preselect_types}
            for a in accounts
        ],
    }


def future_projection(db: Session, user_id: int, months_ahead: int = 12) -> dict:
    """Project the total balance forward: the average monthly net cash flow of the last
    6 complete months (excluding interest), plus interest compounding on savings. The band
    widens with the month-to-month volatility of that net flow (±1 std dev · √months)."""
    now = datetime.utcnow()
    basis = _complete_months(6, now)
    accounts, txns = _load(db, user_id, basis[0])
    flows = _flows(txns, basis)
    nets = [f["income"] - f["interest"] - f["expenses"] for f in flows.values()]
    avg_net = sum(nets, ZERO) / len(nets)
    stdev = Decimal(str(statistics.pstdev([float(n) for n in nets]))) if len(nets) > 1 else ZERO

    savings = sum((a.balance for a in accounts if a.account_type == "savings"), ZERO)
    other = sum((a.balance for a in accounts if a.account_type != "savings"), ZERO)
    start = savings + other

    points = []
    ym = _ym(now)
    for k in range(1, months_ahead + 1):
        savings += savings * SAVINGS_MONTHLY_RATE
        other += avg_net
        expected = savings + other
        spread = stdev * Decimal(str(math.sqrt(k)))
        ym = _shift(ym, 1)
        points.append({
            "month": ym, "label": _month_label(ym), "expected": _money(expected),
            "low": _money(expected - spread), "high": _money(expected + spread),
        })
    end = Decimal(points[-1]["expected"])
    return {
        "kind": "future_projection",
        "title": "Balance projection",
        "months_ahead": months_ahead,
        "basis": _period_label(basis),
        "start_balance": _money(start),
        "end_balance": _money(end),
        "change": _money(end - start),
        "monthly_net_average": _money(avg_net),
        "points": points,
    }


# ---------------------------------------------------------------------------
# Tool registry: Gemini function declarations + strict argument validation
# ---------------------------------------------------------------------------

def _int_arg(args: dict, name: str, default: int, lo: int, hi: int) -> int:
    try:
        return max(lo, min(hi, int(args.get(name, default))))
    except (TypeError, ValueError):
        return default


def _month_arg(args: dict) -> str | None:
    """A YYYY-MM within the last 12 months (current included), else None."""
    v = args.get("month")
    if not isinstance(v, str) or not re.fullmatch(r"\d{4}-(0[1-9]|1[0-2])", v):
        return None
    current = _ym(datetime.utcnow())
    return v if _shift(current, -12) <= v <= current else None


TOOLS: dict[str, tuple[dict, Callable[[Session, int, dict], dict]]] = {
    "spending_habits": (
        {
            "name": "spending_habits",
            "description": (
                "Analyse the customer's spending: totals by category, top merchants, largest "
                "purchase, and change vs the previous period. Use for questions about spending, "
                "budgets, where money goes, or a specific month's spending."
            ),
            "parameters": {
                "type": "object",
                "properties": {
                    "months": {"type": "integer", "description": "Number of most recent complete months to analyse (1-12). Default 3."},
                    "month": {"type": "string", "description": "A single month to analyse instead, as YYYY-MM (e.g. last month, or the current month)."},
                },
            },
        },
        lambda db, uid, a: spending_habits(db, uid, _int_arg(a, "months", 3, 1, 12), _month_arg(a)),
    ),
    "profits": (
        {
            "name": "profits",
            "description": (
                "Show the customer's profit: income minus expenses per month, net savings, savings "
                "rate and interest earned, per account and combined. Use for questions about income, "
                "earnings, net savings, profit or whether they are saving money. Calling this shows "
                "the customer an account selector; they pick which accounts to include."
            ),
            "parameters": {
                "type": "object",
                "properties": {
                    "months": {"type": "integer", "description": "Number of most recent complete months (1-12). Default 6."},
                    "account_types": {
                        "type": "array",
                        "items": {"type": "string", "enum": ["checking", "savings"]},
                        "description": "Only if the customer explicitly named which account(s) they mean. The customer is always asked to confirm the selection.",
                    },
                },
            },
        },
        # Never computed straight away: the user first picks the accounts (1 to all) in the
        # chat, then the UI calls POST /support/analytics/profits with their choice.
        lambda db, uid, a: account_picker(
            db, uid, "profits", {"months": _int_arg(a, "months", 6, 1, 12)},
            [t for t in (a.get("account_types") or []) if t in ("checking", "savings")]
            if isinstance(a.get("account_types"), list) else [],
        ),
    ),
    "future_projection": (
        {
            "name": "future_projection",
            "description": (
                "Project the customer's total balance trajectory into the future based on their "
                "recent income, spending and savings interest. Use for questions about future "
                "balance, forecasts, 'where will I be', or savings goals."
            ),
            "parameters": {
                "type": "object",
                "properties": {
                    "months_ahead": {"type": "integer", "description": "How many months ahead to project (1-24). Default 12."},
                },
            },
        },
        lambda db, uid, a: future_projection(db, uid, _int_arg(a, "months_ahead", 12, 1, 24)),
    ),
}

FUNCTION_DECLARATIONS = [decl for decl, _ in TOOLS.values()]


def run_tool(db: Session, user_id: int, name: str, args: Any) -> dict | None:
    """Run a tool the model asked for. Unknown tools -> None; bad args fall back to defaults."""
    entry = TOOLS.get(name)
    if entry is None:
        return None
    return entry[1](db, user_id, args if isinstance(args, dict) else {})
