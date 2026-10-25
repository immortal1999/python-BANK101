import { useEffect, useState } from "react";
import { Link, Navigate, useNavigate, useOutletContext, useParams } from "react-router-dom";
import { api, usd, fmtDate, fmtMonth, capitalize } from "../lib/api";
import { TransactionTable } from "./Dashboard";

const ACCOUNT_META = {
  checking: { name: "Everyday Checking", icon: "◆", tone: "blue" },
  savings: { name: "High-Yield Savings", icon: "◈", tone: "teal", apy: "4.20% APY" },
};

function Accounts() {
  const navigate = useNavigate();
  const { accountId } = useParams();
  const { accounts } = useOutletContext();

  const selected = accounts.find((a) => String(a.id) === accountId);

  // /accounts (or an unknown id) -> first account
  if (!selected) {
    return accounts.length ? <Navigate to={`/accounts/${accounts[0].id}`} replace /> : (
      <div className="panel empty-state">
        <p>No accounts yet</p>
      </div>
    );
  }

  return (
    <>
      <section className="account-tiles">
        {accounts.map((a) => {
          const m = ACCOUNT_META[a.account_type] ?? { name: capitalize(a.account_type), icon: "◆", tone: "purple" };
          return (
            <button
              key={a.id}
              className={`account-tile panel ${a.id === selected.id ? "selected" : ""}`}
              onClick={() => navigate(`/accounts/${a.id}`)}
            >
              <span className={`kpi-icon ${m.tone}`}>{m.icon}</span>
              <div className="account-tile-body">
                <p>{m.name}</p>
                <span>•••• {a.account_number.slice(-4)}</span>
              </div>
              <h3>{usd(a.balance)}</h3>
            </button>
          );
        })}
      </section>

      {/* keyed so per-account state (activity, reveal toggle) resets when switching */}
      <AccountDetail key={selected.id} account={selected} />
    </>
  );
}

function AccountDetail({ account }) {
  const [txns, setTxns] = useState(null);
  const [statements, setStatements] = useState([]);
  const [revealed, setRevealed] = useState(false);

  useEffect(() => {
    api(`/accounts/transactions?account_id=${account.id}&limit=25`).then(setTxns).catch(() => setTxns([]));
    api(`/accounts/statements?account_id=${account.id}&months=3`).then((r) => setStatements(r.months)).catch(() => {});
  }, [account.id]);

  const meta = ACCOUNT_META[account.account_type] ?? { name: capitalize(account.account_type), icon: "◆", tone: "purple" };
  const [current, previous] = statements;

  return (
    <>
      <section className="account-detail-grid">
        <div className="panel account-detail">
          <div className="panel-header">
            <h3>{meta.name}</h3>
            <span className="status-pill">{account.status}</span>
          </div>
          <p className="muted-label">Available balance</p>
          <div className="big-balance">{usd(account.balance)}</div>
          {meta.apy && <p className="apy">{meta.apy}</p>}

          <dl className="detail-list">
            <div>
              <dt>Account number</dt>
              <dd>
                {revealed ? account.account_number : `•••• •••• ${account.account_number.slice(-4)}`}
                <button className="link-btn" onClick={() => setRevealed((v) => !v)}>{revealed ? "Hide" : "Show"}</button>
              </dd>
            </div>
            <div>
              <dt>Routing number</dt>
              <dd>121000358</dd>
            </div>
            <div>
              <dt>Account type</dt>
              <dd>{capitalize(account.account_type)}</dd>
            </div>
            <div>
              <dt>Opened</dt>
              <dd>{fmtDate(account.created_at)}</dd>
            </div>
          </dl>
        </div>

        <div className="panel account-detail">
          <div className="panel-header">
            <h3>This Month</h3>
            <Link className="panel-link" to={`/statements?account=${account.id}`}>All statements →</Link>
          </div>
          {current ? (
            <dl className="detail-list">
              <div>
                <dt>Opening balance · {fmtMonth(current.month, { month: "short" })} 1</dt>
                <dd>{usd(current.opening_balance)}</dd>
              </div>
              <div>
                <dt>Money in</dt>
                <dd className="positive">+{usd(current.total_credits)}</dd>
              </div>
              <div>
                <dt>Money out</dt>
                <dd className="negative">-{usd(current.total_debits)}</dd>
              </div>
              <div>
                <dt>Current balance</dt>
                <dd><b>{usd(current.closing_balance)}</b></dd>
              </div>
              {previous && (
                <div>
                  <dt>Last statement ({fmtMonth(previous.month)})</dt>
                  <dd>{usd(previous.closing_balance)}</dd>
                </div>
              )}
            </dl>
          ) : (
            <p className="muted-label">Loading…</p>
          )}
        </div>
      </section>

      <section className="panel transactions-panel">
        <div className="panel-header">
          <h3>Recent Activity</h3>
          <span>Last 25 transactions</span>
        </div>
        {txns === null ? (
          <p className="muted-label">Loading…</p>
        ) : txns.length === 0 ? (
          <div className="empty-state"><p>No transactions yet</p></div>
        ) : (
          <TransactionTable txns={txns} showAccount={false} />
        )}
      </section>
    </>
  );
}

export default Accounts;
