import { useState } from "react";
import { Link } from "react-router-dom";
import { usd } from "../lib/api";

// Renders analytics results computed by the backend (app/core/analytics.py). These numbers
// come straight from our API and are never seen by the language model.

const pct = (v) => `${v > 0 ? "+" : ""}${v}%`;
const signed = (v) => `${Number(v) >= 0 ? "+" : "-"}${usd(Math.abs(Number(v)))}`;
const compact = (v) =>
  Number(v).toLocaleString("en-US", { style: "currency", currency: "USD", notation: "compact", maximumFractionDigits: 1 });

function SpendingHabits({ r }) {
  const max = Math.max(1, ...r.categories.map((c) => Number(c.amount)));
  return (
    <>
      <div className="cr-hero">
        <span>Spent · {r.period}{r.partial ? " (so far)" : ""}</span>
        <strong>{usd(r.total)}</strong>
        <small>
          {r.months > 1 && <>{usd(r.monthly_average)}/mo avg · </>}
          {r.change_pct === null ? "no prior period" : (
            <span className={r.change_pct > 0 ? "cr-up" : "cr-down"}>
              {r.change_pct > 0 ? "▲" : "▼"} {pct(r.change_pct)} vs previous {r.months > 1 ? `${r.months} months` : "month"}
            </span>
          )}
        </small>
      </div>

      <div className="cr-section">By category</div>
      <ul className="cr-hbars">
        {r.categories.map((c) => (
          <li key={c.key} title={`${c.label}: ${usd(c.amount)} (${c.share}%)`}>
            <div className="cr-hbar-label">
              <span>{c.label}</span>
              <span>{usd(c.amount)} <em>{c.share}%</em></span>
            </div>
            <div className="cr-hbar-track">
              <i style={{ width: `${(Number(c.amount) / max) * 100}%` }} />
            </div>
          </li>
        ))}
      </ul>

      <div className="cr-section">Top merchants</div>
      <ol className="cr-list">
        {r.top_merchants.map((m) => (
          <li key={m.name}>
            <span>{m.name}<em> · {m.count}×</em></span>
            <span>{usd(m.amount)}</span>
          </li>
        ))}
      </ol>
      {r.largest && (
        <p className="cr-note">
          Largest single expense: <b>{r.largest.description}</b>, {usd(r.largest.amount)} on {r.largest.date}.
        </p>
      )}
    </>
  );
}

function AccountPicker({ r, onPick }) {
  const [chosen, setChosen] = useState(() => new Set(r.accounts.filter((a) => a.selected).map((a) => a.id)));
  const done = Boolean(r.done);
  const all = chosen.size === r.accounts.length;

  const toggle = (id) =>
    setChosen((s) => {
      const next = new Set(s);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  if (done) {
    const labels = r.accounts.filter((a) => r.chosen.includes(a.id)).map((a) => a.label);
    return <p className="cr-note">Calculated for: <b>{labels.join(", ")}</b></p>;
  }

  return (
    <div className="cr-picker">
      <label className="cr-check all">
        <input
          type="checkbox"
          checked={all}
          onChange={() => setChosen(all ? new Set() : new Set(r.accounts.map((a) => a.id)))}
        />
        All accounts
      </label>
      {r.accounts.map((a) => (
        <label key={a.id} className="cr-check">
          <input type="checkbox" checked={chosen.has(a.id)} onChange={() => toggle(a.id)} />
          {a.label}
        </label>
      ))}
      <button disabled={chosen.size === 0} onClick={() => onPick(r, [...chosen])}>
        Calculate {chosen.size > 0 && `(${chosen.size} ${chosen.size === 1 ? "account" : "accounts"})`}
      </button>
    </div>
  );
}

function Profits({ r }) {
  const [hover, setHover] = useState(null);
  const nets = r.months.map((m) => Number(m.net));
  const top = Math.max(0, ...nets);
  const bottom = Math.min(0, ...nets);
  const span = top - bottom || 1;
  const zero = (top / span) * 100; // baseline position from the top, in %
  const active = hover !== null ? r.months[hover] : null;

  return (
    <>
      <div className="cr-hero">
        <span>Net profit · {r.period}</span>
        <span className="cr-scope">{r.scope}</span>
        <strong className={Number(r.net) >= 0 ? "cr-gain-text" : "cr-loss-text"}>{signed(r.net)}</strong>
        <small>
          {r.savings_rate !== null && <>You kept <b>{r.savings_rate}%</b> of your income · </>}best month {r.best_month}
        </small>
      </div>

      <div className="cr-stats">
        <div><span>Income</span><b>{usd(r.income)}</b></div>
        <div><span>Expenses</span><b>{usd(r.expenses)}</b></div>
        <div><span>Interest</span><b>{usd(r.interest)}</b></div>
      </div>

      {r.accounts.length > 1 && (
        <>
          <div className="cr-section">By account</div>
          <ul className="cr-list">
            {r.accounts.map((a) => (
              <li key={a.id} title={`Income ${usd(a.income)} · expenses ${usd(a.expenses)}`}>
                <span>{a.label}<em> · in {compact(a.income)} · out {compact(a.expenses)}</em></span>
                <span>{signed(a.net)}</span>
              </li>
            ))}
          </ul>
        </>
      )}
      {r.accounts.some((a) => Number(a.transfers) !== 0) && (
        <p className="cr-note">
          Transfers between your own accounts aren't counted as profit
          {r.accounts.filter((a) => Number(a.transfers) !== 0).map((a) => ` · ${a.label}: ${signed(a.transfers)}`).join("")}.
        </p>
      )}

      <div className="cr-section">Monthly net</div>
      <div className="cr-vbars" onMouseLeave={() => setHover(null)}>
        <div className="cr-baseline" style={{ top: `${zero}%` }} />
        {r.months.map((m, i) => {
          const v = Number(m.net);
          const h = (Math.abs(v) / span) * 100;
          return (
            <div key={m.month} className="cr-vbar-col" onMouseEnter={() => setHover(i)}>
              <i
                className={`${v >= 0 ? "gain" : "loss"} ${hover === i ? "active" : ""}`}
                style={v >= 0 ? { bottom: `${100 - zero}%`, height: `${h}%` } : { top: `${zero}%`, height: `${h}%` }}
              />
            </div>
          );
        })}
      </div>
      <div className="cr-axis">
        <span>{r.months[0].label}</span>
        <span>{r.months[r.months.length - 1].label}</span>
      </div>
      <div className="cr-readout">
        {active ? (
          <>
            <b>{active.label}</b> · net <b>{signed(active.net)}</b> · in {usd(active.income)} · out {usd(active.expenses)}
          </>
        ) : (
          "Hover a bar for that month's details"
        )}
      </div>

      <details className="cr-table">
        <summary>Show table</summary>
        <table>
          <thead><tr><th>Month</th><th>Income</th><th>Expenses</th><th>Net</th></tr></thead>
          <tbody>
            {r.months.map((m) => (
              <tr key={m.month}><td>{m.label}</td><td>{usd(m.income)}</td><td>{usd(m.expenses)}</td><td>{signed(m.net)}</td></tr>
            ))}
          </tbody>
        </table>
      </details>
    </>
  );
}

function Projection({ r }) {
  const [hover, setHover] = useState(null);
  const W = 320, H = 130, PAD_X = 6, PAD_Y = 10;
  // Index 0 = today, then one point per projected month.
  const pts = [
    { label: "Today", expected: r.start_balance, low: r.start_balance, high: r.start_balance },
    ...r.points,
  ];
  const lo = Math.min(...pts.map((p) => Number(p.low)));
  const hi = Math.max(...pts.map((p) => Number(p.high)));
  const x = (i) => PAD_X + (i / (pts.length - 1)) * (W - 2 * PAD_X);
  const y = (v) => PAD_Y + (1 - (Number(v) - lo) / (hi - lo || 1)) * (H - 2 * PAD_Y);
  const line = pts.map((p, i) => `${i ? "L" : "M"}${x(i)},${y(p.expected)}`).join(" ");
  const band =
    pts.map((p, i) => `${i ? "L" : "M"}${x(i)},${y(p.high)}`).join(" ") +
    " " + [...pts].reverse().map((p, j) => `L${x(pts.length - 1 - j)},${y(p.low)}`).join(" ") + " Z";
  const active = hover !== null ? pts[hover] : null;

  function onMove(e) {
    const rect = e.currentTarget.getBoundingClientRect();
    const rel = ((e.clientX - rect.left) / rect.width) * W;
    const i = Math.round(((rel - PAD_X) / (W - 2 * PAD_X)) * (pts.length - 1));
    setHover(Math.max(0, Math.min(pts.length - 1, i)));
  }

  const up = Number(r.change) >= 0;
  return (
    <>
      <div className="cr-hero">
        <span>Projected balance · {r.points[r.points.length - 1].label}</span>
        <strong>{usd(r.end_balance)}</strong>
        <small>
          <span className={up ? "cr-up" : "cr-down"}>{up ? "▲" : "▼"} {signed(r.change)}</span> from {usd(r.start_balance)} today
        </small>
      </div>

      <svg
        className="cr-line"
        viewBox={`0 0 ${W} ${H}`}
        onMouseMove={onMove}
        onMouseLeave={() => setHover(null)}
        role="img"
        aria-label={`Projected total balance from ${usd(r.start_balance)} today to ${usd(r.end_balance)} in ${r.months_ahead} months`}
      >
        <path d={band} className="cr-band" />
        <path d={line} className="cr-path" />
        <circle cx={x(0)} cy={y(pts[0].expected)} r="4" className="cr-dot" />
        {active && (
          <>
            <line x1={x(hover)} x2={x(hover)} y1={PAD_Y / 2} y2={H - PAD_Y / 2} className="cr-cross" />
            <circle cx={x(hover)} cy={y(active.expected)} r="4.5" className="cr-dot" />
          </>
        )}
      </svg>
      <div className="cr-axis">
        <span>Today · {compact(r.start_balance)}</span>
        <span>{r.points[r.points.length - 1].label} · {compact(r.end_balance)}</span>
      </div>
      <div className="cr-readout">
        {active ? (
          <>
            <b>{active.label}</b> · expected <b>{usd(active.expected)}</b>
            {hover > 0 && <> · range {compact(active.low)}–{compact(active.high)}</>}
          </>
        ) : (
          "Hover the chart to see each month"
        )}
      </div>
      <p className="cr-note">
        Based on your average net of <b>{signed(r.monthly_net_average)}/mo</b> ({r.basis}) plus savings
        interest. The shaded band shows the typical month-to-month swing. An estimate, not a guarantee.
      </p>

      <details className="cr-table">
        <summary>Show table</summary>
        <table>
          <thead><tr><th>Month</th><th>Expected</th><th>Low</th><th>High</th></tr></thead>
          <tbody>
            {r.points.map((p) => (
              <tr key={p.month}><td>{p.label}</td><td>{usd(p.expected)}</td><td>{usd(p.low)}</td><td>{usd(p.high)}</td></tr>
            ))}
          </tbody>
        </table>
      </details>
    </>
  );
}

const RENDERERS = {
  account_picker: AccountPicker,
  spending_habits: SpendingHabits,
  profits: Profits,
  future_projection: Projection,
};

function ChatResults({ results, onPick }) {
  return results.map((r, i) => {
    const Card = RENDERERS[r.kind];
    if (!Card) return null;
    return (
      <div key={i} className="chat-result">
        <div className="cr-head">
          <b>{r.title}</b>
          <Link to="/statements">Statements →</Link>
        </div>
        <Card r={r} onPick={onPick} />
      </div>
    );
  });
}

export default ChatResults;
