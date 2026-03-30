import { useMemo }    from "react";
import { CATEGORIES } from "../constants/categories";

export default function FinancialTips({ expenses, incomes, budgets, debts }) {

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
          icon:  "🚨",
          title: "Spending more than you earn!",
          body:  `You've spent ${Math.abs(savingsRate).toFixed(0)}% more than your income this month. Review your biggest expense categories immediately.`,
        });
      } else if (savingsRate < 10) {
        result.push({
          type:  "warning",
          icon:  "⚠️",
          title: "Low savings rate this month",
          body:  `You're saving only ${savingsRate.toFixed(0)}% of your income. Financial experts recommend saving at least 20% of your income.`,
        });
      } else if (savingsRate >= 20) {
        result.push({
          type:  "success",
          icon:  "🎉",
          title: "Excellent savings rate!",
          body:  `You're saving ${savingsRate.toFixed(0)}% of your income this month. You're building great financial habits!`,
        });
      }
    }

    // ── Tip 2: Over budget categories ──
    const overBudgetCats = CATEGORIES.filter(cat => {
      const spent  = thisMonthExp
        .filter(e => e.category === cat.name)
        .reduce((s, e) => s + (parseFloat(e.amount) || 0), 0);
      const budget = parseFloat(budgets[cat.name]) || 0;
      return budget > 0 && spent > budget;
    });

    if (overBudgetCats.length > 0) {
      result.push({
        type:  "warning",
        icon:  "📊",
        title: `${overBudgetCats.length} budget${overBudgetCats.length > 1 ? "s" : ""} exceeded this month`,
        body:  `You've gone over budget in: ${overBudgetCats.map(c => c.name).join(", ")}. Consider adjusting your limits or cutting back next month.`,
      });
    }

    // ── Tip 3: Top spending category ──
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

    // ── Tip 4: Overdue debts ──
    const overdueDebts = (debts || []).filter(d =>
      !d.isPaidOff &&
      d.nextPaymentDate &&
      new Date(d.nextPaymentDate) < new Date()
    );

    if (overdueDebts.length > 0) {
      result.push({
        type:  "danger",
        icon:  "💳",
        title: `${overdueDebts.length} overdue payment${overdueDebts.length > 1 ? "s" : ""}!`,
        body:  `${overdueDebts.map(d => d.name).join(", ")} ${overdueDebts.length > 1 ? "are" : "is"} overdue. Late payments can damage your credit score.`,
      });
    }

    // ── Tip 5: High interest debt ──
    const highInterestDebt = (debts || [])
      .filter(d => !d.isPaidOff && d.interestRate > 15 && d.balance > 0)
      .sort((a, b) => b.interestRate - a.interestRate)[0];

    if (highInterestDebt) {
      result.push({
        type:  "info",
        icon:  "📈",
        title: "Focus extra payments on high-interest debt",
        body:  `Your ${highInterestDebt.name} has a ${highInterestDebt.interestRate}% interest rate. Paying this off faster will save you the most money.`,
      });
    }

    // ── Tip 6: No budgets set ──
    const spentCatsWithNoBudget = CATEGORIES.filter(cat => {
      const spent  = thisMonthExp
        .filter(e => e.category === cat.name)
        .reduce((s, e) => s + (parseFloat(e.amount) || 0), 0);
      const budget = parseFloat(budgets[cat.name]) || 0;
      return spent > 0 && budget === 0;
    });

    if (spentCatsWithNoBudget.length > 0) {
      result.push({
        type:  "info",
        icon:  "🎯",
        title: "Set budgets to stay on track",
        body:  `You're spending on ${spentCatsWithNoBudget.map(c => c.name).join(", ")} but have no budget limits set. Go to Budgets to add limits.`,
      });
    }

    // ── Tip 7: Daily spending pace ──
    const dayOfMonth  = now.getDate();
    const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
    const projectedMonthlySpend = dayOfMonth > 0
      ? (totalExpenses / dayOfMonth) * daysInMonth
      : 0;

    const totalBudget = Object.values(budgets)
      .reduce((s, v) => s + (parseFloat(v) || 0), 0);

    if (totalBudget > 0 && projectedMonthlySpend > totalBudget * 1.1) {
      result.push({
        type:  "warning",
        icon:  "⏱️",
        title: "You're on track to exceed your budget",
        body:  `At your current spending pace you'll spend about ${((projectedMonthlySpend / totalBudget) * 100).toFixed(0)}% of your monthly budget. Consider slowing down.`,
      });
    }

    // ── Tip 8: All good ──
    if (result.length === 0) {
      result.push({
        type:  "success",
        icon:  "✨",
        title: "Your finances look great!",
        body:  "No issues detected this month. Keep tracking your expenses and maintaining your good financial habits.",
      });
    }

    // Return max 3 tips
    return result.slice(0, 3);

  }, [expenses, incomes, budgets, debts]);

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
        color:         "#888",
        fontWeight:    600,
        textTransform: "uppercase",
        letterSpacing: "0.6px",
        marginBottom:  10,
      }}>
        💡 Financial Tips
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
              <span style={{ fontSize:20, flexShrink:0, lineHeight:1.4 }}>
                {tip.icon}
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
                  color:      "#555",
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