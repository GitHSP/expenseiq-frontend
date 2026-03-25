import { useState, useEffect } from "react";
import { CATEGORIES }          from "../constants/categories";

const EMPTY_FORM = {
  title:    "",
  amount:   "",
  category: "Food & Dining",
  date:     new Date().toISOString().split("T")[0],
  tags:     "",
  notes:    "",
};

const inputStyle = {
  width:        "100%",
  background:   "#ffffff",
  border:       "1px solid #eaeaea",
  borderRadius: "8px",
  padding:      "10px 12px",
  color:        "#0d0d0d",
  fontSize:     "13.5px",
  fontFamily:   "inherit",
  fontWeight:   500,
  outline:      "none",
  boxSizing:    "border-box",
  transition:   "border-color 0.15s",
};

const labelStyle = {
  display:       "block",
  fontSize:      "11px",
  color:         "#666",
  fontWeight:    600,
  textTransform: "uppercase",
  letterSpacing: "0.6px",
  marginBottom:  "5px",
};

export default function AddExpenseModal({ editingExpense, onSave, onClose }) {
  const [form, setForm] = useState(EMPTY_FORM);

  useEffect(() => {
    if (editingExpense) {
      setForm({
        title:    editingExpense.title    || "",
        amount:   editingExpense.amount   || "",
        category: editingExpense.category || "Food & Dining",
        date:     editingExpense.date     || new Date().toISOString().split("T")[0],
        tags:     Array.isArray(editingExpense.tags)
                    ? editingExpense.tags.join(", ")
                    : editingExpense.tags || "",
        notes:    editingExpense.notes    || "",
      });
    } else {
      setForm(EMPTY_FORM);
    }
  }, [editingExpense]);

  function update(field, value) {
    setForm(prev => ({ ...prev, [field]: value }));
  }

  // Find selected category for icon preview
  const selectedCat = CATEGORIES.find(c => c.name === form.category);

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal-box">
        <div className="modal-handle" />
        <div className="modal-title">
          {editingExpense ? "✏️ Edit Expense" : "➕ Add Expense"}
        </div>

        {/* Title */}
        <div className="form-group">
          <label style={labelStyle}>Title *</label>
          <input
            style={inputStyle}
            placeholder="e.g. Lunch at restaurant"
            value={form.title}
            onChange={e => update("title", e.target.value)}
          />
        </div>

        {/* Amount + Date */}
        <div className="form-grid-2">
          <div className="form-group">
            <label style={labelStyle}>Amount ($) *</label>
            <input
              style={inputStyle}
              type="number"
              inputMode="decimal"
              placeholder="0.00"
              value={form.amount}
              onChange={e => update("amount", e.target.value)}
            />
          </div>
          <div className="form-group">
            <label style={labelStyle}>Date *</label>
            <input
              style={inputStyle}
              type="date"
              value={form.date}
              onChange={e => update("date", e.target.value)}
            />
          </div>
        </div>

        {/* Category — scrollable dropdown with icon preview */}
        <div className="form-group">
          <label style={labelStyle}>Category *</label>
          <div style={{ display:"flex", alignItems:"center", gap:8 }}>

            {/* Icon preview */}
            <div style={{
              width:        42,
              height:       42,
              borderRadius: 8,
              background:   selectedCat ? `${selectedCat.color}15` : "#f6f8fa",
              border:       `1.5px solid ${selectedCat ? selectedCat.color : "#eaeaea"}`,
              display:      "flex",
              alignItems:   "center",
              justifyContent:"center",
              fontSize:     20,
              flexShrink:   0,
              transition:   "all 0.2s",
            }}>
              {selectedCat?.icon || "📦"}
            </div>

            {/* Dropdown */}
            <select
              style={{
                ...inputStyle,
                cursor:      "pointer",
                fontWeight:  600,
                color:       selectedCat?.color || "#0d0d0d",
              }}
              value={form.category}
              onChange={e => update("category", e.target.value)}
            >
              {CATEGORIES.map(c => (
                <option key={c.name} value={c.name}>
                  {c.icon} {c.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Tags */}
        <div className="form-group">
          <label style={labelStyle}>Tags (comma separated)</label>
          <input
            style={inputStyle}
            placeholder="e.g. work, lunch, client"
            value={form.tags}
            onChange={e => update("tags", e.target.value)}
          />
        </div>

        {/* Notes */}
        <div className="form-group">
          <label style={labelStyle}>Notes</label>
          <input
            style={inputStyle}
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
            style={{ flex:1 }}
          >
            {editingExpense ? "Update Expense" : "Add Expense"}
          </button>
          <button className="btn-secondary" onClick={onClose}>
            Cancel
          </button>
        </div>

      </div>
    </div>
  );
}