// ─────────────────────────────────────────────
// IncomeRow — a single income list item
// ─────────────────────────────────────────────

import { INCOME_CATEGORIES } from "../hooks/useIncome";

export default function IncomeRow({ income, onEdit, onDelete }) {
  const cat = INCOME_CATEGORIES.find(c => c.name === income.category);

  return (
    <div className="expense-row">

      {/* Category icon */}
      <div className="exp-icon">{cat?.icon}</div>

      {/* Info */}
      <div className="exp-info">
        <div className="exp-title">{income.title}</div>
        <div className="exp-meta">{income.category} · {income.date}</div>
        {income.notes && (
          <div style={{ fontSize:11, color:"#888", fontStyle:"italic", marginTop:3 }}>
            {income.notes}
          </div>
        )}
        {/* Mobile actions */}
        <div className="expense-row-mobile-actions">
          <button className="btn-ghost"  onClick={() => onEdit(income)}>✏️ Edit</button>
          <button className="btn-danger" onClick={() => onDelete(income.id)}>🗑 Delete</button>
        </div>
      </div>

      {/* Amount + desktop actions */}
      <div className="exp-right">
        <span style={{
          fontWeight: 800,
          fontSize:   15,
          color:      "#55EFC4", // green for income
        }}>
          +{new Intl.NumberFormat("en-US",{ style:"currency", currency:"USD" }).format(income.amount)}
        </span>
        <button className="btn-ghost"  onClick={() => onEdit(income)}>✏️</button>
        <button className="btn-danger" onClick={() => onDelete(income.id)}>🗑</button>
      </div>

    </div>
  );
}