import { useEffect, useState } from "react";
import Icon from "./Icon";
import { financialPlannerAPI } from "../utils/api";

// A read-only look at next month, from the recurring payments and debts as they
// are now. Ticking and one-off items stay on this month's checklist.
export default function NextMonthPlan({ fmt, recurring, debts, labels = {}, icons = {} }) {
  const [plan, setPlan] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let live = true;
    financialPlannerAPI.getNextMonthPlan()
      .then(p => { if (live) { setPlan(p); setError(""); } })
      .catch(() => { if (live) setError("Couldn't load next month. Try again in a moment."); });
    return () => { live = false; };
  }, [recurring, debts]);

  if (error) return <div className="card" style={{ color: "#dc2626", fontSize: 13 }}>{error}</div>;
  if (!plan) return <div className="card" style={{ color: "var(--muted)", fontSize: 13 }}>Loading next month...</div>;

  const title = new Date(plan.year, plan.month - 1).toLocaleDateString("en-US", { month: "long", year: "numeric" });
  const shortMonth = new Date(plan.year, plan.month - 1).toLocaleDateString("en-US", { month: "short" });
  const left = parseFloat(plan.left_over) || 0;
  const hasIncome = plan.income.length > 0;

  return (
    <>
      <div style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: "var(--text)", letterSpacing: "-0.2px" }}>{title}</div>
        <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 2 }}>
          A preview from your recurring payments and debts. It updates when you change them.
        </div>
      </div>

      <div className="card" style={{ marginBottom: 12, display: "flex", flexWrap: "wrap", gap: 20 }}>
        <Stat label="Planned income" value={hasIncome ? fmt(plan.income_total) : "None added"} color="#059669"
          sub={hasIncome ? `${plan.income.length} pay${plan.income.length === 1 ? "" : "s"}` : "Add it in Recurring"} />
        <Stat label="Payments" value={fmt(plan.payments_total)} sub={`${plan.payments.length} item${plan.payments.length === 1 ? "" : "s"}`} />
        {hasIncome && (
          <Stat label={left < 0 ? "Short by" : "Left over"} value={fmt(Math.abs(left))} color={left < 0 ? "#dc2626" : "#059669"}
            sub={left < 0 ? "payments are more than income" : plan.extra_to ? `extra payment to ${plan.extra_to}` : null} />
        )}
      </div>

      <div className="card">
        {plan.payments.length === 0 ? (
          <div style={{ fontSize: 13, color: "var(--muted)" }}>Nothing planned yet. Add payments in the Recurring tab.</div>
        ) : plan.payments.map((r, i) => (
          <div key={`${r.label}-${i}`} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, padding: "10px 0",
            borderTop: i ? "1px solid var(--subtle2)" : "none" }}>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text)", overflowWrap: "anywhere" }}>{r.label}</div>
              <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 2, display: "flex", alignItems: "center", gap: 4, flexWrap: "wrap" }}>
                {icons[r.category] && <Icon name={icons[r.category]} size={10} />}
                {labels[r.category] || r.category}
                {r.due_day ? ` · ${shortMonth} ${r.due_day}` : ""}
                {r.is_auto_debit ? " · auto-debit" : ""}
              </div>
            </div>
            <div style={{ fontSize: 14, fontWeight: 700, color: "var(--text)", whiteSpace: "nowrap" }}>{fmt(r.amount, r)}</div>
          </div>
        ))}
      </div>
    </>
  );
}

function Stat({ label, value, sub, color = "var(--text)" }) {
  return (
    <div style={{ flex: "1 1 130px" }}>
      <div style={{ fontSize: 11, fontWeight: 600, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.4px" }}>{label}</div>
      <div style={{ fontSize: 20, fontWeight: 700, color, marginTop: 3 }}>{value}</div>
      {sub && <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 2 }}>{sub}</div>}
    </div>
  );
}
