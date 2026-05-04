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
      // If plan month != current month → auto generate new month
      const now          = new Date();
      const currentMonth = now.getMonth() + 1; // 1-12
      const currentYear  = now.getFullYear();

      if (
        planData &&
        (planData.month !== currentMonth || planData.year !== currentYear)
      ) {
        // Old plan exists but it's a new month — auto rollover!
        try {
          const rolloverResult = await financialPlannerAPI.rollover();
          planData = rolloverResult.plan;
          // Update debts with new interest-applied balances
          if (rolloverResult.debts_updated) {
            setDebts(rolloverResult.debts_updated);
          }
          setRolledOver(true);
          // Hide the notification after 5 seconds
          setTimeout(() => setRolledOver(false), 5000);
        } catch (rollErr) {
          // Rollover might fail if plan already exists for this month
          // In that case just get current plan
          planData = await financialPlannerAPI.getCurrentPlan();
        }
      }

      setCurrentPlan(planData);

      // ── Load checklist for current plan ──
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
    setDebts(prev => [...prev, newDebt]
      .sort((a, b) => a.avalanche_order - b.avalanche_order));
  }

  async function updateDebt(id, data) {
    const updated = await financialPlannerAPI.updateDebt(id, data);
    setDebts(prev => prev.map(d => d.id === id ? updated : d));
  }

  async function deleteDebt(id) {
    await financialPlannerAPI.deleteDebt(id);
    setDebts(prev => prev.filter(d => d.id !== id));
  }

  // ── Emergency fund actions ──
  async function updateEmergencyFund(data) {
    const updated = await financialPlannerAPI.updateEmergencyFund(data);
    setEmergencyFund(updated);
  }

  // ── Checklist actions ──
  async function addChecklistItem(data) {
    if (!currentPlan?.id) return;
    const newItem = await financialPlannerAPI.createChecklist(currentPlan.id, data);
    setChecklist(prev => [...prev, newItem]);
  }

  async function toggleChecklistItem(id) {
    const result = await financialPlannerAPI.toggleChecklist(id);

    setChecklist(prev => prev.map(item =>
      item.id === id ? result.item : item
    ));

    if (result.debt_updated) {
      setDebts(prev => prev.map(d =>
        d.id === result.debt_updated.id ? result.debt_updated : d
      ));
    }

    if (result.fund_updated) {
      setEmergencyFund(result.fund_updated);
    }

    return result;
  }

  async function deleteChecklistItem(id) {
    await financialPlannerAPI.deleteChecklist(id);
    setChecklist(prev => prev.filter(item => item.id !== id));
  }

  // ── Manual rollover (still available as backup) ──
  async function rolloverToNextMonth() {
    const result = await financialPlannerAPI.rollover();
    await loadData();
    return result;
  }

  return {
    debts, emergencyFund, currentPlan, checklist,
    loaded, error, rolledOver,
    addDebt, updateDebt, deleteDebt,
    updateEmergencyFund,
    addChecklistItem, toggleChecklistItem, deleteChecklistItem,
    rolloverToNextMonth,
    reload: loadData,
  };
}