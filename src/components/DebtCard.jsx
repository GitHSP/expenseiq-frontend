import { useState } from "react";
import { DEBT_TYPES } from "../hooks/useDebts";

function calculateAmortization(balance, annualRate, monthlyPayment) {
  if (!balance || !monthlyPayment || monthlyPayment <= 0) return null;
  const monthlyRate = annualRate / 100 / 12;
  if (monthlyRate === 0) {
    const months = Math.ceil(balance / monthlyPayment);
    const payoffDate = new Date();
    payoffDate.setMonth(payoffDate.getMonth() + months);
    return {
      monthsToPayoff: months,
      totalInterest:  0,
      totalCost:      balance,
      payoffDate:     payoffDate.toLocaleDateString("en-US", { month:"long", year:"numeric" }),
      schedule:       [],
    };
  }
  const firstMonthInterest = balance * monthlyRate;
  if (monthlyPayment <= firstMonthInterest) {
    return { error: "Monthly payment is too low to cover interest. Loan will never be paid off." };
  }
  let remainingBalance = balance;
  let totalInterest    = 0;
  let months           = 0;
  const schedule       = [];
  while (remainingBalance > 0 && months < 600) {
    const interestPayment  = remainingBalance * monthlyRate;
    const principalPayment = Math.min(monthlyPayment - interestPayment, remainingBalance);
    remainingBalance       = Math.max(0, remainingBalance - principalPayment);
    totalInterest         += interestPayment;
    months++;
    if (months <= 12) {
      schedule.push({
        month:     months,
        interest:  interestPayment,
        principal: principalPayment,
        balance:   remainingBalance,
      });
    }
  }
  const payoffDate = new Date();
  payoffDate.setMonth(payoffDate.getMonth() + months);
  return {
    monthsToPayoff: months,
    totalInterest:  totalInterest,
    totalCost:      balance + totalInterest,
    payoffDate:     payoffDate.toLocaleDateString("en-US", { month:"long", year:"numeric" }),
    schedule:       schedule,
  };
}

export default function DebtCard({
  debt, onEdit, onDelete, onMarkPaidOff,
  onRecordPayment, isDueSoon, isOverdue, daysUntilDue,
  formatAmount,
}) {
  const [showPayment,  setShowPayment]  = useState(false);
  const [showCalc,     setShowCalc]     = useState(false);
  const [showSchedule, setShowSchedule] = useState(false);
  const [payAmount,    setPayAmount]    = useState("");
  const [payNote,      setPayNote]      = useState("");

  const type    = DEBT_TYPES.find(t => t.name === debt.type);
  const days    = daysUntilDue(debt.nextPaymentDate);
  const overdue = isOverdue(debt.nextPaymentDate);
  const dueSoon = isDueSoon(debt.nextPaymentDate);

  const utilPct = debt.limit > 0
    ? Math.min((debt.balance / debt.limit) * 100, 100)
    : 0;

  const paidOffPct = debt.originalAmount > 0
    ? Math.min(((debt.originalAmount - debt.balance) / debt.originalAmount) * 100, 100)
    : 0;

  const borderColor = debt.isPaidOff ? "#bbf7d0"
    : overdue  ? "#fecdd3"
    : dueSoon  ? "#fde68a"
    : "#eaeaea";

  const calc = debt.interestRate >= 0 && debt.monthlyPayment > 0
    ? calculateAmortization(debt.balance, debt.interestRate, debt.monthlyPayment)
    : null;

  const fmt = v => formatAmount ? formatAmount(v) : `$${parseFloat(v).toFixed(2)}`;

  async function handlePayment() {
    if (!payAmount || isNaN(parseFloat(payAmount))) return;
    await onRecordPayment(debt.id, payAmount, payNote);
    setPayAmount("");
    setPayNote("");
    setShowPayment(false);
  }

  const inputStyle = {
    width:        "100%",
    background:   "#ffffff",
    border:       "1px solid #eaeaea",
    borderRadius: 8,
    padding:      "10px 12px",
    color:        "#0d0d0d",
    fontSize:     13,
    fontFamily:   "inherit",
    outline:      "none",
    boxSizing:    "border-box",
    fontWeight:   500,
  };

  return (
    <div style={{
      background:   "#ffffff",
      borderRadius: 12,
      padding:      "18px 20px",
      border:       `1.5px solid ${borderColor}`,
      marginBottom: 12,
      boxShadow:    "0 1px 3px rgba(0,0,0,0.04)",
      opacity:      debt.isPaidOff ? 0.75 : 1,
      transition:   "all 0.15s",
    }}>

      {/* ── Header ── */}
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:14 }}>
        <div style={{ display:"flex", alignItems:"center", gap:10 }}>
          <span style={{ fontSize:22 }}>{type?.icon}</span>
          <div>
            <div style={{ fontWeight:700, fontSize:14, color:"#0d0d0d", letterSpacing:"-0.2px" }}>
              {debt.name}
            </div>
            <div style={{ fontSize:11, color:"#888", marginTop:1 }}>
              {debt.type}{debt.lender ? ` · ${debt.lender}` : ""}
            </div>
          </div>
        </div>

        {/* Status badges */}
        <div style={{ display:"flex", gap:6, alignItems:"center", flexWrap:"wrap" }}>
          {debt.isPaidOff && (
            <span style={{ background:"#f0fdf4", color:"#059669", padding:"3px 10px", borderRadius:100, fontSize:11, fontWeight:700, border:"1px solid #bbf7d0" }}>
              ✅ PAID OFF
            </span>
          )}
          {!debt.isPaidOff && overdue && (
            <span style={{ background:"#fff1f2", color:"#e11d48", padding:"3px 10px", borderRadius:100, fontSize:11, fontWeight:700, border:"1px solid #fecdd3" }}>
              ⚠️ OVERDUE
            </span>
          )}
          {!debt.isPaidOff && dueSoon && !overdue && (
            <span style={{ background:"#fffbeb", color:"#d97706", padding:"3px 10px", borderRadius:100, fontSize:11, fontWeight:700, border:"1px solid #fde68a" }}>
              🔔 DUE SOON
            </span>
          )}
        </div>
      </div>

      {/* ── Detail cards ── */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit, minmax(110px,1fr))", gap:10, marginBottom:14 }}>

        <div style={{ background:"#fafafa", borderRadius:8, padding:"10px 12px", border:"1px solid #f0f0f0" }}>
          <div style={{ fontSize:10, color:"#aaa", textTransform:"uppercase", letterSpacing:0.5, marginBottom:3, fontWeight:600 }}>Balance</div>
          <div style={{ fontWeight:800, fontSize:16, color: debt.isPaidOff ? "#059669" : "#e11d48", letterSpacing:"-0.5px" }}>
            {fmt(debt.balance)}
          </div>
        </div>

        {debt.monthlyPayment > 0 && (
          <div style={{ background:"#fafafa", borderRadius:8, padding:"10px 12px", border:"1px solid #f0f0f0" }}>
            <div style={{ fontSize:10, color:"#aaa", textTransform:"uppercase", letterSpacing:0.5, marginBottom:3, fontWeight:600 }}>Monthly</div>
            <div style={{ fontWeight:700, fontSize:15, color:"#0d0d0d", letterSpacing:"-0.3px" }}>{fmt(debt.monthlyPayment)}</div>
          </div>
        )}

        {debt.interestRate > 0 && (
          <div style={{ background:"#fafafa", borderRadius:8, padding:"10px 12px", border:"1px solid #f0f0f0" }}>
            <div style={{ fontSize:10, color:"#aaa", textTransform:"uppercase", letterSpacing:0.5, marginBottom:3, fontWeight:600 }}>Interest</div>
            <div style={{ fontWeight:700, fontSize:15, color:"#0070f3", letterSpacing:"-0.3px" }}>{debt.interestRate}% p.a.</div>
          </div>
        )}

        {debt.nextPaymentDate && !debt.isPaidOff && (
          <div style={{
            background: overdue ? "#fff1f2" : dueSoon ? "#fffbeb" : "#fafafa",
            borderRadius: 8, padding:"10px 12px",
            border: overdue ? "1px solid #fecdd3" : dueSoon ? "1px solid #fde68a" : "1px solid #f0f0f0",
          }}>
            <div style={{ fontSize:10, color:"#aaa", textTransform:"uppercase", letterSpacing:0.5, marginBottom:3, fontWeight:600 }}>Due Date</div>
            <div style={{ fontWeight:700, fontSize:12, color: overdue ? "#e11d48" : dueSoon ? "#d97706" : "#0d0d0d" }}>
              {debt.nextPaymentDate}
              {days !== null && (
                <div style={{ fontSize:10, fontWeight:500, marginTop:2, color:"#888" }}>
                  {overdue
                    ? `${Math.abs(days)} days overdue`
                    : days === 0 ? "Due today!"
                    : `${days} days left`}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* ── Credit card utilization bar ── */}
      {debt.type === "Credit Card" && debt.limit > 0 && (
        <div style={{ marginBottom:14 }}>
          <div style={{ display:"flex", justifyContent:"space-between", fontSize:11, color:"#888", marginBottom:5, fontWeight:500 }}>
            <span>Credit Utilization</span>
            <span style={{ fontWeight:700, color: utilPct > 80 ? "#e11d48" : utilPct > 50 ? "#d97706" : "#059669" }}>
              {utilPct.toFixed(0)}% of {fmt(debt.limit)}
            </span>
          </div>
          <div style={{ background:"#f0f0f0", borderRadius:100, height:6, overflow:"hidden" }}>
            <div style={{
              height:       "100%",
              borderRadius: 100,
              background:   utilPct > 80 ? "#e11d48" : utilPct > 50 ? "#f59e0b" : "#059669",
              width:        `${utilPct}%`,
              transition:   "width .6s",
            }} />
          </div>
        </div>
      )}

      {/* ── Loan payoff progress bar ── */}
      {debt.type !== "Credit Card" && debt.originalAmount > 0 && (
        <div style={{ marginBottom:14 }}>
          <div style={{ display:"flex", justifyContent:"space-between", fontSize:11, color:"#888", marginBottom:5, fontWeight:500 }}>
            <span>Payoff Progress</span>
            <span style={{ fontWeight:700, color:"#0070f3" }}>{paidOffPct.toFixed(0)}% paid</span>
          </div>
          <div style={{ background:"#f0f0f0", borderRadius:100, height:6, overflow:"hidden" }}>
            <div style={{
              height:       "100%",
              borderRadius: 100,
              background:   "#0070f3",
              width:        `${paidOffPct}%`,
              transition:   "width .6s",
            }} />
          </div>
        </div>
      )}

      {/* ── Amortization Calculator ── */}
      {!debt.isPaidOff && calc && !calc.error && (
        <div style={{
          background:   "#f0f7ff",
          borderRadius: 10,
          padding:      "14px",
          border:       "1px solid #bfdbfe",
          marginBottom: 14,
        }}>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:10 }}>
            <div style={{ fontWeight:700, fontSize:13, color:"#0070f3" }}>📊 Payoff Calculator</div>
            <button
              onClick={() => setShowCalc(p => !p)}
              style={{ background:"transparent", border:"none", color:"#0070f3", fontSize:12, fontWeight:600, cursor:"pointer", fontFamily:"inherit" }}
            >
              {showCalc ? "Hide ▲" : "Details ▼"}
            </button>
          </div>

          <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit, minmax(130px,1fr))", gap:8 }}>
            {[
              { label:"Months to Pay Off", value:`${calc.monthsToPayoff} months`, color:"#0d0d0d" },
              { label:"Payoff Date",       value:calc.payoffDate,                 color:"#0d0d0d" },
              { label:"Total Interest",    value:fmt(calc.totalInterest),         color:"#e11d48" },
              { label:"True Cost",         value:fmt(calc.totalCost),             color:"#e11d48" },
            ].map(s => (
              <div key={s.label} style={{ background:"#ffffff", borderRadius:8, padding:"10px", border:"1px solid #bfdbfe" }}>
                <div style={{ fontSize:10, color:"#888", textTransform:"uppercase", letterSpacing:0.5, marginBottom:3, fontWeight:600 }}>{s.label}</div>
                <div style={{ fontWeight:800, fontSize:14, color:s.color, letterSpacing:"-0.3px" }}>{s.value}</div>
              </div>
            ))}
          </div>

          {showCalc && (
            <div style={{ marginTop:12 }}>
              {/* Principal vs Interest bar */}
              <div style={{ marginBottom:10 }}>
                <div style={{ display:"flex", justifyContent:"space-between", fontSize:11, color:"#888", marginBottom:4 }}>
                  <span>Principal: {fmt(debt.balance)}</span>
                  <span>Interest: {fmt(calc.totalInterest)}</span>
                </div>
                <div style={{ display:"flex", borderRadius:8, overflow:"hidden", height:10 }}>
                  <div style={{
                    background: "#0070f3",
                    width:      `${(debt.balance / calc.totalCost) * 100}%`,
                  }} />
                  <div style={{ background:"#e11d48", flex:1 }} />
                </div>
                <div style={{ display:"flex", gap:12, marginTop:5 }}>
                  <div style={{ display:"flex", alignItems:"center", gap:4 }}>
                    <div style={{ width:10, height:10, borderRadius:2, background:"#0070f3" }} />
                    <span style={{ fontSize:10, color:"#888" }}>Principal ({((debt.balance/calc.totalCost)*100).toFixed(0)}%)</span>
                  </div>
                  <div style={{ display:"flex", alignItems:"center", gap:4 }}>
                    <div style={{ width:10, height:10, borderRadius:2, background:"#e11d48" }} />
                    <span style={{ fontSize:10, color:"#888" }}>Interest ({((calc.totalInterest/calc.totalCost)*100).toFixed(0)}%)</span>
                  </div>
                </div>
              </div>

              {/* Monthly schedule */}
              {calc.schedule.length > 0 && (
                <>
                  <button
                    onClick={() => setShowSchedule(p => !p)}
                    style={{
                      background:   "#ffffff",
                      color:        "#0070f3",
                      border:       "1px solid #bfdbfe",
                      padding:      "8px 14px",
                      borderRadius: 8,
                      fontWeight:   600,
                      fontSize:     12,
                      cursor:       "pointer",
                      width:        "100%",
                      marginBottom: 8,
                      fontFamily:   "inherit",
                    }}
                  >
                    {showSchedule ? "▲ Hide" : "▼ Show"} Monthly Breakdown (First 12 months)
                  </button>

                  {showSchedule && (
                    <div style={{ overflowX:"auto" }}>
                      <table style={{ width:"100%", borderCollapse:"collapse", fontSize:11 }}>
                        <thead>
                          <tr style={{ background:"#f0f7ff" }}>
                            {["Month","Payment","Principal","Interest","Balance"].map(h => (
                              <th key={h} style={{
                                padding:       "8px 10px",
                                textAlign:     "right",
                                color:         "#0070f3",
                                fontWeight:    700,
                                fontSize:      10,
                                textTransform: "uppercase",
                                letterSpacing: 0.5,
                              }}>
                                {h}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {calc.schedule.map((row, i) => (
                            <tr key={i} style={{ background: i % 2 === 0 ? "#fafafa" : "#fff" }}>
                              <td style={tdS}>{row.month}</td>
                              <td style={tdS}>{fmt(debt.monthlyPayment)}</td>
                              <td style={{ ...tdS, color:"#0070f3", fontWeight:600 }}>{fmt(row.principal)}</td>
                              <td style={{ ...tdS, color:"#e11d48" }}>{fmt(row.interest)}</td>
                              <td style={{ ...tdS, color:"#888" }}>{fmt(row.balance)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </div>
      )}

      {/* Error if payment too low */}
      {!debt.isPaidOff && calc && calc.error && (
        <div style={{
          background:   "#fff1f2",
          border:       "1px solid #fecdd3",
          borderRadius: 8,
          padding:      "10px 14px",
          fontSize:     12,
          color:        "#e11d48",
          marginBottom: 14,
          fontWeight:   500,
        }}>
          ⚠️ {calc.error}
        </div>
      )}

      {/* ── Action buttons ── */}
      {!debt.isPaidOff && (
        <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
          <button
            onClick={() => setShowPayment(p => !p)}
            style={{
              background:   "#059669",
              color:        "#fff",
              border:       "none",
              padding:      "8px 14px",
              borderRadius: 8,
              fontWeight:   600,
              fontSize:     12,
              cursor:       "pointer",
              fontFamily:   "inherit",
              transition:   "all 0.15s",
            }}
          >
            💰 Record Payment
          </button>
          <button
            onClick={() => onEdit(debt)}
            className="btn-secondary"
            style={{ padding:"8px 14px", fontSize:12 }}
          >
            ✏️ Edit
          </button>
          <button
            onClick={() => onMarkPaidOff(debt.id)}
            style={{
              background:   "#f0fdf4",
              color:        "#059669",
              border:       "1px solid #bbf7d0",
              padding:      "8px 14px",
              borderRadius: 8,
              fontWeight:   600,
              fontSize:     12,
              cursor:       "pointer",
              fontFamily:   "inherit",
            }}
          >
            ✅ Mark Paid Off
          </button>
          <button
            onClick={() => onDelete(debt.id)}
            className="btn-danger"
            style={{ padding:"8px 14px", fontSize:12 }}
          >
            🗑 Delete
          </button>
        </div>
      )}

      {debt.isPaidOff && (
        <button
          onClick={() => onDelete(debt.id)}
          className="btn-danger"
          style={{ padding:"8px 14px", fontSize:12 }}
        >
          🗑 Remove
        </button>
      )}

      {/* ── Record payment form ── */}
      {showPayment && (
        <div style={{
          marginTop:    14,
          background:   "#f6f8fa",
          borderRadius: 10,
          padding:      "14px",
          border:       "1px solid #eaeaea",
        }}>
          <div style={{ fontWeight:700, fontSize:13, marginBottom:10, color:"#0d0d0d" }}>
            Record Payment
          </div>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10, marginBottom:10 }}>
            <div>
              <label style={{ fontSize:10, color:"#888", fontWeight:600, textTransform:"uppercase", letterSpacing:"0.5px", display:"block", marginBottom:4 }}>
                Amount
              </label>
              <input
                style={inputStyle}
                type="number"
                inputMode="decimal"
                placeholder="0.00"
                value={payAmount}
                onChange={e => setPayAmount(e.target.value)}
              />
            </div>
            <div>
              <label style={{ fontSize:10, color:"#888", fontWeight:600, textTransform:"uppercase", letterSpacing:"0.5px", display:"block", marginBottom:4 }}>
                Note (optional)
              </label>
              <input
                style={inputStyle}
                placeholder="e.g. March payment"
                value={payNote}
                onChange={e => setPayNote(e.target.value)}
              />
            </div>
          </div>
          <div style={{ display:"flex", gap:8 }}>
            <button
              onClick={handlePayment}
              style={{
                background:   "#059669",
                color:        "#fff",
                border:       "none",
                padding:      "10px 20px",
                borderRadius: 8,
                fontWeight:   700,
                fontSize:     13,
                cursor:       "pointer",
                fontFamily:   "inherit",
              }}
            >
              Confirm Payment
            </button>
            <button
              onClick={() => setShowPayment(false)}
              className="btn-secondary"
              style={{ padding:"10px 16px", fontSize:13 }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {debt.notes && (
        <div style={{ marginTop:10, fontSize:11, color:"#aaa", fontStyle:"italic" }}>
          {debt.notes}
        </div>
      )}
    </div>
  );
}

const tdS = {
  padding:   "7px 10px",
  textAlign: "right",
  color:     "#0d0d0d",
  fontWeight:500,
};