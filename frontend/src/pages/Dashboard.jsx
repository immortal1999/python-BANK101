import { useEffect, useState } from "react";
import { useNavigate, useOutletContext } from "react-router-dom";
import {
  ArrowRight, Bot, ChevronRight, CircleHelp, FileText, Landmark, PiggyBank, Sparkles,
  TrendingDown, TrendingUp, WalletCards,
} from "lucide-react";
import { api, usd, fmtDate, fmtMonth, capitalize, INCOME_TYPES } from "../lib/api";

const ACCOUNT_STYLE = {
  checking: { name: "Everyday Checking", icon: Landmark, tone: "blue", subtitle: "Available balance" },
  savings: { name: "High-Yield Savings", icon: PiggyBank, tone: "green", subtitle: "4.20% APY" },
};

const QUICK_ACTIONS = [
  { label: "View Accounts", detail: "Balances, account and routing numbers", icon: Landmark, tone: "gold", to: "/accounts" },
  { label: "Manage Cards", detail: "Freeze, unfreeze and see card details", icon: WalletCards, tone: "blue", to: "/cards" },
  { label: "View Statements", detail: "Monthly statements and CSV downloads", icon: FileText, tone: "slate", to: "/statements" },
  { label: "Get Support", detail: "Open a ticket or contact a specialist", icon: CircleHelp, tone: "violet", to: "/support#ticket" },
];

function greeting(now) {
  const h = now.getHours();
  return h < 12 ? "Good morning" : h < 18 ? "Good afternoon" : "Good evening";
}

function Dashboard() {
  const navigate = useNavigate();
  const { user, accounts, openChat } = useOutletContext();
  const [summary, setSummary] = useState(null);
  const [txns, setTxns] = useState(null);
  const [thisMonth, setThisMonth] = useState(null);

  useEffect(() => {
    // Totals, statements and transactions all come from the same backend rows (exact
    // Decimal), so the balances, the insight and the activity list always agree.
    api("/accounts/summary").then(setSummary).catch(() => {});
    api("/accounts/transactions?limit=5").then(setTxns).catch(() => setTxns([]));
    api("/accounts/statements?months=1").then((r) => setThisMonth(r.months[0] ?? null)).catch(() => {});
  }, []);

  const now = new Date();
  const savings = accounts.find((a) => a.account_type === "savings");

  return (
    <>
      <section className="welcome dashboard-section">
        <div>
          <span className="eyebrow">Welcome back</span>
          <h1>{greeting(now)}, {user.full_name.split(" ")[0]}</h1>
          <p>Here’s a quick view of your accounts and recent activity.</p>
        </div>
        <span className="date-label">
          {now.toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric", year: "numeric" })}
        </span>
      </section>

      <section className="panel dashboard-section">
        <div className="section-heading-row">
          <div>
            <h2>Your Accounts</h2>
            {summary && <p>Total balance {usd(summary.total_assets)}</p>}
          </div>
          <button className="text-link" onClick={() => navigate("/accounts")}>
            View All Accounts <ArrowRight size={17} />
          </button>
        </div>
        {accounts.length === 0 ? (
          <div className="empty-state"><p>No accounts yet</p></div>
        ) : (
          <div className="account-grid">
            {accounts.map((a) => <AccountCard key={a.id} account={a} onOpen={() => navigate(`/accounts/${a.id}`)} />)}
          </div>
        )}
      </section>

      <section className="dashboard-grid dashboard-section">
        <div className="panel">
          <div className="section-heading-row">
            <div>
              <h2>Quick Actions</h2>
              <p>Manage accounts, cards and statements.</p>
            </div>
          </div>
          <div className="quick-grid">
            {QUICK_ACTIONS.map(({ label, detail, icon: Icon, tone, to }) => (
              <button key={label} className={`quick-action ${tone}`} onClick={() => navigate(to)}>
                <div className="quick-action-icon"><Icon size={24} /></div>
                <div className="quick-action-copy">
                  <strong>{label}</strong>
                  <span>{detail}</span>
                </div>
                <ArrowRight className="quick-arrow" size={19} />
              </button>
            ))}
          </div>
        </div>

        <aside className="goal-card">
          <div className="goal-illustration"><Sparkles size={30} /></div>
          <span className="eyebrow">Aureus Savings</span>
          <h2>Reach your goals with confidence.</h2>
          <p>
            {savings
              ? `Your High-Yield Savings earns 4.20% APY on ${usd(savings.balance)}.`
              : "Earn 4.20% APY with High-Yield Savings."}
          </p>
          <button onClick={() => navigate(savings ? `/accounts/${savings.id}` : "/support")}>
            {savings ? "View Savings" : "Ask about Savings"} <ArrowRight size={18} />
          </button>
        </aside>
      </section>

      <section className="dashboard-grid dashboard-section">
        <div className="panel activity-panel">
          <div className="section-heading-row">
            <div>
              <h2>Recent Activity</h2>
              <p>Your latest transactions across all accounts.</p>
            </div>
            <button className="text-link" onClick={() => navigate("/statements")}>
              View All <ArrowRight size={17} />
            </button>
          </div>
          {txns === null ? (
            <p className="muted-label">Loading…</p>
          ) : txns.length === 0 ? (
            <div className="empty-state">
              <p>No transactions yet</p>
              <span>Your recent activity will show up here.</span>
            </div>
          ) : (
            <div className="activity-list">
              {txns.map((t) => {
                const income = INCOME_TYPES.includes(t.transaction_type);
                return (
                  <button key={t.id} className="activity-row" onClick={() => navigate(`/accounts/${t.account_id}`)}>
                    <div className="merchant-icon">{(t.description || "?").charAt(0).toUpperCase()}</div>
                    <div className="activity-copy">
                      <strong>{t.description}</strong>
                      <span>
                        {fmtDate(t.created_at)} · {capitalize(t.transaction_type.replace("_", " "))} · {capitalize(t.account_type)} •••• {t.account_number.slice(-4)}
                      </span>
                    </div>
                    <strong className={`activity-amount ${income ? "positive" : ""}`}>
                      {income ? "+" : "-"}{usd(t.amount)}
                    </strong>
                    <ChevronRight size={19} />
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <div className="side-stack">
          <Insight month={thisMonth} />
          <div className="panel assistant-card">
            <div className="mini-title"><Bot size={19} /> AI Assistant</div>
            <p>Have a question about your spending, a transaction, or your savings outlook?</p>
            <button onClick={openChat}>Ask Aureus Assistant <ArrowRight size={18} /></button>
          </div>
        </div>
      </section>
    </>
  );
}

function AccountCard({ account, onOpen }) {
  const s = ACCOUNT_STYLE[account.account_type] ?? {
    name: capitalize(account.account_type), icon: Landmark, tone: "gold", subtitle: "Available balance",
  };
  const Icon = s.icon;
  return (
    <button className={`account-card ${s.tone}`} onClick={onOpen}>
      <div className="account-card-top">
        <div className="account-title-group">
          <span className="account-icon"><Icon size={24} /></span>
          <div>
            <h3>{s.name}</h3>
            <p>•••• {account.account_number.slice(-4)}</p>
          </div>
        </div>
        <ChevronRight size={22} />
      </div>
      <strong>{usd(account.balance)}</strong>
      <span className="account-subtitle">{s.subtitle}</span>
    </button>
  );
}

// This month's income vs spending, from the current (in-progress) statement.
function Insight({ month }) {
  if (!month) {
    return (
      <div className="panel insight-card">
        <div className="mini-title"><Sparkles size={18} /> Financial Insight</div>
        <p className="muted-label">Insights appear once you have activity this month.</p>
      </div>
    );
  }
  const income = Number(month.total_credits);
  const spent = Number(month.total_debits);
  const ahead = income >= spent;
  const pct = income > 0 ? Math.min(100, Math.round((spent / income) * 100)) : 100;
  return (
    <div className="panel insight-card">
      <div className="mini-title"><Sparkles size={18} /> Financial Insight · {fmtMonth(month.month, { month: "long" })}</div>
      <div className="insight-content">
        <div className={`insight-icon ${ahead ? "" : "warn"}`}>{ahead ? <TrendingUp size={26} /> : <TrendingDown size={26} />}</div>
        <div>
          <strong className={ahead ? "" : "warn"}>
            {ahead ? `You're ${usd(income - spent)} ahead this month` : `Spending is ${usd(spent - income)} above income`}
          </strong>
          <p>{usd(spent)} spent of {usd(income)} received so far.</p>
        </div>
      </div>
      <div className="progress-track" title={`${pct}% of income spent`}>
        <div className={`progress-fill ${ahead ? "" : "warn"}`} style={{ width: `${pct}%` }} />
      </div>
      <small className="progress-label">{pct}% of this month’s income spent</small>
    </div>
  );
}

export function TransactionTable({ txns, showAccount = true }) {
  return (
    <table>
      <thead>
        <tr>
          <th>Date</th>
          <th>Description</th>
          {showAccount && <th>Account</th>}
          <th>Amount</th>
          <th>Status</th>
        </tr>
      </thead>
      <tbody>
        {txns.map((tx) => {
          const income = INCOME_TYPES.includes(tx.transaction_type);
          return (
            <tr key={tx.id}>
              <td>{fmtDate(tx.created_at)}</td>
              <td>
                {tx.description}
                <span>{capitalize(tx.transaction_type.replace("_", " "))}</span>
              </td>
              {showAccount && (
                <td>
                  {capitalize(tx.account_type)}
                  <span>•••• {tx.account_number.slice(-4)}</span>
                </td>
              )}
              <td className={income ? "positive" : "negative"}>
                {income ? "+" : "-"}
                {usd(tx.amount)}
              </td>
              <td><span className="status-pill">{tx.status}</span></td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

export default Dashboard;
