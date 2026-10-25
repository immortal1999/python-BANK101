import { useEffect, useState } from "react";
import { Link, useOutletContext } from "react-router-dom";
import { api, usd } from "../lib/api";
import BankCard from "../components/BankCard";
import { mockCardNumber, groupCardNumber } from "../lib/cardNumbers";

// Mock credit line (demo only; there's no credit product in the backend yet).
const CREDIT = { limit: "15000.00", balance: "1284.56", minimumDue: "35.00", apr: "21.99%" };

function readFrozen() {
  try {
    return JSON.parse(localStorage.getItem("frozen-cards")) ?? {};
  } catch {
    return {};
  }
}

function Cards() {
  const { user, accounts, openChat } = useOutletContext();
  const [revealed, setRevealed] = useState({});
  const [frozen, setFrozen] = useState(readFrozen);
  const [checkingMonth, setCheckingMonth] = useState(null);

  const checking = accounts.find((a) => a.account_type === "checking");

  useEffect(() => {
    localStorage.setItem("frozen-cards", JSON.stringify(frozen));
  }, [frozen]);

  useEffect(() => {
    if (!checking) return;
    api(`/accounts/statements?account_id=${checking.id}&months=1`)
      .then((r) => setCheckingMonth(r.months[0]))
      .catch(() => {});
  }, [checking]);

  // Cards are issued with the checking account and valid for 4 years.
  const opened = checking ? new Date(checking.created_at) : null;
  const expiry = opened
    ? `${String(opened.getMonth() + 1).padStart(2, "0")}/${String((opened.getFullYear() + 4) % 100).padStart(2, "0")}`
    : "—";
  const seed = checking?.account_number ?? String(user.id).padStart(10, "0");

  // Credit payment due on the 25th of the month after the current statement.
  const [y, m] = (checkingMonth?.month ?? "").split("-").map(Number);
  const due = checkingMonth ? new Date(y, m, 25) : null;

  const cards = [
    {
      id: "debit",
      variant: "debit",
      network: "visa",
      label: "Debit · Platinum",
      number: mockCardNumber("453201", seed),
      linked: checking ? `Checking •••• ${checking.account_number.slice(-4)}` : "—",
      stats: [
        ["Available", usd(checking?.balance)],
        ["Spent this month", checkingMonth ? usd(checkingMonth.total_debits) : "…"],
        ["Daily ATM limit", usd(1000)],
        ["Daily purchase limit", usd(5000)],
      ],
    },
    {
      id: "credit",
      variant: "credit",
      network: "mastercard",
      label: "Credit · World Elite",
      number: mockCardNumber("541275", seed.split("").reverse().join("")),
      linked: "Aureus Rewards Credit Line",
      stats: [
        ["Current balance", usd(CREDIT.balance)],
        ["Available credit", usd(Number(CREDIT.limit) - Number(CREDIT.balance))],
        ["Credit limit", usd(CREDIT.limit)],
        ["Minimum due", due ? `${usd(CREDIT.minimumDue)} · ${due.toLocaleDateString("en-US", { month: "short", day: "numeric" })}` : usd(CREDIT.minimumDue)],
        ["Purchase APR", CREDIT.apr],
      ],
    },
  ];

  return (
    <>
      <p className="page-note">Demo cards with mock numbers — not real payment cards.</p>
      <section className="cards-grid">
        {cards.map((c) => {
          const isRevealed = !!revealed[c.id];
          const isFrozen = !!frozen[c.id];
          const cvv = c.number.slice(6, 9);
          return (
            <div key={c.id} className="panel card-panel">
              <BankCard
                variant={c.variant}
                network={c.network}
                label={c.label}
                number={c.number}
                holder={user.full_name}
                expiry={expiry}
                revealed={isRevealed}
                frozen={isFrozen}
              />

              <div className="card-actions">
                <button onClick={() => setRevealed((r) => ({ ...r, [c.id]: !isRevealed }))}>
                  {isRevealed ? "Hide details" : "Show details"}
                </button>
                <button onClick={() => setFrozen((f) => ({ ...f, [c.id]: !isFrozen }))}>
                  {isFrozen ? "Unfreeze card" : "Freeze card"}
                </button>
                <button onClick={openChat}>Report lost</button>
              </div>

              <dl className="detail-list">
                <div>
                  <dt>Card number</dt>
                  <dd>{isRevealed ? groupCardNumber(c.number) : `•••• ${c.number.slice(-4)}`}</dd>
                </div>
                <div>
                  <dt>CVV</dt>
                  <dd>{isRevealed ? cvv : "•••"}</dd>
                </div>
                <div>
                  <dt>Linked to</dt>
                  <dd>{c.linked}</dd>
                </div>
                <div>
                  <dt>Status</dt>
                  <dd className={isFrozen ? "negative" : "positive"}>{isFrozen ? "Frozen" : "Active"}</dd>
                </div>
                {c.stats.map(([k, v]) => (
                  <div key={k}>
                    <dt>{k}</dt>
                    <dd>{v}</dd>
                  </div>
                ))}
              </dl>
            </div>
          );
        })}
      </section>
      <p className="page-note">
        Card lost or stolen? Call <b>+1 (800) 555-0199</b> any time, or <Link to="/support#ticket">open a ticket</Link>.
      </p>
    </>
  );
}

export default Cards;
