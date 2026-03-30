import { useState } from "react";
import {
  PieChart, Pie, Cell, BarChart, Bar,
  XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from "recharts";
import { CATEGORIES, MONTHS } from "../constants/categories";

const TOOLTIP_STYLE = {
  background:   "#ffffff",
  border:       "1px solid #eaeaea",
  borderRadius: 8,
  color:        "#0d0d0d",
  fontSize:     12,
  fontFamily:   "'Inter', sans-serif",
  boxShadow:    "0 4px 12px rgba(0,0,0,0.08)",
};

const thStyle = {
  padding:       "11px 14px",
  textAlign:     "left",
  fontSize:      11,
  fontWeight:    700,
  textTransform: "uppercase",
  letterSpacing: "0.6px",
  color:         "#888",
  borderBottom:  "1px solid #eaeaea",
  background:    "#fafafa",
  whiteSpace:    "nowrap",
};

const tdStyle = {
  padding:      "11px 14px",
  fontSize:     13,
  color:        "#0d0d0d",
  borderBottom: "1px solid #f5f5f5",
  verticalAlign:"middle",
};

export default function Analytics({ expenses, budgets, formatAmount }) {
  const now          = new Date();
  const currentMonth = now.getMonth();
  const currentYear  = now.getFullYear();

  // ── Active selections ──
  const [selectedCat,   setSelectedCat]   = useState(null); // clicked pie slice
  const [selectedMonth, setSelectedMonth] = useState(null); // clicked bar

  const fmt = v => formatAmount
    ? formatAmount(parseFloat(v) || 0)
    : `$${(parseFloat(v) || 0).toFixed(2)}`;

  // ── This month's expenses ──
  const thisMonthExp = expenses.filter(e => {
    const d = new Date(e.date);
    return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
  });

  // ── Per category spend ──
  const catSpend = CATEGORIES.map(cat => {
    const spent  = thisMonthExp
      .filter(e => e.category === cat.name)
      .reduce((s, e) => s + (parseFloat(e.amount) || 0), 0);
    const budget = parseFloat(budgets[cat.name]) || 0;
    return {
      ...cat,
      spent,
      budget,
      pct: budget > 0 ? Math.min((spent / budget) * 100, 100) : 0,
    };
  }).filter(c => c.spent > 0);

  // ── Pie chart data ──
  const pieData = catSpend.map(c => ({
    name:  c.name,
    value: parseFloat(c.spent.toFixed(2)),
    color: c.color,
  }));

  // ── Monthly bar chart data ──
  const monthlyData = MONTHS.map((m, i) => ({
    name:   m.slice(0, 3),
    month:  i,
    amount: parseFloat(
      expenses
        .filter(e =>
          new Date(e.date).getMonth() === i &&
          new Date(e.date).getFullYear() === currentYear
        )
        .reduce((s, e) => s + (parseFloat(e.amount) || 0), 0)
        .toFixed(2)
    ),
  }));

  // ── Expenses for selected category ──
  const catExpenses = selectedCat
    ? thisMonthExp.filter(e => e.category === selectedCat)
    : [];

  // ── Expenses for selected month ──
  const monthExpenses = selectedMonth !== null
    ? expenses.filter(e =>
        new Date(e.date).getMonth() === selectedMonth &&
        new Date(e.date).getFullYear() === currentYear
      ).sort((a, b) => new Date(b.date) - new Date(a.date))
    : [];

  const totalMonthExpenses = monthExpenses
    .reduce((s, e) => s + (parseFloat(e.amount) || 0), 0);

  // ── Custom pie label ──
  function renderPieLabel({ percent }) {
    return percent > 0.05 ? `${(percent * 100).toFixed(0)}%` : "";
  }

  // ── Handle pie click ──
  function handlePieClick(data) {
    if (!data) return;
    const name = data.name || data?.payload?.name;
    setSelectedCat(prev => prev === name ? null : name);
    setSelectedMonth(null);
  }

  // ── Handle bar click ──
  function handleBarClick(data) {
    if (!data || data.month === undefined) return;
    setSelectedMonth(prev => prev === data.month ? null : data.month);
    setSelectedCat(null);
  }

  if (pieData.length === 0 && monthlyData.every(m => m.amount === 0)) {
    return (
      <div className="empty-state">
        <div className="empty-icon">📊</div>
        <div style={{ fontWeight:600, color:"#ccc" }}>No data yet</div>
        <div style={{ fontSize:13, marginTop:6, color:"#ccc" }}>
          Add expenses to see analytics
        </div>
      </div>
    );
  }

  return (
    <>
      <div style={{ marginBottom:28 }}>
        <div className="page-title">Analytics</div>
        <div className="page-sub">Click on any chart to see the transactions</div>
      </div>

      {/* ── Charts ── */}
      <div className="charts-grid">

        {/* ── Pie chart ── */}
        <div className="card" style={{
          outline:      selectedCat ? "2px solid #0070f3" : "none",
          outlineOffset:2,
          transition:   "all 0.2s",
        }}>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:14 }}>
            <div className="card-title">Category Breakdown</div>
            {selectedCat && (
              <button
                onClick={() => setSelectedCat(null)}
                style={{ background:"transparent", border:"none", color:"#0070f3", fontSize:12, fontWeight:600, cursor:"pointer", fontFamily:"inherit" }}
              >
                ✕ Clear
              </button>
            )}
          </div>

          {selectedCat && (
            <div style={{
              background:   "#f0f7ff",
              border:       "1px solid #bfdbfe",
              borderRadius: 8,
              padding:      "8px 12px",
              marginBottom: 12,
              fontSize:     12,
              color:        "#0070f3",
              fontWeight:   600,
            }}>
              📊 Showing: {selectedCat} — click slice again to deselect
            </div>
          )}

          <ResponsiveContainer width="100%" height={240}>
            <PieChart>
              <Pie
                data={pieData}
                cx="50%"
                cy="50%"
                outerRadius={95}
                dataKey="value"
                label={renderPieLabel}
                labelLine={{ stroke:"#ddd" }}
                onClick={handlePieClick}
                style={{ cursor:"pointer" }}
              >
                {pieData.map((e, i) => (
                  <Cell
                    key={i}
                    fill={e.color}
                    opacity={selectedCat && selectedCat !== e.name ? 0.3 : 1}
                    stroke={selectedCat === e.name ? "#0d0d0d" : "none"}
                    strokeWidth={selectedCat === e.name ? 2 : 0}
                  />
                ))}
              </Pie>
              <Tooltip
                formatter={v => fmt(v)}
                contentStyle={TOOLTIP_STYLE}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* ── Bar chart ── */}
        <div className="card" style={{
          outline:      selectedMonth !== null ? "2px solid #0070f3" : "none",
          outlineOffset:2,
          transition:   "all 0.2s",
        }}>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:14 }}>
            <div className="card-title">Year Overview {currentYear}</div>
            {selectedMonth !== null && (
              <button
                onClick={() => setSelectedMonth(null)}
                style={{ background:"transparent", border:"none", color:"#0070f3", fontSize:12, fontWeight:600, cursor:"pointer", fontFamily:"inherit" }}
              >
                ✕ Clear
              </button>
            )}
          </div>

          {selectedMonth !== null && (
            <div style={{
              background:   "#f0f7ff",
              border:       "1px solid #bfdbfe",
              borderRadius: 8,
              padding:      "8px 12px",
              marginBottom: 12,
              fontSize:     12,
              color:        "#0070f3",
              fontWeight:   600,
            }}>
              📅 Showing: {MONTHS[selectedMonth]} — click bar again to deselect
            </div>
          )}

          <ResponsiveContainer width="100%" height={240}>
            <BarChart
              data={monthlyData}
              onClick={d => d?.activePayload && handleBarClick(d.activePayload[0]?.payload)}
              style={{ cursor:"pointer" }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
              <XAxis
                dataKey="name"
                tick={{ fill:"#aaa", fontSize:11, fontFamily:"Inter" }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fill:"#aaa", fontSize:10, fontFamily:"Inter" }}
                axisLine={false}
                tickLine={false}
                width={42}
                tickFormatter={v => `$${v}`}
              />
              <Tooltip
                formatter={v => [fmt(v), "Expenses"]}
                contentStyle={TOOLTIP_STYLE}
              />
              <Bar dataKey="amount" radius={[5,5,0,0]}>
                {monthlyData.map((entry, i) => (
                  <Cell
                    key={i}
                    fill={selectedMonth === entry.month
                      ? "#0070f3"
                      : selectedMonth !== null
                      ? "#d0e4ff"
                      : i === currentMonth
                      ? "#0070f3"
                      : "#e0eaff"
                    }
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* ── Detail table — shown when category or month selected ── */}
      {(selectedCat || selectedMonth !== null) && (
        <div style={{
          background:   "#ffffff",
          border:       "1px solid #eaeaea",
          borderRadius: 12,
          overflow:     "hidden",
          marginBottom: 20,
          boxShadow:    "0 4px 16px rgba(0,0,0,0.06)",
          animation:    "fadeIn 0.2s ease",
        }}>
          {/* Table header */}
          <div style={{
            padding:        "16px 20px",
            borderBottom:   "1px solid #f0f0f0",
            display:        "flex",
            justifyContent: "space-between",
            alignItems:     "center",
          }}>
            <div>
              <div style={{ fontWeight:800, fontSize:15, color:"#0d0d0d", letterSpacing:"-0.3px" }}>
                {selectedCat
                  ? `${CATEGORIES.find(c => c.name === selectedCat)?.icon} ${selectedCat} — This Month`
                  : `📅 ${MONTHS[selectedMonth]} ${currentYear}`
                }
              </div>
              <div style={{ fontSize:12, color:"#888", marginTop:2 }}>
                {selectedCat
                  ? `${catExpenses.length} transactions · Total ${fmt(catExpenses.reduce((s,e) => s + (parseFloat(e.amount)||0), 0))}`
                  : `${monthExpenses.length} transactions · Total ${fmt(totalMonthExpenses)}`
                }
              </div>
            </div>
            <button
              onClick={() => { setSelectedCat(null); setSelectedMonth(null); }}
              className="btn-secondary"
              style={{ padding:"7px 14px", fontSize:12 }}
            >
              ✕ Close
            </button>
          </div>

          {/* Table */}
          <div style={{ overflowX:"auto" }}>
            <table style={{ width:"100%", borderCollapse:"collapse" }}>
              <thead>
                <tr>
                  <th style={thStyle}>Date</th>
                  <th style={thStyle}>Title</th>
                  <th style={thStyle}>Category</th>
                  <th style={{ ...thStyle, textAlign:"right" }}>Amount</th>
                  <th style={thStyle}>Notes</th>
                </tr>
              </thead>
              <tbody>
                {(selectedCat ? catExpenses : monthExpenses).map((exp, idx) => {
                  const cat = CATEGORIES.find(c => c.name === exp.category);
                  return (
                    <tr
                      key={exp.id}
                      style={{ background: idx % 2 === 0 ? "#ffffff" : "#fafafa" }}
                      onMouseEnter={e => e.currentTarget.style.background = "#f0f7ff"}
                      onMouseLeave={e => e.currentTarget.style.background = idx % 2 === 0 ? "#ffffff" : "#fafafa"}
                    >
                      <td style={{ ...tdStyle, color:"#888", fontSize:12, fontWeight:500 }}>
                        {exp.date}
                      </td>
                      <td style={{ ...tdStyle, fontWeight:600, letterSpacing:"-0.1px" }}>
                        {exp.title}
                      </td>
                      <td style={tdStyle}>
                        <div style={{
                          display:    "inline-flex",
                          alignItems: "center",
                          gap:        6,
                          background: cat ? `${cat.color}12` : "#f6f8fa",
                          border:     `1px solid ${cat ? cat.color + "30" : "#eaeaea"}`,
                          borderRadius:6,
                          padding:    "3px 10px",
                          fontSize:   11,
                          fontWeight: 600,
                          color:      cat?.color || "#888",
                          whiteSpace: "nowrap",
                        }}>
                          {cat?.icon || "📦"} {exp.category}
                        </div>
                      </td>
                      <td style={{ ...tdStyle, textAlign:"right", fontWeight:700, color:"#e11d48", letterSpacing:"-0.3px" }}>
                        -{fmt(exp.amount)}
                      </td>
                      <td style={{ ...tdStyle, color:"#aaa", fontSize:12 }}>
                        {exp.notes || "—"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr style={{ background:"#f6f8fa" }}>
                  <td colSpan={3} style={{ ...tdStyle, fontWeight:700, borderTop:"1px solid #eaeaea", borderBottom:"none" }}>
                    {(selectedCat ? catExpenses : monthExpenses).length} transactions
                  </td>
                  <td style={{ ...tdStyle, textAlign:"right", fontWeight:800, fontSize:15, color:"#e11d48", letterSpacing:"-0.5px", borderTop:"1px solid #eaeaea", borderBottom:"none" }}>
                    -{fmt(selectedCat
                      ? catExpenses.reduce((s,e) => s + (parseFloat(e.amount)||0), 0)
                      : totalMonthExpenses
                    )}
                  </td>
                  <td style={{ borderTop:"1px solid #eaeaea", borderBottom:"none" }} />
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}

      {/* ── Category progress bars ── */}
      <div className="card">
        <div className="card-title" style={{ marginBottom:16 }}>
          Top Spending Categories
        </div>
        {catSpend
          .sort((a, b) => b.spent - a.spent)
          .map(cat => (
            <div
              key={cat.name}
              style={{
                marginBottom: 16,
                cursor:       "pointer",
                padding:      "8px",
                borderRadius: 8,
                background:   selectedCat === cat.name ? "#f0f7ff" : "transparent",
                border:       selectedCat === cat.name ? "1px solid #bfdbfe" : "1px solid transparent",
                transition:   "all 0.15s",
              }}
              onClick={() => {
                setSelectedCat(prev => prev === cat.name ? null : cat.name);
                setSelectedMonth(null);
              }}
            >
              <div style={{ display:"flex", justifyContent:"space-between", fontSize:13, marginBottom:6 }}>
                <span style={{ fontWeight:600, color:"#0d0d0d" }}>
                  {cat.icon} {cat.name}
                </span>
                <div style={{ display:"flex", gap:12, alignItems:"center" }}>
                  {cat.budget > 0 && (
                    <span style={{ fontSize:11, color:"#aaa" }}>
                      Budget: {fmt(cat.budget)}
                    </span>
                  )}
                  <span style={{
                    fontWeight: 700,
                    color:      cat.spent > cat.budget && cat.budget > 0 ? "#e11d48" : "#0d0d0d",
                    letterSpacing:"-0.2px",
                  }}>
                    {fmt(cat.spent)}
                  </span>
                </div>
              </div>
              <div style={{ background:"#f0f0f0", borderRadius:100, height:6, overflow:"hidden" }}>
                <div style={{
                  height:       "100%",
                  borderRadius: 100,
                  background:   cat.spent > cat.budget && cat.budget > 0 ? "#e11d48" : cat.color,
                  width:        `${cat.pct || 100}%`,
                  transition:   "width .6s",
                }} />
              </div>
              {cat.budget > 0 && (
                <div style={{ display:"flex", justifyContent:"space-between", fontSize:10, color:"#aaa", marginTop:4, fontWeight:500 }}>
                  <span>{cat.pct.toFixed(0)}% used</span>
                  <span>
                    {cat.spent > cat.budget
                      ? `${fmt(cat.spent - cat.budget)} over`
                      : `${fmt(cat.budget - cat.spent)} remaining`
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
        <div className="card-title" style={{ marginBottom:16 }}>This Month Summary</div>
        <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit, minmax(160px,1fr))", gap:12 }}>
          {[
            {
              label: "Total Spent",
              value: fmt(thisMonthExp.reduce((s,e) => s + (parseFloat(e.amount)||0), 0)),
              color: "#e11d48",
            },
            {
              label: "Avg per Transaction",
              value: thisMonthExp.length > 0
                ? fmt(thisMonthExp.reduce((s,e) => s + (parseFloat(e.amount)||0), 0) / thisMonthExp.length)
                : fmt(0),
              color: "#888",
            },
            {
              label: "Largest Expense",
              value: thisMonthExp.length > 0
                ? fmt(Math.max(...thisMonthExp.map(e => parseFloat(e.amount)||0)))
                : fmt(0),
              color: "#e11d48",
            },
            {
              label: "Transactions",
              value: thisMonthExp.length,
              color: "#0070f3",
            },
          ].map(stat => (
            <div key={stat.label} style={{
              background:   "#fafafa",
              borderRadius: 10,
              padding:      "14px",
              border:       "1px solid #f0f0f0",
            }}>
              <div style={{ fontSize:10, color:"#aaa", textTransform:"uppercase", letterSpacing:"0.5px", marginBottom:6, fontWeight:600 }}>
                {stat.label}
              </div>
              <div style={{ fontWeight:800, fontSize:18, color:stat.color, letterSpacing:"-0.5px" }}>
                {stat.value}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Over budget warning ── */}
      {catSpend.some(c => c.spent > c.budget && c.budget > 0) && (
        <div style={{
          background:   "#fff1f2",
          border:       "1px solid #fecdd3",
          borderRadius: 12,
          padding:      "16px 20px",
        }}>
          <div style={{ fontWeight:700, color:"#e11d48", marginBottom:10, fontSize:14 }}>
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
                borderBottom:   "1px solid #fecdd3",
              }}>
                <span style={{ color:"#0d0d0d", fontSize:13, fontWeight:600 }}>
                  {cat.icon} {cat.name}
                </span>
                <span style={{ color:"#e11d48", fontWeight:700, fontSize:13 }}>
                  {fmt(cat.spent - cat.budget)} over
                </span>
              </div>
            ))
          }
        </div>
      )}
    </>
  );
}