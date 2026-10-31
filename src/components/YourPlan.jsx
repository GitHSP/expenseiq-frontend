import { useEffect, useMemo, useState } from "react";
import { CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import Icon from "./Icon";
import { financialPlannerAPI } from "../utils/api";

// Analytics → Your plan: debt-free dates, card usage milestones, each debt's
// monthly payment, what a target date takes, assets and what could help next.
// The server does the sums, in CAD; this shows them in the app's currency.
// Typed amounts are in that currency too.
const YEARS = [1, 2, 3, 4, 5, 7, 10, 15];
const SCENARIOS = { pay: "Actual spending", planner: "Your Planner", pace: "Your amount", goal: "Your goal", minimums: "Minimums only" };
const num = v => parseFloat(v) || 0;

function load(key) {
  try { return localStorage.getItem(key); } catch { return null; }
}
function save(key, value) {
  try {
    if (value === null || value === "") localStorage.removeItem(key);
    else localStorage.setItem(key, value);
  } catch {}
}

const monthYear = iso => iso
  ? new Date(`${iso}T12:00:00`).toLocaleDateString("en-US", { month: "short", year: "numeric" })
  : "—";

function duration(months) {
  if (months === null || months === undefined) return "";
  if (months === 0) return "Now";
  const y = Math.floor(months / 12), m = months % 12;
  return [y ? `${y} yr${y === 1 ? "" : "s"}` : "", m ? `${m} mo${m === 1 ? "" : "s"}` : ""].filter(Boolean).join(" ");
}

const fieldStyle = {
  width: "100%", background: "var(--card)", border: "1px solid var(--border)", borderRadius: 8, padding: "9px 11px",
  fontSize: 13, color: "var(--text)", fontFamily: "inherit", boxSizing: "border-box",
};
const labelStyle = { display: "block", fontSize: 11, fontWeight: 600, color: "var(--muted2)", marginBottom: 5 };
const eyebrow = { fontSize: 11, fontWeight: 600, color: "var(--muted2)", textTransform: "uppercase", letterSpacing: "0.5px" };
const thCell = { padding: "8px 10px", fontSize: 11, fontWeight: 600, color: "var(--muted2)", textAlign: "right", borderBottom: "1px solid var(--border)", whiteSpace: "nowrap" };
const tdCell = { padding: "10px", fontSize: 13, color: "var(--text)", textAlign: "right", borderBottom: "1px solid var(--subtle2)", whiteSpace: "nowrap", fontVariantNumeric: "tabular-nums" };
const firstCol = { textAlign: "left", whiteSpace: "normal", minWidth: 120 };
const sectionGap = { marginBottom: 14 };

export default function YourPlan({ formatAmount, getRate = c => (c === "CAD" ? 1 : null), currency = "CAD" }) {
  const money = v => formatAmount ? formatAmount(num(v)) : `$${num(v).toFixed(2)}`;
  // Whole amounts: these are estimates, and cents would suggest otherwise.
  const fmt = v => money(Math.round(num(v))).replace(/\.00$/, "");
  const rate = currency === "CAD" ? 1 : (getRate(currency) || 1);

  // Saved in CAD, so they follow the app's currency.
  const [years, setYears] = useState(() => parseInt(load("glacier_plan_years"), 10) || 3);
  const [budgetCad, setBudgetCad] = useState(() => load("glacier_plan_budget"));
  const [hourlyCad, setHourlyCad] = useState(() => load("glacier_plan_hourly"));
  const [budgetText, setBudgetText] = useState("");
  const [hourlyText, setHourlyText] = useState("");
  const [chosen, setChosen] = useState(null);       // the scenario the tables show
  const [debtIds, setDebtIds] = useState(() => load("glacier_plan_debts") || "");   // "" = all
  const [plan, setPlan] = useState(null);
  const [worth, setWorth] = useState(null);
  const [error, setError] = useState("");

  const typed = cad => (cad === null || cad === "" ? "" : String(Math.round(num(cad) * rate * 100) / 100));
  useEffect(() => {
    setBudgetText(typed(budgetCad));
    setHourlyText(typed(hourlyCad));
    // Only when the currency changes: typing mustn't rewrite the box.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rate]);

  function changeMoney(text, setText, setCad, key) {
    setText(text);
    const value = parseFloat(text);
    const cad = text.trim() !== "" && value >= 0 ? String(value / rate) : null;
    setCad(cad);
    save(key, cad);
  }

  useEffect(() => {
    let live = true;
    const timer = setTimeout(() => {
      financialPlannerAPI.getOutlook({ targetMonths: years * 12, budget: budgetCad, debts: debtIds })
        .then(p => { if (live) { setPlan(p); setError(""); } })
        .catch(() => { if (live) setError("Couldn't load your plan. Try again in a moment."); });
    }, 350);
    return () => { live = false; clearTimeout(timer); };
  }, [years, budgetCad, debtIds]);

  useEffect(() => {
    let live = true;
    financialPlannerAPI.getNetWorth().then(w => { if (live) setWorth(w); }).catch(() => {});
    return () => { live = false; };
  }, []);

  const note = (
    <div style={{ fontSize: 12, color: "var(--muted2)", marginBottom: 14 }}>
      Estimates from your own data to help you decide, not financial advice.
    </div>
  );

  if (error) return <>{note}<div className="card" style={{ color: "#dc2626", fontSize: 13 }}>{error}</div></>;
  if (!plan) return <>{note}<div className="card" style={{ color: "var(--muted2)", fontSize: 13 }}>Working out your plan...</div></>;

  function chooseDebts(ids) {
    if (ids.length === 0) return;                   // always at least one
    const value = ids.length === plan.all_debts.length ? "" : ids.join(",");
    setDebtIds(value);
    save("glacier_plan_debts", value);
  }
  const { pace, goal } = plan.scenarios;
  const basis = plan.basis;
  const tabs = Object.keys(SCENARIOS).filter(id => id !== "pace" || basis.entered);
  // Show the pace unless it never finishes; then the goal is the useful view.
  const first = basis.entered ? "pace" : "pay";
  const view = tabs.includes(chosen) ? chosen : (pace.months ? first : "goal");
  const s = plan.scenarios[view];
  const spendsMore = basis.estimated_budget <= 0 && !basis.entered;
  const source = basis.source === "statements"
    ? `your average over ${basis.months.length} month${basis.months.length === 1 ? "" : "s"} of statements`
    : "the income and payments in your Planner";
  const withLimits = plan.debts.filter(d => d.limit);
  const noLimit = plan.debts.filter(d => d.is_card && !d.limit).length;
  const used = withLimits.reduce((t, d) => t + d.balance, 0);
  const limits = withLimits.reduce((t, d) => t + d.limit, 0);
  const overall = limits ? used / limits * 100 : null;
  const totalPayment = Object.values(s.debts).reduce((t, d) => t + d.payment, 0);

  return (
    <div style={{ marginBottom: 28 }}>
      {note}

      {!plan.has_debts ? (
        <div className="card" style={{ ...sectionGap, fontSize: 14, fontWeight: 600, color: "#059669" }}>
          No active debts in your Planner. You're debt-free.
        </div>
      ) : (
        <>
          {/* Headline figures */}
          <div className="card" style={{ ...sectionGap, display: "flex", flexWrap: "wrap", gap: 18 }}>
            <Kpi label="Debt-free" value={pace.months ? monthYear(pace.date) : "Not at this pace"} sub={pace.months ? `${duration(pace.months)} at ${fmt(pace.budget)}/month` : "at your current pace"} wide />
            <Kpi label="Total debt" value={fmt(plan.total_debt)} sub={`${plan.debts.length} debt${plan.debts.length === 1 ? "" : "s"}`} />
            <Kpi label="Interest a month" value={fmt(plan.monthly_interest)} sub="at today's balances" />
            {overall !== null && <Kpi label="Cards used" value={`${Math.round(overall)}%`} sub={`${fmt(used)} of ${fmt(limits)}`} />}
          </div>

          {spendsMore && (
            <div className="card" style={{ ...sectionGap, display: "flex", gap: 10, fontSize: 12, color: "var(--muted2)", lineHeight: 1.6 }}>
              <Icon name="warning" size={15} color="#d97706" style={{ flexShrink: 0, marginTop: 1 }} />
              <div>
                <strong style={{ color: "var(--text)" }}>Spending ({fmt(basis.living)}/month) looks higher than your pay ({fmt(basis.pay)}/month)</strong>, using {source}.
                Your own transfers or shared bills may be counted as spending, so check your rules in Accounts, or enter what you can really pay below.
              </div>
            </div>
          )}

          {/* Inputs */}
          <div className="card" style={{ ...sectionGap, display: "flex", flexWrap: "wrap", gap: 12 }}>
            <div style={{ flex: "1 1 130px" }}>
              <label style={labelStyle} htmlFor="plan-years">Goal: debt-free in</label>
              <select id="plan-years" style={fieldStyle} value={years}
                onChange={e => { const y = parseInt(e.target.value, 10); setYears(y); save("glacier_plan_years", String(y)); }}>
                {YEARS.map(y => <option key={y} value={y}>{y} year{y === 1 ? "" : "s"}</option>)}
              </select>
            </div>
            <div style={{ flex: "1 1 170px" }}>
              <label style={labelStyle} htmlFor="plan-budget">Total I can pay toward all debts ({currency}/month)</label>
              <input id="plan-budget" type="number" min="0" style={fieldStyle} value={budgetText}
                placeholder={`Estimated: ${Math.round(Math.max(basis.estimated_budget, 0) * rate)}`}
                onChange={e => changeMoney(e.target.value, setBudgetText, setBudgetCad, "glacier_plan_budget")} />
            </div>
            <div style={{ flex: "1 1 130px" }}>
              <label style={labelStyle} htmlFor="plan-hourly">Take-home per hour ({currency})</label>
              <input id="plan-hourly" type="number" min="0" style={fieldStyle} value={hourlyText} placeholder="Optional"
                onChange={e => changeMoney(e.target.value, setHourlyText, setHourlyCad, "glacier_plan_hourly")} />
            </div>
          </div>

          {/* Which debts to look at */}
          <DebtPicker debts={plan.all_debts} other={plan.other_payments} fmt={fmt} onChange={chooseDebts} />

          {/* Scenario switch drives everything below it */}
          <div style={{ ...sectionGap, display: "flex", flexWrap: "wrap", gap: 4, background: "var(--card)", border: "1px solid var(--border)", borderRadius: 10, padding: 4 }}>
            {tabs.map(id => {
              const label = SCENARIOS[id];
              const sc = plan.scenarios[id];
              return (
                <button key={id} onClick={() => setChosen(id)} aria-pressed={view === id} style={{
                  flex: "1 1 100px", background: view === id ? "#0070f3" : "transparent", color: view === id ? "#fff" : "var(--text)",
                  border: "none", borderRadius: 7, padding: "8px 10px", cursor: "pointer", fontFamily: "inherit", textAlign: "left",
                }}>
                  <div style={{ fontSize: 11, fontWeight: 600, opacity: 0.85 }}>{label}</div>
                  <div style={{ fontSize: 14, fontWeight: 700, marginTop: 1 }}>
                    {sc.months ? monthYear(sc.date) : id === "minimums" ? "Over 50 yrs" : "Not reached"}
                  </div>
                </button>
              );
            })}
          </div>

          {/* Current pay, with real spending and with the Planner's bills */}
          <Projection title="Projection with your current pay and actual spending" s={plan.scenarios.pay} fmt={fmt} rows={[
            { label: "Pay", sign: 1, amount: basis.pay, items: basis.breakdown.pay },
            { label: "Everyday spending (average from statements)", sign: -1, amount: basis.living, items: basis.breakdown.spending },
            { label: "Debt minimums", sign: -1, amount: plan.debts_need, items: basis.breakdown.minimums },
          ]} />
          <Projection title="Projection with your Planner" s={plan.scenarios.planner} fmt={fmt} rows={[
            { label: "Pay", sign: 1, amount: basis.planner_pay, items: basis.breakdown.pay },
            { label: "Recurring bills", sign: -1, amount: basis.planner_bills, items: basis.breakdown.bills },
            ...(num(basis.planner_savings) > 0 ? [{ label: "Emergency fund", sign: -1, amount: basis.planner_savings }] : []),
            { label: "Debt minimums", sign: -1, amount: plan.debts_need, items: basis.breakdown.minimums },
          ]} />

          {/* Balance over time */}
          <div className="card" style={sectionGap}>
            <div className="card-title" style={{ marginBottom: 2 }}>Total debt over time</div>
            <div style={{ fontSize: 12, color: "var(--muted2)", marginBottom: 12 }}>
              {s.months
                ? `${SCENARIOS[view]}: finished in ${duration(s.months)}, with ${fmt(s.interest)} more in interest.`
                : `${SCENARIOS[view]}: balances don't reach zero within 50 years.`}
            </div>
            <BalanceChart plan={plan} view={view} fmt={fmt} rate={rate} />
          </div>

          {/* Each debt's payment */}
          <div className="card" style={sectionGap}>
            <div className="card-title" style={{ marginBottom: 2 }}>Monthly payment to each debt</div>
            <div style={{ fontSize: 12, color: "var(--muted2)", marginBottom: 10 }}>
              {view === "minimums"
                ? "Next month's minimums. Card minimums fall as balances fall."
                : "Next month's split: minimums first, the rest to the highest rate. When a debt finishes, its payment moves to the next one."}
            </div>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr>
                    <th style={{ ...thCell, ...firstCol }}>Debt</th>
                    <th style={thCell}>Balance</th>
                    <th style={thCell}>Rate</th>
                    <th style={thCell}>Payment</th>
                    <th style={thCell}>Interest left</th>
                    <th style={thCell}>Finishes</th>
                  </tr>
                </thead>
                <tbody>
                  {plan.debts.map(d => {
                    const row = s.debts[d.id];
                    return (
                      <tr key={d.id}>
                        <td style={{ ...tdCell, ...firstCol, fontWeight: 600 }}>{d.name}</td>
                        <td style={tdCell}>{fmt(d.balance)}</td>
                        <td style={tdCell}>{d.rate}%</td>
                        <td style={{ ...tdCell, fontWeight: 700 }}>{fmt(row.payment)}</td>
                        <td style={tdCell}>{row.interest === null ? "—" : fmt(row.interest)}</td>
                        <td style={tdCell}>{row.months ? monthYear(row.date) : "—"}</td>
                      </tr>
                    );
                  })}
                  <tr>
                    <td style={{ ...tdCell, ...firstCol, fontWeight: 700, borderBottom: "none" }}>Total</td>
                    <td style={{ ...tdCell, fontWeight: 700, borderBottom: "none" }}>{fmt(plan.total_debt)}</td>
                    <td style={{ ...tdCell, borderBottom: "none" }} />
                    <td style={{ ...tdCell, fontWeight: 700, borderBottom: "none" }}>{fmt(totalPayment)}</td>
                    <td style={{ ...tdCell, fontWeight: 700, borderBottom: "none" }}>{s.interest === null ? "—" : fmt(s.interest)}</td>
                    <td style={{ ...tdCell, fontWeight: 700, borderBottom: "none" }}>{s.months ? monthYear(s.date) : "—"}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Card usage milestones */}
          {s.utilization && (
            <div className="card" style={sectionGap}>
              <div className="card-title" style={{ marginBottom: 2 }}>Time to get card usage down</div>
              <div style={{ fontSize: 12, color: "var(--muted2)", marginBottom: 10 }}>
                How long until each balance is under that share of its limit. Under 30% is the common guideline for credit scores.
                {noLimit > 0 && " Cards without a limit in the Planner aren't included."}
              </div>
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead>
                    <tr>
                      <th style={{ ...thCell, ...firstCol }}>Card</th>
                      <th style={thCell}>Now</th>
                      {plan.utilization_targets.map(t => <th key={t} style={thCell}>Under {t}%</th>)}
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td style={{ ...tdCell, ...firstCol, fontWeight: 700 }}>All cards</td>
                      <td style={{ ...tdCell, fontWeight: 700 }}>{Math.round(overall)}%</td>
                      {plan.utilization_targets.map(t => <Milestone key={t} hit={s.utilization.overall[t]} strong />)}
                    </tr>
                    {withLimits.map(d => (
                      <tr key={d.id}>
                        <td style={{ ...tdCell, ...firstCol, fontWeight: 600 }}>{d.name}</td>
                        <td style={tdCell}>{Math.round(d.utilization)}%</td>
                        {plan.utilization_targets.map(t => <Milestone key={t} hit={s.utilization.cards[d.id][t]} />)}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* What it takes */}
          <div className="card" style={sectionGap}>
            <div style={eyebrow}>Income needed to finish by {monthYear(goal.date)}</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 24, marginTop: 10 }}>
              <IncomeNeeded title="With your actual spending" fmt={fmt} hourly={hourlyCad} needed={plan.goal.income_needed} gap={plan.goal.income_gap}
                pay={basis.pay} toDebts={plan.goal.budget} other={plan.goal.other_payments} cost={basis.living} costLabel="everyday spending" />
              <IncomeNeeded title="With your Planner" fmt={fmt} hourly={hourlyCad} needed={plan.goal.planner_income_needed} gap={plan.goal.planner_income_gap}
                pay={basis.planner_pay} toDebts={plan.goal.budget} other={plan.goal.other_payments} cost={num(basis.planner_bills) + num(basis.planner_savings)}
                costLabel={num(basis.planner_savings) > 0 ? "recurring bills and fund savings" : "recurring bills"} />
            </div>
            <div style={{ fontSize: 11, color: "var(--muted2)", marginTop: 12 }}>
              {`Toward these debts: ${fmt(plan.goal.minimums)} minimums + ${fmt(Math.max(plan.goal.extra, 0))} extra. `}Everyday spending comes from {source}. Spending less lowers these by the same amount.
            </div>
          </div>
        </>
      )}

      <Assets worth={worth} maturities={plan.maturities} fmt={fmt} getRate={getRate} />

      {/* What could help next */}
      {plan.actions.length > 0 && (
        <div className="card">
          <div className="card-title" style={{ marginBottom: 6 }}>What to look at next</div>
          {plan.actions.map((a, i) => {
            const fill = text => text.replace(/\{(\w+)\}/g, (_, k) => fmt(a.amounts[k]));
            return (
              <div key={a.title} style={{ display: "flex", gap: 10, padding: "10px 0", borderTop: i ? "1px solid var(--subtle2)" : "none" }}>
                <Icon name={a.level === "warn" ? "warning" : "lightbulb"} size={15} color={a.level === "warn" ? "#d97706" : "#0070f3"} style={{ flexShrink: 0, marginTop: 1 }} />
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text)" }}>{fill(a.title)}</div>
                  <div style={{ fontSize: 12, color: "var(--muted2)", marginTop: 2, lineHeight: 1.5 }}>{fill(a.text)}</div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function DebtPicker({ debts, other, fmt, onChange }) {
  const ids = debts.filter(d => d.chosen).map(d => d.id);
  const cards = debts.filter(d => d.is_card).map(d => d.id);
  const loans = debts.filter(d => !d.is_card).map(d => d.id);
  const same = list => list.length === ids.length && list.every(id => ids.includes(id));
  const presets = [["All debts", debts.map(d => d.id)], ["Credit cards", cards], ["Loans and EMIs", loans]].filter(([, list]) => list.length > 0);
  return (
    <div className="card" style={sectionGap}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8, marginBottom: 10 }}>
        <div className="card-title">Debts to include</div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
          {presets.map(([label, list]) => (
            <button key={label} onClick={() => onChange(list)} aria-pressed={same(list)} style={{
              background: same(list) ? "#0070f3" : "var(--bg)", color: same(list) ? "#fff" : "var(--muted2)",
              border: "1px solid var(--border)", borderRadius: 6, padding: "5px 10px", fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "inherit",
            }}>{label}</button>
          ))}
        </div>
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: "6px 16px" }}>
        {debts.map(d => (
          <label key={d.id} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, color: "var(--text)", cursor: "pointer" }}>
            <input type="checkbox" checked={d.chosen} disabled={d.chosen && ids.length === 1}
              onChange={() => onChange(d.chosen ? ids.filter(id => id !== d.id) : [...ids, d.id])} />
            {d.name} <span style={{ color: "var(--muted2)", fontSize: 12 }}>{fmt(d.balance)}</span>
          </label>
        ))}
      </div>
      {num(other) > 0 && (
        <div style={{ fontSize: 12, color: "var(--muted2)", marginTop: 10, lineHeight: 1.5 }}>
          The debts you left out keep getting their {fmt(other)} a month, so that comes out first. Everything below is for the debts you chose.
        </div>
      )}
    </div>
  );
}

function IncomeNeeded({ title, fmt, hourly, needed, gap, pay, toDebts, other, cost, costLabel }) {
  const more = num(gap);
  const hours = hourly && num(hourly) > 0 && more > 0 ? more / num(hourly) : null;
  return (
    <div style={{ flex: "1 1 240px", minWidth: 0 }}>
      <div style={{ fontSize: 12, fontWeight: 600, color: "var(--muted2)" }}>{title}</div>
      <div style={{ fontSize: 24, fontWeight: 800, color: "var(--text)", marginTop: 3, letterSpacing: "-0.4px" }}>
        {fmt(needed)}<span style={{ fontSize: 13, fontWeight: 600, color: "var(--muted2)", letterSpacing: 0 }}> /month after tax</span>
      </div>
      <div style={{ fontSize: 13, color: "var(--muted2)", marginTop: 6, lineHeight: 1.6 }}>
        {fmt(toDebts)} toward {num(other) > 0 ? "these debts" : "debts"}{num(other) > 0 ? ` + ${fmt(other)} other debt payments` : ""} + {fmt(cost)} {costLabel}.{" "}
        {more > 0
          ? <>Your pay is {fmt(pay)}, so that's <strong style={{ color: "var(--text)" }}>{fmt(more)} more a month</strong>{hours !== null && <>, or about <strong style={{ color: "var(--text)" }}>{Math.ceil(hours)} extra hours a month</strong> ({Math.ceil(hours / (52 / 12))} a week)</>}.</>
          : <>Your pay of {fmt(pay)} already covers it, with {fmt(-more)} to spare.</>}
      </div>
    </div>
  );
}

function Projection({ title, s, fmt, rows }) {
  const [open, setOpen] = useState(null);
  const left = rows.reduce((t, r) => t + r.sign * num(r.amount), 0);
  const line = { display: "flex", justifyContent: "space-between", gap: 12, fontSize: 13, padding: "8px 0" };
  return (
    <div className="card" style={sectionGap}>
      <div style={eyebrow}>{title}</div>
      <div style={{ marginTop: 6 }}>
        {rows.map(r => (
          <div key={r.label} style={{ borderBottom: "1px solid var(--subtle2)" }}>
            {r.items?.length ? (
              <button onClick={() => setOpen(open === r.label ? null : r.label)} aria-expanded={open === r.label}
                style={{ ...line, width: "100%", background: "none", border: "none", cursor: "pointer", fontFamily: "inherit", color: "var(--text)", textAlign: "left" }}>
                <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}>
                  <Icon name={open === r.label ? "chevron-up" : "chevron-down"} size={13} />{r.label}
                </span>
                <strong style={{ whiteSpace: "nowrap" }}>{r.sign < 0 ? "-" : ""}{fmt(r.amount)}</strong>
              </button>
            ) : (
              <div style={{ ...line, color: "var(--text)", paddingLeft: 18 }}>
                <span>{r.label}</span><strong style={{ whiteSpace: "nowrap" }}>{r.sign < 0 ? "-" : ""}{fmt(r.amount)}</strong>
              </div>
            )}
            {open === r.label && (
              <div style={{ padding: "0 0 8px 18px" }}>
                {r.items.map((item, i) => (
                  <div key={`${item.label}-${i}`} style={{ display: "flex", justifyContent: "space-between", gap: 12, fontSize: 12, color: "var(--muted2)", padding: "3px 0" }}>
                    <span style={{ minWidth: 0, overflowWrap: "anywhere" }}>{item.label}</span>
                    <span style={{ whiteSpace: "nowrap" }}>{num(item.amount) < 0 ? `-${fmt(-num(item.amount))}` : fmt(item.amount)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
        <div style={{ ...line, fontWeight: 700, color: "var(--text)", paddingLeft: 18, fontSize: 14 }}>
          <span>{left >= 0 ? "Left over each month" : "Short each month"}</span>
          <span style={{ whiteSpace: "nowrap", color: left >= 0 ? "#059669" : "#dc2626" }}>{left < 0 ? "-" : ""}{fmt(Math.abs(left))}</span>
        </div>
      </div>
      <div style={{ fontSize: 13, color: "var(--muted2)", marginTop: 6, paddingTop: 10, borderTop: "1px solid var(--border)", lineHeight: 1.6 }}>
        {s.months
          ? <>Debt-free <strong style={{ color: "var(--text)" }}>{monthYear(s.date)}</strong> ({duration(s.months)}), with {fmt(s.interest)} more in interest, if {fmt(s.budget)} a month goes to the debts you chose (their minimums and everything left over).</>
          : <>These debts <strong style={{ color: "var(--text)" }}>don't get paid off</strong> this way, because there isn't enough left to cover the interest and minimums.</>}
      </div>
    </div>
  );
}

function Kpi({ label, value, sub, wide }) {
  return (
    <div style={{ flex: wide ? "1.4 1 170px" : "1 1 120px", minWidth: 0 }}>
      <div style={eyebrow}>{label}</div>
      <div style={{ fontSize: 22, fontWeight: 800, color: "var(--text)", marginTop: 4, letterSpacing: "-0.4px" }}>{value}</div>
      {sub && <div style={{ fontSize: 11, color: "var(--muted2)", marginTop: 2 }}>{sub}</div>}
    </div>
  );
}

function Milestone({ hit, strong }) {
  const done = hit.months === 0;
  return (
    <td style={{ ...tdCell, fontWeight: strong ? 700 : 400, whiteSpace: "nowrap" }}>
      {hit.months === null ? "—" : done
        ? <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}><Icon name="check-circle" size={12} color="#059669" />Already</span>
        : <>{monthYear(hit.date)}<div style={{ fontSize: 11, fontWeight: 400, color: "var(--muted2)" }}>{duration(hit.months)}</div></>}
    </td>
  );
}

// One axis, two lines: the chosen scenario, and minimums only for comparison.
const LINE_CHOSEN = "#0070f3";
const LINE_MINIMUMS = "#d97706";

function BalanceChart({ plan, view, fmt, rate }) {
  const data = useMemo(() => {
    const chosen = plan.scenarios[view].balances;
    const mins = plan.scenarios.minimums.balances;
    const start = new Date(`${plan.as_of}T12:00:00`);
    const months = Math.min(view === "minimums" ? mins.length : chosen.length, 180);
    const step = Math.max(1, Math.ceil(months / 60));
    const points = [];
    for (let m = 0; m <= months; m += step) {
      const d = new Date(start.getFullYear(), start.getMonth() + m, 1);
      const label = d.toLocaleDateString("en-US", { month: "short", year: "numeric" });
      const at = list => (m === 0 ? plan.total_debt : list[m - 1] ?? 0) * rate;
      points.push(view === "minimums"
        ? { label, minimums: at(mins) }
        : { label, chosen: at(chosen), minimums: at(mins) });
    }
    return points;
  }, [plan, view, rate]);

  const compact = v => new Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 1 }).format(v);
  return (
    <div style={{ width: "100%", height: 240 }}>
      <ResponsiveContainer>
        <LineChart data={data} margin={{ top: 6, right: 10, bottom: 0, left: 0 }}>
          <CartesianGrid vertical={false} stroke="var(--border2)" />
          <XAxis dataKey="label" tick={{ fontSize: 11, fill: "var(--muted2)" }} tickLine={false} axisLine={{ stroke: "var(--border)" }} minTickGap={50} />
          <YAxis tickFormatter={compact} tick={{ fontSize: 11, fill: "var(--muted2)" }} tickLine={false} axisLine={false} width={44} />
          <Tooltip
            formatter={(v, name) => [fmt(v / rate), name]}
            contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 12, color: "var(--text)" }}
            labelStyle={{ color: "var(--muted2)", marginBottom: 2 }} />
          <Legend iconType="plainline" wrapperStyle={{ fontSize: 12, color: "var(--muted2)" }} />
          {view !== "minimums" && <Line type="monotone" dataKey="chosen" name={SCENARIOS[view]} stroke={LINE_CHOSEN} strokeWidth={2} dot={false} activeDot={{ r: 4 }} isAnimationActive={false} />}
          <Line type="monotone" dataKey="minimums" name="Minimums only" stroke={LINE_MINIMUMS} strokeWidth={2} dot={false} activeDot={{ r: 4 }} isAnimationActive={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

function Assets({ worth, maturities, fmt, getRate }) {
  if (!worth) return null;
  const toCad = (v, cur) => {
    const r = cur === "CAD" ? 1 : getRate(cur);
    return r ? num(v) / r : 0;
  };
  const banks = worth.banks.reduce((s, b) => s + num(b.balance), 0);
  const invest = worth.investments.reduce((s, i) => s + toCad(i.worth, i.currency), 0);
  const debts = worth.debts.reduce((s, d) => s + num(d.balance), 0);
  const total = banks + invest - debts;
  const rows = [
    { label: "Bank balances", value: fmt(banks) },
    { label: "Investments", value: fmt(invest) },
    { label: "Debts", value: `-${fmt(debts)}` },
    { label: "Net worth", value: total < 0 ? `-${fmt(-total)}` : fmt(total), strong: true },
  ];
  return (
    <div className="card" style={sectionGap}>
      <div className="card-title" style={{ marginBottom: 12 }}>What you own and owe</div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 14 }}>
        {rows.map(r => (
          <div key={r.label} style={{ flex: "1 1 120px" }}>
            <div style={{ fontSize: 12, color: "var(--muted2)", fontWeight: 600 }}>{r.label}</div>
            <div style={{ fontSize: 17, fontWeight: r.strong ? 800 : 700, color: "var(--text)", marginTop: 3 }}>{r.value}</div>
          </div>
        ))}
      </div>
      {maturities.length > 0 && (
        <div style={{ marginTop: 14, paddingTop: 12, borderTop: "1px solid var(--subtle2)", fontSize: 12, color: "var(--muted2)", lineHeight: 1.7 }}>
          <div style={{ fontWeight: 600, color: "var(--text)" }}>Maturing in the next year</div>
          {maturities.map(m => (
            <div key={`${m.name}-${m.date}`}>{m.name}: {m.amount ? fmt(toCad(m.amount, m.currency)) : "amount not set"} on {monthYear(m.date)}</div>
          ))}
        </div>
      )}
    </div>
  );
}
