// ─────────────────────────────────────────────
// avalanche.js — Debt Avalanche calculation engine
//
// Strategy: Pay minimums on all debts, then put
// ALL extra money toward the highest APR debt first.
// Most mathematically optimal — saves the most interest.
// ─────────────────────────────────────────────

/**
 * Run full avalanche simulation
 * @param {Array}  debts      — array of debt objects from useDebts
 * @param {number} extraMonth — extra monthly payment beyond minimums
 * @returns {Object}          — full payoff plan
 */
export function calculateAvalanche(debts, extraMonth = 150) {

  // ── Filter only active debts with balance > 0 ──
  const activeDebts = debts
    .filter(d => !d.isPaidOff && d.balance > 0 && d.monthlyPayment > 0)
    .map(d => ({
      id:             d.id,
      name:           d.name,
      type:           d.type,
      balance:        parseFloat(d.balance),
      originalAmount: parseFloat(d.originalAmount) || parseFloat(d.balance),
      interestRate:   parseFloat(d.interestRate)   || 0,
      monthlyPayment: parseFloat(d.monthlyPayment) || 0,
      limit:          parseFloat(d.limit)          || 0,
      lender:         d.lender || "",
    }));

  if (activeDebts.length === 0) return null;

  // ── Sort by interest rate descending (avalanche) ──
  const sorted = [...activeDebts].sort(
    (a, b) => b.interestRate - a.interestRate
  );

  // ── Total minimums ──
  const totalMinimums = sorted.reduce((s, d) => s + d.monthlyPayment, 0);

  // ── Simulate month by month ──
  let   balances      = sorted.map(d => d.balance);
  const monthlyPlans  = [];   // one entry per month
  let   month         = 0;
  let   totalInterest = 0;
  const MAX_MONTHS    = 600;  // safety cap — 50 years

  while (balances.some(b => b > 0.01) && month < MAX_MONTHS) {
    month++;
    const monthEntry = {
      month,
      debts:         [],
      totalBalance:  0,
      totalInterest: 0,
      extraApplied:  0,
    };

    // ── Step 1: Accrue interest on all debts ──
    // ── Step 1: Accrue interest on all debts ──
    let interestThisMonth = 0;
    let interestAccrued   = 0;

    balances = balances.map((bal, i) => {
      if (bal <= 0) return 0;
      const monthlyRate = sorted[i].interestRate / 100 / 12;
      const interest    = bal * monthlyRate;
      interestThisMonth += interest;
      interestAccrued   += interest;
      return bal + interest;
    });

    totalInterest += interestAccrued;

    // ── Step 2: Apply minimum payments ──
    balances = balances.map((bal, i) => {
      if (bal <= 0) return 0;
      return Math.max(0, bal - sorted[i].monthlyPayment);
    });

    // ── Step 3: Apply extra to highest APR with remaining balance ──
    let extra = extraMonth;
    for (let i = 0; i < balances.length; i++) {
      if (balances[i] > 0 && extra > 0) {
        const payment    = Math.min(extra, balances[i]);
        balances[i]      = Math.max(0, balances[i] - payment);
        extra           -= payment;
        monthEntry.extraApplied += payment;
        break; // avalanche: focus all extra on one debt
      }
    }

    // ── Step 4: Record month snapshot ──
    monthEntry.totalBalance   = balances.reduce((s, b) => s + b, 0);
    monthEntry.totalInterest  = interestThisMonth;

    balances.forEach((bal, i) => {
      monthEntry.debts.push({
        id:      sorted[i].id,
        name:    sorted[i].name,
        balance: parseFloat(bal.toFixed(2)),
        paidOff: bal <= 0.01,
      });
    });

    monthlyPlans.push(monthEntry);

    // Stop if all paid off
    if (balances.every(b => b <= 0.01)) break;
  }

  // ── Calculate payoff date ──
  const payoffDate = new Date();
  payoffDate.setMonth(payoffDate.getMonth() + month);
  const payoffDateStr = payoffDate.toLocaleDateString("en-US", {
    month: "long",
    year:  "numeric",
  });

  // ── Calculate per-debt payoff months ──
  const debtPayoffMonths = sorted.map((debt, i) => {
    const payoffMonth = monthlyPlans.findIndex(
      m => m.debts[i] && m.debts[i].balance <= 0.01
    );
    const pDate = new Date();
    if (payoffMonth >= 0) {
      pDate.setMonth(pDate.getMonth() + payoffMonth + 1);
    }
    return {
      ...debt,
      payoffMonth:   payoffMonth >= 0 ? payoffMonth + 1 : month,
      payoffDate:    pDate.toLocaleDateString("en-US", { month:"short", year:"numeric" }),
      priority:      i + 1,
      extraReceives: i === 0, // first in avalanche order gets extra
    };
  });

  return {
    method:         "Avalanche",
    extraPerMonth:  extraMonth,
    totalMonths:    month,
    payoffDate:     payoffDateStr,
    totalInterest:  parseFloat(totalInterest.toFixed(2)),
    totalMinimums:  parseFloat(totalMinimums.toFixed(2)),
    totalMonthly:   parseFloat((totalMinimums + extraMonth).toFixed(2)),
    debtOrder:      debtPayoffMonths,
    monthlyPlans:   monthlyPlans,
    originalDebts:  sorted,
  };
}

/**
 * Format months into years and months string
 * e.g. 14 → "1 year 2 months"
 */
export function formatMonths(months) {
  if (!months) return "—";
  if (months < 12) return `${months} month${months !== 1 ? "s" : ""}`;
  const years = Math.floor(months / 12);
  const rem   = months % 12;
  if (rem === 0) return `${years} year${years !== 1 ? "s" : ""}`;
  return `${years}y ${rem}m`;
}