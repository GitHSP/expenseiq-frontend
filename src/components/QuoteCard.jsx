import { useState } from "react";
import Icon from "./Icon";

// My day: a strong line to start the day, mostly about quitting smoking,
// with what smoking cost this month and last (from the user's expenses).
// A new one each day; "Another" shows the next.

const QUOTES = [
  "Every cigarette you don't smoke is a win nobody can take back.",
  "The craving lasts a few minutes. The regret lasts much longer. Wait it out.",
  "You're not giving something up. You're getting your life back.",
  "Each one you skip, your lungs start repairing. Let them.",
  "Smoking doesn't calm you down. It only calms the craving it created.",
  "You don't need a cigarette. You need ten minutes. Take a walk instead.",
  "The person you want to be doesn't smoke. Act like them today.",
  "Quitting is hard. Smoking is harder - it just hides the bill until later.",
  "One day at a time. Today is the only day you have to win.",
  "A slip isn't a fall. Put it out and start again right now.",
  "Every pack is money you worked hours for, burned in minutes.",
  "Your family wants you around for a long time. Choose that today.",
  "Cravings get weaker every time you say no. Say no once more.",
  "Discipline is choosing what you want most over what you want now.",
  "You've survived every craving so far. You'll survive this one too.",
  "Twenty minutes after your last cigarette, your heart rate starts to drop. Give it twenty minutes.",
  "Strong people aren't the ones who never want it. They're the ones who don't light it.",
  "Don't trade your future for five minutes of smoke.",
  "The best time to quit was years ago. The second best time is this one.",
  "Breathe in deep. That's what you're fighting for.",
  "Small wins every day become a new life. Win today.",
  "Your future self is watching. Make them proud.",
  "You are not your habits. You can change them, starting now.",
  "Freedom is not needing anything to feel okay.",
  "Hard days build strong people. This is one of them.",
  "Focus on the plan, not the mood. Moods pass; plans get you there.",
  "Study an hour, save a dollar, skip a smoke. That's how lives change.",
  "Nobody is coming to do it for you. Good - you've got this.",
  "Make today the day you look back on as the turning point.",
  "Progress, not perfection. Just better than yesterday.",
];

function dayOfYear() {
  const now = new Date();
  return Math.floor((now - new Date(now.getFullYear(), 0, 0)) / 86400000);
}

export default function QuoteCard({ expenses = [], fmt }) {
  const [i, setI] = useState(() => dayOfYear() % QUOTES.length);

  const now = new Date();
  const ym = d => d.slice(0, 7);
  const thisM = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const last = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const lastM = `${last.getFullYear()}-${String(last.getMonth() + 1).padStart(2, "0")}`;
  const smoke = m => expenses.filter(e => e.category === "Smoke & Vape" && ym(String(e.date)) === m)
                             .reduce((s, e) => s + (parseFloat(e.amount) || 0), 0);
  const nowSpent = smoke(thisM), lastSpent = smoke(lastM);
  const days = now.getDate();

  return (
    <div className="card" style={{ marginBottom: 14, borderColor: "var(--accent-border)",
                                   background: "linear-gradient(135deg, var(--accent-bg), transparent 70%)" }}>
      <div style={{ fontSize: 19, fontWeight: 700, lineHeight: 1.4, letterSpacing: "-0.2px" }}>
        “{QUOTES[i]}”
      </div>
      {(nowSpent > 0 || lastSpent > 0) && fmt && (
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 12, fontSize: 13, color: "var(--muted)" }}>
          <Icon name="cigarette" size={14} />
          <span>
            Smoking this month: <strong style={{ color: "var(--text)" }}>{fmt(nowSpent)}</strong> in {days} day{days === 1 ? "" : "s"}
            {lastSpent > 0 && <> · last month {fmt(lastSpent)}</>}
            {lastSpent > 0 && nowSpent < lastSpent * days / 30 && <span style={{ color: "var(--pos-text)" }}> · on track to spend less</span>}
          </span>
        </div>
      )}
      <button className="btn-ghost" onClick={() => setI(v => (v + 1) % QUOTES.length)}
        style={{ marginTop: 10, padding: "6px 0", fontSize: 13, color: "var(--accent-text)", display: "inline-flex", alignItems: "center", gap: 5 }}>
        <Icon name="refresh" size={13} /> Another
      </button>
    </div>
  );
}
