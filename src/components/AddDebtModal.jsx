import { useState, useEffect } from "react";
import { DEBT_TYPES } from "../hooks/useDebts";

const EMPTY_FORM = {
  name:            "",
  type:            "Credit Card",
  balance:         "",
  originalAmount:  "",
  interestRate:    "",
  monthlyPayment:  "",
  nextPaymentDate: "",
  limit:           "",
  lender:          "",
  notes:           "",
};

const inputStyle = {
  width:"100%", background:"#ffffff", border:"1.5px solid #e8eaf0",
  borderRadius:"12px", padding:"12px 14px", color:"#1a1a2e",
  fontSize:"14px", outline:"none", boxSizing:"border-box",
};

const labelStyle = {
  display:"block", fontSize:"11px", color:"#666", fontWeight:600,
  textTransform:"uppercase", letterSpacing:"0.5px", marginBottom:"5px",
};

export default function AddDebtModal({ editingDebt, onSave, onClose }) {
  const [form, setForm] = useState(EMPTY_FORM);

  useEffect(() => {
    if (editingDebt) {
      setForm({
        name:            editingDebt.name            || "",
        type:            editingDebt.type            || "Credit Card",
        balance:         editingDebt.balance         || "",
        originalAmount:  editingDebt.originalAmount  || "",
        interestRate:    editingDebt.interestRate    || "",
        monthlyPayment:  editingDebt.monthlyPayment  || "",
        nextPaymentDate: editingDebt.nextPaymentDate || "",
        limit:           editingDebt.limit           || "",
        lender:          editingDebt.lender          || "",
        notes:           editingDebt.notes           || "",
      });
    } else {
      setForm(EMPTY_FORM);
    }
  }, [editingDebt]);

  function update(field, value) {
    setForm(prev => ({ ...prev, [field]: value }));
  }

  const isCreditCard = form.type === "Credit Card";
  const isBNPL       = form.type === "Buy Now Pay Later";
  const isFriends    = form.type === "Friends & Family";

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal-box" style={{ maxWidth: 520 }}>
        <div className="modal-handle" />
        <div className="modal-title">
          {editingDebt ? "✏️ Edit Debt" : "➕ Add Debt"}
        </div>

        {/* Name */}
        <div className="form-group">
          <label style={labelStyle}>Name *</label>
          <input
            style={inputStyle}
            placeholder="e.g. Chase Sapphire Card"
            value={form.name}
            onChange={e => update("name", e.target.value)}
          />
        </div>

        {/* Type */}
        <div className="form-group">
          <label style={labelStyle}>Debt Type *</label>
         <select
            style={{ ...inputStyle, background:"#161616", color:"#e8e8e8" }}
            value={form.type}
            onChange={e => update("type", e.target.value)}
            >
            {DEBT_TYPES.map(t => (
                <option
                key={t.name}
                value={t.name}
                style={{ background:"#161616", color:"#e8e8e8" }}
                >
                {t.icon} {t.name}
                </option>
            ))}
            </select>
        </div>

        {/* Balance + Limit or Original Amount */}
        <div className="form-grid-2">
          <div className="form-group">
            <label style={labelStyle}>Current Balance ($) *</label>
            <input
              style={inputStyle}
              type="number"
              inputMode="decimal"
              placeholder="0.00"
              value={form.balance}
              onChange={e => update("balance", e.target.value)}
            />
          </div>
          {isCreditCard && (
            <div className="form-group">
              <label style={labelStyle}>Credit Limit ($)</label>
              <input
                style={inputStyle}
                type="number"
                inputMode="decimal"
                placeholder="0.00"
                value={form.limit}
                onChange={e => update("limit", e.target.value)}
              />
            </div>
          )}
          {!isCreditCard && !isFriends && (
            <div className="form-group">
              <label style={labelStyle}>Original Amount ($)</label>
              <input
                style={inputStyle}
                type="number"
                inputMode="decimal"
                placeholder="0.00"
                value={form.originalAmount}
                onChange={e => update("originalAmount", e.target.value)}
              />
            </div>
          )}
        </div>

        {/* Interest + Monthly Payment */}
        {!isFriends && (
          <div className="form-grid-2">
            {!isBNPL && (
              <div className="form-group">
                <label style={labelStyle}>Interest Rate (%)</label>
                <input
                  style={inputStyle}
                  type="number"
                  inputMode="decimal"
                  placeholder="e.g. 19.99"
                  value={form.interestRate}
                  onChange={e => update("interestRate", e.target.value)}
                />
              </div>
            )}
            <div className="form-group">
              <label style={labelStyle}>Monthly Payment ($)</label>
              <input
                style={inputStyle}
                type="number"
                inputMode="decimal"
                placeholder="0.00"
                value={form.monthlyPayment}
                onChange={e => update("monthlyPayment", e.target.value)}
              />
            </div>
          </div>
        )}

        {/* Next Payment Date + Lender */}
        <div className="form-grid-2">
          <div className="form-group">
            <label style={labelStyle}>Next Payment Date</label>
            <input
              style={inputStyle}
              type="date"
              value={form.nextPaymentDate}
              onChange={e => update("nextPaymentDate", e.target.value)}
            />
          </div>
          <div className="form-group">
            <label style={labelStyle}>
              {isFriends ? "Person Name" : "Lender / Bank"}
            </label>
            <input
              style={inputStyle}
              placeholder={isFriends ? "e.g. John Smith" : "e.g. Barclays"}
              value={form.lender}
              onChange={e => update("lender", e.target.value)}
            />
          </div>
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
            style={{ flex: 1 }}
          >
            {editingDebt ? "Update Debt" : "Add Debt"}
          </button>
          <button className="btn-secondary" onClick={onClose}>
            Cancel
          </button>
        </div>

      </div>
    </div>
  );
}