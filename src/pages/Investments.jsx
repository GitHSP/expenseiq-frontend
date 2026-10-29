import { useCallback, useEffect, useRef, useState } from "react";
import Icon from "../components/Icon";
import { financialPlannerAPI } from "../utils/api";

// Investments: insurance policies with a cash value, chits, recurring and
// fixed deposits, in India or Canada. Each is kept in its own currency (an Indian
// RD stays in rupees); the backend works out paid so far, value now and
// maturity (financial_planner/investments.py). Net worth at the top adds
// bank balances from the newest statements and takes off debts.

const KINDS = {
  insurance: { label: "Insurance",          plural: "Insurance",          icon: "shield",     color: "#0070f3" },
  chit:      { label: "Chit",               plural: "Chits",              icon: "coins",      color: "#d97706" },
  rd:        { label: "Recurring deposit",  plural: "Recurring deposits", icon: "piggy-bank", color: "#059669" },
  fd:        { label: "Fixed deposit",      plural: "Fixed deposits",     icon: "lock",       color: "#7c3aed" },
};
const PAYOUTS = { "": "Reinvested — paid at maturity", monthly: "Paid out monthly", quarterly: "Paid out quarterly", yearly: "Paid out yearly" };
const CURRENCIES = ["INR", "CAD", "USD", "GBP", "EUR", "AUD", "AED"];
const PAY_FREQ = { monthly: "Monthly", quarterly: "Quarterly", half_yearly: "Half-yearly", yearly: "Yearly" };
const POLICY_TYPES = ["Universal life", "Whole life", "Endowment", "Money back", "ULIP", "Term", "Other"];
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

const EMPTY = {
  kind: "insurance", name: "", provider: "", currency: "INR", start_date: "", recurring_item: "",
  payment: "", payment_frequency: "monthly", rate: "",
  policy_type: "", paying_years: "", term_years: "", sum_assured: "",
  current_value: "", current_value_date: "", maturity_value: "", yearly_cost: "", surrender_charge: "",
  months: "", chit_value: "", prized: false, prized_date: "", prize_amount: "",
  deposit_where: "", deposit_amount: "", deposit_rate: "", deposit_start: "",
  compounding: "quarterly", interest_payout: "", notes: "",
};
const NUMBER_FIELDS = ["payment", "rate", "paying_years", "term_years", "sum_assured", "current_value",
                       "maturity_value", "yearly_cost", "surrender_charge", "months", "chit_value", "prize_amount", "deposit_amount", "deposit_rate"];
const DATE_FIELDS = ["current_value_date", "prized_date", "deposit_start"];

const inputStyle = {
  width: "100%", background: "var(--card)", border: "1px solid var(--border)",
  borderRadius: 8, padding: "10px 12px", color: "var(--text)", fontSize: 13,
  fontFamily: "inherit", fontWeight: 500, outline: "none", boxSizing: "border-box",
};
const labelStyle = {
  display: "block", fontSize: 11, color: "var(--muted2)", fontWeight: 600,
  textTransform: "uppercase", letterSpacing: "0.6px", marginBottom: 5,
};
const iconBtn = {
  background: "transparent", border: "1px solid var(--border)", borderRadius: 6,
  padding: "5px 7px", cursor: "pointer", color: "var(--muted)",
  display: "inline-flex", alignItems: "center",
};

const num = v => parseFloat(v) || 0;
const count = (n, word) => `${n} ${word}${n === 1 ? "" : "s"}`;
const todayISO = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};
const dateLabel = iso => {
  if (!iso) return "—";
  const [y, m, d] = iso.split("-").map(Number);
  return `${MONTHS[m - 1]} ${d}, ${y}`;
};
const monthsLabel = n => {
  if (n === null || n === undefined) return "—";
  const y = Math.floor(n / 12), m = n % 12;
  return [y && `${y} yr`, (m || !y) && `${m} mo`].filter(Boolean).join(" ");
};
function addMonthsISO(iso, n) {
  const [y, m, d] = iso.split("-").map(Number);
  const t = new Date(y, m - 1 + n, 1);
  const last = new Date(t.getFullYear(), t.getMonth() + 1, 0).getDate();
  return `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, "0")}-${String(Math.min(d, last)).padStart(2, "0")}`;
}

// An amount in its own currency: ₹7,000 / CA$103.29.
function money(v, currency) {
  if (v === null || v === undefined || v === "") return "—";
  const n = parseFloat(v);
  const whole = currency === "INR" || Math.abs(n) >= 100000;
  return new Intl.NumberFormat("en-US", {      // same grouping as the rest of the app
    style: "currency", currency, minimumFractionDigits: whole ? 0 : 2, maximumFractionDigits: whole ? 0 : 2,
  }).format(n);
}

function Field({ label, children, hint }) {
  return (
    <div className="form-group">
      <label style={labelStyle}>{label}</label>
      {children}
      {hint && <div style={{ fontSize: 11, color: "var(--faint2)", marginTop: 4 }}>{hint}</div>}
    </div>
  );
}

function Stat({ label, value, sub, color }) {
  return (
    <div style={{ minWidth: 0 }}>
      <div style={{ fontSize: 10, color: "var(--muted)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.5px" }}>{label}</div>
      <div style={{ fontWeight: 700, fontSize: 14, color: color || "var(--text)", marginTop: 2 }}>{value}</div>
      {sub && <div style={{ fontSize: 11, color: "var(--faint2)", marginTop: 1 }}>{sub}</div>}
    </div>
  );
}

// ── Net worth ──

// One line of the breakdown: name, detail, CAD amount (and the original
// amount when it isn't CAD).
function BreakdownRow({ name, detail, cad, original, currency, negative, show, display }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "7px 0", borderBottom: "1px solid var(--subtle2)", fontSize: 13 }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 600, color: "var(--text)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{name}</div>
        {detail && <div style={{ fontSize: 11, color: "var(--faint2)" }}>{detail}</div>}
      </div>
      <div style={{ textAlign: "right", flexShrink: 0 }}>
        <div style={{ fontWeight: 700, color: negative ? "#e11d48" : cad < 0 ? "#e11d48" : "var(--text)" }}>
          {cad === null ? "—" : show(negative ? -cad : cad)}
        </div>
        {currency && currency !== display && original !== null && (
          <div style={{ fontSize: 11, color: "var(--faint2)" }}>{money(original, currency)}</div>
        )}
      </div>
    </div>
  );
}

const WORTH_BASIS = { fd: "value now", insurance: "cash value − surrender charge", rd: "value now", chit: "paid in, or deposit − still to pay" };

function NetWorth({ data, getRate, show, display }) {
  const [open, setOpen] = useState(false);
  if (!data) return null;
  // To CAD (getRate gives units of a currency per 1 CAD).
  const toCAD = (v, cur) => {
    if (v === null || v === undefined) return 0;
    const rate = cur === "CAD" ? 1 : getRate(cur);
    return rate ? num(v) / rate : 0;
  };
  const missingRate = data.investments.some(i => i.currency !== "CAD" && !getRate(i.currency));
  const banks = data.banks.reduce((s, b) => s + num(b.balance), 0);
  const india = data.investments.filter(i => i.currency === "INR").reduce((s, i) => s + toCAD(i.worth, i.currency), 0);
  const other = data.investments.filter(i => i.currency !== "INR").reduce((s, i) => s + toCAD(i.worth, i.currency), 0);
  const debts = data.debts.reduce((s, d) => s + num(d.balance), 0);
  const total = banks + india + other - debts;
  // The other of CAD / INR underneath the total.
  const alt = display === "INR" ? "CAD" : "INR";
  const altRate = alt === "CAD" ? 1 : getRate(alt);
  const noBalance = data.banks.filter(b => b.balance === null);

  const rows = [
    { label: "Bank balances", value: banks, sub: `${data.banks.length - noBalance.length} accounts, from latest statements`, color: "#0070f3" },
    { label: "Investments · Canada", value: other, sub: count(data.investments.filter(i => i.currency !== "INR").length, "item"), color: "#059669" },
    { label: "Investments · India", value: india, sub: count(data.investments.filter(i => i.currency === "INR").length, "item"), color: "#059669" },
    { label: "Debts", value: -debts, sub: count(data.debts.length, "debt"), color: "#e11d48" },
  ];
  return (
    <div className="card" style={{ marginBottom: 16 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", flexWrap: "wrap", gap: 8, marginBottom: 14 }}>
        <div>
          <div style={{ fontSize: 11, color: "var(--muted)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.5px" }}>Net worth</div>
          <div style={{ fontWeight: 800, fontSize: 28, letterSpacing: "-0.8px", color: total >= 0 ? "var(--text)" : "#e11d48" }}>
            {show(total)}
          </div>
          {altRate && <div style={{ fontSize: 13, color: "var(--muted)", fontWeight: 600 }}>{money(total * altRate, alt)}</div>}
        </div>
        <div style={{ fontSize: 11, color: "var(--faint2)", maxWidth: 280, textAlign: "right" }}>
          What you own minus what you owe, at today's exchange rate.
        </div>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 12 }}>
        {rows.map(r => (
          <Stat key={r.label} label={r.label} value={show(r.value)} sub={r.sub} color={r.color} />
        ))}
      </div>
      {(noBalance.length > 0 || missingRate) && (
        <div style={{ fontSize: 11, color: "#d97706", marginTop: 12 }}>
          {noBalance.length > 0 && `No closing balance found for ${noBalance.map(b => b.name).join(", ")}. `}
          {missingRate && "Exchange rates aren't loaded, so some investments aren't counted yet."}
        </div>
      )}

      <button className="btn-secondary" style={{ marginTop: 14, padding: "6px 12px", fontSize: 12 }} onClick={() => setOpen(o => !o)}>
        {open ? "Hide breakdown" : "Show breakdown"}
      </button>
      {open && (
        <div style={{ marginTop: 6 }}>
          {[
            {
              title: "Bank accounts", total: banks, color: "#0070f3",
              rows: data.banks.map(b => ({ key: `b${b.id}`, name: b.name, cad: b.balance === null ? null : num(b.balance),
                                           detail: b.as_of ? `Statement ending ${dateLabel(b.as_of)}` : "No closing balance found" })),
            },
            ...[["Investments · Canada", i => i.currency !== "INR", other], ["Investments · India", i => i.currency === "INR", india]]
              .map(([title, keep, total]) => ({
                title, total, color: "#059669",
                rows: data.investments.filter(keep).map(i => ({
                  key: `i${i.id}`, name: i.name, cad: toCAD(i.worth, i.currency), original: i.worth, currency: i.currency,
                  detail: `${KINDS[i.kind]?.label || i.kind} · ${WORTH_BASIS[i.kind] || ""}`,
                })),
              })),
            {
              title: "Debts", total: -debts, color: "#e11d48", negative: true,
              rows: data.debts.map(d => ({ key: `d${d.id}`, name: d.name, cad: num(d.balance), negative: true })),
            },
          ].filter(g => g.rows.length)
           .map(g => ({ ...g, rows: [...g.rows].sort((a, b) => (b.cad ?? -Infinity) - (a.cad ?? -Infinity)) }))   // biggest first
           .map(g => (
            <div key={g.title} style={{ marginTop: 14 }}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, fontWeight: 700, textTransform: "uppercase",
                            letterSpacing: "0.5px", color: g.color, paddingBottom: 4, borderBottom: `2px solid ${g.color}33` }}>
                <span>{g.title}</span>
                <span>{show(g.total)}</span>
              </div>
              {g.rows.map(({ key, ...r }) => <BreakdownRow key={key} {...r} show={show} display={display} />)}
            </div>
          ))}
          <div style={{ display: "flex", justifyContent: "space-between", marginTop: 14, fontWeight: 800, fontSize: 14 }}>
            <span>Net worth</span>
            <span style={{ color: total >= 0 ? "var(--text)" : "#e11d48" }}>{show(total)}</span>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Form ──

function InvestmentForm({ initial, recurring, onSave, onCancel, saving }) {
  const [f, setF] = useState(initial);
  const set = (k, v) => setF(p => ({ ...p, [k]: v }));
  const k = f.kind;
  const input = (key, props = {}) => (
    <input style={inputStyle} value={f[key] ?? ""} onChange={e => set(key, e.target.value)} {...props} />
  );
  const amount = (key, props = {}) => input(key, { type: "number", inputMode: "decimal", step: "any", placeholder: "0", ...props });

  return (
    <div className="card" style={{ marginBottom: 16, border: "1.5px solid #0070f3" }}>
      <div className="card-title" style={{ marginBottom: 14 }}>
        {initial.id ? `Edit ${KINDS[k].label}` : `New ${KINDS[k].label}`}
      </div>
      {!initial.id && (
        <div style={{ display: "flex", gap: 6, marginBottom: 14, flexWrap: "wrap" }}>
          {Object.entries(KINDS).map(([key, v]) => (
            <button key={key} onClick={() => set("kind", key)}
              className={key === k ? "btn-primary" : "btn-secondary"}
              style={{ padding: "7px 14px", fontSize: 12, display: "inline-flex", alignItems: "center", gap: 6 }}>
              <Icon name={v.icon} size={13} /> {v.label}
            </button>
          ))}
        </div>
      )}

      <div className="form-grid-2">
        <Field label="Name *">{input("name", { placeholder: { insurance: "e.g. iA iVARI", chit: "e.g. KSFE 5 lakh", rd: "e.g. SBI RD", fd: "e.g. Federal Bank FD" }[k] })}</Field>
        <Field label={k === "insurance" ? "Company" : k === "chit" ? "Organiser" : "Bank"}>{input("provider", { placeholder: "Optional" })}</Field>
        <Field label="Currency">
          <select style={inputStyle} value={f.currency} onChange={e => set("currency", e.target.value)}>
            {CURRENCIES.map(c => <option key={c}>{c}</option>)}
          </select>
        </Field>
        <Field label="Start date *">{input("start_date", { type: "date" })}</Field>
      </div>

      {k === "insurance" && (
        <div className="form-grid-2">
          <Field label="Policy type">
            <select style={inputStyle} value={f.policy_type} onChange={e => set("policy_type", e.target.value)}>
              <option value="">—</option>
              {POLICY_TYPES.map(t => <option key={t}>{t}</option>)}
            </select>
          </Field>
          <Field label="Premium *">{amount("payment")}</Field>
          <Field label="Paid">
            <select style={inputStyle} value={f.payment_frequency} onChange={e => set("payment_frequency", e.target.value)}>
              {Object.entries(PAY_FREQ).map(([key, v]) => <option key={key} value={key}>{v}</option>)}
            </select>
          </Field>
          <Field label="Expected return % a year" hint="Guaranteed rate plus expected bonus, if any">{amount("rate", { placeholder: "e.g. 5" })}</Field>
          <Field label="Premium-paying years">{amount("paying_years", { placeholder: "e.g. 20", step: 1 })}</Field>
          <Field label="Policy term (years to maturity)">{amount("term_years", { placeholder: "e.g. 25", step: 1 })}</Field>
          <Field label="Sum assured / death benefit">{amount("sum_assured")}</Field>
          <Field label="Maturity value (as quoted)">{amount("maturity_value", { placeholder: "Optional" })}</Field>
          <Field label="Cash value now" hint="From your latest policy statement — the projection starts from it">{amount("current_value", { placeholder: "Optional" })}</Field>
          <Field label="Cash value as of">{input("current_value_date", { type: "date" })}</Field>
          <Field label="Yearly cost" hint="Insurance cost + policy fee + premium tax from the statement — taken off the projection">
            {amount("yearly_cost", { placeholder: "Optional" })}
          </Field>
          <Field label="Surrender charge now" hint="From the statement; update it each year, 0 once it ends — taken off net worth">
            {amount("surrender_charge", { placeholder: "Optional" })}
          </Field>
        </div>
      )}

      {k === "chit" && (
        <>
          <div className="form-grid-2">
            <Field label="Chit total value *">{amount("chit_value", { placeholder: "e.g. 500000" })}</Field>
            <Field label="Number of months *">{amount("months", { placeholder: "e.g. 50", step: 1 })}</Field>
            <Field label="Usual monthly instalment" hint="Each month's actual amount goes in the payment log">{amount("payment")}</Field>
          </div>
          <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, margin: "4px 0 12px", cursor: "pointer" }}>
            <input type="checkbox" checked={!!f.prized} onChange={e => set("prized", e.target.checked)} />
            Chit prized (I've taken the amount)
          </label>
          {f.prized && (
            <div className="form-grid-2">
              <Field label="Prized on">{input("prized_date", { type: "date" })}</Field>
              <Field label="Amount received">{amount("prize_amount")}</Field>
              <Field label="Deposited?">
                <select style={inputStyle} value={f.deposit_where} onChange={e => set("deposit_where", e.target.value)}>
                  <option value="">Not deposited</option>
                  <option value="chit_company">With the chit company</option>
                  <option value="bank">Bank FD</option>
                </select>
              </Field>
              {f.deposit_where && <>
                <Field label="Deposit amount">{amount("deposit_amount")}</Field>
                <Field label="Deposit interest % a year">{amount("deposit_rate", { placeholder: "e.g. 7.5" })}</Field>
                <Field label="Deposit start">{input("deposit_start", { type: "date" })}</Field>
              </>}
            </div>
          )}
        </>
      )}

      {k === "rd" && (
        <div className="form-grid-2">
          <Field label="Monthly instalment *">{amount("payment")}</Field>
          <Field label="Interest % a year *">{amount("rate", { placeholder: "e.g. 7" })}</Field>
          <Field label="Tenure (months) *">{amount("months", { placeholder: "e.g. 60", step: 1 })}</Field>
          <Field label="Compounding">
            <select style={inputStyle} value={f.compounding} onChange={e => set("compounding", e.target.value)}>
              <option value="quarterly">Quarterly (Indian banks)</option>
              <option value="monthly">Monthly</option>
              <option value="yearly">Yearly</option>
            </select>
          </Field>
          <Field label="Maturity amount (as quoted)" hint="Leave empty to calculate it">{amount("maturity_value", { placeholder: "Optional" })}</Field>
        </div>
      )}

      {k === "fd" && (
        <div className="form-grid-2">
          <Field label="Amount deposited *">{amount("payment", { placeholder: "e.g. 100000" })}</Field>
          <Field label="Interest % a year *">{amount("rate", { placeholder: "e.g. 7.25" })}</Field>
          <Field label="Tenure (months) *">{amount("months", { placeholder: "e.g. 12", step: 1 })}</Field>
          <Field label="Interest">
            <select style={inputStyle} value={f.interest_payout} onChange={e => set("interest_payout", e.target.value)}>
              {Object.entries(PAYOUTS).map(([key, v]) => <option key={key} value={key}>{v}</option>)}
            </select>
          </Field>
          {!f.interest_payout && (
            <Field label="Compounding">
              <select style={inputStyle} value={f.compounding} onChange={e => set("compounding", e.target.value)}>
                <option value="quarterly">Quarterly (Indian banks)</option>
                <option value="monthly">Monthly</option>
                <option value="yearly">Yearly</option>
              </select>
            </Field>
          )}
          <Field label="Maturity amount (as quoted)" hint="From the FD receipt — leave empty to calculate it">{amount("maturity_value", { placeholder: "Optional" })}</Field>
        </div>
      )}

      <div className="form-grid-2">
        <Field label="Planner payment" hint="The recurring payment in Planner that pays this, if any">
          <select style={inputStyle} value={f.recurring_item ?? ""} onChange={e => set("recurring_item", e.target.value)}>
            <option value="">None</option>
            {recurring.filter(r => r.category !== "income").map(r => <option key={r.id} value={r.id}>{r.label}</option>)}
          </select>
        </Field>
        <Field label="Notes">{input("notes", { placeholder: "Policy number, branch…" })}</Field>
      </div>

      <div style={{ display: "flex", gap: 8 }}>
        <button className="btn-primary" disabled={saving} style={{ flex: 1 }} onClick={() => onSave(f)}>
          {saving ? "Saving..." : initial.id ? "Save Changes" : "Add"}
        </button>
        <button className="btn-secondary" onClick={onCancel}>Cancel</button>
      </div>
    </div>
  );
}

// ── Cards ──

function ChitLog({ inv, onAdd, onDelete, m, display }) {
  const next = inv.start_date ? addMonthsISO(inv.start_date, inv.payments.length) : todayISO();
  const [date, setDate] = useState(next);
  const [amount, setAmount] = useState("");
  useEffect(() => { setDate(next); }, [next]);
  const add = async () => {
    if (!amount || isNaN(parseFloat(amount))) return;
    if (await onAdd(inv, { date, amount: parseFloat(amount).toFixed(2) })) setAmount("");
  };
  return (
    <div style={{ marginTop: 12, borderTop: "1px solid var(--subtle2)", paddingTop: 12 }}>
      <div style={{ fontSize: 11, color: "var(--muted)", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 8 }}>
        Payments ({inv.payments.length} of {inv.months})
      </div>
      <div style={{ display: "flex", gap: 6, marginBottom: 10, flexWrap: "wrap" }}>
        <input style={{ ...inputStyle, width: 150, flex: "0 0 auto" }} type="date" value={date} onChange={e => setDate(e.target.value)} />
        <input style={{ ...inputStyle, width: 130, flex: "1 1 100px" }} type="number" inputMode="decimal" placeholder={`Paid (${inv.currency})`}
          value={amount} onChange={e => setAmount(e.target.value)} onKeyDown={e => e.key === "Enter" && add()} />
        <button className="btn-primary" style={{ padding: "8px 14px", fontSize: 12 }} onClick={add}>Add payment</button>
      </div>
      {inv.payments.length > 0 && (
        <div style={{ maxHeight: 220, overflowY: "auto" }}>
          {[...inv.payments].reverse().map((p, i) => (
            <div key={p.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "6px 0", fontSize: 13,
                                     borderBottom: "1px solid var(--subtle2)" }}>
              <span style={{ color: "var(--faint2)", width: 28, fontSize: 11 }}>#{inv.payments.length - i}</span>
              <span style={{ flex: 1, color: "var(--muted)" }}>{dateLabel(p.date)}</span>
              <span style={{ fontWeight: 600, textAlign: "right" }}>
                {m(p.amount)}
                {inv.currency !== display && <span style={{ fontWeight: 500, color: "var(--faint2)", fontSize: 11 }}> · {money(p.amount, inv.currency)}</span>}
              </span>
              <button style={{ ...iconBtn, padding: "3px 5px", color: "#e11d48" }} title="Remove"
                aria-label={`Remove payment of ${p.date}`} onClick={() => onDelete(inv, p)}>
                <Icon name="trash" size={11} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// Where each payment goes, and what the fund could be worth later at a low,
// expected and high return (index-linked returns aren't guaranteed).
function ExpectedValue({ s, m }) {
  const cell = { padding: "6px 4px", textAlign: "right", whiteSpace: "nowrap" };
  return (
    <div style={{ marginTop: 12, borderTop: "1px solid var(--subtle2)", paddingTop: 12 }}>
      {s.monthly_split && (
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 12, fontSize: 12 }}>
          {[["Each month you pay", s.monthly_split.premium, "var(--text)"],
            ["Insurance, fee & tax", s.monthly_split.cost, "#e11d48"],
            ["Goes into the fund", s.monthly_split.invested, "#059669"]].map(([label, v, color]) => (
            <div key={label} style={{ flex: "1 1 120px", background: "var(--bg)", border: "1px solid var(--border)", borderRadius: 8, padding: "8px 10px" }}>
              <div style={{ fontSize: 10, color: "var(--muted)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.4px" }}>{label}</div>
              <div style={{ fontWeight: 700, fontSize: 14, color }}>{m(v)}</div>
            </div>
          ))}
        </div>
      )}
      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
          <thead>
            <tr style={{ color: "var(--muted)", fontSize: 10, textTransform: "uppercase", letterSpacing: "0.4px" }}>
              <th style={{ ...cell, textAlign: "left" }}>By</th>
              <th style={cell}>Paid in</th>
              {s.expected_rates.map((r, i) => (
                <th key={r} style={{ ...cell, color: i === 1 || s.expected_rates.length === 1 ? "var(--text)" : undefined }}>
                  {r}%{s.expected_rates.length === 3 ? ["  low", "  expected", "  high"][i] : ""}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {s.expected.map(row => (
              <tr key={row.date} style={{ borderTop: "1px solid var(--subtle2)" }}>
                <td style={{ ...cell, textAlign: "left", color: "var(--muted)" }}>{dateLabel(row.date)}</td>
                <td style={{ ...cell, color: "var(--muted)" }}>{m(row.paid)}</td>
                {row.values.map((v, i) => (
                  <td key={i} style={{ ...cell, fontWeight: i === 1 ? 700 : 500, color: i === 1 ? "#059669" : "var(--text)" }}>{m(v)}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div style={{ fontSize: 11, color: "var(--faint2)", marginTop: 8 }}>
        Fund value before any surrender charge. Uses this year's cost every year — the insurance cost usually rises
        with age, so later values are on the high side. Update the yearly cost from each statement.
      </div>
    </div>
  );
}

function InvestmentCard({ inv, recurring, onEdit, onDelete, onAddPayment, onDeletePayment, show, display }) {
  const [open, setOpen] = useState(false);
  const kind = KINDS[inv.kind];
  const s = inv.summary || {};
  const m = v => show(v, inv.currency);
  const linked = recurring.find(r => r.id === inv.recurring_item);

  let stats = [], sub = [];
  if (inv.kind === "insurance") {
    sub = [inv.policy_type, `${m(inv.payment)} ${PAY_FREQ[inv.payment_frequency].toLowerCase()}`, num(inv.rate) ? `${num(inv.rate)}% expected` : null];
    stats = [
      { label: s.value_basis === "statement" ? "Cash value" : "Est. value now", value: m(s.value_now),
        sub: s.value_basis === "statement" ? `as of ${dateLabel(inv.current_value_date)}` : "estimate — add your cash value", color: "#059669" },
      ...(s.surrender_charge !== null && s.surrender_charge !== undefined ? [{
        label: "If cancelled now", value: m(s.surrender_value), sub: `after ${m(s.surrender_charge)} surrender charge`,
        color: num(s.surrender_value) > 0 ? "var(--text)" : "#e11d48",
      }] : []),
      { label: "Paid so far", value: m(s.paid_so_far), sub: `${s.payments_made} premiums` },
      { label: "Still to pay", value: s.still_to_pay !== null ? m(s.still_to_pay) : `${m(inv.payment)}/${inv.payment_frequency === "monthly" ? "mo" : PAY_FREQ[inv.payment_frequency].toLowerCase()}`,
        sub: s.premiums_end ? `${s.payments_left} more, until ${dateLabel(s.premiums_end)}` : "Ongoing — no set end" },
      { label: "At maturity", value: s.quoted_maturity ? m(s.quoted_maturity) : s.projected_maturity ? m(s.projected_maturity) : "—",
        sub: s.maturity_date ? `${dateLabel(s.maturity_date)} · ${monthsLabel(s.months_left)} left` : "Add the policy term",
        color: "#7c3aed" },
    ];
    if (s.quoted_maturity && s.projected_maturity) stats[3].sub += ` · projected ${m(s.projected_maturity)}`;
    if (inv.sum_assured) stats.push({ label: "Sum assured", value: m(inv.sum_assured) });
    if (inv.yearly_cost) stats.push({ label: "Yearly cost", value: m(inv.yearly_cost), sub: `~${m(num(inv.yearly_cost) / 12)}/month out of the fund` });
  } else if (inv.kind === "rd") {
    sub = [`${m(inv.payment)}/month`, `${num(inv.rate)}%`, `${inv.months} months`];
    stats = [
      { label: s.matured ? "Matured" : "Value now", value: m(s.value_now), color: "#059669" },
      { label: "Paid so far", value: m(s.paid_so_far), sub: `${s.payments_made} of ${inv.months}` },
      { label: "Still to pay", value: m(s.still_to_pay), sub: `${s.payments_left} instalments` },
      { label: "Maturity", value: m(s.maturity), sub: `${dateLabel(s.maturity_date)} · ${monthsLabel(s.months_left)} left`, color: "#7c3aed" },
      { label: "Interest earned", value: m(s.interest), sub: inv.maturity_value ? `calculated ${m(s.calculated_maturity)}` : null },
    ];
  } else if (inv.kind === "fd") {
    sub = [`${m(inv.payment)} deposited`, `${num(inv.rate)}%`, `${inv.months} months`, PAYOUTS[inv.interest_payout || ""]];
    stats = [
      { label: s.matured ? "Matured" : "Value now", value: m(s.value_now), color: "#059669",
        sub: inv.interest_payout ? "deposit stays the same" : `+${m(s.interest_so_far)} interest so far` },
      { label: "Maturity", value: m(s.maturity), sub: `${dateLabel(s.maturity_date)} · ${monthsLabel(s.months_left)} left`, color: "#7c3aed" },
      { label: "Total interest", value: m(s.interest), sub: inv.maturity_value && !inv.interest_payout ? `calculated ${m(s.calculated_maturity)}` : null },
    ];
    if (inv.interest_payout) stats.push({
      label: "Interest received", value: m(s.interest_received),
      sub: `${s.payouts_received} of ${s.payouts_total} · ${m(s.interest_per_payout)} each` });
  } else {
    sub = [`${m(inv.chit_value)} chit`, `${inv.months} months`, inv.prized ? "Prized" : "Not prized yet"];
    stats = [
      { label: "Paid so far", value: m(s.paid_so_far), sub: `${s.payments_made} of ${inv.months} months` },
      { label: "Still to pay", value: m(s.still_to_pay), sub: `${s.payments_left} more at ~${m(s.per_month_estimate)}` },
      { label: "Ends", value: dateLabel(s.end_date), sub: `${monthsLabel(s.months_left)} left` },
    ];
    if (inv.prized) {
      stats.push({ label: "Received", value: m(inv.prize_amount), sub: inv.prized_date ? dateLabel(inv.prized_date) : null, color: "#059669" });
      if (s.deposit_value_now) stats.push({
        label: inv.deposit_where === "bank" ? "Bank FD now" : "Deposit now", value: m(s.deposit_value_now),
        sub: `+${m(s.deposit_interest_so_far)} interest so far`, color: "#059669" });
    }
    stats.push({ label: inv.prized ? "Net result" : "Gain if taken last", value: m(s.net_result),
                 sub: "received + interest − all payments", color: num(s.net_result) >= 0 ? "#059669" : "#e11d48" });
  }

  return (
    <div className="card" style={{ marginBottom: 12, opacity: inv.is_active ? 1 : 0.55 }}>
      <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
        <span style={{ width: 34, height: 34, borderRadius: 10, background: `${kind.color}1a`, color: kind.color,
                       display: "inline-flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
          <Icon name={kind.icon} size={17} />
        </span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 700, fontSize: 14, color: "var(--text)" }}>
            {inv.name}
            <span style={{ fontWeight: 500, color: "var(--faint2)", fontSize: 12 }}>
              {inv.provider ? ` · ${inv.provider}` : ""} · {inv.currency}
            </span>
          </div>
          <div style={{ fontSize: 11, color: "var(--faint2)", marginTop: 2 }}>
            {[...sub.filter(Boolean), `since ${dateLabel(inv.start_date)}`, linked ? `paid by "${linked.label}" in Planner` : null].filter(Boolean).join(" · ")}
          </div>
        </div>
        <div style={{ display: "flex", gap: 4, flexShrink: 0 }}>
          <button style={iconBtn} onClick={() => onEdit(inv)} aria-label={`Edit ${inv.name}`} title="Edit"><Icon name="pencil" size={13} /></button>
          <button style={{ ...iconBtn, color: "#e11d48" }} onClick={() => onDelete(inv)} aria-label={`Delete ${inv.name}`} title="Delete"><Icon name="trash" size={13} /></button>
        </div>
      </div>

      {inv.kind === "chit" && s.months_behind > 0 && (
        <div style={{ fontSize: 12, color: "#d97706", marginTop: 10, fontWeight: 600 }}>
          {s.months_behind} month{s.months_behind === 1 ? "" : "s"} not logged yet
        </div>
      )}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))", gap: 12, marginTop: 14 }}>
        {stats.map(st => <Stat key={st.label} {...st} />)}
      </div>
      {inv.notes && <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 10 }}>{inv.notes}</div>}

      {inv.kind === "insurance" && s.expected?.length > 0 && (
        <>
          <button className="btn-secondary" style={{ marginTop: 12, padding: "6px 12px", fontSize: 12 }} onClick={() => setOpen(o => !o)}>
            {open ? "Hide expected value" : "Expected value"}
          </button>
          {open && <ExpectedValue s={s} m={m} />}
        </>
      )}
      {inv.kind === "chit" && (
        <>
          <button className="btn-secondary" style={{ marginTop: 12, padding: "6px 12px", fontSize: 12 }} onClick={() => setOpen(o => !o)}>
            {open ? "Hide payments" : "Monthly payments"}
          </button>
          {open && <ChitLog inv={inv} onAdd={onAddPayment} onDelete={onDeletePayment} m={m} display={display} />}
        </>
      )}
    </div>
  );
}

// ── Page ──

export default function Investments({
  getRate = c => (c === "CAD" ? 1 : null), currency = "CAD", formatAmount, showToast = () => {}, recurring = [],
}) {
  // An amount in `cur`, shown in the currency picked in the app: exact when
  // they're the same (₹7,000 stays ₹7,000), else converted at today's rate.
  const display = formatAmount && (currency === "CAD" || getRate(currency)) ? currency : "CAD";
  const show = (v, cur = "CAD") => {
    if (v === null || v === undefined || v === "") return "—";
    if (cur === display || !formatAmount) return money(v, cur);
    const rate = cur === "CAD" ? 1 : getRate(cur);
    return rate ? formatAmount(num(v) / rate) : money(v, cur);
  };
  const [items,    setItems]    = useState([]);
  const [worth,    setWorth]    = useState(null);
  const [loading,  setLoading]  = useState(true);
  const [form,     setForm]     = useState(null);
  const [saving,   setSaving]   = useState(false);

  const toast = useRef(showToast);
  toast.current = showToast;

  const load = useCallback(async () => {
    try {
      const [list, nw] = await Promise.all([financialPlannerAPI.getInvestments(), financialPlannerAPI.getNetWorth()]);
      setItems(Array.isArray(list) ? list : list.results || []);
      setWorth(nw);
    } catch (err) {
      toast.current(err.message || "Couldn't load investments", "error");
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => { load(); }, [load]);

  const refreshWorth = () => financialPlannerAPI.getNetWorth().then(setWorth).catch(() => {});
  const replace = inv => { setItems(list => list.map(i => (i.id === inv.id ? inv : i))); refreshWorth(); };

  function openAdd(kind = "insurance") { setForm({ ...EMPTY, kind }); }
  function openEdit(inv) {
    const f = { ...EMPTY };
    for (const key of Object.keys(EMPTY)) if (inv[key] !== null && inv[key] !== undefined) f[key] = inv[key];
    for (const key of NUMBER_FIELDS) if (f[key] !== "") f[key] = String(parseFloat(f[key]));
    setForm({ ...f, id: inv.id });
  }

  async function save(f) {
    if (!f.name.trim() || !f.start_date) { showToast("Enter a name and start date", "error"); return; }
    const data = { ...f, name: f.name.trim() };
    delete data.id;
    for (const key of NUMBER_FIELDS) data[key] = data[key] === "" || data[key] === null ? null : String(data[key]);
    for (const key of DATE_FIELDS) if (!data[key]) data[key] = null;
    data.payment = data.payment ?? "0";
    data.rate = data.rate ?? "0";
    data.recurring_item = data.recurring_item ? parseInt(data.recurring_item, 10) : null;
    if (!data.prized) Object.assign(data, { prized_date: null, prize_amount: null, deposit_where: "", deposit_amount: null, deposit_rate: null, deposit_start: null });
    if (!data.deposit_where) Object.assign(data, { deposit_amount: null, deposit_rate: null, deposit_start: null });
    setSaving(true);
    try {
      if (f.id) {
        replace(await financialPlannerAPI.updateInvestment(f.id, data));
        showToast(`Updated ${data.name}`);
      } else {
        const inv = await financialPlannerAPI.createInvestment(data);
        setItems(list => [...list, inv]);
        refreshWorth();
        showToast(`Added ${data.name}`);
      }
      setForm(null);
    } catch (err) {
      showToast(err.message || "Failed to save", "error");
    } finally {
      setSaving(false);
    }
  }

  async function remove(inv) {
    if (!window.confirm(`Delete "${inv.name}"?${inv.payments?.length ? `\n\nIts ${inv.payments.length} logged payments go too.` : ""}`)) return;
    try {
      await financialPlannerAPI.deleteInvestment(inv.id);
      setItems(list => list.filter(i => i.id !== inv.id));
      refreshWorth();
      showToast(`Deleted ${inv.name}`, "error");
    } catch (err) {
      showToast(err.message || "Failed to delete", "error");
    }
  }

  async function addPayment(inv, data) {
    try {
      replace(await financialPlannerAPI.addInvestmentPayment(inv.id, data));
      return true;
    } catch (err) {
      showToast(err.message || "Failed to add payment", "error");
      return false;
    }
  }
  async function deletePayment(inv, p) {
    try {
      replace(await financialPlannerAPI.deleteInvestmentPayment(inv.id, p.id));
    } catch (err) {
      showToast(err.message || "Failed to remove payment", "error");
    }
  }

  return (
    <div>
      <div className="page-head">
        <div>
          <div className="page-title">Investments</div>
          <div className="page-sub">Insurance, chits and deposits in India and Canada</div>
        </div>
        <button className="btn-primary page-head-action" onClick={() => openAdd()}>
          <Icon name="plus" size={15} /> Add Investment
        </button>
      </div>

      <NetWorth data={worth} getRate={getRate} show={show} display={display} />

      {form && (
        <InvestmentForm key={form.id || form.kind} initial={form} recurring={recurring} saving={saving}
          onSave={save} onCancel={() => setForm(null)} />
      )}

      {loading ? (
        <div style={{ color: "var(--muted)", fontSize: 13 }}>Loading…</div>
      ) : items.length === 0 && !form ? (
        <div className="empty-state">
          <div className="empty-icon"><Icon name="piggy-bank" size={40} strokeWidth={1.5} /></div>
          <div style={{ fontWeight: 600, color: "var(--faint)", fontSize: 15, marginBottom: 6 }}>No investments yet</div>
          <div style={{ fontSize: 13, color: "var(--faint)", marginBottom: 14 }}>Add an insurance policy, a chit, an RD or an FD.</div>
          <div style={{ display: "flex", gap: 8, justifyContent: "center", flexWrap: "wrap" }}>
            {Object.entries(KINDS).map(([key, v]) => (
              <button key={key} className="btn-secondary" onClick={() => openAdd(key)}
                style={{ padding: "7px 14px", fontSize: 12, display: "inline-flex", alignItems: "center", gap: 6 }}>
                <Icon name={v.icon} size={13} /> {v.label}
              </button>
            ))}
          </div>
        </div>
      ) : Object.entries(KINDS).map(([key, v]) => {
        const group = items.filter(i => i.kind === key);
        if (!group.length) return null;
        return (
          <div key={key} style={{ marginBottom: 8 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", margin: "6px 0 10px" }}>
              <div style={{ fontWeight: 700, fontSize: 13, color: "var(--text)" }}>{v.plural}</div>
              <button className="btn-secondary" onClick={() => openAdd(key)} style={{ padding: "5px 12px", fontSize: 12 }}>+ Add</button>
            </div>
            {group.map(inv => (
              <InvestmentCard key={inv.id} inv={inv} recurring={recurring} onEdit={openEdit} onDelete={remove}
                onAddPayment={addPayment} onDeletePayment={deletePayment} show={show} display={display} />
            ))}
          </div>
        );
      })}
    </div>
  );
}
