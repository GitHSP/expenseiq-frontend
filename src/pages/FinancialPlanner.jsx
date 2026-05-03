import { useState }              from "react";
import { useFinancialPlanner }   from "../hooks/useFinancialPlanner";

// ── Design tokens ──
const C = {
  blue:    "#0070f3",
  green:   "#059669",
  red:     "#e11d48",
  amber:   "#f59e0b",
  purple:  "#7c3aed",
  text:    "#0d0d0d",
  muted:   "#888",
  border:  "#eaeaea",
  card:    "#ffffff",
  bg:      "#f6f8fa",
};

const DEBT_TYPE_LABELS = {
  credit_card:    "Credit Card",
  loan:           "Loan",
  line_of_credit: "Line of Credit",
  other:          "Other",
};

const CATEGORY_LABELS = {
  savings:       "💰 Savings",
  debt_min:      "💳 Debt Minimum",
  debt_extra:    "🎯 Extra Payment",
  fixed_expense: "🏠 Fixed Expense",
  temp_payment:  "⏱ Temp Payment",
  auto_debit:    "⚠️ Auto Debit",
  transfer:      "↔️ Transfer",
  income:        "💵 Income",
};

const inputStyle = {
  width:        "100%",
  background:   "#ffffff",
  border:       "1px solid #eaeaea",
  borderRadius: "8px",
  padding:      "10px 12px",
  color:        "#0d0d0d",
  fontSize:     "13px",
  fontFamily:   "inherit",
  fontWeight:   500,
  outline:      "none",
  boxSizing:    "border-box",
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

export default function FinancialPlanner({ formatAmount }) {
  const {
    debts, emergencyFund, currentPlan, checklist, loaded,
    addDebt, updateDebt, deleteDebt,
    updateEmergencyFund,
    addChecklistItem, toggleChecklistItem, deleteChecklistItem,
  } = useFinancialPlanner();

  const [activeTab,    setActiveTab]    = useState("debts");
  const [showDebtForm, setShowDebtForm] = useState(false);
  const [editingDebt,  setEditingDebt]  = useState(null);
  const [showItemForm, setShowItemForm] = useState(false);
  const [saving,       setSaving]       = useState(false);
  const [toast,        setToast]        = useState("");

  // ── Debt form state ──
  const [debtForm, setDebtForm] = useState({
    name:                "",
    debt_type:           "credit_card",
    current_balance:     "",
    annual_interest_rate:"",
    minimum_payment:     "",
    credit_limit:        "",
    due_day:             "",
    avalanche_order:     "",
    notes:               "",
  });

  // ── Checklist item form state ──
  const [itemForm, setItemForm] = useState({
    label:        "",
    amount:       "",
    category:     "debt_min",
    due_day:      "",
    is_auto_debit:false,
    sort_order:   0,
  });

  // ── Emergency fund form ──
  const [fundBalance, setFundBalance] = useState("");
  const [editingFund, setEditingFund] = useState(false);

  const fmt = v => formatAmount
    ? formatAmount(parseFloat(v) || 0)
    : `$${(parseFloat(v) || 0).toFixed(2)}`;

  function showMsg(msg) {
    setToast(msg);
    setTimeout(() => setToast(""), 3000);
  }

  // ── Debt handlers ──
  function openAddDebt() {
    setDebtForm({
      name:"", debt_type:"credit_card",
      current_balance:"", annual_interest_rate:"",
      minimum_payment:"", credit_limit:"",
      due_day:"", avalanche_order: debts.length + 1, notes:"",
    });
    setEditingDebt(null);
    setShowDebtForm(true);
  }

  function openEditDebt(debt) {
    setDebtForm({
      name:                debt.name,
      debt_type:           debt.debt_type,
      current_balance:     debt.current_balance,
      annual_interest_rate:debt.annual_interest_rate,
      minimum_payment:     debt.minimum_payment,
      credit_limit:        debt.credit_limit || "",
      due_day:             debt.due_day || "",
      avalanche_order:     debt.avalanche_order,
      notes:               debt.notes || "",
    });
    setEditingDebt(debt);
    setShowDebtForm(true);
  }

  async function handleSaveDebt() {
    if (!debtForm.name || !debtForm.current_balance) {
      showMsg("Please fill in name and balance"); return;
    }
    setSaving(true);
    try {
      const payload = {
        ...debtForm,
        current_balance:      parseFloat(debtForm.current_balance)      || 0,
        annual_interest_rate: parseFloat(debtForm.annual_interest_rate) || 0,
        minimum_payment:      parseFloat(debtForm.minimum_payment)      || 0,
        credit_limit:         debtForm.credit_limit ? parseFloat(debtForm.credit_limit) : null,
        due_day:              debtForm.due_day ? parseInt(debtForm.due_day) : null,
        avalanche_order:      parseInt(debtForm.avalanche_order) || 1,
      };
      if (editingDebt) {
        await updateDebt(editingDebt.id, payload);
        showMsg("Debt updated! ✅");
      } else {
        await addDebt(payload);
        showMsg("Debt added! ✅");
      }
      setShowDebtForm(false);
    } catch (err) {
      showMsg(err.message || "Failed to save debt");
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteDebt(id) {
    if (!window.confirm("Delete this debt?")) return;
    try {
      await deleteDebt(id);
      showMsg("Debt deleted");
    } catch (err) {
      showMsg(err.message || "Failed to delete");
    }
  }

  // ── Checklist handlers ──
  async function handleToggle(id) {
    try {
      await toggleChecklistItem(id);
    } catch (err) {
      showMsg(err.message || "Failed to update");
    }
  }

  async function handleAddItem() {
    if (!itemForm.label) { showMsg("Please enter a label"); return; }
    setSaving(true);
    try {
      await addChecklistItem({
        ...itemForm,
        amount:    itemForm.amount ? parseFloat(itemForm.amount) : null,
        due_day:   itemForm.due_day ? parseInt(itemForm.due_day) : null,
      });
      setItemForm({ label:"", amount:"", category:"debt_min", due_day:"", is_auto_debit:false, sort_order:0 });
      setShowItemForm(false);
      showMsg("Item added! ✅");
    } catch (err) {
      showMsg(err.message || "Failed to add item");
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteItem(id) {
    try {
      await deleteChecklistItem(id);
      showMsg("Item removed");
    } catch (err) {
      showMsg(err.message || "Failed to delete");
    }
  }

  // ── Emergency fund handler ──
  async function handleUpdateFund() {
    try {
      await updateEmergencyFund({ current_balance: parseFloat(fundBalance) || 0 });
      setEditingFund(false);
      showMsg("Emergency fund updated! ✅");
    } catch (err) {
      showMsg(err.message || "Failed to update");
    }
  }

  // ── Computed values ──
  const totalDebt     = debts.filter(d => d.is_active).reduce((s, d) => s + (parseFloat(d.current_balance) || 0), 0);
  const totalMinimums = debts.filter(d => d.is_active).reduce((s, d) => s + (parseFloat(d.minimum_payment) || 0), 0);
  const completedItems = checklist.filter(i => i.is_completed).length;

  if (!loaded) {
    return (
      <div style={{ textAlign:"center", padding:"60px 20px", color:C.muted }}>
        Loading Financial Planner...
      </div>
    );
  }

  return (
    <>
      {/* ── Toast ── */}
      {toast && (
        <div style={{
          position:   "fixed",
          top:        20,
          left:       "50%",
          transform:  "translateX(-50%)",
          background: "#0d0d0d",
          color:      "#fff",
          padding:    "10px 20px",
          borderRadius:8,
          fontSize:   13,
          fontWeight: 600,
          zIndex:     999,
          fontFamily: "inherit",
        }}>
          {toast}
        </div>
      )}

      {/* ── Page header ── */}
      <div style={{ marginBottom:24 }}>
        <div className="page-title">Financial Planner</div>
        <div className="page-sub">
          Avalanche debt payoff · Monthly checklist · Emergency fund
        </div>
      </div>

      {/* ── Summary cards ── */}
      <div className="stat-grid" style={{ marginBottom:24 }}>
        {[
          {
            label:    "Total Debt",
            value:    fmt(totalDebt),
            sub:      `${debts.filter(d => d.is_active).length} active debts`,
            gradient: "linear-gradient(135deg, #e11d48, #be123c)",
          },
          {
            label:    "Monthly Minimums",
            value:    fmt(totalMinimums),
            sub:      "total minimum payments",
            gradient: "linear-gradient(135deg, #0070f3, #0050b3)",
          },
          {
            label:    "Emergency Fund",
            value:    emergencyFund ? fmt(emergencyFund.current_balance) : "$0",
            sub:      emergencyFund
              ? `${emergencyFund.progress_percent}% of $${emergencyFund.target_amount}`
              : "Not set up",
            gradient: emergencyFund?.is_funded
              ? "linear-gradient(135deg, #059669, #047857)"
              : "linear-gradient(135deg, #f59e0b, #d97706)",
          },
          {
            label:    "Checklist",
            value:    `${completedItems}/${checklist.length}`,
            sub:      "items completed this month",
            gradient: completedItems === checklist.length && checklist.length > 0
              ? "linear-gradient(135deg, #059669, #047857)"
              : "linear-gradient(135deg, #7c3aed, #6d28d9)",
          },
        ].map(card => (
          <div key={card.label} style={{
            background:   card.gradient,
            borderRadius: 12,
            padding:      20,
            color:        "#fff",
          }}>
            <div style={{ fontSize:10, fontWeight:600, textTransform:"uppercase", letterSpacing:"0.8px", opacity:0.75, marginBottom:8 }}>
              {card.label}
            </div>
            <div style={{ fontSize:22, fontWeight:800, letterSpacing:"-0.8px", lineHeight:1.1, marginBottom:6 }}>
              {card.value}
            </div>
            <div style={{ fontSize:11, opacity:0.65, fontWeight:500 }}>
              {card.sub}
            </div>
          </div>
        ))}
      </div>

      {/* ── Tabs ── */}
      <div style={{
        display:      "flex",
        gap:          4,
        marginBottom: 20,
        background:   C.card,
        border:       `1px solid ${C.border}`,
        borderRadius: 10,
        padding:      4,
        width:        "fit-content",
      }}>
        {[
          { id:"debts",     label:"💳 Debts"             },
          { id:"checklist", label:"☑️ Monthly Checklist" },
          { id:"fund",      label:"🛡️ Emergency Fund"    },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={{
              background:  activeTab === tab.id ? C.blue : "transparent",
              color:       activeTab === tab.id ? "#fff" : C.muted,
              border:      "none",
              padding:     "8px 18px",
              borderRadius:7,
              fontWeight:  600,
              fontSize:    13,
              fontFamily:  "inherit",
              cursor:      "pointer",
              transition:  "all 0.15s",
              whiteSpace:  "nowrap",
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* ════════════════════════════════════
          TAB 1 — DEBTS
      ════════════════════════════════════ */}
      {activeTab === "debts" && (
        <>
          <div style={{ display:"flex", justifyContent:"flex-end", marginBottom:16 }}>
            <button
              className="btn-primary"
              onClick={openAddDebt}
              style={{ padding:"9px 20px", fontSize:13 }}
            >
              + Add Debt
            </button>
          </div>

          {/* ── Add/Edit Debt Form ── */}
          {showDebtForm && (
            <div className="card" style={{ marginBottom:20, border:`1.5px solid ${C.blue}` }}>
              <div className="card-title" style={{ marginBottom:16 }}>
                {editingDebt ? "Edit Debt" : "Add New Debt"}
              </div>

              <div className="form-grid-2">
                <div className="form-group">
                  <label style={labelStyle}>Debt Name *</label>
                  <input
                    style={inputStyle}
                    placeholder="e.g. CIBC Visa"
                    value={debtForm.name}
                    onChange={e => setDebtForm(p => ({ ...p, name: e.target.value }))}
                  />
                </div>
                <div className="form-group">
                  <label style={labelStyle}>Type</label>
                  <select
                    style={inputStyle}
                    value={debtForm.debt_type}
                    onChange={e => setDebtForm(p => ({ ...p, debt_type: e.target.value }))}
                  >
                    <option value="credit_card">Credit Card</option>
                    <option value="loan">Loan</option>
                    <option value="line_of_credit">Line of Credit</option>
                    <option value="other">Other</option>
                  </select>
                </div>
                <div className="form-group">
                  <label style={labelStyle}>Current Balance ($) *</label>
                  <input
                    style={inputStyle}
                    type="number"
                    inputMode="decimal"
                    placeholder="0.00"
                    value={debtForm.current_balance}
                    onChange={e => setDebtForm(p => ({ ...p, current_balance: e.target.value }))}
                  />
                </div>
                <div className="form-group">
                  <label style={labelStyle}>Annual Interest Rate (%)</label>
                  <input
                    style={inputStyle}
                    type="number"
                    inputMode="decimal"
                    placeholder="e.g. 21.99"
                    value={debtForm.annual_interest_rate}
                    onChange={e => setDebtForm(p => ({ ...p, annual_interest_rate: e.target.value }))}
                  />
                </div>
                <div className="form-group">
                  <label style={labelStyle}>Minimum Payment ($)</label>
                  <input
                    style={inputStyle}
                    type="number"
                    inputMode="decimal"
                    placeholder="0.00"
                    value={debtForm.minimum_payment}
                    onChange={e => setDebtForm(p => ({ ...p, minimum_payment: e.target.value }))}
                  />
                </div>
                <div className="form-group">
                  <label style={labelStyle}>Credit Limit ($)</label>
                  <input
                    style={inputStyle}
                    type="number"
                    inputMode="decimal"
                    placeholder="Optional"
                    value={debtForm.credit_limit}
                    onChange={e => setDebtForm(p => ({ ...p, credit_limit: e.target.value }))}
                  />
                </div>
                <div className="form-group">
                  <label style={labelStyle}>Due Day (of month)</label>
                  <input
                    style={inputStyle}
                    type="number"
                    placeholder="e.g. 15"
                    value={debtForm.due_day}
                    onChange={e => setDebtForm(p => ({ ...p, due_day: e.target.value }))}
                  />
                </div>
                <div className="form-group">
                  <label style={labelStyle}>Avalanche Priority</label>
                  <input
                    style={inputStyle}
                    type="number"
                    placeholder="1 = highest priority"
                    value={debtForm.avalanche_order}
                    onChange={e => setDebtForm(p => ({ ...p, avalanche_order: e.target.value }))}
                  />
                </div>
              </div>

              <div className="form-group">
                <label style={labelStyle}>Notes</label>
                <input
                  style={inputStyle}
                  placeholder="Optional notes..."
                  value={debtForm.notes}
                  onChange={e => setDebtForm(p => ({ ...p, notes: e.target.value }))}
                />
              </div>

              <div style={{ display:"flex", gap:8 }}>
                <button
                  className="btn-primary"
                  onClick={handleSaveDebt}
                  disabled={saving}
                  style={{ flex:1, opacity: saving ? 0.7 : 1 }}
                >
                  {saving ? "Saving..." : editingDebt ? "Update Debt" : "Add Debt"}
                </button>
                <button
                  className="btn-secondary"
                  onClick={() => setShowDebtForm(false)}
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {/* ── Debt Cards ── */}
          {debts.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">💳</div>
              <div style={{ fontWeight:600, color:"#ccc", fontSize:15, marginBottom:6 }}>
                No debts added yet
              </div>
              <div style={{ fontSize:13, color:"#ccc" }}>
                Click "+ Add Debt" to start tracking
              </div>
            </div>
          ) : (
            debts.map((debt, i) => {
              const utilPct = debt.utilization_percent;
              const colors  = ["#e11d48","#f59e0b","#0070f3","#7c3aed","#059669","#0891b2"];
              const color   = colors[i % colors.length];

              return (
                <div key={debt.id} className="card" style={{
                  marginBottom: 14,
                  border:       debt.is_active ? `1px solid ${C.border}` : "1px dashed #eaeaea",
                  opacity:      debt.is_active ? 1 : 0.6,
                }}>
                  <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:14 }}>
                    <div style={{ display:"flex", alignItems:"center", gap:12 }}>
                      {/* Priority badge */}
                      <div style={{
                        width:         32,
                        height:        32,
                        borderRadius:  "50%",
                        background:    color,
                        color:         "#fff",
                        display:       "flex",
                        alignItems:    "center",
                        justifyContent:"center",
                        fontSize:      13,
                        fontWeight:    800,
                        flexShrink:    0,
                      }}>
                        {debt.avalanche_order}
                      </div>
                      <div>
                        <div style={{ fontWeight:800, fontSize:15, color:C.text, letterSpacing:"-0.3px" }}>
                          {debt.name}
                        </div>
                        <div style={{ fontSize:11, color:C.muted, marginTop:1 }}>
                          {DEBT_TYPE_LABELS[debt.debt_type]} · {debt.annual_interest_rate}% APR
                          {debt.due_day && ` · Due day ${debt.due_day}`}
                        </div>
                      </div>
                    </div>
                    <div style={{ display:"flex", gap:6 }}>
                      <button
                        onClick={() => openEditDebt(debt)}
                        className="btn-secondary"
                        style={{ padding:"6px 12px", fontSize:11 }}
                      >
                        ✏️ Edit
                      </button>
                      <button
                        onClick={() => handleDeleteDebt(debt.id)}
                        className="btn-danger"
                        style={{ padding:"6px 12px", fontSize:11 }}
                      >
                        🗑
                      </button>
                    </div>
                  </div>

                  {/* Debt stats */}
                  <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit, minmax(120px,1fr))", gap:10, marginBottom:14 }}>
                    {[
                      { label:"Balance",  value:fmt(debt.current_balance),  color:C.red    },
                      { label:"Min Pay",  value:fmt(debt.minimum_payment),  color:C.text   },
                      { label:"Monthly ⚡", value:fmt(debt.monthly_interest_amount), color:C.amber  },
                      debt.credit_limit
                        ? { label:"Limit", value:fmt(debt.credit_limit), color:C.muted }
                        : null,
                    ].filter(Boolean).map(stat => (
                      <div key={stat.label} style={{
                        background:   "#fafafa",
                        borderRadius: 8,
                        padding:      "10px 12px",
                        border:       "1px solid #f0f0f0",
                      }}>
                        <div style={{ fontSize:10, color:C.muted, fontWeight:600, textTransform:"uppercase", letterSpacing:"0.5px", marginBottom:3 }}>
                          {stat.label}
                        </div>
                        <div style={{ fontWeight:700, fontSize:14, color:stat.color, letterSpacing:"-0.3px" }}>
                          {stat.value}
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Utilization bar for credit cards */}
                  {utilPct !== null && (
                    <div>
                      <div style={{ display:"flex", justifyContent:"space-between", fontSize:12, marginBottom:5, fontWeight:500 }}>
                        <span style={{ color:C.muted }}>Credit Utilization</span>
                        <span style={{
                          fontWeight: 700,
                          color:      utilPct > 80 ? C.red : utilPct > 50 ? C.amber : C.green,
                        }}>
                          {utilPct}%
                        </span>
                      </div>
                      <div style={{ background:"#f0f0f0", borderRadius:100, height:6, overflow:"hidden" }}>
                        <div style={{
                          height:       "100%",
                          borderRadius: 100,
                          background:   utilPct > 80 ? C.red : utilPct > 50 ? C.amber : C.green,
                          width:        `${utilPct}%`,
                          transition:   "width 0.6s",
                        }} />
                      </div>
                    </div>
                  )}

                  {debt.notes && (
                    <div style={{ fontSize:11, color:C.muted, marginTop:10, fontStyle:"italic" }}>
                      {debt.notes}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </>
      )}

      {/* ════════════════════════════════════
          TAB 2 — MONTHLY CHECKLIST
      ════════════════════════════════════ */}
      {activeTab === "checklist" && (
        <>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:16 }}>
            <div style={{ fontSize:13, color:C.muted }}>
              {currentPlan
                ? `${currentPlan.year}-${String(currentPlan.month).padStart(2,"0")} · ${completedItems}/${checklist.length} done`
                : "Loading plan..."
              }
            </div>
            <button
              className="btn-primary"
              onClick={() => setShowItemForm(p => !p)}
              style={{ padding:"9px 18px", fontSize:13 }}
            >
              + Add Item
            </button>
          </div>

          {/* ── Add item form ── */}
          {showItemForm && (
            <div className="card" style={{ marginBottom:16, border:`1.5px solid ${C.blue}` }}>
              <div className="card-title" style={{ marginBottom:14 }}>New Checklist Item</div>
              <div className="form-grid-2">
                <div className="form-group">
                  <label style={labelStyle}>Label *</label>
                  <input
                    style={inputStyle}
                    placeholder="e.g. Pay CIBC minimum"
                    value={itemForm.label}
                    onChange={e => setItemForm(p => ({ ...p, label: e.target.value }))}
                  />
                </div>
                <div className="form-group">
                  <label style={labelStyle}>Amount ($)</label>
                  <input
                    style={inputStyle}
                    type="number"
                    inputMode="decimal"
                    placeholder="Optional"
                    value={itemForm.amount}
                    onChange={e => setItemForm(p => ({ ...p, amount: e.target.value }))}
                  />
                </div>
                <div className="form-group">
                  <label style={labelStyle}>Category</label>
                  <select
                    style={inputStyle}
                    value={itemForm.category}
                    onChange={e => setItemForm(p => ({ ...p, category: e.target.value }))}
                  >
                    {Object.entries(CATEGORY_LABELS).map(([k, v]) => (
                      <option key={k} value={k}>{v}</option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label style={labelStyle}>Due Day</label>
                  <input
                    style={inputStyle}
                    type="number"
                    placeholder="e.g. 15"
                    value={itemForm.due_day}
                    onChange={e => setItemForm(p => ({ ...p, due_day: e.target.value }))}
                  />
                </div>
              </div>

              {/* Auto debit toggle */}
              <div
                onClick={() => setItemForm(p => ({ ...p, is_auto_debit: !p.is_auto_debit }))}
                style={{
                  display:      "flex",
                  alignItems:   "center",
                  gap:          10,
                  padding:      "10px 12px",
                  background:   itemForm.is_auto_debit ? "#fffbeb" : "#fafafa",
                  border:       `1.5px solid ${itemForm.is_auto_debit ? C.amber : C.border}`,
                  borderRadius: 8,
                  cursor:       "pointer",
                  marginBottom: 12,
                  userSelect:   "none",
                }}
              >
                <div style={{
                  width:         18,
                  height:        18,
                  borderRadius:  4,
                  border:        `2px solid ${itemForm.is_auto_debit ? C.amber : "#ccc"}`,
                  background:    itemForm.is_auto_debit ? C.amber : "#fff",
                  display:       "flex",
                  alignItems:    "center",
                  justifyContent:"center",
                  flexShrink:    0,
                }}>
                  {itemForm.is_auto_debit && <span style={{ color:"#fff", fontSize:11, fontWeight:800 }}>✓</span>}
                </div>
                <div>
                  <div style={{ fontWeight:600, fontSize:13, color: itemForm.is_auto_debit ? C.amber : C.text }}>
                    ⚠️ Auto Debit
                  </div>
                  <div style={{ fontSize:11, color:C.muted }}>
                    Mark as automatic payment
                  </div>
                </div>
              </div>

              <div style={{ display:"flex", gap:8 }}>
                <button
                  className="btn-primary"
                  onClick={handleAddItem}
                  disabled={saving}
                  style={{ flex:1 }}
                >
                  {saving ? "Adding..." : "Add Item"}
                </button>
                <button className="btn-secondary" onClick={() => setShowItemForm(false)}>
                  Cancel
                </button>
              </div>
            </div>
          )}

          {/* ── Checklist items ── */}
          {checklist.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">☑️</div>
              <div style={{ fontWeight:600, color:"#ccc", fontSize:15, marginBottom:6 }}>
                No checklist items yet
              </div>
              <div style={{ fontSize:13, color:"#ccc" }}>
                Add items to track your monthly payments
              </div>
            </div>
          ) : (
            <div style={{
              background:   C.card,
              border:       `1px solid ${C.border}`,
              borderRadius: 12,
              overflow:     "hidden",
              boxShadow:    "0 1px 3px rgba(0,0,0,0.04)",
            }}>
              {/* Progress bar */}
              <div style={{ padding:"14px 18px", borderBottom:`1px solid ${C.border}` }}>
                <div style={{ display:"flex", justifyContent:"space-between", fontSize:12, marginBottom:6, fontWeight:600 }}>
                  <span style={{ color:C.muted }}>Progress</span>
                  <span style={{ color: completedItems === checklist.length ? C.green : C.blue }}>
                    {completedItems}/{checklist.length} complete
                  </span>
                </div>
                <div style={{ background:"#f0f0f0", borderRadius:100, height:6, overflow:"hidden" }}>
                  <div style={{
                    height:       "100%",
                    borderRadius: 100,
                    background:   completedItems === checklist.length ? C.green : C.blue,
                    width:        `${checklist.length > 0 ? (completedItems/checklist.length)*100 : 0}%`,
                    transition:   "width 0.6s",
                  }} />
                </div>
              </div>

              {/* Items grouped by category */}
              {Object.entries(CATEGORY_LABELS).map(([catKey, catLabel]) => {
                const items = checklist.filter(i => i.category === catKey);
                if (items.length === 0) return null;
                return (
                  <div key={catKey}>
                    <div style={{
                      padding:     "8px 18px",
                      background:  "#f6f8fa",
                      fontSize:    11,
                      fontWeight:  700,
                      color:       C.muted,
                      textTransform:"uppercase",
                      letterSpacing:"0.5px",
                      borderBottom:`1px solid ${C.border}`,
                    }}>
                      {catLabel}
                    </div>
                    {items.map((item, idx) => (
                      <div
                        key={item.id}
                        style={{
                          display:      "flex",
                          alignItems:   "center",
                          gap:          12,
                          padding:      "13px 18px",
                          borderBottom: idx < items.length - 1 ? `1px solid #f5f5f5` : "none",
                          background:   item.is_completed ? "#f0fdf4" : "#ffffff",
                          transition:   "background 0.15s",
                        }}
                      >
                        {/* Toggle checkbox */}
                        <div
                          onClick={() => handleToggle(item.id)}
                          style={{
                            width:         24,
                            height:        24,
                            borderRadius:  6,
                            border:        `2px solid ${item.is_completed ? C.green : "#ccc"}`,
                            background:    item.is_completed ? C.green : "#fff",
                            display:       "flex",
                            alignItems:    "center",
                            justifyContent:"center",
                            cursor:        "pointer",
                            flexShrink:    0,
                            transition:    "all 0.15s",
                          }}
                        >
                          {item.is_completed && (
                            <span style={{ color:"#fff", fontSize:13, fontWeight:800 }}>✓</span>
                          )}
                        </div>

                        {/* Label */}
                        <div style={{ flex:1, minWidth:0 }}>
                          <div style={{
                            fontWeight:      600,
                            fontSize:        13,
                            color:           item.is_completed ? C.muted : C.text,
                            textDecoration:  item.is_completed ? "line-through" : "none",
                            letterSpacing:   "-0.1px",
                          }}>
                            {item.is_auto_debit && "⚠️ "}{item.label}
                          </div>
                          {item.due_day && (
                            <div style={{ fontSize:11, color:C.muted, marginTop:1 }}>
                              Due: day {item.due_day}
                            </div>
                          )}
                        </div>

                        {/* Amount */}
                        {item.amount && (
                          <div style={{ fontWeight:700, fontSize:14, color:C.text, flexShrink:0 }}>
                            {fmt(item.amount)}
                          </div>
                        )}

                        {/* Delete */}
                        <button
                          onClick={() => handleDeleteItem(item.id)}
                          style={{
                            background:   "transparent",
                            border:       "none",
                            color:        "#ccc",
                            cursor:       "pointer",
                            fontSize:     14,
                            padding:      "2px 6px",
                            borderRadius: 4,
                            flexShrink:   0,
                          }}
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* ════════════════════════════════════
          TAB 3 — EMERGENCY FUND
      ════════════════════════════════════ */}
      {activeTab === "fund" && (
        <>
          {emergencyFund ? (
            <div className="card">
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:20 }}>
                <div className="card-title">🛡️ Emergency Fund</div>
                <button
                  className="btn-primary"
                  style={{ padding:"7px 16px", fontSize:12 }}
                  onClick={() => {
                    setFundBalance(emergencyFund.current_balance);
                    setEditingFund(true);
                  }}
                >
                  ✏️ Update Balance
                </button>
              </div>

              {/* Status banner */}
              <div style={{
                background:   emergencyFund.is_funded ? "#f0fdf4" : "#fffbeb",
                border:       `1px solid ${emergencyFund.is_funded ? "#bbf7d0" : "#fde68a"}`,
                borderRadius: 10,
                padding:      "14px 16px",
                marginBottom: 20,
                display:      "flex",
                gap:          12,
                alignItems:   "center",
              }}>
                <span style={{ fontSize:28 }}>
                  {emergencyFund.is_funded ? "🎉" : "🎯"}
                </span>
                <div>
                  <div style={{
                    fontWeight: 700,
                    fontSize:   14,
                    color:      emergencyFund.is_funded ? C.green : C.amber,
                    marginBottom:3,
                  }}>
                    {emergencyFund.is_funded
                      ? "Emergency fund fully funded!"
                      : `${fmt(parseFloat(emergencyFund.target_amount) - parseFloat(emergencyFund.current_balance))} to go`
                    }
                  </div>
                  <div style={{ fontSize:12, color:C.muted }}>
                    {emergencyFund.is_funded
                      ? "All extra income now goes to avalanche target"
                      : `Contributing ${fmt(emergencyFund.monthly_contribution)}/month`
                    }
                  </div>
                </div>
              </div>

              {/* Stats */}
              <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:12, marginBottom:20 }}>
                {[
                  { label:"Current",     value:fmt(emergencyFund.current_balance), color:C.green },
                  { label:"Target",      value:fmt(emergencyFund.target_amount),   color:C.text  },
                  { label:"Monthly",     value:fmt(emergencyFund.monthly_contribution), color:C.blue },
                ].map(s => (
                  <div key={s.label} style={{
                    background:   "#fafafa",
                    borderRadius: 10,
                    padding:      "14px",
                    border:       "1px solid #f0f0f0",
                    textAlign:    "center",
                  }}>
                    <div style={{ fontSize:10, color:C.muted, fontWeight:600, textTransform:"uppercase", letterSpacing:"0.5px", marginBottom:6 }}>
                      {s.label}
                    </div>
                    <div style={{ fontWeight:800, fontSize:18, color:s.color, letterSpacing:"-0.5px" }}>
                      {s.value}
                    </div>
                  </div>
                ))}
              </div>

              {/* Progress bar */}
              <div style={{ marginBottom:8 }}>
                <div style={{ display:"flex", justifyContent:"space-between", fontSize:12, marginBottom:6, fontWeight:600 }}>
                  <span style={{ color:C.muted }}>Progress</span>
                  <span style={{ color: emergencyFund.is_funded ? C.green : C.amber }}>
                    {emergencyFund.progress_percent}%
                  </span>
                </div>
                <div style={{ background:"#f0f0f0", borderRadius:100, height:12, overflow:"hidden" }}>
                  <div style={{
                    height:       "100%",
                    borderRadius: 100,
                    background:   emergencyFund.is_funded
                      ? C.green
                      : `linear-gradient(90deg, ${C.amber}, ${C.green})`,
                    width:        `${emergencyFund.progress_percent}%`,
                    transition:   "width 0.6s",
                  }} />
                </div>
              </div>

              {/* Edit balance form */}
              {editingFund && (
                <div style={{
                  background:   "#f6f8fa",
                  borderRadius: 10,
                  padding:      "14px",
                  border:       "1px solid #eaeaea",
                  marginTop:    16,
                }}>
                  <div style={{ fontWeight:700, fontSize:13, marginBottom:10 }}>
                    Update Balance
                  </div>
                  <div style={{ display:"flex", gap:8 }}>
                    <input
                      style={{ ...inputStyle, flex:1 }}
                      type="number"
                      inputMode="decimal"
                      placeholder="New balance..."
                      value={fundBalance}
                      onChange={e => setFundBalance(e.target.value)}
                    />
                    <button
                      className="btn-primary"
                      onClick={handleUpdateFund}
                      style={{ padding:"10px 20px" }}
                    >
                      Save
                    </button>
                    <button
                      className="btn-secondary"
                      onClick={() => setEditingFund(false)}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="empty-state">
              <div className="empty-icon">🛡️</div>
              <div style={{ fontWeight:600, color:"#ccc", fontSize:15 }}>
                Loading emergency fund...
              </div>
            </div>
          )}
        </>
      )}
    </>
  );
}