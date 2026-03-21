// ─────────────────────────────────────────────
// AddIncomeModal — form to add or edit income
// ─────────────────────────────────────────────

import { useState, useEffect } from "react";
import { INCOME_CATEGORIES }  from "../hooks/useIncome";

const EMPTY_FORM = {
  title:    "",
  amount:   "",
  category: "Salary",
  date:     new Date().toISOString().split("T")[0],
  notes:    "",
};

export default function AddIncomeModal({ editingIncome, onSave, onClose }) {
  const [form, setForm] = useState(EMPTY_FORM);

  // Pre-fill form if editing
  useEffect(() => {
    if (editingIncome) {
      setForm({
        title:    editingIncome.title,
        amount:   editingIncome.amount,
        category: editingIncome.category,
        date:     editingIncome.date,
        notes:    editingIncome.notes || "",
      });
    } else {
      setForm(EMPTY_FORM);
    }
  }, [editingIncome]);

  function update(field, value) {
    setForm(prev => ({ ...prev, [field]: value }));
  }

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal-box">

        <div className="modal-handle" />

        <div className="modal-title">
          {editingIncome ? "✏️ Edit Income" : "➕ Add Income"}
        </div>

        {/* Title */}
        <div className="form-group">
          <label className="label">Title *</label>
          <input
            className="input"
            placeholder="e.g. Monthly Salary"
            value={form.title}
            onChange={e => update("title", e.target.value)}
          />
        </div>

        {/* Amount + Date */}
        <div className="form-grid-2">
          <div className="form-group">
            <label className="label">Amount ($) *</label>
            <input
              className="input"
              type="number"
              inputMode="decimal"
              placeholder="0.00"
              value={form.amount}
              onChange={e => update("amount", e.target.value)}
            />
          </div>
          <div className="form-group">
            <label className="label">Date</label>
            <input
              className="input"
              type="date"
              value={form.date}
              onChange={e => update("date", e.target.value)}
            />
          </div>
        </div>

        {/* Category */}
        <div className="form-group">
          <label className="label">Category</label>
          <select className="input"
            value={form.category}
            onChange={e => update("category", e.target.value)}
            style={{
                background: "#161616",
                color:      "#e8e8e8",
            }}
            >
            {INCOME_CATEGORIES.map(c => (
                <option
                key={c.name}
                value={c.name}
                style={{ background:"#161616", color:"#e8e8e8" }}
                >
                {c.icon} {c.name}
                </option>
            ))}
            </select>
        </div>

        {/* Notes */}
        <div className="form-group">
          <label className="label">Notes</label>
          <input
            className="input"
            placeholder="Optional note..."
            value={form.notes}
            onChange={e => update("notes", e.target.value)}
          />
        </div>

        {/* Buttons */}
        <div className="modal-footer">
          <button
            className="btn-primary"
            onClick={() => onSave(form)}
            style={{ flex: 1, background: "linear-gradient(135deg,#55EFC4,#00B894)" }}
          >
            {editingIncome ? "Update Income" : "Add Income"}
          </button>
          <button className="btn-secondary" onClick={onClose}>Cancel</button>
        </div>

      </div>
    </div>
  );
}