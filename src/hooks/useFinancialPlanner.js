import { useState, useEffect, useCallback } from "react";
import { financialPlannerAPI }              from "../utils/api";

export function useFinancialPlanner(userId) {
  const [debts,         setDebts]         = useState([]);
  const [recurring,     setRecurring]     = useState([]);
  const [emergencyFund, setEmergencyFund] = useState(null);
  const [currentPlan,   setCurrentPlan]   = useState(null);
  const [checklist,     setChecklist]     = useState([]);
  const [loaded,        setLoaded]        = useState(false);
  const [error,         setError]         = useState(null);
  const [rolledOver,    setRolledOver]    = useState(false);

  const loadData = useCallback(async ({ silent = false } = {}) => {
    try {
      if (!silent) setLoaded(false);
      const token = localStorage.getItem("access_token");
      if (!token) { setLoaded(true); return; }

      // The current-plan request goes first: on the first visit of a new
      // month it builds the month's checklist and applies interest to the
      // debts, so debts must be fetched after it.
      const planData = await financialPlannerAPI.getCurrentPlan();

      const [debtsData, fundData, recurringData] = await Promise.all([
        financialPlannerAPI.getDebts(),
        financialPlannerAPI.getEmergencyFund(),
        // Tolerate a backend that doesn't have recurring payments yet.
        financialPlannerAPI.getRecurring().catch(() => []),
      ]);

      setDebts(Array.isArray(debtsData) ? debtsData : []);
      setEmergencyFund(fundData);
      setRecurring(Array.isArray(recurringData) ? recurringData : []);

      if (planData?.rolled_over) {
        setRolledOver(true);
        setTimeout(() => setRolledOver(false), 5000);
      }

      setCurrentPlan(planData);

      if (planData?.id) {
        const checklistData = await financialPlannerAPI.getChecklist(planData.id);
        setChecklist(Array.isArray(checklistData) ? checklistData : []);
      }

    } catch (err) {
      setError(err.message);
      console.error("Failed to load financial planner:", err);
    } finally {
      setLoaded(true);
    }
  }, []);

  // Load when a user logs in (or the page loads with a saved session),
  // and clear when they log out — a mount-only load would run before
  // login and never fetch again.
  useEffect(() => {
    if (!userId) {
      setDebts([]);
      setRecurring([]);
      setEmergencyFund(null);
      setCurrentPlan(null);
      setChecklist([]);
      setLoaded(true);
      return;
    }
    loadData();
  }, [userId, loadData]);

  // ── Debt actions ──
  async function addDebt(data) {
    const newDebt = await financialPlannerAPI.createDebt(data);
    // Reload to get updated avalanche order
    await loadData();
    return newDebt;
  }

  async function updateDebt(id, data) {
    const updated = await financialPlannerAPI.updateDebt(id, data);
    // Reload to get updated avalanche order
    await loadData();
    return updated;
  }

  async function deleteDebt(id) {
    await financialPlannerAPI.deleteDebt(id);
    await loadData();
  }

  // ── Recurring payments ──
  // The backend re-syncs this month's checklist on every change, so
  // refresh the plan and checklist alongside the list itself.
  async function refreshRecurringAndChecklist() {
    const [recurringData, planData] = await Promise.all([
      financialPlannerAPI.getRecurring(),
      financialPlannerAPI.getCurrentPlan(),
    ]);
    setRecurring(Array.isArray(recurringData) ? recurringData : []);
    setCurrentPlan(planData);
    setChecklist(Array.isArray(planData?.checklist_items) ? planData.checklist_items : []);
  }

  async function addRecurring(data) {
    const item = await financialPlannerAPI.createRecurring(data);
    await refreshRecurringAndChecklist();
    return item;
  }

  async function updateRecurring(id, data) {
    const item = await financialPlannerAPI.updateRecurring(id, data);
    await refreshRecurringAndChecklist();
    return item;
  }

  async function deleteRecurring(id) {
    await financialPlannerAPI.deleteRecurring(id);
    await refreshRecurringAndChecklist();
  }

  // ── Emergency fund ──
  async function updateEmergencyFund(data) {
    const updated = await financialPlannerAPI.updateEmergencyFund(data);
    setEmergencyFund(updated);
  }

  // ── Checklist actions ──
  async function addChecklistItem(data) {
    if (!currentPlan?.id) return;
    const newItem = await financialPlannerAPI.createChecklist(currentPlan.id, data);
    setChecklist(prev => [...prev, newItem]);
    return newItem;
  }

  async function toggleChecklistItem(id) {
    const response = await financialPlannerAPI.toggleChecklist(id);

    // ── Handle both old and new response formats ──
    const item = response?.item || response;

    setChecklist(prev => prev.map(i =>
      i.id === id ? item : i
    ));

    if (response?.debt_updated) {
      setDebts(prev => prev.map(d =>
        d.id === response.debt_updated.id ? response.debt_updated : d
      ));
    }

    if (response?.fund_updated) {
      setEmergencyFund(response.fund_updated);
    }

    return response;
  }

  async function deleteChecklistItem(id) {
    await financialPlannerAPI.deleteChecklist(id);
    setChecklist(prev => prev.filter(item => item.id !== id));
  }

  // ── Rollover ──
  async function rolloverToNextMonth() {
    const result = await financialPlannerAPI.rollover();
    await loadData();
    return result;
  }

  // ── Generate checklist from debts ──
  async function generateChecklist() {
    const result = await financialPlannerAPI.generateChecklist();
    await loadData();
    return result;
  }

  return {
    debts, recurring, emergencyFund, currentPlan, checklist,
    loaded, error, rolledOver,
    addDebt, updateDebt, deleteDebt,
    addRecurring, updateRecurring, deleteRecurring,
    updateEmergencyFund,
    addChecklistItem, toggleChecklistItem, deleteChecklistItem,
    rolloverToNextMonth, generateChecklist,
    reload: loadData,
  };
}