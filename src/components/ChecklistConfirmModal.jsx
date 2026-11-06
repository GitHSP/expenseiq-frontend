import { useState } from "react";
import { CATEGORIES } from "../constants/categories";
import Icon, { IconLabel, stripEmoji } from "./Icon";

// Maps checklist category to expense category
const CATEGORY_MAP = {
  debt_min:      "Bills & Utilities",
  debt_extra:    "Bills & Utilities",
  fixed_expense: "Bills & Utilities",
  temp_payment:  "Bills & Utilities",
  auto_debit:    "Bills & Utilities",
  transfer:      "Abroad Expense",
  savings:       "Other",
  income:        "Other",
};

export default function ChecklistConfirmModal({
  item, debt, onConfirm, onCancel, fmt = (v) => `$${(parseFloat(v) || 0).toFixed(2)}`, currency = "CAD",
}) {
  // A card or loan payment: the planned amount, or what was really paid (extra on a card).
  const [paidOther, setPaidOther] = useState(false);
  const [otherText, setOtherText] = useState("");
  const [addAsExpense,     setAddAsExpense]     = useState(false);
  const [expenseCategory,  setExpenseCategory]  = useState(
    CATEGORY_MAP[item?.category] || "Bills & Utilities"
  );

  if (!item) return null;

  const isDebtPayment = ["debt_min", "debt_extra"].includes(item.category);
  const isSavings     = item.category === "savings";
  const planned       = parseFloat(item.amount) || 0;
  const typed         = parseFloat(otherText);
  const other         = isDebtPayment && paidOther;          // typed in the app's currency
  const amount        = planned;
  const choice = on => ({
    flex: "1 1 140px", minHeight: 52, padding: "8px 12px", borderRadius: 10, textAlign: "left", cursor: "pointer",
    fontFamily: "inherit", color: "var(--text)", background: on ? "var(--accent-bg)" : "var(--subtle)",
    border: `1.5px solid ${on ? "var(--accent)" : "var(--border)"}`, touchAction: "manipulation",
  });

  return (
    <div className="modal-overlay" onClick={onCancel}>
      <div
        className="modal-box"
        onClick={e => e.stopPropagation()}
        style={{ maxWidth:420 }}
      >
        <div className="modal-handle" />

        {/* Header */}
        <div style={{ marginBottom:20 }}>
          <div style={{
            fontSize:      18,
            fontWeight:    800,
            color:         "var(--text)",
            letterSpacing: "-0.4px",
            marginBottom:  4,
          }}>
            <IconLabel name="check-circle" size={18} gap={8} color="#059669">Mark as Complete?</IconLabel>
          </div>
          <div style={{ fontSize:13, color:"var(--muted)" }}>
            {stripEmoji(item.label)}
          </div>
        </div>

        {/* Card or loan: minimum or another amount */}
        {isDebtPayment && (
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: "var(--muted)", marginBottom: 8 }}>How much did you pay?</div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <button type="button" style={choice(!paidOther)} onClick={() => setPaidOther(false)} aria-pressed={!paidOther}>
                <div style={{ fontSize: 12, color: "var(--muted)", fontWeight: 600 }}>{item.category === "debt_extra" ? "The planned amount" : "The minimum"}</div>
                <div style={{ fontSize: 16, fontWeight: 800 }}>{fmt(planned, item)}</div>
              </button>
              <button type="button" style={choice(paidOther)} onClick={() => setPaidOther(true)} aria-pressed={paidOther}>
                <div style={{ fontSize: 12, color: "var(--muted)", fontWeight: 600 }}>A different amount</div>
                <div style={{ fontSize: 16, fontWeight: 800 }}>{paidOther && typed > 0 ? `${typed}` : "Enter it"}</div>
              </button>
            </div>
            {paidOther && (
              <input type="number" min="0" step="0.01" inputMode="decimal" autoFocus value={otherText}
                onChange={e => setOtherText(e.target.value)} placeholder={`Amount paid (${currency})`} aria-label="Amount paid"
                style={{ width: "100%", marginTop: 10, background: "var(--card)", border: "1px solid var(--border)", borderRadius: 8,
                         padding: "11px 12px", color: "var(--text)", fontSize: 15, fontFamily: "inherit", boxSizing: "border-box" }} />
            )}
          </div>
        )}

        {/* Amount */}
        {amount > 0 && !isDebtPayment && (
          <div style={{
            background:    "var(--bg)",
            borderRadius:  10,
            padding:       "14px 16px",
            marginBottom:  16,
            display:       "flex",
            justifyContent:"space-between",
            alignItems:    "center",
            border:        "1px solid var(--border)",
          }}>
            <span style={{ fontSize:13, color:"var(--muted)", fontWeight:500 }}>
              Amount
            </span>
            <span style={{ fontSize:18, fontWeight:800, color:"var(--text)", letterSpacing:"-0.5px" }}>
              {fmt(amount, item)}
            </span>
          </div>
        )}

        {/* Debt balance reduction info */}
        {isDebtPayment && debt && (
          <div style={{
            background:   "var(--neg-bg)",
            border:       "1px solid var(--neg-border)",
            borderRadius: 8,
            padding:      "10px 14px",
            marginBottom: 16,
            fontSize:     12,
            color:        "var(--neg-text)",
            fontWeight:   500,
          }}>
            <Icon name="credit-card" size={13} style={{ marginRight:6, verticalAlign:"-2px" }} />This will lower <strong>{debt.name}</strong> by{" "}
            <strong>{other ? (typed > 0 ? `${typed} ${currency}` : "the amount you enter") : fmt(planned, item)}</strong>
            {!other && <>
              {" "}<Icon name="arrow-right" size={12} style={{ verticalAlign:"-2px" }} /> New balance:{" "}
              <strong>{fmt(Math.max(0, parseFloat(debt.current_balance) - planned))}</strong>
            </>}
          </div>
        )}

        {/* Savings info */}
        {isSavings && (
          <div style={{
            background:   "var(--pos-bg)",
            border:       "1px solid var(--pos-border)",
            borderRadius: 8,
            padding:      "10px 14px",
            marginBottom: 16,
            fontSize:     12,
            color:        "#059669",
            fontWeight:   500,
          }}>
            <Icon name="shield" size={13} style={{ marginRight:6, verticalAlign:"-2px" }} />This will add <strong>{fmt(amount, item)}</strong> to your Emergency Fund
          </div>
        )}

        {/* Add as expense checkbox */}
        {amount > 0 && (
          <div style={{ marginBottom:16 }}>
            <div
              onClick={() => setAddAsExpense(p => !p)}
              style={{
                display:      "flex",
                alignItems:   "center",
                gap:          10,
                padding:      "12px 14px",
                background:   addAsExpense ? "var(--accent-bg)" : "var(--subtle)",
                border:       `1.5px solid ${addAsExpense ? "var(--accent)" : "var(--border)"}`,
                borderRadius: 8,
                cursor:       "pointer",
                transition:   "all 0.15s",
                userSelect:   "none",
                marginBottom: addAsExpense ? 10 : 0,
              }}
            >
              {/* Checkbox */}
              <div style={{
                width:         20,
                height:        20,
                borderRadius:  5,
                border:        `2px solid ${addAsExpense ? "var(--accent)" : "var(--faint)"}`,
                background:    addAsExpense ? "var(--accent)" : "var(--card)",
                display:       "flex",
                alignItems:    "center",
                justifyContent:"center",
                flexShrink:    0,
                transition:    "all 0.15s",
              }}>
                {addAsExpense && (
                  <Icon name="check" size={13} strokeWidth={3} color="#fff" />
                )}
              </div>
              <div>
                <div style={{
                  fontWeight: 600,
                  fontSize:   13,
                  color:      addAsExpense ? "var(--accent-text)" : "var(--text)",
                }}>
                  Also add as an expense
                </div>
                <div style={{ fontSize:11, color:"var(--muted)", marginTop:1 }}>
                  Records this payment in your expenses
                </div>
              </div>
            </div>

            {/* Category selector — shows when checkbox ticked */}
            {addAsExpense && (
              <div>
                <label style={{
                  fontSize:      11,
                  color:         "var(--muted2)",
                  fontWeight:    600,
                  textTransform: "uppercase",
                  letterSpacing: "0.6px",
                  display:       "block",
                  marginBottom:  5,
                }}>
                  Expense Category
                </label>
                <select
                  value={expenseCategory}
                  onChange={e => setExpenseCategory(e.target.value)}
                  style={{
                    width:        "100%",
                    background:   "var(--card)",
                    border:       "1px solid var(--border)",
                    borderRadius: 8,
                    padding:      "10px 12px",
                    color:        "var(--text)",
                    fontSize:     13,
                    fontFamily:   "inherit",
                    fontWeight:   500,
                    outline:      "none",
                  }}
                >
                  {CATEGORIES.map(c => (
                    <option key={c.name} value={c.name}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>
        )}

        {/* Buttons */}
        <div style={{ display:"flex", gap:10 }}>
          <button
            disabled={other && !(typed > 0)}
            onClick={() => onConfirm({ addAsExpense, expenseCategory, paid: other ? typed : null })}
            style={{
              flex:         1,
              background:   "var(--accent)",
              color:        "var(--accent-ink)",
              opacity:      other && !(typed > 0) ? 0.5 : 1,
              border:       "none",
              padding:      "12px",
              borderRadius: 8,
              fontWeight:   700,
              fontSize:     14,
              cursor:       "pointer",
              fontFamily:   "inherit",
              display:      "inline-flex",
              alignItems:   "center",
              justifyContent:"center",
              gap:          6,
            }}
          >
            <Icon name="check" size={16} strokeWidth={2.5} /> Confirm
          </button>
          <button
            onClick={onCancel}
            className="btn-secondary"
            style={{ padding:"12px 20px" }}
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}