// ─────────────────────────────────────────────
// StatCard — summary stat card
//
// Props:
//   label     — card label
//   value     — main value to display
//   sub       — subtitle text
//   gradient  — background gradient
//   textColor — color for all text
// ─────────────────────────────────────────────

export default function StatCard({ label, value, sub, gradient, textColor }) {
  return (
    <div
      className="stat-card"
      style={{
        background: gradient,
        border:     "1px solid #222222",
      }}
    >
      <div className="stat-label" style={{ color: textColor || "#ffffff" }}>
        {label}
      </div>
      <div className="stat-value" style={{ color: textColor || "#ffffff" }}>
        {value}
      </div>
      <div className="stat-sub" style={{ color: textColor || "#ffffff" }}>
        {sub}
      </div>
    </div>
  );
}