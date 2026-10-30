import "./styles/global.css";
import { useState, useEffect } from "react";


// Hooks
import { useExpenses }         from "./hooks/useExpenses";
import { useToast }            from "./hooks/useToast";
import { useAuth }             from "./hooks/useAuth";
import { useIncome }           from "./hooks/useIncome";
import { useFinancialPlanner } from "./hooks/useFinancialPlanner";
import { useCurrency }         from "./hooks/useCurrency";

// Auth pages
import Login          from "./pages/Login";
import Register       from "./pages/Register";
import ForgotPassword from "./pages/ForgotPassword";
import Landing        from "./pages/Landing";

// Layout
import Sidebar         from "./components/Sidebar";
import TopBar          from "./components/TopBar";
import BottomNav       from "./components/BottomNav";
import Toast           from "./components/Toast";
import AddExpenseModal from "./components/AddExpenseModal";
import AddIncomeModal  from "./components/AddIncomeModal";
import ImportStatementModal from "./components/ImportStatementModal";

// Pages
import Dashboard         from "./pages/Dashboard";
import Expenses          from "./pages/Expenses";
import Analytics         from "./pages/Analytics";
import Profile           from "./pages/Profile";

// Utils
import { exportToCSV } from "./utils/helpers";

import FinancialPlanner   from "./pages/FinancialPlanner";
import AssistantWidget    from "./components/AssistantWidget";
import Activity           from "./pages/Activity";
import Accounts           from "./pages/Accounts";
import Investments        from "./pages/Investments";
import Icon               from "./components/Icon";

export default function App() {

  // ── Auth ──────────────────────────────────
  const { user, loading, login, loginTwoFactor, register, logout, logoutEverywhere, isLoggedIn } = useAuth();
  const [authView, setAuthView] = useState("landing");
  function goToAuthView(next) {
    setAuthView(next);
    window.scrollTo(0, 0);
  }

  // ── Navigation ────────────────────────────
  // Remembered for this tab, so reloading stays on the same page.
  const [view, setView] = useState(() => {
    try { return sessionStorage.getItem("expenseiq_view") || "dashboard"; }
    catch { return "dashboard"; }
  });
  useEffect(() => {
    try { sessionStorage.setItem("expenseiq_view", view); } catch {}
  }, [view]);
  const [accountsKey, setAccountsKey] = useState(0);   // bumped after an import to refresh Accounts

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
  const [showImport,      setShowImport]      = useState(false);
  const [editingIncome,   setEditingIncome]   = useState(null);


  // ── Data hooks ────────────────────────────
  const {
    expenses, loaded,
    addExpense, updateExpense, deleteExpense, bulkDeleteExpenses,
    reload: reloadExpenses,
  } = useExpenses(user?.id);

  const {
    incomes, loaded: incomeLoaded,
    addIncome, updateIncome, deleteIncome, bulkDeleteIncomes,
    reload: reloadIncome,
  } = useIncome(user?.id);

  const {
    debts, recurring, emergencyFund, currentPlan, checklist,
    loaded: plannerLoaded, rolledOver,
    addDebt, updateDebt, deleteDebt,
    addRecurring, updateRecurring, deleteRecurring,
    updateEmergencyFund,
    addChecklistItem, toggleChecklistItem, deleteChecklistItem,
    rolloverToNextMonth, generateChecklist,
    reload: reloadPlanner,
  } = useFinancialPlanner(user?.id);

  // ── Refresh data changed by the assistant ──
  // The assistant writes straight to the backend, so the hooks above don't
  // see those changes unless we refetch. Reload silently so the app doesn't
  // drop back to the loading skeleton (which would unmount the chat).
  function handleAssistantActions(actions) {
    const tools = new Set(actions.map(a => a.tool));
    const touches = (...names) => names.some(n => tools.has(n));
    if (touches("add_expense", "update_expense", "delete_expense")) {
      reloadExpenses({ silent: true });
    }
    if (touches("add_income")) {
      reloadIncome({ silent: true });
    }
    if (touches("add_rule")) {          // rules can rename, recategorise or remove imported entries
      reloadExpenses({ silent: true });
      reloadIncome({ silent: true });
      setAccountsKey(k => k + 1);
    }
    if (touches(
      "add_debt", "update_debt", "delete_debt", "update_emergency_fund",
      "add_checklist_item", "toggle_checklist_item", "delete_checklist_item",
      "generate_checklist", "rollover_month",
      "add_recurring_payment", "update_recurring_payment", "delete_recurring_payment",
    )) {
      reloadPlanner({ silent: true });
    }
  }

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
  const todayDay = new Date().getDate();
  const overdueCount = checklist.filter(
    i => !i.is_completed && i.due_day && i.due_day < todayDay
  ).length;
  const dueSoonCount = checklist.filter(
    i => !i.is_completed && i.due_day && i.due_day >= todayDay && i.due_day - todayDay <= 7
  ).length;
  const badges = {
    payments: overdueCount + dueSoonCount,
  };

  // ── Auth pages ────────────────────────────
  if (!isLoggedIn && !loading) {
    if (authView === "landing") {
      return (
        <Landing
          onGetStarted={() => goToAuthView("register")}
          onSignIn={() => goToAuthView("login")}
          darkMode={darkMode}
          onToggleDark={() => setDarkMode(p => !p)}
        />
      );
    }
    if (authView === "register") {
      return (
        <Register
          onRegister={async (email, username, password, password2) => {
            await register(email, username, password, password2);
            showToast("Account created! Welcome");
          }}
          onGoToLogin={() => goToAuthView("login")}
          onGoHome={() => goToAuthView("landing")}
        />
      );
    }
    if (authView === "forgot-password") {
      return <ForgotPassword onGoToLogin={() => goToAuthView("login")} />;
    }
    return (
      <Login
        onLogin={async (email, password) => {
          const result = await login(email, password);
          if (!result.mfa_required) showToast("Welcome back!");
          return result;
        }}
        onTwoFactor={async (mfaToken, code) => {
          const result = await loginTwoFactor(mfaToken, code);
          if (result.backup_codes_left !== undefined) {
            showToast(`Signed in with a backup code — ${result.backup_codes_left} left`);
          } else {
            showToast("Welcome back!");
          }
        }}
        onGoToRegister={() => goToAuthView("register")}
        onGoToForgot={()  => goToAuthView("forgot-password")}
        onGoHome={() => goToAuthView("landing")}
      />
    );
  }

  // ── Skeleton loading ──────────────────────
  if (loading || !loaded || !incomeLoaded || !plannerLoaded) {
    return (
      <div style={{
        display:    "flex",
        minHeight:  "100vh",
        background: "var(--bg)",
        fontFamily: "'Inter', sans-serif",
      }}>
        {/* Fake sidebar */}
        <div style={{
          width:       248,
          background:  "var(--card)",
          borderRight: "1px solid var(--border)",
          padding:     "20px 16px",
          flexShrink:  0,
        }}>
          <div style={{ display:"flex", gap:8, marginBottom:28, alignItems:"center" }}>
            <div style={{ width:10, height:10, borderRadius:"50%", background:"var(--border)" }} />
            <div style={{ width:80, height:14, borderRadius:6, background:"var(--border)" }} />
          </div>
          {[1,2,3,4,5,6].map(i => (
            <div key={i} style={{ height:36, borderRadius:8, background:"var(--bg)", marginBottom:6 }} />
          ))}
        </div>
        {/* Fake content */}
        <div style={{ flex:1, padding:"32px" }}>
          <div style={{ width:160, height:28, borderRadius:8, background:"var(--border)", marginBottom:8 }} />
          <div style={{ width:120, height:14, borderRadius:6, background:"var(--subtle2)", marginBottom:28 }} />
          <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:16, marginBottom:24 }}>
            {[1,2,3,4].map(i => (
              <div key={i} style={{ height:110, borderRadius:12, background:"linear-gradient(135deg,var(--border),var(--subtle2))" }} />
            ))}
          </div>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:20 }}>
            {[1,2].map(i => (
              <div key={i} style={{ height:280, borderRadius:12, background:"var(--card)", border:"1px solid var(--border)" }} />
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
        showToast("Income added!");
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
  setView("dashboard");
  setAuthView("landing");
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
              color:          "var(--muted)",
              gap:            12,
            }}>
              <Icon name="loader" size={32} className="spin" />
              <div style={{ fontWeight:600, fontSize:15 }}>Loading your data...</div>
              <div style={{ fontSize:12, color:"var(--faint)" }}>Fetching expenses and income...</div>
            </div>
          );
        }
        return (
          <Dashboard
            refreshKey={accountsKey}
            onOpenRules={() => setView("accounts")}
            expenses={expenses}
            onEdit={openEditModal}
            onDelete={handleDelete}
            onViewAll={() => setView("expenses")}
            incomes={incomes}
            onEditIncome={openEditIncomeModal}
            onDeleteIncome={handleDeleteIncome}
            onBulkDeleteIncome={async (ids, label) => {
              try {
                const { deleted } = await bulkDeleteIncomes(ids, label);
                showToast(`Deleted ${deleted} income entr${deleted === 1 ? "y" : "ies"}`, "error");
              } catch (err) { showToast(err.message || "Failed to delete", "error"); }
            }}
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
            onImport={() => setShowImport(true)}
            onBulkDelete={async (ids, label) => {
              try {
                const { deleted } = await bulkDeleteExpenses(ids, label);
                showToast(`Deleted ${deleted} expense${deleted === 1 ? "" : "s"}`, "error");
              } catch (err) { showToast(err.message || "Failed to delete", "error"); }
            }}
          />
        );
      case "analytics":
        return (
          <Analytics
            expenses={expenses}
            formatAmount={formatAmount}
          />
        );
      case "payments":
        return (
          <FinancialPlanner
            currency={currency}
            getRate={getRate}
            debts={debts}
            recurring={recurring}
            emergencyFund={emergencyFund}
            currentPlan={currentPlan}
            checklist={checklist}
            loaded={plannerLoaded}
            rolledOver={rolledOver}
            addDebt={addDebt}
            updateDebt={updateDebt}
            deleteDebt={deleteDebt}
            addRecurring={addRecurring}
            updateRecurring={updateRecurring}
            deleteRecurring={deleteRecurring}
            updateEmergencyFund={updateEmergencyFund}
            addChecklistItem={addChecklistItem}
            toggleChecklistItem={toggleChecklistItem}
            deleteChecklistItem={deleteChecklistItem}
            rolloverToNextMonth={rolloverToNextMonth}
            generateChecklist={generateChecklist}
            formatAmount={formatAmount}
            onAddExpense={async (formData) => {
              try {
                await addExpense(formData);
                showToast("Expense added from planner!");
              } catch (err) {
                showToast(err.message || "Failed to add expense", "error");
              }
            }}
          />
        );
      case "activity":
        return <Activity formatAmount={formatAmount} />;
      case "accounts":
        return (
          <Accounts
            formatAmount={formatAmount}
            refreshKey={accountsKey}
            onImport={() => setShowImport(true)}
            onDebtsChanged={() => reloadPlanner({ silent: true })}
            onEntriesDeleted={({ deleted_expenses, deleted_income, silent }) => {
              reloadExpenses({ silent: true });
              reloadIncome({ silent: true });
              if (!silent) showToast(`Deleted ${deleted_expenses} expense${deleted_expenses === 1 ? "" : "s"} and ${deleted_income} income`, "error");
            }}
          />
        );
      case "investments":
        return <Investments getRate={getRate} currency={currency} formatAmount={formatAmount}
                            showToast={showToast} recurring={recurring} />;
      case "profile":
        return (
          <Profile
            user={user}
            onLogout={handleLogout}
            onLogoutEverywhere={async () => {
              await logoutEverywhere();
              setAuthView("landing");
              showToast("Signed out on every device");
            }}
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
          currency={currency}
          getRate={getRate}
          editingExpense={editingExpense}
          onSave={handleSave}
          onClose={() => setShowModal(false)}
        />
      )}

      <AssistantWidget onActionsTaken={handleAssistantActions} />

      {showImport && (
        <ImportStatementModal
          formatAmount={formatAmount}
          onClose={() => setShowImport(false)}
          onImported={({ imported_expenses, imported_income, ticked_checklist, statements_saved, resync, debts_updated }) => {
            setShowImport(false);
            setAccountsKey(k => k + 1);
            reloadExpenses({ silent: true });
            reloadIncome({ silent: true });
            if (ticked_checklist || debts_updated?.length) reloadPlanner({ silent: true });
            showToast(
              `Imported ${imported_expenses} expense${imported_expenses === 1 ? "" : "s"} and ${imported_income} income` +
              (ticked_checklist ? ` · ticked ${ticked_checklist} in Planner` : "") +
              (statements_saved ? ` · ${statements_saved} statement${statements_saved === 1 ? "" : "s"} saved to Accounts` : "") +
              (resync?.statements ? ` · ${resync.statements} re-read (${resync.rows_added} rows added, ${resync.rows_removed} removed` +
                (resync.entries_removed ? `, ${resync.entries_removed} wrong entr${resync.entries_removed === 1 ? "y" : "ies"} deleted` : "") + ")" : "") +
              (debts_updated?.length ? ` · updated ${debts_updated.map(d => d.debt).join(", ")} in Planner` : "")
            );
          }}
        />
      )}

      {showIncomeModal && (
        <AddIncomeModal
          currency={currency}
          getRate={getRate}
          editingIncome={editingIncome}
          onSave={handleSaveIncome}
          onClose={() => setShowIncomeModal(false)}
        />
      )}


    </div>
  );
}