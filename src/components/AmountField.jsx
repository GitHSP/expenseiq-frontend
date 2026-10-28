import { SUPPORTED_CURRENCIES } from "../hooks/useCurrency";

// Amount input with its own currency. Everything is stored in CAD, so an
// amount typed in another currency (e.g. ₹50,000 sent abroad) is converted
// with the current rate when saved. Defaults to the currency the app is
// showing, so what you type matches what you see.

const ENTERED_RE = /\s*·?\s*Entered as [^·]*$/;

export function startingEntry(amountInCAD, displayCurrency, getRate, item = null) {
  // Entered in another currency before: reopen with exactly what was typed.
  if (item && item.original_currency && item.original_amount !== null && item.original_amount !== undefined) {
    return { amount: String(parseFloat(item.original_amount)), currency: item.original_currency };
  }
  const typed = String(item?.notes || "").match(/Entered as \D*([\d,]+(?:\.\d+)?) ([A-Z]{3})/);   // older entries
  if (typed && amountInCAD !== "" && amountInCAD !== undefined && amountInCAD !== null) {
    return { amount: String(parseFloat(typed[1].replace(/,/g, ""))), currency: typed[2] };
  }
  const rate = getRate(displayCurrency);
  const currency = rate ? displayCurrency : "CAD";
  if (amountInCAD === "" || amountInCAD === undefined || amountInCAD === null) return { amount: "", currency };
  const value = parseFloat(amountInCAD) * (currency === "CAD" ? 1 : rate);
  return { amount: Number.isFinite(value) ? String(Math.round(value * 100) / 100) : "", currency };
}

// Fields for the API: CAD amount plus what was typed (when not CAD).
export function toStored(entry, notes, getRate) {
  const typed = parseFloat(entry.amount);
  const cleanNotes = String(notes || "").replace(ENTERED_RE, "").trim();   // drop older "Entered as" notes
  const plain = { amount: entry.amount, notes: cleanNotes, original_amount: null, original_currency: "" };
  if (!Number.isFinite(typed) || entry.currency === "CAD") return plain;
  const rate = getRate(entry.currency);
  if (!rate) return plain;
  return { amount: (Math.round((typed / rate) * 100) / 100).toFixed(2), notes: cleanNotes,
           original_amount: typed.toFixed(2), original_currency: entry.currency };
}

export default function AmountField({ entry, onChange, getRate, labelStyle, labelClassName, inputStyle, inputClassName }) {
  const options = SUPPORTED_CURRENCIES.filter(c => c.code === "CAD" || getRate(c.code));
  const rate = getRate(entry.currency);
  const typed = parseFloat(entry.amount);
  const cad = entry.currency !== "CAD" && rate && Number.isFinite(typed) ? typed / rate : null;
  return (
    <div className="form-group">
      <label style={labelStyle} className={labelClassName}>Amount *</label>
      <div style={{ display: "flex", gap: 6 }}>
        <input
          style={{ ...inputStyle, flex: 1, minWidth: 0 }}
          className={inputClassName}
          type="number"
          inputMode="decimal"
          placeholder="0.00"
          value={entry.amount}
          onChange={e => onChange({ ...entry, amount: e.target.value })}
        />
        <select
          aria-label="Currency of the amount"
          value={entry.currency}
          onChange={e => onChange({ ...entry, currency: e.target.value })}
          style={{ ...inputStyle, width: 84, flex: "0 0 84px", cursor: "pointer", fontWeight: 700 }}
          className={inputClassName}
        >
          {options.map(c => <option key={c.code} value={c.code}>{c.code}</option>)}
        </select>
      </div>
      {cad !== null && (
        <div style={{ fontSize: 11.5, color: "var(--muted)", marginTop: 4 }}>
          ≈ CA${cad.toFixed(2)} saved · 1 CAD = {rate.toFixed(2)} {entry.currency}
        </div>
      )}
      {options.length === 1 && (
        <div style={{ fontSize: 11.5, color: "var(--muted)", marginTop: 4 }}>
          Exchange rates aren't available right now — enter the amount in CAD.
        </div>
      )}
    </div>
  );
}
