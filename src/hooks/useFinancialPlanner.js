import { useState, useEffect, useCallback } from "react";
import { financialPlannerAPI }              from "../utils/api";

export function useFinancialPlanner() {
  const [debts,         setDebts]         = useState([]);
  const [emergencyFund, setEmergencyFund] = useState(null);
  const [currentPlan,   setCurrentPlan]   = useState(null);
  const [checklist,     setChecklist]     = useState([]);
  const [loaded,        setLoaded]        = useState(false);
  const [error,         setError]         = useState(null);
  const [rolledOver,    setRolledOver]    = useState(false);

  const loadData = useCallback(async () => {
    try {
      setLoaded(false);
      const token = localStorage.getItem("access_token");
      if (!token) { setLoaded(true); return; }

      const [debtsData, fundData] = await Promise.all([
        financialPlannerAPI.getDebts(),
        financialPlannerAPI.getEmergencyFund(),
      ]);

      setDebts(Array.isArray(debtsData) ? debtsData : []);
      setEmergencyFund(fundData);

      // ── Get current plan ──
      let planData = await financialPlannerAPI.getCurrentPlan();

      // ── Auto rollover check ──
      const now          = new Date();
      const currentMonth = now.getMonth() + 1;
      const currentYear  = now.getFullYear();

      if (
        planData &&
        (planData.month !== currentMonth || planData.year !== currentYear)
      ) {
        try {
          const rolloverResult = await financialPlannerAPI.rollover();
          planData = rolloverResult.plan;
          if (rolloverResult.debts_updated) {
            setDebts(rolloverResult.debts_updated);
          }
          setRolledOver(true);
          setTimeout(() => setRolledOver(false), 5000);
        } catch {
          planData = await financialPlannerAPI.getCurrentPlan();
        }
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

  useEffect(() => {
    loadData();
  }, [loadData]);

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
    debts, emergencyFund, currentPlan, checklist,
    loaded, error, rolledOver,
    addDebt, updateDebt, deleteDebt,
    updateEmergencyFund,
    addChecklistItem, toggleChecklistItem, deleteChecklistItem,
    rolloverToNextMonth, generateChecklist,
    reload: loadData,
  };
}