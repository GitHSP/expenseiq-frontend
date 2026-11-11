import { useMemo, useState } from "react";
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import Icon from "./Icon";
import { financialPlannerAPI } from "../utils/api";

// A universal life policy's plan, from its own documents (backend
// financial_planner/policy_plan.py): where it stands, each statement year,
// the fund ahead at a few returns, and what the premiums come to in total.

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const dateLabel = iso => { const [y, m] = iso.split("-"); return `${MONTHS[+m - 1]} ${y}`; };
const num = v => parseFloat(v) || 0;
// Projection colours: low / expected / high (validated dataviz palette), illustration in purple.
const RATE_COLORS = ["#d97706", "#0070f3", "#059669", "#7c3aed", "#64748b"];

const section = { fontSize: 11, fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.5px", margin: "18px 0 8px" };
const cell = { padding: "6px 6px", textAlign: "right", whiteSpace: "nowrap" };

function Tile({ label, value, sub, color }) {
  return (
    <div style={{ background: "var(--bg)", border: "1px solid var(--border)", borderRadius: 10, padding: "10px 12px", minWidth: 0 }}>
      <div style={{ fontSize: 10, color: "var(--muted)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.4px" }}>{label}</div>
      <div style={{ fontWeight: 700, fontSize: 17, color: color || "var(--text)", marginTop: 2 }}>{value}</div>
      {sub && <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 2 }}>{sub}</div>}
    </div>
  );
}

// Paste the policy's data (prepared from its documents) once; again to replace it.
export function PastePlan({ inv, onSaved, startOpen = false }) {
  const [open, setOpen] = useState(startOpen);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  async function save() {
    let plan;
    try { plan = JSON.parse(text); } catch { setErr("That isn't valid policy data. Copy the whole file and paste it again."); return; }
    setBusy(true); setErr("");
    try {
      onSaved(await financialPlannerAPI.updateInvestment(inv.id, { plan }));
      setText(""); setOpen(false);
    } catch (e) {
      setErr(e.message || "Couldn't save it.");
    } finally { setBusy(false); }
  }

  if (!open) {
    return (
      <button className="btn-secondary" style={{ padding: "6px 12px", fontSize: 12, display: "inline-flex", alignItems: "center", gap: 5 }}
        onClick={() => setOpen(true)}>
        <Icon name="file-text" size={13} /> {inv.plan && Object.keys(inv.plan).length ? "Update policy data" : "Add policy data"}
      </button>
    );
  }
  return (
    <div style={{ marginTop: 10 }}>
      <div style={{ fontSize: 12, color: "var(--muted)", marginBottom: 6 }}>
        Paste the policy data file (prepared from your contract and statements). It replaces what's there now.
      </div>
      <textarea value={text} onChange={e => setText(e.target.value)} rows={5} spellCheck={false}
        placeholder='{"face": ..., "coi": ...}' aria-label="Policy data"
        style={{ width: "100%", boxSizing: "border-box", fontFamily: "monospace", fontSize: 12, padding: 10, borderRadius: 8,
                 border: "1px solid var(--border)", background: "var(--card)", color: "var(--text)" }} />
      <div style={{ display: "flex", gap: 6, marginTop: 8 }}>
        <button className="btn-primary" disabled={busy || !text.trim()} style={{ padding: "7px 14px", fontSize: 12 }} onClick={save}>
          {busy ? "Saving..." : "Save"}
        </button>
        <button className="btn-secondary" style={{ padding: "7px 12px", fontSize: 12 }} onClick={() => { setOpen(false); setErr(""); }}>Cancel</button>
      </div>
      {err && <div style={{ fontSize: 12, color: "var(--neg-text)", marginTop: 6 }}>{err}</div>}
    </div>
  );
}

export default function PolicyPlan({ inv, m, onSaved }) {
  const p = inv.summary?.plan;
  const rates = p ? p.projections.map(x => x.rate) : [];
  const [pick, setPick] = useState(rates.length > 1 ? 1 : 0);      // the middle return by default
  const [busy, setBusy] = useState(false);
  const [everyYear, setEveryYear] = useState(false);

  // Fund value by age: the statements so far, then each projection.
  const chart = useMemo(() => {
    if (!p) return null;
    const startMs = new Date(`${p.start}T12:00:00`).getTime();
    const ageAt = iso => p.issue_age + (new Date(`${iso}T12:00:00`).getTime() - startMs) / (365.25 * 86400000);
    return {
      actual: p.values.map(v => ({ age: +ageAt(v.date).toFixed(2), fund: v.fund })),
      lines: p.projections.map(pr => pr.points.filter(pt => pt.age <= 90).map(pt => ({ age: pt.age, fund: pt.fund }))),
      illustration: (p.illustration?.rows || []).filter(r => r.age <= 90).map(r => ({ age: r.age, fund: r.value })),
    };
  }, [p]);

  if (!p) return null;
  const chosen = p.projections[pick];
  // The policy anniversary when the insured reaches `age`.
  const anniversary = age => {
    const d = new Date(`${p.start}T12:00:00`);
    d.setFullYear(d.getFullYear() + (age - p.issue_age));
    return d.toISOString().slice(0, 10);
  };
  const t = p.today;

  async function setPayUntil(age) {
    setBusy(true);
    try {
      onSaved(await financialPlannerAPI.updateInvestment(inv.id, { plan: { ...inv.plan, pay_until_age: age } }));
    } finally { setBusy(false); }
  }

  const at65 = chosen.at["65"];
  const yearsWithData = p.years.filter(y => y.charges !== null || y.growth !== null);

  return (
    <div style={{ marginTop: 12, borderTop: "1px solid var(--subtle2)", paddingTop: 4 }}>
      {/* ── Where it stands ── */}
      <div style={section}>Where it stands</div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 8 }}>
        <Tile label="Paid so far" value={m(t.paid)} sub={`${m(p.premium)} a month · year ${p.policy_year} of the policy`} />
        {t.fund !== null
          ? <Tile label="Fund value" value={m(t.fund)} color="#059669" sub={`on ${dateLabel(t.fund_date)} · ${num(t.gain) >= 0 ? "+" : "−"}${m(Math.abs(t.gain))} vs ${m(t.paid_by_fund_date)} paid by then`} />
          : <Tile label="Fund value" value="—" sub="Starts with the first statement" />}
        <Tile label="If cancelled now" value={t.surrender_value !== null ? m(t.surrender_value) : "—"}
          color={t.surrender_value > 0 ? "var(--text)" : "var(--neg-text)"}
          sub={t.surrender_charge > 0 ? `${m(t.surrender_charge)} surrender charge this year` : "No surrender charge"} />
        {t.surrender_free_from && (
          <Tile label="Surrender charges end" value={dateLabel(t.surrender_free_from)} sub="after that, the fund is all yours" />
        )}
      </div>

      {/* ── Ahead ── */}
      <div style={section}>What it's heading for</div>
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center", marginBottom: 10 }}>
        <span style={{ fontSize: 12, color: "var(--muted)" }}>If the fund grows</span>
        {rates.map((r, i) => (
          <button key={r} onClick={() => setPick(i)} aria-pressed={pick === i}
            style={{ padding: "5px 12px", borderRadius: 100, fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "inherit",
                     border: `1px solid ${pick === i ? RATE_COLORS[i] : "var(--border)"}`,
                     background: pick === i ? `${RATE_COLORS[i]}22` : "transparent", color: pick === i ? RATE_COLORS[i] : "var(--muted)" }}>
            {r}% a year
          </button>
        ))}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 8 }}>
        <Tile label="Expected fund at 65" value={at65 !== null && at65 !== undefined ? m(at65) : "—"}
          color={RATE_COLORS[pick]} sub={chosen.lapse_age && chosen.lapse_age <= 65 ? `runs out at ${chosen.lapse_age}` : `at ${chosen.rate}% a year`} />
        {p.total_to_pay && (
          <Tile label="You'll pay in total" value={m(p.total_to_pay.amount)}
            sub={`${m(p.total_to_pay.left)} still to come, until age ${p.total_to_pay.until_age} (${dateLabel(p.total_to_pay.until)})`} />
        )}
        <Tile label="Cover" value={m(p.face)} sub={p.riders.length ? p.riders.map(r => `${r.name} to ${r.until_age}`).join(" · ") : "death benefit"} />
      </div>

      {chosen.lapse_age ? (
        <div style={{ marginTop: 10, padding: "10px 12px", borderRadius: 8, background: "var(--warn-bg)", border: "1px solid var(--warn-border)",
                      color: "var(--warn-text)", fontSize: 12, lineHeight: 1.5 }}>
          <strong>At {chosen.rate}% a year the fund runs out at age {chosen.lapse_age}.</strong> The insurance cost rises every year;
          if returns stay this low, you'd need to pay more (or reduce the cover) to keep the policy.
        </div>
      ) : (
        <div style={{ marginTop: 10, fontSize: 12, color: "var(--pos-text)" }}>
          At {chosen.rate}% a year the fund keeps up with the insurance cost for life.
        </div>
      )}

      {/* chart */}
      <div style={{ height: 220, marginTop: 14 }}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart margin={{ top: 6, right: 8, bottom: 0, left: 0 }}>
            <CartesianGrid stroke="var(--subtle2)" vertical={false} />
            <XAxis dataKey="age" type="number" domain={[p.issue_age, 90]} tick={{ fontSize: 11, fill: "var(--muted)" }}
              tickFormatter={a => `${Math.round(a)}`} allowDuplicatedCategory={false} />
            <YAxis tick={{ fontSize: 11, fill: "var(--muted)" }} width={54}
              tickFormatter={v => (v >= 1e6 ? `${(v / 1e6).toFixed(1)}M` : v >= 1000 ? `${Math.round(v / 1000)}k` : v)} />
            <Tooltip formatter={(v, name) => [m(v), name]} labelFormatter={a => `Age ${Math.floor(a)}`}
              contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 12 }} />
            {chart.lines.map((data, i) => (
              <Line key={rates[i]} data={data} dataKey="fund" name={`${rates[i]}% a year`} dot={false} isAnimationActive={false}
                stroke={RATE_COLORS[i]} strokeWidth={i === pick ? 2.5 : 1.2} strokeOpacity={i === pick ? 1 : 0.45} />
            ))}
            {chart.illustration.length > 0 && (
              <Line data={chart.illustration} dataKey="fund" name={`Illustration (${p.illustration.rate}%)`} dot={false}
                isAnimationActive={false} stroke="#7c3aed" strokeDasharray="5 4" strokeWidth={1.5} />
            )}
            {chart.actual.length > 0 && (
              <Line data={chart.actual} dataKey="fund" name="Statements" dot={false} isAnimationActive={false}
                stroke="var(--text)" strokeWidth={2.5} />
            )}
          </LineChart>
        </ResponsiveContainer>
      </div>
      <div style={{ display: "flex", gap: 14, flexWrap: "wrap", fontSize: 11, color: "var(--muted)", marginTop: 4 }}>
        {chart.actual.length > 0 && <span><span style={{ display: "inline-block", width: 14, height: 3, background: "var(--text)", verticalAlign: "middle", marginRight: 5 }} />Your statements</span>}
        {rates.map((r, i) => <span key={r}><span style={{ display: "inline-block", width: 14, height: 3, background: RATE_COLORS[i], verticalAlign: "middle", marginRight: 5 }} />{r}% a year</span>)}
        {chart.illustration.length > 0 && <span><span style={{ display: "inline-block", width: 14, borderTop: "2px dashed #7c3aed", verticalAlign: "middle", marginRight: 5 }} />Advisor's illustration ({p.illustration.rate}%)</span>}
      </div>

      {/* expected value table */}
      <div style={{ overflowX: "auto", marginTop: 12 }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
          <thead>
            <tr style={{ color: "var(--muted)", fontSize: 10, textTransform: "uppercase", letterSpacing: "0.4px" }}>
              <th style={{ ...cell, textAlign: "left" }}>At age</th>
              <th style={{ ...cell, textAlign: "left" }}>When</th>
              <th style={cell}>Paid in by then</th>
              {rates.map((r, i) => <th key={r} style={{ ...cell, color: RATE_COLORS[i] }}>{r}%</th>)}
              {p.illustration && <th style={{ ...cell, color: "#7c3aed" }}>Illustration</th>}
            </tr>
          </thead>
          <tbody>
            {["45", "55", "65", "75", "85"].filter(a => +a > p.age_now).map(a => {
              // Paid in is the same at every return; take it from any projection that reaches this age.
              const paidRow = p.projections.map(pr => pr.points.find(pt => pt.age === +a)).find(Boolean);
              const ill = p.illustration?.rows.find(r => r.age === +a);
              return (
                <tr key={a} style={{ borderTop: "1px solid var(--subtle2)" }}>
                  <td style={{ ...cell, textAlign: "left", fontWeight: 600 }}>{a}</td>
                  <td style={{ ...cell, textAlign: "left", color: "var(--muted)" }}>{dateLabel(anniversary(+a))}</td>
                  <td style={{ ...cell, color: "var(--muted)" }}>{paidRow ? m(paidRow.paid) : "—"}</td>
                  {p.projections.map((pr, i) => (
                    <td key={pr.rate} style={{ ...cell, fontWeight: i === pick ? 700 : 500, color: pr.at[a] === null ? "var(--neg-text)" : "var(--text)" }}>
                      {pr.at[a] === null ? "runs out" : m(pr.at[a])}
                    </td>
                  ))}
                  {p.illustration && <td style={cell}>{ill ? m(ill.value) : "—"}</td>}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", fontSize: 12, color: "var(--muted)", marginTop: 8 }}>
        <span>Assumes you pay {m(p.premium)} a month until age</span>
        <select value={p.pay_until_age ?? ""} disabled={busy} aria-label="Pay premiums until age"
          onChange={e => setPayUntil(e.target.value === "" ? null : parseInt(e.target.value, 10))}
          style={{ background: "var(--card)", color: "var(--text)", border: "1px solid var(--border)", borderRadius: 6, padding: "3px 6px", fontSize: 12 }}>
          {[50, 55, 60, 63, 65, 70, 75].map(a => <option key={a} value={a}>{a}</option>)}
          <option value="">for life</option>
        </select>
        <span>· returns after fund fees</span>
      </div>

      {/* ── Every year ahead, at the chosen return ── */}
      <button className="btn-secondary" onClick={() => setEveryYear(v => !v)} aria-expanded={everyYear}
        style={{ marginTop: 12, padding: "6px 12px", fontSize: 12, display: "inline-flex", alignItems: "center", gap: 5 }}>
        <Icon name={everyYear ? "chevron-up" : "chevron-down"} size={13} /> {everyYear ? "Hide every year" : `Show every year (at ${chosen.rate}%)`}
      </button>
      {everyYear && (
        <div style={{ overflowX: "auto", maxHeight: 420, overflowY: "auto", marginTop: 8, border: "1px solid var(--border)", borderRadius: 8 }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
            <thead style={{ position: "sticky", top: 0, background: "var(--card)" }}>
              <tr style={{ color: "var(--muted)", fontSize: 10, textTransform: "uppercase", letterSpacing: "0.4px" }}>
                <th style={{ ...cell, textAlign: "left" }}>Year</th><th style={cell}>Age</th><th style={cell}>Paid in</th>
                <th style={{ ...cell, color: RATE_COLORS[pick] }}>Fund</th><th style={cell}>If cancelled</th><th style={cell}>Insurance cost</th>
              </tr>
            </thead>
            <tbody>
              {chosen.points.map(pt => (
                <tr key={pt.date} style={{ borderTop: "1px solid var(--subtle2)", background: pt.age === p.pay_until_age ? "var(--subtle)" : undefined }}>
                  <td style={{ ...cell, textAlign: "left", color: "var(--muted)" }}>{dateLabel(pt.date)}</td>
                  <td style={cell}>{pt.age}</td>
                  <td style={{ ...cell, color: "var(--muted)" }}>{m(pt.paid)}</td>
                  <td style={{ ...cell, fontWeight: 700 }}>{m(pt.fund)}</td>
                  <td style={cell}>{m(pt.surrender)}</td>
                  <td style={{ ...cell, color: "var(--neg-text)" }}>−{m(pt.cost)}</td>
                </tr>
              ))}
              {chosen.lapse_age && (
                <tr style={{ borderTop: "1px solid var(--subtle2)" }}>
                  <td colSpan={6} style={{ ...cell, textAlign: "left", color: "var(--neg-text)", fontWeight: 600 }}>
                    The fund runs out at age {chosen.lapse_age} ({anniversary(chosen.lapse_age).slice(0, 4)}) at {chosen.rate}% a year.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
      {everyYear && p.pay_until_age && (
        <div style={{ fontSize: 11, color: "var(--faint2)", marginTop: 6 }}>
          The shaded row is age {p.pay_until_age}, when premiums stop. Values are at each policy anniversary.
        </div>
      )}

      {/* ── Each year ── */}
      {yearsWithData.length > 0 && (
        <>
          <div style={section}>Year by year (from your statements)</div>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
              <thead>
                <tr style={{ color: "var(--muted)", fontSize: 10, textTransform: "uppercase", letterSpacing: "0.4px" }}>
                  <th style={{ ...cell, textAlign: "left" }}>Policy year</th>
                  <th style={cell}>Paid in</th><th style={cell}>Insurance + fees</th><th style={cell}>Growth</th>
                  <th style={cell}>Return</th><th style={cell}>Fund at end</th>
                </tr>
              </thead>
              <tbody>
                {p.years.map(y => (
                  <tr key={y.from} style={{ borderTop: "1px solid var(--subtle2)" }}>
                    <td style={{ ...cell, textAlign: "left", color: "var(--muted)" }}>{dateLabel(y.from)} – {dateLabel(y.to)}</td>
                    <td style={cell}>{y.premiums !== null ? m(y.premiums) : "—"}</td>
                    <td style={{ ...cell, color: "var(--neg-text)" }}>{y.charges !== null ? `−${m(y.charges + (y.tax || 0))}` : "—"}</td>
                    <td style={{ ...cell, color: num(y.growth) >= 0 ? "#059669" : "var(--neg-text)" }}>{y.growth !== null ? `${num(y.growth) >= 0 ? "+" : "−"}${m(Math.abs(y.growth))}` : "—"}</td>
                    <td style={{ ...cell, fontWeight: 600 }}>{y.return_pct !== null ? `${y.return_pct}%` : "—"}</td>
                    <td style={{ ...cell, fontWeight: 700 }}>{y.fund_end !== null ? m(y.fund_end) : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* ── Cost of the cover ── */}
      <div style={section}>What the cover costs a year</div>
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
        {p.insurance_cost.map(c => (
          <div key={c.age} style={{ flex: "1 1 80px", background: "var(--bg)", border: "1px solid var(--border)", borderRadius: 8, padding: "6px 8px", textAlign: "center" }}>
            <div style={{ fontSize: 10, color: "var(--muted)", fontWeight: 600 }}>AGE {c.age}</div>
            <div style={{ fontSize: 13, fontWeight: 700 }}>{m(c.yearly)}</div>
          </div>
        ))}
      </div>
      <div style={{ fontSize: 11, color: "var(--faint2)", marginTop: 6 }}>
        From the insurer's guaranteed rates, on the full cover (a growing fund lowers it). Includes the policy fee and riders.
      </div>

      {p.note && <div style={{ fontSize: 11, color: "var(--faint2)", marginTop: 12 }}>{p.note}</div>}
      <div style={{ fontSize: 11, color: "var(--faint2)", marginTop: 4 }}>Projections, not guarantees: index-linked returns go up and down.</div>
      <div style={{ marginTop: 12 }}><PastePlan inv={inv} onSaved={onSaved} /></div>
    </div>
  );
}
