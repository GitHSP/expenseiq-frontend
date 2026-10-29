import { useEffect, useState } from "react";
import {
  PieChart, Pie, Cell, BarChart, Bar,
  XAxis, YAxis, Tooltip, ResponsiveContainer, Legend,
} from "recharts";
import ExchangeRatesWidget from "../components/ExchangeRatesWidget";
import FinancialTips       from "../components/FinancialTips";
import Icon, { CategoryIcon } from "../components/Icon";
import { CATEGORIES, MONTHS } from "../constants/categories";
import { INCOME_CATEGORIES }  from "../hooks/useIncome";
import { isSameMonth }        from "../utils/helpers";
import { accountsAPI }        from "../utils/api";

const TOOLTIP_STYLE = {
  background:   "var(--card)",
  border:       "1px solid var(--border)",
  borderRadius: 8,
  color:        "var(--text)",
  fontSize:     12,
  fontFamily:   "'Inter', sans-serif",
  boxShadow:    "0 4px 12px rgba(0,0,0,0.08)",
};

const iconBtn = {
  background: "transparent", border: "1px solid var(--border)", borderRadius: 6,
  padding: "5px 7px", cursor: "pointer", color: "var(--muted)",
  display: "inline-flex", alignItems: "center",
};

// Every transaction of one kind for the month, in a scrolling box, with
// edit/delete so unclear titles (e.g. from imported statements) can be fixed.
function TransactionList({ items, kind, fmt, onEdit, onDelete, empty }) {
  const isIncome = kind === "income";
  if (items.length === 0) {
    return (
      <div className="empty-state" style={{ padding:"24px 0" }}>
        <div className="empty-icon"><Icon name={isIncome ? "coins" : "receipt"} size={36} strokeWidth={1.5} /></div>
        <div style={{ fontWeight:600, color:"var(--faint)" }}>{empty}</div>
      </div>
    );
  }
  return (
    <div className="tx-scroll">
      {items.map(item => {
        const cat = (isIncome ? INCOME_CATEGORIES : CATEGORIES).find(c => c.name === item.category);
        return (
          <div key={item.id} style={rowStyle}>
            <CategoryIcon cat={cat} fallback={isIncome ? "coins" : "package"} />
            <div style={{ flex:1, minWidth:0 }}>
              <div style={{ fontWeight:600, fontSize:13, color:"var(--text)", whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>{item.title}</div>
              <div style={{ fontSize:11, color:"var(--faint2)", marginTop:1 }}>{item.category} · {item.date}</div>
            </div>
            <div style={{ fontWeight:700, fontSize:14, color: isIncome ? "#059669" : "#e11d48", whiteSpace:"nowrap" }}>
              {isIncome ? "+" : "-"}{fmt(item.amount, item)}
            </div>
            <div style={{ display:"flex", gap:4, flexShrink:0 }}>
              {onEdit && (
                <button style={iconBtn} onClick={() => onEdit(item)} aria-label={`Edit ${item.title}`} title="Edit">
                  <Icon name="pencil" size={13} />
                </button>
              )}
              {onDelete && (
                <button style={{ ...iconBtn, color:"#e11d48" }} aria-label={`Delete ${item.title}`} title="Delete"
                  onClick={() => window.confirm(`Delete "${item.title}"?`) && onDelete(item.id)}>
                  <Icon name="trash" size={13} />
                </button>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

const rowStyle = {
  display:      "flex",
  alignItems:   "center",
  gap:          12,
  padding:      "12px 14px",
  background:   "var(--subtle)",
  borderRadius: 10,
  border:       "1px solid var(--subtle2)",
  marginBottom: 8,
  transition:   "all 0.12s",
};

export default function Dashboard({
  expenses, onEdit, onDelete, onViewAll,
  incomes, onEditIncome, onDeleteIncome, onAddIncome, onBulkDeleteIncome,
  currency, rates, getRate, formatAmount,
  getLastUpdatedText, ratesLoading, ratesError, refreshRates,
  debts, refreshKey, onOpenRules,
}) {
  const now = new Date();
  // Roommates' shares of rent and bills (Accounts → Rules, "pays their share
  // of my bills") aren't income: they lower what the user really spent.
  const [sharing, setSharing] = useState({ matchers: [], billRules: 0, byMonth: {}, months: {} });
  useEffect(() => {
    let live = true;
    Promise.all([accountsAPI.rules().catch(() => ({ rules: [] })), accountsAPI.summary().catch(() => ({ months: [] }))])
      .then(([r, s]) => {
        if (!live) return;
        setSharing({
          matchers:  (r.rules || []).filter(x => x.treat_as === "shared").map(x => x.match.toLowerCase()),
          billRules: (r.rules || []).filter(x => x.treat_as === "bill").length,
          byMonth:   Object.fromEntries((s.months || []).map(m => [m.month, parseFloat(m.shared_by_others) || 0])),
          months:    Object.fromEntries((s.months || []).map(m => [m.month, m])),
        });
      });
    return () => { live = false; };
  }, [refreshKey]);
  const [activeCard, setActiveCard] = useState(null);
  // Month being viewed — defaults to this month; past months matter once
  // last month's statements are imported.
  const [view, setView] = useState({ month: now.getMonth(), year: now.getFullYear() });
  const currentMonth = view.month;
  const currentYear  = view.year;
  const isCurrent    = currentMonth === now.getMonth() && currentYear === now.getFullYear();
  const daysInMonth  = new Date(currentYear, currentMonth + 1, 0).getDate();
  const dayOfMonth   = isCurrent ? now.getDate() : daysInMonth;
  const monthLabel   = `${MONTHS[currentMonth]} ${currentYear}`;

  function shiftMonth(delta) {
    setView(({ month, year }) => {
      const d = new Date(year, month + delta, 1);
      return { month: d.getMonth(), year: d.getFullYear() };
    });
    setActiveCard(null);
  }

  // ── Filter this month using safe date parsing ──
  const thisMonthExp = expenses.filter(e =>
    isSameMonth(e.date, currentMonth, currentYear)
  );

  const monthInc = incomes.filter(i =>
    isSameMonth(i.date, currentMonth, currentYear)
  );
  const sharedBy = i => sharing.matchers.filter(m => `${i.title} ${i.notes || ""}`.toLowerCase().includes(m))
    .sort((a, b) => b.length - a.length)[0];
  const thisMonthInc   = monthInc.filter(i => !sharedBy(i));
  const sharedInc      = monthInc.filter(i => sharedBy(i));
  // Entries saved from statements are already in the statement figures below;
  // only typed-in ones are added on top.
  const typedShared    = sharedInc.filter(i => !/^Imported from/.test(i.notes || ""));
  const ym             = `${currentYear}-${String(currentMonth + 1).padStart(2, "0")}`;
  const sharedTotal    = typedShared.reduce((s, i) => s + (parseFloat(i.amount) || 0), 0) + (sharing.byMonth[ym] || 0);
  // Who paid what toward the shared bills, and the bills themselves.
  const monthShares = { ...(sharing.months[ym]?.shared_by || {}) };
  for (const i of typedShared) {
    const who = sharedBy(i).replace(/\b\w/g, c => c.toUpperCase());
    monthShares[who] = ((parseFloat(monthShares[who]) || 0) + (parseFloat(i.amount) || 0)).toFixed(2);
  }
  const monthBills = sharing.months[ym]?.shared_bills || {};
  const billsTotal = Object.values(monthBills).reduce((s, v) => s + (parseFloat(v) || 0), 0);
  // e-transfers counted as income while no shared rule is set up yet
  const transferIncome = sharing.matchers.length === 0 && thisMonthInc.some(i => /e-?transfer|interac/i.test(`${i.title} ${i.notes || ""}`));

  // ── Totals ──
  const grossExpenses = thisMonthExp.reduce((s, e) => s + (parseFloat(e.amount) || 0), 0);
  const totalExpenses = Math.max(grossExpenses - sharedTotal, 0);    // your own share
  const totalIncome   = thisMonthInc.reduce((s, i) => s + (parseFloat(i.amount) || 0), 0);
  const netBalance    = totalIncome - totalExpenses;
  const savingsRate   = totalIncome > 0 ? ((netBalance / totalIncome) * 100).toFixed(1) : 0;
  const dailyAvg      = dayOfMonth > 0 ? (totalExpenses / dayOfMonth).toFixed(2) : 0;

  // ── Charts ──
  const expensePieData = CATEGORIES.map(cat => ({
    name:  cat.name,
    value: thisMonthExp
      .filter(e => e.category === cat.name)
      .reduce((s, e) => s + (parseFloat(e.amount) || 0), 0),
    color: cat.color,
  })).filter(c => c.value > 0);

  const incomeVsExpenseData = MONTHS.map((m, i) => {
    const monthExp = expenses
      .filter(e => isSameMonth(e.date, i, currentYear))
      .reduce((s, e) => s + (parseFloat(e.amount) || 0), 0);
    const monthInc = incomes
      .filter(inc => isSameMonth(inc.date, i, currentYear))
      .reduce((s, inc) => s + (parseFloat(inc.amount) || 0), 0);
    return {
      name:    m.slice(0, 3),
      Income:  parseFloat(monthInc.toFixed(2)),
      Expense: parseFloat(monthExp.toFixed(2)),
    };
  });

  const fmt = (v, item) => formatAmount
    ? formatAmount(parseFloat(v) || 0, item)
    : `$${(parseFloat(v) || 0).toFixed(2)}`;

  function handleCardClick(cardId) {
    setActiveCard(prev => prev === cardId ? null : cardId);
  }

  const statCards = [
    {
      id:       "expenses",
      label:    isCurrent ? "This Month" : `${MONTHS[currentMonth].slice(0, 3)} Spending`,
      value:    fmt(totalExpenses),
      sub:      sharedTotal > 0
        ? `your share · ${fmt(sharedTotal)} paid by roommates`
        : `${thisMonthExp.length} expenses · avg ${fmt(dailyAvg)}/day`,
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
      sub:      netBalance >= 0 ? "Surplus" : "Deficit",
      subIcon:  netBalance >= 0 ? "arrow-up" : "arrow-down",
      gradient: netBalance >= 0
        ? "linear-gradient(135deg, #0070f3, #0050b3)"
        : "linear-gradient(135deg, #e11d48, #be123c)",
    },
  ];

  return (
    <>
      {/* ── Page header ── */}
      <div style={{ marginBottom:28, display:"flex", justifyContent:"space-between", alignItems:"flex-end", gap:12, flexWrap:"wrap" }}>
        <div>
          <div className="page-title">Dashboard</div>
          <div className="page-sub">{isCurrent ? "This month" : "Viewing a past month"}</div>
        </div>
        <div className="month-picker" role="group" aria-label="Month">
          <button onClick={() => shiftMonth(-1)} aria-label="Previous month"><Icon name="chevron-left" size={16} /></button>
          <span>{monthLabel}</span>
          <button onClick={() => shiftMonth(1)} aria-label="Next month" disabled={isCurrent}><Icon name="chevron-right" size={16} /></button>
          {!isCurrent && (
            <button className="month-picker-today" onClick={() => setView({ month: now.getMonth(), year: now.getFullYear() })}>
              This month
            </button>
          )}
        </div>
      </div>

      {/* ── Financial Tips ── */}
      <FinancialTips
        expenses={expenses}
        incomes={incomes}
        debts={debts || []}
        month={currentMonth}
        year={currentYear}
      />

      {transferIncome && (
        <div className="card" style={{ padding:"12px 16px", marginBottom:12, border:"1px solid #fcd34d", background:"#fffbeb", color:"#92400e", fontSize:13, display:"flex", alignItems:"center", gap:10, flexWrap:"wrap" }}>
          <Icon name="alert" size={15} />
          <span style={{ flex:1, minWidth:200 }}>
            E-transfers are counted as income. If they're roommates paying their share of rent and bills,
            add each name in Accounts → Rules as "Pays their share of my bills".
          </span>
          {onOpenRules && <button className="btn-secondary" style={{ padding:"5px 12px", fontSize:12 }} onClick={onOpenRules}>Open Accounts</button>}
        </div>
      )}

      {/* ── Clickable stat cards ── */}
      <div className="stat-grid" style={{ marginBottom:16 }}>
        {statCards.map(card => (
          <div
            key={card.id}
            onClick={() => handleCardClick(card.id)}
            style={{
              background:   card.gradient,
              borderRadius: 12,
              padding:      20,
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
            <div style={{ fontSize:11, opacity:0.65, fontWeight:500, marginBottom:8, display:"flex", alignItems:"center", gap:3 }}>
              {card.subIcon && <Icon name={card.subIcon} size={11} />}
              {card.sub}
            </div>
            <div style={{ fontSize:10, opacity:0.6, fontWeight:600, display:"flex", alignItems:"center", gap:3 }}>
              <Icon name={activeCard === card.id ? "chevron-up" : "chevron-down"} size={11} />
              {activeCard === card.id ? "Click to collapse" : "Click to expand"}
            </div>
          </div>
        ))}
      </div>

      {/* ── Shared bills: rent and bills paid in full, roommates paying back ── */}
      {(sharedTotal > 0 || billsTotal > 0) && (
        <div className="card" style={{ marginBottom:16 }}>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"baseline", flexWrap:"wrap", gap:6, marginBottom:12 }}>
            <div className="card-title" style={{ margin:0 }}>Shared bills · {monthLabel}</div>
            {billsTotal > 0 && (
              <div style={{ fontSize:13, color:"var(--muted)" }}>
                Your share <strong style={{ color:"var(--text)", fontSize:15 }}>{fmt(Math.max(billsTotal - sharedTotal, 0))}</strong>
              </div>
            )}
          </div>
          <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit, minmax(220px, 1fr))", gap:16 }}>
            <div>
              <div style={{ fontSize:11, color:"var(--muted)", fontWeight:700, textTransform:"uppercase", letterSpacing:"0.5px", marginBottom:6 }}>
                Bills you paid
              </div>
              {billsTotal > 0 ? Object.entries(monthBills).map(([bill, amt]) => (
                <div key={bill} style={{ display:"flex", justifyContent:"space-between", fontSize:13, padding:"5px 0", borderBottom:"1px solid var(--subtle2)" }}>
                  <span>{bill}</span><span style={{ fontWeight:600, color:"#e11d48" }}>-{fmt(amt)}</span>
                </div>
              )) : (
                <div style={{ fontSize:12, color:"var(--faint2)" }}>
                  {sharing.billRules ? "None on this month's statements yet." :
                    "Add each shared bill (e.g. your rent and utilities) in Accounts → Rules as \"A shared bill I pay in full\" to see them here."}
                </div>
              )}
              {billsTotal > 0 && (
                <div style={{ display:"flex", justifyContent:"space-between", fontSize:13, fontWeight:700, paddingTop:6 }}>
                  <span>Total</span><span>{fmt(billsTotal)}</span>
                </div>
              )}
            </div>
            <div>
              <div style={{ fontSize:11, color:"var(--muted)", fontWeight:700, textTransform:"uppercase", letterSpacing:"0.5px", marginBottom:6 }}>
                Roommates paid you
              </div>
              {Object.keys(monthShares).length ? Object.entries(monthShares).map(([who, amt]) => (
                <div key={who} style={{ display:"flex", justifyContent:"space-between", fontSize:13, padding:"5px 0", borderBottom:"1px solid var(--subtle2)" }}>
                  <span>{who}</span><span style={{ fontWeight:600, color:"#059669" }}>+{fmt(amt)}</span>
                </div>
              )) : <div style={{ fontSize:12, color:"var(--faint2)" }}>Nothing received yet this month.</div>}
              {sharedTotal > 0 && (
                <div style={{ display:"flex", justifyContent:"space-between", fontSize:13, fontWeight:700, paddingTop:6 }}>
                  <span>Total</span><span>{fmt(sharedTotal)}</span>
                </div>
              )}
            </div>
          </div>
          <div style={{ fontSize:11, color:"var(--faint2)", marginTop:10 }}>
            Not counted as income — it lowers your spending. If a roommate keeps back your share of a bill they pay (e.g. WiFi),
            that difference is already part of your share.
          </div>
        </div>
      )}

      {/* ── Active card detail panel ── */}
      {activeCard && (
        <div style={{
          background:   "var(--card)",
          borderRadius: 12,
          border:       "1px solid var(--border)",
          marginBottom: 20,
          overflow:     "hidden",
          boxShadow:    "0 4px 16px rgba(0,0,0,0.06)",
        }}>

          {/* ── EXPENSES PANEL ── */}
          {activeCard === "expenses" && (
            <>
              <div style={{ padding:"18px 20px", borderBottom:"1px solid var(--subtle2)", display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                <div>
                  <div style={{ fontWeight:800, fontSize:16, color:"var(--text)", letterSpacing:"-0.4px" }}>
                    This Month's Expenses
                  </div>
                  <div style={{ fontSize:12, color:"var(--muted)", marginTop:2 }}>
                    {thisMonthExp.length} transactions · Total {fmt(grossExpenses)}
                    {sharedTotal > 0 && ` − ${fmt(sharedTotal)} shared by roommates = ${fmt(totalExpenses)} yours`}
                  </div>
                </div>
                <button className="btn-ghost" onClick={onViewAll} style={{ display:"inline-flex", alignItems:"center", gap:4 }}>View all <Icon name="arrow-right" size={13} /></button>
              </div>

              {/* Category breakdown */}
              <div style={{ padding:"16px 20px", borderBottom:"1px solid var(--subtle2)" }}>
                <div style={{ fontSize:11, color:"var(--muted)", fontWeight:600, textTransform:"uppercase", letterSpacing:"0.5px", marginBottom:12 }}>
                  By Category
                </div>
                {CATEGORIES.map(cat => {
                  const spent = thisMonthExp
                    .filter(e => e.category === cat.name)
                    .reduce((s, e) => s + (parseFloat(e.amount) || 0), 0);
                  if (spent === 0) return null;
                  const pct = grossExpenses > 0 ? (spent / grossExpenses) * 100 : 0;
                  return (
                    <div key={cat.name} style={{ marginBottom:10 }}>
                      <div style={{ display:"flex", justifyContent:"space-between", fontSize:12, marginBottom:4 }}>
                        <span style={{ fontWeight:600, display:"inline-flex", alignItems:"center", gap:6 }}><Icon name={cat.icon} size={13} color={cat.color} /> {cat.name}</span>
                        <div style={{ display:"flex", gap:12 }}>
                          <span style={{ color:"var(--muted)", fontSize:11 }}>{pct.toFixed(0)}%</span>
                          <span style={{ fontWeight:700, color:"#e11d48" }}>{fmt(spent)}</span>
                        </div>
                      </div>
                      <div style={{ background:"var(--subtle2)", borderRadius:100, height:5, overflow:"hidden" }}>
                        <div style={{ height:"100%", borderRadius:100, background:cat.color, width:`${pct}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Transactions */}
              <div style={{ padding:"16px 20px" }}>
                <div style={{ fontSize:11, color:"var(--muted)", fontWeight:600, textTransform:"uppercase", letterSpacing:"0.5px", marginBottom:12 }}>
                  All Transactions
                </div>
                {thisMonthExp.length === 0 ? (
                  <div style={{ textAlign:"center", color:"var(--faint)", padding:"20px 0", fontSize:13 }}>No expenses in {MONTHS[currentMonth]}</div>
                ) : thisMonthExp.map(exp => {
                  const cat = CATEGORIES.find(c => c.name === exp.category);
                  return (
                    <div key={exp.id} style={rowStyle}>
                      <CategoryIcon cat={cat} fallback={"package"} />
                      <div style={{ flex:1, minWidth:0 }}>
                        <div style={{ fontWeight:600, fontSize:13, color:"var(--text)", whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>{exp.title}</div>
                        <div style={{ fontSize:11, color:"var(--faint2)", marginTop:1 }}>{exp.category} · {exp.date}</div>
                      </div>
                      <div style={{ fontWeight:700, fontSize:14, color:"#e11d48" }}>-{fmt(exp.amount)}</div>
                    </div>
                  );
                })}
              </div>
            </>
          )}

          {/* ── INCOME PANEL ── */}
          {activeCard === "income" && (
            <>
              <div style={{ padding:"18px 20px", borderBottom:"1px solid var(--subtle2)", display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                <div>
                  <div style={{ fontWeight:800, fontSize:16, color:"var(--text)", letterSpacing:"-0.4px" }}>This Month's Income</div>
                  <div style={{ fontSize:12, color:"var(--muted)", marginTop:2 }}>{thisMonthInc.length} entries · Total {fmt(totalIncome)}</div>
                </div>
                <button className="btn-primary" style={{ padding:"7px 14px", fontSize:12 }} onClick={onAddIncome}>
                  + Add Income
                </button>
              </div>

              {/* By source */}
              <div style={{ padding:"16px 20px", borderBottom:"1px solid var(--subtle2)" }}>
                <div style={{ fontSize:11, color:"var(--muted)", fontWeight:600, textTransform:"uppercase", letterSpacing:"0.5px", marginBottom:12 }}>By Source</div>
                <div style={{ display:"flex", flexWrap:"wrap", gap:10 }}>
                  {INCOME_CATEGORIES.map(cat => {
                    const total = thisMonthInc
                      .filter(i => i.category === cat.name)
                      .reduce((s, i) => s + (parseFloat(i.amount) || 0), 0);
                    if (total === 0) return null;
                    return (
                      <div key={cat.name} style={{ display:"flex", alignItems:"center", gap:8, background:"var(--bg)", borderRadius:8, padding:"8px 14px", border:"1px solid var(--border)" }}>
                        <CategoryIcon cat={cat} size={28} />
                        <div>
                          <div style={{ fontSize:10, color:"var(--faint2)", fontWeight:600, textTransform:"uppercase" }}>{cat.name}</div>
                          <div style={{ fontWeight:700, fontSize:13, color:"#059669" }}>{fmt(total)}</div>
                        </div>
                      </div>
                    );
                  })}
                  {thisMonthInc.length === 0 && <div style={{ color:"var(--faint)", fontSize:13 }}>No income this month</div>}
                </div>
              </div>

              {/* Transactions */}
              <div style={{ padding:"16px 20px" }}>
                <div style={{ fontSize:11, color:"var(--muted)", fontWeight:600, textTransform:"uppercase", letterSpacing:"0.5px", marginBottom:12 }}>All Transactions</div>
                {thisMonthInc.length === 0 ? (
                  <div style={{ textAlign:"center", color:"var(--faint)", padding:"20px 0", fontSize:13 }}>No income this month</div>
                ) : thisMonthInc.map(inc => {
                  const cat = INCOME_CATEGORIES.find(c => c.name === inc.category);
                  return (
                    <div key={inc.id} style={rowStyle}>
                      <CategoryIcon cat={cat} fallback={"coins"} />
                      <div style={{ flex:1, minWidth:0 }}>
                        <div style={{ fontWeight:600, fontSize:13, color:"var(--text)", whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>{inc.title}</div>
                        <div style={{ fontSize:11, color:"var(--faint2)", marginTop:1 }}>{inc.category} · {inc.date}</div>
                      </div>
                      <div style={{ fontWeight:700, fontSize:14, color:"#059669" }}>+{fmt(inc.amount, inc)}</div>
                    </div>
                  );
                })}
                {sharedInc.length > 0 && (
                  <>
                    <div style={{ fontSize:11, color:"var(--muted)", fontWeight:600, textTransform:"uppercase", letterSpacing:"0.5px", margin:"16px 0 8px" }}>
                      Shared bills — not counted as income
                    </div>
                    {sharedInc.map(inc => (
                      <div key={inc.id} style={{ ...rowStyle, opacity:0.65 }}>
                        <CategoryIcon cat={null} fallback={"house"} />
                        <div style={{ flex:1, minWidth:0 }}>
                          <div style={{ fontWeight:600, fontSize:13, color:"var(--text)", whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>{inc.title}</div>
                          <div style={{ fontSize:11, color:"var(--faint2)", marginTop:1 }}>Their share of rent & bills · {inc.date}</div>
                        </div>
                        <div style={{ fontWeight:700, fontSize:14, color:"var(--muted)" }}>{fmt(inc.amount, inc)}</div>
                      </div>
                    ))}
                  </>
                )}
              </div>
            </>
          )}

          {/* ── NET BALANCE PANEL ── */}
          {activeCard === "balance" && (
            <>
              <div style={{ padding:"18px 20px", borderBottom:"1px solid var(--subtle2)" }}>
                <div style={{ fontWeight:800, fontSize:16, color:"var(--text)", letterSpacing:"-0.4px" }}>Income vs Expenses</div>
                <div style={{ fontSize:12, color:"var(--muted)", marginTop:2 }}>{MONTHS[currentMonth]} {currentYear}</div>
              </div>

              <div style={{ padding:"16px 20px", borderBottom:"1px solid var(--subtle2)" }}>
                <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:12, marginBottom:16 }}>
                  {[
                    { label:"Total Income",   value:fmt(totalIncome),   color:"#059669" },
                    { label:"Total Expenses", value:fmt(totalExpenses), color:"#e11d48" },
                    { label:"Net Balance",    value:fmt(Math.abs(netBalance)), color: netBalance >= 0 ? "#0070f3" : "#e11d48" },
                  ].map(s => (
                    <div key={s.label} style={{ background:"var(--subtle)", borderRadius:10, padding:"14px", border:"1px solid var(--subtle2)", textAlign:"center" }}>
                      <div style={{ fontSize:10, color:"var(--faint2)", fontWeight:600, textTransform:"uppercase", letterSpacing:"0.5px", marginBottom:6 }}>{s.label}</div>
                      <div style={{ fontWeight:800, fontSize:18, color:s.color, letterSpacing:"-0.5px" }}>{s.value}</div>
                    </div>
                  ))}
                </div>

                {/* Savings rate bar */}
                <div style={{ marginBottom:6, display:"flex", justifyContent:"space-between", fontSize:12, fontWeight:600 }}>
                  <span style={{ color:"var(--muted)" }}>Savings Rate</span>
                  <span style={{ color: parseFloat(savingsRate) >= 0 ? "#059669" : "#e11d48" }}>{savingsRate}%</span>
                </div>
                <div style={{ background:"var(--subtle2)", borderRadius:100, height:8, overflow:"hidden", marginBottom:6 }}>
                  <div style={{
                    height:"100%", borderRadius:100,
                    background: parseFloat(savingsRate) >= 20 ? "#059669" : parseFloat(savingsRate) >= 0 ? "#f59e0b" : "#e11d48",
                    width:`${Math.min(Math.max(parseFloat(savingsRate), 0), 100)}%`,
                  }} />
                </div>
                <div style={{ fontSize:11, color:"var(--faint2)", display:"flex", alignItems:"center", gap:5 }}>
                  <Icon name={parseFloat(savingsRate) >= 20 ? "party" : parseFloat(savingsRate) >= 0 ? "lightbulb" : "warning"} size={12} />
                  {parseFloat(savingsRate) >= 20 ? "Great savings rate!" : parseFloat(savingsRate) >= 0 ? "Try to save at least 20%" : "Spending more than earning"}
                </div>
              </div>

              {/* Combined transactions */}
              <div style={{ padding:"16px 20px" }}>
                <div style={{ fontSize:11, color:"var(--muted)", fontWeight:600, textTransform:"uppercase", letterSpacing:"0.5px", marginBottom:12 }}>All Transactions</div>
                {[
                  ...thisMonthExp.map(e => ({ ...e, kind:"expense" })),
                  ...thisMonthInc.map(i => ({ ...i, kind:"income"  })),
                ].sort((a, b) => new Date(b.date) - new Date(a.date))
                 .map(tx => {
                  const isExp = tx.kind === "expense";
                  const cat   = isExp
                    ? CATEGORIES.find(c => c.name === tx.category)
                    : INCOME_CATEGORIES.find(c => c.name === tx.category);
                  return (
                    <div key={`${tx.kind}-${tx.id}`} style={rowStyle}>
                      <CategoryIcon cat={cat} fallback={(isExp ? "package" : "coins")} />
                      <div style={{ flex:1, minWidth:0 }}>
                        <div style={{ fontWeight:600, fontSize:13, color:"var(--text)", whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>{tx.title}</div>
                        <div style={{ fontSize:11, color:"var(--faint2)", marginTop:1 }}>{tx.category} · {tx.date}</div>
                      </div>
                      <div style={{ fontWeight:700, fontSize:14, color: isExp ? "#e11d48" : "#059669" }}>
                        {isExp ? "-" : "+"}{fmt(tx.amount)}
                      </div>
                    </div>
                  );
                })}
                {thisMonthExp.length === 0 && thisMonthInc.length === 0 && (
                  <div style={{ textAlign:"center", color:"var(--faint)", padding:"20px 0", fontSize:13 }}>No transactions this month</div>
                )}
              </div>
            </>
          )}

        </div>
      )}

      {/* ── Exchange rates ── */}
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
          <div className="card-title" style={{ marginBottom:16 }}>Income vs Expenses {currentYear}</div>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={incomeVsExpenseData} barGap={4}>
              <XAxis dataKey="name" tick={{ fill:"var(--faint2)", fontSize:11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill:"var(--faint2)", fontSize:10 }} axisLine={false} tickLine={false} width={40} />
              <Tooltip formatter={v => fmt(v)} contentStyle={TOOLTIP_STYLE} />
              <Legend wrapperStyle={{ fontSize:11 }} />
              <Bar dataKey="Income"  fill="#059669" radius={[5,5,0,0]} />
              <Bar dataKey="Expense" fill="#e11d48" radius={[5,5,0,0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="card">
          <div className="card-title" style={{ marginBottom:16 }}>Spending by Category</div>
          {expensePieData.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon"><Icon name="chart" size={40} strokeWidth={1.5} /></div>
              <div style={{ fontSize:13, color:"var(--faint2)" }}>No expenses in {MONTHS[currentMonth]}</div>
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

      {/* ── Income & expenses for the month (scrollable, editable) ── */}
      <div className="card">
        <div className="card-header">
          <span className="card-title">Income · {monthLabel}</span>
          <div style={{ display:"flex", alignItems:"center", gap:10 }}>
            <span style={{ fontSize:13, fontWeight:700, color:"#059669" }}>+{fmt(totalIncome)}</span>
            {onBulkDeleteIncome && thisMonthInc.length > 1 && (
              <button className="btn-ghost" style={{ color:"#e11d48", fontSize:12, display:"inline-flex", alignItems:"center", gap:4 }}
                onClick={() => window.confirm(`Delete all ${thisMonthInc.length} income entries from ${monthLabel}, totalling ${fmt(totalIncome)}?\n\nThis can't be undone.`)
                  && onBulkDeleteIncome(thisMonthInc.map(i => i.id), monthLabel)}>
                <Icon name="trash" size={12} /> Delete all
              </button>
            )}
            <button className="btn-primary" style={{ padding:"7px 14px", fontSize:12 }} onClick={onAddIncome}>
              + Add Income
            </button>
          </div>
        </div>
        <TransactionList
          items={[...thisMonthInc].sort((a, b) => b.date.localeCompare(a.date))}
          kind="income" fmt={fmt}
          onEdit={onEditIncome} onDelete={onDeleteIncome}
          empty={`No income in ${MONTHS[currentMonth]}`}
        />
      </div>

      <div className="card">
        <div className="card-header">
          <span className="card-title">Expenses · {monthLabel}</span>
          <div style={{ display:"flex", alignItems:"center", gap:10 }}>
            <span style={{ fontSize:13, fontWeight:700, color:"#e11d48" }}>-{fmt(totalExpenses)}</span>
            <button className="btn-ghost" onClick={onViewAll} style={{ display:"inline-flex", alignItems:"center", gap:4 }}>View all <Icon name="arrow-right" size={13} /></button>
          </div>
        </div>
        <TransactionList
          items={[...thisMonthExp].sort((a, b) => b.date.localeCompare(a.date))}
          kind="expense" fmt={fmt}
          onEdit={onEdit} onDelete={onDelete}
          empty={`No expenses in ${MONTHS[currentMonth]}`}
        />
      </div>
    </>
  );
}