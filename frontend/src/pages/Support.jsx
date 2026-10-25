import { useEffect, useRef, useState } from "react";
import { useLocation, useOutletContext } from "react-router-dom";
import { api, fmtDate, capitalize } from "../lib/api";

const CATEGORIES = ["account", "card", "transaction", "statement", "technical", "other"];
const EMPTY_FORM = { subject: "", category: "account", priority: "normal", message: "" };

function Support() {
  const { openChat } = useOutletContext();
  const { hash } = useLocation();
  const ticketRef = useRef(null);
  const [contacts, setContacts] = useState(null);
  const [tickets, setTickets] = useState([]);
  const [form, setForm] = useState(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [notice, setNotice] = useState(null); // { type: "ok" | "error", text }

  useEffect(() => {
    api("/support/contacts").then(setContacts).catch(() => {});
    api("/support/tickets").then(setTickets).catch(() => {});
  }, []);

  useEffect(() => {
    if (hash === "#ticket") ticketRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [hash]);

  const update = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  async function submit(e) {
    e.preventDefault();
    setSubmitting(true);
    setNotice(null);
    try {
      const ticket = await api("/support/tickets", { method: "POST", body: form });
      setTickets((t) => [ticket, ...t]);
      setForm(EMPTY_FORM);
      setNotice({ type: "ok", text: `Ticket #${ticket.id} created. We'll email you within 1 business day.` });
    } catch (err) {
      setNotice({ type: "error", text: err.message });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <section className="hero-panel panel support-hero">
        <div className="hero-copy">
          <span className="premium-badge">☎ 24/7 Client Care</span>
          <h3>How can we help?</h3>
          <p>Chat with our assistant, reach a specialist directly, or open a ticket and we’ll follow up.</p>
        </div>
        <div className="support-hero-actions">
          <button onClick={openChat}>💬 Start live chat</button>
          <button onClick={() => ticketRef.current?.scrollIntoView({ behavior: "smooth" })}>✎ Create a ticket</button>
        </div>
      </section>

      <section className="contact-grid">
        <div className="panel contact-panel">
          <div className="panel-header">
            <h3>Email</h3>
            <span>{contacts?.hours.split("·")[1]?.trim()}</span>
          </div>
          {contacts?.email.map((c) => (
            <a key={c.value} className="contact-row" href={`mailto:${c.value}`}>
              <span className="kpi-icon blue">✉</span>
              <div>
                <small>{c.label}</small>
                <strong>{c.value}</strong>
              </div>
            </a>
          ))}
        </div>
        <div className="panel contact-panel">
          <div className="panel-header">
            <h3>Phone</h3>
            <span>{contacts?.hours.split("·")[0]?.trim()}</span>
          </div>
          {contacts?.phone.map((c) => (
            <a key={c.value} className="contact-row" href={`tel:${c.value.replace(/[^\d+]/g, "")}`}>
              <span className="kpi-icon green">☎</span>
              <div>
                <small>{c.label}</small>
                <strong>{c.value}</strong>
              </div>
            </a>
          ))}
        </div>
      </section>

      <section className="support-grid">
        <form id="ticket" ref={ticketRef} className="panel ticket-form" onSubmit={submit}>
          <div className="panel-header">
            <h3>Create a Support Ticket</h3>
          </div>

          <label>
            Subject
            <input name="subject" value={form.subject} onChange={update} required minLength={3} maxLength={150} placeholder="e.g. Card declined at checkout" />
          </label>
          <div className="form-row-2">
            <label>
              Category
              <select name="category" value={form.category} onChange={update}>
                {CATEGORIES.map((c) => <option key={c} value={c}>{capitalize(c)}</option>)}
              </select>
            </label>
            <label>
              Priority
              <select name="priority" value={form.priority} onChange={update}>
                <option value="low">Low</option>
                <option value="normal">Normal</option>
                <option value="high">High</option>
              </select>
            </label>
          </div>
          <label>
            Message
            <textarea name="message" value={form.message} onChange={update} required minLength={10} maxLength={4000} rows={6} placeholder="Describe the issue. Please don't include passwords or full card numbers." />
          </label>

          {notice && <div className={`form-notice ${notice.type}`}>{notice.text}</div>}
          <button type="submit" className="primary-btn" disabled={submitting}>
            {submitting ? "Submitting…" : "Submit ticket"}
          </button>
        </form>

        <div className="panel ticket-list">
          <div className="panel-header">
            <h3>Your Tickets</h3>
            <span>{tickets.length} total</span>
          </div>
          {tickets.length === 0 ? (
            <div className="empty-state"><p>No tickets yet</p><span>Tickets you create will show up here.</span></div>
          ) : (
            tickets.map((t) => (
              <div key={t.id} className="ticket-item">
                <div>
                  <strong>#{t.id} · {t.subject}</strong>
                  <span>{capitalize(t.category)} · {capitalize(t.priority)} priority · {fmtDate(t.created_at)}</span>
                </div>
                <span className={`status-pill ${t.status}`}>{t.status.replace("_", " ")}</span>
              </div>
            ))
          )}
        </div>
      </section>
    </>
  );
}

export default Support;
