import { useState } from "react";
import { DEBT_TYPES } from "../hooks/useDebts";

function calculateAmortization(balance, annualRate, monthlyPayment) {
  if (!balance || !monthlyPayment || monthlyPayment <= 0) return null;

  const monthlyRate = annualRate / 100 / 12;

  if (monthlyRate === 0) {
    const months     = Math.ceil(balance / monthlyPayment);
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

  const borderColor = debt.isPaidOff ? "#003320"
    : overdue  ? "#440000"
    : dueSoon  ? "#443800"
    : "#222222";

  const calc = debt.interestRate >= 0 && debt.monthlyPayment > 0
    ? calculateAmortization(debt.balance, debt.interestRate, debt.monthlyPayment)
    : null;

  async function handlePayment() {
    if (!payAmount || isNaN(parseFloat(payAmount))) return;
    await onRecordPayment(debt.id, payAmount, payNote);
    setPayAmount("");
    setPayNote("");
    setShowPayment(false);
  }

  const inputStyle = {
    width:"100%", background:"#161616", border:"1px solid #2a2a2a",
    borderRadius:"10px", padding:"10px 12px", color:"#e8e8e8",
    fontSize:14, outline:"none", boxSizing:"border-box",
  };

  return (
    <div style={{
      background:   "#111111",
      borderRadius: "16px",
      padding:      "18px",
      border:       `2px solid ${borderColor}`,
      marginBottom: "12px",
      opacity:      debt.isPaidOff ? 0.7 : 1,
    }}>

      {/* ── Header ── */}
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:"12px" }}>
        <div style={{ display:"flex", alignItems:"center", gap:"10px" }}>
          <span style={{ fontSize:24 }}>{type?.icon}</span>
          <div>
            <div style={{ fontWeight:700, fontSize:15, color:"#e8e8e8" }}>{debt.name}</div>
            <div style={{ fontSize:11, color:"#555" }}>
              {debt.type}{debt.lender ? ` · ${debt.lender}` : ""}
            </div>
          </div>
        </div>

        <div style={{ display:"flex", gap:"6px", alignItems:"center", flexWrap:"wrap" }}>
          {debt.isPaidOff && (
            <span style={{ background:"#001a0f", color:"#00ff88", padding:"3px 10px", borderRadius:"50px", fontSize:11, fontWeight:700, border:"1px solid #003320" }}>
              ✅ PAID OFF
            </span>
          )}
          {!debt.isPaidOff && overdue && (
            <span style={{ background:"#1a0000", color:"#ff4444", padding:"3px 10px", borderRadius:"50px", fontSize:11, fontWeight:700, border:"1px solid #440000" }}>
              ⚠️ OVERDUE
            </span>
          )}
          {!debt.isPaidOff && dueSoon && !overdue && (
            <span style={{ background:"#1a1400", color:"#ffaa00", padding:"3px 10px", borderRadius:"50px", fontSize:11, fontWeight:700, border:"1px solid #443800" }}>
              🔔 DUE SOON
            </span>
          )}
        </div>
      </div>

      {/* ── Detail cards ── */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit, minmax(110px,1fr))", gap:"10px", marginBottom:"12px" }}>
        <div style={{ background:"#161616", borderRadius:"10px", padding:"10px", border:"1px solid #222" }}>
          <div style={{ fontSize:10, color:"#555", textTransform:"uppercase", letterSpacing:0.5, marginBottom:3 }}>Balance</div>
          <div style={{ fontWeight:800, fontSize:16, color: debt.isPaidOff ? "#00ff88" : "#ff4444" }}>
            {formatAmount(debt.balance)}
          </div>
        </div>

        {debt.monthlyPayment > 0 && (
          <div style={{ background:"#161616", borderRadius:"10px", padding:"10px", border:"1px solid #222" }}>
            <div style={{ fontSize:10, color:"#555", textTransform:"uppercase", letterSpacing:0.5, marginBottom:3 }}>Monthly</div>
            <div style={{ fontWeight:700, fontSize:15, color:"#e8e8e8" }}>{formatAmount(debt.monthlyPayment)}</div>
          </div>
        )}

        {debt.interestRate > 0 && (
          <div style={{ background:"#161616", borderRadius:"10px", padding:"10px", border:"1px solid #222" }}>
            <div style={{ fontSize:10, color:"#555", textTransform:"uppercase", letterSpacing:0.5, marginBottom:3 }}>Interest</div>
            <div style={{ fontWeight:700, fontSize:15, color:"#888" }}>{debt.interestRate}% p.a.</div>
          </div>
        )}

        {debt.nextPaymentDate && !debt.isPaidOff && (
          <div style={{
            background: overdue ? "#1a0000" : dueSoon ? "#1a1400" : "#161616",
            borderRadius:"10px", padding:"10px",
            border: overdue ? "1px solid #440000" : dueSoon ? "1px solid #443800" : "1px solid #222",
          }}>
            <div style={{ fontSize:10, color:"#555", textTransform:"uppercase", letterSpacing:0.5, marginBottom:3 }}>Due Date</div>
            <div style={{ fontWeight:700, fontSize:12, color: overdue ? "#ff4444" : dueSoon ? "#ffaa00" : "#e8e8e8" }}>
              {debt.nextPaymentDate}
              {days !== null && (
                <div style={{ fontSize:10, fontWeight:400, marginTop:2, color:"#555" }}>
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
        <div style={{ marginBottom:"12px" }}>
          <div style={{ display:"flex", justifyContent:"space-between", fontSize:11, color:"#555", marginBottom:4 }}>
            <span>Credit Utilization</span>
            <span style={{ fontWeight:700, color: utilPct > 80 ? "#ff4444" : utilPct > 50 ? "#ffaa00" : "#00ff88" }}>
              {utilPct.toFixed(0)}% of {formatAmount(debt.limit)}
            </span>
          </div>
          <div style={{ background:"#1a1a1a", borderRadius:"10px", height:"8px", overflow:"hidden" }}>
            <div style={{
              height:"100%", borderRadius:"10px",
              background: utilPct > 80 ? "#ff4444" : utilPct > 50 ? "#ffaa00" : "#00ff88",
              width:`${utilPct}%`, transition:"width .6s"
            }} />
          </div>
        </div>
      )}

      {/* ── Loan payoff progress bar ── */}
      {debt.type !== "Credit Card" && debt.originalAmount > 0 && (
        <div style={{ marginBottom:"12px" }}>
          <div style={{ display:"flex", justifyContent:"space-between", fontSize:11, color:"#555", marginBottom:4 }}>
            <span>Payoff Progress</span>
            <span style={{ fontWeight:700, color:"#888" }}>{paidOffPct.toFixed(0)}% paid</span>
          </div>
          <div style={{ background:"#1a1a1a", borderRadius:"10px", height:"8px", overflow:"hidden" }}>
            <div style={{
              height:"100%", borderRadius:"10px",
              background:"#ffffff",
              width:`${paidOffPct}%`, transition:"width .6s"
            }} />
          </div>
        </div>
      )}

      {/* ── Amortization Calculator ── */}
      {!debt.isPaidOff && calc && !calc.error && (
        <div style={{
          background:"#161616", borderRadius:"12px", padding:"14px",
          border:"1px solid #2a2a2a", marginBottom:"12px",
        }}>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:"10px" }}>
            <div style={{ fontWeight:700, fontSize:13, color:"#888" }}>📊 Payoff Calculator</div>
            <button
              onClick={() => setShowCalc(p => !p)}
              style={{ background:"transparent", border:"none", color:"#555", fontSize:12, fontWeight:600, cursor:"pointer" }}
            >
              {showCalc ? "Hide ▲" : "Details ▼"}
            </button>
          </div>

          {/* Summary */}
          <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit, minmax(130px,1fr))", gap:"8px" }}>
            <div style={{ background:"#111", borderRadius:"8px", padding:"10px", border:"1px solid #222" }}>
              <div style={{ fontSize:10, color:"#555", textTransform:"uppercase", letterSpacing:0.5, marginBottom:3 }}>Months to Pay Off</div>
              <div style={{ fontWeight:800, fontSize:16, color:"#ffffff" }}>
                {calc.monthsToPayoff}
                <span style={{ fontSize:11, fontWeight:400, color:"#555", marginLeft:4 }}>months</span>
              </div>
            </div>
            <div style={{ background:"#111", borderRadius:"8px", padding:"10px", border:"1px solid #222" }}>
              <div style={{ fontSize:10, color:"#555", textTransform:"uppercase", letterSpacing:0.5, marginBottom:3 }}>Payoff Date</div>
              <div style={{ fontWeight:700, fontSize:13, color:"#ffffff" }}>{calc.payoffDate}</div>
            </div>
            <div style={{ background:"#111", borderRadius:"8px", padding:"10px", border:"1px solid #440000" }}>
              <div style={{ fontSize:10, color:"#555", textTransform:"uppercase", letterSpacing:0.5, marginBottom:3 }}>Total Interest</div>
              <div style={{ fontWeight:800, fontSize:16, color:"#ff4444" }}>{formatAmount(calc.totalInterest)}</div>
            </div>
            <div style={{ background:"#111", borderRadius:"8px", padding:"10px", border:"1px solid #440000" }}>
              <div style={{ fontSize:10, color:"#555", textTransform:"uppercase", letterSpacing:0.5, marginBottom:3 }}>True Cost</div>
              <div style={{ fontWeight:800, fontSize:16, color:"#ff4444" }}>{formatAmount(calc.totalCost)}</div>
            </div>
          </div>

          {/* Expanded details */}
          {showCalc && (
            <div style={{ marginTop:"12px" }}>

              {/* Principal vs Interest bar */}
              <div style={{ marginBottom:"10px" }}>
                <div style={{ display:"flex", justifyContent:"space-between", fontSize:11, color:"#555", marginBottom:4 }}>
                  <span>Principal: {formatAmount(debt.balance)}</span>
                  <span>Interest: {formatAmount(calc.totalInterest)}</span>
                </div>
                <div style={{ display:"flex", borderRadius:"8px", overflow:"hidden", height:"12px" }}>
                  <div style={{
                    background:"#ffffff",
                    width:`${(debt.balance / calc.totalCost) * 100}%`,
                    transition:"width .6s",
                  }} />
                  <div style={{ background:"#ff4444", flex:1 }} />
                </div>
                <div style={{ display:"flex", gap:"12px", marginTop:6 }}>
                  <div style={{ display:"flex", alignItems:"center", gap:4 }}>
                    <div style={{ width:10, height:10, borderRadius:2, background:"#ffffff" }} />
                    <span style={{ fontSize:10, color:"#555" }}>Principal ({((debt.balance/calc.totalCost)*100).toFixed(0)}%)</span>
                  </div>
                  <div style={{ display:"flex", alignItems:"center", gap:4 }}>
                    <div style={{ width:10, height:10, borderRadius:2, background:"#ff4444" }} />
                    <span style={{ fontSize:10, color:"#555" }}>Interest ({((calc.totalInterest/calc.totalCost)*100).toFixed(0)}%)</span>
                  </div>
                </div>
              </div>

              {/* Monthly schedule */}
              {calc.schedule.length > 0 && (
                <>
                  <button
                    onClick={() => setShowSchedule(p => !p)}
                    style={{
                      background:"#1a1a1a", color:"#888",
                      border:"1px solid #2a2a2a",
                      padding:"8px 14px", borderRadius:"8px",
                      fontWeight:600, fontSize:12, cursor:"pointer",
                      width:"100%", marginBottom:8,
                    }}
                  >
                    {showSchedule ? "▲ Hide" : "▼ Show"} Monthly Breakdown (First 12 months)
                  </button>

                  {showSchedule && (
                    <div style={{ overflowX:"auto" }}>
                      <table style={{ width:"100%", borderCollapse:"collapse", fontSize:11 }}>
                        <thead>
                          <tr style={{ background:"#1a1a1a" }}>
                            {["Month","Payment","Principal","Interest","Balance"].map(h => (
                              <th key={h} style={{
                                padding:"8px 10px", textAlign:"right",
                                color:"#555", fontWeight:700,
                                fontSize:10, textTransform:"uppercase", letterSpacing:0.5,
                              }}>
                                {h}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {calc.schedule.map((row, i) => (
                            <tr key={i} style={{ background: i % 2 === 0 ? "#161616" : "#111" }}>
                              <td style={{ padding:"7px 10px", textAlign:"right", fontWeight:600, color:"#e8e8e8" }}>{row.month}</td>
                              <td style={{ padding:"7px 10px", textAlign:"right", color:"#e8e8e8" }}>{formatAmount(debt.monthlyPayment)}</td>
                              <td style={{ padding:"7px 10px", textAlign:"right", color:"#ffffff", fontWeight:600 }}>{formatAmount(row.principal)}</td>
                              <td style={{ padding:"7px 10px", textAlign:"right", color:"#ff4444" }}>{formatAmount(row.interest)}</td>
                              <td style={{ padding:"7px 10px", textAlign:"right", color:"#555" }}>{formatAmount(row.balance)}</td>
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

      {/* ── Error if payment too low ── */}
      {!debt.isPaidOff && calc && calc.error && (
        <div style={{
          background:"#1a0000", border:"1px solid #440000",
          borderRadius:"10px", padding:"10px 14px",
          fontSize:12, color:"#ff4444", marginBottom:"12px",
        }}>
          ⚠️ {calc.error}
        </div>
      )}

      {/* ── Action buttons ── */}
      {!debt.isPaidOff && (
        <div style={{ display:"flex", gap:"8px", flexWrap:"wrap" }}>
          <button
            onClick={() => setShowPayment(p => !p)}
            style={{ background:"#ffffff", color:"#000", border:"none", padding:"8px 14px", borderRadius:"10px", fontWeight:700, fontSize:12, cursor:"pointer" }}
          >
            💰 Record Payment
          </button>
          <button
            onClick={() => onEdit(debt)}
            style={{ background:"#1a1a1a", color:"#999", border:"1px solid #2a2a2a", padding:"8px 14px", borderRadius:"10px", fontWeight:600, fontSize:12, cursor:"pointer" }}
          >
            ✏️ Edit
          </button>
          <button
            onClick={() => onMarkPaidOff(debt.id)}
            style={{ background:"#001a0f", color:"#00ff88", border:"1px solid #003320", padding:"8px 14px", borderRadius:"10px", fontWeight:600, fontSize:12, cursor:"pointer" }}
          >
            ✅ Mark Paid Off
          </button>
          <button
            onClick={() => onDelete(debt.id)}
            style={{ background:"#1a0000", color:"#ff4444", border:"1px solid #440000", padding:"8px 14px", borderRadius:"10px", fontWeight:600, fontSize:12, cursor:"pointer" }}
          >
            🗑 Delete
          </button>
        </div>
      )}

      {debt.isPaidOff && (
        <button
          onClick={() => onDelete(debt.id)}
          style={{ background:"#1a0000", color:"#ff4444", border:"1px solid #440000", padding:"8px 14px", borderRadius:"10px", fontWeight:600, fontSize:12, cursor:"pointer" }}
        >
          🗑 Remove
        </button>
      )}

      {/* ── Record payment form ── */}
      {showPayment && (
        <div style={{ marginTop:"14px", background:"#161616", borderRadius:"12px", padding:"14px", border:"1px solid #2a2a2a" }}>
          <div style={{ fontWeight:700, fontSize:13, marginBottom:"10px", color:"#e8e8e8" }}>
            Record Payment
          </div>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"10px", marginBottom:"10px" }}>
            <div>
              <label style={{ fontSize:10, color:"#555", fontWeight:600, textTransform:"uppercase", display:"block", marginBottom:4 }}>
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
              <label style={{ fontSize:10, color:"#555", fontWeight:600, textTransform:"uppercase", display:"block", marginBottom:4 }}>
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
          <div style={{ display:"flex", gap:"8px" }}>
            <button
              onClick={handlePayment}
              style={{ background:"#ffffff", color:"#000", border:"none", padding:"10px 20px", borderRadius:"10px", fontWeight:700, fontSize:13, cursor:"pointer" }}
            >
              Confirm Payment
            </button>
            <button
              onClick={() => setShowPayment(false)}
              style={{ background:"#1a1a1a", color:"#999", border:"1px solid #2a2a2a", padding:"10px 16px", borderRadius:"10px", fontWeight:600, fontSize:13, cursor:"pointer" }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {debt.notes && (
        <div style={{ marginTop:"10px", fontSize:11, color:"#555", fontStyle:"italic" }}>
          {debt.notes}
        </div>
      )}

    </div>
  );
}