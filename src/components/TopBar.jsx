import { SUPPORTED_CURRENCIES } from "../hooks/useCurrency";

export default function TopBar({ onAddExpense, onExportCSV, user, onLogout, currency, setCurrency }) {
  return (
    <div className="topbar">

      {/* Logo */}
      <div className="topbar-logo">💰 ExpenseIQ</div>

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
              {c.flag} {c.code}
            </option>
          ))}
        </select>

        <button className="topbar-csv" onClick={onExportCSV}>⬇</button>
        <button className="topbar-btn" onClick={onAddExpense}>+ Add</button>
      </div>

    </div>
  );
}