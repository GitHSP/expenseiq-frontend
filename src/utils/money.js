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
    // What was typed -> CAD for the server (number, 2 decimals).
    toCAD(v) {
      const n = parseFloat(v);
      if (!Number.isFinite(n)) return NaN;
      return Math.round((n / (ok ? rate : 1)) * 100) / 100;
    },
  };
}
