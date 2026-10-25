import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { usd, capitalize } from "../lib/api";

// Static destinations: pages plus "settings"-style actions, pointing at where each
// control lives. `keywords` widen matching beyond the visible label.
const PAGES = [
  { label: "Dashboard", to: "/dashboard", keywords: "home overview summary cash flow" },
  { label: "Accounts", to: "/accounts", keywords: "balances checking savings activity" },
  { label: "Cards", to: "/cards", keywords: "debit credit visa mastercard" },
  { label: "Statements", to: "/statements", keywords: "monthly history transactions" },
  { label: "Support", to: "/support", keywords: "help contact" },
  { label: "Admin", to: "/admin", keywords: "admin users online stats accounts count", adminOnly: true },
];

const SETTINGS = [
  { label: "Freeze or unfreeze a card", to: "/cards", keywords: "lock block suspend card security" },
  { label: "Show card number & CVV", to: "/cards", keywords: "card details reveal security code expiry" },
  { label: "Card limits", to: "/cards", keywords: "atm daily purchase spending limit credit limit" },
  { label: "Report a lost or stolen card", to: "/support", keywords: "lost stolen fraud card replace" },
  { label: "Account & routing number", to: "/accounts", keywords: "account number routing direct deposit details" },
  { label: "Download a statement (CSV)", to: "/statements", keywords: "export csv download statement report" },
  { label: "Create a support ticket", to: "/support#ticket", keywords: "ticket issue problem request" },
  { label: "Contact details (email & phone)", to: "/support", keywords: "email phone call gmail contact" },
  { label: "Chat with support", action: "chat", keywords: "chat assistant live help ai spending profit projection" },
  { label: "Sign out", action: "logout", keywords: "logout log out sign out exit" },
];

function score(item, tokens) {
  const label = item.label.toLowerCase();
  const hay = `${label} ${item.keywords ?? ""}`.toLowerCase();
  if (!tokens.every((t) => hay.includes(t))) return -1;
  const q = tokens.join(" ");
  if (label.startsWith(q)) return 3;
  if (label.includes(q)) return 2;
  return 1;
}

function GlobalSearch({ accounts, isAdmin, onOpenChat, onLogout }) {
  const navigate = useNavigate();
  const inputRef = useRef(null);
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);

  const groups = useMemo(() => {
    const tokens = query.toLowerCase().split(/\s+/).filter(Boolean);
    if (!tokens.length) return [];
    const accountItems = accounts.map((a) => ({
      label: `${capitalize(a.account_type)} ••••${a.account_number.slice(-4)}`,
      hint: usd(a.balance),
      to: `/accounts/${a.id}`,
      keywords: `${a.account_type} account ${a.account_number} ${a.status}`,
    }));
    const rank = (items) =>
      items
        .map((it) => ({ it, s: score(it, tokens) }))
        .filter((x) => x.s >= 0)
        .sort((a, b) => b.s - a.s)
        .map((x) => x.it);
    let n = 0; // flat index across groups, for keyboard navigation
    return [
      { name: "Accounts", items: rank(accountItems) },
      { name: "Settings & actions", items: rank(SETTINGS).slice(0, 5) },
      { name: "Pages", items: rank(PAGES.filter((p) => !p.adminOnly || isAdmin)) },
    ]
      .filter((g) => g.items.length)
      .map((g) => ({ ...g, items: g.items.map((item) => ({ item, i: n++ })) }));
  }, [query, accounts, isAdmin]);

  const flat = groups.flatMap((g) => g.items.map((x) => x.item));

  // "/" or Cmd/Ctrl+K focuses search from anywhere (except while typing in a field).
  useEffect(() => {
    function onKey(e) {
      const typing = ["INPUT", "TEXTAREA", "SELECT"].includes(document.activeElement?.tagName);
      if ((e.key === "/" && !typing) || (e.key === "k" && (e.metaKey || e.ctrlKey))) {
        e.preventDefault();
        inputRef.current?.focus();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  function choose(item) {
    setQuery("");
    setOpen(false);
    document.activeElement?.blur();
    if (item.action === "chat") onOpenChat();
    else if (item.action === "logout") onLogout();
    else navigate(item.to);
  }

  function onKeyDown(e) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((i) => Math.min(i + 1, flat.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter" && flat[active]) {
      e.preventDefault();
      choose(flat[active]);
    } else if (e.key === "Escape") {
      setOpen(false);
      inputRef.current?.blur();
    }
  }

  return (
    <div className="global-search">
      <input
        ref={inputRef}
        value={query}
        placeholder="Search accounts, pages & settings…  ( / )"
        onChange={(e) => {
          setQuery(e.target.value);
          setActive(0);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        onKeyDown={onKeyDown}
        role="combobox"
        aria-expanded={open && query.trim() !== ""}
        aria-controls="global-search-results"
        aria-autocomplete="list"
      />
      {open && query.trim() && (
        <div className="search-results" id="global-search-results" role="listbox">
          {groups.length === 0 ? (
            <div className="search-empty">No matches for “{query}”</div>
          ) : (
            groups.map((g) => (
              <div key={g.name}>
                <div className="search-group">{g.name}</div>
                {g.items.map(({ item, i }) => {
                  return (
                    <button
                      key={item.label}
                      role="option"
                      aria-selected={i === active}
                      className={`search-item ${i === active ? "active" : ""}`}
                      // mousedown fires before the input's blur closes the list
                      onMouseDown={(e) => {
                        e.preventDefault();
                        choose(item);
                      }}
                      onMouseEnter={() => setActive(i)}
                    >
                      <span>{item.label}</span>
                      {item.hint && <small>{item.hint}</small>}
                    </button>
                  );
                })}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}

export default GlobalSearch;
