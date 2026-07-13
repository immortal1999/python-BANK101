import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import "./dashboard.css";

const transactions = [
  {
    date: "Jun 06, 2024",
    time: "09:41 AM",
    description: "Payment from Horizon Ltd.",
    account: "Operating Account •••• 6357",
    amount: "+$1,260,000.00",
    status: "Completed",
    type: "income",
  },
  {
    date: "Jun 05, 2024",
    time: "03:15 PM",
    description: "Invoice INV-2458",
    account: "Receivables Account •••• 8841",
    amount: "+$320,000.00",
    status: "Completed",
    type: "income",
  },
  {
    date: "Jun 05, 2024",
    time: "11:07 AM",
    description: "Wire Transfer to Global Traders",
    account: "Operating Account •••• 6357",
    amount: "-$750,000.00",
    status: "Completed",
    type: "expense",
  },
  {
    date: "Jun 04, 2024",
    time: "02:33 PM",
    description: "Interest Credit",
    account: "Savings Account •••• 7732",
    amount: "+$18,750.00",
    status: "Completed",
    type: "income",
  },
];

const navItems = [
  "Dashboard",
  "Accounts",
  "Cards",
  "Payments",
  "Statements",
  "Zelle",
  "Audit Logs",
  "Support",
  "Logout",
];

function Dashboard() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      navigate("/login");
      return;
    }

    async function fetchUser() {
      const response = await fetch("/api/v1/auth/me", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.ok) {
        setUser(await response.json());
      } else {
        localStorage.removeItem("token");
        navigate("/login");
      }
    }
    fetchUser();
  }, [navigate]);

  if (!user) {
    return <div style={{ padding: 40 }}>Loading…</div>;
  }

  return (
    <div className="aureus-app">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-mark">A</div>
          <div>
            <h1>Aureus</h1>
            <span>Banking</span>
          </div>
        </div>

        <nav className="nav-list">
          {navItems.map((item) => (
            <button
              key={item}
              className={`nav-item ${item === "Dashboard" ? "active" : ""}`}
            >
              <span className="nav-icon">✦</span>
              {item}
            </button>
          ))}
        </nav>

        <div className="private-card">
          <div className="private-gem">◆</div>
          <h3>Private Banking</h3>
          <p>Tailored solutions for your success.</p>
          <button>Contact Manager</button>
        </div>
      </aside>

      <main className="dashboard">
        <header className="topbar">
          <div>
            <p className="eyebrow">Executive Banking Portal</p>
            <h2>Dashboard</h2>
          </div>

          <div className="topbar-actions">
            <input placeholder="Search accounts, transactions, invoices..." />
            <button className="icon-btn">🔔</button>
            <div className="profile-chip">
              <div className="avatar">{user.full_name.split(" ").map(n => n[0]).join("").toUpperCase()}</div>
              <div>
                <strong>{user.full_name}</strong>
                <span>{user.role}</span>
              </div>
            </div>
          </div>
        </header>

        <section className="hero-panel panel">
          <div className="hero-copy">
            <span className="premium-badge">★ Premium Client</span>
            <h3>Welcome, {user.full_name.split(" ")[0]}.</h3>
            <p>Here’s what’s happening with Aureus Banking today.</p>
          </div>

          <div className="manager-card">
            <p>Relationship Manager</p>
            <h4>Sophia Reynolds</h4>
            <span>+1 (212) 555-8173</span>
            <div className="manager-actions">
              <button>✉</button>
              <button>☎</button>
            </div>
          </div>
        </section>

        <section className="kpi-grid">
          <div className="kpi-card panel">
            <span className="kpi-icon blue">◆</span>
            <p>Total Assets</p>
            <h3>$248.75M</h3>
            <small className="positive">▲ 8.62% vs last month</small>
          </div>
          <div className="kpi-card panel">
            <span className="kpi-icon green">◆</span>
            <p>Monthly Revenue</p>
            <h3>$7.42M</h3>
            <small className="positive">▲ 12.35% vs last month</small>
          </div>
          <div className="kpi-card panel">
            <span className="kpi-icon purple">◆</span>
            <p>Pending Invoices</p>
            <h3>23</h3>
            <small>$3.61M total value</small>
          </div>
          <div className="kpi-card panel">
            <span className="kpi-icon teal">◆</span>
            <p>Sync Status</p>
            <h3>Synced</h3>
            <small className="positive">Last sync: 2 min ago</small>
          </div>
        </section>

        <section className="analytics-grid">
          <div className="panel cashflow-panel">
            <div className="panel-header">
              <h3>Cash Flow</h3>
              <span>Last 6 Months</span>
            </div>
            <div className="line-chart">
              <div className="chart-grid"></div>
              <svg viewBox="0 0 600 240" preserveAspectRatio="none">
                <defs>
                  <linearGradient id="goldFill" x1="0" x2="0" y1="0" y2="1">
                    <stop offset="0%" stopColor="#d9b86c" stopOpacity="0.45" />
                    <stop offset="100%" stopColor="#0e1726" stopOpacity="0" />
                  </linearGradient>
                </defs>
                <path
                  d="M0,190 C80,120 120,145 190,95 C270,40 330,150 410,85 C480,30 540,80 600,35 L600,240 L0,240 Z"
                  fill="url(#goldFill)"
                />
                <path
                  d="M0,190 C80,120 120,145 190,95 C270,40 330,150 410,85 C480,30 540,80 600,35"
                  fill="none"
                  stroke="#d9b86c"
                  strokeWidth="5"
                />
              </svg>
            </div>
            <div className="chart-labels">
              <span>Jan</span><span>Feb</span><span>Mar</span><span>Apr</span><span>May</span><span>Jun</span>
            </div>
          </div>

          <div className="panel distribution-panel">
            <div className="panel-header">
              <h3>Account Distribution</h3>
              <span>By Type</span>
            </div>
            <div className="donut-wrap">
              <div className="donut">
                <div>
                  <strong>$248.75M</strong>
                  <span>Total</span>
                </div>
              </div>
              <ul>
                <li><span className="dot gold"></span>Demand Deposits <b>42%</b></li>
                <li><span className="dot teal"></span>Savings <b>24%</b></li>
                <li><span className="dot purple"></span>Investments <b>18%</b></li>
                <li><span className="dot blue"></span>Loans & Credit <b>10%</b></li>
              </ul>
            </div>
          </div>

          <div className="panel sync-panel">
            <div className="sync-emblem">✓</div>
            <h3>Zelle Sync Overview</h3>
            <div className="sync-row"><span>Connection</span><b>Connected</b></div>
            <div className="sync-row"><span>System</span><b>Zelle Business</b></div>
            <div className="sync-row"><span>Last Sync</span><b>2 min ago</b></div>
            <div className="sync-row"><span>Records</span><b>12,458</b></div>
            <button>View Sync</button>
          </div>
        </section>

        <section className="bottom-grid">
          <div className="panel transactions-panel">
            <div className="panel-header">
              <h3>Recent Transactions</h3>
              <button>View All</button>
            </div>

            <table>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Description</th>
                  <th>Account</th>
                  <th>Amount</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {transactions.map((tx) => (
                  <tr key={`${tx.description}-${tx.time}`}>
                    <td>
                      <strong>{tx.date}</strong>
                      <span>{tx.time}</span>
                    </td>
                    <td>{tx.description}</td>
                    <td>{tx.account}</td>
                    <td className={tx.type === "income" ? "positive" : "negative"}>{tx.amount}</td>
                    <td><span className="status-pill">{tx.status}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="panel quick-actions">
            <div className="panel-header">
              <h3>Quick Actions</h3>
            </div>
            <button>New Payment</button>
            <button>Create Invoice</button>
            <button>Account Transfer</button>
            <button>Download Report</button>
          </div>
        </section>
      </main>
    </div>
  );
}

export default Dashboard;
