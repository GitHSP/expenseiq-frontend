import { useEffect, useState } from "react";
import Icon from "../components/Icon";
import { adminAPI } from "../utils/api";

// Admin only: choose which pages each user can open. Everyone only ever sees
// their own data; this decides which features they get. Aurora is also
// blocked on the server when it's off (it uses the AI credits).

const LABELS = {
  day: "My day", dashboard: "Dashboard", expenses: "Expenses", analytics: "Analytics", payments: "Planner",
  accounts: "Accounts", investments: "Invest", activity: "Activity", aurora: "Aurora (AI)",
};

function UserRow({ u, pages, onSave }) {
  const all = u.pages === null;
  const [chosen, setChosen] = useState(() => new Set(all ? pages : u.pages));
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState("");
  const toggle = p => setChosen(s => { const n = new Set(s); n.has(p) ? n.delete(p) : n.add(p); return n; });

  async function save(value) {
    setBusy(true); setNote("");
    try { await onSave(u.id, value); setNote("Saved"); }
    catch (e) { setNote(e.message || "Couldn't save."); }
    finally { setBusy(false); }
  }

  return (
    <div className="card" style={{ marginBottom: 12 }}>
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 8, flexWrap: "wrap" }}>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontWeight: 700, fontSize: 15, overflowWrap: "anywhere" }}>{u.username || u.email}</div>
          <div style={{ fontSize: 12, color: "var(--muted)", overflowWrap: "anywhere" }}>
            {u.email} · joined {u.joined}{u.last_login ? ` · last in ${u.last_login.slice(0, 10)}` : ""}
          </div>
        </div>
        <span style={{ fontSize: 12, fontWeight: 600, color: u.is_staff ? "var(--accent-text)" : all ? "var(--pos-text)" : "var(--muted)" }}>
          {u.is_staff ? "Admin: every page" : all ? "Every page" : `${u.pages.length} of ${pages.length} pages`}
        </span>
      </div>
      {!u.is_staff && (
        <>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 12 }}>
            {pages.map(p => (
              <button key={p} onClick={() => toggle(p)} aria-pressed={chosen.has(p)}
                style={{ minHeight: 36, padding: "6px 12px", borderRadius: 100, fontSize: 13, fontWeight: 600, cursor: "pointer",
                         fontFamily: "inherit", display: "inline-flex", alignItems: "center", gap: 5,
                         border: `1px solid ${chosen.has(p) ? "var(--accent)" : "var(--border)"}`,
                         background: chosen.has(p) ? "var(--accent-bg)" : "transparent",
                         color: chosen.has(p) ? "var(--accent-text)" : "var(--muted)" }}>
                <Icon name={chosen.has(p) ? "check" : "plus"} size={12} /> {LABELS[p] || p}
              </button>
            ))}
          </div>
          <div style={{ display: "flex", gap: 8, alignItems: "center", marginTop: 12, flexWrap: "wrap" }}>
            <button className="btn-primary" disabled={busy || chosen.size === 0} style={{ padding: "8px 16px", fontSize: 13 }}
              onClick={() => save(pages.filter(p => chosen.has(p)))}>Save</button>
            <button className="btn-secondary" disabled={busy} style={{ padding: "8px 14px", fontSize: 13 }}
              onClick={() => { setChosen(new Set(pages)); save(null); }}>Allow every page</button>
            {note && <span style={{ fontSize: 12, color: "var(--muted)" }}>{note}</span>}
          </div>
        </>
      )}
    </div>
  );
}

export default function AdminUsers() {
  const [data, setData] = useState(null);
  const [err, setErr] = useState("");
  useEffect(() => { adminAPI.users().then(setData).catch(e => setErr(e.message || "Couldn't load users.")); }, []);

  async function save(id, pages) {
    const updated = await adminAPI.setPages(id, pages);
    setData(d => ({ ...d, users: d.users.map(u => (u.id === id ? updated : u)) }));
  }

  return (
    <div style={{ maxWidth: 760, margin: "0 auto" }}>
      <div className="page-head">
        <div>
          <h1 style={{ margin: 0, fontSize: 24 }}>Users</h1>
          <div style={{ fontSize: 13, color: "var(--muted)", marginTop: 4 }}>
            Choose the pages each person can open. Profile is always there. Changes show the next time they open Glacier.
          </div>
        </div>
      </div>
      {err && <div style={{ color: "var(--neg-text)" }}>{err}</div>}
      {!data && !err && <div style={{ color: "var(--muted)" }}>Loading...</div>}
      {data && data.users.map(u => <UserRow key={u.id} u={u} pages={data.pages} onSave={save} />)}
    </div>
  );
}
