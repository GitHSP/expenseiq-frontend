import {
  Utensils, Car, ShoppingBag, Clapperboard, Pill, House, BookOpen, Dumbbell,
  Smartphone, Shield, Shirt, Sparkles, Gift, Zap, Hospital, GraduationCap,
  Plane, Package, Briefcase, Laptop, TrendingUp, Building2, Undo2, Lightbulb,
  LayoutDashboard, Receipt, ChartColumn, ClipboardList, User, Sun, Moon,
  Download, LogOut, Wallet, Pencil, Plus, ArrowLeftRight, RefreshCw,
  LoaderCircle, TriangleAlert, Siren, PartyPopper, CreditCard, CircleCheck,
  Check, X, Lock, KeyRound, Mail, Search, ArrowUp, ArrowDown, ArrowUpDown,
  ChevronUp, ChevronDown, ArrowRight, Calendar, PiggyBank, Target, Banknote,
  Timer, Trash2, Bell, ListChecks, Link2, MessageCircle, Hand, Coins,
  CircleAlert, Hourglass, ShieldCheck, ChevronLeft, ChevronRight,
} from "lucide-react";

// Every icon in the app goes through this registry, so data (category lists,
// nav items, tips) can refer to icons by a plain string name.
const ICONS = {
  // Expense categories
  utensils: Utensils, car: Car, "shopping-bag": ShoppingBag, film: Clapperboard,
  pill: Pill, house: House, book: BookOpen, dumbbell: Dumbbell,
  smartphone: Smartphone, shield: Shield, shirt: Shirt, sparkles: Sparkles,
  gift: Gift, zap: Zap, hospital: Hospital, "graduation-cap": GraduationCap,
  plane: Plane, package: Package,
  // Income categories
  briefcase: Briefcase, laptop: Laptop, "trending-up": TrendingUp,
  building: Building2, undo: Undo2, lightbulb: Lightbulb,
  // Navigation
  dashboard: LayoutDashboard, receipt: Receipt, chart: ChartColumn,
  clipboard: ClipboardList, user: User,
  // UI
  sun: Sun, moon: Moon, download: Download, logout: LogOut, wallet: Wallet,
  pencil: Pencil, plus: Plus, exchange: ArrowLeftRight, refresh: RefreshCw,
  loader: LoaderCircle, warning: TriangleAlert, siren: Siren,
  party: PartyPopper, "credit-card": CreditCard, "check-circle": CircleCheck,
  check: Check, x: X, lock: Lock, key: KeyRound, mail: Mail, search: Search,
  "arrow-up": ArrowUp, "arrow-down": ArrowDown, sort: ArrowUpDown,
  "chevron-up": ChevronUp, "chevron-down": ChevronDown, "arrow-right": ArrowRight,
  calendar: Calendar, "piggy-bank": PiggyBank, target: Target,
  banknote: Banknote, timer: Timer, trash: Trash2, bell: Bell,
  "list-checks": ListChecks, link: Link2, chat: MessageCircle, wave: Hand,
  coins: Coins, alert: CircleAlert, hourglass: Hourglass,
  "shield-check": ShieldCheck, "chevron-left": ChevronLeft,
  "chevron-right": ChevronRight,
};

export default function Icon({ name, size = 16, strokeWidth = 2, style, ...rest }) {
  const Component = ICONS[name] || Package;
  return (
    <Component
      size={size}
      strokeWidth={strokeWidth}
      aria-hidden="true"
      style={{ flexShrink: 0, verticalAlign: "middle", ...style }}
      {...rest}
    />
  );
}

// Category icon on a soft tile tinted with the category's colour.
export function CategoryIcon({ cat, fallback = "package", size = 32 }) {
  const color = cat?.color || "#6b7280";
  return (
    <span style={{
      width:          size,
      height:         size,
      borderRadius:   size * 0.3,
      background:     `${color}1a`,
      color,
      display:        "inline-flex",
      alignItems:     "center",
      justifyContent: "center",
      flexShrink:     0,
    }}>
      <Icon name={cat?.icon || fallback} size={Math.round(size * 0.55)} />
    </span>
  );
}

// Inline "icon + label" used inside text runs (badges, table cells, headings).
export function IconLabel({ name, children, size = 14, gap = 6, color, style }) {
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap, ...style }}>
      <Icon name={name} size={size} color={color} />
      {children}
    </span>
  );
}

// Country flag image (emoji flags render as plain letters on Windows).
export function Flag({ country, size = 18 }) {
  if (!country) return null;
  return (
    <img
      src={`https://flagcdn.com/${country}.svg`}
      alt=""
      width={Math.round(size * 1.33)}
      height={size}
      style={{ borderRadius: 3, objectFit: "cover", flexShrink: 0, boxShadow: "0 0 0 1px rgba(0,0,0,0.08)" }}
    />
  );
}

// Labels saved before the switch to SVG icons (e.g. checklist items made by
// the backend) still contain emoji — strip them for display.
const EMOJI_RE = /[\u{1F000}-\u{1FAFF}\u{2300}-\u{23FF}\u{25A0}-\u{27BF}\u{2B00}-\u{2BFF}\u{FE0F}\u{200D}]/gu;
export function stripEmoji(text) {
  return (text || "").replace(EMOJI_RE, "").replace(/\s{2,}/g, " ").trim();
}
