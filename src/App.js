import "./styles/global.css";
import { useState } from "react";

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

// Layout components
import Sidebar         from "./components/Sidebar";
import TopBar          from "./components/TopBar";
import BottomNav       from "./components/BottomNav";
import Toast           from "./components/Toast";
import AddExpenseModal from "./components/AddExpenseModal";
import AddIncomeModal  from "./components/AddIncomeModal";
import AddDebtModal    from "./components/AddDebtModal";

// Pages
import Dashboard from "./pages/Dashboard";
import Expenses  from "./pages/Expenses";
import Analytics from "./pages/Analytics";
import Budgets   from "./pages/Budgets";
import Payments  from "./pages/Payments";

// Utils
import { exportToCSV } from "./utils/helpers";

export default function App() {

  // ── Auth ──────────────────────────────────
  const { user, loading, login, register, logout, isLoggedIn } = useAuth();
  const [authView, setAuthView] = useState("login");

  // ── Navigation ────────────────────────────
  const [view, setView] = useState("dashboard");

  // ── Expense modal ─────────────────────────
  const [showModal,      setShowModal]      = useState(false);
  const [editingExpense, setEditingExpense] = useState(null);

  // ── Income modal ──────────────────────────
  const [showIncomeModal, setShowIncomeModal] = useState(false);
  const [editingIncome,   setEditingIncome]   = useState(null);

  // ── Debt modal ────────────────────────────
  const [showDebtModal, setShowDebtModal] = useState(false);
  const [editingDebt,   setEditingDebt]   = useState(null);

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
    debts, paymentHistory, loaded: debtLoaded,
    addDebt, updateDebt, deleteDebt,
    markPaidOff, recordPayment,
    isDueSoon, isOverdue, daysUntilDue,
  } = useDebts();

  // ── Currency hook ─────────────────────────
  const {
    currency, setCurrency,
    rates, loading: ratesLoading, error: ratesError,
    formatAmount, getRate,
    getLastUpdatedText, refresh: refreshRates,
  } = useCurrency();

  // ── Toast ─────────────────────────────────
  const { toast, showToast } = useToast();

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

  // ── Loading ───────────────────────────────
  if (loading || !loaded || !incomeLoaded || !debtLoaded) {
    return (
      <div style={{
        display:"flex", alignItems:"center", justifyContent:"center",
        height:"100vh", background:"#f5f6fa", color:"#1a1a2e", fontFamily:"sans-serif",
      }}>
        Loading...
      </div>
    );
  }

  // ─────────────────────────────────────────
  // EXPENSE HANDLERS
  // ─────────────────────────────────────────
  function openAddModal() {
    setEditingExpense(null);
    setShowModal(true);
  }

  function openEditModal(expense) {
    setEditingExpense(expense);
    setShowModal(true);
  }

  async function handleSave(formData) {
    if (!formData.title.trim() || !formData.amount || isNaN(parseFloat(formData.amount))) {
      showToast("Please fill in title and a valid amount", "error");
      return;
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
    } catch (err) {
      showToast(err.message || "Something went wrong", "error");
    }
  }

  async function handleDelete(id) {
    try {
      await deleteExpense(id);
      showToast("Expense deleted", "error");
    } catch (err) {
      showToast(err.message || "Failed to delete", "error");
    }
  }

  async function handleSaveBudgets(newBudgets) {
    try {
      await saveBudgets(newBudgets);
      showToast("Budgets saved!");
    } catch (err) {
      showToast(err.message || "Failed to save budgets", "error");
    }
  }

  // ─────────────────────────────────────────
  // INCOME HANDLERS
  // ─────────────────────────────────────────
  function openAddIncomeModal() {
    setEditingIncome(null);
    setShowIncomeModal(true);
  }

  function openEditIncomeModal(income) {
    setEditingIncome(income);
    setShowIncomeModal(true);
  }

  async function handleSaveIncome(formData) {
    if (!formData.title.trim() || !formData.amount || isNaN(parseFloat(formData.amount))) {
      showToast("Please fill in title and a valid amount", "error");
      return;
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
    } catch (err) {
      showToast(err.message || "Something went wrong", "error");
    }
  }

  async function handleDeleteIncome(id) {
    try {
      await deleteIncome(id);
      showToast("Income deleted", "error");
    } catch (err) {
      showToast(err.message || "Failed to delete", "error");
    }
  }

  // ─────────────────────────────────────────
  // DEBT HANDLERS
  // ─────────────────────────────────────────
  function openAddDebtModal() {
    setEditingDebt(null);
    setShowDebtModal(true);
  }

  function openEditDebtModal(debt) {
    setEditingDebt(debt);
    setShowDebtModal(true);
  }

  async function handleSaveDebt(formData) {
    if (!formData.name.trim() || !formData.balance) {
      showToast("Please fill in name and balance", "error");
      return;
    }
    try {
      if (editingDebt) {
        await updateDebt(editingDebt.id, formData);
        showToast("Debt updated!");
      } else {
        await addDebt(formData);
        showToast("Debt added!");
      }
      setShowDebtModal(false);
    } catch (err) {
      showToast(err.message || "Something went wrong", "error");
    }
  }

  async function handleDeleteDebt(id) {
    try {
      await deleteDebt(id);
      showToast("Debt removed", "error");
    } catch (err) {
      showToast(err.message || "Failed to delete", "error");
    }
  }

  async function handleMarkPaidOff(id) {
    try {
      await markPaidOff(id);
      showToast("Congratulations! Debt paid off! 🎉");
    } catch (err) {
      showToast(err.message || "Something went wrong", "error");
    }
  }

  // ── Logout ────────────────────────────────
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
          <Payments
            debts={debts}
            paymentHistory={paymentHistory}
            onAdd={openAddDebtModal}
            onEdit={openEditDebtModal}
            onDelete={handleDeleteDebt}
            onMarkPaidOff={handleMarkPaidOff}
            onRecordPayment={async (debtId, amount, note) => {
              try {
                await recordPayment(debtId, amount, note);
                showToast("Payment recorded! 💰");
              } catch (err) {
                showToast(err.message || "Failed to record payment", "error");
              }
            }}
            isDueSoon={isDueSoon}
            isOverdue={isOverdue}
            daysUntilDue={daysUntilDue}
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

        <BottomNav view={view} setView={setView} />
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

      {showDebtModal && (
        <AddDebtModal
          editingDebt={editingDebt}
          onSave={handleSaveDebt}
          onClose={() => setShowDebtModal(false)}
        />
      )}

    </div>
  );
}