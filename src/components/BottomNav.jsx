import { useState } from "react";
import { NAV_ITEMS } from "../constants/categories";
import Icon from "./Icon";

// Phones get the four pages used most, and the rest under More.
const MAIN = ["dashboard", "expenses", "payments", "analytics"];
const SHORT = { dashboard: "Home", analytics: "Plan" };

function Badge({ count }) {
  if (!(count > 0)) return null;
  return (
    <span style={{
      position: "absolute", top: -4, right: -6, background: "#e11d48", color: "#fff", borderRadius: 100,
      fontSize: 9, fontWeight: 800, padding: "1px 4px", minWidth: 14, textAlign: "center", lineHeight: "14px",
    }}>{count}</span>
  );
}

export default function BottomNav({ view, setView, badges, darkMode, onToggleDark }) {
  const [more, setMore] = useState(false);
  const main = NAV_ITEMS.filter(i => MAIN.includes(i.id)).sort((a, b) => MAIN.indexOf(a.id) - MAIN.indexOf(b.id));
  const rest = NAV_ITEMS.filter(i => !MAIN.includes(i.id));
  const inMore = rest.some(i => i.id === view);
  const moreBadge = rest.reduce((t, i) => t + (badges?.[i.id] || 0), 0);
  const go = id => { setView(id); setMore(false); };

  return (
    <>
      {more && (
        <div className="bottom-sheet-backdrop" onClick={() => setMore(false)}>
          <div className="bottom-sheet" role="dialog" aria-label="More pages" onClick={e => e.stopPropagation()}>
            {rest.map(item => (
              <button key={item.id} className={`bottom-sheet-item${view === item.id ? " active" : ""}`} onClick={() => go(item.id)}>
                <span style={{ position: "relative", display: "inline-flex" }}>
                  <Icon name={item.icon} size={20} /><Badge count={badges?.[item.id]} />
                </span>
                <span style={{ flex: 1 }}>{item.label}</span>
                <Icon name="chevron-right" size={16} />
              </button>
            ))}
            {onToggleDark && (
              <button className="bottom-sheet-item" onClick={onToggleDark} role="switch" aria-checked={!!darkMode}>
                <Icon name={darkMode ? "moon" : "sun"} size={20} />
                <span style={{ flex: 1 }}>Dark mode</span>
                <span className={`theme-switch${darkMode ? " on" : ""}`} aria-hidden="true"><span /></span>
              </button>
            )}
          </div>
        </div>
      )}
      <nav className="bottom-nav">
        {main.map(item => (
          <button key={item.id} className={`bottom-nav-item${view === item.id && !more ? " active" : ""}`} onClick={() => go(item.id)}>
            <div style={{ position: "relative", display: "inline-block" }}>
              <span className="bnav-icon"><Icon name={item.icon} size={20} /></span>
              <Badge count={badges?.[item.id]} />
            </div>
            <span className="bnav-label">{SHORT[item.id] || item.label}</span>
          </button>
        ))}
        <button className={`bottom-nav-item${inMore || more ? " active" : ""}`} onClick={() => setMore(m => !m)} aria-expanded={more}>
          <div style={{ position: "relative", display: "inline-block" }}>
            <span className="bnav-icon"><Icon name="more" size={20} /></span>
            <Badge count={moreBadge} />
          </div>
          <span className="bnav-label">More</span>
        </button>
      </nav>
    </>
  );
}
