import { useEffect, useState } from "react";
import Icon from "./Icon";
import { financialPlannerAPI } from "../utils/api";

// Dashboard: what needs attention in the next 7 days. Hidden when there's nothing.
export default function ComingUp({ fmt, refreshKey, onOpenAccounts, onOpenPlanner }) {
  const [data, setData] = useState(null);

  useEffect(() => {
    let live = true;
    financialPlannerAPI.getReminders().then(d => { if (live) setData(d); }).catch(() => {});
    return () => { live = false; };
  }, [refreshKey]);

  if (!data) return null;
  const rows = [
    ...data.due.map(d => ({
      key: `due-${d.label}-${d.date}`, icon: d.auto ? "repeat" : "calendar", label: d.label,
      sub: `${d.days === 0 ? "Today" : d.days === 1 ? "Tomorrow" : `In ${d.days} days`} · ${new Date(`${d.date}T12:00:00`).toLocaleDateString("en-US", { month: "short", day: "numeric" })}${d.auto ? " · automatic" : ""}`,
      value: fmt(d.amount), tone: d.days <= 1 ? "var(--warn-text)" : undefined, onClick: onOpenPlanner,
    })),
    // Several cards near their limit, or several accounts behind on statements: one line each.
    ...(data.limits.length === 1 ? [{
      key: "limit", icon: "credit-card", label: `${data.limits[0].label} is near its limit`,
      sub: `${fmt(data.limits[0].room)} of room left`, tone: "var(--neg-text)", onClick: onOpenPlanner,
    }] : data.limits.length > 1 ? [{
      key: "limits", icon: "credit-card", label: `${data.limits.length} cards are near their limit`,
      sub: data.limits.map(c => `${c.label} ${fmt(c.room)}`).join(" · "), tone: "var(--neg-text)", onClick: onOpenPlanner,
    }] : []),
    ...data.budgets.map(b => ({
      key: `budget-${b.label}`, icon: "target", label: `${b.label} limit`,
      sub: `${fmt(b.spent)} of ${fmt(b.limit)} spent`, value: `${Math.round(b.percent)}%`,
      tone: b.percent >= 100 ? "var(--neg-text)" : "var(--warn-text)", onClick: onOpenPlanner,
    })),
    ...(data.uploads.length ? [{
      key: "uploads", icon: "file-text",
      label: data.uploads.length === 1 ? `Upload ${data.uploads[0].label} statements` : `Upload statements for ${data.uploads.length} accounts`,
      sub: data.uploads.length === 1
        ? `Latest goes to ${new Date(`${data.uploads[0].through}T12:00:00`).toLocaleDateString("en-US", { month: "short", day: "numeric" })}`
        : "So your numbers stay up to date",
      onClick: onOpenAccounts,
    }] : []),
  ];
  if (rows.length === 0) return null;

  return (
    <>
      <div style={{ fontSize: 12, fontWeight: 600, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.6px", margin: "0 2px 8px" }}>
        Coming up
      </div>
      <div className="card" style={{ padding: 0, overflow: "hidden", marginBottom: 20 }}>
        {rows.map((r, i) => {
          const Row = r.onClick ? "button" : "div";
          return (
            <Row key={r.key} onClick={r.onClick} style={{
              width: "100%", display: "flex", alignItems: "center", gap: 12, padding: "12px 16px", textAlign: "left",
              background: "transparent", border: "none", borderTop: i ? "1px solid var(--border)" : "none",
              cursor: r.onClick ? "pointer" : "default", fontFamily: "inherit", color: "var(--text)", touchAction: "manipulation",
            }}>
              <span style={{ width: 34, height: 34, borderRadius: 17, background: "var(--subtle2)", display: "inline-flex",
                             alignItems: "center", justifyContent: "center", flexShrink: 0, color: r.tone || "var(--text)" }}>
                <Icon name={r.icon} size={15} />
              </span>
              <span style={{ flex: 1, minWidth: 0 }}>
                <span style={{ display: "block", fontSize: 14, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{r.label}</span>
                <span style={{ display: "block", fontSize: 12, color: r.tone || "var(--muted)", marginTop: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{r.sub}</span>
              </span>
              {r.value && <span style={{ fontSize: 14, fontWeight: 600, whiteSpace: "nowrap" }}>{r.value}</span>}
            </Row>
          );
        })}
      </div>
    </>
  );
}
