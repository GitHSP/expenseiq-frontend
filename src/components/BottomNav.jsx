import { NAV_ITEMS } from "../constants/categories";

export default function BottomNav({ view, setView }) {
  return (
    <nav className="bottom-nav">
      {NAV_ITEMS.map(item => (
        <button
          key={item.id}
          className={`bottom-nav-item${view === item.id ? " active" : ""}`}
          onClick={() => setView(item.id)}
        >
          <span className="bnav-icon">{item.icon}</span>
          <span className="bnav-label">{item.label}</span>
        </button>
      ))}
    </nav>
  );
}