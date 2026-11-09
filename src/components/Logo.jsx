import { useId } from "react";

// The Glacier mark: a gold tile with two peaks and a coin rising behind them,
// money climbing out of the valley. The same drawing as the app icons in /public.
export default function Logo({ size = 24, style, title = "Glacier" }) {
  const id = useId().replace(/:/g, "");
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" role="img" aria-label={title} style={{ flexShrink: 0, display: "block", ...style }}>
      <defs>
        <linearGradient id={`g${id}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#f2cc6b" />
          <stop offset="1" stopColor="#c9962c" />
        </linearGradient>
      </defs>
      <rect width="64" height="64" rx="14" fill={`url(#g${id})`} />
      <circle cx="43" cy="24" r="10.5" fill="#1c1405" />
      <text x="43" y="24" textAnchor="middle" dominantBaseline="central" fill="#f2cc6b"
        fontFamily="Arial, Helvetica, sans-serif" fontWeight="700" fontSize="15">$</text>
      <polygon points="28,52 43,30 58,52" fill="#4a3a18" />
      <polygon points="6,52 24,17 42,52" fill="#1c1405" />
      <polygon points="24,17 18,28.7 22,26.2 24.6,28.9 30,28.7" fill="#f2cc6b" />
    </svg>
  );
}
