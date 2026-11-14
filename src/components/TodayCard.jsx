import { useEffect, useState } from "react";
import Icon from "./Icon";
import { dayAPI } from "../utils/api";

// Home: what's next today (from My day), or the Sunday / evening prompts.
// Hidden for anyone who hasn't started using My day.
export default function TodayCard({ refreshKey, onOpen }) {
  const [d, setD] = useState(null);
  useEffect(() => {
    let live = true;
    dayAPI.get().then(x => { if (live) setD(x); }).catch(() => {});
    return () => { live = false; };
  }, [refreshKey]);
  if (!d) return null;
  const plan = d.plans.today;
  const started = d.week.days || d.goals.length || plan || d.plans.tomorrow;
  if (!started && !d.prompts.set_week) return null;

  const nowHm = d.now.slice(11, 16);
  const nowMin = parseInt(nowHm.slice(0, 2), 10) * 60 + parseInt(nowHm.slice(3), 10);
  // Minutes from the start of the day; slots after midnight go past 1440.
  const next = plan?.slots.find(s => !s.done && s.end_min > nowMin);
  const done = plan ? plan.slots.filter(s => s.done).length : 0;
  const row = { width: "100%", display: "flex", alignItems: "center", gap: 12, padding: "12px 16px", background: "transparent",
                border: "none", textAlign: "left", cursor: "pointer", fontFamily: "inherit", color: "var(--text)", minHeight: 52 };
  const lines = [];
  if (d.prompts.set_week) lines.push({ icon: "calendar", title: "Set your working hours", sub: started ? "for the week ahead" : "so Glacier can plan your days", tone: "var(--accent-text)" });
  if (d.prompts.plan_tomorrow) lines.push({ icon: "sun", title: "Plan tomorrow", sub: "a few questions, two minutes", tone: "var(--accent-text)" });
  if (next) lines.push({ icon: "clock", title: next.title, sub: `${next.start}–${next.end}${next.start_min <= nowMin ? " · now" : " · next"} · ${done} of ${plan.slots.length} done` });
  else if (plan) lines.push({ icon: "check-circle", title: "Today's plan is done", sub: `${done} of ${plan.slots.length} ticked`, tone: "var(--pos-text)" });
  if (!lines.length) return null;

  return (
    <>
      <div style={{ fontSize: 12, fontWeight: 600, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.6px", margin: "0 2px 8px" }}>My day</div>
      <div className="card" style={{ padding: 0, overflow: "hidden", marginBottom: 20 }}>
        {lines.map((l, i) => (
          <button key={l.title} onClick={onOpen} style={{ ...row, borderTop: i ? "1px solid var(--border)" : "none" }}>
            <Icon name={l.icon} size={16} color={l.tone || "var(--text)"} />
            <span style={{ flex: 1, minWidth: 0 }}>
              <span style={{ display: "block", fontSize: 14, fontWeight: 600, color: l.tone || "var(--text)" }}>{l.title}</span>
              <span style={{ display: "block", fontSize: 12, color: "var(--muted)" }}>{l.sub}</span>
            </span>
            <Icon name="chevron-right" size={16} color="var(--muted)" />
          </button>
        ))}
      </div>
    </>
  );
}
