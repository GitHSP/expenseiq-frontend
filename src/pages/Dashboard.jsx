import { useState } from "react";
import {
  PieChart, Pie, Cell, BarChart, Bar,
  XAxis, YAxis, Tooltip, ResponsiveContainer, Legend
} from "recharts";
import ExchangeRatesWidget from "../components/ExchangeRatesWidget";
import { CATEGORIES, MONTHS } from "../constants/categories";
import { INCOME_CATEGORIES }  from "../hooks/useIncome";

const TOOLTIP_STYLE = {
  background:   "#ffffff",
  border:       "1px solid #eaeaea",
  borderRadius: 8,
  color:        "#0d0d0d",
  fontSize:     12,
  fontFamily:   "'Inter', sans-serif",
  boxShadow:    "0 4px 12px rgba(0,0,0,0.08)",
};

// ── Reusable row styles ──
const rowStyle = {
  display:      "flex",
  alignItems:   "center",
  gap:          12,
  padding:      "12px 14px",
  background:   "#fafafa",
  borderRadius: 10,
  border:       "1px solid #f0f0f0",
  marginBottom: 8,
  transition:   "all 0.12s",
};

export default function Dashboard({
  expenses, budgets, onEdit, onDelete, onViewAll,
  incomes, onEditIncome, onDeleteIncome, onAddIncome,
  currency, rates, getRate, formatAmount,
  getLastUpdatedText, ratesLoading, ratesError, refreshRates,
}) {
  const now          = new Date();
  const currentMonth = now.getMonth();
  const currentYear  = now.getFullYear();
  const dayOfMonth   = now.getDate();

  // ── Active card state ──
  const [activeCard, setActiveCard] = useState(null);

  // ── Filter this month ──
  const thisMonthExp = expenses.filter(e => {
    const d = new Date(e.date);
    return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
  });

  const thisMonthInc = incomes.filter(i => {
    const d = new Date(i.date);
    return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
  });

  // ── Totals ──
  const totalExpenses = thisMonthExp.reduce((s, e) => s + (parseFloat(e.amount) || 0), 0);
  const totalIncome   = thisMonthInc.reduce((s, i) => s + (parseFloat(i.amount) || 0), 0);
  const netBalance    = totalIncome - totalExpenses;
  const savingsRate   = totalIncome > 0 ? ((netBalance / totalIncome) * 100).toFixed(1) : 0;
  const dailyAvg      = dayOfMonth > 0 ? (totalExpenses / dayOfMonth).toFixed(2) : 0;

  // ── Over budget categories ──
  const overBudgetCats = CATEGORIES.filter(cat => {
    const spent  = thisMonthExp
      .filter(e => e.category === cat.name)
      .reduce((s, e) => s + (parseFloat(e.amount) || 0), 0);
    return spent > (parseFloat(budgets[cat.name]) || 0) && (parseFloat(budgets[cat.name]) || 0) > 0;
  }).map(cat => {
    const spent  = thisMonthExp
      .filter(e => e.category === cat.name)
      .reduce((s, e) => s + (parseFloat(e.amount) || 0), 0);
    const budget = parseFloat(budgets[cat.name]) || 0;
    return { ...cat, spent, budget, over: spent - budget };
  });

  // ── Pie chart ──
  const expensePieData = CATEGORIES.map(cat => ({
    name:  cat.name,
    value: thisMonthExp
      .filter(e => e.category === cat.name)
      .reduce((s, e) => s + (parseFloat(e.amount) || 0), 0),
    color: cat.color,
  })).filter(c => c.value > 0);

  // ── Bar chart ──
  const incomeVsExpenseData = MONTHS.map((m, i) => {
    const monthExp = expenses
      .filter(e => new Date(e.date).getMonth() === i && new Date(e.date).getFullYear() === currentYear)
      .reduce((s, e) => s + (parseFloat(e.amount) || 0), 0);
    const monthInc = incomes
      .filter(inc => new Date(inc.date).getMonth() === i && new Date(inc.date).getFullYear() === currentYear)
      .reduce((s, inc) => s + (parseFloat(inc.amount) || 0), 0);
    return {
      name:    m.slice(0, 3),
      Income:  parseFloat(monthInc.toFixed(2)),
      Expense: parseFloat(monthExp.toFixed(2)),
    };
  });

  const fmt = v => formatAmount
    ? formatAmount(parseFloat(v) || 0)
    : `$${(parseFloat(v) || 0).toFixed(2)}`;

  // ── Toggle active card ──
  function handleCardClick(cardId) {
    setActiveCard(prev => prev === cardId ? null : cardId);
  }

  // ── Stat cards config ──
  const statCards = [
    {
      id:       "expenses",
      label:    "This Month",
      value:    fmt(totalExpenses),
      sub:      `${thisMonthExp.length} expenses · avg ${fmt(dailyAvg)}/day`,
      gradient: "linear-gradient(135deg, #e11d48, #be123c)",
    },
    {
      id:       "income",
      label:    "Income",
      value:    fmt(totalIncome),
      sub:      `${thisMonthInc.length} entries · ${savingsRate}% saved`,
      gradient: "linear-gradient(135deg, #059669, #047857)",
    },
    {
      id:       "balance",
      label:    "Net Balance",
      value:    fmt(netBalance),
      sub:      netBalance >= 0 ? "↑ Surplus" : "↓ Deficit",
      gradient: netBalance >= 0
        ? "linear-gradient(135deg, #0070f3, #0050b3)"
        : "linear-gradient(135deg, #e11d48, #be123c)",
    },
    {
      id:       "overbudget",
      label:    "Over Budget",
      value:    overBudgetCats.length,
      sub:      "categories this month",
      gradient: "linear-gradient(135deg, #f59e0b, #d97706)",
    },
  ];

  return (
    <>
      {/* ── Page header ── */}
      <div style={{ marginBottom:28 }}>
        <div className="page-title">Dashboard</div>
        <div className="page-sub">
          {MONTHS[currentMonth]} {currentYear}
        </div>
      </div>

      {/* ── Clickable Stat cards ── */}
      <div className="stat-grid" style={{ marginBottom:16 }}>
        {statCards.map(card => (
          <div
            key={card.id}
            onClick={() => handleCardClick(card.id)}
            style={{
              background:   card.gradient,
              borderRadius: 12,
              padding:      "20px",
              color:        "#fff",
              cursor:       "pointer",
              transition:   "all 0.2s",
              transform:    activeCard === card.id ? "translateY(-3px)" : "translateY(0)",
              boxShadow:    activeCard === card.id
                ? "0 8px 24px rgba(0,0,0,0.18)"
                : "0 1px 3px rgba(0,0,0,0.08)",
              outline:      activeCard === card.id ? "3px solid rgba(255,255,255,0.4)" : "none",
              outlineOffset:"2px",
            }}
          >
            <div style={{ fontSize:10, fontWeight:600, textTransform:"uppercase", letterSpacing:"0.8px", opacity:0.75, marginBottom:8 }}>
              {card.label}
            </div>
            <div style={{ fontSize:22, fontWeight:800, letterSpacing:"-0.8px", lineHeight:1.1, marginBottom:6 }}>
              {card.value}
            </div>
            <div style={{ fontSize:11, opacity:0.65, fontWeight:500, marginBottom:8 }}>
              {card.sub}
            </div>
            <div style={{ fontSize:10, opacity:0.6, fontWeight:600, letterSpacing:"0.3px" }}>
              {activeCard === card.id ? "▲ Click to collapse" : "▼ Click to expand"}
            </div>
          </div>
        ))}
      </div>

      {/* ── Active card detail panel ── */}
      {activeCard && (
        <div style={{
          background:   "#ffffff",
          borderRadius: 12,
          border:       "1px solid #eaeaea",
          marginBottom: 20,
          overflow:     "hidden",
          boxShadow:    "0 4px 16px rgba(0,0,0,0.06)",
          animation:    "fadeIn 0.2s ease",
        }}>

          {/* ── EXPENSES PANEL ── */}
          {activeCard === "expenses" && (
            <>
              <div style={{ padding:"18px 20px", borderBottom:"1px solid #f0f0f0", display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                <div>
                  <div style={{ fontWeight:800, fontSize:16, color:"#0d0d0d", letterSpacing:"-0.4px" }}>
                    This Month's Expenses
                  </div>
                  <div style={{ fontSize:12, color:"#888", marginTop:2 }}>
                    {thisMonthExp.length} transactions · Total {fmt(totalExpenses)}
                  </div>
                </div>
                <button className="btn-ghost" onClick={onViewAll}>View all →</button>
              </div>

              {/* Category breakdown */}
              <div style={{ padding:"16px 20px", borderBottom:"1px solid #f0f0f0" }}>
                <div style={{ fontSize:11, color:"#888", fontWeight:600, textTransform:"uppercase", letterSpacing:"0.5px", marginBottom:12 }}>
                  By Category
                </div>
                <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
                  {CATEGORIES.map(cat => {
                    const spent = thisMonthExp
                      .filter(e => e.category === cat.name)
                      .reduce((s, e) => s + (parseFloat(e.amount) || 0), 0);
                    if (spent === 0) return null;
                    const pct = totalExpenses > 0 ? (spent / totalExpenses) * 100 : 0;
                    return (
                      <div key={cat.name}>
                        <div style={{ display:"flex", justifyContent:"space-between", fontSize:12, marginBottom:4 }}>
                          <span style={{ fontWeight:600, color:"#0d0d0d" }}>
                            {cat.icon} {cat.name}
                          </span>
                          <div style={{ display:"flex", gap:12, alignItems:"center" }}>
                            <span style={{ color:"#888", fontSize:11 }}>{pct.toFixed(0)}%</span>
                            <span style={{ fontWeight:700, color:"#e11d48" }}>{fmt(spent)}</span>
                          </div>
                        </div>
                        <div style={{ background:"#f0f0f0", borderRadius:100, height:5, overflow:"hidden" }}>
                          <div style={{ height:"100%", borderRadius:100, background:cat.color, width:`${pct}%`, transition:"width 0.6s" }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Transactions list */}
              <div style={{ padding:"16px 20px" }}>
                <div style={{ fontSize:11, color:"#888", fontWeight:600, textTransform:"uppercase", letterSpacing:"0.5px", marginBottom:12 }}>
                  All Transactions
                </div>
                {thisMonthExp.length === 0 ? (
                  <div style={{ textAlign:"center", color:"#ccc", padding:"20px 0", fontSize:13 }}>
                    No expenses this month
                  </div>
                ) : (
                  thisMonthExp.map(exp => {
                    const cat = CATEGORIES.find(c => c.name === exp.category);
                    return (
                      <div key={exp.id} style={rowStyle}>
                        <span style={{ fontSize:20, width:32, textAlign:"center", flexShrink:0 }}>
                          {cat?.icon || "📦"}
                        </span>
                        <div style={{ flex:1, minWidth:0 }}>
                          <div style={{ fontWeight:600, fontSize:13, color:"#0d0d0d", whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>
                            {exp.title}
                          </div>
                          <div style={{ fontSize:11, color:"#aaa", marginTop:1 }}>
                            {exp.category} · {exp.date}
                          </div>
                        </div>
                        <div style={{ fontWeight:700, fontSize:14, color:"#e11d48", flexShrink:0 }}>
                          -{fmt(exp.amount)}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </>
          )}

          {/* ── INCOME PANEL ── */}
          {activeCard === "income" && (
            <>
              <div style={{ padding:"18px 20px", borderBottom:"1px solid #f0f0f0", display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                <div>
                  <div style={{ fontWeight:800, fontSize:16, color:"#0d0d0d", letterSpacing:"-0.4px" }}>
                    This Month's Income
                  </div>
                  <div style={{ fontSize:12, color:"#888", marginTop:2 }}>
                    {thisMonthInc.length} entries · Total {fmt(totalIncome)}
                  </div>
                </div>
                <button
                  className="btn-primary"
                  style={{ padding:"7px 14px", fontSize:12 }}
                  onClick={onAddIncome}
                >
                  + Add Income
                </button>
              </div>

              {/* Income by category */}
              <div style={{ padding:"16px 20px", borderBottom:"1px solid #f0f0f0" }}>
                <div style={{ fontSize:11, color:"#888", fontWeight:600, textTransform:"uppercase", letterSpacing:"0.5px", marginBottom:12 }}>
                  By Source
                </div>
                <div style={{ display:"flex", flexWrap:"wrap", gap:10 }}>
                  {INCOME_CATEGORIES.map(cat => {
                    const total = thisMonthInc
                      .filter(i => i.category === cat.name)
                      .reduce((s, i) => s + (parseFloat(i.amount) || 0), 0);
                    if (total === 0) return null;
                    return (
                      <div key={cat.name} style={{
                        display:"flex", alignItems:"center", gap:8,
                        background:"#f6f8fa", borderRadius:8,
                        padding:"8px 14px", border:"1px solid #eaeaea",
                      }}>
                        <span style={{ fontSize:16 }}>{cat.icon}</span>
                        <div>
                          <div style={{ fontSize:10, color:"#aaa", fontWeight:600, textTransform:"uppercase", letterSpacing:"0.5px" }}>
                            {cat.name}
                          </div>
                          <div style={{ fontWeight:700, fontSize:13, color:"#059669", letterSpacing:"-0.2px" }}>
                            {fmt(total)}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  {thisMonthInc.length === 0 && (
                    <div style={{ color:"#ccc", fontSize:13 }}>No income this month</div>
                  )}
                </div>
              </div>

              {/* Income transactions */}
              <div style={{ padding:"16px 20px" }}>
                <div style={{ fontSize:11, color:"#888", fontWeight:600, textTransform:"uppercase", letterSpacing:"0.5px", marginBottom:12 }}>
                  All Transactions
                </div>
                {thisMonthInc.length === 0 ? (
                  <div style={{ textAlign:"center", color:"#ccc", padding:"20px 0", fontSize:13 }}>
                    No income this month
                  </div>
                ) : (
                  thisMonthInc.map(inc => {
                    const cat = INCOME_CATEGORIES.find(c => c.name === inc.category);
                    return (
                      <div key={inc.id} style={rowStyle}>
                        <span style={{ fontSize:20, width:32, textAlign:"center", flexShrink:0 }}>
                          {cat?.icon || "💰"}
                        </span>
                        <div style={{ flex:1, minWidth:0 }}>
                          <div style={{ fontWeight:600, fontSize:13, color:"#0d0d0d", whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>
                            {inc.title}
                          </div>
                          <div style={{ fontSize:11, color:"#aaa", marginTop:1 }}>
                            {inc.category} · {inc.date}
                          </div>
                        </div>
                        <div style={{ fontWeight:700, fontSize:14, color:"#059669", flexShrink:0 }}>
                          +{fmt(inc.amount)}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </>
          )}

          {/* ── NET BALANCE PANEL ── */}
          {activeCard === "balance" && (
            <>
              <div style={{ padding:"18px 20px", borderBottom:"1px solid #f0f0f0" }}>
                <div style={{ fontWeight:800, fontSize:16, color:"#0d0d0d", letterSpacing:"-0.4px" }}>
                  Income vs Expenses Breakdown
                </div>
                <div style={{ fontSize:12, color:"#888", marginTop:2 }}>
                  {MONTHS[currentMonth]} {currentYear}
                </div>
              </div>

              {/* Summary numbers */}
              <div style={{ padding:"16px 20px", borderBottom:"1px solid #f0f0f0" }}>
                <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:12 }}>
                  {[
                    { label:"Total Income",   value:fmt(totalIncome),   color:"#059669" },
                    { label:"Total Expenses", value:fmt(totalExpenses), color:"#e11d48" },
                    { label:"Net Balance",    value:fmt(Math.abs(netBalance)), color: netBalance >= 0 ? "#0070f3" : "#e11d48" },
                  ].map(s => (
                    <div key={s.label} style={{ background:"#fafafa", borderRadius:10, padding:"14px", border:"1px solid #f0f0f0", textAlign:"center" }}>
                      <div style={{ fontSize:10, color:"#aaa", fontWeight:600, textTransform:"uppercase", letterSpacing:"0.5px", marginBottom:6 }}>
                        {s.label}
                      </div>
                      <div style={{ fontWeight:800, fontSize:18, color:s.color, letterSpacing:"-0.5px" }}>
                        {s.value}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Savings rate bar */}
                <div style={{ marginTop:16 }}>
                  <div style={{ display:"flex", justifyContent:"space-between", fontSize:12, marginBottom:6, fontWeight:600 }}>
                    <span style={{ color:"#888" }}>Savings Rate</span>
                    <span style={{ color: parseFloat(savingsRate) >= 0 ? "#059669" : "#e11d48" }}>
                      {savingsRate}%
                    </span>
                  </div>
                  <div style={{ background:"#f0f0f0", borderRadius:100, height:8, overflow:"hidden" }}>
                    <div style={{
                      height:       "100%",
                      borderRadius: 100,
                      background:   parseFloat(savingsRate) >= 20
                        ? "#059669"
                        : parseFloat(savingsRate) >= 0
                        ? "#f59e0b"
                        : "#e11d48",
                      width:`${Math.min(Math.max(parseFloat(savingsRate), 0), 100)}%`,
                      transition:"width 0.6s",
                    }} />
                  </div>
                  <div style={{ fontSize:11, color:"#aaa", marginTop:5 }}>
                    {parseFloat(savingsRate) >= 20
                      ? "🎉 Great savings rate!"
                      : parseFloat(savingsRate) >= 0
                      ? "💡 Try to save at least 20% of income"
                      : "⚠️ Spending more than earning this month"
                    }
                  </div>
                </div>
              </div>

              {/* Combined transactions feed */}
              <div style={{ padding:"16px 20px" }}>
                <div style={{ fontSize:11, color:"#888", fontWeight:600, textTransform:"uppercase", letterSpacing:"0.5px", marginBottom:12 }}>
                  All Transactions This Month
                </div>
                {[
                  ...thisMonthExp.map(e => ({ ...e, kind:"expense" })),
                  ...thisMonthInc.map(i => ({ ...i, kind:"income"  })),
                ]
                  .sort((a, b) => new Date(b.date) - new Date(a.date))
                  .map(tx => {
                    const isExp = tx.kind === "expense";
                    const cat   = isExp
                      ? CATEGORIES.find(c => c.name === tx.category)
                      : INCOME_CATEGORIES.find(c => c.name === tx.category);
                    return (
                      <div key={`${tx.kind}-${tx.id}`} style={rowStyle}>
                        <span style={{ fontSize:20, width:32, textAlign:"center", flexShrink:0 }}>
                          {cat?.icon || (isExp ? "📦" : "💰")}
                        </span>
                        <div style={{ flex:1, minWidth:0 }}>
                          <div style={{ fontWeight:600, fontSize:13, color:"#0d0d0d", whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>
                            {tx.title}
                          </div>
                          <div style={{ fontSize:11, color:"#aaa", marginTop:1 }}>
                            {tx.category} · {tx.date}
                          </div>
                        </div>
                        <div style={{ fontWeight:700, fontSize:14, color: isExp ? "#e11d48" : "#059669", flexShrink:0 }}>
                          {isExp ? "-" : "+"}{fmt(tx.amount)}
                        </div>
                      </div>
                    );
                  })
                }
                {thisMonthExp.length === 0 && thisMonthInc.length === 0 && (
                  <div style={{ textAlign:"center", color:"#ccc", padding:"20px 0", fontSize:13 }}>
                    No transactions this month
                  </div>
                )}
              </div>
            </>
          )}

          {/* ── OVER BUDGET PANEL ── */}
          {activeCard === "overbudget" && (
            <>
              <div style={{ padding:"18px 20px", borderBottom:"1px solid #f0f0f0" }}>
                <div style={{ fontWeight:800, fontSize:16, color:"#0d0d0d", letterSpacing:"-0.4px" }}>
                  Over Budget Categories
                </div>
                <div style={{ fontSize:12, color:"#888", marginTop:2 }}>
                  {overBudgetCats.length} categories exceeded this month
                </div>
              </div>

              <div style={{ padding:"16px 20px", borderBottom:"1px solid #f0f0f0" }}>
                {overBudgetCats.length === 0 ? (
                  <div style={{ textAlign:"center", padding:"24px 0" }}>
                    <div style={{ fontSize:32, marginBottom:8 }}>🎉</div>
                    <div style={{ fontWeight:700, color:"#059669", fontSize:15 }}>
                      All within budget!
                    </div>
                    <div style={{ fontSize:13, color:"#aaa", marginTop:4 }}>
                      Great job staying on track this month
                    </div>
                  </div>
                ) : (
                  overBudgetCats.map(cat => {
                    const pct = Math.min((cat.spent / cat.budget) * 100, 200);
                    return (
                      <div key={cat.name} style={{ marginBottom:16 }}>
                        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:6 }}>
                          <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                            <div style={{
                              width:28, height:28, borderRadius:6,
                              background:`${cat.color}15`,
                              border:`1px solid ${cat.color}30`,
                              display:"flex", alignItems:"center",
                              justifyContent:"center", fontSize:16,
                            }}>
                              {cat.icon}
                            </div>
                            <div>
                              <div style={{ fontWeight:700, fontSize:13, color:"#0d0d0d" }}>{cat.name}</div>
                              <div style={{ fontSize:11, color:"#e11d48", fontWeight:600 }}>
                                {fmt(cat.over)} over budget
                              </div>
                            </div>
                          </div>
                          <div style={{ textAlign:"right" }}>
                            <div style={{ fontWeight:700, fontSize:13, color:"#e11d48" }}>{fmt(cat.spent)}</div>
                            <div style={{ fontSize:11, color:"#aaa" }}>of {fmt(cat.budget)}</div>
                          </div>
                        </div>
                        <div style={{ background:"#f0f0f0", borderRadius:100, height:6, overflow:"hidden" }}>
                          <div style={{
                            height:"100%", borderRadius:100,
                            background:"#e11d48",
                            width:`${Math.min(pct, 100)}%`,
                            transition:"width 0.6s",
                          }} />
                        </div>
                        <div style={{ fontSize:10, color:"#e11d48", marginTop:4, fontWeight:600 }}>
                          {pct.toFixed(0)}% of budget used
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Transactions for over-budget categories */}
              <div style={{ padding:"16px 20px" }}>
                <div style={{ fontSize:11, color:"#888", fontWeight:600, textTransform:"uppercase", letterSpacing:"0.5px", marginBottom:12 }}>
                  Transactions in Over-Budget Categories
                </div>
                {thisMonthExp
                  .filter(e => overBudgetCats.find(c => c.name === e.category))
                  .sort((a, b) => new Date(b.date) - new Date(a.date))
                  .map(exp => {
                    const cat = CATEGORIES.find(c => c.name === exp.category);
                    return (
                      <div key={exp.id} style={{ ...rowStyle, borderLeft:`3px solid #e11d48` }}>
                        <span style={{ fontSize:20, width:32, textAlign:"center", flexShrink:0 }}>
                          {cat?.icon || "📦"}
                        </span>
                        <div style={{ flex:1, minWidth:0 }}>
                          <div style={{ fontWeight:600, fontSize:13, color:"#0d0d0d", whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>
                            {exp.title}
                          </div>
                          <div style={{ fontSize:11, color:"#aaa", marginTop:1 }}>
                            {exp.category} · {exp.date}
                          </div>
                        </div>
                        <div style={{ fontWeight:700, fontSize:14, color:"#e11d48", flexShrink:0 }}>
                          -{fmt(exp.amount)}
                        </div>
                      </div>
                    );
                  })
                }
                {overBudgetCats.length > 0 && thisMonthExp.filter(e => overBudgetCats.find(c => c.name === e.category)).length === 0 && (
                  <div style={{ textAlign:"center", color:"#ccc", padding:"20px 0", fontSize:13 }}>
                    No transactions found
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      )}

      {/* ── Exchange rates widget ── */}
      {refreshRates && (
        <ExchangeRatesWidget
          rates={rates}
          currency={currency}
          getRate={getRate}
          getLastUpdatedText={getLastUpdatedText}
          loading={ratesLoading}
          error={ratesError}
          refresh={refreshRates}
        />
      )}

      {/* ── Charts ── */}
      <div className="charts-grid">
        <div className="card">
          <div className="card-title" style={{ marginBottom:16 }}>
            Income vs Expenses {currentYear}
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={incomeVsExpenseData} barGap={4}>
              <XAxis dataKey="name" tick={{ fill:"#aaa", fontSize:11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill:"#aaa", fontSize:10 }} axisLine={false} tickLine={false} width={40} />
              <Tooltip formatter={v => fmt(v)} contentStyle={TOOLTIP_STYLE} />
              <Legend wrapperStyle={{ fontSize:11 }} />
              <Bar dataKey="Income"  fill="#059669" radius={[5,5,0,0]} />
              <Bar dataKey="Expense" fill="#e11d48" radius={[5,5,0,0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="card">
          <div className="card-title" style={{ marginBottom:16 }}>
            Spending by Category
          </div>
          {expensePieData.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">📊</div>
              <div style={{ fontSize:13, color:"#aaa" }}>No expenses this month</div>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={expensePieData} cx="50%" cy="50%" innerRadius={55} outerRadius={88} paddingAngle={3} dataKey="value">
                  {expensePieData.map((e, i) => <Cell key={i} fill={e.color} />)}
                </Pie>
                <Tooltip formatter={v => fmt(v)} contentStyle={TOOLTIP_STYLE} />
                <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize:11 }} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* ── Recent Income ── */}
      <div className="card">
        <div className="card-header">
          <span className="card-title">Recent Income</span>
          <button className="btn-primary" style={{ padding:"7px 14px", fontSize:12 }} onClick={onAddIncome}>
            + Add Income
          </button>
        </div>
        {incomes.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">💰</div>
            <div style={{ fontWeight:600, color:"#ccc", marginBottom:4 }}>No income yet</div>
          </div>
        ) : (
          incomes.slice(0, 3).map(income => {
            const cat = INCOME_CATEGORIES.find(c => c.name === income.category);
            return (
              <div key={income.id} style={rowStyle}>
                <span style={{ fontSize:20, width:32, textAlign:"center", flexShrink:0 }}>{cat?.icon || "💰"}</span>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ fontWeight:600, fontSize:13, color:"#0d0d0d", whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>
                    {income.title}
                  </div>
                  <div style={{ fontSize:11, color:"#aaa", marginTop:1 }}>{income.category} · {income.date}</div>
                </div>
                <div style={{ fontWeight:700, fontSize:14, color:"#059669", flexShrink:0 }}>
                  +{fmt(income.amount)}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* ── Recent Expenses ── */}
      <div className="card">
        <div className="card-header">
          <span className="card-title">Recent Expenses</span>
          <button className="btn-ghost" onClick={onViewAll}>View all →</button>
        </div>
        {expenses.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">💸</div>
            <div style={{ fontWeight:600, color:"#ccc", marginBottom:4 }}>No expenses yet</div>
          </div>
        ) : (
          expenses.slice(0, 5).map(exp => {
            const cat = CATEGORIES.find(c => c.name === exp.category);
            return (
              <div key={exp.id} style={rowStyle}>
                <span style={{ fontSize:20, width:32, textAlign:"center", flexShrink:0 }}>{cat?.icon || "📦"}</span>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ fontWeight:600, fontSize:13, color:"#0d0d0d", whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>
                    {exp.title}
                  </div>
                  <div style={{ fontSize:11, color:"#aaa", marginTop:1 }}>{exp.category} · {exp.date}</div>
                </div>
                <div style={{ fontWeight:700, fontSize:14, color:"#e11d48", flexShrink:0 }}>
                  -{fmt(exp.amount)}
                </div>
              </div>
            );
          })
        )}
      </div>
    </>
  );
}