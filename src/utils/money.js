// Amounts are stored in CAD. Forms let people type in the currency they're
// looking at (e.g. INR for a transfer abroad); these convert both ways.

export function moneyUnit(unit, getRate) {
  const rate = unit === "CAD" ? 1 : getRate(unit);
  const ok = !!rate;
  return {
    unit: ok ? unit : "CAD",
    rate: ok ? rate : 1,
    // CAD from the server -> the number to show in the form.
    fromCAD(v) {
      if (v === "" || v === null || v === undefined) return "";
      const n = parseFloat(v) * (ok ? rate : 1);
      if (!Number.isFinite(n)) return "";
      // Large-unit currencies (INR...) read best as whole numbers.
      return String(ok && rate >= 10 ? Math.round(n) : Math.round(n * 100) / 100);
    },
    // Fields for the API recording what was typed (cleared for CAD).
    original(v) {
      const n = parseFloat(v);
      return ok && unit !== "CAD" && Number.isFinite(n)
        ? { original_amount: n.toFixed(2), original_currency: unit }
        : { original_amount: null, original_currency: "" };
    },
    // An item typed in this currency before: exactly what was typed.
    // (debts keep one original per amount: original_current_balance, ...)
    fromItem(item, field = "amount") {
      const of = field === "amount" ? "original_amount" : `original_${field}`;
      if (item && item.original_currency === unit && item[of] != null) return String(parseFloat(item[of]));
      return this.fromCAD(item ? item[field] : "");
    },
    // A debt's typed amounts for the API (cleared for CAD).
    debtOriginals(form) {
      const n = v => (v === "" || v === null || v === undefined || !Number.isFinite(parseFloat(v)) ? null : parseFloat(v).toFixed(2));
      return ok && unit !== "CAD"
        ? { original_currency: unit, original_current_balance: n(form.current_balance),
            original_minimum_payment: n(form.minimum_payment), original_credit_limit: n(form.credit_limit) }
        : { original_currency: "", original_current_balance: null, original_minimum_payment: null, original_credit_limit: null };
    },
    // What was typed -> CAD for the server (number, 2 decimals).
    toCAD(v) {
      const n = parseFloat(v);
      if (!Number.isFinite(n)) return NaN;
      return Math.round((n / (ok ? rate : 1)) * 100) / 100;
    },
  };
}
