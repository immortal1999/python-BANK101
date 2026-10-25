import json
import logging
import re
import time
import urllib.error
import urllib.request
from collections import defaultdict, deque
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.core.analytics import FUNCTION_DECLARATIONS, profits, run_tool
from app.core.config import settings
from app.db.database import get_db
from app.models.support_ticket import SupportTicket
from app.models.user import User
from app.models.account import Account
from app.schemas.support_schema import (
    ChatRequest, ChatResponse, ProfitsRequest, TicketCreate, TicketResponse,
)

router = APIRouter(prefix="/support", tags=["support"])
log = logging.getLogger("uvicorn.error")  # shows up in `docker compose logs api`

# Mock contact details (demo only). Served to the frontend and given to the chat model,
# so both always quote the same numbers.
CONTACTS = {
    "email": [
        {"label": "General support", "value": "aureus.banking.support@gmail.com"},
        {"label": "Card services", "value": "aureus.cards.help@gmail.com"},
        {"label": "Fraud & disputes", "value": "aureus.fraud.alerts@gmail.com"},
    ],
    "phone": [
        {"label": "24/7 customer care", "value": "+1 (800) 555-0142"},
        {"label": "Lost or stolen cards", "value": "+1 (800) 555-0199"},
        {"label": "Private banking desk", "value": "+1 (212) 555-8173"},
    ],
    "hours": "Phone & chat 24/7 · Email replies within 1 business day",
}

GEMINI_URL = "https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent"

# Naive in-process rate limit so a single user can't burn through the free-tier quota.
CHAT_LIMIT_PER_MINUTE = 10
_chat_calls: dict[int, deque] = defaultdict(deque)


def _system_prompt(user: User) -> str:
    emails = "; ".join(f"{c['label']}: {c['value']}" for c in CONTACTS["email"])
    phones = "; ".join(f"{c['label']}: {c['value']}" for c in CONTACTS["phone"])
    return (
        "You are Aurea, the virtual support assistant for Aureus Banking, a demo online bank. "
        f"You are chatting with {user.full_name.split(' ')[0]}, a signed-in customer. "
        "Be concise, warm and professional; answer in at most a few short paragraphs. "
        "You can explain how to use the site: Dashboard (overview), Accounts (checking and savings "
        "balances and transactions), Cards (debit and credit cards), Statements (last 12 months of "
        "monthly statements) and Support (contact details and creating a support ticket). "
        f"Today is {datetime.utcnow():%Y-%m-%d}. "
        "You have three analysis tools over the customer's own accounts: spending_habits, profits "
        "and future_projection. Call a tool only when the customer's LATEST message asks for a new "
        "analysis (e.g. 'what are my spending habits?', 'show my profit for savings', 'project my "
        "balance 2 years out'), or asks to redo one with a different period or accounts. The app "
        "shows tool results to the customer directly; in the history they appear as notes like "
        "'[The app displayed: ...]', meaning that analysis was already delivered. You never see "
        "the figures, so never state, guess or invent any balance, amount or figure yourself. "
        "When the customer follows up on a result (thanks, what does this mean, why is X high, "
        "how can I improve), do NOT call a tool again: reply in text with general, practical "
        "guidance, refer to 'the card above' for their numbers, and suggest a next step such as "
        "another analysis. For other account questions (a specific "
        "transaction, balances), point them to the Accounts or Statements pages. You cannot move "
        "money, freeze cards or change account settings; for that, direct them to the Support page "
        "to create a ticket, or to the contacts below. Never ask for passwords, full card numbers, "
        "CVVs or one-time codes. For a lost/stolen card or suspected fraud, tell them to call the "
        f"lost-card line immediately. Contacts — Email: {emails}. Phone: {phones}. "
        f"Hours: {CONTACTS['hours']}."
    )


# Shown above a tool result. Deliberately free of figures: this text is part of the chat
# history that gets resent to Gemini on the next turn.
TOOL_INTROS = {
    "spending_habits": "Here's a breakdown of your spending habits:",
    "account_picker": "Which accounts should I include? Pick one or more, then press Calculate.",
    "future_projection": "Here's where your balance is heading, based on your recent habits:",
}


def _rate_limit(user_id: int) -> bool:
    now = time.monotonic()
    calls = _chat_calls[user_id]
    while calls and now - calls[0] > 60:
        calls.popleft()
    if len(calls) >= CHAT_LIMIT_PER_MINUTE:
        return False
    calls.append(now)
    return True


@router.get("/contacts")
def contacts():
    return CONTACTS


@router.post("/tickets", response_model=TicketResponse, status_code=status.HTTP_201_CREATED)
def create_ticket(
    payload: TicketCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    ticket = SupportTicket(
        user_id=current_user.id,
        subject=payload.subject.strip(),
        category=payload.category,
        priority=payload.priority,
        message=payload.message.strip(),
        status="open",
    )
    db.add(ticket)
    db.commit()
    db.refresh(ticket)
    return ticket


@router.get("/tickets", response_model=list[TicketResponse])
def list_tickets(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    return (
        db.query(SupportTicket)
        .filter(SupportTicket.user_id == current_user.id)
        .order_by(SupportTicket.created_at.desc())
        .all()
    )


@router.post("/chat", response_model=ChatResponse)
def chat(
    payload: ChatRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Relay the chat session to Gemini. History is kept client-side and resent each turn.

    If Gemini asks for an analytics tool, we run it for the current user and return the
    result for the UI to render. The result is NOT sent back to Gemini, so no balances or
    transactions leave the server; Gemini only ever sees the conversation text."""
    if payload.messages[-1].role != "user":
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Last message must be from the user")
    question = payload.messages[-1].content

    # From here on, every failure is answered in-chat (HTTP 200) rather than as an error.
    if not _rate_limit(current_user.id):
        return ChatResponse(
            reply="You're sending messages a little quickly. Give it a few seconds and try again.",
            suggestions=list(DEFAULT_SUGGESTIONS),
        )
    if not settings.SUPPORT_CHAT_KEY:
        return _offline_reply(db, current_user, question)

    data = _call_gemini({
        "systemInstruction": {"parts": [{"text": _system_prompt(current_user)}]},
        "contents": [
            {"role": "model" if m.role == "assistant" else "user", "parts": [{"text": m.content}]}
            for m in payload.messages[-20:]
        ],
        "tools": [{"functionDeclarations": FUNCTION_DECLARATIONS}],
        "generationConfig": {"maxOutputTokens": 600},
    })
    if data is None:
        return _offline_reply(db, current_user, question)

    candidate = (data.get("candidates") or [{}])[0]
    parts = candidate.get("content", {}).get("parts", [])

    calls = [p["functionCall"] for p in parts if isinstance(p.get("functionCall"), dict)][:2]
    if calls:
        results = [r for c in calls if (r := run_tool(db, current_user.id, c.get("name"), c.get("args")))]
        if results:
            # Fixed intro text: the model's own text was written before any figures existed,
            # so we don't relay it (it could only guess at numbers).
            return ChatResponse(reply=TOOL_INTROS[results[0]["kind"]], results=results)

    reply = "".join(p.get("text", "") for p in parts if not p.get("thought")).strip()
    if reply:
        return ChatResponse(reply=reply)

    # Gemini answered but with nothing usable (safety block, cut off, unknown tool, ...).
    log.warning("Gemini returned no usable reply (finishReason=%s, blockReason=%s)",
                candidate.get("finishReason"), (data.get("promptFeedback") or {}).get("blockReason"))
    return ChatResponse(
        reply=(
            "I'm not able to help with that one, sorry. I can analyse your spending habits, "
            "profits or future balance, or answer questions about using Aureus. For anything "
            "else, our team is a ticket or a call away."
        ),
        suggestions=list(DEFAULT_SUGGESTIONS) + ["Create a support ticket"],
    )


# --- Resilience: retries, logging, and an offline fallback ---------------------------

GEMINI_RETRYABLE = {429, 500, 502, 503, 504}
GEMINI_TIMEOUT_S = 15
GEMINI_MAX_ATTEMPTS = 3
GEMINI_BUDGET_S = 25  # stop retrying once this much time has gone by

DEFAULT_SUGGESTIONS = (
    "What are my spending habits?",
    "How much profit did I make?",
    "Where will my balance be in a year?",
)

SPENDING_TIPS = (
    "Here are some proven ways to cut your spending:\n\n"
    "• Start with your biggest categories: a 10% cut to housing or groceries beats cancelling a small subscription.\n"
    "• Review subscriptions and recurring bills every few months; cancel what you don't use and ask providers for a better rate.\n"
    "• Plan meals and shop with a list to cut grocery and takeout costs.\n"
    "• Use a 24-hour rule before non-essential purchases over $50.\n"
    "• Set up an automatic transfer to savings on payday, so you save first and spend what's left.\n\n"
    "Want to see where your money actually goes? Ask for your spending habits."
)


def _call_gemini(body: dict) -> dict | None:
    """POST to Gemini, retrying transient failures. Returns None if it never succeeded."""
    req = urllib.request.Request(
        GEMINI_URL.format(model=settings.GEMINI_MODEL),
        data=json.dumps(body).encode(),
        headers={"Content-Type": "application/json", "x-goog-api-key": settings.SUPPORT_CHAT_KEY},
        method="POST",
    )
    started = time.monotonic()
    for attempt in range(1, GEMINI_MAX_ATTEMPTS + 1):
        try:
            with urllib.request.urlopen(req, timeout=GEMINI_TIMEOUT_S) as resp:
                return json.load(resp)
        except urllib.error.HTTPError as e:
            try:
                err = json.loads(e.read()).get("error", {})
            except Exception:
                err = {}
            # Error status + message only; never the conversation itself.
            log.warning("Gemini HTTP %s %s (attempt %d): %s", e.code, err.get("status", ""),
                        attempt, str(err.get("message", ""))[:200])
            if e.code not in GEMINI_RETRYABLE:
                return None
        except (urllib.error.URLError, TimeoutError) as e:
            log.warning("Gemini unreachable (attempt %d): %s", attempt, e)
        if time.monotonic() - started > GEMINI_BUDGET_S:
            break
        if attempt < GEMINI_MAX_ATTEMPTS:
            time.sleep(0.75 * 2 ** (attempt - 1))  # 0.75s, 1.5s
    return None


def _offline_reply(db: Session, user: User, question: str) -> ChatResponse:
    """Answer without Gemini: the analytics still run locally; common questions get a
    canned answer; anything else gets a friendly note plus things to try."""
    q = question.lower()
    tool = None
    if re.search(r"\b(tip|tips|reduce|cut|lower|save money|budget)", q):
        return ChatResponse(reply=SPENDING_TIPS, suggestions=list(DEFAULT_SUGGESTIONS))
    if re.search(r"\b(profit|income|earn|net)", q):
        tool = "profits"
    elif re.search(r"\b(project|forecast|future|trajector|next year|in a year)", q):
        tool = "future_projection"
    elif re.search(r"\b(spend|spent|spending|expense|habit)", q):
        tool = "spending_habits"
    if tool:
        result = run_tool(db, user.id, tool, {})
        return ChatResponse(reply=TOOL_INTROS[result["kind"]], results=[result])
    if re.search(r"\b(lost|stolen|fraud)", q):
        return ChatResponse(
            reply="If your card is lost or stolen, call our lost-card line right away at "
                  f"{CONTACTS['phone'][1]['value']} (24/7). You can also freeze it on the Cards page.",
        )
    return ChatResponse(
        reply=(
            "I'm having trouble reaching my assistant service right now, so I can't answer that one "
            "just yet. I can still analyse your finances, or you can reach a person via a ticket or "
            f"our 24/7 line at {CONTACTS['phone'][0]['value']}."
        ),
        suggestions=list(DEFAULT_SUGGESTIONS) + ["Create a support ticket"],
    )


@router.post("/analytics/profits")
def analytics_profits(
    payload: ProfitsRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Second step of the chat's profit flow: compute profit for the accounts the user
    picked. Runs entirely server-side; Gemini is not involved."""
    owned = {
        a.id for a in db.query(Account.id).filter(Account.user_id == current_user.id).all()
    }
    requested = set(payload.account_ids)
    if not requested <= owned:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Account not found")
    ids = None if requested == owned else sorted(requested)  # None = "All accounts"
    return profits(db, current_user.id, payload.months, ids)
