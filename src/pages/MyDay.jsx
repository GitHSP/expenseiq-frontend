import { useCallback, useEffect, useState } from "react";
import Icon from "../components/Icon";
import { dayAPI } from "../utils/api";
import QuoteCard from "../components/QuoteCard";

// My day: tomorrow's plan in time slots (built around work), today's slots to
// tick off, goals that need time (an exam, the gym) and the week's working
// hours, which Glacier asks for each Sunday. Backend: financial_planner/day_views.py.

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const KIND_COLOR = { routine: "var(--muted)", work: "#0070f3", goal: "var(--accent-text)", task: "#059669", other: "#7c3aed" };
const input = { background: "var(--card)", border: "1px solid var(--border)", borderRadius: 8, padding: "8px 10px",
                fontSize: 16, color: "var(--text)", fontFamily: "inherit", boxSizing: "border-box", minWidth: 0, maxWidth: "100%" };
const field = { display: "block", minWidth: 0, fontSize: 12, color: "var(--muted)" };
const head = { fontSize: 12, fontWeight: 600, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.6px", margin: "22px 2px 8px" };
const mins = m => (m >= 60 ? `${Math.floor(m / 60)} h${m % 60 ? ` ${m % 60} min` : ""}` : `${m} min`);
const dayLabel = iso => new Date(`${iso}T12:00:00`).toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" });

function Prompt({ icon, title, sub, action, onClick }) {
  return (
    <div className="card" style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 10, borderColor: "var(--accent-border)", background: "var(--accent-bg)" }}>
      <Icon name={icon} size={18} color="var(--accent-text)" />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 700, fontSize: 14 }}>{title}</div>
        <div style={{ fontSize: 12, color: "var(--muted)" }}>{sub}</div>
      </div>
      <button className="btn-primary" style={{ padding: "8px 14px", fontSize: 13, whiteSpace: "nowrap" }} onClick={onClick}>{action}</button>
    </div>
  );
}

// ── Slots ──
function Slots({ plan, run }) {
  if (!plan) return null;
  return (
    <div className="card" style={{ padding: 0, overflow: "hidden" }}>
      {plan.slots.map((s, i) => (
        <label key={s.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 14px", cursor: "pointer",
                                   borderTop: i ? "1px solid var(--border)" : "none", opacity: s.done ? 0.55 : 1 }}>
          <input type="checkbox" checked={s.done} style={{ width: 20, height: 20, accentColor: "var(--accent)", flexShrink: 0 }}
            onChange={() => run(() => dayAPI.updateSlot(s.id, { done: !s.done }))} />
          <span style={{ width: 94, fontSize: 13, fontWeight: 600, color: "var(--muted)", flexShrink: 0 }}>{s.start}–{s.end}</span>
          <span style={{ flex: 1, minWidth: 0, fontSize: 15, fontWeight: 600, textDecoration: s.done ? "line-through" : "none" }}>{s.title}</span>
          <span style={{ width: 8, height: 8, borderRadius: 4, background: KIND_COLOR[s.kind], flexShrink: 0 }} />
        </label>
      ))}
      {plan.unplaced.length > 0 && (
        <div style={{ padding: "10px 14px", fontSize: 12, color: "var(--warn-text)", borderTop: "1px solid var(--border)" }}>
          Didn't fit: {plan.unplaced.map(u => `${u.title} (${mins(u.minutes)})`).join(", ")}
        </div>
      )}
    </div>
  );
}

// ── Plan a day: a few questions, then the slots ──
function PlanForm({ data, date, onDone, run }) {
  const isTomorrow = date === data.tomorrow;
  const work = isTomorrow ? data.tomorrow_work : [];
  const [wake, setWake] = useState(data.profile.wake_time);
  const [bed, setBed] = useState(data.profile.bed_time);
  const [working, setWorking] = useState(work.length > 0);
  const [hours, setHours] = useState(work[0] || ["09:00", "17:00"]);
  const [todo, setTodo] = useState({ title: "", minutes: "30", at: "" });
  const tasks = data.tasks.filter(t => t.date === date);

  async function addTask() {
    if (!todo.title.trim()) return;
    await run(() => dayAPI.addTask({ title: todo.title.trim(), minutes: parseInt(todo.minutes, 10) || 30, date, at: todo.at || null }));
    setTodo({ title: "", minutes: "30", at: "" });
  }

  return (
    <div className="card">
      <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 12 }}>Plan {dayLabel(date)}</div>
      <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) minmax(0, 1fr)", gap: 10 }}>
        <label style={field}>Waking up at
          <input type="time" value={wake} onChange={e => setWake(e.target.value)} style={{ ...input, display: "block", width: "100%", marginTop: 4 }} /></label>
        <label style={field}>Bed at
          <input type="time" value={bed} onChange={e => setBed(e.target.value)} style={{ ...input, display: "block", width: "100%", marginTop: 4 }} /></label>
      </div>
      <div style={{ fontSize: 11, color: "var(--faint2)", marginTop: 4 }}>Times after midnight (like bed at 1 AM) are fine.</div>
      <label style={{ display: "flex", alignItems: "center", gap: 8, margin: "14px 0 8px", fontSize: 14, fontWeight: 600 }}>
        <input type="checkbox" checked={working} onChange={e => setWorking(e.target.checked)} style={{ width: 20, height: 20, accentColor: "var(--accent)" }} />
        Working that day
      </label>
      {working && (
        <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 6 }}>
          <input type="time" value={hours[0]} onChange={e => setHours([e.target.value, hours[1]])} style={{ ...input, flex: 1 }} aria-label="Work starts" />
          <span style={{ color: "var(--muted)" }}>to</span>
          <input type="time" value={hours[1]} onChange={e => setHours([hours[0], e.target.value])} style={{ ...input, flex: 1 }} aria-label="Work ends" />
        </div>
      )}

      <div style={{ fontSize: 13, fontWeight: 700, margin: "14px 0 6px" }}>What do you need to get done?</div>
      {tasks.map(t => (
        <div key={t.id} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 14, padding: "6px 0" }}>
          <span style={{ flex: 1 }}>{t.title}</span>
          <span style={{ color: "var(--muted)", fontSize: 12 }}>{t.at ? `at ${t.at} · ` : ""}{mins(t.minutes)}</span>
          <button className="btn-ghost" aria-label={`Remove ${t.title}`} style={{ padding: "4px 6px" }} onClick={() => run(() => dayAPI.deleteTask(t.id))}>
            <Icon name="x" size={14} />
          </button>
        </div>
      ))}
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
        <input value={todo.title} onChange={e => setTodo(v => ({ ...v, title: e.target.value }))} placeholder="e.g. Groceries"
          onKeyDown={e => e.key === "Enter" && addTask()} style={{ ...input, flex: "2 1 150px" }} aria-label="Task" />
        <select value={todo.minutes} onChange={e => setTodo(v => ({ ...v, minutes: e.target.value }))} style={{ ...input, flex: "1 1 90px" }} aria-label="How long">
          {[15, 30, 45, 60, 90, 120, 180].map(m => <option key={m} value={m}>{mins(m)}</option>)}
        </select>
        <input type="time" value={todo.at} onChange={e => setTodo(v => ({ ...v, at: e.target.value }))} style={{ ...input, flex: "1 1 100px" }}
          aria-label="At a set time (optional)" title="Optional: a set time" />
        <button className="btn-secondary" style={{ padding: "8px 12px" }} onClick={addTask}>Add</button>
      </div>
      <div style={{ fontSize: 12, color: "var(--muted)", margin: "8px 0 14px" }}>
        Your goals are added for you. Leave the time empty and Glacier finds a slot.
      </div>
      <button className="btn-primary" style={{ width: "100%", padding: "12px" }}
        onClick={() => run(async () => {
          const r = await dayAPI.plan({ date, wake_time: wake, bed_time: bed, working, work: working ? [hours] : [] });
          onDone();
          return r;
        })}>
        Build my plan
      </button>
    </div>
  );
}

// ── Goals ──
function Goals({ goals, run }) {
  const [form, setForm] = useState(null);
  return (
    <>
      <div style={head}>Goals</div>
      {goals.map(g => {
        const pct = g.week_target ? Math.min(100, Math.round(g.week_done / g.week_target * 100)) : 0;
        return (
          <div key={g.id} className="card" style={{ marginBottom: 8, opacity: g.is_active ? 1 : 0.55 }}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 8, alignItems: "baseline" }}>
              <span style={{ fontWeight: 700, fontSize: 15 }}>{g.name}</span>
              <button className="btn-ghost" aria-label={`Delete ${g.name}`} style={{ padding: "4px 6px", color: "var(--muted)" }}
                onClick={() => window.confirm(`Delete the goal ${g.name}?`) && run(() => dayAPI.deleteGoal(g.id))}>
                <Icon name="trash" size={13} />
              </button>
            </div>
            <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 2 }}>
              {mins(g.minutes_per_day)} a day{g.when !== "any" ? `, ${g.when}s` : ""}
              {g.deadline && ` · until ${dayLabel(g.deadline)} (${g.days_left} days left)`}
            </div>
            <div style={{ background: "var(--subtle2)", borderRadius: 100, height: 8, overflow: "hidden", margin: "8px 0 4px" }}>
              <div style={{ height: "100%", width: `${pct}%`, background: "var(--accent)", borderRadius: 100 }} />
            </div>
            <div style={{ fontSize: 12, color: "var(--muted)" }}>
              This week {mins(g.week_done)} of {mins(g.week_target)} · {mins(g.total_done)} in total
            </div>
          </div>
        );
      })}
      {form ? (
        <div className="card" style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. Study for AZ-900"
            style={input} aria-label="Goal" />
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <select value={form.minutes_per_day} onChange={e => setForm(f => ({ ...f, minutes_per_day: e.target.value }))} style={{ ...input, flex: 1 }} aria-label="Time a day">
              {[15, 30, 45, 60, 90, 120].map(m => <option key={m} value={m}>{mins(m)} a day</option>)}
            </select>
            <select value={form.when} onChange={e => setForm(f => ({ ...f, when: e.target.value }))} style={{ ...input, flex: 1 }} aria-label="When">
              <option value="any">Any time</option><option value="morning">Mornings</option><option value="evening">Evenings</option>
            </select>
          </div>
          <label style={{ fontSize: 12, color: "var(--muted)" }}>Until (optional, e.g. the exam date)
            <input type="date" value={form.deadline} onChange={e => setForm(f => ({ ...f, deadline: e.target.value }))} style={{ ...input, width: "100%", marginTop: 4 }} /></label>
          <div style={{ display: "flex", gap: 6 }}>
            <button className="btn-primary" style={{ padding: "8px 14px" }} disabled={form.name.trim().length < 2}
              onClick={() => run(async () => {
                await dayAPI.addGoal({ name: form.name.trim(), minutes_per_day: parseInt(form.minutes_per_day, 10), when: form.when, deadline: form.deadline || null });
                setForm(null);
              })}>Add goal</button>
            <button className="btn-secondary" style={{ padding: "8px 12px" }} onClick={() => setForm(null)}>Cancel</button>
          </div>
        </div>
      ) : (
        <button className="btn-secondary" style={{ padding: "8px 14px", fontSize: 13 }}
          onClick={() => setForm({ name: "", minutes_per_day: "60", when: "any", deadline: "" })}>+ Add a goal</button>
      )}
    </>
  );
}

// ── The week's working hours ──
function Week({ data, start, onSaved, run }) {
  const known = start === data.next_week.start ? data.next_week.days : start === data.week.start ? data.week.days : null;
  const fallback = data.week.days || {};
  const [days, setDays] = useState(() => Object.fromEntries(DAYS.map((_, i) => {
    const b = (known || fallback)[String(i)] || [];
    return [i, b.length ? { on: true, s: b[0][0], e: b[0][1] } : { on: false, s: "09:00", e: "17:00" }];
  })));
  const set = (i, v) => setDays(d => ({ ...d, [i]: { ...d[i], ...v } }));
  return (
    <div className="card">
      <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 2 }}>Working hours, week of {dayLabel(start)}</div>
      <div style={{ fontSize: 12, color: "var(--muted)", marginBottom: 10 }}>Untick your days off.</div>
      {DAYS.map((name, i) => (
        <div key={name} style={{ display: "flex", alignItems: "center", gap: 8, padding: "5px 0" }}>
          <label style={{ display: "flex", alignItems: "center", gap: 8, width: 70, fontWeight: 600, fontSize: 14 }}>
            <input type="checkbox" checked={days[i].on} onChange={e => set(i, { on: e.target.checked })} style={{ width: 18, height: 18, accentColor: "var(--accent)" }} />
            {name}
          </label>
          {days[i].on ? (
            <>
              <input type="time" value={days[i].s} onChange={e => set(i, { s: e.target.value })} style={{ ...input, flex: 1, padding: "6px 8px" }} aria-label={`${name} start`} />
              <span style={{ color: "var(--muted)", fontSize: 12 }}>to</span>
              <input type="time" value={days[i].e} onChange={e => set(i, { e: e.target.value })} style={{ ...input, flex: 1, padding: "6px 8px" }} aria-label={`${name} end`} />
            </>
          ) : <span style={{ fontSize: 13, color: "var(--muted)" }}>Day off</span>}
        </div>
      ))}
      <button className="btn-primary" style={{ width: "100%", padding: 11, marginTop: 10 }}
        onClick={() => run(async () => {
          await dayAPI.saveWeek({ week_start: start, days: Object.fromEntries(DAYS.map((_, i) => [String(i), days[i].on ? [[days[i].s, days[i].e]] : []])) });
          onSaved();
        })}>Save the week</button>
    </div>
  );
}

export default function MyDay({ expenses, fmt }) {
  const [data, setData] = useState(null);
  const [err, setErr] = useState("");
  const [tab, setTab] = useState("today");
  const [planning, setPlanning] = useState(null);       // a date being planned
  const [weekStart, setWeekStart] = useState(null);     // a week being edited

  const load = useCallback(() => dayAPI.get().then(setData).catch(e => setErr(e.message || "Couldn't load My day.")), []);
  useEffect(() => { load(); }, [load]);

  const run = useCallback(async fn => {
    setErr("");
    try {
      const r = await fn();
      if (r && r.today) setData(r); else await load();
    } catch (e) { setErr(e.message || "Something went wrong."); }
  }, [load]);

  if (!data) return <div style={{ padding: 40, textAlign: "center", color: "var(--muted)" }}>{err || "Loading..."}</div>;
  const date = tab === "today" ? data.today : data.tomorrow;
  const plan = data.plans[tab];

  return (
    <div style={{ maxWidth: 640, margin: "0 auto" }}>
      <div className="page-head"><h1 style={{ margin: 0, fontSize: 24 }}>My day</h1></div>
      <QuoteCard expenses={expenses} fmt={fmt} />

      {data.prompts.set_week && !weekStart && (
        <Prompt icon="calendar" title="Set your working hours" sub="Glacier plans your days around them. It asks each Sunday."
          action="Set week" onClick={() => setWeekStart(data.prompts.set_week_start)} />
      )}
      {data.prompts.plan_tomorrow && !planning && (
        <Prompt icon="sun" title="Plan tomorrow" sub="A few questions, then your day in time slots."
          action="Plan" onClick={() => { setTab("tomorrow"); setPlanning(data.tomorrow); }} />
      )}
      {weekStart && <div style={{ marginBottom: 12 }}><Week key={weekStart} data={data} start={weekStart} onSaved={() => setWeekStart(null)} run={run} /></div>}

      <div style={{ display: "flex", gap: 6, margin: "8px 0 10px" }}>
        {["today", "tomorrow"].map(t => (
          <button key={t} onClick={() => { setTab(t); setPlanning(null); }} aria-pressed={tab === t}
            style={{ padding: "8px 16px", borderRadius: 100, fontSize: 14, fontWeight: 600, cursor: "pointer", fontFamily: "inherit",
                     border: `1px solid ${tab === t ? "var(--accent)" : "var(--border)"}`, minHeight: 40,
                     background: tab === t ? "var(--accent-bg)" : "transparent", color: tab === t ? "var(--accent-text)" : "var(--muted)" }}>
            {t === "today" ? "Today" : "Tomorrow"}
          </button>
        ))}
      </div>

      {planning === date ? (
        <PlanForm data={data} date={date} run={run} onDone={() => setPlanning(null)} />
      ) : plan ? (
        <>
          <Slots plan={plan} run={run} />
          <button className="btn-secondary" style={{ marginTop: 10, padding: "8px 14px", fontSize: 13 }} onClick={() => setPlanning(date)}>
            Change the plan
          </button>
        </>
      ) : (
        <div className="card" style={{ textAlign: "center", padding: 24 }}>
          <div style={{ color: "var(--muted)", marginBottom: 12 }}>{tab === "today" ? "Today isn't planned." : "Tomorrow isn't planned yet."}</div>
          <button className="btn-primary" style={{ padding: "10px 18px" }} onClick={() => setPlanning(date)}>Plan {tab}</button>
        </div>
      )}
      {err && <div style={{ fontSize: 13, color: "var(--neg-text)", marginTop: 8 }}>{err}</div>}

      <Goals goals={data.goals} run={run} />

      <div style={head}>My week</div>
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
        <button className="btn-secondary" style={{ padding: "8px 14px", fontSize: 13 }} onClick={() => setWeekStart(data.week.start)}>This week's hours</button>
        <button className="btn-secondary" style={{ padding: "8px 14px", fontSize: 13 }} onClick={() => setWeekStart(data.next_week.start)}>Next week's hours</button>
      </div>
    </div>
  );
}
