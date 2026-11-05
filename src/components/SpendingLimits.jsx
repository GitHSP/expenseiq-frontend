import { useCallback, useEffect, useState } from "react";
import Icon from "./Icon";
import { CATEGORIES } from "../constants/categories";
import { financialPlannerAPI } from "../utils/api";

// Planner → Limits: a monthly limit per spending category, and how much of it
// this month has used. Amounts are typed in the app's currency and saved in CAD.
export default function SpendingLimits({ fmt, currency = "CAD", getRate = c => (c === "CAD" ? 1 : null) }) {
  const rate = currency === "CAD" ? 1 : (getRate(currency) || 1);
  const [data, setData] = useState(null);
  const [form, setForm] = useState({ category: "", amount: "" });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(() => {
    financialPlannerAPI.getBudgets().then(setData).catch(() => setError("Couldn't load your limits."));
  }, []);
  useEffect(() => { load(); }, [load]);

  async function add(e) {
    e.preventDefault();
    const amount = parseFloat(form.amount);
    if (!form.category || !(amount > 0)) return;
    setBusy(true);
    setError("");
    try {
      await financialPlannerAPI.addBudget({ category: form.category, monthly_limit: (amount / rate).toFixed(2) });
      setForm({ category: "", amount: "" });
      load();
    } catch (err) {
      setError(err.message || "Couldn't save that limit.");
    } finally {
      setBusy(false);
    }
  }

  async function remove(id) {
    setBusy(true);
    try { await financialPlannerAPI.deleteBudget(id); load(); } finally { setBusy(false); }
  }

  const budgets = data?.budgets || [];
  const used = new Set(budgets.map(b => b.category));
  const field = { background: "var(--card)", border: "1px solid var(--border)", borderRadius: 8, padding: "10px 11px",
                  fontSize: 14, color: "var(--text)", fontFamily: "inherit", boxSizing: "border-box" };

  return (
    <>
      <div style={{ fontSize: 13, color: "var(--muted)", marginBottom: 12, lineHeight: 1.5 }}>
        Set a monthly limit for a category. You'll see it fill up here, and on the Dashboard once it's 80% used.
      </div>

      <form onSubmit={add} className="card" style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 16 }}>
        <select value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
          aria-label="Category" style={{ ...field, flex: "2 1 180px" }}>
          <option value="">Choose a category</option>
          {CATEGORIES.map(c => <option key={c.name} value={c.name}>{c.name}{used.has(c.name) ? " (update)" : ""}</option>)}
        </select>
        <input type="number" min="1" inputMode="decimal" value={form.amount} placeholder={`Limit a month (${currency})`}
          aria-label="Monthly limit" onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} style={{ ...field, flex: "1 1 130px" }} />
        <button className="btn-primary" disabled={busy || !form.category || !(parseFloat(form.amount) > 0)} style={{ padding: "10px 16px" }}>
          Save limit
        </button>
      </form>
      {error && <div style={{ fontSize: 13, color: "var(--neg-text)", marginBottom: 12 }}>{error}</div>}

      {data && budgets.length === 0 && (
        <div className="empty-state">
          <div className="empty-icon"><Icon name="target" size={40} strokeWidth={1.5} /></div>
          <div style={{ fontSize: 13, color: "var(--muted)" }}>No limits yet. Start with the category you spend most on.</div>
        </div>
      )}

      {budgets.length > 0 && (
        <div className="card" style={{ padding: 0, overflow: "hidden" }}>
          {budgets.map((b, i) => {
            const pct = Math.min(b.percent_used, 100);
            const over = b.percent_used >= 100, near = b.percent_used >= 80;
            const bar = over ? "#ef4444" : near ? "#f59e0b" : "var(--accent)";
            const left = parseFloat(b.left);
            return (
              <div key={b.id} style={{ padding: "14px 16px", borderTop: i ? "1px solid var(--border)" : "none" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 10 }}>
                  <span style={{ fontSize: 15, fontWeight: 600 }}>{b.label}</span>
                  <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
                    <span style={{ fontSize: 14, fontWeight: 600, whiteSpace: "nowrap" }}>{fmt(b.spent)} <span style={{ color: "var(--muted)", fontWeight: 500 }}>of {fmt(b.limit)}</span></span>
                    <button className="btn-ghost" disabled={busy} onClick={() => remove(b.id)} aria-label={`Remove the ${b.label} limit`}
                      style={{ padding: "4px 6px", color: "var(--muted)" }}><Icon name="trash" size={13} /></button>
                  </span>
                </div>
                <div style={{ background: "var(--subtle2)", borderRadius: 100, height: 8, overflow: "hidden", margin: "8px 0 6px" }}>
                  <div style={{ height: "100%", width: `${pct}%`, background: bar, borderRadius: 100 }} />
                </div>
                <div style={{ fontSize: 12, color: over ? "var(--neg-text)" : near ? "var(--warn-text)" : "var(--muted)" }}>
                  {over ? `${fmt(-left)} over this month` : `${fmt(left)} left this month`}
                  {!over && parseFloat(b.projected_month_end) > parseFloat(b.limit) ? ` · on pace for ${fmt(b.projected_month_end)}` : ""}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </>
  );
}
