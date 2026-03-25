// ─────────────────────────────────────────────
// DebtPayoffTracker — Avalanche Debt Payoff Page
// 3 tabs: Overview | Payoff Plan | Action Plan
// ─────────────────────────────────────────────

import { useState, useMemo } from "react";
import {
  AreaChart, Area, XAxis, YAxis,
  Tooltip, ResponsiveContainer, CartesianGrid,
} from "recharts";
import { calculateAvalanche, formatMonths } from "../utils/avalanche";

// ── Design tokens matching ExpenseIQ theme ──
const C = {
  bg:       "#f6f8fa",
  card:     "#ffffff",
  border:   "#eaeaea",
  text:     "#0d0d0d",
  muted:    "#888",
  blue:     "#0070f3",
  green:    "#059669",
  red:      "#e11d48",
  amber:    "#f59e0b",
  blueBg:   "#f0f7ff",
  greenBg:  "#f0fdf4",
  redBg:    "#fff1f2",
  amberBg:  "#fffbeb",
};

const TOOLTIP_STYLE = {
  background:   C.card,
  border:       `1px solid ${C.border}`,
  borderRadius: 8,
  color:        C.text,
  fontSize:     12,
  fontFamily:   "'Inter', sans-serif",
  boxShadow:    "0 4px 12px rgba(0,0,0,0.08)",
};

// Priority colors for debts
const PRIORITY_COLORS = [C.red, C.amber, C.blue, "#7c3aed", "#0891b2", "#059669", "#64748b"];

export default function DebtPayoffTracker({ debts, formatAmount }) {
  const [activeTab,   setActiveTab]   = useState("overview");
  const [extraAmount, setExtraAmount] = useState(150);
  const [inputExtra,  setInputExtra]  = useState("150");
  const [planKey,     setPlanKey]     = useState(0); // force recalculate

  // ── Run avalanche calculation ──
  const plan = useMemo(() => {
    return calculateAvalanche(debts, extraAmount);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debts, extraAmount, planKey]);

  // ── Chart data — total balance over time (every 3 months) ──
  const chartData = useMemo(() => {
    if (!plan) return [];
    return plan.monthlyPlans
      .filter((_, i) => i % 3 === 0 || i === plan.monthlyPlans.length - 1)
      .map(m => ({
        month:   `M${m.month}`,
        Balance: parseFloat(m.totalBalance.toFixed(2)),
      }));
  }, [plan]);

  function handleRecalculate() {
    const val = parseFloat(inputExtra);
    if (!isNaN(val) && val >= 0) {
      setExtraAmount(val);
      setPlanKey(k => k + 1);
    }
  }

  // ── No active debts ──
  if (!plan) {
    return (
      <div style={{ textAlign:"center", padding:"60px 20px" }}>
        <div style={{ fontSize:48, marginBottom:16 }}>🎉</div>
        <div style={{ fontSize:20, fontWeight:800, color:C.text, marginBottom:8, letterSpacing:"-0.5px" }}>
          No active debts!
        </div>
        <div style={{ color:C.muted, fontSize:14 }}>
          Add debts in the Payments tab to see your payoff plan.
        </div>
      </div>
    );
  }

  const totalDebt = plan.originalDebts.reduce((s, d) => s + d.balance, 0);

  return (
    <>
      {/* ── Page header ── */}
      <div style={{ marginBottom:24 }}>
        <div className="page-title">Debt Payoff Tracker</div>
        <div className="page-sub">
          Avalanche method — highest interest rate first
        </div>
      </div>

      {/* ── Extra payment + Recalculate ── */}
      <div style={{
        background: C.card,
        border:     `1px solid ${C.border}`,
        borderRadius: 12,
        padding:    "16px 20px",
        marginBottom: 20,
        display:    "flex",
        alignItems: "center",
        gap:        16,
        flexWrap:   "wrap",
        boxShadow:  "0 1px 3px rgba(0,0,0,0.04)",
      }}>
        <div style={{ display:"flex", alignItems:"center", gap:10, flex:1, minWidth:220 }}>
          <span style={{ fontSize:20 }}>💸</span>
          <div>
            <div style={{ fontSize:11, color:C.muted, fontWeight:600, textTransform:"uppercase", letterSpacing:"0.5px", marginBottom:4 }}>
              Extra Monthly Payment
            </div>
            <div style={{ display:"flex", alignItems:"center", gap:8 }}>
              <span style={{ fontWeight:700, color:C.muted, fontSize:14 }}>$</span>
              <input
                type="number"
                inputMode="decimal"
                value={inputExtra}
                onChange={e => setInputExtra(e.target.value)}
                onKeyDown={e => e.key === "Enter" && handleRecalculate()}
                style={{
                  width:        100,
                  background:   C.bg,
                  border:       `1px solid ${C.border}`,
                  borderRadius: 8,
                  padding:      "7px 10px",
                  color:        C.text,
                  fontSize:     15,
                  fontFamily:   "inherit",
                  fontWeight:   700,
                  outline:      "none",
                }}
              />
              <span style={{ fontSize:12, color:C.muted }}>/month beyond minimums</span>
            </div>
          </div>
        </div>

        <button
          onClick={handleRecalculate}
          style={{
            background:    C.blue,
            color:         "#fff",
            border:        "none",
            padding:       "10px 20px",
            borderRadius:  8,
            fontWeight:    600,
            fontSize:      13,
            fontFamily:    "inherit",
            cursor:        "pointer",
            display:       "flex",
            alignItems:    "center",
            gap:           6,
            transition:    "all 0.15s",
          }}
        >
          🔄 Recalculate Plan
        </button>

        <div style={{
          background:   C.greenBg,
          border:       `1px solid #bbf7d0`,
          borderRadius: 8,
          padding:      "8px 14px",
          fontSize:     12,
          color:        C.green,
          fontWeight:   600,
        }}>
          ✅ Avalanche method saves the most interest
        </div>
      </div>

      {/* ── Summary stat cards ── */}
      <div className="stat-grid" style={{ marginBottom:24 }}>
        {[
          {
            label:    "Total Debt",
            value:    formatAmount ? formatAmount(totalDebt) : `$${totalDebt.toFixed(2)}`,
            sub:      `${plan.originalDebts.length} active debts`,
            gradient: "linear-gradient(135deg, #e11d48, #be123c)",
          },
          {
            label:    "Debt Free In",
            value:    formatMonths(plan.totalMonths),
            sub:      `By ${plan.payoffDate}`,
            gradient: "linear-gradient(135deg, #0070f3, #0050b3)",
          },
          {
            label:    "Total Interest",
            value:    formatAmount ? formatAmount(plan.totalInterest) : `$${plan.totalInterest.toFixed(2)}`,
            sub:      "you'll pay with this plan",
            gradient: "linear-gradient(135deg, #f59e0b, #d97706)",
          },
          {
            label:    "Monthly Total",
            value:    formatAmount ? formatAmount(plan.totalMonthly) : `$${plan.totalMonthly.toFixed(2)}`,
            sub:      `$${plan.totalMinimums.toFixed(0)} min + $${plan.extraPerMonth} extra`,
            gradient: "linear-gradient(135deg, #059669, #047857)",
          },
        ].map(card => (
          <div key={card.label} style={{
            background:   card.gradient,
            borderRadius: 12,
            padding:      "20px",
            color:        "#fff",
          }}>
            <div style={{ fontSize:10, fontWeight:600, textTransform:"uppercase", letterSpacing:"0.8px", opacity:0.75, marginBottom:8 }}>
              {card.label}
            </div>
            <div style={{ fontSize:22, fontWeight:800, letterSpacing:"-0.8px", lineHeight:1.1, marginBottom:6 }}>
              {card.value}
            </div>
            <div style={{ fontSize:11, opacity:0.65, fontWeight:500 }}>
              {card.sub}
            </div>
          </div>
        ))}
      </div>

      {/* ── Tabs ── */}
      <div style={{
        display:      "flex",
        gap:          4,
        marginBottom: 20,
        background:   C.card,
        border:       `1px solid ${C.border}`,
        borderRadius: 10,
        padding:      4,
        width:        "fit-content",
        boxShadow:    "0 1px 3px rgba(0,0,0,0.04)",
      }}>
        {[
          { id:"overview",   label:"📊 Overview"     },
          { id:"plan",       label:"📅 Payoff Plan"  },
          { id:"action",     label:"🎯 Action Plan"  },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={{
              background:   activeTab === tab.id ? C.blue : "transparent",
              color:        activeTab === tab.id ? "#fff" : C.muted,
              border:       "none",
              padding:      "8px 18px",
              borderRadius: 7,
              fontWeight:   600,
              fontSize:     13,
              fontFamily:   "inherit",
              cursor:       "pointer",
              transition:   "all 0.15s",
              letterSpacing:"-0.1px",
              whiteSpace:   "nowrap",
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* ════════════════════════════════════════
          TAB 1 — OVERVIEW
      ════════════════════════════════════════ */}
      {activeTab === "overview" && (
        <>
          {/* Payoff timeline chart */}
          <div className="card">
            <div className="card-title" style={{ marginBottom:16 }}>
              Balance Over Time
            </div>
            <ResponsiveContainer width="100%" height={240}>
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="balGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor={C.blue} stopOpacity={0.15} />
                    <stop offset="95%" stopColor={C.blue} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
                <XAxis
                  dataKey="month"
                  tick={{ fill:C.muted, fontSize:10, fontFamily:"Inter" }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fill:C.muted, fontSize:10, fontFamily:"Inter" }}
                  axisLine={false}
                  tickLine={false}
                  width={55}
                  tickFormatter={v => formatAmount ? formatAmount(v) : `$${v}`}
                />
                <Tooltip
                  formatter={v => [formatAmount ? formatAmount(v) : `$${v.toFixed(2)}`, "Balance"]}
                  contentStyle={TOOLTIP_STYLE}
                />
                <Area
                  type="monotone"
                  dataKey="Balance"
                  stroke={C.blue}
                  strokeWidth={2.5}
                  fill="url(#balGrad)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* Utilization bars per debt */}
          <div className="card">
            <div className="card-title" style={{ marginBottom:18 }}>
              Debt Utilization & Priority
            </div>
            {plan.debtOrder.map((debt, i) => {
              const utilPct = debt.limit > 0
                ? Math.min((debt.balance / debt.limit) * 100, 100)
                : debt.originalAmount > 0
                  ? Math.min((debt.balance / debt.originalAmount) * 100, 100)
                  : 0;
              const color    = PRIORITY_COLORS[i] || C.blue;
              const paidPct  = debt.originalAmount > 0
                ? Math.min(((debt.originalAmount - debt.balance) / debt.originalAmount) * 100, 100)
                : 0;

              return (
                <div key={debt.id} style={{ marginBottom:18 }}>
                  <div style={{
                    display:        "flex",
                    justifyContent: "space-between",
                    alignItems:     "center",
                    marginBottom:   8,
                  }}>
                    <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                      {/* Priority badge */}
                      <div style={{
                        background:   color,
                        color:        "#fff",
                        width:        24,
                        height:       24,
                        borderRadius: "50%",
                        display:      "flex",
                        alignItems:   "center",
                        justifyContent:"center",
                        fontSize:     11,
                        fontWeight:   800,
                        flexShrink:   0,
                      }}>
                        {i + 1}
                      </div>
                      <div>
                        <div style={{ fontWeight:600, fontSize:13, color:C.text, letterSpacing:"-0.1px" }}>
                          {debt.name}
                        </div>
                        <div style={{ fontSize:11, color:C.muted, marginTop:1 }}>
                          {debt.interestRate}% APR · {debt.type}
                          {i === 0 && (
                            <span style={{
                              marginLeft:   6,
                              background:   C.redBg,
                              color:        C.red,
                              padding:      "1px 6px",
                              borderRadius: 4,
                              fontWeight:   700,
                              fontSize:     10,
                            }}>
                              FOCUS HERE
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div style={{ textAlign:"right" }}>
                      <div style={{ fontWeight:700, fontSize:14, color:C.red, letterSpacing:"-0.3px" }}>
                        {formatAmount ? formatAmount(debt.balance) : `$${debt.balance.toFixed(2)}`}
                      </div>
                      <div style={{ fontSize:11, color:C.muted, marginTop:1 }}>
                        Payoff: {debt.payoffDate}
                      </div>
                    </div>
                  </div>

                  {/* Progress bar */}
                  <div style={{
                    background:   "#f0f0f0",
                    borderRadius: "100px",
                    height:       8,
                    overflow:     "hidden",
                  }}>
                    <div style={{
                      height:       "100%",
                      borderRadius: "100px",
                      background:   color,
                      width:        `${utilPct}%`,
                      transition:   "width 0.6s ease",
                    }} />
                  </div>

                  <div style={{
                    display:        "flex",
                    justifyContent: "space-between",
                    fontSize:       10,
                    color:          C.muted,
                    marginTop:      5,
                    fontWeight:     500,
                  }}>
                    <span>{utilPct.toFixed(0)}% utilized</span>
                    <span>{paidPct.toFixed(0)}% paid off · {formatMonths(debt.payoffMonth)} remaining</span>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* ════════════════════════════════════════
          TAB 2 — PAYOFF PLAN (month by month)
      ════════════════════════════════════════ */}
      {activeTab === "plan" && (
        <div className="card">
          <div style={{
            display:        "flex",
            justifyContent: "space-between",
            alignItems:     "center",
            marginBottom:   16,
            flexWrap:       "wrap",
            gap:            10,
          }}>
            <div>
              <div className="card-title">Month-by-Month Payoff Plan</div>
              <div style={{ fontSize:12, color:C.muted, marginTop:3 }}>
                Showing first 24 months · Extra ${plan.extraPerMonth}/month applied via Avalanche
              </div>
            </div>
            <div style={{
              background:   C.blueBg,
              border:       `1px solid #bfdbfe`,
              borderRadius: 8,
              padding:      "6px 12px",
              fontSize:     12,
              color:        C.blue,
              fontWeight:   600,
            }}>
              🏁 Debt free by {plan.payoffDate}
            </div>
          </div>

          {/* Table */}
          <div style={{ overflowX:"auto" }}>
            <table style={{
              width:           "100%",
              borderCollapse:  "collapse",
              fontSize:        12,
              fontFamily:      "Inter, sans-serif",
            }}>
              <thead>
                <tr style={{ background:"#f6f8fa" }}>
                  <th style={thStyle}>Month</th>
                  {plan.debtOrder.map((d, i) => (
                    <th key={d.id} style={{
                      ...thStyle,
                      color: PRIORITY_COLORS[i] || C.blue,
                    }}>
                      #{i+1} {d.name.length > 12 ? d.name.slice(0,12)+"…" : d.name}
                    </th>
                  ))}
                  <th style={{ ...thStyle, color:C.text }}>Total Balance</th>
                  <th style={{ ...thStyle, color:C.green }}>Extra Applied</th>
                </tr>
              </thead>
              <tbody>
                {plan.monthlyPlans.slice(0, 24).map((m, rowIdx) => (
                  <tr
                    key={m.month}
                    style={{ background: rowIdx % 2 === 0 ? "#ffffff" : "#fafafa" }}
                  >
                    <td style={{ ...tdStyle, fontWeight:600, color:C.muted }}>
                      Month {m.month}
                    </td>
                    {m.debts.map((d, i) => (
                      <td key={d.id} style={{
                        ...tdStyle,
                        color:      d.paidOff ? C.green : C.text,
                        fontWeight: d.paidOff ? 700 : 500,
                      }}>
                        {d.paidOff ? "✅ PAID" : (
                          formatAmount ? formatAmount(d.balance) : `$${d.balance.toFixed(2)}`
                        )}
                      </td>
                    ))}
                    <td style={{ ...tdStyle, fontWeight:700, color:C.red }}>
                      {formatAmount
                        ? formatAmount(m.totalBalance)
                        : `$${m.totalBalance.toFixed(2)}`
                      }
                    </td>
                    <td style={{ ...tdStyle, color:C.green, fontWeight:600 }}>
                      +{formatAmount
                        ? formatAmount(m.extraApplied)
                        : `$${m.extraApplied.toFixed(2)}`
                      }
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {plan.totalMonths > 24 && (
            <div style={{
              textAlign:   "center",
              padding:     "14px",
              color:       C.muted,
              fontSize:    12,
              borderTop:   `1px solid ${C.border}`,
              marginTop:   8,
            }}>
              + {plan.totalMonths - 24} more months until debt free
              ({plan.payoffDate})
            </div>
          )}
        </div>
      )}

      {/* ════════════════════════════════════════
          TAB 3 — ACTION PLAN
      ════════════════════════════════════════ */}
      {activeTab === "action" && (
        <>
          {/* Method explanation */}
          <div style={{
            background:   C.blueBg,
            border:       `1px solid #bfdbfe`,
            borderRadius: 12,
            padding:      "16px 20px",
            marginBottom: 20,
            display:      "flex",
            gap:          14,
            alignItems:   "flex-start",
          }}>
            <span style={{ fontSize:24 }}>💡</span>
            <div>
              <div style={{ fontWeight:700, color:C.blue, fontSize:14, marginBottom:4 }}>
                Avalanche Method Explained
              </div>
              <div style={{ fontSize:13, color:"#374151", lineHeight:1.6 }}>
                Pay the <strong>minimum on all debts</strong>, then throw your extra{" "}
                <strong>${plan.extraPerMonth}/month</strong> at the{" "}
                <strong>highest interest rate debt first</strong>. Once that's paid off,
                roll that payment to the next highest. This saves the most money in interest.
              </div>
            </div>
          </div>

          {/* Priority action cards */}
          <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
            {plan.debtOrder.map((debt, i) => {
              const color    = PRIORITY_COLORS[i] || C.blue;
              const isFirst  = i === 0;
              const prevPayoff = i > 0 ? plan.debtOrder[i-1].payoffDate : null;

              return (
                <div key={debt.id} style={{
                  background:   C.card,
                  border:       `1px solid ${isFirst ? color : C.border}`,
                  borderRadius: 12,
                  padding:      "20px",
                  boxShadow:    isFirst
                    ? `0 0 0 3px ${color}18`
                    : "0 1px 3px rgba(0,0,0,0.04)",
                  position:     "relative",
                  overflow:     "hidden",
                }}>

                  {/* Left color bar */}
                  <div style={{
                    position:    "absolute",
                    left:        0,
                    top:         0,
                    bottom:      0,
                    width:       4,
                    background:  color,
                    borderRadius:"12px 0 0 12px",
                  }} />

                  <div style={{
                    display:        "flex",
                    justifyContent: "space-between",
                    alignItems:     "flex-start",
                    marginLeft:     12,
                    flexWrap:       "wrap",
                    gap:            12,
                  }}>
                    <div style={{ flex:1, minWidth:200 }}>
                      {/* Priority label */}
                      <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:8 }}>
                        <div style={{
                          background:    color,
                          color:         "#fff",
                          padding:       "3px 10px",
                          borderRadius:  100,
                          fontSize:      11,
                          fontWeight:    700,
                          letterSpacing: "0.3px",
                        }}>
                          PRIORITY {i + 1}
                        </div>
                        {isFirst && (
                          <div style={{
                            background:   C.redBg,
                            color:        C.red,
                            padding:      "3px 10px",
                            borderRadius: 100,
                            fontSize:     11,
                            fontWeight:   700,
                          }}>
                            🔥 ATTACK NOW
                          </div>
                        )}
                      </div>

                      {/* Debt name */}
                      <div style={{
                        fontSize:      16,
                        fontWeight:    800,
                        color:         C.text,
                        letterSpacing: "-0.4px",
                        marginBottom:  4,
                      }}>
                        {debt.name}
                      </div>
                      <div style={{ fontSize:12, color:C.muted, marginBottom:12 }}>
                        {debt.type} · {debt.interestRate}% APR
                        {debt.lender ? ` · ${debt.lender}` : ""}
                      </div>

                      {/* Action instructions */}
                      <div style={{
                        background:   "#f6f8fa",
                        borderRadius: 8,
                        padding:      "12px 14px",
                        marginBottom: 8,
                      }}>
                        <div style={{ fontSize:11, color:C.muted, fontWeight:600, textTransform:"uppercase", letterSpacing:"0.5px", marginBottom:8 }}>
                          Your Action
                        </div>
                        {isFirst ? (
                          <div style={{ fontSize:13, color:C.text, lineHeight:1.6 }}>
                            Pay <strong style={{ color:C.green }}>
                              {formatAmount
                                ? formatAmount(debt.monthlyPayment + plan.extraPerMonth)
                                : `$${(debt.monthlyPayment + plan.extraPerMonth).toFixed(2)}`
                              }
                            </strong>/month
                            {" "}(${debt.monthlyPayment.toFixed(0)} min +{" "}
                            <span style={{ color:C.blue, fontWeight:600 }}>
                              ${plan.extraPerMonth} extra
                            </span>)
                          </div>
                        ) : (
                          <div style={{ fontSize:13, color:C.text, lineHeight:1.6 }}>
                            Pay minimum <strong>
                              {formatAmount
                                ? formatAmount(debt.monthlyPayment)
                                : `$${debt.monthlyPayment.toFixed(2)}`
                              }
                            </strong>/month for now.
                            {" "}After Priority {i} is paid off ({prevPayoff}),
                            roll those payments here.
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Right side stats */}
                    <div style={{
                      display:       "flex",
                      flexDirection: "column",
                      gap:           10,
                      minWidth:      160,
                    }}>
                      {[
                        {
                          label: "Current Balance",
                          value: formatAmount ? formatAmount(debt.balance) : `$${debt.balance.toFixed(2)}`,
                          color: C.red,
                        },
                        {
                          label: "Monthly Min",
                          value: formatAmount ? formatAmount(debt.monthlyPayment) : `$${debt.monthlyPayment.toFixed(2)}`,
                          color: C.text,
                        },
                        {
                          label: "Payoff Date",
                          value: debt.payoffDate,
                          color: C.green,
                        },
                        {
                          label: "Time Left",
                          value: formatMonths(debt.payoffMonth),
                          color: C.blue,
                        },
                      ].map(stat => (
                        <div key={stat.label} style={{
                          background:   "#f6f8fa",
                          borderRadius: 8,
                          padding:      "8px 12px",
                          border:       `1px solid ${C.border}`,
                        }}>
                          <div style={{ fontSize:10, color:C.muted, fontWeight:600, textTransform:"uppercase", letterSpacing:"0.5px", marginBottom:3 }}>
                            {stat.label}
                          </div>
                          <div style={{ fontWeight:700, fontSize:14, color:stat.color, letterSpacing:"-0.3px" }}>
                            {stat.value}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Summary footer */}
          <div style={{
            background:   C.greenBg,
            border:       `1px solid #bbf7d0`,
            borderRadius: 12,
            padding:      "18px 20px",
            marginTop:    20,
            display:      "flex",
            gap:          14,
            alignItems:   "center",
          }}>
            <span style={{ fontSize:28 }}>🏁</span>
            <div>
              <div style={{ fontWeight:700, color:C.green, fontSize:15, marginBottom:4 }}>
                Debt Free by {plan.payoffDate} — {formatMonths(plan.totalMonths)} from now!
              </div>
              <div style={{ fontSize:13, color:"#374151" }}>
                You'll pay{" "}
                <strong>
                  {formatAmount
                    ? formatAmount(plan.totalInterest)
                    : `$${plan.totalInterest.toFixed(2)}`
                  }
                </strong>{" "}
                in interest with this plan. Increase your extra payment to save even more!
              </div>
            </div>
          </div>
        </>
      )}
    </>
  );
}

// ── Table styles ──
const thStyle = {
  padding:       "10px 12px",
  textAlign:     "right",
  fontSize:      11,
  fontWeight:    700,
  textTransform: "uppercase",
  letterSpacing: "0.5px",
  color:         "#888",
  whiteSpace:    "nowrap",
  borderBottom:  "1px solid #eaeaea",
};

const tdStyle = {
  padding:      "9px 12px",
  textAlign:    "right",
  fontSize:     12,
  whiteSpace:   "nowrap",
  borderBottom: "1px solid #f5f5f5",
};