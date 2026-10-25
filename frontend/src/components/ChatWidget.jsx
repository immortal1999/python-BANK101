import { Fragment, useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api } from "../lib/api";
import ChatResults from "./ChatResults";
import "./chat.css";

const STORAGE_KEY = "support-chat";

const SUGGESTIONS = [
  "What are my spending habits?",
  "How much profit did I make?",
  "Where will my balance be in a year?",
  "I lost my debit card",
];

// What the model sees for a message. Result cards are replaced by a figure-free note, so the
// model knows the analysis was delivered (and doesn't re-run it) without seeing any numbers.
const RESULT_NOTES = {
  spending_habits: (r) => `a spending-habits card for ${r.period}`,
  profits: (r) => `a profit card for ${r.period} covering ${r.accounts.length > 1 ? `${r.accounts.length} accounts` : "1 account"}`,
  future_projection: (r) => `a ${r.months_ahead}-month balance projection card`,
  account_picker: (r) => (r.done ? "an account selector, which the customer has already used" : "an account selector for the profit calculation"),
};

function forModel({ role, content, results }) {
  const notes = (results ?? []).map((r) => RESULT_NOTES[r.kind]?.(r)).filter(Boolean);
  return { role, content: notes.length ? `${content}\n[The app displayed: ${notes.join("; ")}. Figures are visible to the customer only.]` : content };
}

// Follow-up chips under the latest result, so the conversation can keep going.
const FOLLOW_UPS = {
  spending_habits: ["Compare with last month", "Tips to cut my spending", "How much profit did I make?", "Where will my balance be in a year?"],
  profits: ["Profit for a different account", "What are my spending habits?", "Where will my balance be in a year?", "How can I save more?"],
  future_projection: ["Project 2 years ahead", "How can I grow my savings faster?", "What are my spending habits?", "How much profit did I make?"],
};

function loadSession() {
  try {
    return JSON.parse(sessionStorage.getItem(STORAGE_KEY)) ?? [];
  } catch {
    return [];
  }
}

// Support chat docked on the right. The conversation lives in sessionStorage (survives
// page navigation and reloads, cleared on logout / tab close) and the whole history is
// sent to the backend each turn, which relays it to Gemini.
// Suggestion the server may offer when it can't help; opens the ticket form instead of chatting.
const TICKET_SUGGESTION = "Create a support ticket";

function ChatWidget({ user, open, onOpenChange }) {
  const navigate = useNavigate();
  const [messages, setMessages] = useState(loadSession);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const listRef = useRef(null);

  useEffect(() => {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(messages));
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, sending, open]);

  async function send(text) {
    const content = text.trim();
    if (!content || sending) return;
    const next = [...messages, { role: "user", content }];
    setMessages(next);
    setDraft("");
    setError("");
    setSending(true);
    try {
      // Only the text goes back to the server; analytics results stay in this browser.
      const history = next.slice(-20).map(forModel);
      const { reply, results, suggestions } = await api("/support/chat", { method: "POST", body: { messages: history } });
      setMessages((m) => [...m, { role: "assistant", content: reply, results, suggestions }]);
    } catch (e) {
      setError(e.message);
    } finally {
      setSending(false);
    }
  }

  // Second step of the profit flow: the user picked accounts in the chat card. Computed by
  // our backend directly; nothing goes to the language model.
  async function runPicker(msgIndex, picker, accountIds) {
    setMessages((ms) =>
      ms.map((m, j) =>
        j === msgIndex
          ? { ...m, results: m.results.map((r) => (r === picker ? { ...r, done: true, chosen: accountIds } : r)) }
          : m
      )
    );
    setError("");
    setSending(true);
    try {
      const result = await api(`/support/analytics/${picker.tool}`, {
        method: "POST",
        body: { account_ids: accountIds, ...picker.args },
      });
      setMessages((ms) => [
        ...ms,
        { role: "assistant", content: "Here's your profit (income minus expenses) for the accounts you picked:", results: [result] },
      ]);
    } catch (e) {
      setError(e.message);
    } finally {
      setSending(false);
    }
  }

  function reset() {
    setMessages([]);
    setError("");
  }

  const last = messages[messages.length - 1];
  const followUps =
    last?.role === "assistant"
      ? (last.suggestions?.length ? last.suggestions : FOLLOW_UPS[last.results?.at(-1)?.kind]) ?? []
      : [];

  if (!open) {
    return (
      <button className="chat-launcher" onClick={() => onOpenChange(true)} aria-label="Open support chat">
        <span>💬</span> Chat with us
      </button>
    );
  }

  return (
    <aside className="chat-panel" aria-label="Support chat">
      <header className="chat-head">
        <div className="chat-agent">
          <div className="chat-avatar">A</div>
          <div>
            <strong>Aurea · Support</strong>
            <span><i className="online-dot" /> Virtual assistant</span>
          </div>
        </div>
        <div className="chat-head-actions">
          <button onClick={reset} title="New conversation">↺</button>
          <button onClick={() => onOpenChange(false)} title="Close">✕</button>
        </div>
      </header>

      <div className="chat-list" ref={listRef}>
        <div className="chat-msg assistant">
          Hi {user.full_name.split(" ")[0]}! I'm Aurea, your Aureus assistant. I can analyse your spending habits, profits and future balance, or help with your account.
        </div>
        {messages.length === 0 && (
          <div className="chat-suggestions">
            {SUGGESTIONS.map((s) => (
              <button key={s} onClick={() => send(s)}>{s}</button>
            ))}
          </div>
        )}
        {messages.map((m, i) => (
          <Fragment key={i}>
            <div className={`chat-msg ${m.role}`}>{m.content}</div>
            {m.results?.length > 0 && (
              <ChatResults results={m.results} onPick={(picker, ids) => runPicker(i, picker, ids)} />
            )}
          </Fragment>
        ))}
        {!sending && followUps.length > 0 && (
          <div className="chat-suggestions">
            {followUps.map((s) => (
              <button key={s} onClick={() => (s === TICKET_SUGGESTION ? navigate("/support#ticket") : send(s))}>{s}</button>
            ))}
          </div>
        )}
        {sending && <div className="chat-msg assistant typing"><i /><i /><i /></div>}
        {error && (
          <div className="chat-error">
            {error} <Link to="/support#ticket">Create a ticket →</Link>
          </div>
        )}
      </div>

      <form
        className="chat-input"
        onSubmit={(e) => {
          e.preventDefault();
          send(draft);
        }}
      >
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Type your message…"
          maxLength={2000}
          disabled={sending}
        />
        <button type="submit" disabled={sending || !draft.trim()}>Send</button>
      </form>
      <p className="chat-foot">
        AI assistant — never share passwords or full card numbers. <Link to="/support#ticket">Need a human?</Link>
      </p>
    </aside>
  );
}

export default ChatWidget;
