import { useEffect, useState } from "react";
import {
  PieChart, Pie, Cell, BarChart, Bar, AreaChart, Area, ReferenceLine,
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
            <div style={{ fontWeight:700, fontSize:14, color: isIncome ? "#059669" : "var(--text)", whiteSpace:"nowrap" }}>
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
  const [sharing, setSharing] = useState({ matchers: [], billRules: 0, byMonth: {}, months: {}, transfers: [] });
  const [sharingKey, setSharingKey] = useState(0);        // bumped after picking which transfers are for bills
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
          transfers: s.shared_transfers || [],
        });
      });
    return () => { live = false; };
  }, [refreshKey, sharingKey]);
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
  // With "My share" set on the bills, their expenses are already your share;
  // roommates' money just pays you back (not subtracted again).
  const atShare    = !!sharing.months[ym]?.bills_at_share;
  const myShares   = sharing.months[ym]?.my_shares || {};
  const myShare    = Object.values(myShares).reduce((s, v) => s + (parseFloat(v) || 0), 0);
  const owedToYou  = billsTotal - myShare;                     // what roommates should cover
  // e-transfers counted as income while no shared rule is set up yet
  const transferIncome = sharing.matchers.length === 0 && thisMonthInc.some(i => /e-?transfer|interac/i.test(`${i.title} ${i.notes || ""}`));

  // ── Totals ──
  const grossExpenses = thisMonthExp.reduce((s, e) => s + (parseFloat(e.amount) || 0), 0);
  const totalExpenses = atShare ? grossExpenses : Math.max(grossExpenses - sharedTotal, 0);    // your own share
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

  // Headline figures in whole dollars; lists keep the cents.
  const whole = v => fmt(Math.round(parseFloat(v) || 0)).replace(/\.00$/, "");
  const spentPct = totalIncome > 0 ? (totalExpenses / totalIncome) * 100 : (totalExpenses > 0 ? 100 : 0);
  const status = totalIncome === 0 && totalExpenses === 0
    ? { text: "Nothing yet", color: "var(--muted)", bg: "var(--subtle)" }
    : netBalance < 0
      ? { text: "Spending more than income", color: "#ef4444", bg: "rgba(239,68,68,0.14)" }
      : spentPct >= 90
        ? { text: "Close to your income", color: "#f59e0b", bg: "rgba(245,158,11,0.14)" }
        : { text: "On track", color: "#10b981", bg: "rgba(16,185,129,0.14)" };

  // Spending through the month, day by day, for the chart under the headline.
  const shareFactor = grossExpenses > 0 ? totalExpenses / grossExpenses : 1;
  const spentByDay = {};
  for (const e of thisMonthExp) {
    const d = parseInt(String(e.date).slice(8, 10), 10);
    spentByDay[d] = (spentByDay[d] || 0) + (parseFloat(e.amount) || 0);
  }
  let runningSpend = 0;
  const spendLine = Array.from({ length: daysInMonth }, (_, i) => {
    const d = i + 1;
    if (d > dayOfMonth) return { day: d, spent: null };
    runningSpend += (spentByDay[d] || 0) * shareFactor;
    return { day: d, spent: Math.round(runningSpend) };
  });

  function handleCardClick(cardId) {
    setActiveCard(prev => prev === cardId ? null : cardId);
  }

  const statCards = [
    {
      id:    "expenses",
      label: "Spending",
      icon:  "receipt",
      value: whole(totalExpenses),
      sub:   sharedTotal > 0 && !atShare
        ? `your share · ${whole(sharedTotal)} from roommates`
        : `${thisMonthExp.length} expenses · ${whole(dailyAvg)}/day`,
    },
    {
      id:    "income",
      label: "Income",
      icon:  "banknote",
      value: whole(totalIncome),
      sub:   `${thisMonthInc.length} ${thisMonthInc.length === 1 ? "entry" : "entries"}`,
    },
    {
      id:    "balance",
      label: "Saved",
      icon:  "piggy-bank",
      value: totalIncome > 0 ? `${Math.round(parseFloat(savingsRate))}%` : "—",
      sub:   "of income",
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

      {/* ── The answer: what's left this month, as one big number ── */}
      <div style={{ marginBottom:6 }}>
        <div style={{ fontSize:13, fontWeight:500, color:"var(--muted)" }}>
          {netBalance >= 0 ? "Left" : "Over"} {isCurrent ? "this month" : `in ${MONTHS[currentMonth]}`}
        </div>
        <div style={{ fontSize:"clamp(38px, 9vw, 52px)", fontWeight:600, letterSpacing:"-1.5px", lineHeight:1.1, marginTop:4,
                      color: netBalance < 0 ? "#f87171" : "var(--text)" }}>
          {netBalance < 0 ? "−" : ""}{whole(Math.abs(netBalance))}
        </div>
        <div style={{ display:"flex", alignItems:"center", gap:8, flexWrap:"wrap", marginTop:8 }}>
          <span style={{ fontSize:12, fontWeight:600, color:status.color, background:status.bg, borderRadius:20, padding:"4px 10px" }}>
            {status.text}
          </span>
          <span style={{ fontSize:13, color:"var(--muted)" }}>
            {whole(totalExpenses)} spent of {whole(totalIncome)} income
          </span>
        </div>
      </div>

      {/* Spending through the month, with income as the line not to cross */}
      {(totalExpenses > 0 || totalIncome > 0) && (
        <div style={{ height:150, margin:"10px -4px 22px" }}>
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={spendLine} margin={{ top:8, right:4, bottom:0, left:4 }}>
              <defs>
                <linearGradient id="spendFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.28} />
                  <stop offset="100%" stopColor="#3b82f6" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="day" hide />
              <YAxis hide domain={[0, Math.max(totalIncome, totalExpenses) * 1.08 || 1]} />
              {totalIncome > 0 && (
                <ReferenceLine y={totalIncome} stroke="#10b981" strokeDasharray="4 4" strokeOpacity={0.8}
                  label={{ value: `Income ${whole(totalIncome)}`, position: "insideTopRight", fill: "#10b981", fontSize: 11 }} />
              )}
              <Tooltip
                formatter={v => [whole(v), "Spent so far"]}
                labelFormatter={d => `${MONTHS[currentMonth].slice(0, 3)} ${d}`}
                contentStyle={TOOLTIP_STYLE} />
              <Area type="monotone" dataKey="spent" stroke="#3b82f6" strokeWidth={2} fill="url(#spendFill)"
                connectNulls={false} dot={false} activeDot={{ r: 4 }} isAnimationActive={false} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* ── This month, as a list ── */}
      <div style={{ fontSize:12, fontWeight:600, color:"var(--muted)", textTransform:"uppercase", letterSpacing:"0.6px", margin:"0 2px 8px" }}>
        {isCurrent ? "This month" : monthLabel}
      </div>
      <div className="card" style={{ padding:0, overflow:"hidden", marginBottom:20 }}>
        {statCards.map((card, i) => {
          const on = activeCard === card.id;
          const clickable = card.id !== "balance";
          const Row = clickable ? "button" : "div";
          return (
            <Row key={card.id} {...(clickable ? { onClick: () => handleCardClick(card.id), "aria-expanded": on } : {})} style={{
              width:"100%", display:"flex", alignItems:"center", gap:12, padding:"14px 16px", textAlign:"left",
              background: on ? "var(--subtle)" : "transparent", border:"none", borderTop: i ? "1px solid var(--border)" : "none",
              cursor: clickable ? "pointer" : "default", fontFamily:"inherit", color:"var(--text)", touchAction:"manipulation",
            }}>
              <span style={{ width:36, height:36, borderRadius:18, background:"var(--subtle2)", display:"inline-flex",
                             alignItems:"center", justifyContent:"center", flexShrink:0 }}>
                <Icon name={card.icon} size={16} />
              </span>
              <span style={{ flex:1, minWidth:0 }}>
                <span style={{ display:"block", fontSize:15, fontWeight:600 }}>{card.label}</span>
                <span style={{ display:"block", fontSize:12, color:"var(--muted)", marginTop:1, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{card.sub}</span>
              </span>
              <span style={{ fontSize:16, fontWeight:600, whiteSpace:"nowrap", color: card.id === "income" ? "#10b981" : "var(--text)" }}>{card.value}</span>
              {clickable && <Icon name={on ? "chevron-up" : "chevron-right"} size={16} color="var(--muted)" />}
            </Row>
          );
        })}
      </div>

      {/* ── Shared bills: rent and bills paid in full, roommates paying back ── */}
      {(sharedTotal > 0 || billsTotal > 0) && (
        <div className="card" style={{ marginBottom:16 }}>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"baseline", flexWrap:"wrap", gap:6, marginBottom:12 }}>
            <div className="card-title" style={{ margin:0 }}>Shared bills · {monthLabel}</div>
            {billsTotal > 0 && (
              <div style={{ fontSize:13, color:"var(--muted)" }}>
                Your share <strong style={{ color:"var(--text)", fontSize:15 }}>{fmt(atShare ? myShare : Math.max(billsTotal - sharedTotal, 0))}</strong>
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
                  <span>{bill}</span><span style={{ fontWeight:600, color:"var(--text)" }}>-{fmt(amt)}</span>
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
          <SortTransfers transfers={sharing.transfers || []} ym={ym} fmt={fmt} onChanged={() => setSharingKey(k => k + 1)} />
          {atShare && billsTotal > 0 && (
            <div style={{ fontSize:13, marginTop:12, paddingTop:10, borderTop:"1px solid var(--subtle2)", display:"flex", justifyContent:"space-between", flexWrap:"wrap", gap:6 }}>
              <span>Roommates' part {fmt(owedToYou)} · they paid {fmt(sharedTotal)}</span>
              <strong style={{ color: owedToYou - sharedTotal > 0.5 ? "#d97706" : "#059669" }}>
                {owedToYou - sharedTotal > 0.5 ? `${fmt(owedToYou - sharedTotal)} still to come`
                  : sharedTotal - owedToYou > 0.5 ? `${fmt(sharedTotal - owedToYou)} more than their part` : "All square"}
              </strong>
            </div>
          )}
          <div style={{ fontSize:11, color:"var(--faint2)", marginTop:10 }}>
            {atShare
              ? "Bills count as your share in expenses. Roommates' payments aren't income — they pay you back. A roommate keeping back your share of a bill they pay (e.g. WiFi) shows here as a small gap."
              : "Not counted as income — it lowers your spending. Set \"My share\" on each bill in Accounts → Rules to count rent as your part (e.g. 625)."}
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
                    {sharedTotal > 0 && !atShare && ` − ${fmt(sharedTotal)} shared by roommates = ${fmt(totalExpenses)} yours`}
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
                          <span style={{ fontWeight:700, color:"var(--text)" }}>{fmt(spent)}</span>
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
                      <div style={{ fontWeight:700, fontSize:14, color:"var(--text)" }}>-{fmt(exp.amount)}</div>
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
                    { label:"Total Expenses", value:fmt(totalExpenses), color:"var(--text)" },
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
                      <div style={{ fontWeight:700, fontSize:14, color: isExp ? "var(--text)" : "#059669" }}>
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

      {/* ── Financial Tips ── */}
      <FinancialTips
        expenses={expenses}
        incomes={incomes}
        debts={debts || []}
        month={currentMonth}
        year={currentYear}
      />

      {transferIncome && (
        <div className="card" style={{ padding:"12px 16px", marginBottom:12, border:"1px solid var(--warn-border)", background:"var(--warn-bg)", color:"var(--warn-text)", fontSize:13, display:"flex", alignItems:"center", gap:10, flexWrap:"wrap" }}>
          <Icon name="alert" size={15} />
          <span style={{ flex:1, minWidth:200 }}>
            E-transfers are counted as income. If they're roommates paying their share of rent and bills,
            add each name in Accounts → Rules as "Pays their share of my bills".
          </span>
          {onOpenRules && <button className="btn-secondary" style={{ padding:"5px 12px", fontSize:12 }} onClick={onOpenRules}>Open Accounts</button>}
        </div>
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
              <Bar dataKey="Income"  fill="#059669" radius={[4,4,0,0]} />
              <Bar dataKey="Expense" fill="#0070f3" radius={[4,4,0,0]} />
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
            <span style={{ fontSize:13, fontWeight:700, color:"var(--text)" }}>-{fmt(totalExpenses)}</span>
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
    </>
  );
}

// In a month's Shared bills: roommates' transfers from around that month, each
// counted toward the month it pays for. One posted on Oct 2 can count for September.
function SortTransfers({ transfers, ym, fmt, onChanged }) {
  const [picked, setPicked] = useState({});              // id -> month or "" (not for bills), before the server answers
  const [open, setOpen] = useState(false);
  const shift = (key, n) => {
    const [y, m] = key.split("-").map(Number);
    const d = new Date(y, m - 1 + n, 1);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  };
  const label = key => new Date(`${key}-15T12:00:00`).toLocaleDateString("en-US", { month: "short", year: "numeric" });
  const near = transfers.filter(t => {
    const posted = t.date.slice(0, 7), day = parseInt(t.date.slice(8), 10);
    const counts = picked[t.id] !== undefined ? picked[t.id] : (t.counts_for || "");
    return counts === ym || posted === ym || (posted === shift(ym, 1) && day <= 12) || (posted === shift(ym, -1) && day >= 20);
  });
  if (near.length === 0) return null;
  const counted = near.filter(t => (picked[t.id] !== undefined ? picked[t.id] : (t.counts_for || "")) === ym);

  async function choose(t, value) {
    const before = picked[t.id];
    setPicked(p => ({ ...p, [t.id]: value }));
    try {
      await accountsAPI.setBillsMonth(t.id, value || null);
      onChanged();
    } catch {
      setPicked(p => ({ ...p, [t.id]: before }));
    }
  }

  return (
    <div style={{ marginTop: 12, paddingTop: 10, borderTop: "1px solid var(--subtle2)" }}>
      <button onClick={() => setOpen(o => !o)} aria-expanded={open} style={{
        width: "100%", background: "none", border: "none", padding: "4px 0", display: "flex", justifyContent: "space-between", alignItems: "center",
        gap: 8, cursor: "pointer", fontFamily: "inherit", color: "var(--text)", textAlign: "left", touchAction: "manipulation",
      }}>
        <span style={{ fontSize: 13, fontWeight: 600 }}>
          Which transfers pay for {label(ym)}?
          <span style={{ display: "block", fontSize: 12, fontWeight: 400, color: "var(--muted)", marginTop: 1 }}>
            {counted.length} of {near.length} nearby transfers count for {label(ym)}. Move a late one here, or mark one as not for bills.
          </span>
        </span>
        <Icon name={open ? "chevron-up" : "chevron-down"} size={15} style={{ flexShrink: 0 }} />
      </button>
      {open && near.map(t => {
        const posted = t.date.slice(0, 7);
        const value = picked[t.id] !== undefined ? picked[t.id] : (t.counts_for || "");
        const choices = [...new Set([shift(posted, -1), posted, shift(posted, 1), ym])].sort();
        const here = value === ym;
        return (
          <div key={t.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, padding: "8px 0", borderTop: "1px solid var(--subtle2)" }}>
            <div style={{ minWidth: 0, fontSize: 13 }}>
              <div style={{ fontWeight: 600, color: here ? "var(--text)" : "var(--muted)" }}>{t.who} · {fmt(parseFloat(t.amount) || 0)}</div>
              <div style={{ fontSize: 12, color: "var(--muted)" }}>
                posted {new Date(`${t.date}T12:00:00`).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
              </div>
            </div>
            <select value={value} onChange={e => choose(t, e.target.value)} aria-label={`Which month's bills ${t.who}'s transfer pays for`} style={{
              minHeight: 36, padding: "0 8px", borderRadius: 8, fontSize: 13, fontFamily: "inherit", maxWidth: 170,
              border: `1px solid ${here ? "#059669" : "var(--border)"}`, background: here ? "rgba(5,150,105,0.08)" : "var(--card)",
              color: "var(--text)",
            }}>
              {choices.map(c => <option key={c} value={c}>For {label(c)} bills</option>)}
              <option value="">Not for bills</option>
            </select>
          </div>
        );
      })}
    </div>
  );
}
