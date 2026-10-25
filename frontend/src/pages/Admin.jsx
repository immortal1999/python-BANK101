import { useEffect, useState } from "react";
import { useOutletContext } from "react-router-dom";
import { api, capitalize } from "../lib/api";

const REFRESH_MS = 30_000;

// Site-wide counts for admins. The API enforces the role; hiding the nav item is cosmetic.
function Admin() {
  const { user } = useOutletContext();
  const [stats, setStats] = useState(null);
  const [error, setError] = useState(null);
  const [updatedAt, setUpdatedAt] = useState(null);

  useEffect(() => {
    if (user.role !== "admin") return;
    let cancelled = false;
    const load = () =>
      api("/admin/stats")
        .then((s) => {
          if (cancelled) return;
          setStats(s);
          setError(null);
          setUpdatedAt(new Date());
        })
        .catch((e) => !cancelled && setError(e.message));
    load();
    const id = setInterval(load, REFRESH_MS);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [user.role]);

  if (user.role !== "admin") {
    return (
      <div className="panel empty-state">
        <p>Admin access required</p>
        <span>This page is only available to administrators.</span>
      </div>
    );
  }

  if (!stats) {
    return <div className="panel empty-state"><p>{error ?? "Loading…"}</p></div>;
  }

  return (
    <>
      <section className="kpi-grid">
        <div className="kpi-card panel">
          <span className="kpi-icon green">◆</span>
          <p>Online now</p>
          <h3>{stats.online_now ?? "—"}</h3>
          <small>
            {stats.online_now === null ? "Presence unavailable (Redis down)" : `Active in the last ${stats.online_window_minutes} min`}
          </small>
        </div>
        <div className="kpi-card panel">
          <span className="kpi-icon blue">◆</span>
          <p>Registered users</p>
          <h3>{stats.users_total}</h3>
          <small>+{stats.users_new_7d} in the last 7 days</small>
        </div>
        <div className="kpi-card panel">
          <span className="kpi-icon purple">◆</span>
          <p>Bank accounts</p>
          <h3>{stats.accounts_total}</h3>
          <small>Across all users</small>
        </div>
      </section>

      <section className="account-detail-grid">
        <CountPanel title="Accounts by type" counts={stats.accounts_by_type} />
        <CountPanel title="Accounts by status" counts={stats.accounts_by_status} />
      </section>

      <p className="page-note">
        {error ? `Refresh failed: ${error}. ` : ""}
        Updated {updatedAt?.toLocaleTimeString()} · refreshes every {REFRESH_MS / 1000}s
      </p>
    </>
  );
}

function CountPanel({ title, counts }) {
  const rows = Object.entries(counts).sort((a, b) => b[1] - a[1]);
  return (
    <div className="panel account-detail">
      <div className="panel-header">
        <h3>{title}</h3>
      </div>
      {rows.length ? (
        <dl className="detail-list">
          {rows.map(([k, n]) => (
            <div key={k}>
              <dt>{capitalize(k)}</dt>
              <dd>{n}</dd>
            </div>
          ))}
        </dl>
      ) : (
        <p className="muted-label">None yet</p>
      )}
    </div>
  );
}

export default Admin;
