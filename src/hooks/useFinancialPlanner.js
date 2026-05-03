import { useState, useEffect, useCallback } from "react";
import { financialPlannerAPI }              from "../utils/api";

export function useFinancialPlanner() {
  const [debts,         setDebts]         = useState([]);
  const [emergencyFund, setEmergencyFund] = useState(null);
  const [currentPlan,   setCurrentPlan]   = useState(null);
  const [checklist,     setChecklist]     = useState([]);
  const [loaded,        setLoaded]        = useState(false);
  const [error,         setError]         = useState(null);

  const loadData = useCallback(async () => {
    try {
      setLoaded(false);
      const token = localStorage.getItem("access_token");
      if (!token) { setLoaded(true); return; }

      // Load debts and emergency fund in parallel
      const [debtsData, fundData, planData] = await Promise.all([
        financialPlannerAPI.getDebts(),
        financialPlannerAPI.getEmergencyFund(),
        financialPlannerAPI.getCurrentPlan(),
      ]);

      setDebts(Array.isArray(debtsData) ? debtsData : []);
      setEmergencyFund(fundData);
      setCurrentPlan(planData);

      // Load checklist for current plan
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
    setDebts(prev => [...prev, newDebt].sort((a, b) => a.avalanche_order - b.avalanche_order));
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
    const updated = await financialPlannerAPI.toggleChecklist(id);
    setChecklist(prev => prev.map(item => item.id === id ? updated : item));
  }

  async function deleteChecklistItem(id) {
    await financialPlannerAPI.deleteChecklist(id);
    setChecklist(prev => prev.filter(item => item.id !== id));
  }

  return {
    debts, emergencyFund, currentPlan, checklist, loaded, error,
    addDebt, updateDebt, deleteDebt,
    updateEmergencyFund,
    addChecklistItem, toggleChecklistItem, deleteChecklistItem,
    reload: loadData,
  };
}