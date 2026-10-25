import { Fragment, useEffect, useState } from "react";
import { useOutletContext, useSearchParams } from "react-router-dom";
import { api, usd, fmtMonth, capitalize, INCOME_TYPES } from "../lib/api";
import { TransactionTable } from "./Dashboard";

function downloadCsv(filename, rows) {
  const csv = rows
    .map((r) => r.map((v) => `"${String(v ?? "").replace(/"/g, '""')}"`).join(","))
    .join("\n");
  const url = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function Statements() {
  const { accounts } = useOutletContext();
  const [params, setParams] = useSearchParams();
  const accountId = params.get("account") ?? "";
  // keyed so the loaded months / expanded rows reset when switching accounts
  return <StatementsView key={accountId} accounts={accounts} accountId={accountId} setParams={setParams} />;
}

function StatementsView({ accounts, accountId, setParams }) {
  const [months, setMonths] = useState(null);
  const [openMonth, setOpenMonth] = useState(null);
  const [monthTxns, setMonthTxns] = useState({});

  const accountQuery = accountId ? `account_id=${accountId}&` : "";
  const account = accounts.find((a) => String(a.id) === accountId);

  useEffect(() => {
    api(`/accounts/statements?${accountQuery}months=12`)
      .then((r) => setMonths(r.months))
      .catch(() => setMonths([]));
  }, [accountQuery]);

  async function loadMonth(month) {
    if (monthTxns[month]) return monthTxns[month];
    const txns = await api(`/accounts/transactions?${accountQuery}month=${month}&limit=500`);
    setMonthTxns((m) => ({ ...m, [month]: txns }));
    return txns;
  }

  function toggle(month) {
    setOpenMonth((m) => (m === month ? null : month));
    loadMonth(month).catch(() => {});
  }

  async function download(st) {
    const txns = await loadMonth(st.month);
    const label = account ? `${capitalize(account.account_type)} ••••${account.account_number.slice(-4)}` : "All accounts";
    const rows = [
      ["Aureus Banking statement", fmtMonth(st.month, { month: "long", year: "numeric" }), label],
      ["Opening balance", st.opening_balance],
      ["Total credits", st.total_credits],
      ["Total debits", st.total_debits],
      ["Closing balance", st.closing_balance],
      [],
      ["Date", "Description", "Type", "Account", "Amount"],
      ...[...txns].reverse().map((t) => [
        t.created_at.slice(0, 10),
        t.description,
        t.transaction_type,
        `${t.account_type} ••••${t.account_number.slice(-4)}`,
        (INCOME_TYPES.includes(t.transaction_type) ? "" : "-") + t.amount,
      ]),
    ];
    downloadCsv(`aureus-statement-${st.month}${account ? "-" + account.account_type : ""}.csv`, rows);
  }

  const current = months?.[0];

  return (
    <>
      <section className="statement-toolbar">
        <div className="segmented">
          <button className={!accountId ? "active" : ""} onClick={() => setParams({})}>All accounts</button>
          {accounts.map((a) => (
            <button
              key={a.id}
              className={String(a.id) === accountId ? "active" : ""}
              onClick={() => setParams({ account: String(a.id) })}
            >
              {capitalize(a.account_type)} •••• {a.account_number.slice(-4)}
            </button>
          ))}
        </div>
        {current && (
          <div className="statement-current">
            <span>Current balance</span>
            <strong>{usd(current.closing_balance)}</strong>
          </div>
        )}
      </section>

      <section className="panel transactions-panel">
        <div className="panel-header">
          <h3>Monthly Statements</h3>
          <span>Last 12 months · newest first</span>
        </div>

        {months === null ? (
          <p className="muted-label">Loading…</p>
        ) : (
          <table className="statement-table">
            <thead>
              <tr>
                <th>Period</th>
                <th>Opening</th>
                <th>Money in</th>
                <th>Money out</th>
                <th>Closing</th>
                <th>Txns</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {months.map((st, i) => (
                <Fragment key={st.month}>
                  <tr className={`statement-row ${openMonth === st.month ? "open" : ""}`} onClick={() => toggle(st.month)}>
                    <td>
                      <b>{fmtMonth(st.month, { month: "long", year: "numeric" })}</b>
                      <span>{i === 0 ? "In progress · matches current balance" : "Closed"}</span>
                    </td>
                    <td>{usd(st.opening_balance)}</td>
                    <td className="positive">+{usd(st.total_credits)}</td>
                    <td className="negative">-{usd(st.total_debits)}</td>
                    <td><b>{usd(st.closing_balance)}</b></td>
                    <td>{st.transaction_count}</td>
                    <td className="row-actions">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          download(st).catch(() => {});
                        }}
                      >
                        ⬇ CSV
                      </button>
                      <span className="chevron">{openMonth === st.month ? "▴" : "▾"}</span>
                    </td>
                  </tr>
                  {openMonth === st.month && (
                    <tr className="statement-detail">
                      <td colSpan={7}>
                        {!monthTxns[st.month] ? (
                          <p className="muted-label">Loading transactions…</p>
                        ) : monthTxns[st.month].length === 0 ? (
                          <p className="muted-label">No transactions this month.</p>
                        ) : (
                          <TransactionTable txns={monthTxns[st.month]} showAccount={!accountId} />
                        )}
                      </td>
                    </tr>
                  )}
                </Fragment>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </>
  );
}

export default Statements;
