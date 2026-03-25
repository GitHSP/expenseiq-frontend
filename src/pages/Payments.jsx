import { useState } from "react";
import DebtCard       from "../components/DebtCard";
import { DEBT_TYPES } from "../hooks/useDebts";

export default function Payments({
  debts, paymentHistory,
  onAdd, onEdit, onDelete,
  onMarkPaidOff, onRecordPayment,
  isDueSoon, isOverdue, daysUntilDue,
  formatAmount,
}) {
  const [filterType,  setFilterType]  = useState("All");
  const [showHistory, setShowHistory] = useState(false);
  const [showPaidOff, setShowPaidOff] = useState(false);

  const activeDebts  = debts.filter(d => !d.isPaidOff);
  const paidOffDebts = debts.filter(d =>  d.isPaidOff);
  const overdueDebts = activeDebts.filter(d => isOverdue(d.nextPaymentDate));
  const dueSoonDebts = activeDebts.filter(d => isDueSoon(d.nextPaymentDate) && !isOverdue(d.nextPaymentDate));
  const totalDebt    = activeDebts.reduce((s, d) => s + d.balance, 0);
  const totalMonthly = activeDebts.reduce((s, d) => s + (d.monthlyPayment || 0), 0);

  const filteredDebts = activeDebts.filter(d =>
    filterType === "All" || d.type === filterType
  );

  const fmt = v => formatAmount ? formatAmount(v) : `$${parseFloat(v).toFixed(2)}`;

  return (
    <>
      <div style={{ marginBottom:28 }}>
        <div className="page-title">Payments & Debt</div>
        <div className="page-sub">Track your debts, loans and payment reminders</div>
      </div>

      {/* ── Overdue alert ── */}
      {overdueDebts.length > 0 && (
        <div style={{
          background:   "#fff1f2",
          border:       "1px solid #fecdd3",
          borderRadius: 12,
          padding:      "14px 18px",
          marginBottom: 16,
          display:      "flex",
          alignItems:   "center",
          gap:          12,
        }}>
          <span style={{ fontSize:22 }}>⚠️</span>
          <div>
            <div style={{ fontWeight:700, color:"#e11d48", fontSize:14 }}>
              {overdueDebts.length} payment{overdueDebts.length > 1 ? "s" : ""} overdue!
            </div>
            <div style={{ fontSize:12, color:"#888", marginTop:2 }}>
              {overdueDebts.map(d => d.name).join(", ")}
            </div>
          </div>
        </div>
      )}

      {/* ── Due soon alert ── */}
      {dueSoonDebts.length > 0 && (
        <div style={{
          background:   "#fffbeb",
          border:       "1px solid #fde68a",
          borderRadius: 12,
          padding:      "14px 18px",
          marginBottom: 16,
          display:      "flex",
          alignItems:   "center",
          gap:          12,
        }}>
          <span style={{ fontSize:22 }}>🔔</span>
          <div>
            <div style={{ fontWeight:700, color:"#d97706", fontSize:14 }}>
              {dueSoonDebts.length} payment{dueSoonDebts.length > 1 ? "s" : ""} due within 7 days
            </div>
            <div style={{ fontSize:12, color:"#888", marginTop:2 }}>
              {dueSoonDebts.map(d => `${d.name} (${daysUntilDue(d.nextPaymentDate)} days)`).join(", ")}
            </div>
          </div>
        </div>
      )}

      {/* ── Stat cards ── */}
      <div className="stat-grid" style={{ marginBottom:24 }}>
        {[
          {
            label:    "Total Debt",
            value:    fmt(totalDebt),
            sub:      `${activeDebts.length} active debts`,
            gradient: "linear-gradient(135deg, #e11d48, #be123c)",
          },
          {
            label:    "Monthly Payments",
            value:    fmt(totalMonthly),
            sub:      "total due per month",
            gradient: "linear-gradient(135deg, #0070f3, #0050b3)",
          },
          {
            label:    "Overdue",
            value:    overdueDebts.length,
            sub:      "payments overdue",
            gradient: overdueDebts.length > 0
              ? "linear-gradient(135deg, #e11d48, #be123c)"
              : "linear-gradient(135deg, #059669, #047857)",
          },
          {
            label:    "Paid Off",
            value:    paidOffDebts.length,
            sub:      "debts cleared 🎉",
            gradient: "linear-gradient(135deg, #059669, #047857)",
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

      {/* ── Debt type breakdown ── */}
      <div className="card" style={{ marginBottom:20 }}>
        <div className="card-title" style={{ marginBottom:14 }}>Debt by Type</div>
        <div style={{ display:"flex", gap:10, flexWrap:"wrap" }}>
          {DEBT_TYPES.map(type => {
            const typeDebts = activeDebts.filter(d => d.type === type.name);
            if (typeDebts.length === 0) return null;
            const total = typeDebts.reduce((s, d) => s + d.balance, 0);
            return (
              <div
                key={type.name}
                onClick={() => setFilterType(f => f === type.name ? "All" : type.name)}
                style={{
                  display:      "flex",
                  alignItems:   "center",
                  gap:          8,
                  background:   filterType === type.name ? "#f0f7ff" : "#fafafa",
                  borderRadius: 10,
                  padding:      "10px 14px",
                  border:       filterType === type.name
                    ? "1.5px solid #0070f3"
                    : "1px solid #eaeaea",
                  cursor:    "pointer",
                  transition:"all 0.15s",
                }}
              >
                <span style={{ fontSize:18 }}>{type.icon}</span>
                <div>
                  <div style={{ fontSize:11, color:"#888", fontWeight:500 }}>{type.name}</div>
                  <div style={{ fontWeight:700, fontSize:13, color:"#0d0d0d", letterSpacing:"-0.2px" }}>
                    {fmt(total)}
                  </div>
                </div>
              </div>
            );
          })}
          {activeDebts.length === 0 && (
            <div style={{ color:"#ccc", fontSize:13 }}>No active debts</div>
          )}
        </div>
      </div>

      {/* ── Debt list header ── */}
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:14 }}>
        <div style={{ fontWeight:700, fontSize:15, color:"#0d0d0d", letterSpacing:"-0.2px" }}>
          {filterType === "All" ? "All Debts" : filterType}
          <span style={{ fontSize:12, color:"#aaa", fontWeight:400, marginLeft:8 }}>
            ({filteredDebts.length})
          </span>
        </div>
        <div style={{ display:"flex", gap:8 }}>
          {filterType !== "All" && (
            <button
              onClick={() => setFilterType("All")}
              className="btn-secondary"
              style={{ padding:"8px 14px", fontSize:12 }}
            >
              Clear Filter
            </button>
          )}
          <button
            onClick={onAdd}
            className="btn-primary"
            style={{ padding:"8px 18px", fontSize:13 }}
          >
            + Add Debt
          </button>
        </div>
      </div>

      {/* ── Debt cards ── */}
      {filteredDebts.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">💳</div>
          <div style={{ fontWeight:600, fontSize:15, color:"#ccc", marginBottom:6 }}>
            No debts tracked yet
          </div>
          <div style={{ fontSize:13, color:"#ccc" }}>
            Click "+ Add Debt" to start tracking
          </div>
        </div>
      ) : (
        filteredDebts.map(debt => (
          <DebtCard
            key={debt.id}
            debt={debt}
            onEdit={onEdit}
            onDelete={onDelete}
            onMarkPaidOff={onMarkPaidOff}
            onRecordPayment={onRecordPayment}
            isDueSoon={isDueSoon}
            isOverdue={isOverdue}
            daysUntilDue={daysUntilDue}
            formatAmount={formatAmount}
          />
        ))
      )}

      {/* ── Paid off debts ── */}
      {paidOffDebts.length > 0 && (
        <div style={{ marginTop:8 }}>
          <button
            onClick={() => setShowPaidOff(p => !p)}
            style={{
              background:  "transparent",
              border:      "none",
              color:       "#0070f3",
              fontWeight:  600,
              fontSize:    13,
              cursor:      "pointer",
              padding:     "8px 0",
              marginBottom:8,
              fontFamily:  "inherit",
            }}
          >
            {showPaidOff ? "▼" : "▶"} Paid Off Debts ({paidOffDebts.length})
          </button>
          {showPaidOff && paidOffDebts.map(debt => (
            <DebtCard
              key={debt.id}
              debt={debt}
              onEdit={onEdit}
              onDelete={onDelete}
              onMarkPaidOff={onMarkPaidOff}
              onRecordPayment={onRecordPayment}
              isDueSoon={isDueSoon}
              isOverdue={isOverdue}
              daysUntilDue={daysUntilDue}
              formatAmount={formatAmount}
            />
          ))}
        </div>
      )}

      {/* ── Payment History ── */}
      <div className="card" style={{ marginTop:8 }}>
        <div style={{
          display:        "flex",
          justifyContent: "space-between",
          alignItems:     "center",
          marginBottom:   showHistory ? 14 : 0,
        }}>
          <div className="card-title">Payment History</div>
          <button
            onClick={() => setShowHistory(p => !p)}
            className="btn-ghost"
          >
            {showHistory ? "Hide ▲" : "Show ▼"}
          </button>
        </div>

        {showHistory && (
          <>
            {paymentHistory.length === 0 ? (
              <div style={{ textAlign:"center", color:"#ccc", padding:"20px 0", fontSize:13 }}>
                No payment history yet
              </div>
            ) : paymentHistory.slice(0, 20).map(payment => {
              const debt = debts.find(d => d.id === payment.debtId);
              return (
                <div key={payment.id} style={{
                  display:      "flex",
                  alignItems:   "center",
                  gap:          12,
                  padding:      "11px 14px",
                  background:   "#fafafa",
                  borderRadius: 10,
                  border:       "1px solid #f0f0f0",
                  marginBottom: 8,
                  transition:   "all 0.12s",
                }}>
                  <span style={{ fontSize:18 }}>✅</span>
                  <div style={{ flex:1 }}>
                    <div style={{ fontWeight:600, fontSize:13, color:"#0d0d0d" }}>
                      {debt?.name || "Deleted debt"}
                    </div>
                    <div style={{ fontSize:11, color:"#aaa", marginTop:2 }}>
                      {payment.date}{payment.note ? ` · ${payment.note}` : ""}
                    </div>
                  </div>
                  <div style={{ fontWeight:700, fontSize:14, color:"#059669", letterSpacing:"-0.3px" }}>
                    -{fmt(payment.amount)}
                  </div>
                </div>
              );
            })}
          </>
        )}
      </div>
    </>
  );
}