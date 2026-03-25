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
  background:   "#ffffff",
  border:       "1px solid #eaeaea",
  borderRadius: 8,
  color:        "#0d0d0d",
  fontSize:     12,
  fontFamily:   "'Inter', sans-serif",
  boxShadow:    "0 4px 12px rgba(0,0,0,0.08)",
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

  // ── This month data ──
  const thisMonthExp = expenses.filter(e => {
    const d = new Date(e.date);
    return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
  });

  const thisMonthInc = incomes.filter(i => {
    const d = new Date(i.date);
    return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
  });

  // ── Totals ──
  const totalExpenses = thisMonthExp.reduce((s, e) => s + parseFloat(e.amount) || 0, 0);
  const totalIncome   = thisMonthInc.reduce((s, i) => s + parseFloat(i.amount) || 0, 0);
  const netBalance    = totalIncome - totalExpenses;

  const overBudget = CATEGORIES.filter(cat => {
    const spent = thisMonthExp
      .filter(e => e.category === cat.name)
      .reduce((s, e) => s + parseFloat(e.amount) || 0, 0);
    return spent > (budgets[cat.name] || 0) && (budgets[cat.name] || 0) > 0;
  });

  // ── Pie chart ──
  const expensePieData = CATEGORIES.map(cat => ({
    name:  cat.name,
    value: thisMonthExp
      .filter(e => e.category === cat.name)
      .reduce((s, e) => s + parseFloat(e.amount) || 0, 0),
    color: cat.color,
  })).filter(c => c.value > 0);

  // ── Bar chart ──
  const incomeVsExpenseData = MONTHS.map((m, i) => {
    const monthExp = expenses
      .filter(e => new Date(e.date).getMonth() === i && new Date(e.date).getFullYear() === currentYear)
      .reduce((s, e) => s + parseFloat(e.amount) || 0, 0);
    const monthInc = incomes
      .filter(inc => new Date(inc.date).getMonth() === i && new Date(inc.date).getFullYear() === currentYear)
      .reduce((s, inc) => s + parseFloat(inc.amount) || 0 , 0);
    return {
      name:    m.slice(0, 3),
      Income:  parseFloat(monthInc.toFixed(2)),
      Expense: parseFloat(monthExp.toFixed(2)),
    };
  });

  return (
    <>
      {/* ── Page header ── */}
      <div style={{ marginBottom:28 }}>
        <div className="page-title">Dashboard</div>
        <div className="page-sub">
          {MONTHS[currentMonth]} {currentYear} — Welcome back{" "}
          {/* show first name if available */}
        </div>
      </div>

      {/* ── Stat cards ── */}
      <div className="stat-grid">
        <StatCard
          label="This Month"
          value={formatAmount ? formatAmount(totalExpenses) : `$${totalExpenses.toFixed(2)}`}
          sub={`${thisMonthExp.length} expenses`}
          gradient="linear-gradient(135deg, #e11d48 0%, #be123c 100%)"
          textColor="#fff"
        />
        <StatCard
          label="Income"
          value={formatAmount ? formatAmount(totalIncome) : `$${totalIncome.toFixed(2)}`}
          sub={`${thisMonthInc.length} entries`}
          gradient="linear-gradient(135deg, #059669 0%, #047857 100%)"
          textColor="#fff"
        />
        <StatCard
          label="Net Balance"
          value={formatAmount ? formatAmount(netBalance) : `$${netBalance.toFixed(2)}`}
          sub={netBalance >= 0 ? "↑ Surplus" : "↓ Deficit"}
          gradient={netBalance >= 0
            ? "linear-gradient(135deg, #0070f3 0%, #0050b3 100%)"
            : "linear-gradient(135deg, #e11d48 0%, #be123c 100%)"
          }
          textColor="#fff"
        />
        <StatCard
          label="Over Budget"
          value={overBudget.length}
          sub="categories this month"
          gradient="linear-gradient(135deg, #f59e0b 0%, #d97706 100%)"
          textColor="#fff"
        />
      </div>

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

        {/* Income vs Expense bar chart */}
        <div className="card">
          <div className="card-title" style={{ marginBottom:16 }}>
            Income vs Expenses {currentYear}
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={incomeVsExpenseData} barGap={4}>
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
                width={40}
              />
              <Tooltip
                formatter={(v) => formatAmount ? formatAmount(v) : `$${v}`}
                contentStyle={TOOLTIP_STYLE}
              />
              <Legend
                wrapperStyle={{ fontSize:11, fontFamily:"Inter" }}
              />
              <Bar dataKey="Income"  fill="#059669" radius={[5,5,0,0]} />
              <Bar dataKey="Expense" fill="#e11d48" radius={[5,5,0,0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Spending pie chart */}
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
                <Pie
                  data={expensePieData}
                  cx="50%" cy="50%"
                  innerRadius={55}
                  outerRadius={88}
                  paddingAngle={3}
                  dataKey="value"
                >
                  {expensePieData.map((e, i) => (
                    <Cell key={i} fill={e.color} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={v => formatAmount ? formatAmount(v) : `$${v}`}
                  contentStyle={TOOLTIP_STYLE}
                />
                <Legend
                  iconType="circle"
                  iconSize={8}
                  wrapperStyle={{ fontSize:11, fontFamily:"Inter" }}
                />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* ── Monthly Income Summary ── */}
      <div className="card">
        <div className="card-header">
          <span className="card-title">Income This Month</span>
          <button
            className="btn-primary"
            style={{ padding:"7px 14px", fontSize:12 }}
            onClick={onAddIncome}
          >
            + Add Income
          </button>
        </div>
        {thisMonthInc.length === 0 ? (
          <div style={{ color:"#aaa", fontSize:13, textAlign:"center", padding:"20px 0" }}>
            No income recorded this month
          </div>
        ) : (
          <div style={{ display:"flex", gap:10, flexWrap:"wrap" }}>
            {INCOME_CATEGORIES.map(cat => {
              const total = thisMonthInc
                .filter(i => i.category === cat.name)
                .reduce((s, i) => s + parseFloat(i.amount), 0);
              if (total === 0) return null;
              return (
                <div key={cat.name} style={{
                  display:"flex", alignItems:"center", gap:8,
                  background:"#f6f8fa", borderRadius:8,
                  padding:"8px 14px",
                  border:"1px solid #eaeaea",
                }}>
                  <span style={{ fontSize:16 }}>{cat.icon}</span>
                  <div>
                    <div style={{ fontSize:10, color:"#aaa", fontWeight:600, textTransform:"uppercase", letterSpacing:"0.5px" }}>
                      {cat.name}
                    </div>
                    <div style={{ fontWeight:700, fontSize:13, color:"#059669", letterSpacing:"-0.2px" }}>
                      {formatAmount ? formatAmount(total) : `$${total.toFixed(2)}`}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Recent Income ── */}
      <div className="card">
        <div className="card-header">
          <span className="card-title">Recent Income</span>
        </div>
        {incomes.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">💰</div>
            <div style={{ fontWeight:600, color:"#ccc", marginBottom:4 }}>No income yet</div>
            <div style={{ fontSize:12, color:"#ccc" }}>Click "+ Add Income" to get started</div>
          </div>
        ) : (
          incomes.slice(0, 5).map(income => (
            <IncomeRow
              key={income.id}
              income={income}
              onEdit={onEditIncome}
              onDelete={onDeleteIncome}
              formatAmount={formatAmount}
            />
          ))
        )}
      </div>

      {/* ── Recent Expenses ── */}
      <div className="card">
        <div className="card-header">
          <span className="card-title">Recent Expenses</span>
          <button className="btn-ghost" onClick={onViewAll}>
            View all →
          </button>
        </div>
        {expenses.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">💸</div>
            <div style={{ fontWeight:600, color:"#ccc", marginBottom:4 }}>No expenses yet</div>
            <div style={{ fontSize:12, color:"#ccc" }}>Click "+ Add Expense" to get started</div>
          </div>
        ) : (
          expenses.slice(0, 5).map(exp => (
            <ExpenseRow
              key={exp.id}
              exp={exp}
              onEdit={onEdit}
              onDelete={onDelete}
              formatAmount={formatAmount}
            />
          ))
        )}
      </div>
    </>
  );
}