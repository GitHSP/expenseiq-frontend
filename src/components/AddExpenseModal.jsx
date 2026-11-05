import { useState, useEffect, useMemo } from "react";
import { CATEGORIES }          from "../constants/categories";
import Icon, { IconLabel } from "./Icon";
import AmountField, { startingEntry, toStored } from "./AmountField";

// Today in local time (toISOString would give tomorrow's date late in the evening).
const today = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};
const emptyForm = () => ({ title: "", amount: "", category: "Food & Dining", date: today(), tags: "", notes: "" });

// The places the user pays most often lately, for one-tap filling.
function recentPlaces(expenses) {
  const since = new Date(Date.now() - 90 * 864e5).toISOString().slice(0, 10);
  const seen = new Map();
  for (const e of expenses || []) {
    if (!e.title || String(e.date) < since) continue;
    const key = e.title.trim().toLowerCase();
    const hit = seen.get(key) || { title: e.title.trim(), category: e.category, count: 0, last: "" };
    hit.count += 1;
    if (String(e.date) >= hit.last) { hit.last = String(e.date); hit.category = e.category; }
    seen.set(key, hit);
  }
  return [...seen.values()].sort((a, b) => b.count - a.count || b.last.localeCompare(a.last)).slice(0, 8);
}

const inputStyle = {
  width:        "100%",
  background:   "var(--card)",
  border:       "1px solid var(--border)",
  borderRadius: "8px",
  padding:      "10px 12px",
  color:        "var(--text)",
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
  color:         "var(--muted2)",
  fontWeight:    600,
  textTransform: "uppercase",
  letterSpacing: "0.6px",
  marginBottom:  "5px",
};

export default function AddExpenseModal({ editingExpense, onSave, onClose, expenses = [], currency = "CAD", getRate = c => (c === "CAD" ? 1 : null) }) {
  const [form, setForm] = useState(emptyForm);
  const [moreOpen, setMoreOpen] = useState(false);
  const recent = useMemo(() => recentPlaces(expenses), [expenses]);
  const [entry, setEntry] = useState(() => startingEntry("", currency, getRate));

  useEffect(() => {
    setEntry(startingEntry(editingExpense ? editingExpense.amount : "", currency, getRate, editingExpense));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editingExpense]);

  useEffect(() => {
    if (editingExpense) {
      setForm({
        title:    editingExpense.title    || "",
        amount:   editingExpense.amount   || "",
        category: editingExpense.category || "Food & Dining",
        date:     editingExpense.date     || today(),
        tags:     Array.isArray(editingExpense.tags)
                    ? editingExpense.tags.join(", ")
                    : editingExpense.tags || "",
        notes:    editingExpense.notes    || "",
      });
    } else {
      setForm(emptyForm());
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
          <IconLabel name={editingExpense ? "pencil" : "plus"} size={18} gap={8}>
            {editingExpense ? "Edit Expense" : "Add Expense"}
          </IconLabel>
        </div>

        {/* Quick picks: tap a recent place to fill the title and category */}
        {!editingExpense && recent.length > 0 && (
          <div style={{ display:"flex", gap:6, overflowX:"auto", WebkitOverflowScrolling:"touch", scrollbarWidth:"none", margin:"0 0 14px", paddingBottom:2 }}>
            {recent.map(r => {
              const on = form.title === r.title;
              return (
                <button key={r.title} type="button" onClick={() => setForm(f => ({ ...f, title: r.title, category: r.category || f.category }))}
                  style={{ flex:"0 0 auto", minHeight:36, padding:"0 12px", borderRadius:18, fontSize:13, fontWeight:600, fontFamily:"inherit", cursor:"pointer",
                           maxWidth:180, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap",
                           background: on ? "var(--accent-bg)" : "var(--subtle)", color:"var(--text)",
                           border:`1px solid ${on ? "var(--accent)" : "var(--border)"}` }}>
                  {r.title}
                </button>
              );
            })}
          </div>
        )}

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
          <AmountField entry={entry} onChange={setEntry} getRate={getRate}
            labelStyle={labelStyle} inputStyle={inputStyle} />
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
              background:   selectedCat ? `${selectedCat.color}15` : "var(--bg)",
              border:       `1.5px solid ${selectedCat ? selectedCat.color : "var(--border)"}`,
              display:      "flex",
              alignItems:   "center",
              justifyContent:"center",
              color:        selectedCat?.color || "var(--muted)",
              flexShrink:   0,
              transition:   "all 0.2s",
            }}>
              <Icon name={selectedCat?.icon || "package"} size={20} />
            </div>

            {/* Dropdown */}
            <select
              style={{
                ...inputStyle,
                cursor:      "pointer",
                fontWeight:  600,
                color:       selectedCat?.color || "var(--text)",
              }}
              value={form.category}
              onChange={e => update("category", e.target.value)}
            >
              {CATEGORIES.map(c => (
                <option key={c.name} value={c.name}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Tags and notes: tucked away for a quick add */}
        {!editingExpense && !moreOpen && !form.tags && !form.notes && (
          <button type="button" className="btn-ghost" onClick={() => setMoreOpen(true)}
            style={{ padding:"4px 0", marginBottom:12, display:"inline-flex", alignItems:"center", gap:4, fontSize:13 }}>
            <Icon name="plus" size={13} /> Tags or a note
          </button>
        )}
        {(editingExpense || moreOpen || form.tags || form.notes) && <>
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
        </>}

        {/* Buttons */}
        <div className="modal-footer">
          <button
            className="btn-primary"
            onClick={() => onSave({ ...form, ...toStored(entry, form.notes, getRate) })}
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