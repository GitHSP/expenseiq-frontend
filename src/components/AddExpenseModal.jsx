// ─────────────────────────────────────────────
// AddExpenseModal — slide-up form to add or edit
//
// Props:
//   editingExpense — expense object if editing, null if adding
//   onSave         — called with formData when Save is clicked
//   onClose        — closes the modal
// ─────────────────────────────────────────────

import { useState, useEffect } from "react";
import { CATEGORIES } from "../constants/categories";

const EMPTY_FORM = {
  title:    "",
  amount:   "",
  category: "Food & Dining",
  date:     new Date().toISOString().split("T")[0],
  tags:     "",
  notes:    "",
};

export default function AddExpenseModal({ editingExpense, onSave, onClose }) {
  const [form, setForm] = useState(EMPTY_FORM);

  // If editing, pre-fill the form with existing expense data
  // If adding new, reset the form to empty
  useEffect(() => {
    if (editingExpense) {
      setForm({
        title:    editingExpense.title,
        amount:   editingExpense.amount,
        category: editingExpense.category,
        date:     editingExpense.date,
        tags:     editingExpense.tags.join(", "),
        notes:    editingExpense.notes || "",
      });
    } else {
      setForm(EMPTY_FORM);
    }
  }, [editingExpense]);

  // Helper to update a single field without overwriting others
  function update(field, value) {
    setForm(prev => ({ ...prev, [field]: value }));
  }

  function handleSave() {
    onSave(form);
  }

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal-box">

        {/* Drag handle — visible on mobile only via CSS */}
        <div className="modal-handle" />

        <div className="modal-title">
          {editingExpense ? "✏️ Edit Expense" : "➕ New Expense"}
        </div>

        {/* Title field */}
        <div className="form-group">
          <label className="label">Title *</label>
          <input
            className="input"
            placeholder="e.g. Lunch at Chipotle"
            value={form.title}
            onChange={e => update("title", e.target.value)}
          />
        </div>

        {/* Amount + Date side by side */}
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

        {/* Category dropdown */}
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
              {CATEGORIES.map(c => (
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

        {/* Tags */}
        <div className="form-group">
          <label className="label">Tags (comma-separated)</label>
          <input
            className="input"
            placeholder="e.g. work, reimbursable"
            value={form.tags}
            onChange={e => update("tags", e.target.value)}
          />
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

        {/* Footer buttons */}
        <div className="modal-footer">
          <button className="btn-primary" onClick={handleSave} style={{ flex: 1 }}>
            {editingExpense ? "Update Expense" : "Add Expense"}
          </button>
          <button className="btn-secondary" onClick={onClose}>Cancel</button>
        </div>

      </div>
    </div>
  );
}