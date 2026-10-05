import { useState, useEffect, useCallback } from "react";
import { incomeAPI } from "../utils/api";

export const INCOME_CATEGORIES = [
  { name: "Salary",     icon: "briefcase"  , color: "#059669" },
  { name: "Freelance",  icon: "laptop"     , color: "#0070f3" },
  { name: "Investment", icon: "trending-up", color: "#7c3aed" },
  { name: "Business",   icon: "building"   , color: "#d97706" },
  { name: "Rental",     icon: "house"      , color: "#db2777" },
  { name: "Gift",       icon: "gift"       , color: "#e11d48" },
  { name: "Refund",     icon: "undo"       , color: "#0891b2" },
  { name: "Other",      icon: "lightbulb"  , color: "#6b7280" },
];

export function useIncome(userId) {
  const [incomes, setIncomes] = useState([]);
  const [loaded,  setLoaded]  = useState(false);
  const [error,   setError]   = useState(null);

  const loadData = useCallback(async ({ silent = false } = {}) => {
    try {
      if (!silent) setLoaded(false);
      const token = localStorage.getItem("access_token");
      if (!token) { setLoaded(true); return; }

      if (!silent) await new Promise(resolve => setTimeout(resolve, 300));

      const data = await incomeAPI.getAll();
      setIncomes(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err.message);
      console.error("Failed to load income:", err);
      setIncomes([]);
    } finally {
      setLoaded(true);
    }
  }, []);

  // Load when a user logs in (or the page loads with a saved session),
  // and clear when they log out — a mount-only load would run before
  // login and never fetch again.
  useEffect(() => {
    if (!userId) {
      setIncomes([]);
      setLoaded(true);
      return;
    }
    loadData();
  }, [userId, loadData]);

  async function addIncome(formData) {
    try {
      const newIncome = await incomeAPI.create({
        title:    formData.title,
        amount:   parseFloat(formData.amount),
        category: formData.category,
        date:     formData.date,
        notes:    formData.notes || "",
      });
      setIncomes(prev => [newIncome, ...prev]);
    } catch (err) {
      throw new Error(err.message);
    }
  }

  async function updateIncome(id, formData) {
    try {
      const updated = await incomeAPI.update(id, {
        title:    formData.title,
        amount:   parseFloat(formData.amount),
        category: formData.category,
        date:     formData.date,
        notes:    formData.notes || "",
      });
      setIncomes(prev => prev.map(i => i.id === id ? updated : i));
    } catch (err) {
      throw new Error(err.message);
    }
  }

  async function deleteIncome(id) {
    try {
      await incomeAPI.delete(id);
      setIncomes(prev => prev.filter(i => i.id !== id));
    } catch (err) {
      throw new Error(err.message);
    }
  }

  return {
    incomes, loaded, error,
    addIncome, updateIncome, deleteIncome,
    reload: loadData,
  };
}