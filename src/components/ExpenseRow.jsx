import { CATEGORIES } from "../constants/categories";

export default function ExpenseRow({ exp, onEdit, onDelete }) {
  const cat = CATEGORIES.find(c => c.name === exp.category);

  return (
    <div className="expense-row">
      <div className="exp-icon">{cat?.icon}</div>
      <div className="exp-info">
        <div className="exp-title">{exp.title}</div>
        <div className="exp-meta">{exp.category} · {exp.date}</div>
        {exp.tags.length > 0 && (
          <div style={{ marginTop: 4 }}>
            {exp.tags.map(t => <span key={t} className="tag">{t}</span>)}
          </div>
        )}
        {exp.notes && (
          <div style={{ fontSize:11, color:"#888", fontStyle:"italic", marginTop:3 }}>
            {exp.notes}
          </div>
        )}
        <div className="expense-row-mobile-actions">
          <button className="btn-ghost"  onClick={() => onEdit(exp)}>✏️ Edit</button>
          <button className="btn-danger" onClick={() => onDelete(exp.id)}>🗑 Delete</button>
        </div>
      </div>
      <div className="exp-right">
        <span className="exp-amount">
          {new Intl.NumberFormat("en-US",{ style:"currency", currency:"USD" }).format(exp.amount)}
        </span>
        <button className="btn-ghost"  onClick={() => onEdit(exp)}>✏️</button>
        <button className="btn-danger" onClick={() => onDelete(exp.id)}>🗑</button>
      </div>
    </div>
  );
}