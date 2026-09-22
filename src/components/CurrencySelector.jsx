import { SUPPORTED_CURRENCIES } from "../hooks/useCurrency";

export default function CurrencySelector({ currency, setCurrency, collapsed }) {
  return (
    <div style={{
      padding:      collapsed ? "8px" : "10px 12px",
      background:   "var(--subtle2)",
      borderRadius: "12px",
      marginBottom: "8px",
      border:       "1px solid var(--border)",
    }}>
      {!collapsed && (
        <div style={{
          fontSize:      10,
          color:         "var(--muted)",
          fontWeight:    600,
          textTransform: "uppercase",
          letterSpacing: 0.5,
          marginBottom:  6,
        }}>
          Currency
        </div>
      )}
      <select
        value={currency}
        onChange={e => setCurrency(e.target.value)}
        style={{
          width:       "100%",
          background:  "transparent",
          border:      "none",
          outline:     "none",
          fontSize:    collapsed ? 16 : 13,
          fontWeight:  700,
          color:       "var(--text)",
          cursor:      "pointer",
          padding:     0,
        }}
      >
        {SUPPORTED_CURRENCIES.map(c => (
          <option key={c.code} value={c.code}>
            {collapsed ? c.flag : `${c.flag} ${c.code} — ${c.name}`}
          </option>
        ))}
      </select>
    </div>
  );
}