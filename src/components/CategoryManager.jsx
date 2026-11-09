import { useEffect, useState } from "react";
import Icon from "./Icon";
import { BUILTIN_CATEGORIES } from "../constants/categories";
import { categoriesAPI } from "../utils/api";

// Expenses → Categories: hide the ones you don't use (their expenses move to
// another category first), show them again, or add your own.
const ICONS = ["package", "utensils", "car", "house", "gift", "coins", "briefcase", "laptop", "plane", "wine",
               "cigarette", "dumbbell", "shirt", "sparkles", "book", "film", "pill", "target", "calendar", "piggy-bank"];
const COLORS = ["#e11d48", "#f59e0b", "#10b981", "#0ea5e9", "#6366f1", "#a855f7", "#ec4899", "#14b8a6", "#78716c", "#64748b"];

const field = { background: "var(--card)", border: "1px solid var(--border)", borderRadius: 8, padding: "9px 11px",
                fontSize: 14, color: "var(--text)", fontFamily: "inherit", boxSizing: "border-box" };

export default function CategoryManager({ onChanged }) {
  const [rows, setRows] = useState(null);
  const [removing, setRemoving] = useState(null);            // { name, count, moveTo }
  const [form, setForm] = useState({ name: "", icon: "package", color: COLORS[0] });
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");

  useEffect(() => { categoriesAPI.list().then(d => setRows(d.categories)).catch(() => setErr("Couldn't load categories.")); }, []);

  async function act(body) {
    setBusy(true); setErr(""); setMsg("");
    try {
      const d = await categoriesAPI.change(body);
      setRows(d.categories);
      setMsg(d.message);
      onChanged?.(d.categories);
      return true;
    } catch (e) {
      setErr(e.message || "Couldn't save that.");
      return false;
    } finally {
      setBusy(false);
    }
  }

  if (!rows) return <div className="card" style={{ fontSize: 13, color: "var(--muted)" }}>{err || "Loading categories..."}</div>;

  const builtinIcon = Object.fromEntries(BUILTIN_CATEGORIES.map(c => [c.name, c]));
  const look = r => (r.builtin ? builtinIcon[r.name] : r) || { icon: "package", color: "#6b7280" };
  const visible = rows.filter(r => !r.hidden);
  const hidden = rows.filter(r => r.hidden);

  return (
    <div className="card" style={{ marginBottom: 16 }}>
      <div className="card-title" style={{ marginBottom: 4 }}>Categories</div>
      <div style={{ fontSize: 12, color: "var(--muted)", marginBottom: 12 }}>
        Remove one you don't use and its expenses move to the category you pick. Built-in ones can be shown again later.
      </div>
      {msg && <div style={{ fontSize: 12, color: "var(--pos-text)", marginBottom: 8 }}>{msg}</div>}
      {err && <div style={{ fontSize: 12, color: "var(--neg-text)", marginBottom: 8 }}>{err}</div>}

      {visible.map((r, i) => {
        const c = look(r);
        const open = removing?.name === r.name;
        return (
          <div key={r.name} style={{ padding: "10px 0", borderTop: i ? "1px solid var(--border)" : "none" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{ width: 30, height: 30, borderRadius: 15, display: "inline-flex", alignItems: "center", justifyContent: "center",
                             background: `${c.color}22`, color: c.color, flexShrink: 0 }}>
                <Icon name={c.icon} size={14} />
              </span>
              <span style={{ flex: 1, minWidth: 0 }}>
                <span style={{ display: "block", fontSize: 14, fontWeight: 600 }}>{r.name}{!r.builtin && <span style={{ fontSize: 11, color: "var(--muted)", fontWeight: 500 }}> · yours</span>}</span>
                <span style={{ display: "block", fontSize: 12, color: "var(--muted)" }}>{r.count} expense{r.count === 1 ? "" : "s"}</span>
              </span>
              {r.name !== "Other" && !open && (
                <button className="btn-ghost" disabled={busy} style={{ padding: "6px 8px", fontSize: 12, color: "var(--muted)" }}
                  onClick={() => setRemoving({ name: r.name, count: r.count, moveTo: "Other" })}>Remove</button>
              )}
            </div>
            {open && (
              <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginTop: 8, paddingLeft: 40 }}>
                <span style={{ fontSize: 12, color: "var(--muted)" }}>
                  {removing.count ? `Move its ${removing.count} expense${removing.count === 1 ? "" : "s"} to` : "Anything new goes to"}
                </span>
                <select value={removing.moveTo} aria-label="Move expenses to" style={{ ...field, padding: "7px 9px", fontSize: 13 }}
                  onChange={e => setRemoving(x => ({ ...x, moveTo: e.target.value }))}>
                  {visible.filter(v => v.name !== r.name).map(v => <option key={v.name} value={v.name}>{v.name}</option>)}
                </select>
                <button className="btn-primary" disabled={busy} style={{ padding: "7px 12px", fontSize: 12 }}
                  onClick={async () => { if (await act({ action: "remove", name: r.name, move_to: removing.moveTo })) setRemoving(null); }}>
                  Remove
                </button>
                <button className="btn-secondary" style={{ padding: "7px 12px", fontSize: 12 }} onClick={() => setRemoving(null)}>Cancel</button>
              </div>
            )}
          </div>
        );
      })}

      {hidden.length > 0 && (
        <div style={{ marginTop: 14, paddingTop: 12, borderTop: "1px solid var(--border)" }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: "var(--muted)", marginBottom: 6 }}>Hidden</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {hidden.map(r => (
              <button key={r.name} disabled={busy} onClick={() => act({ action: "show", name: r.name })}
                style={{ minHeight: 34, padding: "0 12px", borderRadius: 17, border: "1px solid var(--border)", background: "transparent",
                         color: "var(--muted)", fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "inherit",
                         display: "inline-flex", alignItems: "center", gap: 5 }}>
                <Icon name="plus" size={12} /> {r.name}
              </button>
            ))}
          </div>
        </div>
      )}

      <form onSubmit={async e => { e.preventDefault(); if (await act({ action: "add", ...form })) setForm(f => ({ ...f, name: "" })); }}
        style={{ marginTop: 14, paddingTop: 12, borderTop: "1px solid var(--border)" }}>
        <div style={{ fontSize: 12, fontWeight: 600, color: "var(--muted)", marginBottom: 8 }}>Add your own</div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} maxLength={40}
            placeholder="e.g. Pets, Car loan, Kids" aria-label="Category name" style={{ ...field, flex: "1 1 180px" }} />
          <button className="btn-primary" disabled={busy || form.name.trim().length < 2} style={{ padding: "9px 16px" }}>Add</button>
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 10 }}>
          {ICONS.map(ic => (
            <button type="button" key={ic} aria-label={`Icon ${ic}`} aria-pressed={form.icon === ic} onClick={() => setForm(f => ({ ...f, icon: ic }))}
              style={{ width: 34, height: 34, borderRadius: 8, cursor: "pointer", display: "inline-flex", alignItems: "center", justifyContent: "center",
                       background: form.icon === ic ? `${form.color}22` : "transparent", color: form.icon === ic ? form.color : "var(--muted)",
                       border: `1px solid ${form.icon === ic ? form.color : "var(--border)"}` }}>
              <Icon name={ic} size={15} />
            </button>
          ))}
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 10 }}>
          {COLORS.map(col => (
            <button type="button" key={col} aria-label={`Colour ${col}`} aria-pressed={form.color === col} onClick={() => setForm(f => ({ ...f, color: col }))}
              style={{ width: 26, height: 26, borderRadius: 13, background: col, cursor: "pointer",
                       border: form.color === col ? "2px solid var(--text)" : "2px solid transparent" }} />
          ))}
        </div>
      </form>
    </div>
  );
}
