import { useCallback, useEffect, useMemo, useState } from "react";
import Icon from "../components/Icon";
import { accountsAPI } from "../utils/api";

// Accounts: every bank account and card the user has uploaded statements for.
//   Overview      — accounts, which months have statements, and gaps
//   Recurring     — pre-authorized debits, subscriptions and bills found in
//                   the statements, as a list or month by month
//   Transactions  — everything on one account (or all) in a month, including
//                   transfers and card payments that aren't expenses

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const MONTHS_LONG = ["January", "February", "March", "April", "May", "June", "July",
                     "August", "September", "October", "November", "December"];
const KINDS = {
  chequing:    { label: "Chequing",    icon: "landmark" },
  savings:     { label: "Savings",     icon: "piggy-bank" },
  credit_card: { label: "Credit card", icon: "credit-card" },
  other:       { label: "Other",       icon: "wallet" },
};
const TX_KINDS = {
  expense:   { label: "Expense",          color: "#db2777" },
  income:    { label: "Income",           color: "#059669" },
  transfer:  { label: "Transfer",         color: "#7c3aed" },
  duplicate: { label: "Already recorded", color: "#d97706" },
  skipped:   { label: "Not saved",        color: "#64748b" },
};
const FREQ = { weekly: "Weekly", biweekly: "Every 2 weeks", monthly: "Monthly", quarterly: "Quarterly", yearly: "Yearly", once: "Seen once" };
const FULL = 0.97;      // coverage at or above this counts as the whole month

const monthLabel = ym => { const [y, m] = ym.split("-").map(Number); return `${MONTHS_LONG[m - 1]} ${y}`; };
const shortMonth = ym => { const [y, m] = ym.split("-").map(Number); return `${MONTHS[m - 1]} '${String(y).slice(2)}`; };
const dayLabel = iso => { const [, m, d] = iso.split("-").map(Number); return `${MONTHS[m - 1]} ${d}`; };
const ymOf = iso => iso.slice(0, 7);
const ordinal = n => {
  const teen = n % 100 >= 11 && n % 100 <= 13;
  return `${n}${teen ? "th" : { 1: "st", 2: "nd", 3: "rd" }[n % 10] || "th"}`;
};

function Badge({ color, children, title }) {
  return (
    <span title={title} style={{
      display: "inline-block", fontSize: 10, fontWeight: 700, color, background: `${color}14`,
      border: `1px solid ${color}40`, borderRadius: 4, padding: "0 5px", whiteSpace: "nowrap",
    }}>{children}</span>
  );
}

function Tabs({ tab, setTab }) {
  return (
    <div style={{ display: "flex", gap: 4, marginBottom: 20, background: "var(--card)", border: "1px solid var(--border)",
                  borderRadius: 10, padding: 4, overflowX: "auto", WebkitOverflowScrolling: "touch" }}>
      {[
        { id: "overview",     label: "Overview",     icon: "landmark" },
        { id: "recurring",    label: "Recurring",    icon: "repeat" },
        { id: "transactions", label: "Transactions", icon: "receipt" },
      ].map(t => (
        <button key={t.id} onClick={() => setTab(t.id)} style={{
          background: tab === t.id ? "#0070f3" : "transparent", color: tab === t.id ? "#fff" : "var(--muted)",
          border: "none", padding: "8px 18px", borderRadius: 7, fontWeight: 600, fontSize: 13, fontFamily: "inherit",
          cursor: "pointer", whiteSpace: "nowrap", display: "inline-flex", alignItems: "center", gap: 6,
        }}>
          <Icon name={t.icon} size={14} /> {t.label}
        </button>
      ))}
    </div>
  );
}

const selectStyle = {
  background: "var(--card)", color: "var(--text)", border: "1px solid var(--border)", borderRadius: 8,
  padding: "8px 10px", fontSize: 13, fontFamily: "inherit", maxWidth: "100%",
};

// Months touched by a stretch no statement covers, between two statements
// that were uploaded — a statement is probably missing there.
function gapMonths(account, months) {
  return months.filter(m => (account.missing || []).some(g => ymOf(g.start) <= m && ymOf(g.end) >= m));
}
const rangeLabel = (start, end) =>
  `${dayLabel(start)}${start.slice(0, 4) !== end.slice(0, 4) ? `, ${start.slice(0, 4)}` : ""} – ${dayLabel(end)}, ${end.slice(0, 4)}`;

// ─────────────────────────────────────────────
// Overview
// ─────────────────────────────────────────────

function CoverageGrid({ accounts, months, onOpen }) {
  return (
    <div className="card" style={{ marginBottom: 20 }}>
      <div className="card-title" style={{ marginBottom: 4, display: "flex", alignItems: "center", gap: 8 }}>
        <Icon name="calendar" size={16} /> Statements on file
      </div>
      <div style={{ fontSize: 12, color: "var(--muted)", marginBottom: 14, lineHeight: 1.5 }}>
        Which months each account has statements for. Card statements usually run mid-month to mid-month,
        so the first and last months show as partly covered.
      </div>
      <div style={{ overflowX: "auto", WebkitOverflowScrolling: "touch" }}>
        <table style={{ borderCollapse: "separate", borderSpacing: 3, fontSize: 12 }}>
          <thead>
            <tr>
              <th style={{ textAlign: "left", padding: "4px 8px", color: "var(--muted)", fontWeight: 600, position: "sticky", left: 0, background: "var(--card)" }}>Account</th>
              {months.map(m => (
                <th key={m} style={{ padding: "4px 2px", color: "var(--muted)", fontWeight: 600, whiteSpace: "nowrap", minWidth: 46 }}>{shortMonth(m)}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {accounts.map(a => {
              const gaps = new Set(gapMonths(a, months));
              return (
                <tr key={a.id}>
                  <td style={{ padding: "4px 8px", fontWeight: 600, whiteSpace: "nowrap", position: "sticky", left: 0, background: "var(--card)",
                               maxWidth: 180, overflow: "hidden", textOverflow: "ellipsis" }} title={a.name}>
                    {a.name}
                  </td>
                  {months.map(m => {
                    const c = a.coverage[m] || 0;
                    const gap = gaps.has(m);
                    const style = c >= FULL
                      ? { background: "#05966922", color: "#059669", border: "1px solid #05966955" }
                      : c > 0
                        ? { background: gap ? "#d9770618" : "var(--subtle)", color: gap ? "#b45309" : "var(--muted)", border: `1px ${gap ? "solid #d9770655" : "dashed var(--border)"}` }
                        : gap
                          ? { background: "#d9770618", color: "#b45309", border: "1px solid #d9770655" }
                          : { background: "transparent", color: "var(--faint2)", border: "1px dashed var(--subtle2)" };
                    const title = c >= FULL ? `${monthLabel(m)}: fully covered`
                      : c > 0 ? `${monthLabel(m)}: statements cover ${Math.round(c * 100)}% of the month${gap ? " — a statement is missing" : ""}`
                      : gap ? `${monthLabel(m)}: no statement uploaded` : `${monthLabel(m)}: none`;
                    return (
                      <td key={m} title={title}>
                        <button onClick={() => c > 0 && onOpen(a.id, m)} disabled={!c} aria-label={title}
                          style={{ ...style, width: 44, height: 28, borderRadius: 6, fontSize: 11, fontWeight: 700, fontFamily: "inherit",
                                   cursor: c ? "pointer" : "default", display: "inline-flex", alignItems: "center", justifyContent: "center" }}>
                          {c >= FULL ? <Icon name="check" size={13} /> : c > 0 ? `${Math.round(c * 100)}%` : gap ? "—" : ""}
                        </button>
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <div style={{ display: "flex", gap: 14, flexWrap: "wrap", fontSize: 11, color: "var(--muted)", marginTop: 10 }}>
        <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}><span style={{ width: 12, height: 12, borderRadius: 3, background: "#05966933" }} /> Whole month</span>
        <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}><span style={{ width: 12, height: 12, borderRadius: 3, border: "1px dashed var(--muted)" }} /> Part of the month</span>
        <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}><span style={{ width: 12, height: 12, borderRadius: 3, background: "#d9770633" }} /> A statement is missing</span>
        <span>Tap a month to see its transactions.</span>
      </div>
    </div>
  );
}

function AccountCard({ account, accounts, months, fmt, onOpen, onChanged, onEntriesDeleted }) {
  const others = accounts.filter(a => a.id !== account.id);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(account.name);
  const [kind, setKind] = useState(account.kind);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const k = KINDS[account.kind] || KINDS.other;
  const missing = account.missing || [];
  const statements = account.statements;
  const span = statements.length
    ? rangeLabel(statements.map(s => s.period_start).sort()[0], statements.map(s => s.period_end).sort().reverse()[0])
    : "";

  async function run(fn) {
    setBusy(true); setError("");
    try { await fn(); } catch (e) { setError(e.message || "Something went wrong"); } finally { setBusy(false); }
  }

  return (
    <div className="card" style={{ marginBottom: 12, padding: 16 }}>
      <div style={{ display: "flex", gap: 12, alignItems: "flex-start", flexWrap: "wrap" }}>
        <span style={{ width: 38, height: 38, borderRadius: 10, background: "#0070f31a", color: "#0070f3", flexShrink: 0,
                       display: "inline-flex", alignItems: "center", justifyContent: "center" }}>
          <Icon name={k.icon} size={18} />
        </span>
        <div style={{ flex: 1, minWidth: 180 }}>
          {editing ? (
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              <input value={name} onChange={e => setName(e.target.value)} aria-label="Account name" style={{ ...selectStyle, flex: 1, minWidth: 140 }} />
              <select value={kind} onChange={e => setKind(e.target.value)} style={selectStyle} aria-label="Account type">
                {Object.entries(KINDS).map(([id, v]) => <option key={id} value={id}>{v.label}</option>)}
              </select>
              <button className="btn-primary" disabled={busy || !name.trim()} style={{ padding: "7px 12px", fontSize: 12 }}
                onClick={() => run(async () => { await accountsAPI.update(account.id, { name: name.trim(), kind }); setEditing(false); onChanged(); })}>
                Save
              </button>
              <button className="btn-secondary" style={{ padding: "7px 12px", fontSize: 12 }}
                onClick={() => { setEditing(false); setName(account.name); setKind(account.kind); }}>Cancel</button>
            </div>
          ) : (
            <div style={{ fontWeight: 700, fontSize: 15, display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
              {account.name}
              <span style={{ fontSize: 11, fontWeight: 600, color: "var(--muted)" }}>{k.label}</span>
              {missing.length > 0 && <Badge color="#d97706" title="No statement uploaded for these dates">
                {missing.length === 1
                  ? `Statement missing: ${rangeLabel(missing[0].start, missing[0].end)}`
                  : `${missing.length} statements missing`}</Badge>}
            </div>
          )}
          <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 4 }}>
            {statements.length} statement{statements.length === 1 ? "" : "s"}{span && ` · ${span}`} · {account.transaction_count} transactions
          </div>
          {error && <div style={{ color: "#e11d48", fontSize: 12, marginTop: 6 }}>{error}</div>}
        </div>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          <button className="btn-secondary" style={{ padding: "6px 10px", fontSize: 12, display: "inline-flex", alignItems: "center", gap: 5 }}
            onClick={() => onOpen(account.id, account.last_date ? ymOf(account.last_date) : null)}>
            <Icon name="receipt" size={13} /> Transactions
          </button>
          <button className="btn-secondary" style={{ padding: "6px 10px", fontSize: 12, display: "inline-flex", alignItems: "center", gap: 5 }}
            onClick={() => setOpen(o => !o)} aria-expanded={open}>
            <Icon name="file-text" size={13} /> Statements <Icon name={open ? "chevron-up" : "chevron-down"} size={12} />
          </button>
          {others.length > 0 && (
            <select value="" disabled={busy} aria-label={`Merge ${account.name} into another account`}
              title="If this is the same account as another one (detected twice), merge it"
              style={{ ...selectStyle, padding: "5px 8px", fontSize: 12 }}
              onChange={e => {
                const into = others.find(a => String(a.id) === e.target.value);
                if (into && window.confirm(`Merge ${account.name} into ${into.name}?

Its ${statements.length} statement${statements.length === 1 ? "" : "s"} and all transactions move to ${into.name}, and ${account.name} is removed.`)) {
                  run(async () => { await accountsAPI.merge(account.id, into.id); onChanged(); });
                }
              }}>
              <option value="">Merge into…</option>
              {others.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
            </select>
          )}
          {!editing && (
            <button className="btn-ghost" style={{ padding: "6px 8px" }} aria-label={`Rename ${account.name}`} onClick={() => setEditing(true)}>
              <Icon name="pencil" size={14} />
            </button>
          )}
          <button className="btn-ghost" style={{ padding: "6px 8px", color: "#e11d48" }} aria-label={`Remove ${account.name}`} disabled={busy}
            onClick={() => window.confirm(`Remove ${account.name} and its ${statements.length} statement${statements.length === 1 ? "" : "s"}?\n\nExpenses and income already saved from them stay.`)
              && run(async () => { await accountsAPI.remove(account.id); onChanged(); })}>
            <Icon name="trash" size={14} />
          </button>
        </div>
      </div>

      {open && (
        <div style={{ marginTop: 12, borderTop: "1px solid var(--subtle2)" }}>
          {statements.map(s => (
            <div key={s.id} style={{ display: "flex", gap: 10, alignItems: "center", padding: "10px 0", borderBottom: "1px solid var(--subtle2)", flexWrap: "wrap", fontSize: 13 }}>
              <Icon name="file-text" size={14} style={{ color: "var(--muted)" }} />
              <div style={{ flex: 1, minWidth: 160 }}>
                <div style={{ fontWeight: 600 }}>{dayLabel(s.period_start)} – {dayLabel(s.period_end)}, {s.period_end.slice(0, 4)}</div>
                <div style={{ fontSize: 11, color: "var(--muted)", wordBreak: "break-all" }}>{s.filename} · {s.count} rows</div>
              </div>
              {others.length > 0 && (
                <select value="" disabled={busy} aria-label={`Move ${s.filename} to another account`}
                  style={{ ...selectStyle, padding: "4px 6px", fontSize: 11, maxWidth: 150 }}
                  onChange={e => {
                    const to = others.find(a => String(a.id) === e.target.value);
                    if (to) run(async () => { await accountsAPI.moveStatement(s.id, to.id); onChanged(); });
                  }}>
                  <option value="">Move to…</option>
                  {others.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                </select>
              )}
              <div style={{ fontSize: 12, textAlign: "right" }}>
                <div style={{ color: "#059669" }}>+{fmt(s.money_in)}</div>
                <div style={{ color: "#e11d48" }}>−{fmt(s.money_out)}</div>
              </div>
              <button className="btn-ghost" style={{ padding: "6px 8px", color: "#e11d48" }} aria-label={`Delete statement ${s.filename}`} disabled={busy}
                onClick={() => {
                  if (!window.confirm(`Delete the statement ${s.filename}?`)) return;
                  const entries = window.confirm("Also delete the expenses and income that were saved from it?\n\nOK = delete them too · Cancel = keep them");
                  run(async () => {
                    const r = await accountsAPI.removeStatement(s.id, entries);
                    if (entries && (r.deleted_expenses || r.deleted_income)) onEntriesDeleted(r);
                    onChanged();
                  });
                }}>
                <Icon name="trash" size={14} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────
// Recurring
// ─────────────────────────────────────────────

function RecurringRow({ item, accountsById, fmt }) {
  const [open, setOpen] = useState(false);
  const names = item.account_ids.map(id => accountsById[id]?.name).filter(Boolean).join(", ");
  const when = item.frequency === "monthly" ? `around the ${ordinal(item.day_of_month)}` : null;
  return (
    <div style={{ borderTop: "1px solid var(--subtle2)" }}>
      <button onClick={() => setOpen(o => !o)} aria-expanded={open}
        style={{ display: "flex", gap: 12, alignItems: "center", width: "100%", padding: "12px 16px", background: "transparent",
                 border: "none", cursor: "pointer", textAlign: "left", fontFamily: "inherit", color: "var(--text)" }}>
        <span style={{ width: 32, height: 32, borderRadius: 10, flexShrink: 0, display: "inline-flex", alignItems: "center", justifyContent: "center",
                       background: item.pre_authorized ? "#7c3aed1a" : "#0070f31a", color: item.pre_authorized ? "#7c3aed" : "#0070f3" }}>
          <Icon name={item.pre_authorized ? "shield-check" : "repeat"} size={16} />
        </span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 600, fontSize: 14, display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
            {item.name}
            {item.pre_authorized && <Badge color="#7c3aed" title="The bank lists this as pre-authorized / automatic">Pre-authorized</Badge>}
            {item.varies && item.frequency !== "once" && <Badge color="#0891b2" title="The amount changes from one charge to the next">Amount varies</Badge>}
            {item.status === "stopped" && <Badge color="#64748b" title="It hasn't appeared on your latest statements">Not seen recently</Badge>}
            {item.own_transfer && <Badge color="#64748b" title="Money moving to your own card or account — the purchases on that card are the spending, so it isn't added to the monthly total">Card payment · not in total</Badge>}
          </div>
          <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 2 }}>
            {FREQ[item.frequency]}{when && ` · ${when}`} · {names} · {item.category}
          </div>
        </div>
        <div style={{ textAlign: "right", flexShrink: 0 }}>
          <div style={{ fontWeight: 700, fontSize: 14 }}>{fmt(item.typical_amount)}</div>
          <div style={{ fontSize: 11, color: "var(--muted)" }}>
            {item.next_date ? `next ~${dayLabel(item.next_date)}` : `last ${dayLabel(item.last_date)}`}
          </div>
        </div>
        <Icon name={open ? "chevron-up" : "chevron-down"} size={14} style={{ color: "var(--muted)" }} />
      </button>
      {open && (
        <div style={{ padding: "0 16px 12px 60px", fontSize: 12 }}>
          {item.monthly_amount && item.frequency !== "monthly" && (
            <div style={{ color: "var(--muted)", marginBottom: 6 }}>About {fmt(item.monthly_amount)} a month</div>
          )}
          {[...item.occurrences].reverse().map(o => (
            <div key={o.id} style={{ display: "flex", justifyContent: "space-between", gap: 10, padding: "4px 0", borderBottom: "1px dashed var(--subtle2)" }}>
              <span>{dayLabel(o.date)}, {o.date.slice(0, 4)}</span>
              <span style={{ color: "var(--muted)", flex: 1, textAlign: "center", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {accountsById[o.account_id]?.name}
              </span>
              <span style={{ fontWeight: 600 }}>{fmt(o.amount)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// What a recurring charge did in one month: paid, missing from a statement
// that covers the month, or unknown because there's no statement yet.
function monthStatus(item, ym, accountsById) {
  const paid = item.occurrences.filter(o => ymOf(o.date) === ym);
  if (paid.length) return { state: "paid", paid };
  if (!["weekly", "biweekly", "monthly"].includes(item.frequency)) return null;
  if (ymOf(item.first_date) > ym) return null;
  if (item.status === "stopped" && ymOf(item.last_date) < ym) return null;
  const account = accountsById[item.occurrences[item.occurrences.length - 1].account_id];
  const c = account?.coverage[ym] || 0;
  if (c >= FULL) return { state: "missing" };
  if (c > 0) return { state: "partial" };
  const lastCovered = Object.keys(account?.coverage || {}).sort().pop();
  return { state: !lastCovered || ym > lastCovered ? "upcoming" : "unknown" };
}

const STATUS = {
  paid:     { label: "Paid",                    color: "#059669", icon: "check-circle" },
  missing:  { label: "Not on the statement",    color: "#e11d48", icon: "alert" },
  partial:  { label: "Not in the part uploaded", color: "#d97706", icon: "hourglass" },
  upcoming: { label: "Expected",                color: "#0070f3", icon: "calendar" },
  unknown:  { label: "No statement uploaded",   color: "#64748b", icon: "file-text" },
};

function RecurringTab({ recurring, accounts, months, fmt }) {
  const [account, setAccount] = useState("");
  const [padOnly, setPadOnly] = useState(false);
  const [view, setView] = useState("list");
  const accountsById = useMemo(() => Object.fromEntries(accounts.map(a => [a.id, a])), [accounts]);
  // Open on the latest month a statement fully covers.
  const latestMonth = useMemo(() => {
    const full = months.filter(m => accounts.some(a => (a.coverage[m] || 0) >= FULL));
    const any = months.filter(m => accounts.some(a => a.coverage[m]));
    return full[full.length - 1] || any[any.length - 1] || months[months.length - 1];
  }, [months, accounts]);
  const [month, setMonth] = useState(latestMonth);
  useEffect(() => { if (!months.includes(month)) setMonth(latestMonth); }, [months, month, latestMonth]);

  const items = recurring.items.filter(i =>
    (!account || i.account_ids.includes(Number(account))) && (!padOnly || i.pre_authorized));
  const active = items.filter(i => i.status === "active");
  const stopped = items.filter(i => i.status !== "active");
  const counted = active.filter(i => !i.own_transfer);
  const total = counted.reduce((s, i) => s + (parseFloat(i.monthly_amount) || 0), 0);
  const padCount = counted.filter(i => i.pre_authorized).length;

  const monthRows = items
    .map(i => ({ item: i, status: monthStatus(i, month, accountsById) }))
    .filter(r => r.status);
  const paidTotal = monthRows.filter(r => !r.item.own_transfer)
    .reduce((s, r) => s + (r.status.paid || []).reduce((t, o) => t + parseFloat(o.amount), 0), 0);
  const idx = months.indexOf(month);

  return (
    <>
      <div className="stat-grid" style={{ marginBottom: 20 }}>
        {[
          { label: "Recurring per month", value: fmt(total), sub: `${counted.length} active charge${counted.length === 1 ? "" : "s"}`, gradient: "linear-gradient(135deg, #0070f3, #0050b3)" },
          { label: "Pre-authorized", value: String(padCount), sub: "debits you've authorized", gradient: "linear-gradient(135deg, #7c3aed, #6d28d9)" },
          { label: "Per year", value: fmt(total * 12), sub: "at today's amounts", gradient: "linear-gradient(135deg, #059669, #047857)" },
          { label: "Not seen recently", value: String(stopped.length), sub: "possibly cancelled", gradient: "linear-gradient(135deg, #64748b, #475569)" },
        ].map(card => (
          <div key={card.label} style={{ background: card.gradient, borderRadius: 12, padding: 20, color: "#fff" }}>
            <div style={{ fontSize: 10, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.8px", opacity: 0.75, marginBottom: 8 }}>{card.label}</div>
            <div style={{ fontSize: 22, fontWeight: 800, letterSpacing: "-0.8px", lineHeight: 1.1, marginBottom: 6 }}>{card.value}</div>
            <div style={{ fontSize: 11, opacity: 0.7, fontWeight: 500 }}>{card.sub}</div>
          </div>
        ))}
      </div>

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center", marginBottom: 16 }}>
        <select value={account} onChange={e => setAccount(e.target.value)} style={selectStyle} aria-label="Account">
          <option value="">All accounts</option>
          {accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
        </select>
        <label style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 13, color: "var(--muted2)", cursor: "pointer" }}>
          <input type="checkbox" checked={padOnly} onChange={e => setPadOnly(e.target.checked)} /> Pre-authorized only
        </label>
        <div style={{ flex: 1 }} />
        {["list", "month"].map(v => (
          <button key={v} onClick={() => setView(v)} className={view === v ? "btn-primary" : "btn-secondary"}
            style={{ padding: "6px 12px", fontSize: 12, display: "inline-flex", alignItems: "center", gap: 5 }}>
            <Icon name={v === "list" ? "list-checks" : "calendar"} size={12} /> {v === "list" ? "All charges" : "By month"}
          </button>
        ))}
      </div>

      {recurring.items.length === 0 && (
        <div className="empty-state">
          <div className="empty-icon"><Icon name="repeat" size={40} strokeWidth={1.5} /></div>
          <div style={{ fontWeight: 600, color: "var(--faint)", fontSize: 15, marginBottom: 4 }}>No recurring charges yet</div>
          <div style={{ fontSize: 13, color: "var(--faint)" }}>Upload two or more months of statements and they'll be found automatically.</div>
        </div>
      )}

      {view === "list" && recurring.items.length > 0 && (
        <>
          <div className="card" style={{ padding: 0, overflow: "hidden", marginBottom: 16 }}>
            <div style={{ padding: "12px 16px", fontWeight: 700, fontSize: 13, display: "flex", justifyContent: "space-between" }}>
              <span>Active</span><span style={{ color: "var(--muted)" }}>{fmt(total)} / month</span>
            </div>
            {active.map(i => <RecurringRow key={i.key} item={i} accountsById={accountsById} fmt={fmt} />)}
            {!active.length && <div style={{ padding: "12px 16px", fontSize: 13, color: "var(--muted)", borderTop: "1px solid var(--subtle2)" }}>None match these filters.</div>}
          </div>
          {stopped.length > 0 && (
            <div className="card" style={{ padding: 0, overflow: "hidden", opacity: 0.85 }}>
              <div style={{ padding: "12px 16px", fontWeight: 700, fontSize: 13 }}>Not seen recently</div>
              {stopped.map(i => <RecurringRow key={i.key} item={i} accountsById={accountsById} fmt={fmt} />)}
            </div>
          )}
        </>
      )}

      {view === "month" && recurring.items.length > 0 && (
        <div className="card" style={{ padding: 0, overflow: "hidden" }}>
          <div style={{ padding: "12px 16px", display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            <button className="btn-ghost" disabled={idx <= 0} onClick={() => setMonth(months[idx - 1])} aria-label="Previous month" style={{ padding: "6px 8px" }}>
              <Icon name="chevron-left" size={16} />
            </button>
            <select value={month} onChange={e => setMonth(e.target.value)} style={selectStyle} aria-label="Month">
              {months.map(m => <option key={m} value={m}>{monthLabel(m)}</option>)}
            </select>
            <button className="btn-ghost" disabled={idx >= months.length - 1} onClick={() => setMonth(months[idx + 1])} aria-label="Next month" style={{ padding: "6px 8px" }}>
              <Icon name="chevron-right" size={16} />
            </button>
            <div style={{ flex: 1 }} />
            <span style={{ fontSize: 13, color: "var(--muted)" }}>Paid this month: <strong style={{ color: "var(--text)" }}>{fmt(paidTotal)}</strong></span>
          </div>
          {monthRows.map(({ item, status }) => {
            const st = STATUS[status.state];
            return (
              <div key={item.key} style={{ display: "flex", gap: 12, alignItems: "center", padding: "10px 16px", borderTop: "1px solid var(--subtle2)" }}>
                <span style={{ color: st.color, display: "inline-flex" }}><Icon name={st.icon} size={18} /></span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 600, fontSize: 14 }}>{item.name}</div>
                  <div style={{ fontSize: 12, color: st.color }}>
                    {status.state === "paid"
                      ? status.paid.map(o => `${dayLabel(o.date)} · ${accountsById[o.account_id]?.name || ""}`).join(" · ")
                      : st.label}
                  </div>
                </div>
                <div style={{ fontWeight: 700, fontSize: 14, color: status.state === "paid" ? "var(--text)" : "var(--muted)" }}>
                  {status.state === "paid"
                    ? fmt(status.paid.reduce((t, o) => t + parseFloat(o.amount), 0))
                    : `~${fmt(item.typical_amount)}`}
                </div>
              </div>
            );
          })}
          {!monthRows.length && <div style={{ padding: "12px 16px", fontSize: 13, color: "var(--muted)", borderTop: "1px solid var(--subtle2)" }}>No recurring charges in {monthLabel(month)}.</div>}
        </div>
      )}
    </>
  );
}

// ─────────────────────────────────────────────
// Transactions
// ─────────────────────────────────────────────

function TransactionsTab({ accounts, months, filter, setFilter, fmt }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [search, setSearch] = useState(filter.q || "");
  const { account, month, q } = filter;

  useEffect(() => {
    let cancelled = false;
    setLoading(true); setError("");
    accountsAPI.transactions({ account, month, q })
      .then(d => { if (!cancelled) { setData(d); if (!month) setFilter(f => ({ ...f, month: d.month })); } })
      .catch(e => !cancelled && setError(e.message || "Couldn't load transactions"))
      .finally(() => !cancelled && setLoading(false));
    return () => { cancelled = true; };
  }, [account, month, q, setFilter]);

  const shownMonth = month || data?.month;
  const idx = months.indexOf(shownMonth);
  const selected = accounts.find(a => String(a.id) === String(account));
  const cov = selected && shownMonth ? selected.coverage[shownMonth] || 0 : null;

  return (
    <>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center", marginBottom: 12 }}>
        <select value={account || ""} onChange={e => setFilter(f => ({ ...f, account: e.target.value }))} style={selectStyle} aria-label="Account">
          <option value="">All accounts</option>
          {accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
        </select>
        <span style={{ display: "inline-flex", alignItems: "center", gap: 2 }}>
          <button className="btn-ghost" disabled={idx <= 0} aria-label="Previous month" style={{ padding: "6px 8px" }}
            onClick={() => setFilter(f => ({ ...f, month: months[idx - 1] }))}><Icon name="chevron-left" size={16} /></button>
          <select value={shownMonth || ""} onChange={e => setFilter(f => ({ ...f, month: e.target.value }))} style={selectStyle} aria-label="Month">
            {months.map(m => <option key={m} value={m}>{monthLabel(m)}</option>)}
          </select>
          <button className="btn-ghost" disabled={idx < 0 || idx >= months.length - 1} aria-label="Next month" style={{ padding: "6px 8px" }}
            onClick={() => setFilter(f => ({ ...f, month: months[idx + 1] }))}><Icon name="chevron-right" size={16} /></button>
        </span>
        <form onSubmit={e => { e.preventDefault(); setFilter(f => ({ ...f, q: search.trim() })); }}
          style={{ display: "inline-flex", alignItems: "center", gap: 6, flex: 1, minWidth: 180 }}>
          <input value={search} onChange={e => setSearch(e.target.value)} onBlur={() => setFilter(f => ({ ...f, q: search.trim() }))}
            placeholder="Search this month" aria-label="Search transactions" style={{ ...selectStyle, flex: 1 }} />
        </form>
      </div>

      {cov !== null && cov < FULL && (
        <div style={{ fontSize: 12, color: "#b45309", background: "rgba(217,119,6,0.08)", border: "1px solid rgba(217,119,6,0.3)",
                      borderRadius: 8, padding: "8px 12px", marginBottom: 12 }}>
          {cov === 0
            ? `No ${selected.name} statement covers ${monthLabel(shownMonth)} yet.`
            : `The ${selected.name} statements uploaded cover ${Math.round(cov * 100)}% of ${monthLabel(shownMonth)} — upload the statement with the rest of the month to see everything.`}
        </div>
      )}

      {data && (
        <div style={{ display: "flex", gap: 16, flexWrap: "wrap", fontSize: 13, marginBottom: 12, color: "var(--muted2)" }}>
          <span>{data.count} transaction{data.count === 1 ? "" : "s"}</span>
          <span>Money in <strong style={{ color: "#059669" }}>{fmt(data.money_in)}</strong></span>
          <span>Money out <strong style={{ color: "#e11d48" }}>{fmt(data.money_out)}</strong></span>
        </div>
      )}
      {error && <div style={{ color: "#e11d48", fontSize: 13, marginBottom: 12 }}>{error}</div>}

      <div className="card" style={{ padding: 0, overflow: "auto", opacity: loading ? 0.6 : 1 }}>
        <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 620, fontSize: 13 }}>
          <thead style={{ background: "var(--subtle)" }}>
            <tr>
              {["Date", "Description", !account && "Account", "Type", "Amount"].filter(Boolean).map((h, i, arr) => (
                <th key={h} style={{ padding: "8px 12px", fontSize: 11, fontWeight: 700, color: "var(--muted)", textTransform: "uppercase",
                                     letterSpacing: "0.5px", textAlign: i === arr.length - 1 ? "right" : "left" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {(data?.transactions || []).map(t => {
              const k = TX_KINDS[t.kind] || TX_KINDS.skipped;
              const positive = parseFloat(t.amount) > 0;
              return (
                <tr key={t.id} style={{ borderTop: "1px solid var(--subtle2)" }}>
                  <td style={{ padding: "9px 12px", whiteSpace: "nowrap", color: "var(--muted)" }}>{dayLabel(t.date)}</td>
                  <td style={{ padding: "9px 12px" }}>
                    <div style={{ fontWeight: 600 }}>{t.title}</div>
                    {t.description.toLowerCase() !== t.title.toLowerCase() && (
                      <div style={{ fontSize: 11, color: "var(--muted)" }}>{t.description}</div>
                    )}
                  </td>
                  {!account && <td style={{ padding: "9px 12px", fontSize: 12, color: "var(--muted2)", whiteSpace: "nowrap" }}>{t.account}</td>}
                  <td style={{ padding: "9px 12px" }}>
                    <Badge color={k.color}>{k.label}</Badge>
                    {t.category && t.kind !== "income" && t.kind !== "transfer" && (
                      <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 2 }}>{t.category}</div>
                    )}
                  </td>
                  <td style={{ padding: "9px 12px", textAlign: "right", fontWeight: 700, whiteSpace: "nowrap", color: positive ? "#059669" : "var(--text)" }}>
                    {positive ? "+" : "−"}{fmt(Math.abs(parseFloat(t.amount)))}
                  </td>
                </tr>
              );
            })}
            {data && !data.transactions.length && (
              <tr><td colSpan={5} style={{ padding: 16, textAlign: "center", color: "var(--muted)" }}>
                Nothing {q ? `matching "${q}" ` : ""}in {monthLabel(shownMonth)}.
              </td></tr>
            )}
          </tbody>
        </table>
      </div>
      <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 8 }}>
        Everything on the statements — including transfers between your accounts and card payments, which aren't counted as spending.
      </div>
    </>
  );
}

// ─────────────────────────────────────────────

export default function Accounts({ formatAmount, onImport, refreshKey, onEntriesDeleted }) {
  const [tab, setTab] = useState("overview");
  const [data, setData] = useState(null);
  const [recurring, setRecurring] = useState({ items: [], monthly_total: "0.00" });
  const [error, setError] = useState("");
  const [filter, setFilter] = useState({ account: "", month: "", q: "" });

  const fmt = v => formatAmount ? formatAmount(parseFloat(v) || 0) : `$${(parseFloat(v) || 0).toFixed(2)}`;

  const load = useCallback(async () => {
    setError("");
    try {
      const [accounts, rec] = await Promise.all([accountsAPI.list(), accountsAPI.recurring()]);
      setData(accounts);
      setRecurring(rec);
    } catch (e) {
      setError(e.message || "Couldn't load your accounts");
    }
  }, []);
  useEffect(() => { load(); }, [load, refreshKey]);

  const openTransactions = (account, month) => {
    setFilter({ account: String(account || ""), month: month || "", q: "" });
    setTab("transactions");
  };

  const accounts = data?.accounts || [];
  const months = data?.months || [];
  const statementCount = accounts.reduce((s, a) => s + a.statements.length, 0);
  const kindsSummary = Object.entries(accounts.reduce((m, a) => ({ ...m, [a.kind]: (m[a.kind] || 0) + 1 }), {}))
    .map(([k, n]) => `${n} ${(KINDS[k]?.label || k).toLowerCase()}${n === 1 ? "" : k === "credit_card" ? "s" : ""}`).join(" · ");
  const gapCount = accounts.reduce((s, a) => s + (a.missing || []).length, 0);
  const covered = months.filter(m => accounts.some(a => a.coverage[m]));

  return (
    <>
      <div className="page-head">
        <div>
          <div className="page-title">Accounts</div>
          <div className="page-sub">Your statements, recurring charges and every transaction by account</div>
        </div>
        <button className="btn-primary page-head-action" onClick={onImport}>
          <Icon name="download" size={15} /> Import statements
        </button>
      </div>

      {error && <div style={{ color: "#e11d48", fontSize: 13, marginBottom: 12 }}>{error}</div>}
      {!data && !error && <div style={{ color: "var(--muted)", fontSize: 13 }}>Loading your accounts...</div>}

      {data && !accounts.length && (
        <div className="empty-state">
          <div className="empty-icon"><Icon name="landmark" size={40} strokeWidth={1.5} /></div>
          <div style={{ fontWeight: 600, color: "var(--faint)", fontSize: 15, marginBottom: 4 }}>No statements yet</div>
          <div style={{ fontSize: 13, color: "var(--faint)", marginBottom: 14, maxWidth: 420, marginLeft: "auto", marginRight: "auto", lineHeight: 1.6 }}>
            Import your bank and credit-card statements. Each one is kept under its account, so you can see every
            transaction, which months you've uploaded, and your pre-authorized debits and subscriptions.
          </div>
          <button className="btn-primary" onClick={onImport} style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
            <Icon name="download" size={15} /> Import statements
          </button>
        </div>
      )}

      {data && accounts.length > 0 && (
        <>
          <Tabs tab={tab} setTab={setTab} />

          {tab === "overview" && (
            <>
              <div className="stat-grid" style={{ marginBottom: 20 }}>
                {[
                  { label: "Accounts", value: String(accounts.length), sub: kindsSummary, gradient: "linear-gradient(135deg, #0070f3, #0050b3)" },
                  { label: "Statements", value: String(statementCount),
                    sub: covered.length ? `${shortMonth(covered[0])} – ${shortMonth(covered[covered.length - 1])}` : "", gradient: "linear-gradient(135deg, #0891b2, #0e7490)" },
                  { label: "Recurring / month", value: fmt(recurring.monthly_total),
                    sub: `${recurring.pre_authorized_count || 0} pre-authorized`, gradient: "linear-gradient(135deg, #7c3aed, #6d28d9)" },
                  { label: "Missing statements", value: String(gapCount), sub: gapCount ? "gaps between your statements" : "no gaps found",
                    gradient: gapCount ? "linear-gradient(135deg, #f59e0b, #d97706)" : "linear-gradient(135deg, #059669, #047857)" },
                ].map(card => (
                  <div key={card.label} style={{ background: card.gradient, borderRadius: 12, padding: 20, color: "#fff" }}>
                    <div style={{ fontSize: 10, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.8px", opacity: 0.75, marginBottom: 8 }}>{card.label}</div>
                    <div style={{ fontSize: 22, fontWeight: 800, letterSpacing: "-0.8px", lineHeight: 1.1, marginBottom: 6 }}>{card.value}</div>
                    <div style={{ fontSize: 11, opacity: 0.7, fontWeight: 500 }}>{card.sub}</div>
                  </div>
                ))}
              </div>
              <CoverageGrid accounts={accounts} months={months} onOpen={openTransactions} />
              {accounts.map(a => (
                <AccountCard key={`${a.id}-${a.name}-${a.kind}`} account={a} accounts={accounts} months={months} fmt={fmt}
                  onOpen={openTransactions} onChanged={load} onEntriesDeleted={r => onEntriesDeleted?.(r)} />
              ))}
            </>
          )}

          {tab === "recurring" && <RecurringTab recurring={recurring} accounts={accounts} months={months} fmt={fmt} />}

          {tab === "transactions" && (
            <TransactionsTab accounts={accounts} months={months} filter={filter} setFilter={setFilter} fmt={fmt} />
          )}
        </>
      )}
    </>
  );
}
