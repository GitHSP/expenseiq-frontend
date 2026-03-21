import { useState }         from "react";
import { NAV_ITEMS }        from "../constants/categories";
import CurrencySelector     from "./CurrencySelector";

export default function Sidebar({
  view, setView, onAddExpense, onExportCSV,
  user, onLogout, currency, setCurrency,
}) {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <aside className={`sidebar${collapsed ? " collapsed" : ""}`}>

      {/* ── Logo ── */}
      <div className="sidebar-logo">
        <div className="logo-dot" />
        {!collapsed && <span className="logo-text">ExpenseIQ</span>}
        <button
          className="sidebar-collapse-btn"
          onClick={() => setCollapsed(p => !p)}
          title="Toggle sidebar"
        >
          {collapsed ? "›" : "‹"}
        </button>
      </div>

      {/* ── Navigation ── */}
      <nav className="sidebar-nav">
        {NAV_ITEMS.map(item => (
          <button
            key={item.id}
            className={`sidebar-item${view === item.id ? " active" : ""}`}
            onClick={() => setView(item.id)}
          >
            <span className="nav-icon">{item.icon}</span>
            {!collapsed && <span>{item.label}</span>}
          </button>
        ))}
      </nav>

      {/* ── Bottom Actions ── */}
      <div className="sidebar-actions">

        {/* Currency selector */}
        <CurrencySelector
          currency={currency}
          setCurrency={setCurrency}
          collapsed={collapsed}
        />

        {/* User info */}
        {!collapsed && user && (
          <div style={{
            padding:      "10px 12px",
            background:   "#f6f8fa",
            borderRadius: "8px",
            marginBottom: "4px",
            border:       "1px solid #eaeaea",
          }}>
            <div style={{ fontSize:10, color:"#aaa", marginBottom:2, fontWeight:600, textTransform:"uppercase", letterSpacing:"0.5px" }}>
              Signed in as
            </div>
            <div style={{
              fontSize:13, fontWeight:600, color:"#0d0d0d",
              whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis",
            }}>
              {user.email}
            </div>
          </div>
        )}

        <button className="sidebar-btn primary" onClick={onAddExpense}>
          <span style={{ fontSize:16 }}>＋</span>
          {!collapsed && <span>Add Expense</span>}
        </button>

        <button className="sidebar-btn secondary" onClick={onExportCSV}>
          <span>⬇</span>
          {!collapsed && <span>Export CSV</span>}
        </button>

        <button className="sidebar-btn secondary" onClick={onLogout}>
          <span>🚪</span>
          {!collapsed && <span>Logout</span>}
        </button>

      </div>
    </aside>
  );
}