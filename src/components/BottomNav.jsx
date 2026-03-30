import { NAV_ITEMS } from "../constants/categories";

export default function BottomNav({ view, setView, badges }) {
  return (
    <nav className="bottom-nav">
      {NAV_ITEMS.map(item => (
        <button
          key={item.id}
          className={`bottom-nav-item${view === item.id ? " active" : ""}`}
          onClick={() => setView(item.id)}
        >
          {/* Icon with badge */}
          <div style={{ position:"relative", display:"inline-block" }}>
            <span className="bnav-icon">{item.icon}</span>
            {badges?.[item.id] > 0 && (
              <span style={{
                position:     "absolute",
                top:          -4,
                right:        -6,
                background:   "#e11d48",
                color:        "#fff",
                borderRadius: 100,
                fontSize:     9,
                fontWeight:   800,
                padding:      "1px 4px",
                minWidth:     14,
                textAlign:    "center",
                lineHeight:   "14px",
              }}>
                {badges[item.id]}
              </span>
            )}
          </div>
          <span className="bnav-label">{item.label}</span>
        </button>
      ))}
    </nav>
  );
}