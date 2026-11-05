import { useEffect, useState } from "react";
import Icon from "./Icon";
import { financialPlannerAPI } from "../utils/api";

// Analytics → Recap: how a month went. Income and spending against the month
// before, what was planned against what was paid, and the limits.
const shift = (ym, n) => {
  const [y, m] = ym.split("-").map(Number);
  const d = new Date(y, m - 1 + n, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
};
const label = ym => new Date(`${ym}-15T12:00:00`).toLocaleDateString("en-US", { month: "long", year: "numeric" });
const num = v => parseFloat(v) || 0;
const section = { fontSize: 12, fontWeight: 600, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.6px", margin: "18px 2px 8px" };

function Row({ name, value, sub, tone, first }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, padding: "12px 16px", borderTop: first ? "none" : "1px solid var(--border)" }}>
      <span style={{ minWidth: 0 }}>
        <span style={{ display: "block", fontSize: 14, fontWeight: 600, overflowWrap: "anywhere" }}>{name}</span>
        {sub && <span style={{ display: "block", fontSize: 12, color: "var(--muted)", marginTop: 1 }}>{sub}</span>}
      </span>
      <span style={{ fontSize: 14, fontWeight: 600, whiteSpace: "nowrap", color: tone || "var(--text)" }}>{value}</span>
    </div>
  );
}

export default function MonthRecap({ fmt }) {
  const [month, setMonth] = useState(null);           // null = the latest month with statements
  const [data, setData] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let live = true;
    setError("");
    financialPlannerAPI.getRecap(month)
      .then(d => { if (live) { setData(d); if (!month) setMonth(d.month); } })
      .catch(e => { if (live) { setData(null); setError(e.message || "Couldn't load that month."); } });
    return () => { live = false; };
  }, [month]);

  const r = data?.review;
  const change = (a, b, lowerIsGood) => {
    const d = num(a) - num(b);
    if (Math.abs(d) < 1) return { text: "same as the month before", tone: "var(--muted)" };
    const good = lowerIsGood ? d < 0 : d > 0;
    return { text: `${d > 0 ? "+" : "−"}${fmt(Math.abs(d))} vs ${label(r.compared_with).split(" ")[0]}`, tone: good ? "var(--pos-text)" : "var(--neg-text)" };
  };

  return (
    <div style={{ marginBottom: 28 }}>
      <div className="month-picker" role="group" aria-label="Month" style={{ marginBottom: 16, display: "inline-flex" }}>
        <button onClick={() => setMonth(m => shift(m || data?.month, -1))} aria-label="Previous month" disabled={!month}><Icon name="chevron-left" size={16} /></button>
        <span>{month ? label(month) : "…"}</span>
        <button onClick={() => setMonth(m => shift(m, 1))} aria-label="Next month" disabled={!month}><Icon name="chevron-right" size={16} /></button>
      </div>

      {error && <div className="card" style={{ fontSize: 13, color: "var(--muted)" }}>{error}</div>}
      {!error && !data && <div className="card" style={{ fontSize: 13, color: "var(--muted)" }}>Working out the month...</div>}
      {r && r.message && <div className="card" style={{ fontSize: 13, color: "var(--muted)" }}>{r.message}</div>}

      {r && !r.message && (() => {
        const saved = num(r.saved);
        const spent = change(r.spent, r.spent_last_month, true);
        const income = change(r.income, r.income_last_month, false);
        return (
          <>
            <div style={{ fontSize: 13, color: "var(--muted)" }}>{saved >= 0 ? "Saved" : "Overspent"} in {label(r.month).split(" ")[0]}</div>
            <div style={{ fontSize: "clamp(34px, 8vw, 46px)", fontWeight: 600, letterSpacing: "-1.4px", color: saved < 0 ? "#f87171" : "var(--text)" }}>
              {saved < 0 ? "−" : ""}{fmt(Math.abs(saved))}
            </div>
            {r.savings_rate_percent !== null && <div style={{ fontSize: 13, color: "var(--muted)", marginBottom: 6 }}>{Math.round(r.savings_rate_percent)}% of income</div>}

            <div style={section}>The month</div>
            <div className="card" style={{ padding: 0, overflow: "hidden" }}>
              <Row first name="Income" value={fmt(r.income)} sub={income.text} />
              <Row name="Spending" value={fmt(r.spent)} sub={spent.text} />
              {(num(r.interest_paid) + num(r.fees_paid)) > 0 && (
                <Row name="Interest and fees" value={fmt(num(r.interest_paid) + num(r.fees_paid))} sub="Charged by your cards and bank" tone="var(--neg-text)" />
              )}
              {num(r.roommate_contributions) > 0 && <Row name="Roommates paid you" value={fmt(r.roommate_contributions)} sub="Not counted as income" />}
              {data.cards && (() => {
                const c = num(data.cards.change);
                return <Row name="Card balances" value={`${c <= 0 ? "▼" : "▲"} ${fmt(Math.abs(c))}`}
                  sub={`${fmt(data.cards.end)} owed at month end, from your statements`} tone={c <= 0 ? "var(--pos-text)" : "var(--neg-text)"} />;
              })()}
            </div>

            {r.biggest_category_changes?.length > 0 && (
              <>
                <div style={section}>Biggest changes</div>
                <div className="card" style={{ padding: 0, overflow: "hidden" }}>
                  {r.biggest_category_changes.slice(0, 5).map((c, i) => {
                    const d = num(c.change);
                    return <Row key={c.name} first={!i} name={c.name} value={fmt(c.this_month)}
                      sub={`${d >= 0 ? "+" : "−"}${fmt(Math.abs(d))} vs the month before`} tone={d > 0 ? undefined : "var(--pos-text)"} />;
                  })}
                </div>
              </>
            )}

            {data.plan && (
              <>
                <div style={section}>Planned vs paid</div>
                <div className="card" style={{ padding: 0, overflow: "hidden" }}>
                  {data.plan.items.filter(p => p.category !== "income").slice(0, 12).map((p, i) => {
                    const diff = num(p.actual) - num(p.planned);
                    const missing = num(p.actual) === 0;
                    return <Row key={`${p.item}-${i}`} first={!i} name={p.item}
                      value={missing ? "Not found" : fmt(p.actual)}
                      sub={`Planned ${fmt(p.planned)}${!missing && Math.abs(diff) >= 1 ? ` · ${diff > 0 ? "+" : "−"}${fmt(Math.abs(diff))}` : ""}`}
                      tone={missing ? "var(--warn-text)" : diff > 1 ? "var(--neg-text)" : undefined} />;
                  })}
                </div>
                <div style={{ fontSize: 11, color: "var(--muted)", margin: "6px 2px 0" }}>
                  "Not found" means no matching payment on the statements you've uploaded.
                </div>
              </>
            )}

            {data.budgets?.length > 0 && (
              <>
                <div style={section}>Limits</div>
                <div className="card" style={{ padding: 0, overflow: "hidden" }}>
                  {data.budgets.map((b, i) => (
                    <Row key={b.id} first={!i} name={b.label} value={`${Math.round(b.percent_used)}%`}
                      sub={`${fmt(b.spent)} of ${fmt(b.limit)}`} tone={b.percent_used >= 100 ? "var(--neg-text)" : undefined} />
                  ))}
                </div>
              </>
            )}
          </>
        );
      })()}
    </div>
  );
}
