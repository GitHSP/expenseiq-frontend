import { useState }           from "react";
import { NAV_ITEMS }          from "../constants/categories";
import CurrencySelector       from "./CurrencySelector";

export default function Sidebar({
  view, setView, onAddExpense, onExportCSV,
  user, onLogout, currency, setCurrency,
}) {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <aside className={`sidebar${collapsed ? " collapsed" : ""}`}>

      {/* Logo */}
      <div className="sidebar-logo">
        <span style={{ fontSize:22 }}>💰</span>
        {!collapsed && <span className="logo-text">ExpenseIQ</span>}
        <button
          className="sidebar-collapse-btn"
          onClick={() => setCollapsed(p => !p)}
          title="Toggle sidebar"
        >
          {collapsed ? "›" : "‹"}
        </button>
      </div>

      {/* Navigation */}
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

      {/* Actions */}
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
            background:   "#f5f6fa",
            borderRadius: "12px",
            marginBottom: "8px",
            border:       "1px solid #e8eaf0",
          }}>
            <div style={{ fontSize:11, color:"#888", marginBottom:2 }}>Logged in as</div>
            <div style={{ fontSize:13, fontWeight:700, color:"#1a1a2e",
              whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>
              {user.email}
            </div>
          </div>
        )}

        <button className="sidebar-btn primary" onClick={onAddExpense}>
          <span>＋</span>
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