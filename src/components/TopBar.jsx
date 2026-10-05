import { SUPPORTED_CURRENCIES } from "../hooks/useCurrency";
import Icon from "./Icon";

export default function TopBar({ onAddExpense, onExportCSV, user, onLogout, currency, setCurrency }) {
  return (
    <div className="topbar">

      {/* Logo */}
      <div className="topbar-logo"><Icon name="wallet" size={20} /> ExpenseIQ</div>

      {/* Right side actions */}
      <div className="topbar-actions">

        {/* Currency selector — mobile only */}
        <select
          value={currency}
          onChange={e => setCurrency(e.target.value)}
          style={{
            background:   "#1a1a1a",
            border:       "1px solid #2a2a2a",
            borderRadius: "50px",
            padding:      "8px 10px",
            color:        "#e8e8e8",
            fontSize:     "12px",
            fontWeight:   700,
            cursor:       "pointer",
            outline:      "none",
          }}
        >
          {SUPPORTED_CURRENCIES.map(c => (
            <option
              key={c.code}
              value={c.code}
              style={{ background:"#161616", color:"#e8e8e8" }}
            >
              {c.code}
            </option>
          ))}
        </select>

        <button className="topbar-csv" onClick={onExportCSV} aria-label="Export CSV"><Icon name="download" size={16} /></button>
        <button className="topbar-btn" onClick={onAddExpense}><Icon name="plus" size={14} /> Add</button>
      </div>

    </div>
  );
}