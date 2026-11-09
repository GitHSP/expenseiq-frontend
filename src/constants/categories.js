export const BUILTIN_CATEGORIES = [
  { name: "Food & Dining",          icon: "utensils"      , color: "#e11d48" },
  { name: "Transport",              icon: "car"           , color: "#0070f3" },
  { name: "Shopping",               icon: "shopping-bag"  , color: "#7c3aed" },
  { name: "Entertainment",          icon: "film"          , color: "#db2777" },
  { name: "Health",                 icon: "pill"          , color: "#059669" },
  { name: "Housing",                icon: "house"         , color: "#d97706" },
  { name: "Education",              icon: "book"          , color: "#0891b2" },
  { name: "Gym & Fitness",          icon: "dumbbell"      , color: "#16a34a" },
  { name: "Subscriptions",          icon: "smartphone"    , color: "#6366f1" },
  { name: "Insurance",              icon: "shield"        , color: "#475569" },
  { name: "Clothing & Shopping",    icon: "shirt"         , color: "#ec4899" },
  { name: "Personal Care & Beauty", icon: "sparkles"      , color: "#f43f5e" },
  { name: "Gifts & Donations",      icon: "gift"          , color: "#f59e0b" },
  { name: "Bills & Utilities",      icon: "zap"           , color: "#ea580c" },
  { name: "Medical & Health",       icon: "hospital"      , color: "#10b981" },
  { name: "Education & Books",      icon: "graduation-cap", color: "#3b82f6" },
  { name: "Abroad Expense",         icon: "plane"         , color: "#8b5cf6" },
  { name: "Drinks & Bars",          icon: "wine"          , color: "#b45309" },
  { name: "Smoke & Vape",           icon: "cigarette"     , color: "#78716c" },
  { name: "Transfers to People",    icon: "send"          , color: "#0ea5e9" },
  { name: "Loan & BNPL Payments",   icon: "hand-coins"    , color: "#be123c" },
  { name: "Household",              icon: "washing-machine", color: "#14b8a6" },
  { name: "Immigration",            icon: "file-text"     , color: "#64748b" },
  { name: "Other",                  icon: "package"       , color: "#6b7280" },
];

// The categories the app offers: the built-in ones the user hasn't hidden, plus
// their own. Filled in place from the server (applyUserCategories), so every
// screen that imports it sees the same list.
export const CATEGORIES = [...BUILTIN_CATEGORIES];

export function applyUserCategories(rows) {
  const builtin = Object.fromEntries(BUILTIN_CATEGORIES.map(c => [c.name, c]));
  const visible = (rows || []).filter(r => !r.hidden)
    .map(r => (r.builtin ? builtin[r.name] : { name: r.name, icon: r.icon || "package", color: r.color || "#6b7280" }))
    .filter(Boolean);
  if (visible.length) CATEGORIES.splice(0, CATEGORIES.length, ...visible);
}

export const MONTHS = [
  "Jan","Feb","Mar","Apr","May","Jun",
  "Jul","Aug","Sep","Oct","Nov","Dec"
];

export const NAV_ITEMS = [
  { id: "dashboard",  label: "Dashboard",  icon: "dashboard" },
  { id: "expenses",   label: "Expenses",   icon: "receipt" },
  { id: "analytics",  label: "Analytics",  icon: "chart" },
  { id: "payments",   label: "Planner",    icon: "clipboard" },
  { id: "accounts",   label: "Accounts",   icon: "landmark" },
  { id: "investments", label: "Invest",    icon: "piggy-bank" },
  { id: "activity",   label: "Activity",   icon: "history" },
  { id: "profile",    label: "Profile",    icon: "user" },
];