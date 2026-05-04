import { useState } from "react";
import { CATEGORIES } from "../constants/categories";

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
  item, debt, onConfirm, onCancel
}) {
  const [addAsExpense,     setAddAsExpense]     = useState(false);
  const [expenseCategory,  setExpenseCategory]  = useState(
    CATEGORY_MAP[item?.category] || "Bills & Utilities"
  );

  if (!item) return null;

  const isDebtPayment = ["debt_min", "debt_extra"].includes(item.category);
  const isSavings     = item.category === "savings";
  const amount        = parseFloat(item.amount) || 0;

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
            color:         "#0d0d0d",
            letterSpacing: "-0.4px",
            marginBottom:  4,
          }}>
            ✅ Mark as Complete?
          </div>
          <div style={{ fontSize:13, color:"#888" }}>
            {item.label}
          </div>
        </div>

        {/* Amount */}
        {amount > 0 && (
          <div style={{
            background:    "#f6f8fa",
            borderRadius:  10,
            padding:       "14px 16px",
            marginBottom:  16,
            display:       "flex",
            justifyContent:"space-between",
            alignItems:    "center",
            border:        "1px solid #eaeaea",
          }}>
            <span style={{ fontSize:13, color:"#888", fontWeight:500 }}>
              Amount
            </span>
            <span style={{ fontSize:18, fontWeight:800, color:"#0d0d0d", letterSpacing:"-0.5px" }}>
              ${amount.toFixed(2)}
            </span>
          </div>
        )}

        {/* Debt balance reduction info */}
        {isDebtPayment && debt && (
          <div style={{
            background:   "#fff1f2",
            border:       "1px solid #fecdd3",
            borderRadius: 8,
            padding:      "10px 14px",
            marginBottom: 16,
            fontSize:     12,
            color:        "#e11d48",
            fontWeight:   500,
          }}>
            💳 This will reduce <strong>{debt.name}</strong> balance by{" "}
            <strong>${amount.toFixed(2)}</strong>
            {" "}→ New balance:{" "}
            <strong>
              ${Math.max(0, parseFloat(debt.current_balance) - amount).toFixed(2)}
            </strong>
          </div>
        )}

        {/* Savings info */}
        {isSavings && (
          <div style={{
            background:   "#f0fdf4",
            border:       "1px solid #bbf7d0",
            borderRadius: 8,
            padding:      "10px 14px",
            marginBottom: 16,
            fontSize:     12,
            color:        "#059669",
            fontWeight:   500,
          }}>
            🛡️ This will add <strong>${amount.toFixed(2)}</strong> to your Emergency Fund
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
                background:   addAsExpense ? "#f0f7ff" : "#fafafa",
                border:       `1.5px solid ${addAsExpense ? "#0070f3" : "#eaeaea"}`,
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
                border:        `2px solid ${addAsExpense ? "#0070f3" : "#ccc"}`,
                background:    addAsExpense ? "#0070f3" : "#fff",
                display:       "flex",
                alignItems:    "center",
                justifyContent:"center",
                flexShrink:    0,
                transition:    "all 0.15s",
              }}>
                {addAsExpense && (
                  <span style={{ color:"#fff", fontSize:12, fontWeight:800 }}>✓</span>
                )}
              </div>
              <div>
                <div style={{
                  fontWeight: 600,
                  fontSize:   13,
                  color:      addAsExpense ? "#0070f3" : "#0d0d0d",
                }}>
                  Also add as an expense
                </div>
                <div style={{ fontSize:11, color:"#888", marginTop:1 }}>
                  Records this payment in your expenses
                </div>
              </div>
            </div>

            {/* Category selector — shows when checkbox ticked */}
            {addAsExpense && (
              <div>
                <label style={{
                  fontSize:      11,
                  color:         "#666",
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
                    background:   "#ffffff",
                    border:       "1px solid #eaeaea",
                    borderRadius: 8,
                    padding:      "10px 12px",
                    color:        "#0d0d0d",
                    fontSize:     13,
                    fontFamily:   "inherit",
                    fontWeight:   500,
                    outline:      "none",
                  }}
                >
                  {CATEGORIES.map(c => (
                    <option key={c.name} value={c.name}>
                      {c.icon} {c.name}
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
            onClick={() => onConfirm({ addAsExpense, expenseCategory })}
            style={{
              flex:         1,
              background:   "#059669",
              color:        "#fff",
              border:       "none",
              padding:      "12px",
              borderRadius: 8,
              fontWeight:   700,
              fontSize:     14,
              cursor:       "pointer",
              fontFamily:   "inherit",
            }}
          >
            ✅ Confirm
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