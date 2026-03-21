export default function StatCard({ label, value, sub, gradient, textColor }) {
  return (
    <div
      className="stat-card"
      style={{ background: gradient }}
    >
      <div className="stat-label" style={{ color: textColor || "#fff" }}>
        {label}
      </div>
      <div className="stat-value" style={{ color: textColor || "#fff" }}>
        {value}
      </div>
      {sub && (
        <div className="stat-sub" style={{ color: textColor || "#fff" }}>
          {sub}
        </div>
      )}
    </div>
  );
}