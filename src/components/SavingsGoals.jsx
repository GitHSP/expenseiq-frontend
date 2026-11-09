import { useCallback, useEffect, useState } from "react";
import Icon from "./Icon";
import { financialPlannerAPI } from "../utils/api";

// Planner → Savings: goals like a trip or a deposit. Each shows what's saved,
// what's left, and what to put aside each month to make the date. Amounts are
// typed in the app's currency and kept in CAD.
const field = { background: "var(--card)", border: "1px solid var(--border)", borderRadius: 8, padding: "10px 11px",
                fontSize: 14, color: "var(--text)", fontFamily: "inherit", boxSizing: "border-box" };

export default function SavingsGoals({ fmt, currency = "CAD", getRate = c => (c === "CAD" ? 1 : null) }) {
  const rate = currency === "CAD" ? 1 : (getRate(currency) || 1);
  const [goals, setGoals] = useState(null);
  const [form, setForm] = useState({ name: "", target: "", date: "" });
  const [adding, setAdding] = useState({});              // goal id -> amount being typed
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  const load = useCallback(() => {
    financialPlannerAPI.getGoals().then(g => setGoals(Array.isArray(g) ? g : g.results || [])).catch(() => setErr("Couldn't load your goals."));
  }, []);
  useEffect(() => { load(); }, [load]);

  async function run(fn) {
    setBusy(true); setErr("");
    try { await fn(); load(); } catch (e) { setErr(e.message || "Couldn't save that."); } finally { setBusy(false); }
  }

  const toCad = v => (parseFloat(v) / rate).toFixed(2);
  const monthYear = iso => new Date(`${iso}T12:00:00`).toLocaleDateString("en-US", { month: "short", year: "numeric" });

  return (
    <div style={{ marginTop: 20 }}>
      <div style={{ fontSize: 12, fontWeight: 600, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.6px", margin: "0 2px 8px" }}>
        Savings goals
      </div>

      {goals && goals.length > 0 && (
        <div className="card" style={{ padding: 0, overflow: "hidden", marginBottom: 12 }}>
          {goals.map((g, i) => {
            const pct = Math.min(g.percent, 100), done = pct >= 100;
            const typed = adding[g.id] ?? "";
            return (
              <div key={g.id} style={{ padding: "14px 16px", borderTop: i ? "1px solid var(--border)" : "none" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 10 }}>
                  <span style={{ fontSize: 15, fontWeight: 600, minWidth: 0, overflowWrap: "anywhere" }}>{g.name}</span>
                  <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                    <span style={{ fontSize: 14, fontWeight: 600, whiteSpace: "nowrap" }}>
                      {fmt(g.saved)} <span style={{ color: "var(--muted)", fontWeight: 500 }}>of {fmt(g.target)}</span>
                    </span>
                    <button className="btn-ghost" disabled={busy} aria-label={`Delete the ${g.name} goal`} style={{ padding: "4px 6px", color: "var(--muted)" }}
                      onClick={() => window.confirm(`Delete the ${g.name} goal?`) && run(() => financialPlannerAPI.deleteGoal(g.id))}>
                      <Icon name="trash" size={13} />
                    </button>
                  </span>
                </div>
                <div style={{ background: "var(--subtle2)", borderRadius: 100, height: 8, overflow: "hidden", margin: "8px 0 6px" }}>
                  <div style={{ height: "100%", width: `${pct}%`, background: done ? "#10b981" : "var(--accent)", borderRadius: 100 }} />
                </div>
                <div style={{ fontSize: 12, color: done ? "var(--pos-text)" : "var(--muted)" }}>
                  {done ? "Reached. Well done!"
                    : g.monthly ? `Put aside ${fmt(g.monthly)} a month to reach it by ${monthYear(g.target_date)}`
                    : g.target_date ? `${fmt(g.left)} left · due ${monthYear(g.target_date)}` : `${fmt(g.left)} left`}
                </div>
                {!done && (
                  <div style={{ display: "flex", gap: 6, marginTop: 10 }}>
                    <input type="number" min="0" inputMode="decimal" value={typed} placeholder={`Add (${currency})`}
                      aria-label={`Amount to add to ${g.name}`} style={{ ...field, flex: "1 1 auto", minWidth: 0, padding: "8px 10px" }}
                      onChange={e => setAdding(a => ({ ...a, [g.id]: e.target.value }))} />
                    <button className="btn-secondary" disabled={busy || !(parseFloat(typed) > 0)} style={{ padding: "8px 14px", fontSize: 13 }}
                      onClick={() => run(async () => {
                        await financialPlannerAPI.updateGoal(g.id, { add: toCad(typed) });
                        setAdding(a => ({ ...a, [g.id]: "" }));
                      })}>
                      Add
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      <form className="card" style={{ display: "flex", gap: 8, flexWrap: "wrap" }}
        onSubmit={e => {
          e.preventDefault();
          run(async () => {
            await financialPlannerAPI.addGoal({ name: form.name.trim(), target: toCad(form.target), target_date: form.date || null });
            setForm({ name: "", target: "", date: "" });
          });
        }}>
        <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} maxLength={60}
          placeholder="New goal, e.g. Trip home" aria-label="Goal name" style={{ ...field, flex: "2 1 160px" }} />
        <input type="number" min="1" inputMode="decimal" value={form.target} onChange={e => setForm(f => ({ ...f, target: e.target.value }))}
          placeholder={`Target (${currency})`} aria-label="Target amount" style={{ ...field, flex: "1 1 110px" }} />
        <input type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))}
          aria-label="Target date (optional)" style={{ ...field, flex: "1 1 140px" }} />
        <button className="btn-primary" disabled={busy || form.name.trim().length < 2 || !(parseFloat(form.target) > 0)} style={{ padding: "10px 16px" }}>
          Add goal
        </button>
      </form>
      {err && <div style={{ fontSize: 12, color: "var(--neg-text)", marginTop: 8 }}>{err}</div>}
    </div>
  );
}
