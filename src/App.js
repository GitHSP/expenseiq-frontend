import "./styles/global.css";
import { useState, useEffect } from "react";


// Hooks
import { useExpenses }  from "./hooks/useExpenses";
import { useToast }     from "./hooks/useToast";
import { useAuth }      from "./hooks/useAuth";
import { useIncome }    from "./hooks/useIncome";
import { useDebts }     from "./hooks/useDebts";
import { useCurrency }  from "./hooks/useCurrency";

// Auth pages
import Login          from "./pages/Login";
import Register       from "./pages/Register";
import ForgotPassword from "./pages/ForgotPassword";

// Layout
import Sidebar         from "./components/Sidebar";
import TopBar          from "./components/TopBar";
import BottomNav       from "./components/BottomNav";
import Toast           from "./components/Toast";
import AddExpenseModal from "./components/AddExpenseModal";
import AddIncomeModal  from "./components/AddIncomeModal";

// Pages
import Dashboard         from "./pages/Dashboard";
import Expenses          from "./pages/Expenses";
import Analytics         from "./pages/Analytics";
import Budgets           from "./pages/Budgets";
import DebtPayoffTracker from "./pages/DebtPayoffTracker";
import Profile           from "./pages/Profile";
import Forecast from "./pages/Forecast";

// Utils
import { exportToCSV } from "./utils/helpers";

import FinancialPlanner   from "./pages/FinancialPlanner";

export default function App() {

  // ── Auth ──────────────────────────────────
  const { user, loading, login, register, logout, isLoggedIn } = useAuth();
  const [authView, setAuthView] = useState("login");

  // ── Navigation ────────────────────────────
  const [view, setView] = useState("dashboard");

  // ── Dark mode ─────────────────────────────
  const [darkMode, setDarkMode] = useState(
    () => localStorage.getItem("expenseiq_theme") === "dark"
  );

useEffect(() => {
  localStorage.setItem("expenseiq_theme", darkMode ? "dark" : "light");
  if (darkMode) {
    document.body.classList.add("dark");
  } else {
    document.body.classList.remove("dark");
  }
}, [darkMode]);

  // ── Modals ────────────────────────────────
  const [showModal,      setShowModal]      = useState(false);
  const [editingExpense, setEditingExpense] = useState(null);
  const [showIncomeModal, setShowIncomeModal] = useState(false);
  const [editingIncome,   setEditingIncome]   = useState(null);


  // ── Data hooks ────────────────────────────
  const {
    expenses, budgets, loaded,
    addExpense, updateExpense, deleteExpense, saveBudgets,
  } = useExpenses();

  const {
    incomes, loaded: incomeLoaded,
    addIncome, updateIncome, deleteIncome,
  } = useIncome();

  const {
    debts, loaded: debtLoaded,
    isDueSoon, isOverdue,
  } = useDebts();

  // ── Currency ──────────────────────────────
  const {
    currency, setCurrency,
    rates, loading: ratesLoading, error: ratesError,
    formatAmount, getRate,
    getLastUpdatedText, refresh: refreshRates,
  } = useCurrency();

  // ── Toast ─────────────────────────────────
  const { toast, showToast } = useToast();

  // ── Notification badges ───────────────────
  const overdueCount = debts.filter(
    d => !d.isPaidOff && isOverdue(d.nextPaymentDate)
  ).length;
  const dueSoonCount = debts.filter(
    d => !d.isPaidOff && isDueSoon(d.nextPaymentDate)
  ).length;
  const badges = {
    payments: overdueCount + dueSoonCount,
  };

  // ── Auth pages ────────────────────────────
  if (!isLoggedIn && !loading) {
    if (authView === "register") {
      return (
        <Register
          onRegister={async (email, username, password, password2) => {
            await register(email, username, password, password2);
            showToast("Account created! Welcome 🎉");
          }}
          onGoToLogin={() => setAuthView("login")}
        />
      );
    }
    if (authView === "forgot-password") {
      return <ForgotPassword onGoToLogin={() => setAuthView("login")} />;
    }
    return (
      <Login
        onLogin={async (email, password) => {
          await login(email, password);
          showToast("Welcome back! 👋");
        }}
        onGoToRegister={() => setAuthView("register")}
        onGoToForgot={()  => setAuthView("forgot-password")}
      />
    );
  }

  // ── Skeleton loading ──────────────────────
  if (loading || !loaded || !incomeLoaded || !debtLoaded) {
    return (
      <div style={{
        display:    "flex",
        minHeight:  "100vh",
        background: "#f6f8fa",
        fontFamily: "'Inter', sans-serif",
      }}>
        {/* Fake sidebar */}
        <div style={{
          width:       248,
          background:  "#ffffff",
          borderRight: "1px solid #eaeaea",
          padding:     "20px 16px",
          flexShrink:  0,
        }}>
          <div style={{ display:"flex", gap:8, marginBottom:28, alignItems:"center" }}>
            <div style={{ width:10, height:10, borderRadius:"50%", background:"#eaeaea" }} />
            <div style={{ width:80, height:14, borderRadius:6, background:"#eaeaea" }} />
          </div>
          {[1,2,3,4,5,6].map(i => (
            <div key={i} style={{ height:36, borderRadius:8, background:"#f6f8fa", marginBottom:6 }} />
          ))}
        </div>
        {/* Fake content */}
        <div style={{ flex:1, padding:"32px" }}>
          <div style={{ width:160, height:28, borderRadius:8, background:"#eaeaea", marginBottom:8 }} />
          <div style={{ width:120, height:14, borderRadius:6, background:"#f0f0f0", marginBottom:28 }} />
          <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:16, marginBottom:24 }}>
            {[1,2,3,4].map(i => (
              <div key={i} style={{ height:110, borderRadius:12, background:"linear-gradient(135deg,#e0e0e0,#ececec)" }} />
            ))}
          </div>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:20 }}>
            {[1,2].map(i => (
              <div key={i} style={{ height:280, borderRadius:12, background:"#ffffff", border:"1px solid #eaeaea" }} />
            ))}
          </div>
        </div>
        <style>{`@keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.6} }`}</style>
      </div>
    );
  }

  // ─────────────────────────────────────────
  // EXPENSE HANDLERS
  // ─────────────────────────────────────────
  function openAddModal() { setEditingExpense(null); setShowModal(true); }
  function openEditModal(expense) { setEditingExpense(expense); setShowModal(true); }

  async function handleSave(formData) {
    if (!formData.title.trim() || !formData.amount || isNaN(parseFloat(formData.amount))) {
      showToast("Please fill in title and a valid amount", "error"); return;
    }
    try {
      if (editingExpense) {
        await updateExpense(editingExpense.id, formData);
        showToast("Expense updated!");
      } else {
        await addExpense(formData);
        showToast("Expense added!");
      }
      setShowModal(false);
    } catch (err) { showToast(err.message || "Something went wrong", "error"); }
  }

  async function handleDelete(id) {
    try { await deleteExpense(id); showToast("Expense deleted", "error"); }
    catch (err) { showToast(err.message || "Failed to delete", "error"); }
  }

  async function handleSaveBudgets(newBudgets) {
    try { await saveBudgets(newBudgets); showToast("Budgets saved!"); }
    catch (err) { showToast(err.message || "Failed to save", "error"); }
  }

  // ─────────────────────────────────────────
  // INCOME HANDLERS
  // ─────────────────────────────────────────
  function openAddIncomeModal() { setEditingIncome(null); setShowIncomeModal(true); }
  function openEditIncomeModal(income) { setEditingIncome(income); setShowIncomeModal(true); }

  async function handleSaveIncome(formData) {
    if (!formData.title.trim() || !formData.amount || isNaN(parseFloat(formData.amount))) {
      showToast("Please fill in title and a valid amount", "error"); return;
    }
    try {
      if (editingIncome) {
        await updateIncome(editingIncome.id, formData);
        showToast("Income updated!");
      } else {
        await addIncome(formData);
        showToast("Income added! 💰");
      }
      setShowIncomeModal(false);
    } catch (err) { showToast(err.message || "Something went wrong", "error"); }
  }

  async function handleDeleteIncome(id) {
    try { await deleteIncome(id); showToast("Income deleted", "error"); }
    catch (err) { showToast(err.message || "Failed to delete", "error"); }
  }

  // ─────────────────────────────────────────
   // DEBT HANDLERS
  // ─────────────────────────────────────────
  // ─────────────────────────────────────────────
// LOGOUT
// ─────────────────────────────────────────────
async function handleLogout() {
  await logout();
  showToast("Logged out!");
}
  // ─────────────────────────────────────────
  // RENDER PAGE
  // ─────────────────────────────────────────
  function renderPage() {
    switch (view) {
      case "dashboard":
        if (!loaded || !incomeLoaded) {
          return (
            <div style={{
              display:        "flex",
              flexDirection:  "column",
              alignItems:     "center",
              justifyContent: "center",
              padding:        "60px 20px",
              color:          "#888",
              gap:            12,
            }}>
              <div style={{ fontSize:32 }}>⏳</div>
              <div style={{ fontWeight:600, fontSize:15 }}>Loading your data...</div>
              <div style={{ fontSize:12, color:"#bbb" }}>Fetching expenses and income...</div>
            </div>
          );
        }
        return (
          <Dashboard
            expenses={expenses}
            budgets={budgets}
            onEdit={openEditModal}
            onDelete={handleDelete}
            onViewAll={() => setView("expenses")}
            incomes={incomes}
            onEditIncome={openEditIncomeModal}
            onDeleteIncome={handleDeleteIncome}
            onAddIncome={openAddIncomeModal}
            currency={currency}
            rates={rates}
            getRate={getRate}
            formatAmount={formatAmount}
            getLastUpdatedText={getLastUpdatedText}
            ratesLoading={ratesLoading}
            ratesError={ratesError}
            refreshRates={refreshRates}
            debts={debts}
          />
        );
      case "expenses":
        return (
          <Expenses
            expenses={expenses}
            onEdit={openEditModal}
            onDelete={handleDelete}
            formatAmount={formatAmount}
          />
        );
      case "analytics":
        return (
          <Analytics
            expenses={expenses}
            budgets={budgets}
            formatAmount={formatAmount}
          />
        );
      case "budgets":
        return (
          <Budgets
            expenses={expenses}
            budgets={budgets}
            onSaveBudgets={handleSaveBudgets}
            formatAmount={formatAmount}
          />
        );
      case "payments":
        return (
          <FinancialPlanner
            formatAmount={formatAmount}
            onAddExpense={async (formData) => {
              try {
                await addExpense(formData);
                showToast("Expense added from planner! ✅");
              } catch (err) {
                showToast(err.message || "Failed to add expense", "error");
              }
            }}
          />
        );
      case "payoff":
        return (
          <DebtPayoffTracker
            debts={debts}
            formatAmount={formatAmount}
          />
        );
      case "profile":
        return (
          <Profile
            user={user}
            onLogout={handleLogout}
          />
        );

        case "forecast":
          return (
            <Forecast
              expenses={expenses}
              incomes={incomes}
              budgets={budgets}
              formatAmount={formatAmount}
            />
          );

      default:
        return null;
    }
  }

  // ─────────────────────────────────────────
  // MAIN RENDER
  // ─────────────────────────────────────────
  return (
    <div className="app">

      <Toast toast={toast} />

      <Sidebar
        view={view}
        setView={setView}
        onAddExpense={openAddModal}
        onExportCSV={() => { exportToCSV(expenses); showToast("CSV exported!"); }}
        user={user}
        onLogout={handleLogout}
        currency={currency}
        setCurrency={setCurrency}
        badges={badges}
        darkMode={darkMode}
        onToggleDark={() => setDarkMode(p => !p)}
      />

      <div className="content-wrap">
        <TopBar
          onAddExpense={openAddModal}
          onExportCSV={() => { exportToCSV(expenses); showToast("CSV exported!"); }}
          user={user}
          onLogout={handleLogout}
          currency={currency}
          setCurrency={setCurrency}
        />

        <div className="main">
          {renderPage()}
        </div>

        <BottomNav
          view={view}
          setView={setView}
          badges={badges}
        />
      </div>

      {showModal && (
        <AddExpenseModal
          editingExpense={editingExpense}
          onSave={handleSave}
          onClose={() => setShowModal(false)}
        />
      )}

      {showIncomeModal && (
        <AddIncomeModal
          editingIncome={editingIncome}
          onSave={handleSaveIncome}
          onClose={() => setShowIncomeModal(false)}
        />
      )}


    </div>
  );
}