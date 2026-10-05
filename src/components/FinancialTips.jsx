import { useMemo }    from "react";
import { CATEGORIES } from "../constants/categories";
import Icon, { IconLabel } from "./Icon";

export default function FinancialTips({ expenses, incomes, debts }) {

  const tips = useMemo(() => {
    const now          = new Date();
    const currentMonth = now.getMonth();
    const currentYear  = now.getFullYear();
    const result       = [];

    // ── This month data ──
    const thisMonthExp = expenses.filter(e => {
      const d = new Date(e.date);
      return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
    });

    const thisMonthInc = incomes.filter(i => {
      const d = new Date(i.date);
      return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
    });

    const totalExpenses = thisMonthExp.reduce((s, e) => s + (parseFloat(e.amount) || 0), 0);
    const totalIncome   = thisMonthInc.reduce((s, i) => s + (parseFloat(i.amount) || 0), 0);
    const netBalance    = totalIncome - totalExpenses;
    const savingsRate   = totalIncome > 0
      ? (netBalance / totalIncome) * 100
      : 0;

    // ── Tip 1: Savings rate ──
    if (totalIncome > 0) {
      if (savingsRate < 0) {
        result.push({
          type:  "danger",
          icon:  "siren",
          title: "Spending more than you earn!",
          body:  `You've spent ${Math.abs(savingsRate).toFixed(0)}% more than your income this month. Review your biggest expense categories immediately.`,
        });
      } else if (savingsRate < 10) {
        result.push({
          type:  "warning",
          icon:  "warning",
          title: "Low savings rate this month",
          body:  `You're saving only ${savingsRate.toFixed(0)}% of your income. Financial experts recommend saving at least 20% of your income.`,
        });
      } else if (savingsRate >= 20) {
        result.push({
          type:  "success",
          icon:  "party",
          title: "Excellent savings rate!",
          body:  `You're saving ${savingsRate.toFixed(0)}% of your income this month. You're building great financial habits!`,
        });
      }
    }

    // ── Tip 2: Top spending category ──
    const catTotals = CATEGORIES
      .map(cat => ({
        ...cat,
        spent: thisMonthExp
          .filter(e => e.category === cat.name)
          .reduce((s, e) => s + (parseFloat(e.amount) || 0), 0),
      }))
      .filter(c => c.spent > 0)
      .sort((a, b) => b.spent - a.spent);

    const topCat = catTotals[0];
    if (topCat && totalExpenses > 0) {
      const pct = ((topCat.spent / totalExpenses) * 100).toFixed(0);
      if (parseInt(pct) > 40) {
        result.push({
          type:  "info",
          icon:  topCat.icon,
          title: `${topCat.name} is consuming ${pct}% of your spending`,
          body:  `You've spent the most on ${topCat.name} this month. Is this aligned with your priorities and goals?`,
        });
      }
    }

    // ── Tip 4: Debts due soon (within 7 days, by day-of-month) ──
    const todayDay = now.getDate();
    const dueSoonDebts = (debts || []).filter(d => {
      if (!d.is_active || !d.due_day) return false;
      const diff = d.due_day - todayDay;
      return diff >= 0 && diff <= 7;
    });

    if (dueSoonDebts.length > 0) {
      result.push({
        type:  "warning",
        icon:  "credit-card",
        title: `${dueSoonDebts.length} debt payment${dueSoonDebts.length > 1 ? "s" : ""} due within 7 days`,
        body:  `${dueSoonDebts.map(d => d.name).join(", ")} ${dueSoonDebts.length > 1 ? "are" : "is"} due soon. Check the Planner checklist to make sure funds are ready.`,
      });
    }

    // ── Tip 5: High interest debt ──
    const highInterestDebt = (debts || [])
      .filter(d => d.is_active && parseFloat(d.annual_interest_rate) > 15 && parseFloat(d.current_balance) > 0)
      .sort((a, b) => parseFloat(b.annual_interest_rate) - parseFloat(a.annual_interest_rate))[0];

    if (highInterestDebt) {
      result.push({
        type:  "info",
        icon:  "trending-up",
        title: "Focus extra payments on high-interest debt",
        body:  `Your ${highInterestDebt.name} has a ${highInterestDebt.annual_interest_rate}% interest rate. Paying this off faster will save you the most money.`,
      });
    }

    // ── Tip 6: All good ──
    if (result.length === 0) {
      result.push({
        type:  "success",
        icon:  "sparkles",
        title: "Your finances look great!",
        body:  "No issues detected this month. Keep tracking your expenses and maintaining your good financial habits.",
      });
    }

    // Return max 3 tips
    return result.slice(0, 3);

  }, [expenses, incomes, debts]);

  // ── Colors per type ──
  const colors = {
    danger:  { bg:"#fff1f2", border:"#fecdd3", title:"#e11d48" },
    warning: { bg:"#fffbeb", border:"#fde68a", title:"#d97706" },
    success: { bg:"#f0fdf4", border:"#bbf7d0", title:"#059669" },
    info:    { bg:"#f0f7ff", border:"#bfdbfe", title:"#0070f3" },
  };

  if (!tips || tips.length === 0) return null;

  return (
    <div style={{ marginBottom:20 }}>

      {/* Header */}
      <div style={{
        fontSize:      11,
        color:         "var(--muted)",
        fontWeight:    600,
        textTransform: "uppercase",
        letterSpacing: "0.6px",
        marginBottom:  10,
      }}>
        <IconLabel name="lightbulb" size={13}>Financial Tips</IconLabel>
      </div>

      {/* Tips list */}
      <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
        {tips.map((tip, i) => {
          const c = colors[tip.type] || colors.info;
          return (
            <div
              key={i}
              style={{
                background:   c.bg,
                border:       `1px solid ${c.border}`,
                borderRadius: 10,
                padding:      "12px 16px",
                display:      "flex",
                gap:          12,
                alignItems:   "flex-start",
              }}
            >
              <span style={{ color:c.title, display:"inline-flex", paddingTop:1 }}>
                <Icon name={tip.icon} size={18} />
              </span>
              <div>
                <div style={{
                  fontWeight:    700,
                  fontSize:      13,
                  color:         c.title,
                  marginBottom:  3,
                  letterSpacing: "-0.1px",
                }}>
                  {tip.title}
                </div>
                <div style={{
                  fontSize:   12,
                  color:      "var(--muted2)",
                  lineHeight: 1.6,
                }}>
                  {tip.body}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}