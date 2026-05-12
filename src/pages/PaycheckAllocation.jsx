import { useState, useEffect, useCallback } from "react";
import { financialPlannerAPI }              from "../utils/api";

const C = {
  blue:   "#0070f3",
  green:  "#059669",
  red:    "#e11d48",
  amber:  "#f59e0b",
  text:   "#0d0d0d",
  muted:  "#888",
  border: "#eaeaea",
  card:   "#ffffff",
  bg:     "#f6f8fa",
};

const CATEGORY_COLORS = {
  savings:       "#059669",
  debt_min:      "#e11d48",
  debt_extra:    "#7c3aed",
  fixed_expense: "#0070f3",
  temp_payment:  "#d97706",
  auto_debit:    "#f59e0b",
  transfer:      "#0891b2",
  income:        "#059669",
};

const MONTHS = [
  "January","February","March","April","May","June",
  "July","August","September","October","November","December"
];

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

export default function PaycheckAllocation({ formatAmount }) {
  const now       = new Date();
  const [year,       setYear]       = useState(now.getFullYear());
  const [month,      setMonth]      = useState(now.getMonth() + 1);
  const [data,       setData]       = useState(null);
  const [loading,    setLoading]    = useState(false);
  const [error,      setError]      = useState(null);
  const [showConfig, setShowConfig] = useState(false);
  const [saving,     setSaving]     = useState(false);
  const [configForm, setConfigForm] = useState({
    first_pay_date:    "2026-05-01",
    biweekly_amount:   "1100",
    second_job_day:    "20",
    second_job_amount: "625",
    second_job_tips:   "300",
    extra_payment:     "150",
  });

  const fmt = v => formatAmount
    ? formatAmount(parseFloat(v) || 0)
    : `$${(parseFloat(v) || 0).toFixed(2)}`;

  const loadConfig = useCallback(async () => {
    try {
      const cfg = await financialPlannerAPI.getPaycheckConfig();
      setConfigForm({
        first_pay_date:    cfg.first_pay_date,
        biweekly_amount:   String(cfg.biweekly_amount),
        second_job_day:    String(cfg.second_job_day),
        second_job_amount: String(cfg.second_job_amount),
        second_job_tips:   String(cfg.second_job_tips),
        extra_payment:     String(cfg.extra_payment),
      });
    } catch (err) {
      console.error("Failed to load config:", err);
    }
  }, []);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await financialPlannerAPI.calculatePaychecks(year, month);
      setData(result);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [year, month]);

  useEffect(() => { loadConfig(); }, [loadConfig]);
  useEffect(() => { loadData();  }, [loadData]);

  async function handleSaveConfig() {
    setSaving(true);
    try {
      await financialPlannerAPI.updatePaycheckConfig({
        first_pay_date:    configForm.first_pay_date,
        biweekly_amount:   parseFloat(configForm.biweekly_amount),
        second_job_day:    parseInt(configForm.second_job_day),
        second_job_amount: parseFloat(configForm.second_job_amount),
        second_job_tips:   parseFloat(configForm.second_job_tips),
        extra_payment:     parseFloat(configForm.extra_payment),
      });
      setShowConfig(false);
      await loadData();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      {/* ── Header ── */}
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:20, flexWrap:"wrap", gap:10 }}>
        <div>
          <div style={{ fontSize:14, fontWeight:700, color:C.text, letterSpacing:"-0.2px" }}>
            {MONTHS[month-1]} {year} — Paycheck Allocation
          </div>
          <div style={{ fontSize:12, color:C.muted, marginTop:2 }}>
            Auto-calculated from your pay schedule
          </div>
        </div>
        <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
          <select value={month} onChange={e => setMonth(parseInt(e.target.value))} style={{ ...inputStyle, width:"auto", padding:"7px 12px" }}>
            {MONTHS.map((m, i) => <option key={i} value={i+1}>{m}</option>)}
          </select>
          <select value={year} onChange={e => setYear(parseInt(e.target.value))} style={{ ...inputStyle, width:"auto", padding:"7px 12px" }}>
            {[2025,2026,2027].map(y => <option key={y} value={y}>{y}</option>)}
          </select>
          <button
            onClick={() => setShowConfig(p => !p)}
            style={{ background:"#f6f8fa", color:C.muted, border:"1px solid #eaeaea", padding:"7px 14px", borderRadius:8, fontWeight:600, fontSize:12, cursor:"pointer", fontFamily:"inherit" }}
          >
            ⚙️ Pay Settings
          </button>
        </div>
      </div>

      {/* ── Config form ── */}
      {showConfig && (
        <div className="card" style={{ marginBottom:20, border:`1.5px solid ${C.blue}` }}>
          <div className="card-title" style={{ marginBottom:16 }}>⚙️ Paycheck Settings</div>
          <div className="form-grid-2">
            <div className="form-group">
              <label style={labelStyle}>First Pay Date *</label>
              <input style={inputStyle} type="date" value={configForm.first_pay_date} onChange={e => setConfigForm(p => ({ ...p, first_pay_date:e.target.value }))} />
              <div style={{ fontSize:11, color:C.muted, marginTop:4 }}>Anchor date — app calculates every 14 days from here</div>
            </div>
            <div className="form-group">
              <label style={labelStyle}>Biweekly Amount ($)</label>
              <input style={inputStyle} type="number" inputMode="decimal" value={configForm.biweekly_amount} onChange={e => setConfigForm(p => ({ ...p, biweekly_amount:e.target.value }))} />
            </div>
            <div className="form-group">
              <label style={labelStyle}>2nd Job Day of Month</label>
              <input style={inputStyle} type="number" placeholder="e.g. 20" value={configForm.second_job_day} onChange={e => setConfigForm(p => ({ ...p, second_job_day:e.target.value }))} />
            </div>
            <div className="form-group">
              <label style={labelStyle}>2nd Job Amount ($)</label>
              <input style={inputStyle} type="number" inputMode="decimal" value={configForm.second_job_amount} onChange={e => setConfigForm(p => ({ ...p, second_job_amount:e.target.value }))} />
            </div>
            <div className="form-group">
              <label style={labelStyle}>Tips Amount ($)</label>
              <input style={inputStyle} type="number" inputMode="decimal" value={configForm.second_job_tips} onChange={e => setConfigForm(p => ({ ...p, second_job_tips:e.target.value }))} />
            </div>
            <div className="form-group">
              <label style={labelStyle}>Extra Avalanche Payment ($)</label>
              <input style={inputStyle} type="number" inputMode="decimal" value={configForm.extra_payment} onChange={e => setConfigForm(p => ({ ...p, extra_payment:e.target.value }))} />
            </div>
          </div>
          <div style={{ display:"flex", gap:8 }}>
            <button className="btn-primary" onClick={handleSaveConfig} disabled={saving} style={{ flex:1 }}>
              {saving ? "Saving..." : "💾 Save Settings"}
            </button>
            <button className="btn-secondary" onClick={() => setShowConfig(false)}>Cancel</button>
          </div>
        </div>
      )}

      {/* ── Loading ── */}
      {loading && (
        <div style={{ textAlign:"center", padding:"40px", color:C.muted }}>
          Calculating paycheck allocation...
        </div>
      )}

      {/* ── Error ── */}
      {error && !loading && (
        <div style={{ background:"#fff1f2", border:"1px solid #fecdd3", borderRadius:10, padding:"14px 18px", marginBottom:16, color:"#e11d48", fontSize:13, fontWeight:500 }}>
          ⚠️ {error}
          {error.includes("configuration") && (
            <button
              onClick={() => setShowConfig(true)}
              style={{ marginLeft:12, background:"#e11d48", color:"#fff", border:"none", padding:"4px 12px", borderRadius:6, fontSize:12, fontWeight:600, cursor:"pointer", fontFamily:"inherit" }}
            >
              Set Up Now
            </button>
          )}
        </div>
      )}

      {/* ── Summary cards ── */}
      {data && !loading && (
        <>
          <div className="stat-grid" style={{ marginBottom:20 }}>
            {[
              { label:"Total Income",  value:fmt(data.total_income),            gradient:"linear-gradient(135deg, #059669, #047857)" },
              { label:"Total Bills",   value:fmt(data.total_bills),             gradient:"linear-gradient(135deg, #e11d48, #be123c)" },
              { label:"Surplus",       value:fmt(Math.abs(data.total_surplus)),
                gradient: data.total_surplus >= 0
                  ? "linear-gradient(135deg, #0070f3, #0050b3)"
                  : "linear-gradient(135deg, #e11d48, #be123c)"
              },
              { label:"Paychecks",     value:`${data.paycheck_count} this month`, gradient:"linear-gradient(135deg, #7c3aed, #6d28d9)" },
            ].map(card => (
              <div key={card.label} style={{ background:card.gradient, borderRadius:12, padding:20, color:"#fff" }}>
                <div style={{ fontSize:10, fontWeight:600, textTransform:"uppercase", letterSpacing:"0.8px", opacity:0.75, marginBottom:8 }}>{card.label}</div>
                <div style={{ fontSize:20, fontWeight:800, letterSpacing:"-0.8px" }}>{card.value}</div>
              </div>
            ))}
          </div>

          {/* ── Paycheck cards ── */}
          {data.paychecks.map((paycheck, pi) => (
            <div key={pi} className="card" style={{
              marginBottom: 16,
              border:       paycheck.is_negative ? "1.5px solid #fecdd3" : "1px solid #eaeaea",
            }}>
              {/* Header */}
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:16, flexWrap:"wrap", gap:8 }}>
                <div style={{ display:"flex", alignItems:"center", gap:12 }}>
                  <div style={{
                    width:44, height:44, borderRadius:10, flexShrink:0,
                    background:    paycheck.source==="second_job" ? "#f0fdf4" : "#f0f7ff",
                    border:        `1px solid ${paycheck.source==="second_job" ? "#bbf7d0" : "#bfdbfe"}`,
                    display:       "flex", alignItems:"center", justifyContent:"center", fontSize:22,
                  }}>
                    {paycheck.source === "second_job" ? "🍽️" : "💼"}
                  </div>
                  <div>
                    <div style={{ fontWeight:800, fontSize:15, color:C.text, letterSpacing:"-0.3px" }}>{paycheck.label}</div>
                    <div style={{ fontSize:11, color:C.muted, marginTop:1 }}>
                      Gross: {fmt(paycheck.gross)} · {paycheck.source === "biweekly" ? "Biweekly" : "2nd Job + Tips"}
                    </div>
                  </div>
                </div>
                <div style={{ textAlign:"right" }}>
                  <div style={{ fontWeight:800, fontSize:18, color:paycheck.final_balance<0?C.red:C.green, letterSpacing:"-0.5px" }}>
                    {paycheck.final_balance < 0 ? "-" : "+"}{fmt(Math.abs(paycheck.final_balance))}
                  </div>
                  <div style={{ fontSize:11, color:C.muted, marginTop:1 }}>
                    {paycheck.final_balance < 0 ? "⚠️ Overspent!" : "remaining"}
                  </div>
                </div>
              </div>

              {/* Overspent warning */}
              {paycheck.is_negative && (
                <div style={{ background:"#fff1f2", border:"1px solid #fecdd3", borderRadius:8, padding:"10px 14px", marginBottom:14, fontSize:12, color:C.red, fontWeight:600 }}>
                  ⚠️ Overspent by {fmt(Math.abs(paycheck.final_balance))}! Move some bills to another paycheck.
                </div>
              )}

              {/* Bills list */}
              {paycheck.items.length === 0 ? (
                <div style={{ fontSize:13, color:"#ccc", textAlign:"center", padding:"12px 0" }}>
                  No bills assigned to this paycheck
                </div>
              ) : (
                <div style={{ borderRadius:8, overflow:"hidden", border:"1px solid #f0f0f0" }}>
                  {/* Starting balance */}
                  <div style={{ display:"flex", justifyContent:"space-between", padding:"10px 14px", background:"#f6f8fa", borderBottom:"1px solid #f0f0f0", fontSize:12, fontWeight:600, color:C.muted }}>
                    <span>Starting balance</span>
                    <span style={{ color:C.green }}>{fmt(paycheck.gross)}</span>
                  </div>

                  {/* Each bill */}
                  {paycheck.items.map((item, idx) => (
                    <div key={item.id} style={{
                      display:"flex", alignItems:"center", gap:12,
                      padding:"11px 14px",
                      borderBottom: idx < paycheck.items.length-1 ? "1px solid #f5f5f5" : "none",
                      background:   item.is_completed ? "#f0fdf4" : "#ffffff",
                    }}>
                      {/* Category dot */}
                      <div style={{ width:8, height:8, borderRadius:"50%", background:CATEGORY_COLORS[item.category]||C.muted, flexShrink:0 }} />

                      {/* Label */}
                      <div style={{ flex:1, minWidth:0 }}>
                        <div style={{
                          fontSize:12, fontWeight:600,
                          color:          item.is_completed ? C.muted : C.text,
                          textDecoration: item.is_completed ? "line-through" : "none",
                          overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap",
                        }}>
                          {item.is_auto_debit && "⚠️ "}{item.label}
                        </div>
                        {item.due_day && (
                          <div style={{ fontSize:10, color:C.muted, marginTop:1 }}>Due: day {item.due_day}</div>
                        )}
                      </div>

                      {/* Amount + running balance */}
                      <div style={{ textAlign:"right", flexShrink:0 }}>
                        <div style={{ fontSize:13, fontWeight:700, color:C.red }}>-{fmt(item.amount)}</div>
                        <div style={{ fontSize:10, fontWeight:600, color:item.running_after<0?C.red:C.green, marginTop:1 }}>
                          = {item.running_after < 0 ? "-" : ""}{fmt(Math.abs(item.running_after))}
                          {item.running_after < 0 ? " ⚠️" : ""}
                        </div>
                      </div>
                    </div>
                  ))}

                  {/* Final balance */}
                  <div style={{
                    display:"flex", justifyContent:"space-between",
                    padding:"10px 14px",
                    background:   paycheck.final_balance < 0 ? "#fff1f2" : "#f0fdf4",
                    fontSize:13, fontWeight:700,
                  }}>
                    <span style={{ color:C.muted }}>Final balance</span>
                    <span style={{ color:paycheck.final_balance<0?C.red:C.green }}>
                      {paycheck.final_balance<0?"-":"+"}{fmt(Math.abs(paycheck.final_balance))}
                    </span>
                  </div>
                </div>
              )}
            </div>
          ))}

          {/* ── Unassigned items ── */}
          {data.unassigned && data.unassigned.length > 0 && (
            <div className="card" style={{ border:"1.5px solid #fde68a", marginBottom:16 }}>
              <div className="card-title" style={{ marginBottom:12, color:C.amber }}>
                ⚠️ Unassigned Items ({data.unassigned.length})
              </div>
              <div style={{ fontSize:12, color:C.muted, marginBottom:12 }}>
                These items have no due date or fall before any paycheck:
              </div>
              {data.unassigned.map((item, i) => (
                <div key={i} style={{ display:"flex", justifyContent:"space-between", padding:"10px 0", borderBottom:i<data.unassigned.length-1?"1px solid #f0f0f0":"none", fontSize:13 }}>
                  <span style={{ color:C.text, fontWeight:500 }}>{item.label}</span>
                  <span style={{ color:C.red, fontWeight:700 }}>{fmt(item.amount)}</span>
                </div>
              ))}
            </div>
          )}

          {/* ── Avalanche tip ── */}
          {data.total_surplus > 0 && (
            <div style={{ background:"#f0fdf4", border:"1px solid #bbf7d0", borderRadius:12, padding:"16px 20px", display:"flex", gap:12, alignItems:"flex-start" }}>
              <span style={{ fontSize:24, flexShrink:0 }}>🎯</span>
              <div>
                <div style={{ fontWeight:700, color:C.green, fontSize:14, marginBottom:4 }}>
                  Surplus: {fmt(data.total_surplus)} available for avalanche!
                </div>
                <div style={{ fontSize:12, color:"#374151" }}>
                  After all bills you have {fmt(data.total_surplus)} left.
                  Put this on your highest APR debt to pay it off faster!
                  {data.extra_payment > 0 && ` (${fmt(data.extra_payment)} already allocated as extra payment)`}
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}