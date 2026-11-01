import { useCallback, useEffect, useState } from "react";
import TransactionPanel from "../components/TransactionPanel";
import OverviewPanel from "../components/OverviewPanel";
import HealthPanel from "../components/HealthPanel";
import DocumentsPanel from "../components/DocumentsPanel";
import SettingsPanel from "../components/SettingsPanel";
import { useRemoteData } from "../hooks/useRemoteData";
import { api } from "../utils/api";
import { formatMoney } from "../utils/transactions";
import "../dashboard.css";
const tabs = [
  ["overview", "Overview", "M3 3h7v7H3zm11 0h7v7h-7zM3 14h7v7H3zm11 0h7v7h-7z"],
  ["transactions", "Transactions", "M4 7h16m-4-4 4 4-4 4M20 17H4m4-4-4 4 4 4"],
  ["health", "Financial Health", "M3 12h4l3-8 4 16 3-8h4"],
  ["documents", "Documents", "M6 3h8l4 4v14H6zM14 3v5h4M9 12h6M9 16h6"],
  ["settings", "Settings", "M4 6h16M4 12h16M4 18h16M8 3v6m8 0v6m-6 0v6"],
];
function readAppearance(userId) {
  try {
    const data = JSON.parse(
      localStorage.getItem(`finance-appearance:${userId}`),
    );
    return {
      mode: ["light", "dark", "system"].includes(data?.mode)
        ? data.mode
        : "light",
      accent: ["forest", "ocean", "plum"].includes(data?.accent)
        ? data.accent
        : "forest",
    };
  } catch {
    return { mode: "light", accent: "forest" };
  }
}
export default function DashboardPage({ user, onLogout }) {
   const [active, setActive] = useState("overview");
   const [version, setVersion] = useState(0);
   const [loading, setLoading] = useState(false);
   const [error, setError] = useState("");
   const [appearance, setAppearance] = useState(() => readAppearance(user.id));
   const [storageError, setStorageError] = useState("");
   const [systemDark, setSystemDark] = useState(
    () => window.matchMedia("(prefers-color-scheme: dark)").matches,
  );
  const refresh = useCallback(() => setVersion((v) => v + 1), []);
  const overview = useRemoteData("/transactions?limit=5", version, onLogout);
  useEffect(() => {
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const update = (event) => setSystemDark(event.matches);
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);
  function changeAppearance(next) {
    setAppearance(next);
    setStorageError("");
    try {
      localStorage.setItem(
        `finance-appearance:${user.id}`,
        JSON.stringify(next),
      );
    } catch {
      setStorageError(
        "Applied for this visit. Browser storage is unavailable, so this preference cannot be remembered.",
      );
    }
  }
  async function logout() {
    setLoading(true);
    setError("");
    try {
      await api("/auth/logout", { method: "POST" });
      onLogout();
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }
  const theme =
    appearance.mode === "system"
      ? systemDark
        ? "dark"
        : "light"
      : appearance.mode;
  const title = tabs.find(([id]) => id === active)[1];
  return (
    <div
      className="finance-shell"
      data-theme={theme}
      data-accent={appearance.accent}
    >
      <aside className="finance-sidebar">
        <a
          className="finance-brand"
          href="#"
          onClick={(e) => {
            e.preventDefault();
            setActive("overview");
          }}
        >
          <span className="finance-brand-mark">
            U<span>↗</span>
          </span>
          <span>
            Ultimate<span className="brand-subtitle">PERSONAL FINANCE</span>
          </span>
        </a>
        <span className="nav-caption">YOUR WORKSPACE</span>
        <nav aria-label="Finance navigation">
          {tabs.map(([id, label, path]) => (
            <button
              type="button"
              key={id}
              className={`finance-nav-item ${active === id ? "active" : ""}`}
              aria-current={active === id ? "page" : undefined}
              onClick={() => setActive(id)}
            >
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d={path} />
              </svg>
              {label}
              {active === id && <span className="nav-indicator" />}
            </button>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="sidebar-note">
            <span>Small steps. Clearer finances.</span>
            <p>Your income, expenses and paperwork in one place.</p>
          </div>
          <div className="account-chip">
            <span className="avatar">
              {user.name.slice(0, 1).toUpperCase()}
            </span>
            <div>
              <strong>{user.name}</strong>
              <small>Personal account</small>
            </div>
          </div>
          <button
            type="button"
            className="sidebar-logout"
            disabled={loading}
            onClick={logout}
          >
            {loading ? "Logging out..." : "Log out ↗"}
          </button>
        </div>
      </aside>
      <div className="finance-workspace">
        <header className="workspace-topbar">
          <div>
            <span className="eyebrow">YOUR MONEY, IN FOCUS</span>
            <strong>{title}</strong>
          </div>
          <div className="topbar-actions">
            <span className="today-label">
              {new Date().toLocaleDateString("en-LK", {
                day: "numeric",
                month: "short",
                year: "numeric",
              })}
            </span>
            <button
              type="button"
              className="button button-primary"
              onClick={() => {
                setActive("transactions");
                setTimeout(
                  () => document.getElementById("transaction-amount")?.focus(),
                  0,
                );
              }}
            >
              Manage transactions ↗
            </button>
          </div>
        </header>
        <main className="workspace-main">
          <div className="workspace-heading">
            <div>
              <p className="eyebrow">
                {active === "overview"
                  ? `WELCOME BACK, ${user.name.split(" ")[0].toUpperCase()}`
                  : "ULTIMATE FINANCE"}
              </p>
              <h1>
                {active === "overview" ? "Make room for what matters." : title}
              </h1>
            </div>
            <span className="workspace-tag">LKR · Personal ledger</span>
          </div>
          {error && (
            <p role="alert" className="form-notice">
              {error}
            </p>
          )}
          <div className="global-summary-label">
            <span>ALL-TIME OVERVIEW</span>
            <span>Independent of filters and selected months</span>
          </div>
          {overview.loading ? (
            <p role="status">Updating all-time totals...</p>
          ) : overview.error ? (
            <div className="form-notice" role="alert">
              {overview.error}{" "}
              <button type="button" className="text-button" onClick={refresh}>
                Retry
              </button>
            </div>
          ) : (
            <div className="global-summary">
              <article className="global-stat">
                <span className="stat-label">
                  Total income <span className="stat-arrow">↙</span>
                </span>
                <strong>
                  {formatMoney(overview.data.summary.incomeCents)}
                </strong>
                <small>All recorded income</small>
              </article>
              <article className="global-stat">
                <span className="stat-label">
                  Total expenses <span className="stat-arrow expense">↗</span>
                </span>
                <strong>
                  {formatMoney(overview.data.summary.expenseCents)}
                </strong>
                <small>All recorded spending</small>
              </article>
              <article className="global-stat net-stat">
                <span className="stat-label">
                  Net balance <span>↗</span>
                </span>
                <strong>
                  {formatMoney(overview.data.summary.balanceCents)}
                </strong>
                <small>Recorded income − expenses</small>
              </article>
            </div>
          )}
          {active === "overview" && overview.data && (
            <OverviewPanel
              data={overview.data}
              onTransactions={() => setActive("transactions")}
            />
          )}
          <div hidden={active !== "transactions"}>
            <TransactionPanel
              onSessionExpired={onLogout}
              onDataChanged={refresh}
              externalVersion={version}
            />
          </div>
          <div hidden={active !== "health"}>
            <HealthPanel
              version={version}
              onDataChanged={refresh}
              onSessionExpired={onLogout}
            />
          </div>
          <div hidden={active !== "documents"}>
            <DocumentsPanel
              version={version}
              onDataChanged={refresh}
              onSessionExpired={onLogout}
            />
          </div>
          {active === "settings" && (
            <SettingsPanel
              user={user}
              appearance={appearance}
              onChange={changeAppearance}
              storageError={storageError}
            />
          )}
          <footer className="workspace-footer">
            <span>Ultimate Finance</span>
            <span>A little clarity, every day.</span>
          </footer>
        </main>
      </div>
    </div>
  );
}
