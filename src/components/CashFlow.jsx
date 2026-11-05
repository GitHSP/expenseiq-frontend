import { useEffect, useMemo, useState } from "react";
import { CartesianGrid, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import Icon from "./Icon";
import { financialPlannerAPI } from "../utils/api";

// Planner → Cash flow: the bank balance day by day, so a tight week shows up
// before it happens. The server works in CAD; this shows the app's currency.
const RANGES = [30, 60, 90];
const num = v => parseFloat(v) || 0;
const dayLabel = iso => new Date(`${iso}T12:00:00`).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
const shortDay = iso => new Date(`${iso}T12:00:00`).toLocaleDateString("en-US", { month: "short", day: "numeric" });

const eyebrow = { fontSize: 11, fontWeight: 600, color: "var(--muted2)", textTransform: "uppercase", letterSpacing: "0.5px" };
const fieldStyle = {
  width: "100%", background: "var(--card)", border: "1px solid var(--border)", borderRadius: 8, padding: "9px 11px",
  fontSize: 13, color: "var(--text)", fontFamily: "inherit", boxSizing: "border-box",
};

export default function CashFlow({ fmt, recurring, debts, checklist, currency = "CAD", getRate = c => (c === "CAD" ? 1 : null) }) {
  const rate = currency === "CAD" ? 1 : (getRate(currency) || 1);
  const [days, setDays] = useState(60);
  const [balanceText, setBalanceText] = useState("");
  const [data, setData] = useState(null);
  const [error, setError] = useState("");

  const balance = balanceText.trim() !== "" && !Number.isNaN(parseFloat(balanceText)) ? parseFloat(balanceText) / rate : null;

  useEffect(() => {
    let live = true;
    const timer = setTimeout(() => {
      financialPlannerAPI.getCashFlow({ days, balance })
        .then(d => { if (live) { setData(d); setError(""); } })
        .catch(() => { if (live) setError("Couldn't load your cash flow. Try again in a moment."); });
    }, 300);
    return () => { live = false; clearTimeout(timer); };
  }, [days, balance, recurring, debts, checklist]);

  const points = useMemo(() => {
    if (!data) return [];
    const out = [{ date: data.today, balance: num(data.start_balance) * rate }];
    data.events.forEach(e => {
      const row = { date: e.date, balance: num(e.balance) * rate };
      if (out[out.length - 1].date === e.date) out[out.length - 1] = row;
      else out.push(row);
    });
    if (out[out.length - 1].date !== data.end) out.push({ date: data.end, balance: num(data.end_balance) * rate });
    return out.map(p => ({ ...p, time: new Date(`${p.date}T12:00:00`).getTime() }));
  }, [data, rate]);

  if (error) return <div className="card" style={{ color: "#dc2626", fontSize: 13 }}>{error}</div>;
  if (!data) return <div className="card" style={{ color: "var(--muted2)", fontSize: 13 }}>Working out your cash flow...</div>;

  const compact = v => new Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 1 }).format(v);
  const byDay = [];
  data.events.forEach(e => {
    const last = byDay[byDay.length - 1];
    if (last && last.date === e.date) last.items.push(e);
    else byDay.push({ date: e.date, items: [e] });
  });
  const lowest = num(data.lowest);

  return (
    <>
      {/* Warning first: it's the reason to open this tab */}
      <div className="card" style={{ marginBottom: 14, display: "flex", gap: 10, alignItems: "flex-start" }}>
        <Icon name={data.first_short ? "warning" : "check-circle"} size={16} color={data.first_short ? "#d97706" : "#059669"} style={{ flexShrink: 0, marginTop: 2 }} />
        <div style={{ fontSize: 13, color: "var(--muted2)", lineHeight: 1.6 }}>
          {data.first_short
            ? <><strong style={{ color: "var(--text)" }}>You could run short on {dayLabel(data.first_short.date)}.</strong> {data.first_short.label} takes your balance to {fmt(data.first_short.balance)}.</>
            : <><strong style={{ color: "var(--text)" }}>Your balance stays above zero for the next {data.days} days.</strong> The lowest point is {fmt(lowest)} on {shortDay(data.lowest_date)}.</>}
        </div>
      </div>

      <div className="card" style={{ marginBottom: 14, display: "flex", flexWrap: "wrap", gap: 18 }}>
        <Kpi label="Balance now" value={fmt(data.start_balance)}
          sub={data.entered ? "as you entered" : data.statement_date ? `statement of ${shortDay(data.statement_date)}` : "no statement yet"} />
        <Kpi label="Lowest point" value={fmt(lowest)} sub={shortDay(data.lowest_date)} />
        <Kpi label="Coming in" value={fmt(data.money_in)} sub={`next ${data.days} days`} />
        <Kpi label="Going out" value={fmt(data.money_out)} sub={`next ${data.days} days`} />
      </div>

      <div className="card" style={{ marginBottom: 14, display: "flex", flexWrap: "wrap", gap: 12, alignItems: "flex-end" }}>
        <div style={{ flex: "1 1 200px" }}>
          <label htmlFor="cash-balance" style={{ display: "block", fontSize: 11, fontWeight: 600, color: "var(--muted2)", marginBottom: 5 }}>
            My bank balance today ({currency})
          </label>
          <input id="cash-balance" type="number" style={fieldStyle} value={balanceText} placeholder="Check your bank app and enter it"
            onChange={e => setBalanceText(e.target.value)} />
        </div>
        <div style={{ display: "inline-flex", gap: 4, background: "var(--bg)", border: "1px solid var(--border)", borderRadius: 8, padding: 3 }}>
          {RANGES.map(r => (
            <button key={r} onClick={() => setDays(r)} aria-pressed={days === r} style={{
              background: days === r ? "#0070f3" : "transparent", color: days === r ? "#fff" : "var(--muted2)",
              border: "none", borderRadius: 6, padding: "6px 12px", fontWeight: 600, fontSize: 12, cursor: "pointer", fontFamily: "inherit",
            }}>{r} days</button>
          ))}
        </div>
        {!data.entered && data.stale && (
          <div style={{ flexBasis: "100%", fontSize: 12, color: "var(--warn-text)" }}>
            Your latest bank statement is old, so enter today's balance for an accurate picture.
          </div>
        )}
      </div>

      <div className="card" style={{ marginBottom: 14 }}>
        <div className="card-title" style={{ marginBottom: 12 }}>Bank balance</div>
        <div style={{ width: "100%", height: 220 }}>
          <ResponsiveContainer>
            <LineChart data={points} margin={{ top: 6, right: 10, bottom: 0, left: 0 }}>
              <CartesianGrid vertical={false} stroke="var(--border2)" />
              <XAxis dataKey="time" type="number" scale="time" domain={["dataMin", "dataMax"]} minTickGap={50}
                tickFormatter={t => new Date(t).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                tick={{ fontSize: 11, fill: "var(--muted2)" }} tickLine={false} axisLine={{ stroke: "var(--border)" }} />
              <YAxis tickFormatter={compact} tick={{ fontSize: 11, fill: "var(--muted2)" }} tickLine={false} axisLine={false} width={44} />
              <ReferenceLine y={0} stroke="var(--muted)" strokeDasharray="4 3" />
              <Tooltip
                labelFormatter={t => new Date(t).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}
                formatter={v => [fmt(v / rate), "Balance"]}
                contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 12, color: "var(--text)" }}
                labelStyle={{ color: "var(--muted2)", marginBottom: 2 }} />
              <Line type="stepAfter" dataKey="balance" stroke="#0070f3" strokeWidth={2} dot={false} activeDot={{ r: 4 }} isAnimationActive={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="card" style={{ marginBottom: 10 }}>
        <div className="card-title" style={{ marginBottom: 6 }}>Day by day</div>
        {byDay.length === 0 && <div style={{ fontSize: 13, color: "var(--muted2)" }}>Nothing planned. Add your pay and bills in the Recurring tab.</div>}
        {byDay.map((d, i) => {
          const closing = d.items[d.items.length - 1].balance;
          return (
            <div key={d.date} style={{ padding: "10px 0", borderTop: i ? "1px solid var(--subtle2)" : "none" }}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 10, marginBottom: 4 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: "var(--text)" }}>{dayLabel(d.date)}</div>
                <div style={{ fontSize: 12, fontWeight: 700, color: num(closing) < 0 ? "#dc2626" : "var(--muted2)", whiteSpace: "nowrap" }}>Balance {fmt(closing)}</div>
              </div>
              {d.items.map((e, j) => (
                <div key={`${e.label}-${j}`} style={{ display: "flex", justifyContent: "space-between", gap: 12, fontSize: 13, padding: "2px 0" }}>
                  <div style={{ color: "var(--muted2)", minWidth: 0, overflowWrap: "anywhere" }}>
                    {e.label}{e.estimate ? " · estimate" : ""}{e.no_due_day ? " · no due day set" : ""}
                  </div>
                  <div style={{ fontWeight: 600, color: num(e.amount) > 0 ? "#059669" : "var(--text)", whiteSpace: "nowrap" }}>
                    {num(e.amount) > 0 ? `+${fmt(e.amount)}` : `-${fmt(-num(e.amount))}`}
                  </div>
                </div>
              ))}
            </div>
          );
        })}
      </div>
      <div style={{ fontSize: 11, color: "var(--muted2)", lineHeight: 1.6 }}>
        An estimate from your Recurring payments and debts. Everyday spending like groceries isn't included unless you add it there.
        Roommates' payments aren't shown; shared bills count at your share.
      </div>
    </>
  );
}

function Kpi({ label, value, sub }) {
  return (
    <div style={{ flex: "1 1 120px", minWidth: 0 }}>
      <div style={eyebrow}>{label}</div>
      <div style={{ fontSize: 20, fontWeight: 800, color: "var(--text)", marginTop: 4, letterSpacing: "-0.3px" }}>{value}</div>
      {sub && <div style={{ fontSize: 11, color: "var(--muted2)", marginTop: 2 }}>{sub}</div>}
    </div>
  );
}
