export const CATEGORIES = [
  { name: "Food & Dining",  icon: "🍔", color: "#FF6B6B" },
  { name: "Transport",      icon: "🚗", color: "#4ECDC4" },
  { name: "Shopping",       icon: "🛍️", color: "#FFE66D" },
  { name: "Entertainment",  icon: "🎬", color: "#A29BFE" },
  { name: "Health",         icon: "💊", color: "#55EFC4" },
  { name: "Housing",        icon: "🏠", color: "#FD79A8" },
  { name: "Education",      icon: "📚", color: "#74B9FF" },
  { name: "Other",          icon: "💡", color: "#B2BEC3" },
];

export const MONTHS = [
  "Jan","Feb","Mar","Apr","May","Jun",
  "Jul","Aug","Sep","Oct","Nov","Dec"
];

export const NAV_ITEMS = [
  { id: "dashboard", label: "Dashboard", icon: "⊞" },
  { id: "expenses",  label: "Expenses",  icon: "📋" },
  { id: "analytics", label: "Analytics", icon: "📊" },
  { id: "budgets",   label: "Budgets",   icon: "🎯" },
  { id: "payments",  label: "Payments",  icon: "💳" },
];

export const DEFAULT_BUDGETS = Object.fromEntries(
  CATEGORIES.map(c => [c.name, 500])
);