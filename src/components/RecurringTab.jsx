import { useState } from "react";
import Icon, { IconLabel } from "./Icon";

// Payments and income that repeat every month. Each month's checklist is
// built from this list plus the user's debts (the backend handles that), so
// this tab is where permanent changes — a rent increase, a new bill — go.

export const RECURRING_CATEGORIES = {
  fixed_expense: { label: "Fixed Expense", icon: "house",       color: "#0070f3" },
  auto_debit:    { label: "Auto Debit",    icon: "warning",     color: "#d97706" },
  transfer:      { label: "Transfer",      icon: "exchange",    color: "#7c3aed" },
  temp_payment:  { label: "Temporary",     icon: "timer",       color: "#0891b2" },
  income:        { label: "Income",        icon: "banknote",    color: "#059669" },
};

const EMPTY_FORM = {
  label: "", amount: "", due_day: "", category: "fixed_expense",
  is_auto_debit: false, notes: "",
};

const inputStyle = {
  width: "100%", background: "var(--card)", border: "1px solid var(--border)",
  borderRadius: 8, padding: "10px 12px", color: "var(--text)", fontSize: 13,
  fontFamily: "inherit", fontWeight: 500, outline: "none", boxSizing: "border-box",
};

const labelStyle = {
  display: "block", fontSize: 11, color: "var(--muted2)", fontWeight: 600,
  textTransform: "uppercase", letterSpacing: "0.6px", marginBottom: 5,
};

const iconBtn = {
  background: "transparent", border: "1px solid var(--border)", borderRadius: 6,
  padding: "5px 7px", cursor: "pointer", color: "var(--muted)",
  display: "inline-flex", alignItems: "center",
};

function ordinal(n) {
  const s = ["th", "st", "nd", "rd"], v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

export default function RecurringTab({
  recurring, debts, emergencyFund,
  addRecurring, updateRecurring, deleteRecurring,
  fmt, showMsg,
}) {
  const [form,      setForm]      = useState(EMPTY_FORM);
  const [editingId, setEditingId] = useState(null);
  const [showForm,  setShowForm]  = useState(false);
  const [saving,    setSaving]    = useState(false);

  const num = v => parseFloat(v) || 0;
  const active  = recurring.filter(r => r.is_active);
  const income  = active.filter(r => r.category === "income").reduce((s, r) => s + num(r.amount), 0);
  const outgoing= active.filter(r => r.category !== "income").reduce((s, r) => s + num(r.amount), 0);

  const activeDebts = debts.filter(d => d.is_active && num(d.current_balance) > 0);
  const debtPayments= activeDebts.reduce((s, d) => s + Math.min(num(d.minimum_payment), num(d.current_balance)), 0);
  const savings     = emergencyFund && !emergencyFund.is_funded ? num(emergencyFund.monthly_contribution) : 0;
  const leftOver    = income - outgoing - debtPayments - savings;
  const target      = [...activeDebts]
    .filter(d => num(d.annual_interest_rate) > 0)
    .sort((a, b) => a.avalanche_order - b.avalanche_order)[0];

  function openAdd(category = "fixed_expense") {
    setForm({ ...EMPTY_FORM, category });
    setEditingId(null);
    setShowForm(true);
  }

  function openEdit(item) {
    setForm({
      label:         item.label,
      amount:        item.amount,
      due_day:       item.due_day ?? "",
      category:      item.category,
      is_auto_debit: item.is_auto_debit,
      notes:         item.notes || "",
    });
    setEditingId(item.id);
    setShowForm(true);
  }

  async function handleSave() {
    if (!form.label.trim() || !form.amount || isNaN(num(form.amount))) {
      showMsg("Please enter a name and amount"); return;
    }
    const data = {
      label:         form.label.trim(),
      amount:        num(form.amount).toFixed(2),
      due_day:       form.due_day === "" ? null : parseInt(form.due_day, 10),
      category:      form.category,
      is_auto_debit: form.category === "auto_debit" || form.is_auto_debit,
      notes:         form.notes,
    };
    setSaving(true);
    try {
      if (editingId) {
        await updateRecurring(editingId, data);
        showMsg("Updated — this month's checklist is synced");
      } else {
        await addRecurring(data);
        showMsg("Added — it'll appear every month");
      }
      setShowForm(false);
    } catch (err) {
      showMsg(err.message || "Failed to save");
    } finally {
      setSaving(false);
    }
  }

  async function handleTogglePause(item) {
    try {
      await updateRecurring(item.id, { is_active: !item.is_active });
      showMsg(item.is_active ? `Paused ${item.label}` : `Resumed ${item.label}`);
    } catch (err) {
      showMsg(err.message || "Failed to update");
    }
  }

  async function handleDelete(item) {
    if (!window.confirm(`Delete "${item.label}" permanently?\n\nIt will stop appearing in future months. To skip it temporarily, pause it instead.`)) return;
    try {
      await deleteRecurring(item.id);
      showMsg(`Deleted ${item.label}`);
    } catch (err) {
      showMsg(err.message || "Failed to delete");
    }
  }

  const byDueDay = (a, b) => (a.due_day ?? 99) - (b.due_day ?? 99) || a.label.localeCompare(b.label);
  const groups = [
    { title: "Income",   items: recurring.filter(r => r.category === "income").sort(byDueDay) },
    { title: "Payments", items: recurring.filter(r => r.category !== "income").sort(byDueDay) },
  ];

  const summary = [
    { label: "Monthly Income",     value: fmt(income),       sub: `${active.filter(r => r.category === "income").length} sources`, color: "#059669" },
    { label: "Recurring Payments", value: fmt(outgoing),     sub: `${active.filter(r => r.category !== "income").length} payments`, color: "#0070f3" },
    { label: "Debt Payments",      value: fmt(debtPayments), sub: `${activeDebts.length} debts${savings ? ` + ${fmt(savings)} savings` : ""}`, color: "#e11d48" },
    {
      label: "Left Over",
      value: fmt(leftOver),
      sub:   leftOver > 0 && target ? `Extra to ${target.name}` : leftOver < 0 ? "Payments exceed income" : "Nothing left over",
      color: leftOver >= 0 ? "#7c3aed" : "#e11d48",
    },
  ];

  return (
    <>
      {/* ── Monthly totals ── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 10, marginBottom: 16 }}>
        {summary.map(s => (
          <div key={s.label} className="card" style={{ padding: "14px 16px", marginBottom: 0 }}>
            <div style={{ fontSize: 10, color: "var(--muted)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 6 }}>{s.label}</div>
            <div style={{ fontWeight: 800, fontSize: 18, color: s.color, letterSpacing: "-0.5px" }}>{s.value}</div>
            <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 2 }}>{s.sub}</div>
          </div>
        ))}
      </div>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16, flexWrap: "wrap", gap: 8 }}>
        <div style={{ fontSize: 13, color: "var(--muted)" }}>
          These repeat every month and build each month's checklist.
        </div>
        <button className="btn-primary" onClick={() => openAdd()} style={{ padding: "9px 20px", fontSize: 13, display: "inline-flex", alignItems: "center", gap: 6 }}>
          <Icon name="plus" size={14} /> Add Recurring
        </button>
      </div>

      {/* ── Add / edit form ── */}
      {showForm && (
        <div className="card" style={{ marginBottom: 16, border: "1.5px solid #0070f3" }}>
          <div className="card-title" style={{ marginBottom: 14 }}>
            {editingId ? "Edit Recurring Item" : "New Recurring Item"}
          </div>
          <div className="form-grid-2">
            <div className="form-group">
              <label style={labelStyle}>Name *</label>
              <input style={inputStyle} placeholder="e.g. Rent" value={form.label}
                onChange={e => setForm(p => ({ ...p, label: e.target.value }))} />
            </div>
            <div className="form-group">
              <label style={labelStyle}>Amount per month *</label>
              <input style={inputStyle} type="number" inputMode="decimal" placeholder="0.00" value={form.amount}
                onChange={e => setForm(p => ({ ...p, amount: e.target.value }))} />
            </div>
            <div className="form-group">
              <label style={labelStyle}>Type</label>
              <select style={inputStyle} value={form.category}
                onChange={e => setForm(p => ({ ...p, category: e.target.value }))}>
                {Object.entries(RECURRING_CATEGORIES).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label style={labelStyle}>Due day (1–31)</label>
              <input style={inputStyle} type="number" min={1} max={31} placeholder="Optional" value={form.due_day}
                onChange={e => setForm(p => ({ ...p, due_day: e.target.value }))} />
            </div>
          </div>
          <div className="form-group">
            <label style={labelStyle}>Notes</label>
            <input style={inputStyle} placeholder="e.g. Pay by 26th to be safe" value={form.notes}
              onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} />
          </div>
          {form.category !== "auto_debit" && form.category !== "income" && (
            <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, marginBottom: 12, cursor: "pointer" }}>
              <input type="checkbox" checked={form.is_auto_debit}
                onChange={e => setForm(p => ({ ...p, is_auto_debit: e.target.checked }))} />
              Withdrawn automatically (auto debit)
            </label>
          )}
          <div style={{ display: "flex", gap: 8 }}>
            <button className="btn-primary" onClick={handleSave} disabled={saving} style={{ flex: 1 }}>
              {saving ? "Saving..." : editingId ? "Save Changes" : "Add"}
            </button>
            <button className="btn-secondary" onClick={() => setShowForm(false)}>Cancel</button>
          </div>
        </div>
      )}

      {/* ── Lists ── */}
      {recurring.length === 0 && !showForm ? (
        <div className="empty-state">
          <div className="empty-icon"><Icon name="refresh" size={40} strokeWidth={1.5} /></div>
          <div style={{ fontWeight: 600, color: "var(--faint)", fontSize: 15, marginBottom: 6 }}>No recurring payments yet</div>
          <div style={{ fontSize: 13, color: "var(--faint)" }}>Add rent, bills and income once — they'll show up every month.</div>
        </div>
      ) : groups.map(group => group.items.length > 0 && (
        <div key={group.title} className="card" style={{ padding: 0, overflow: "hidden", marginBottom: 14 }}>
          <div style={{ padding: "12px 18px", borderBottom: "1px solid var(--subtle2)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div style={{ fontWeight: 700, fontSize: 13, color: "var(--text)" }}>{group.title}</div>
            <div style={{ fontWeight: 700, fontSize: 13, color: group.title === "Income" ? "#059669" : "var(--text)" }}>
              {fmt(group.items.filter(r => r.is_active).reduce((s, r) => s + num(r.amount), 0))}/mo
            </div>
          </div>
          {group.items.map((item, idx) => {
            const cat = RECURRING_CATEGORIES[item.category] || RECURRING_CATEGORIES.fixed_expense;
            return (
              <div key={item.id} style={{
                display: "flex", alignItems: "center", gap: 12, padding: "12px 18px",
                borderBottom: idx < group.items.length - 1 ? "1px solid var(--subtle2)" : "none",
                opacity: item.is_active ? 1 : 0.5,
              }}>
                <span style={{
                  width: 32, height: 32, borderRadius: 10, background: `${cat.color}1a`, color: cat.color,
                  display: "inline-flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
                }}>
                  <Icon name={cat.icon} size={16} />
                </span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 600, fontSize: 13, color: "var(--text)", display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                    {item.label}
                    {item.is_auto_debit && item.category !== "auto_debit" && (
                      <IconLabel name="warning" size={10} gap={3} color="#d97706" style={{ fontSize: 10, color: "#d97706", fontWeight: 700 }}>AUTO</IconLabel>
                    )}
                    {!item.is_active && (
                      <span style={{ fontSize: 10, fontWeight: 700, color: "var(--muted)", background: "var(--bg)", border: "1px solid var(--border)", borderRadius: 4, padding: "0 5px" }}>PAUSED</span>
                    )}
                  </div>
                  <div style={{ fontSize: 11, color: "var(--faint2)", marginTop: 2 }}>
                    {cat.label}
                    {item.due_day ? ` · ${item.category === "income" ? "Received" : "Due"} ${ordinal(item.due_day)}` : ""}
                    {item.notes ? ` · ${item.notes}` : ""}
                  </div>
                </div>
                <div style={{ fontWeight: 700, fontSize: 14, color: item.category === "income" ? "#059669" : "var(--text)", flexShrink: 0 }}>
                  {fmt(item.amount)}
                </div>
                <div style={{ display: "flex", gap: 4, flexShrink: 0 }}>
                  <button style={iconBtn} onClick={() => openEdit(item)} aria-label={`Edit ${item.label}`} title="Edit">
                    <Icon name="pencil" size={13} />
                  </button>
                  <button style={iconBtn} onClick={() => handleTogglePause(item)} aria-label={item.is_active ? `Pause ${item.label}` : `Resume ${item.label}`} title={item.is_active ? "Pause" : "Resume"}>
                    <Icon name={item.is_active ? "pause" : "play"} size={13} />
                  </button>
                  <button style={{ ...iconBtn, color: "#e11d48" }} onClick={() => handleDelete(item)} aria-label={`Delete ${item.label}`} title="Delete">
                    <Icon name="trash" size={13} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      ))}
    </>
  );
}
