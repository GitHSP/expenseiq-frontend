import {
  AreaChart, Area, XAxis, YAxis,
  Tooltip, ResponsiveContainer, CartesianGrid, ReferenceLine,
} from "recharts";
import { CATEGORIES }  from "../constants/categories";
import { isSameMonth } from "../utils/helpers";

const TOOLTIP_STYLE = {
  background:   "#ffffff",
  border:       "1px solid #eaeaea",
  borderRadius: 8,
  color:        "#0d0d0d",
  fontSize:     12,
  fontFamily:   "'Inter', sans-serif",
};

export default function Forecast({ expenses, incomes, budgets, formatAmount }) {
  const now          = new Date();
  const currentMonth = now.getMonth();
  const currentYear  = now.getFullYear();
  const dayOfMonth   = now.getDate();
  const daysInMonth  = new Date(currentYear, currentMonth + 1, 0).getDate();
  const daysLeft     = daysInMonth - dayOfMonth;

  const fmt = v => formatAmount
    ? formatAmount(parseFloat(v) || 0)
    : `$${(parseFloat(v) || 0).toFixed(2)}`;

  const thisMonthExp = expenses.filter(e =>
    isSameMonth(e.date, currentMonth, currentYear)
  );

  const thisMonthInc = incomes.filter(i =>
    isSameMonth(i.date, currentMonth, currentYear)
  );

  const totalSpent   = thisMonthExp.reduce((s, e) => s + (parseFloat(e.amount) || 0), 0);
  const totalIncome  = thisMonthInc.reduce((s, i) => s + (parseFloat(i.amount) || 0), 0);
  const totalBudget  = Object.values(budgets).reduce((s, v) => s + (parseFloat(v) || 0), 0);
  const dailyAvg     = dayOfMonth > 0 ? totalSpent / dayOfMonth : 0;
  const forecastEnd  = totalSpent + (dailyAvg * daysLeft);
  const budgetLeft   = totalBudget - totalSpent;
  const safeDaily    = daysLeft > 0 ? budgetLeft / daysLeft : 0;
  const willExceed   = forecastEnd > totalBudget && totalBudget > 0;

  // Day by day chart data
  const chartData = [];
  for (let day = 1; day <= daysInMonth; day++) {
    const dayExp = thisMonthExp
      .filter(e => {
        const [, , d] = e.date.split("-").map(Number);
        return d === day;
      })
      .reduce((s, e) => s + (parseFloat(e.amount) || 0), 0);
    const prev     = chartData[day - 2]?.actual || 0;
    const actual   = day <= dayOfMonth ? prev + dayExp : null;
    const forecast = day >= dayOfMonth
      ? (day === dayOfMonth ? totalSpent : (chartData[day-2]?.forecast || totalSpent) + dailyAvg)
      : null;
    chartData.push({ day:`${day}`, actual, forecast });
  }

  const catForecasts = CATEGORIES.map(cat => {
    const spent       = thisMonthExp.filter(e => e.category === cat.name).reduce((s, e) => s + (parseFloat(e.amount)||0), 0);
    const catDailyAvg = dayOfMonth > 0 ? spent / dayOfMonth : 0;
    const catForecast = spent + (catDailyAvg * daysLeft);
    const catBudget   = parseFloat(budgets[cat.name]) || 0;
    return { ...cat, spent, catForecast, catBudget, willExceed: catBudget > 0 && catForecast > catBudget };
  }).filter(c => c.spent > 0 || c.catBudget > 0);

  return (
    <>
      <div style={{ marginBottom:28 }}>
        <div className="page-title">Spending Forecast</div>
        <div className="page-sub">Day {dayOfMonth} of {daysInMonth} · {daysLeft} days remaining</div>
      </div>

      {willExceed && (
        <div style={{ background:"#fff1f2", border:"1px solid #fecdd3", borderRadius:12, padding:"14px 18px", marginBottom:20, display:"flex", gap:12, alignItems:"center" }}>
          <span style={{ fontSize:22 }}>⚠️</span>
          <div>
            <div style={{ fontWeight:700, color:"#e11d48", fontSize:14 }}>You're on track to exceed your budget!</div>
            <div style={{ fontSize:12, color:"#888", marginTop:2 }}>Forecast: {fmt(forecastEnd)} vs Budget: {fmt(totalBudget)}</div>
          </div>
        </div>
      )}

      {/* Stat cards */}
      <div className="stat-grid" style={{ marginBottom:24 }}>
        {[
          { label:"Spent So Far",     value:fmt(totalSpent),          sub:`${dayOfMonth} days in`,                gradient:"linear-gradient(135deg, #e11d48, #be123c)" },
          { label:"Daily Average",    value:fmt(dailyAvg),            sub:"per day this month",                   gradient:"linear-gradient(135deg, #0070f3, #0050b3)" },
          { label:"Month Forecast",   value:fmt(forecastEnd),         sub:willExceed?"⚠️ Over budget!":"✅ On track", gradient:willExceed?"linear-gradient(135deg, #e11d48, #be123c)":"linear-gradient(135deg, #059669, #047857)" },
          { label:"Safe Daily Spend", value:fmt(Math.max(0,safeDaily)),sub:"to stay within budget",               gradient:"linear-gradient(135deg, #f59e0b, #d97706)" },
        ].map(card => (
          <div key={card.label} style={{ background:card.gradient, borderRadius:12, padding:20, color:"#fff" }}>
            <div style={{ fontSize:10, fontWeight:600, textTransform:"uppercase", letterSpacing:"0.8px", opacity:0.75, marginBottom:8 }}>{card.label}</div>
            <div style={{ fontSize:22, fontWeight:800, letterSpacing:"-0.8px", lineHeight:1.1, marginBottom:6 }}>{card.value}</div>
            <div style={{ fontSize:11, opacity:0.65, fontWeight:500 }}>{card.sub}</div>
          </div>
        ))}
      </div>

      {/* Chart */}
      <div className="card" style={{ marginBottom:20 }}>
        <div className="card-title" style={{ marginBottom:16 }}>Daily Spending — Actual vs Forecast</div>
        <ResponsiveContainer width="100%" height={260}>
          <AreaChart data={chartData}>
            <defs>
              <linearGradient id="actualGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%"  stopColor="#0070f3" stopOpacity={0.15} />
                <stop offset="95%" stopColor="#0070f3" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="forecastGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%"  stopColor="#f59e0b" stopOpacity={0.15} />
                <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
            <XAxis dataKey="day" tick={{ fill:"#aaa", fontSize:10 }} axisLine={false} tickLine={false} interval={4} />
            <YAxis tick={{ fill:"#aaa", fontSize:10 }} axisLine={false} tickLine={false} width={50} tickFormatter={v => `$${v}`} />
            <Tooltip formatter={(v, name) => [fmt(v), name]} contentStyle={TOOLTIP_STYLE} />
            {totalBudget > 0 && <ReferenceLine y={totalBudget} stroke="#e11d48" strokeDasharray="4 4" label={{ value:"Budget", fill:"#e11d48", fontSize:10, position:"right" }} />}
            <Area type="monotone" dataKey="actual" name="Actual" stroke="#0070f3" strokeWidth={2.5} fill="url(#actualGrad)" connectNulls={false} dot={false} />
            <Area type="monotone" dataKey="forecast" name="Forecast" stroke="#f59e0b" strokeWidth={2} strokeDasharray="5 5" fill="url(#forecastGrad)" connectNulls={false} dot={false} />
          </AreaChart>
        </ResponsiveContainer>
        <div style={{ display:"flex", gap:16, marginTop:8, justifyContent:"center" }}>
          {[{ color:"#0070f3", label:"Actual" }, { color:"#f59e0b", label:"Forecast" }, { color:"#e11d48", label:"Budget limit" }].map(l => (
            <div key={l.label} style={{ display:"flex", alignItems:"center", gap:4 }}>
              <div style={{ width:10, height:10, borderRadius:2, background:l.color }} />
              <span style={{ fontSize:11, color:"#888" }}>{l.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Category forecasts */}
      <div className="card">
        <div className="card-title" style={{ marginBottom:16 }}>Category Forecasts</div>
        {catForecasts.length === 0 ? (
          <div style={{ textAlign:"center", color:"#ccc", fontSize:13, padding:"20px 0" }}>No spending data yet</div>
        ) : catForecasts.map(cat => (
          <div key={cat.name} style={{ marginBottom:16 }}>
            <div style={{ display:"flex", justifyContent:"space-between", fontSize:13, marginBottom:6 }}>
              <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                <span>{cat.icon}</span>
                <span style={{ fontWeight:600 }}>{cat.name}</span>
                {cat.willExceed && <span style={{ background:"#fff1f2", color:"#e11d48", padding:"1px 6px", borderRadius:4, fontSize:10, fontWeight:700 }}>Will exceed!</span>}
              </div>
              <div style={{ display:"flex", gap:12, alignItems:"center" }}>
                {cat.catBudget > 0 && <span style={{ fontSize:11, color:"#aaa" }}>Budget: {fmt(cat.catBudget)}</span>}
                <span style={{ fontWeight:700 }}>{fmt(cat.spent)}</span>
              </div>
            </div>
            <div style={{ background:"#f0f0f0", borderRadius:100, height:6, overflow:"hidden" }}>
              <div style={{ height:"100%", borderRadius:100, background:cat.willExceed?"#e11d48":cat.color, width:`${cat.catBudget>0?Math.min((cat.catForecast/cat.catBudget)*100,100):50}%`, transition:"width 0.6s" }} />
            </div>
          </div>
        ))}
      </div>
    </>
  );
}