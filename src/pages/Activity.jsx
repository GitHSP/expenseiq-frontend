import { useCallback, useEffect, useState } from "react";
import Icon from "../components/Icon";
import { activityAPI } from "../utils/api";

// History of changes to debts, checklist, recurring payments, the emergency
// fund, expenses and income — recorded by the backend from every source
// (the app, the AI assistant, statement imports, the monthly rollover).

const AREAS = {
  debt:      { label: "Debts",          icon: "credit-card", color: "#e11d48" },
  checklist: { label: "Checklist",      icon: "list-checks", color: "#059669" },
  plan:      { label: "Monthly plan",   icon: "calendar",    color: "#0891b2" },
  recurring: { label: "Recurring",      icon: "refresh",     color: "#0070f3" },
  import:    { label: "Imports",        icon: "download",    color: "#7c3aed" },
  fund:      { label: "Emergency fund", icon: "shield",      color: "#d97706" },
  expense:   { label: "Expenses",       icon: "receipt",     color: "#db2777" },
  income:    { label: "Income",         icon: "coins",       color: "#059669" },
};

const SOURCES = {
  app:       { label: "You",          icon: "user" },
  assistant: { label: "AI assistant", icon: "bot" },
  import:    { label: "Import",       icon: "download" },
  system:    { label: "Automatic",    icon: "timer" },
};

const NOUN = { debt: "debt", recurring: "recurring payment", fund: "emergency fund", expense: "expense", income: "income" };

const FILTERS = ["", "debt", "checklist", "plan", "recurring", "import", "fund", "expense", "income"];

const MONTHS = ["January", "February", "March", "April", "May", "June", "July",
                "August", "September", "October", "November", "December"];

function dayLabel(iso) {
  const d = new Date(iso);
  const today = new Date();
  const yesterday = new Date(); yesterday.setDate(today.getDate() - 1);
  const same = (a, b) => a.toDateString() === b.toDateString();
  if (same(d, today)) return "Today";
  if (same(d, yesterday)) return "Yesterday";
  return d.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric", year: "numeric" });
}

function monthLabel(ym) {
  if (!ym) return "";
  const [y, m] = ym.split("-").map(Number);
  return `${MONTHS[m - 1]} ${y}`;
}

function Change({ change, area, fmt }) {
  const show = v => {
    if (v === null || v === undefined || v === "") return "—";
    if (change.money) return fmt(v);
    if (v === true) return "Yes";
    if (v === false) return "No";
    return String(v);
  };
  const before = change.before, after = change.after;
  let delta = null;
  if (change.money && before !== null && after !== null) {
    const diff = parseFloat(after) - parseFloat(before);
    if (diff) {
      // For debts, going down is good news.
      const good = area === "debt" ? diff < 0 : diff > 0;
      delta = <span style={{ color: good ? "#059669" : "#e11d48", fontWeight: 700, marginLeft: 6 }}>
        ({diff > 0 ? "+" : "−"}{fmt(Math.abs(diff))})
      </span>;
    }
  }
  return (
    <div style={{ fontSize: 12, color: "var(--muted2)", display: "flex", flexWrap: "wrap", alignItems: "center", gap: 4 }}>
      <span style={{ fontWeight: 600, color: "var(--muted)" }}>{change.label}:</span>
      {before !== null && before !== undefined && <><span style={{ textDecoration: "line-through", opacity: 0.7 }}>{show(before)}</span><Icon name="arrow-right" size={11} /></>}
      <span style={{ fontWeight: 600, color: "var(--text)" }}>{show(after)}</span>
      {delta}
    </div>
  );
}

function headline(log, fmt) {
  const noun = NOUN[log.area];
  const d = log.details || {};
  switch (log.action) {
    case "created":  return <>Added {noun} <strong>{log.title}</strong></>;
    case "deleted":  return <>Deleted {noun} <strong>{log.title}</strong></>;
    case "updated":  return <>Updated {noun === "emergency fund" ? "the emergency fund" : <>{noun} <strong>{log.title}</strong></>}</>;
    case "ticked":   return <>Ticked <strong>{log.title}</strong>{d.amount ? ` (${fmt(d.amount)})` : ""} · {monthLabel(d.month)} checklist</>;
    case "unticked": return <>Unticked <strong>{log.title}</strong> · {monthLabel(d.month)} checklist</>;
    case "started":  return <><strong>{log.title}</strong> started — checklist built with {d.items} item{d.items === 1 ? "" : "s"}</>;
    case "imported": return (
      <>Imported {d.expenses} expense{d.expenses === 1 ? "" : "s"} ({fmt(d.expense_total || 0)}) and {d.income} income ({fmt(d.income_total || 0)})
        {d.ticked ? <> · ticked {d.ticked} Planner item{d.ticked === 1 ? "" : "s"}</> : null}</>
    );
    default:         return <>{log.action} <strong>{log.title}</strong></>;
  }
}

export default function Activity({ formatAmount }) {
  const [area,    setArea]    = useState("");
  const [items,   setItems]   = useState([]);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState("");

  const fmt = v => formatAmount ? formatAmount(parseFloat(v) || 0) : `$${(parseFloat(v) || 0).toFixed(2)}`;

  const load = useCallback(async (before) => {
    setLoading(true);
    setError("");
    try {
      const data = await activityAPI.list({ area, before, limit: 50 });
      setItems(prev => before ? [...prev, ...data.results] : data.results);
      setHasMore(data.has_more);
    } catch (err) {
      setError(err.message || "Couldn't load activity");
    } finally {
      setLoading(false);
    }
  }, [area]);

  useEffect(() => { load(); }, [load]);

  // Group consecutive entries by calendar day.
  const groups = [];
  items.forEach(log => {
    const label = dayLabel(log.created_at);
    if (!groups.length || groups[groups.length - 1].label !== label) groups.push({ label, logs: [] });
    groups[groups.length - 1].logs.push(log);
  });

  return (
    <>
      <div style={{ marginBottom: 20 }}>
        <div className="page-title">Activity</div>
        <div className="page-sub">Every change to your debts, checklist, payments and money — and what caused it</div>
      </div>

      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 18 }}>
        {FILTERS.map(f => (
          <button key={f || "all"} onClick={() => setArea(f)}
            className={area === f ? "btn-primary" : "btn-secondary"}
            style={{ padding: "6px 12px", fontSize: 12, display: "inline-flex", alignItems: "center", gap: 5 }}>
            {f && <Icon name={AREAS[f].icon} size={12} />}
            {f ? AREAS[f].label : "All"}
          </button>
        ))}
      </div>

      {error && <div style={{ color: "#e11d48", fontSize: 13, marginBottom: 12 }}>{error}</div>}

      {!loading && items.length === 0 && !error && (
        <div className="empty-state">
          <div className="empty-icon"><Icon name="history" size={40} strokeWidth={1.5} /></div>
          <div style={{ fontWeight: 600, color: "var(--faint)", fontSize: 15, marginBottom: 4 }}>No activity yet</div>
          <div style={{ fontSize: 13, color: "var(--faint)" }}>Changes you make from now on will show up here.</div>
        </div>
      )}

      {groups.map(group => (
        <div key={group.label} style={{ marginBottom: 18 }}>
          <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.6px", color: "var(--muted)", marginBottom: 8 }}>
            {group.label}
          </div>
          <div className="card" style={{ padding: 0, marginBottom: 0, overflow: "hidden" }}>
            {group.logs.map((log, i) => {
              const a = AREAS[log.area] || AREAS.debt;
              const src = SOURCES[log.source] || SOURCES.app;
              return (
                <div key={log.id} style={{ display: "flex", gap: 12, padding: "12px 16px",
                                           borderTop: i ? "1px solid var(--subtle2)" : "none" }}>
                  <span style={{ width: 32, height: 32, borderRadius: 10, background: `${a.color}1a`, color: a.color, flexShrink: 0,
                                 display: "inline-flex", alignItems: "center", justifyContent: "center" }}>
                    <Icon name={a.icon} size={16} />
                  </span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, color: "var(--text)", lineHeight: 1.4 }}>{headline(log, fmt)}</div>
                    {log.reason && (
                      <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 2 }}>Because: {log.reason}</div>
                    )}
                    {log.action === "updated" && log.changes.map(c => (
                      <Change key={c.field} change={c} area={log.area} fmt={fmt} />
                    ))}
                    {log.action === "imported" && log.details?.files && (
                      <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 2 }}>{log.details.files.join(", ")}</div>
                    )}
                  </div>
                  <div style={{ textAlign: "right", flexShrink: 0 }}>
                    <div style={{ fontSize: 11, color: "var(--faint2)" }}>
                      {new Date(log.created_at).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })}
                    </div>
                    <div style={{ fontSize: 10, fontWeight: 700, color: "var(--muted)", marginTop: 4,
                                  display: "inline-flex", alignItems: "center", gap: 3 }}>
                      <Icon name={src.icon} size={10} /> {src.label}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}

      {hasMore && (
        <div style={{ textAlign: "center" }}>
          <button className="btn-secondary" disabled={loading} onClick={() => load(items[items.length - 1]?.id)}>
            {loading ? "Loading..." : "Load older activity"}
          </button>
        </div>
      )}
      {loading && !items.length && <div style={{ color: "var(--muted)", fontSize: 13 }}>Loading activity...</div>}
    </>
  );
}
