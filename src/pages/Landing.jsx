import { useState } from "react";
import Icon from "../components/Icon";
import "../styles/landing.css";

// Public home page shown to logged-out visitors.

const FEATURES = [
  { icon: "receipt",     title: "Expense & income tracking", body: "Log spending and income in seconds, with categories, tags, notes and search." },
  { icon: "chart",       title: "Clear analytics",           body: "See where the money goes by category and month, and spot what's growing." },
  { icon: "target",      title: "Debt avalanche planner",    body: "Ranks your cards and loans by interest rate and tells you exactly where extra money should go." },
  { icon: "list-checks", title: "Monthly payment checklist", body: "Rent, bills and minimums appear every month on their own — tick them off as you pay." },
  { icon: "shield",      title: "Emergency fund tracker",    body: "Set a target and watch the safety net grow with every pay day." },
  { icon: "chat",        title: "AI assistant",              body: "Just say \"I spent $12 on lunch\" or \"my rent is now $700\" — it updates the app for you." },
  { icon: "exchange",    title: "Multi-currency",            body: "View everything in CAD, USD, GBP, EUR, AUD, INR or AED with live exchange rates." },
  { icon: "lock",        title: "Private by design",         body: "Your assistant chat history is encrypted on your own device." },
];

// Rule-of-thumb split of take-home pay, shown as a static guide.
const SPLIT = [
  { pct: 50, label: "Essentials",         icon: "house",       color: "#0070f3",
    body: "Rent, bills, groceries, transport and minimum debt payments." },
  { pct: 30, label: "Lifestyle",          icon: "sparkles",    color: "#7c3aed",
    body: "Eating out, shopping, hobbies and subscriptions — guilt-free." },
  { pct: 10, label: "Emergency fund",     icon: "shield",      color: "#d97706",
    body: "Build a safety net of 3–6 months of essentials, then redirect it." },
  { pct: 10, label: "Invest / extra debt", icon: "trending-up", color: "#059669",
    body: "Pay off high-interest debt first, then invest consistently." },
];

const TIPS = [
  { icon: "credit-card", text: "Carrying credit card debt? Cut lifestyle to 15–20% and put the difference on your highest-interest card." },
  { icon: "calendar",    text: "Move savings on pay day, before you spend — what you don't see, you don't miss." },
  { icon: "target",      text: "Once the emergency fund is full, send that 10% to investing too." },
];

const STEPS = [
  { icon: "user",        title: "Set up once",       body: "Add your income, monthly bills and debts. Takes about five minutes." },
  { icon: "check-circle", title: "Tick as you pay",  body: "Each month's checklist builds itself. Tick payments off and log spending as it happens." },
  { icon: "trending-up", title: "Watch it work",     body: "Balances fall, the emergency fund grows, and you always know what's left over." },
];

const money = v => `$${Math.round(v).toLocaleString("en-US")}`;

// Months of steady monthly investing needed to reach `target`, assuming
// ANNUAL_RETURN average yearly growth (future-value-of-annuity formula).
const ANNUAL_RETURN = 0.07;
function monthsToReach(target, monthly) {
  if (monthly <= 0) return null;
  const r = ANNUAL_RETURN / 12;
  return Math.ceil(Math.log((target * r) / monthly + 1) / Math.log(1 + r));
}

function BudgetGuide() {
  const [income, setIncome] = useState("4000");
  const pay = Math.max(parseFloat(income) || 0, 0);
  const amount = pct => pay * pct / 100;

  const essentials   = amount(50);
  const emergency    = amount(10);
  const yearlySpend  = (amount(50) + amount(30)) * 12;
  const freedomGoal  = yearlySpend * 25;
  const years        = m => (m == null ? null : Math.round(m / 12));
  const yearsAt10    = years(monthsToReach(freedomGoal, amount(10)));
  // Investing 20% means living on 70%, so the goal shrinks too.
  const yearsAt20    = years(monthsToReach(pay * 0.7 * 12 * 25, amount(20)));
  const emergencyMonths = emergency > 0 ? Math.ceil((essentials * 3) / emergency) : null;

  return (
    <div className="lp-guide">
      <div className="lp-calc">
        <label htmlFor="lp-income">Your monthly take-home pay</label>
        <div className="lp-income">
          <span>$</span>
          <input
            id="lp-income" type="number" inputMode="decimal" min="0" step="100"
            value={income} onChange={e => setIncome(e.target.value)}
          />
        </div>
      </div>

      <div className="lp-bar" role="img" aria-label="50% essentials, 30% lifestyle, 10% emergency fund, 10% invest or extra debt">
        {SPLIT.map(b => (
          <div key={b.label} style={{ width: `${b.pct}%`, background: b.color }}>{b.pct}%</div>
        ))}
      </div>

      <div className="lp-split-cards">
        {SPLIT.map(b => (
          <div key={b.label} className="lp-split-card">
            <span className="lp-bucket-icon" style={{ background: `${b.color}1a`, color: b.color }}>
              <Icon name={b.icon} size={18} />
            </span>
            <div className="lp-split-pct" style={{ color: b.color }}>{money(amount(b.pct))}<small>/mo</small></div>
            <h3>{b.label} · {b.pct}%</h3>
            <p>{b.body}</p>
          </div>
        ))}
      </div>

      {pay > 0 && (
        <div className="lp-goals">
          <div className="lp-goal">
            <span className="lp-bucket-icon" style={{ background: "#d977061a", color: "#d97706" }}><Icon name="shield" size={18} /></span>
            <div>
              <div className="lp-goal-label">Emergency fund goal</div>
              <div className="lp-goal-value">{money(essentials * 3)} – {money(essentials * 6)}</div>
              <p>3–6 months of essentials. Saving {money(emergency)}/month gets you to the first milestone in <strong>{emergencyMonths} months</strong>.</p>
            </div>
          </div>
          <div className="lp-goal">
            <span className="lp-bucket-icon" style={{ background: "#0596691a", color: "#059669" }}><Icon name="target" size={18} /></span>
            <div>
              <div className="lp-goal-label">Financial freedom number</div>
              <div className="lp-goal-value">{money(freedomGoal)}</div>
              <p>
                25× your yearly spending of {money(yearlySpend)} — enough to live off investments (the "4% rule").
                Investing 10% gets you there in about <strong>{yearsAt10} years</strong>; investing 20% cuts it to about <strong>{yearsAt20} years</strong>.
              </p>
            </div>
          </div>
        </div>
      )}

      <ul className="lp-tips">
        {TIPS.map(t => (
          <li key={t.text}><Icon name={t.icon} size={16} /> <span>{t.text}</span></li>
        ))}
      </ul>
      <p className="lp-disclaimer">
        Estimates assume a {Math.round(ANNUAL_RETURN * 100)}% average yearly investment return, before inflation and taxes.
        General rules of thumb to start from — not personal financial advice.
      </p>
    </div>
  );
}

function AppPreview() {
  const items = [
    { label: "Rent",                 amount: "$650",  done: true },
    { label: "CIBC Visa minimum",    amount: "$70",   done: true },
    { label: "Emergency savings",    amount: "$100",  done: false },
    { label: "Extra to RBC Visa",    amount: "$311",  done: false, accent: true },
  ];
  return (
    <div className="lp-preview" aria-hidden="true">
      <div className="lp-preview-head">
        <span>October checklist</span>
        <span className="lp-preview-progress">2 / 4</span>
      </div>
      {items.map(i => (
        <div key={i.label} className={`lp-preview-row${i.done ? " done" : ""}`}>
          <span className="lp-check">{i.done && <Icon name="check" size={12} strokeWidth={3} />}</span>
          <span className="lp-preview-label">{i.label}</span>
          <span className={`lp-preview-amount${i.accent ? " accent" : ""}`}>{i.amount}</span>
        </div>
      ))}
      <div className="lp-preview-debt">
        <div className="lp-preview-debt-head"><span>Total debt</span><span>−$1,240 this year</span></div>
        <div className="lp-preview-track"><div style={{ width: "62%" }} /></div>
      </div>
    </div>
  );
}

export default function Landing({ onGetStarted, onSignIn, darkMode, onToggleDark }) {
  return (
    <div className="lp">
      {/* ── Nav ── */}
      <header className="lp-nav">
        <div className="lp-brand">
          <span className="lp-brand-mark"><Icon name="wallet" size={18} /></span>
          ExpenseIQ
        </div>
        <nav className="lp-nav-actions">
          <button className="lp-icon-btn" onClick={onToggleDark} aria-label={darkMode ? "Switch to light mode" : "Switch to dark mode"}>
            <Icon name={darkMode ? "sun" : "moon"} size={16} />
          </button>
          <button className="lp-btn lp-btn-ghost" onClick={onSignIn}>Sign in</button>
          <button className="lp-btn lp-btn-primary lp-hide-xs" onClick={onGetStarted}>Get started</button>
        </nav>
      </header>

      <main>
        {/* ── Hero ── */}
        <section className="lp-hero">
          <div className="lp-hero-text">
            <span className="lp-eyebrow"><Icon name="sparkles" size={13} /> Budgeting, debt payoff & an AI assistant</span>
            <h1>Know where every dollar goes — and where the next one should.</h1>
            <p>
              ExpenseIQ tracks your spending, builds your monthly payment checklist,
              and pays down debt the smart way, highest interest first.
            </p>
            <div className="lp-hero-cta">
              <button className="lp-btn lp-btn-primary lp-btn-lg" onClick={onGetStarted}>
                Get started free <Icon name="arrow-right" size={16} />
              </button>
              <button className="lp-btn lp-btn-ghost lp-btn-lg" onClick={onSignIn}>I have an account</button>
            </div>
          </div>
          <AppPreview />
        </section>

        {/* ── Salary split ── */}
        <section className="lp-section" id="split">
          <div className="lp-section-head">
            <h2>How to split your pay</h2>
            <p>Enter your monthly salary to see how much should go to spending, emergencies and investing — and what it takes to reach financial freedom.</p>
          </div>
          <BudgetGuide />
        </section>

        {/* ── Features ── */}
        <section className="lp-section">
          <div className="lp-section-head">
            <h2>Everything in one place</h2>
            <p>From a coffee to a credit card balance, ExpenseIQ keeps the whole picture together.</p>
          </div>
          <div className="lp-features">
            {FEATURES.map(f => (
              <div key={f.title} className="lp-feature">
                <span className="lp-feature-icon"><Icon name={f.icon} size={20} /></span>
                <h3>{f.title}</h3>
                <p>{f.body}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ── How it works ── */}
        <section className="lp-section">
          <div className="lp-section-head">
            <h2>How it works</h2>
          </div>
          <ol className="lp-steps">
            {STEPS.map((s, i) => (
              <li key={s.title} className="lp-step">
                <span className="lp-step-num">{i + 1}</span>
                <h3>{s.title}</h3>
                <p>{s.body}</p>
              </li>
            ))}
          </ol>
        </section>

        {/* ── CTA ── */}
        <section className="lp-cta">
          <h2>Take control of your money this month.</h2>
          <p>Free to use. Set up in about five minutes.</p>
          <button className="lp-btn lp-btn-light lp-btn-lg" onClick={onGetStarted}>
            Create your account <Icon name="arrow-right" size={16} />
          </button>
        </section>
      </main>

      <footer className="lp-footer">
        <span>© {new Date().getFullYear()} ExpenseIQ</span>
        <button className="lp-link" onClick={onSignIn}>Sign in</button>
      </footer>
    </div>
  );
}
