import { Area, AreaChart, ResponsiveContainer, Tooltip, YAxis } from "recharts";

// A card's balance from statement to statement, and how far it moved since the
// first one shown. Down is good (green), up is bad (red).
const short = iso => new Date(`${iso.length === 7 ? `${iso}-15` : iso}T12:00:00`)
  .toLocaleDateString("en-US", iso.length === 7 ? { month: "short", year: "numeric" } : { month: "short", day: "numeric", year: "numeric" });

export default function DebtTrend({ points, fmt, height = 44, label = "since", endLabel = "last statement" }) {
  if (!points || points.length < 2) return null;
  const data = points.map(p => ({ when: p.date || p.month, balance: parseFloat(p.balance) || 0 }));
  const first = data[0], last = data[data.length - 1];
  const change = last.balance - first.balance;
  const down = change <= 0;
  const color = down ? "#10b981" : "#f43f5e";
  return (
    <div style={{ marginTop: 12 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 8, fontSize: 12 }}>
        <span style={{ fontWeight: 600, color: down ? "var(--pos-text)" : "var(--neg-text)" }}>
          {down ? "▼" : "▲"} {fmt(Math.abs(change))} {label} {short(first.when).replace(/, \d{4}$/, "")}
        </span>
        <span style={{ color: "var(--muted)" }}>{endLabel} {short(last.when)}</span>
      </div>
      <div style={{ height, marginTop: 4 }}>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 4, right: 2, bottom: 0, left: 2 }}>
            <YAxis hide domain={["dataMin", "dataMax"]} />
            <Tooltip formatter={v => [fmt(v), "Balance"]} labelFormatter={(_, p) => (p?.[0] ? short(p[0].payload.when) : "")}
              contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 12, color: "var(--text)" }} />
            <Area type="monotone" dataKey="balance" stroke={color} strokeWidth={2} fill={color} fillOpacity={0.12}
              dot={false} activeDot={{ r: 3 }} isAnimationActive={false} />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
