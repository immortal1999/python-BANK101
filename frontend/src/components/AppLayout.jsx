import { useCallback, useEffect, useState } from "react";
import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import {
  Bell, Bot, CircleHelp, FileText, Landmark, LayoutDashboard, LogOut, Menu, Send,
  ShieldCheck, Users, WalletCards, X, Zap,
} from "lucide-react";
import { api } from "../lib/api";
import ChatWidget from "./ChatWidget";
import GlobalSearch from "./GlobalSearch";
import "../pages/dashboard.css";
import "../pages/pages.css";

// `to: null` = not built yet (rendered disabled). `adminOnly` items are hidden from
// everyone else (the API enforces the role regardless). `action: "chat"` opens the chat.
const navSections = [
  {
    title: "Banking",
    items: [
      { label: "Accounts", to: "/accounts", icon: Landmark },
      { label: "Cards", to: "/cards", icon: WalletCards },
      { label: "Statements", to: "/statements", icon: FileText },
      { label: "Transfer & Pay", to: null, icon: Send },
      { label: "Zelle", to: null, icon: Zap },
    ],
  },
  {
    title: "Admin",
    items: [
      { label: "Admin", to: "/admin", icon: Users, adminOnly: true },
      { label: "Audit Logs", to: null, icon: ShieldCheck, adminOnly: true },
    ],
  },
  {
    title: "Support",
    items: [
      { label: "AI Assistant", action: "chat", icon: Bot },
      { label: "Support", to: "/support", icon: CircleHelp },
    ],
  },
];

const titles = {
  "/dashboard": "Dashboard",
  "/accounts": "Accounts",
  "/cards": "Cards",
  "/statements": "Statements",
  "/support": "Support",
  "/admin": "Admin",
};

// Below this width the sidebar becomes a drawer opened from the menu button.
const DRAWER_QUERY = "(max-width: 1024px)";

function useMediaQuery(query) {
  const [matches, setMatches] = useState(() => window.matchMedia(query).matches);
  useEffect(() => {
    const mq = window.matchMedia(query);
    const onChange = () => setMatches(mq.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, [query]);
  return matches;
}

// Shell for every signed-in page: sidebar, top bar, support chat. Loads the user and
// their accounts once and hands them to child routes via the outlet context.
function AppLayout() {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const [user, setUser] = useState(null);
  const [accounts, setAccounts] = useState([]);
  const [chatOpen, setChatOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const isDrawer = useMediaQuery(DRAWER_QUERY);
  const closeMenu = () => setMenuOpen(false);

  // Esc closes the menu drawer.
  useEffect(() => {
    if (!menuOpen) return;
    const onKey = (e) => e.key === "Escape" && setMenuOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [menuOpen]);

  const logout = useCallback(() => {
    localStorage.removeItem("token");
    sessionStorage.removeItem("support-chat");
    navigate("/login");
  }, [navigate]);

  useEffect(() => {
    if (!localStorage.getItem("token")) {
      navigate("/login");
      return;
    }
    Promise.all([api("/auth/me"), api("/accounts")])
      .then(([me, accts]) => {
        setUser(me);
        setAccounts(accts);
      })
      // token expired/invalid or server unreachable (e.g. mid-deploy) -> back to login
      .catch(logout);
  }, [navigate, logout]);

  if (!user) {
    return <div className="aureus-app app-loading">Loading…</div>;
  }

  const isAdmin = user.role === "admin";
  const section = "/" + pathname.split("/")[1];
  const initials = user.full_name.split(" ").map((n) => n[0]).join("").toUpperCase();
  const drawerHidden = isDrawer && !menuOpen;

  return (
    <div className="aureus-app">
      {isDrawer && menuOpen && <div className="menu-backdrop" onClick={closeMenu} />}
      <aside id="app-menu" className={`sidebar ${menuOpen ? "open" : ""}`} inert={drawerHidden} aria-label="Main menu">
        <div className="side-brand">
          <div className="side-brand-mark">A</div>
          <div>
            <div className="side-brand-name">AUREUS <span>CORE</span></div>
            <div className="side-brand-sub">Private Banking Platform</div>
          </div>
          {isDrawer && (
            <button className="menu-close" onClick={closeMenu} aria-label="Close menu"><X size={18} /></button>
          )}
        </div>

        <nav className="sidebar-nav" aria-label="Primary navigation">
          <NavLink to="/dashboard" onClick={closeMenu} className={({ isActive }) => `nav-item ${isActive ? "active" : ""}`}>
            <LayoutDashboard size={20} />
            <span>Dashboard</span>
          </NavLink>

          {navSections.map((sec) => {
            const items = sec.items.filter((n) => !n.adminOnly || isAdmin);
            if (!items.length) return null;
            return (
              <div className="nav-section" key={sec.title}>
                <div className="nav-heading">{sec.title}</div>
                {items.map(({ label, to, action, icon: Icon }) =>
                  action === "chat" ? (
                    <button key={label} className="nav-item" onClick={() => { closeMenu(); setChatOpen(true); }}>
                      <Icon size={20} />
                      <span>{label}</span>
                    </button>
                  ) : to ? (
                    <NavLink key={label} to={to} onClick={closeMenu} className={({ isActive }) => `nav-item ${isActive ? "active" : ""}`}>
                      <Icon size={20} />
                      <span>{label}</span>
                    </NavLink>
                  ) : (
                    <button key={label} className="nav-item disabled" disabled title="Coming soon">
                      <Icon size={20} />
                      <span>{label}</span>
                      <small className="soon">Soon</small>
                    </button>
                  )
                )}
              </div>
            );
          })}
        </nav>

        <div className="sidebar-bottom">
          <button className="nav-item" onClick={logout}>
            <LogOut size={20} />
            <span>Logout</span>
          </button>
        </div>
      </aside>

      <main className={`main-area ${chatOpen ? "chat-docked" : ""}`}>
        <header className="topbar">
          {isDrawer && (
            <button
              className="menu-toggle"
              onClick={() => setMenuOpen((v) => !v)}
              aria-label="Open menu"
              aria-expanded={menuOpen}
              aria-controls="app-menu"
              title="Menu"
            >
              <Menu size={22} />
            </button>
          )}
          <GlobalSearch accounts={accounts} isAdmin={isAdmin} onOpenChat={() => setChatOpen(true)} onLogout={logout} />
          <div className="topbar-actions">
            <button className="icon-button" aria-label="Notifications"><Bell size={21} /></button>
            <div className="profile-avatar">{initials}</div>
            <div className="profile-copy">
              <strong>{user.full_name}</strong>
              <span>{isAdmin ? "Administrator" : "Personal Banking"}</span>
            </div>
          </div>
        </header>

        <div className="content">
          {section !== "/dashboard" && (
            <div className="page-head">
              <span className="eyebrow">Aureus Banking</span>
              <h1>{titles[section] ?? "Dashboard"}</h1>
            </div>
          )}
          <Outlet context={{ user, accounts, openChat: () => setChatOpen(true) }} />
        </div>
      </main>

      <ChatWidget user={user} open={chatOpen} onOpenChange={setChatOpen} />
    </div>
  );
}

export default AppLayout;
