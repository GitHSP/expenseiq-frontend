import { useEffect, useMemo, useState } from "react";
import { CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import Icon from "./Icon";
import { financialPlannerAPI } from "../utils/api";

// Analytics → Your plan. The answer comes first: when you're done, what to pay
// each month and where the extra goes. Everything else opens on demand.
// The server does the sums, in CAD; this shows them in the app's currency.
const YEARS = [1, 2, 3, 4, 5, 7, 10, 15];
const SCENARIOS = { planner: "Your Planner", pay: "Actual spending", pace: "Your amount", goal: "Your goal", minimums: "Minimums only" };
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
  width: "100%", background: "var(--card)", border: "1px solid var(--border)", borderRadius: 8, padding: "10px 11px",
  fontSize: 14, color: "var(--text)", fontFamily: "inherit", boxSizing: "border-box",
};
const labelStyle = { display: "block", fontSize: 11, fontWeight: 600, color: "var(--muted2)", marginBottom: 5 };
const eyebrow = { fontSize: 11, fontWeight: 600, color: "var(--muted2)", textTransform: "uppercase", letterSpacing: "0.5px" };
const sectionGap = { marginBottom: 12 };
const tapStyle = { touchAction: "manipulation", WebkitTapHighlightColor: "transparent", cursor: "pointer", fontFamily: "inherit" };
const EXTRA = "#059669";

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
  const [chosen, setChosen] = useState(null);       // the scenario shown
  const [debtIds, setDebtIds] = useState(() => load("glacier_plan_debts") || "");   // "" = all
  const [plan, setPlan] = useState(null);
  const [updating, setUpdating] = useState(false);
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
    setUpdating(true);
    const timer = setTimeout(() => {
      financialPlannerAPI.getOutlook({ targetMonths: years * 12, budget: budgetCad, debts: debtIds })
        .then(p => { if (live) { setPlan(p); setError(""); setUpdating(false); } })
        .catch(() => { if (live) { setError("Couldn't load your plan. Try again in a moment."); setUpdating(false); } });
    }, 250);
    return () => { live = false; clearTimeout(timer); };
  }, [years, budgetCad, debtIds]);

  useEffect(() => {
    let live = true;
    financialPlannerAPI.getNetWorth().then(w => { if (live) setWorth(w); }).catch(() => {});
    return () => { live = false; };
  }, []);

  if (error && !plan) return <div className="card" style={{ color: "#dc2626", fontSize: 13 }}>{error}</div>;
  if (!plan) return <div className="card" style={{ color: "var(--muted2)", fontSize: 13 }}>Working out your plan...</div>;

  // The ticks follow what's tapped right away; the numbers catch up from the server.
  const allIds = plan.all_debts.map(d => d.id);
  const selected = debtIds ? debtIds.split(",").map(Number).filter(id => allIds.includes(id)) : allIds;
  function chooseDebts(ids) {
    if (ids.length === 0) return;                   // always at least one
    const value = ids.length === allIds.length ? "" : ids.join(",");
    setDebtIds(value);
    save("glacier_plan_debts", value);
  }

  const basis = plan.basis;
  const tabs = Object.keys(SCENARIOS).filter(id => id !== "pace" || basis.entered);
  const view = tabs.includes(chosen) ? chosen : (basis.entered ? "pace" : "planner");
  const s = plan.scenarios[view];
  const goal = plan.scenarios.goal;
  const source = basis.source === "statements"
    ? `your average over ${basis.months.length} month${basis.months.length === 1 ? "" : "s"} of statements`
    : "the income and payments in your Planner";
  const rows = plan.debts.map(d => ({ ...d, ...s.debts[d.id] }));
  const totalMinimum = rows.reduce((t, d) => t + d.minimum, 0);
  const totalExtra = rows.reduce((t, d) => t + d.extra, 0);
  const totalPayment = rows.reduce((t, d) => t + d.payment, 0);
  const extraTo = rows.filter(d => d.extra >= 1).sort((a, b) => b.extra - a.extra);
  const withLimits = plan.debts.filter(d => d.limit);
  const noLimit = plan.debts.filter(d => d.is_card && !d.limit).length;
  const used = withLimits.reduce((t, d) => t + d.balance, 0);
  const limits = withLimits.reduce((t, d) => t + d.limit, 0);
  const overall = limits ? used / limits * 100 : null;

  return (
    <div style={{ marginBottom: 28 }}>
      {!plan.has_debts ? (
        <div className="card" style={{ ...sectionGap, fontSize: 14, fontWeight: 600, color: EXTRA }}>
          No active debts in your Planner. You're debt-free.
        </div>
      ) : (
        <>
          <DebtPicker debts={plan.all_debts} selected={selected} other={plan.other_payments} fmt={fmt} onChange={chooseDebts} />

          {/* Which money the plan is based on */}
          <div style={{ ...sectionGap, display: "flex", gap: 6, overflowX: "auto", WebkitOverflowScrolling: "touch", paddingBottom: 2 }}>
            {tabs.map(id => (
              <button key={id} onClick={() => setChosen(id)} aria-pressed={view === id} style={{
                ...tapStyle, flex: "0 0 auto", minHeight: 40, background: view === id ? "var(--accent)" : "var(--card)", color: view === id ? "var(--accent-ink)" : "var(--text)",
                border: `1px solid ${view === id ? "var(--accent)" : "var(--border)"}`, borderRadius: 20, padding: "0 14px", fontSize: 13, fontWeight: 600,
              }}>{SCENARIOS[id]}</button>
            ))}
          </div>

          {/* The answer */}
          <div className="card" style={{ ...sectionGap, opacity: updating ? 0.6 : 1, transition: "opacity 0.15s" }}>
            <div style={eyebrow}>{plan.other_payments > 0 ? "Chosen debts done by" : "Debt-free by"}</div>
            <div style={{ fontSize: 32, fontWeight: 800, letterSpacing: "-0.6px", color: s.months ? "var(--text)" : "#dc2626", marginTop: 2 }}>
              {s.months ? monthYear(s.date) : "Not reached"}
            </div>
            <div style={{ fontSize: 13, color: "var(--muted2)", marginTop: 2 }}>
              {s.months
                ? `${duration(s.months)}, with ${fmt(s.interest)} more in interest`
                : `There isn't enough left to clear ${fmt(plan.total_debt)} at this amount`}
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 8, marginTop: 14 }}>
              <Tile label="Pay a month" value={fmt(totalPayment)} strong />
              <Tile label="Minimums" value={fmt(totalMinimum)} />
              <Tile label="Extra" value={fmt(totalExtra)} color={totalExtra >= 1 ? EXTRA : undefined} />
            </div>
            {extraTo.length > 0 && (
              <div style={{ fontSize: 14, color: "var(--text)", marginTop: 12, lineHeight: 1.5 }}>
                Put the extra on {extraTo.map((d, i) => (
                  <span key={d.id}>{i > 0 ? ", then " : ""}<strong>{d.name}</strong> (<strong style={{ color: EXTRA }}>{fmt(d.extra)}</strong>)</span>
                ))}.
              </div>
            )}
            {view === "pay" && basis.estimated_budget <= 0 && !basis.entered && (
              <div style={{ fontSize: 12, color: "var(--warn-text)", marginTop: 10, lineHeight: 1.5 }}>
                Spending ({fmt(basis.living)}) looks higher than pay ({fmt(basis.pay)}). Your own transfers may be counted as spending, so check Accounts → Rules.
              </div>
            )}
          </div>

          {/* Each debt */}
          <div className="card" style={{ ...sectionGap, opacity: updating ? 0.6 : 1, transition: "opacity 0.15s" }}>
            <div className="card-title" style={{ marginBottom: 2 }}>What to pay on each debt</div>
            <div style={{ fontSize: 12, color: "var(--muted2)", marginBottom: 6 }}>Next month. When one finishes, its payment moves to the next.</div>
            {rows.map(d => (
              <div key={d.id} style={{ padding: "10px 0", borderTop: "1px solid var(--subtle2)" }}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "baseline" }}>
                  <div style={{ fontSize: 14, fontWeight: 600, color: "var(--text)", minWidth: 0, overflowWrap: "anywhere" }}>{d.name}</div>
                  <div style={{ fontSize: 15, fontWeight: 800, color: "var(--text)", whiteSpace: "nowrap" }}>{fmt(d.payment)}</div>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap", fontSize: 12, color: "var(--muted2)", marginTop: 2 }}>
                  <span>{fmt(d.balance)} at {d.rate}%{d.months ? ` · done ${monthYear(d.date)}` : ""}</span>
                  <span style={{ whiteSpace: "nowrap" }}>
                    {fmt(d.minimum)} min{d.extra >= 1 && <strong style={{ color: EXTRA }}> + {fmt(d.extra)} extra</strong>}
                  </span>
                </div>
              </div>
            ))}
          </div>

          {/* Card usage */}
          {s.utilization && (
            <div className="card" style={{ ...sectionGap, opacity: updating ? 0.6 : 1, transition: "opacity 0.15s" }}>
              <div className="card-title" style={{ marginBottom: 2 }}>Getting card usage down</div>
              <div style={{ fontSize: 12, color: "var(--muted2)", marginBottom: 6 }}>
                The amount to pay down and when you'd get there. Under 30% is the common credit score guideline.
                {noLimit > 0 && " Cards without a limit in the Planner aren't included."}
              </div>
              <UsageRow name="All cards" percent={overall} hits={s.utilization.overall} targets={plan.utilization_targets} fmt={fmt} strong />
              {withLimits.map(d => (
                <UsageRow key={d.id} name={d.name} percent={d.utilization} hits={s.utilization.cards[d.id]} targets={plan.utilization_targets} fmt={fmt} />
              ))}
            </div>
          )}

          {/* Everything else opens on demand */}
          <Details title="Change my goal or amount" sub={`Goal: ${years} year${years === 1 ? "" : "s"}${basis.entered ? `, paying ${fmt(basis.budget + num(plan.other_payments))} a month` : ""}`}>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 12 }}>
              <div style={{ flex: "1 1 130px" }}>
                <label style={labelStyle} htmlFor="plan-years">Goal: debt-free in</label>
                <select id="plan-years" style={fieldStyle} value={years}
                  onChange={e => { const y = parseInt(e.target.value, 10); setYears(y); save("glacier_plan_years", String(y)); }}>
                  {YEARS.map(y => <option key={y} value={y}>{y} year{y === 1 ? "" : "s"}</option>)}
                </select>
              </div>
              <div style={{ flex: "1 1 170px" }}>
                <label style={labelStyle} htmlFor="plan-budget">Total I can pay on all debts ({currency}/month)</label>
                <input id="plan-budget" type="number" min="0" inputMode="decimal" style={fieldStyle} value={budgetText}
                  placeholder={`Minimums are ${Math.round(num(plan.debts_need) * rate)}`}
                  onChange={e => changeMoney(e.target.value, setBudgetText, setBudgetCad, "glacier_plan_budget")} />
              </div>
              <div style={{ flex: "1 1 130px" }}>
                <label style={labelStyle} htmlFor="plan-hourly">Take-home per hour ({currency})</label>
                <input id="plan-hourly" type="number" min="0" inputMode="decimal" style={fieldStyle} value={hourlyText} placeholder="Optional"
                  onChange={e => changeMoney(e.target.value, setHourlyText, setHourlyCad, "glacier_plan_hourly")} />
              </div>
            </div>
          </Details>

          <Details title="Where the money comes from" sub="Pay, bills and what's left over">
            <Projection title="With your Planner" s={plan.scenarios.planner} fmt={fmt} rows={[
              { label: "Pay", sign: 1, amount: basis.planner_pay, items: basis.breakdown.pay },
              { label: "Recurring bills", sign: -1, amount: basis.planner_bills, items: basis.breakdown.bills },
              ...(num(basis.planner_savings) > 0 ? [{ label: "Emergency fund", sign: -1, amount: basis.planner_savings }] : []),
              { label: "Debt minimums", sign: -1, amount: plan.debts_need, items: basis.breakdown.minimums },
            ]} />
            <div style={{ height: 18 }} />
            <Projection title="With your actual spending" s={plan.scenarios.pay} fmt={fmt} rows={[
              { label: "Pay", sign: 1, amount: basis.pay, items: basis.breakdown.pay },
              { label: "Everyday spending", sign: -1, amount: basis.living, items: basis.breakdown.spending },
              { label: "Debt minimums", sign: -1, amount: plan.debts_need, items: basis.breakdown.minimums },
            ]} />
          </Details>

          <Details title={`Income needed to finish by ${monthYear(goal.date)}`} sub={`${fmt(plan.goal.planner_income_needed)} a month with your Planner`}>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 20 }}>
              <IncomeNeeded title="With your Planner" fmt={fmt} hourly={hourlyCad} needed={plan.goal.planner_income_needed} gap={plan.goal.planner_income_gap}
                pay={basis.planner_pay} toDebts={plan.goal.budget} other={plan.goal.other_payments} cost={num(basis.planner_bills) + num(basis.planner_savings)}
                costLabel={num(basis.planner_savings) > 0 ? "bills and fund savings" : "bills"} />
              <IncomeNeeded title="With your actual spending" fmt={fmt} hourly={hourlyCad} needed={plan.goal.income_needed} gap={plan.goal.income_gap}
                pay={basis.pay} toDebts={plan.goal.budget} other={plan.goal.other_payments} cost={basis.living} costLabel="spending" />
            </div>
            <div style={{ fontSize: 11, color: "var(--muted2)", marginTop: 10 }}>
              {`Toward these debts: ${fmt(plan.goal.minimums)} minimums + ${fmt(Math.max(plan.goal.extra, 0))} extra. Spending comes from ${source}.`}
            </div>
          </Details>

          <Details title="Debt over time" sub="Chart compared with minimums only">
            <BalanceChart plan={plan} view={view} fmt={fmt} rate={rate} />
          </Details>
        </>
      )}

      {worth && (
        <Details title="What you own and owe" sub={netWorthLine(worth, fmt, getRate)}>
          <Assets worth={worth} maturities={plan.maturities} fmt={fmt} getRate={getRate} />
        </Details>
      )}

      {plan.actions.length > 0 && (
        <Details title="What to look at next" sub={`${plan.actions.length} thing${plan.actions.length === 1 ? "" : "s"}`}>
          {plan.actions.map((a, i) => {
            const fill = text => text.replace(/\{(\w+)\}/g, (_, k) => fmt(a.amounts[k]));
            return (
              <div key={a.title} style={{ display: "flex", gap: 10, padding: "10px 0", borderTop: i ? "1px solid var(--subtle2)" : "none" }}>
                <Icon name={a.level === "warn" ? "warning" : "lightbulb"} size={15} color={a.level === "warn" ? "#d97706" : "var(--accent)"} style={{ flexShrink: 0, marginTop: 1 }} />
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text)" }}>{fill(a.title)}</div>
                  <div style={{ fontSize: 12, color: "var(--muted2)", marginTop: 2, lineHeight: 1.5 }}>{fill(a.text)}</div>
                </div>
              </div>
            );
          })}
        </Details>
      )}

      <div style={{ fontSize: 11, color: "var(--muted2)", marginTop: 12 }}>Estimates from your own data to help you decide, not financial advice.</div>
    </div>
  );
}

function Tile({ label, value, color = "var(--text)", strong }) {
  return (
    <div style={{ background: "var(--subtle)", border: "1px solid var(--subtle2)", borderRadius: 10, padding: "10px 7px", minWidth: 0 }}>
      <div style={{ fontSize: 11, fontWeight: 600, color: "var(--muted2)" }}>{label}</div>
      <div style={{ fontSize: strong ? 15 : 14, fontWeight: 800, color, marginTop: 2, whiteSpace: "nowrap", letterSpacing: "-0.3px" }}>{value}</div>
    </div>
  );
}

function Details({ title, sub, children }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="card" style={{ ...sectionGap, padding: 0, overflow: "hidden" }}>
      <button onClick={() => setOpen(o => !o)} aria-expanded={open} style={{
        ...tapStyle, width: "100%", background: "none", border: "none", padding: "14px 16px", display: "flex",
        justifyContent: "space-between", alignItems: "center", gap: 10, textAlign: "left", color: "var(--text)",
      }}>
        <span style={{ minWidth: 0 }}>
          <span style={{ display: "block", fontSize: 14, fontWeight: 700 }}>{title}</span>
          {sub && <span style={{ display: "block", fontSize: 12, color: "var(--muted2)", marginTop: 1 }}>{sub}</span>}
        </span>
        <Icon name={open ? "chevron-up" : "chevron-down"} size={16} style={{ flexShrink: 0 }} />
      </button>
      {open && <div style={{ padding: "0 16px 14px" }}>{children}</div>}
    </div>
  );
}

function DebtPicker({ debts, selected, other, fmt, onChange }) {
  const all = debts.map(d => d.id);
  const cards = debts.filter(d => d.is_card).map(d => d.id);
  const loans = debts.filter(d => !d.is_card).map(d => d.id);
  const same = list => list.length === selected.length && list.every(id => selected.includes(id));
  const presets = [["All debts", all], ["Credit cards", cards], ["Loans and EMIs", loans]].filter(([, list]) => list.length > 0);
  const chip = on => ({
    ...tapStyle, minHeight: 40, background: on ? "var(--accent)" : "var(--bg)", color: on ? "var(--accent-ink)" : "var(--text)",
    border: `1px solid ${on ? "var(--accent)" : "var(--border)"}`, borderRadius: 20, padding: "0 12px", fontSize: 13, fontWeight: 600,
    display: "inline-flex", alignItems: "center", gap: 5,
  });
  return (
    <div className="card" style={sectionGap}>
      <div style={{ ...eyebrow, marginBottom: 8 }}>Debts to include</div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
        {presets.map(([label, list]) => (
          <button key={label} onClick={() => onChange(list)} aria-pressed={same(list)} style={chip(same(list))}>{label}</button>
        ))}
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 10, paddingTop: 10, borderTop: "1px solid var(--subtle2)" }}>
        {debts.map(d => {
          const on = selected.includes(d.id);
          return (
            <button key={d.id} aria-pressed={on} onClick={() => onChange(on ? selected.filter(id => id !== d.id) : [...selected, d.id])}
              style={{ ...chip(false), background: on ? "color-mix(in srgb, var(--accent) 10%, transparent)" : "transparent", border: `1px solid ${on ? "var(--accent)" : "var(--border)"}`, color: on ? "var(--text)" : "var(--muted2)" }}>
              <Icon name={on ? "check-circle" : "plus"} size={13} color={on ? "var(--accent)" : undefined} />
              {d.name}
            </button>
          );
        })}
      </div>
      {num(other) > 0 && (
        <div style={{ fontSize: 12, color: "var(--muted2)", marginTop: 8, lineHeight: 1.5 }}>
          The others keep getting their {fmt(other)} a month, so that comes out first.
        </div>
      )}
    </div>
  );
}

function UsageRow({ name, percent, hits, targets, fmt, strong }) {
  return (
    <div style={{ padding: "10px 0", borderTop: "1px solid var(--subtle2)" }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 10, fontSize: 14, fontWeight: strong ? 700 : 600, color: "var(--text)", marginBottom: 6 }}>
        <span style={{ minWidth: 0, overflowWrap: "anywhere" }}>{name}</span>
        <span style={{ whiteSpace: "nowrap", color: "var(--muted2)", fontWeight: 600, fontSize: 12 }}>{Math.round(percent)}% used</span>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: `repeat(${targets.length}, minmax(0, 1fr))`, gap: 6 }}>
        {targets.map(t => {
          const hit = hits[t];
          const done = hit.months === 0;
          return (
            <div key={t} style={{ background: "var(--subtle)", border: "1px solid var(--subtle2)", borderRadius: 8, padding: "7px 8px", minWidth: 0 }}>
              <div style={{ fontSize: 11, color: "var(--muted2)", fontWeight: 600 }}>Under {t}%</div>
              {done ? (
                <div style={{ fontSize: 12, fontWeight: 700, color: EXTRA, marginTop: 2 }}>Already</div>
              ) : (
                <>
                  <div style={{ fontSize: 14, fontWeight: 800, color: "var(--text)", marginTop: 2, overflowWrap: "anywhere" }}>{fmt(hit.amount)}</div>
                  <div style={{ fontSize: 11, color: "var(--muted2)", marginTop: 1 }}>{hit.months === null ? "Not reached" : monthYear(hit.date)}</div>
                </>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function IncomeNeeded({ title, fmt, hourly, needed, gap, pay, toDebts, other, cost, costLabel }) {
  const more = num(gap);
  const hours = hourly && num(hourly) > 0 && more > 0 ? more / num(hourly) : null;
  return (
    <div style={{ flex: "1 1 240px", minWidth: 0 }}>
      <div style={{ fontSize: 12, fontWeight: 600, color: "var(--muted2)" }}>{title}</div>
      <div style={{ fontSize: 22, fontWeight: 800, color: "var(--text)", marginTop: 3, letterSpacing: "-0.4px" }}>
        {fmt(needed)}<span style={{ fontSize: 12, fontWeight: 600, color: "var(--muted2)", letterSpacing: 0 }}> /month after tax</span>
      </div>
      <div style={{ fontSize: 13, color: "var(--muted2)", marginTop: 5, lineHeight: 1.55 }}>
        {more > 0
          ? <><strong style={{ color: "var(--text)" }}>{fmt(more)} more a month</strong> than your {fmt(pay)} pay{hours !== null && <>, about <strong style={{ color: "var(--text)" }}>{Math.ceil(hours / (52 / 12))} extra hours a week</strong></>}.</>
          : <>Your {fmt(pay)} pay covers it, with <strong style={{ color: EXTRA }}>{fmt(-more)} to spare</strong>.</>}
        {" "}{fmt(toDebts)} to debts{num(other) > 0 ? ` + ${fmt(other)} other debts` : ""} + {fmt(cost)} {costLabel}.
      </div>
    </div>
  );
}

function Projection({ title, s, fmt, rows }) {
  const [open, setOpen] = useState(null);
  const left = rows.reduce((t, r) => t + r.sign * num(r.amount), 0);
  const line = { display: "flex", justifyContent: "space-between", gap: 12, fontSize: 13, padding: "9px 0" };
  return (
    <div>
      <div style={eyebrow}>{title}</div>
      <div style={{ marginTop: 4 }}>
        {rows.map(r => (
          <div key={r.label} style={{ borderBottom: "1px solid var(--subtle2)" }}>
            {r.items?.length ? (
              <button onClick={() => setOpen(open === r.label ? null : r.label)} aria-expanded={open === r.label}
                style={{ ...tapStyle, ...line, width: "100%", background: "none", border: "none", color: "var(--text)", textAlign: "left", paddingLeft: 0, paddingRight: 0 }}>
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
          <span>{left >= 0 ? "Extra left each month" : "Short each month"}</span>
          <span style={{ whiteSpace: "nowrap", color: left >= 0 ? EXTRA : "#dc2626" }}>{left < 0 ? "-" : ""}{fmt(Math.abs(left))}</span>
        </div>
      </div>
      <div style={{ fontSize: 12, color: "var(--muted2)", lineHeight: 1.5 }}>
        {s.months ? `Done by ${monthYear(s.date)} if it all goes to the debts you chose.` : "Not enough to pay the debts off this way."}
      </div>
    </div>
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
    <div style={{ width: "100%", height: 220 }}>
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

function worthTotals(worth, getRate) {
  const toCad = (v, cur) => {
    const r = cur === "CAD" ? 1 : getRate(cur);
    return r ? num(v) / r : 0;
  };
  const banks = worth.banks.reduce((s, b) => s + num(b.balance), 0);
  const invest = worth.investments.reduce((s, i) => s + toCad(i.worth, i.currency), 0);
  const debts = worth.debts.reduce((s, d) => s + num(d.balance), 0);
  return { banks, invest, debts, total: banks + invest - debts, toCad };
}

function netWorthLine(worth, fmt, getRate) {
  const { total } = worthTotals(worth, getRate);
  return `Net worth ${total < 0 ? `-${fmt(-total)}` : fmt(total)}`;
}

function Assets({ worth, maturities, fmt, getRate }) {
  const { banks, invest, debts, total, toCad } = worthTotals(worth, getRate);
  const rows = [
    { label: "Bank balances", value: fmt(banks) },
    { label: "Investments", value: fmt(invest) },
    { label: "Debts", value: `-${fmt(debts)}` },
    { label: "Net worth", value: total < 0 ? `-${fmt(-total)}` : fmt(total), strong: true },
  ];
  return (
    <>
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
    </>
  );
}
