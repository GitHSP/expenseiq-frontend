export const CATEGORIES = [
  { name: "Food & Dining",          icon: "🍔", color: "#e11d48" },
  { name: "Transport",              icon: "🚗", color: "#0070f3" },
  { name: "Shopping",               icon: "🛍️", color: "#7c3aed" },
  { name: "Entertainment",          icon: "🎬", color: "#db2777" },
  { name: "Health",                 icon: "💊", color: "#059669" },
  { name: "Housing",                icon: "🏠", color: "#d97706" },
  { name: "Education",              icon: "📚", color: "#0891b2" },
  { name: "Gym & Fitness",          icon: "💪", color: "#16a34a" },
  { name: "Subscriptions",          icon: "📱", color: "#6366f1" },
  { name: "Insurance",              icon: "🛡️", color: "#475569" },
  { name: "Clothing & Shopping",    icon: "👗", color: "#ec4899" },
  { name: "Personal Care & Beauty", icon: "💅", color: "#f43f5e" },
  { name: "Gifts & Donations",      icon: "🎁", color: "#f59e0b" },
  { name: "Bills & Utilities",      icon: "⚡", color: "#ea580c" },
  { name: "Medical & Health",       icon: "🏥", color: "#10b981" },
  { name: "Education & Books",      icon: "🎓", color: "#3b82f6" },
  { name: "Abroad Expense",         icon: "✈️", color: "#8b5cf6" },
  { name: "Other",                  icon: "📦", color: "#6b7280" },
];

export const MONTHS = [
  "Jan","Feb","Mar","Apr","May","Jun",
  "Jul","Aug","Sep","Oct","Nov","Dec"
];

export const NAV_ITEMS = [
  { id: "dashboard", label: "Dashboard", icon: "⊞"  },
  { id: "expenses",  label: "Expenses",  icon: "📋" },
  { id: "analytics", label: "Analytics", icon: "📊" },
  { id: "budgets",   label: "Budgets",   icon: "🎯" },
  { id: "payments", label: "Planner", icon: "📋" },
  { id: "forecast", label: "Forecast", icon: "🔮" },
  // { id: "payoff",    label: "Payoff",    icon: "🏁" },
  { id: "profile",   label: "Profile",   icon: "👤" },
];

export const DEFAULT_BUDGETS = Object.fromEntries(
  CATEGORIES.map(c => [c.name, 500])
);