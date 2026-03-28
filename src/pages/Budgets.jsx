import { useState } from "react";
import { CATEGORIES } from "../constants/categories";
import { formatCurrency } from "../utils/helpers";

export default function Budgets({ expenses, budgets, onSaveBudgets }) {
  const [editing,     setEditing]     = useState(false);
  const [tempBudgets, setTempBudgets] = useState({});

  const now          = new Date();
  const currentMonth = now.getMonth();
  const currentYear  = now.getFullYear();

  const thisMonthExp = expenses.filter(e => {
    const d = new Date(e.date);
    return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
  });

  function startEditing() {
    setTempBudgets({ ...budgets });
    setEditing(true);
  }

  function saveEditing() {
    onSaveBudgets(tempBudgets);
    setEditing(false);
  }

  return (
    <>
      <div className="page-header">
        <div>
          <div className="page-title">Budgets</div>
          <div className="page-sub">Monthly spending limits</div>
        </div>
        {!editing
          ? <button className="btn-primary" onClick={startEditing}>✏️ Edit Budgets</button>
          : <div style={{ display:"flex", gap:10 }}>
              <button className="btn-primary"   onClick={saveEditing}>💾 Save</button>
              <button className="btn-secondary" onClick={() => setEditing(false)}>Cancel</button>
            </div>
        }
      </div>

      <div className="budgets-grid">
        {CATEGORIES.map(cat => {
          const spent  = thisMonthExp.filter(e => e.category === cat.name).reduce((s, e) => s + (parseFloat(e.amount) || 0), 0);
          const budget = editing ? (tempBudgets[cat.name] || 0) : (budgets[cat.name] || 0);
          const pct    = budget > 0 ? Math.min((spent / budget) * 100, 100) : 0;
          const over   = spent > budget && budget > 0;

          return (
            <div key={cat.name} className={`budget-card${over ? " over" : ""}`}>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:10 }}>
                <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                  <span style={{ fontSize:20 }}>{cat.icon}</span>
                  <span style={{ fontWeight:700, fontSize:14 }}>{cat.name}</span>
                </div>
                {over && <span className="over-badge">OVER</span>}
              </div>

              {editing ? (
                <div className="form-group">
                  <label className="label">Budget ($)</label>
                  <input
                    className="input"
                    type="number"
                    value={tempBudgets[cat.name] || ""}
                    onChange={e => setTempBudgets(prev => ({ ...prev, [cat.name]: parseFloat(e.target.value) || 0 }))}
                  />
                </div>
              ) : (
                <div style={{ display:"flex", justifyContent:"space-between", fontSize:12, color:"#aaa", marginBottom:6 }}>
                  <span>Spent: <strong style={{ color: over ? "#FF6B6B" : "#e8e8f0" }}>{formatCurrency(spent)}</strong></span>
                  <span>Budget: <strong style={{ color:"#e8e8f0" }}>{formatCurrency(budget)}</strong></span>
                </div>
              )}

              <div className="progress-bar-bg">
                <div style={{ height:"100%", borderRadius:10, background:`linear-gradient(90deg,${over?"#FF6B6B":cat.color},${over?"#FF6B6B":cat.color}88)`, width:`${pct}%`, transition:"width .6s" }} />
              </div>
              {!editing && <div style={{ fontSize:11, color:"#888", marginTop:5 }}>{pct.toFixed(0)}% used · {formatCurrency(Math.max(0, budget-spent))} left</div>}
            </div>
          );
        })}
      </div>
    </>
  );
}