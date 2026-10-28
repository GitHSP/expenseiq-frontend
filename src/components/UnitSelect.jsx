import { SUPPORTED_CURRENCIES } from "../hooks/useCurrency";

// "Amounts in [INR]" for forms whose amounts are converted to CAD on save.
export default function UnitSelect({ unit, onChange, getRate, style }) {
  const options = SUPPORTED_CURRENCIES.filter(c => c.code === "CAD" || getRate(c.code));
  const rate = unit === "CAD" ? 1 : getRate(unit);
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 12, color: "var(--muted2)", ...style }}>
      Amounts in
      <select value={unit} onChange={e => onChange(e.target.value)} aria-label="Currency for amounts in this form"
        style={{ background: "var(--card)", color: "var(--text)", border: "1px solid var(--border)", borderRadius: 6,
                 padding: "3px 6px", fontSize: 12, fontWeight: 700, fontFamily: "inherit", cursor: "pointer" }}>
        {options.map(c => <option key={c.code} value={c.code}>{c.code}</option>)}
      </select>
      {unit !== "CAD" && rate && <span style={{ color: "var(--muted)" }}>· saved in CAD at 1 CAD = {rate.toFixed(2)} {unit}</span>}
    </span>
  );
}
