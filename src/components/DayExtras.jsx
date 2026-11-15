import { useEffect, useState } from "react";
import Icon from "./Icon";
import { accountsAPI, dayAPI, financialPlannerAPI } from "../utils/api";

// My day extras: the smoke-free streak, the focus timer, and today's money.

const card = { marginBottom: 14 };
const label = { fontSize: 12, fontWeight: 600, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.6px", marginBottom: 8 };

// ── Smoke-free streak: one tap a day ──
export function SmokeCard({ smoke, fmt, run }) {
  const [changing, setChanging] = useState(false);
  const answer = smoked => run(async () => { const r = await dayAPI.smoke({ smoked }); setChanging(false); return r; });
  const ask = !smoke.asked_today || changing;
  const big = { fontSize: 30, fontWeight: 800, lineHeight: 1, letterSpacing: "-0.5px" };
  return (
    <div className="card" style={card}>
      <div style={label}>Smoke-free</div>
      {ask ? (
        <>
          <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 10 }}>
            {smoke.streak > 0 ? `${smoke.streak} day${smoke.streak === 1 ? "" : "s"} so far. Smoke-free today?` : "Smoke-free today?"}
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button className="btn-primary" style={{ flex: 1, padding: 12, fontSize: 15 }} onClick={() => answer(false)}>Yes, smoke-free</button>
            <button className="btn-secondary" style={{ flex: 1, padding: 12, fontSize: 15 }} onClick={() => answer(true)}>I smoked</button>
          </div>
        </>
      ) : (
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <div style={{ textAlign: "center", minWidth: 64 }}>
            <div style={{ ...big, color: smoke.streak ? "var(--pos-text)" : "var(--text)" }}>{smoke.streak}</div>
            <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 4 }}>day{smoke.streak === 1 ? "" : "s"}</div>
          </div>
          <div style={{ flex: 1, minWidth: 0, fontSize: 13, color: "var(--muted)", lineHeight: 1.5 }}>
            {smoke.smoked_today
              ? "Today's a reset, not a failure. Tomorrow is day one."
              : <>Smoke-free{parseFloat(smoke.saved) > 0 && fmt && <> · about <strong style={{ color: "var(--pos-text)" }}>{fmt(smoke.saved)}</strong> saved</>}</>}
            <div>Best: {smoke.best} day{smoke.best === 1 ? "" : "s"}</div>
          </div>
        </div>
      )}
      <div style={{ display: "flex", gap: 6, alignItems: "center", marginTop: 12 }}>
        {smoke.week.map(d => (
          <span key={d.date} title={d.date} style={{ flex: 1, height: 8, borderRadius: 4,
            background: d.smoked === false ? "#10b981" : d.smoked ? "#e11d48" : "var(--subtle2)" }} />
        ))}
        {smoke.asked_today && !changing && (
          <button className="btn-ghost" style={{ padding: "2px 6px", fontSize: 12, color: "var(--muted)" }} onClick={() => setChanging(true)}>Change</button>
        )}
      </div>
    </div>
  );
}

// ── Focus timer: one slot at a time, kept across reloads ──
const KEY = "glacier_focus";
export const readFocus = () => { try { return JSON.parse(localStorage.getItem(KEY) || "null"); } catch { return null; } };
export function startFocus(slot) {
  try { localStorage.setItem(KEY, JSON.stringify({ id: slot.id, title: slot.title, before: slot.focused_minutes || 0, at: Date.now() })); } catch {}
  window.dispatchEvent(new Event("glacier-focus"));
}

export function FocusBar({ run }) {
  const [f, setF] = useState(readFocus);
  const [, tick] = useState(0);
  useEffect(() => {
    const sync = () => setF(readFocus());
    window.addEventListener("glacier-focus", sync);
    const t = setInterval(() => tick(x => x + 1), 1000);
    return () => { window.removeEventListener("glacier-focus", sync); clearInterval(t); };
  }, []);
  if (!f) return null;
  const secs = Math.max(0, Math.floor((Date.now() - f.at) / 1000));
  const mm = String(Math.floor(secs / 60)).padStart(2, "0"), ss = String(secs % 60).padStart(2, "0");
  const stop = save => {
    try { localStorage.removeItem(KEY); } catch {}
    setF(null);
    if (save) run(() => dayAPI.updateSlot(f.id, { focused_minutes: f.before + Math.round(secs / 60) }));
  };
  return (
    <div className="card" style={{ ...card, display: "flex", alignItems: "center", gap: 12, borderColor: "var(--accent)", background: "var(--accent-bg)" }}>
      <Icon name="timer" size={20} color="var(--accent-text)" />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 12, color: "var(--muted)" }}>Focusing on</div>
        <div style={{ fontWeight: 700, fontSize: 15, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{f.title}</div>
      </div>
      <div style={{ fontSize: 24, fontWeight: 800, fontVariantNumeric: "tabular-nums" }}>{mm}:{ss}</div>
      <button className="btn-primary" style={{ padding: "10px 14px" }} onClick={() => stop(true)}>Stop</button>
      <button className="btn-ghost" aria-label="Cancel without saving" style={{ padding: "6px", color: "var(--muted)" }}
        onClick={() => window.confirm("Cancel this timer without saving the time?") && stop(false)}>
        <Icon name="x" size={16} />
      </button>
    </div>
  );
}

// ── Today's money: what's available and what's due today or tomorrow ──
export function MoneyToday({ fmt, onOpen }) {
  const [avail, setAvail] = useState(null);
  const [due, setDue] = useState([]);
  useEffect(() => {
    accountsAPI.available().then(setAvail).catch(() => {});
    financialPlannerAPI.getReminders().then(r => setDue((r.due || []).filter(d => d.days <= 1))).catch(() => {});
  }, []);
  const hasAvail = avail && avail.total_available !== null && avail.total_available !== undefined;
  if (!hasAvail && !due.length) return null;
  return (
    <button className="card" onClick={onOpen} style={{ ...card, width: "100%", textAlign: "left", cursor: "pointer", fontFamily: "inherit",
                                                       color: "var(--text)", display: "block" }}>
      <div style={label}>Today's money</div>
      {hasAvail && (
        <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 10 }}>
          <span style={{ fontSize: 14, color: "var(--muted)" }}>Available{avail.estimated ? " (estimate)" : ""}</span>
          <span style={{ fontSize: 22, fontWeight: 800, color: parseFloat(avail.total_available) < 0 ? "var(--neg-text)" : "var(--text)" }}>
            {fmt(avail.total_available)}
          </span>
        </div>
      )}
      {due.map(d => (
        <div key={`${d.label}-${d.date}`} style={{ display: "flex", justifyContent: "space-between", gap: 10, fontSize: 13, marginTop: 6 }}>
          <span style={{ color: d.days === 0 ? "var(--warn-text)" : "var(--muted)" }}>
            {d.days === 0 ? "Due today" : "Tomorrow"}: {d.label}{d.auto ? " (automatic)" : ""}
          </span>
          <span style={{ fontWeight: 600 }}>{fmt(d.amount)}</span>
        </div>
      ))}
      {!due.length && <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 6 }}>Nothing due today or tomorrow.</div>}
    </button>
  );
}
