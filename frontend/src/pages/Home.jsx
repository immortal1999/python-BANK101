import { Link } from 'react-router-dom'

function Home() {
  return (
    <>
      <header className="page-shell navbar">
        <Link to="/" className="brand">
          <span className="brand-mark">A</span>
          <span>Aureus Banking</span>
        </Link>

        <nav className="nav-links">
          <a href="#features">Features</a>
          <a href="#sap">SAP Sync</a>
          <a href="#security">Security</a>
          <a href="#contact">Contact</a>
        </nav>

        <div className="nav-actions">
          <Link to="/login" className="btn">Login</Link>
          <Link to="/register" className="btn btn-primary">Open Account</Link>
        </div>
      </header>

      <main>
        <section className="page-shell hero">
          <div>
            <div className="eyebrow">✦ Private Banking + SAP Integration</div>
            <h1>Luxury digital banking for <span>modern finance teams.</span></h1>
            <p className="hero-copy">
              A premium banking dashboard concept for managing accounts, payments, invoices,
              SAP synchronization, and audit logs in one secure interface.
            </p>

            <div className="hero-actions">
              <Link to="/register" className="btn btn-primary">Open Account →</Link>
              <a href="#sap" className="btn">View SAP Workflow</a>
            </div>

            <div className="trust-row">
              <div><strong>$248M+</strong>Managed assets</div>
              <div><strong>99.8%</strong>Sync success rate</div>
              <div><strong>24/7</strong>Audit monitoring</div>
            </div>
          </div>

          <aside className="dashboard-preview" aria-label="Dashboard preview mockup">
            <div className="preview-topbar">
              <div className="preview-pill">Executive Dashboard</div>
              <div className="preview-pill">Synced • 2 min ago</div>
            </div>

            <div className="preview-grid">
              <div className="preview-card gold">
                <h3>Total Assets</h3>
                <strong>$248.75M</strong>
                <small>↑ 8.62% this month</small>
              </div>

              <div className="preview-card">
                <h3>SAP Sync Status</h3>
                <strong>Active</strong>
                <small>12,458 records synced</small>
              </div>

              <div className="preview-chart">
                <h3>Cash Flow</h3>
                <div className="chart-line">
                  <svg viewBox="0 0 520 120" preserveAspectRatio="none">
                    <defs>
                      <linearGradient id="goldFill" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#d7a84f" stopOpacity="0.45" />
                        <stop offset="100%" stopColor="#d7a84f" stopOpacity="0" />
                      </linearGradient>
                    </defs>
                    <path d="M0 92 C70 82 95 90 150 70 C205 50 240 60 285 52 C330 42 365 62 410 48 C455 34 480 22 520 16 L520 120 L0 120 Z" fill="url(#goldFill)" />
                    <path d="M0 92 C70 82 95 90 150 70 C205 50 240 60 285 52 C330 42 365 62 410 48 C455 34 480 22 520 16" fill="none" stroke="#ffd978" strokeWidth="4" strokeLinecap="round" />
                  </svg>
                </div>
              </div>

              <div className="preview-table">
                <div className="table-row">
                  <span>Payment from Horizon Ltd.</span>
                  <span className="amount-positive">+$1,250,000</span>
                  <span className="status">Completed</span>
                </div>
                <div className="table-row">
                  <span>Wire to Global Traders</span>
                  <span className="amount-negative">-$750,000</span>
                  <span className="status">Synced</span>
                </div>
                <div className="table-row">
                  <span>Invoice #INV-2458</span>
                  <span className="amount-positive">+$320,000</span>
                  <span className="status">Completed</span>
                </div>
              </div>
            </div>
          </aside>
        </section>

        <section id="features" className="page-shell section">
          <div className="section-header">
            <h2>Everything your banking core needs.</h2>
            <p>
              Use this as the homepage for your banking/SAP project before connecting it to your FastAPI backend.
            </p>
          </div>

          <div className="feature-grid">
            <article className="feature-card">
              <div className="feature-icon">🏦</div>
              <h3>Account Dashboard</h3>
              <p>View balances, account types, recent activity, cards, and portfolio allocation from one premium landing page.</p>
            </article>

            <article className="feature-card">
              <div className="feature-icon">↔</div>
              <h3>Payments &amp; Invoices</h3>
              <p>Support payment flows, invoice status, transaction tables, settlement tracking, and business transfers.</p>
            </article>

            <article id="sap" className="feature-card">
              <div className="feature-icon">◆</div>
              <h3>SAP Sync Layer</h3>
              <p>Highlight SAP S/4HANA synchronization, mock integration logs, validation errors, and audit visibility.</p>
            </article>
          </div>
        </section>

        <section id="security" className="page-shell cta">
          <div>
            <h2>Secure, auditable, and enterprise-ready.</h2>
            <p>
              Built around KYC/AML status, audit trails, SAP sync logs, role-based access, and transaction visibility.
              This homepage can route users to login, dashboard, payments, invoices, and SAP sync pages later.
            </p>
          </div>
          <Link to="/register" className="btn btn-primary">Create Account →</Link>
        </section>
      </main>

      <footer id="contact" className="page-shell">
        <span>© 2026 Aureus Banking Concept. For portfolio/demo use.</span>
        <span>Privacy · Security · Compliance</span>
      </footer>
    </>
  )
}

export default Home
