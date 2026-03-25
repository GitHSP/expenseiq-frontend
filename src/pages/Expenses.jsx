import { useState } from "react";
import ExpenseRow              from "../components/ExpenseRow";
import { CATEGORIES, MONTHS } from "../constants/categories";
import { formatCurrency, exportToCSV } from "../utils/helpers";

export default function Expenses({ expenses, onEdit, onDelete }) {
  const [filterCat,   setFilterCat]   = useState("All");
  const [filterMonth, setFilterMonth] = useState("All");

  const filtered = expenses.filter(e => {
    const d = new Date(e.date);
    return (
      (filterCat   === "All" || e.category === filterCat) &&
      (filterMonth === "All" || d.getMonth() === parseInt(filterMonth))
    );
  });

  const total = filtered.reduce((s, e) => s + (parseFloat(e.amount) || 0), 0);

  return (
    <>
      <div className="page-header">
        <div><div className="page-title">All Expenses</div></div>
        <button className="btn-primary" onClick={() => exportToCSV(filtered)}>⬇ Export CSV</button>
      </div>

      <div className="filters">
        <select className="filter-select" value={filterCat} onChange={e => setFilterCat(e.target.value)}>
          <option>All</option>
          {CATEGORIES.map(c => <option key={c.name}>{c.name}</option>)}
        </select>
        <select className="filter-select" value={filterMonth} onChange={e => setFilterMonth(e.target.value)}>
          <option value="All">All Months</option>
          {MONTHS.map((m, i) => <option key={i} value={i}>{m}</option>)}
        </select>
      </div>

      <div className="summary-bar">
        <span style={{ fontSize:13, color:"#888" }}>{filtered.length} expenses</span>
        <span style={{ fontWeight:800, color:"#FF6B6B", fontSize:16 }}>{formatCurrency(total)}</span>
      </div>

      {filtered.length === 0
        ? <div className="empty-state"><div className="empty-icon">🔍</div><div style={{ fontWeight:600 }}>No expenses found</div></div>
        : filtered.map(exp => <ExpenseRow key={exp.id} exp={exp} onEdit={onEdit} onDelete={onDelete} />)
      }
    </>
  );
}