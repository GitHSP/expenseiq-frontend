import { useEffect, useState, useTransition } from "react";
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

// "Install Glacier": Android/desktop Chrome can install straight away; on an
// iPhone it's Share → Add to Home Screen. Hidden once it's running as an app.
function InstallRow() {
  const [help, setHelp] = useState(false);
  const standalone = window.matchMedia?.("(display-mode: standalone)").matches || window.navigator.standalone;
  if (standalone) return null;
  const iphone = /iphone|ipad|ipod/i.test(navigator.userAgent);
  async function install() {
    const prompt = window.__glacierInstall;
    if (prompt) { prompt.prompt(); await prompt.userChoice; window.__glacierInstall = null; return; }
    setHelp(h => !h);
  }
  return (
    <>
      <button className="bottom-sheet-item" onClick={install}>
        <Icon name="download" size={20} />
        <span style={{ flex: 1 }}>Install Glacier app</span>
        <Icon name={help ? "chevron-up" : "chevron-right"} size={16} />
      </button>
      {help && (
        <div style={{ padding: "0 12px 10px 46px", fontSize: 13, color: "var(--muted)", lineHeight: 1.6 }}>
          {iphone
            ? <>In Safari, tap <strong>Share</strong> (the square with an arrow), then <strong>Add to Home Screen</strong>.</>
            : <>In Chrome, open the <strong>⋮ menu</strong> and tap <strong>Install app</strong> (or Add to Home screen).</>}
        </div>
      )}
    </>
  );
}

export default function BottomNav({ view, setView, badges, darkMode, onToggleDark }) {
  const [more, setMore] = useState(false);
  // The tapped item lights up at once; the page itself renders just after,
  // without holding up the tap (a big page can take a moment on a phone).
  const [tapped, setTapped] = useState(null);
  const [, startTransition] = useTransition();
  useEffect(() => { setTapped(null); }, [view]);
  const current = tapped || view;
  const main = NAV_ITEMS.filter(i => MAIN.includes(i.id)).sort((a, b) => MAIN.indexOf(a.id) - MAIN.indexOf(b.id));
  const rest = NAV_ITEMS.filter(i => !MAIN.includes(i.id));
  const inMore = rest.some(i => i.id === current);
  const moreBadge = rest.reduce((t, i) => t + (badges?.[i.id] || 0), 0);
  const go = id => {
    setMore(false);
    if (id === view) { window.scrollTo({ top: 0, behavior: "smooth" }); return; }   // tap again: back to the top
    setTapped(id);
    startTransition(() => setView(id));
  };

  return (
    <>
      {more && (
        <div className="bottom-sheet-backdrop" onClick={() => setMore(false)}>
          <div className="bottom-sheet" role="dialog" aria-label="More pages" onClick={e => e.stopPropagation()}>
            {rest.map(item => (
              <button key={item.id} className={`bottom-sheet-item${current === item.id ? " active" : ""}`} onClick={() => go(item.id)}>
                <span style={{ position: "relative", display: "inline-flex" }}>
                  <Icon name={item.icon} size={20} /><Badge count={badges?.[item.id]} />
                </span>
                <span style={{ flex: 1 }}>{item.label}</span>
                <Icon name="chevron-right" size={16} />
              </button>
            ))}
            <InstallRow />
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
          <button key={item.id} className={`bottom-nav-item${current === item.id && !more ? " active" : ""}`} onClick={() => go(item.id)}>
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
