import { useState } from "react";
import DebtCard          from "../components/DebtCard";
import { DEBT_TYPES }    from "../hooks/useDebts";

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

  return (
    <>
      <div className="page-title">Payments & Debt</div>
      <div className="page-sub">Track your debts, loans and payment reminders</div>

      {/* ── Overdue alert ── */}
      {overdueDebts.length > 0 && (
        <div style={{
          background:"#1a0000", border:"1.5px solid #440000",
          borderRadius:"14px", padding:"14px 18px", marginBottom:"16px",
          display:"flex", alignItems:"center", gap:"12px",
        }}>
          <span style={{ fontSize:24 }}>⚠️</span>
          <div>
            <div style={{ fontWeight:700, color:"#ff4444", fontSize:14 }}>
              {overdueDebts.length} payment{overdueDebts.length > 1 ? "s" : ""} overdue!
            </div>
            <div style={{ fontSize:12, color:"#555", marginTop:2 }}>
              {overdueDebts.map(d => d.name).join(", ")}
            </div>
          </div>
        </div>
      )}

      {/* ── Due soon alert ── */}
      {dueSoonDebts.length > 0 && (
        <div style={{
          background:"#1a1400", border:"1.5px solid #443800",
          borderRadius:"14px", padding:"14px 18px", marginBottom:"16px",
          display:"flex", alignItems:"center", gap:"12px",
        }}>
          <span style={{ fontSize:24 }}>🔔</span>
          <div>
            <div style={{ fontWeight:700, color:"#ffaa00", fontSize:14 }}>
              {dueSoonDebts.length} payment{dueSoonDebts.length > 1 ? "s" : ""} due within 7 days
            </div>
            <div style={{ fontSize:12, color:"#555", marginTop:2 }}>
              {dueSoonDebts.map(d => `${d.name} (${daysUntilDue(d.nextPaymentDate)} days)`).join(", ")}
            </div>
          </div>
        </div>
      )}

      {/* ── Stat cards ── */}
      <div className="stat-grid" style={{ marginBottom:20 }}>
        {[
          {
            label:    "Total Debt",
            value:    formatAmount(totalDebt),
            sub:      `${activeDebts.length} active debts`,
            gradient: "linear-gradient(135deg,#1a0000,#2a0000)",
            color:    "#ff4444",
          },
          {
            label:    "Monthly Payments",
            value:    formatAmount(totalMonthly),
            sub:      "total due per month",
            gradient: "linear-gradient(135deg,#111,#1a1a1a)",
            color:    "#ffffff",
          },
          {
            label:    "Overdue",
            value:    overdueDebts.length,
            sub:      "payments overdue",
            gradient: overdueDebts.length > 0
              ? "linear-gradient(135deg,#1a0000,#2a0000)"
              : "linear-gradient(135deg,#001a0f,#002a18)",
            color: overdueDebts.length > 0 ? "#ff4444" : "#00ff88",
          },
          {
            label:    "Paid Off",
            value:    paidOffDebts.length,
            sub:      "debts cleared 🎉",
            gradient: "linear-gradient(135deg,#001a0f,#002a18)",
            color:    "#00ff88",
          },
        ].map(card => (
          <div
            key={card.label}
            style={{
              background:   card.gradient,
              borderRadius: 14,
              padding:      20,
              border:       "1px solid #222",
            }}
          >
            <div style={{ fontSize:11, color:card.color, opacity:.6, textTransform:"uppercase", letterSpacing:1, marginBottom:6 }}>
              {card.label}
            </div>
            <div style={{ fontSize:24, fontWeight:800, color:card.color, lineHeight:1.2 }}>
              {card.value}
            </div>
            <div style={{ fontSize:12, color:card.color, opacity:.5, marginTop:4 }}>
              {card.sub}
            </div>
          </div>
        ))}
      </div>

      {/* ── Debt type breakdown ── */}
      <div className="card" style={{ marginBottom:20 }}>
        <div className="card-title" style={{ marginBottom:14 }}>Debt by Type</div>
        <div style={{ display:"flex", gap:"10px", flexWrap:"wrap" }}>
          {DEBT_TYPES.map(type => {
            const typeDebts = activeDebts.filter(d => d.type === type.name);
            if (typeDebts.length === 0) return null;
            const total = typeDebts.reduce((s, d) => s + d.balance, 0);
            return (
              <div
                key={type.name}
                onClick={() => setFilterType(f => f === type.name ? "All" : type.name)}
                style={{
                  display:    "flex",
                  alignItems: "center",
                  gap:        8,
                  background: filterType === type.name ? "#1a1a1a" : "#161616",
                  borderRadius: 12,
                  padding:    "10px 14px",
                  border:     filterType === type.name
                    ? "1.5px solid #444"
                    : "1px solid #222",
                  cursor: "pointer",
                  transition: "all 0.15s",
                }}
              >
                <span style={{ fontSize:18 }}>{type.icon}</span>
                <div>
                  <div style={{ fontSize:11, color:"#555" }}>{type.name}</div>
                  <div style={{ fontWeight:700, fontSize:13, color:"#e8e8e8" }}>
                    {formatAmount(total)}
                  </div>
                </div>
              </div>
            );
          })}
          {activeDebts.length === 0 && (
            <div style={{ color:"#333", fontSize:13 }}>No active debts</div>
          )}
        </div>
      </div>

      {/* ── Debt list header ── */}
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:14 }}>
        <div style={{ fontWeight:700, fontSize:16, color:"#e8e8e8" }}>
          {filterType === "All" ? "All Debts" : filterType}
          <span style={{ fontSize:12, color:"#444", fontWeight:400, marginLeft:8 }}>
            ({filteredDebts.length})
          </span>
        </div>
        <div style={{ display:"flex", gap:8 }}>
          {filterType !== "All" && (
            <button
              onClick={() => setFilterType("All")}
              style={{
                background:"#1a1a1a", color:"#999",
                border:"1px solid #2a2a2a",
                padding:"8px 14px", borderRadius:"10px",
                fontWeight:600, fontSize:12, cursor:"pointer",
              }}
            >
              Clear Filter
            </button>
          )}
          <button
            onClick={onAdd}
            style={{
              background:"#ffffff", color:"#000000",
              border:"none", padding:"8px 18px",
              borderRadius:"10px", fontWeight:700,
              fontSize:13, cursor:"pointer",
            }}
          >
            + Add Debt
          </button>
        </div>
      </div>

      {/* ── Debt cards ── */}
      {filteredDebts.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">💳</div>
          <div style={{ fontWeight:600, fontSize:16, marginBottom:6, color:"#333" }}>
            No debts tracked yet
          </div>
          <div style={{ fontSize:13, color:"#333" }}>
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
              background:"transparent", border:"none",
              color:"#444", fontWeight:600, fontSize:13,
              cursor:"pointer", padding:"8px 0", marginBottom:8,
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
          display:"flex", justifyContent:"space-between",
          alignItems:"center", marginBottom: showHistory ? 14 : 0,
        }}>
          <div className="card-title">Payment History</div>
          <button
            onClick={() => setShowHistory(p => !p)}
            style={{
              background:"transparent", border:"none",
              color:"#444", fontWeight:600, fontSize:13, cursor:"pointer",
            }}
          >
            {showHistory ? "Hide ▲" : "Show ▼"}
          </button>
        </div>

        {showHistory && (
          <>
            {paymentHistory.length === 0 ? (
              <div style={{ textAlign:"center", color:"#333", padding:"20px 0", fontSize:13 }}>
                No payment history yet
              </div>
            ) : paymentHistory.slice(0, 20).map(payment => {
              const debt = debts.find(d => d.id === payment.debtId);
              return (
                <div key={payment.id} style={{
                  display:"flex", alignItems:"center", gap:12,
                  padding:"11px", background:"#161616",
                  borderRadius:"12px", border:"1px solid #222",
                  marginBottom:"8px",
                }}>
                  <span style={{ fontSize:20 }}>✅</span>
                  <div style={{ flex:1 }}>
                    <div style={{ fontWeight:600, fontSize:13, color:"#e8e8e8" }}>
                      {debt?.name || "Deleted debt"}
                    </div>
                    <div style={{ fontSize:11, color:"#555" }}>
                      {payment.date}{payment.note ? ` · ${payment.note}` : ""}
                    </div>
                  </div>
                  <div style={{ fontWeight:800, fontSize:14, color:"#00ff88" }}>
                    -{formatAmount(payment.amount)}
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