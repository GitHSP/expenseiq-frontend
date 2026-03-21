import {
  PieChart, Pie, Cell, BarChart, Bar,
  XAxis, YAxis, Tooltip, ResponsiveContainer, Legend
} from "recharts";
import StatCard            from "../components/StatCard";
import ExpenseRow          from "../components/ExpenseRow";
import IncomeRow           from "../components/IncomeRow";
import ExchangeRatesWidget from "../components/ExchangeRatesWidget";
import { CATEGORIES, MONTHS } from "../constants/categories";
import { INCOME_CATEGORIES }  from "../hooks/useIncome";

const TOOLTIP_STYLE = {
  background: "#ffffff", border: "1px solid #e8eaf0",
  borderRadius: 10, color: "#1a1a2e", fontSize: 12
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
  const totalExpenses = thisMonthExp.reduce((s, e) => s + parseFloat(e.amount), 0);
  const totalIncome   = thisMonthInc.reduce((s, i) => s + parseFloat(i.amount), 0);
  const netBalance    = totalIncome - totalExpenses;
//   const totalBudget   = Object.values(budgets).reduce((s, v) => s + v, 0);

  const overBudget = CATEGORIES.filter(cat => {
    const spent = thisMonthExp
      .filter(e => e.category === cat.name)
      .reduce((s, e) => s + parseFloat(e.amount), 0);
    return spent > (budgets[cat.name] || 0) && (budgets[cat.name] || 0) > 0;
  });

  // ── Pie chart data ──
  const expensePieData = CATEGORIES.map(cat => ({
    name:  cat.name,
    value: thisMonthExp
      .filter(e => e.category === cat.name)
      .reduce((s, e) => s + parseFloat(e.amount), 0),
    color: cat.color,
  })).filter(c => c.value > 0);

  // ── Income vs Expense bar chart ──
  const incomeVsExpenseData = MONTHS.map((m, i) => {
    const monthExp = expenses
      .filter(e => new Date(e.date).getMonth() === i && new Date(e.date).getFullYear() === currentYear)
      .reduce((s, e) => s + parseFloat(e.amount), 0);
    const monthInc = incomes
      .filter(inc => new Date(inc.date).getMonth() === i && new Date(inc.date).getFullYear() === currentYear)
      .reduce((s, inc) => s + parseFloat(inc.amount), 0);
    return {
      name:    m,
      Income:  parseFloat(monthInc.toFixed(2)),
      Expense: parseFloat(monthExp.toFixed(2)),
    };
  });

  return (
    <>
      <div className="page-title">Overview</div>
      <div className="page-sub">{MONTHS[currentMonth]} {currentYear}</div>

      {/* ── Exchange rates widget ── */}
      <ExchangeRatesWidget
        rates={rates}
        currency={currency}
        getRate={getRate}
        getLastUpdatedText={getLastUpdatedText}
        loading={ratesLoading}
        error={ratesError}
        refresh={refreshRates}
      />

      {/* ── Stat cards ── */}
      <div className="stat-grid">
        <StatCard
          label="This Month"
          value={formatAmount(totalExpenses)}
          sub={`${thisMonthExp.length} expenses`}
          gradient="linear-gradient(135deg,#FF6B6B,#FF8E53)"
        />
        <StatCard
          label="Income"
          value={formatAmount(totalIncome)}
          sub={`${thisMonthInc.length} entries`}
          gradient="linear-gradient(135deg,#55EFC4,#00B894)"
        />
        <StatCard
          label="Net Balance"
          value={formatAmount(netBalance)}
          sub={netBalance >= 0 ? "✅ Surplus" : "⚠️ Deficit"}
          gradient={netBalance >= 0
            ? "linear-gradient(135deg,#A29BFE,#6C5CE7)"
            : "linear-gradient(135deg,#FF6B6B,#D63031)"
          }
        />
        <StatCard
          label="Over Budget"
          value={overBudget.length}
          sub="categories"
          gradient="linear-gradient(135deg,#FFE66D,#F9A825)"
        />
      </div>

      {/* ── Charts ── */}
      <div className="charts-grid">

        {/* Income vs Expense */}
        <div className="card">
          <div className="card-title" style={{ marginBottom:14 }}>
            Income vs Expenses {currentYear}
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={incomeVsExpenseData}>
              <XAxis dataKey="name" tick={{ fill:"#888", fontSize:10 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill:"#888", fontSize:10 }} axisLine={false} tickLine={false} tickFormatter={v => `${v}`} width={42} />
              <Tooltip
                formatter={(v, name) => [formatAmount(v), name]}
                contentStyle={TOOLTIP_STYLE}
              />
              <Legend wrapperStyle={{ fontSize:11 }} />
              <Bar dataKey="Income"  fill="#55EFC4" radius={[4,4,0,0]} />
              <Bar dataKey="Expense" fill="#FF6B6B" radius={[4,4,0,0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Expense pie chart */}
        <div className="card">
          <div className="card-title" style={{ marginBottom:14 }}>
            Spending by Category
          </div>
          {expensePieData.length === 0
            ? <div style={{ textAlign:"center", color:"#bbb", padding:"30px 0" }}>No data yet</div>
            : <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie
                    data={expensePieData}
                    cx="50%" cy="50%"
                    innerRadius={55} outerRadius={90}
                    paddingAngle={3} dataKey="value"
                  >
                    {expensePieData.map((e, i) => <Cell key={i} fill={e.color} />)}
                  </Pie>
                  <Tooltip
                    formatter={v => formatAmount(v)}
                    contentStyle={TOOLTIP_STYLE}
                  />
                  <Legend iconType="circle" iconSize={9} wrapperStyle={{ fontSize:11 }} />
                </PieChart>
              </ResponsiveContainer>
          }
        </div>
      </div>

      {/* ── Monthly Income Summary ── */}
      <div className="card">
        <div className="card-title" style={{ marginBottom:12 }}>
          Monthly Income Summary
        </div>
        <div style={{ display:"flex", gap:10, flexWrap:"wrap" }}>
          {INCOME_CATEGORIES.map(cat => {
            const total = thisMonthInc
              .filter(i => i.category === cat.name)
              .reduce((s, i) => s + parseFloat(i.amount), 0);
            if (total === 0) return null;
            return (
              <div key={cat.name} style={{
                display:"flex", alignItems:"center", gap:8,
                background:"#fafbfc", borderRadius:12,
                padding:"8px 14px",
                border:`1px solid ${cat.color}44`,
              }}>
                <span style={{ fontSize:18 }}>{cat.icon}</span>
                <div>
                  <div style={{ fontSize:11, color:"#888" }}>{cat.name}</div>
                  <div style={{ fontWeight:700, color:"#00B894" }}>{formatAmount(total)}</div>
                </div>
              </div>
            );
          })}
          {thisMonthInc.length === 0 && (
            <div style={{ color:"#bbb", fontSize:13 }}>No income recorded this month</div>
          )}
        </div>
      </div>

      {/* ── Recent Income ── */}
      <div className="card">
        <div className="card-header">
          <span className="card-title">Recent Income</span>
          <button
            className="btn-primary"
            style={{ background:"linear-gradient(135deg,#55EFC4,#00B894)", padding:"8px 16px", fontSize:13 }}
            onClick={onAddIncome}
          >
            + Add Income
          </button>
        </div>
        {incomes.length === 0
          ? <div className="empty-state">
              <div className="empty-icon">💰</div>
              <div style={{ fontWeight:600, marginBottom:6 }}>No income yet</div>
              <div style={{ fontSize:13 }}>Click "+ Add Income" to get started</div>
            </div>
          : incomes.slice(0, 5).map(income => (
              <IncomeRow
                key={income.id}
                income={income}
                onEdit={onEditIncome}
                onDelete={onDeleteIncome}
                formatAmount={formatAmount}
              />
            ))
        }
      </div>

      {/* ── Recent Expenses ── */}
      <div className="card">
        <div className="card-header">
          <span className="card-title">Recent Expenses</span>
          <button className="btn-ghost" onClick={onViewAll}>View All →</button>
        </div>
        {expenses.length === 0
          ? <div className="empty-state">
              <div className="empty-icon">💸</div>
              <div style={{ fontWeight:600, marginBottom:6 }}>No expenses yet</div>
              <div style={{ fontSize:13 }}>Click "+ Add" to get started</div>
            </div>
          : expenses.slice(0, 5).map(exp => (
              <ExpenseRow
                key={exp.id}
                exp={exp}
                onEdit={onEdit}
                onDelete={onDelete}
                formatAmount={formatAmount}
              />
            ))
        }
      </div>
    </>
  );
}