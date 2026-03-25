import {
  PieChart, Pie, Cell, BarChart, Bar,
  XAxis, YAxis, Tooltip, ResponsiveContainer
} from "recharts";
import { CATEGORIES, MONTHS } from "../constants/categories";

const TOOLTIP_STYLE = {
  background: "#111111", border: "1px solid #2a2a2a",
  borderRadius: 10, color: "#e8e8e8", fontSize: 12
};

export default function Analytics({ expenses, budgets, formatAmount }) {
  const now          = new Date();
  const currentMonth = now.getMonth();
  const currentYear  = now.getFullYear();

  // ── This month's expenses ──
  const thisMonthExp = expenses.filter(e => {
    const d = new Date(e.date);
    return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
  });

  // ── Per category spend + budget ──
  const catSpend = CATEGORIES.map(cat => {
    const spent  = thisMonthExp
      .filter(e => e.category === cat.name)
      .reduce((s, e) => s + parseFloat(e.amount) || 0, 0);
    const budget = budgets[cat.name] || 0;
    return {
      ...cat,
      spent,
      budget,
      pct: budget > 0 ? Math.min((spent / budget) * 100, 100) : 0,
    };
  });

  // ── Pie chart data ──
  const pieData = catSpend
    .filter(c => c.spent > 0)
    .map(c => ({ name: c.name, value: c.spent, color: c.color }));

  // ── Monthly bar chart data ──
  const monthlyData = MONTHS.map((m, i) => ({
    name:   m,
    amount: parseFloat(
      expenses
        .filter(e =>
          new Date(e.date).getMonth() === i &&
          new Date(e.date).getFullYear() === currentYear
        )
        .reduce((s, e) => s + parseFloat(e.amount) || 0, 0)
        .toFixed(2)
    ),
  }));

  // ── Empty state ──
  if (pieData.length === 0) {
    return (
      <div className="empty-state">
        <div className="empty-icon">📊</div>
        <div style={{ fontWeight:600, color:"#333" }}>No data yet</div>
        <div style={{ fontSize:13, marginTop:6, color:"#333" }}>
          Add expenses to see analytics
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="page-title">Analytics</div>
      <div className="page-sub">Your spending insights</div>

      {/* ── Charts ── */}
      <div className="charts-grid">

        {/* Pie chart */}
        <div className="card">
          <div className="card-title" style={{ marginBottom:14 }}>
            Category Breakdown (This Month)
          </div>
          <ResponsiveContainer width="100%" height={240}>
            <PieChart>
              <Pie
                data={pieData}
                cx="50%" cy="50%"
                outerRadius={95}
                dataKey="value"
                label={({ percent }) => `${(percent * 100).toFixed(0)}%`}
                labelLine={{ stroke:"#333" }}
              >
                {pieData.map((e, i) => <Cell key={i} fill={e.color} />)}
              </Pie>
              <Tooltip
                formatter={v => formatAmount ? formatAmount(v) : `$${v}`}
                contentStyle={TOOLTIP_STYLE}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Bar chart */}
        <div className="card">
          <div className="card-title" style={{ marginBottom:14 }}>
            Year Overview {currentYear}
          </div>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={monthlyData}>
              <XAxis
                dataKey="name"
                tick={{ fill:"#555", fontSize:10 }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fill:"#555", fontSize:10 }}
                axisLine={false}
                tickLine={false}
                tickFormatter={v => `${v}`}
                width={42}
              />
              <Tooltip
                formatter={v => formatAmount ? formatAmount(v) : `$${v}`}
                contentStyle={TOOLTIP_STYLE}
              />
              <Bar
                dataKey="amount"
                radius={[5,5,0,0]}
              >
                {monthlyData.map((_, i) => (
                  <Cell
                    key={i}
                    fill={i === currentMonth ? "#ffffff" : "#2a2a2a"}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

      </div>

      {/* ── Category progress bars ── */}
      <div className="card">
        <div className="card-title" style={{ marginBottom:16 }}>
          Top Spending Categories
        </div>
        {catSpend
          .filter(c => c.spent > 0)
          .sort((a, b) => b.spent - a.spent)
          .map(cat => (
            <div key={cat.name} style={{ marginBottom:16 }}>
              <div style={{
                display:"flex", justifyContent:"space-between",
                fontSize:13, marginBottom:6,
              }}>
                <span style={{ color:"#e8e8e8" }}>{cat.icon} {cat.name}</span>
                <div style={{ display:"flex", gap:12, alignItems:"center" }}>
                  {cat.budget > 0 && (
                    <span style={{ fontSize:11, color:"#555" }}>
                      Budget: {formatAmount ? formatAmount(cat.budget) : `$${cat.budget}`}
                    </span>
                  )}
                  <span style={{
                    fontWeight: 700,
                    color: cat.spent > cat.budget && cat.budget > 0
                      ? "#ff4444"
                      : "#e8e8e8",
                  }}>
                    {formatAmount ? formatAmount(cat.spent) : `$${cat.spent}`}
                  </span>
                </div>
              </div>

              {/* Progress bar */}
              <div className="progress-bar-bg">
                <div style={{
                  height:       "100%",
                  borderRadius: 10,
                  background:   cat.spent > cat.budget && cat.budget > 0
                    ? "#ff4444"
                    : "#ffffff",
                  width:      `${cat.pct || 100}%`,
                  transition: "width .6s",
                }} />
              </div>

              {/* Percentage + remaining */}
              {cat.budget > 0 && (
                <div style={{ fontSize:11, color:"#555", marginTop:4, display:"flex", justifyContent:"space-between" }}>
                  <span>{cat.pct.toFixed(0)}% used</span>
                  <span>
                    {cat.spent > cat.budget
                      ? `${formatAmount ? formatAmount(cat.spent - cat.budget) : `$${(cat.spent - cat.budget).toFixed(2)}`} over budget`
                      : `${formatAmount ? formatAmount(cat.budget - cat.spent) : `$${(cat.budget - cat.spent).toFixed(2)}`} remaining`
                    }
                  </span>
                </div>
              )}
            </div>
          ))
        }
      </div>

      {/* ── Summary stats ── */}
      <div className="card">
        <div className="card-title" style={{ marginBottom:16 }}>
          This Month Summary
        </div>
        <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit, minmax(160px,1fr))", gap:12 }}>
          {[
            {
              label: "Total Spent",
              value: thisMonthExp.reduce((s, e) => s + parseFloat(e.amount) || 0, 0),
              color: "#ff4444",
            },
            {
              label: "Avg per Transaction",
              value: thisMonthExp.length > 0
                ? thisMonthExp.reduce((s, e) => s + parseFloat(e.amount) || 0, 0) / thisMonthExp.length
                : 0,
              color: "#888",
            },
            {
              label: "Largest Expense",
              value: thisMonthExp.length > 0
                ? Math.max(...thisMonthExp.map(e => parseFloat(e.amount)))
                : 0,
              color: "#ff4444",
            },
            {
              label: "Transactions",
              value: null,
              count: thisMonthExp.length,
              color: "#ffffff",
            },
          ].map(stat => (
            <div key={stat.label} style={{
              background:   "#161616",
              borderRadius: "12px",
              padding:      "14px",
              border:       "1px solid #222",
            }}>
              <div style={{ fontSize:11, color:"#555", textTransform:"uppercase", letterSpacing:0.5, marginBottom:6 }}>
                {stat.label}
              </div>
              <div style={{ fontWeight:800, fontSize:18, color: stat.color }}>
                {stat.count !== undefined
                  ? stat.count
                  : formatAmount
                    ? formatAmount(stat.value)
                    : `$${stat.value.toFixed(2)}`
                }
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Over budget categories ── */}
      {catSpend.some(c => c.spent > c.budget && c.budget > 0) && (
        <div style={{
          background:   "#1a0000",
          border:       "1px solid #440000",
          borderRadius: "14px",
          padding:      "16px 20px",
        }}>
          <div style={{ fontWeight:700, color:"#ff4444", marginBottom:10, fontSize:14 }}>
            ⚠️ Over Budget Categories
          </div>
          {catSpend
            .filter(c => c.spent > c.budget && c.budget > 0)
            .map(cat => (
              <div key={cat.name} style={{
                display:        "flex",
                justifyContent: "space-between",
                alignItems:     "center",
                padding:        "8px 0",
                borderBottom:   "1px solid #2a0000",
              }}>
                <span style={{ color:"#e8e8e8", fontSize:13 }}>
                  {cat.icon} {cat.name}
                </span>
                <span style={{ color:"#ff4444", fontWeight:700, fontSize:13 }}>
                  {formatAmount
                    ? formatAmount(cat.spent - cat.budget)
                    : `$${(cat.spent - cat.budget).toFixed(2)}`
                  } over
                </span>
              </div>
            ))
          }
        </div>
      )}
    </>
  );
}