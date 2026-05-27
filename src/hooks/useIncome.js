import { useState, useEffect, useCallback } from "react";
import { incomeAPI } from "../utils/api";

export const INCOME_CATEGORIES = [
  { name: "Salary",     icon: "💼", color: "#059669" },
  { name: "Freelance",  icon: "💻", color: "#0070f3" },
  { name: "Investment", icon: "📈", color: "#7c3aed" },
  { name: "Business",   icon: "🏢", color: "#d97706" },
  { name: "Rental",     icon: "🏠", color: "#db2777" },
  { name: "Gift",       icon: "🎁", color: "#e11d48" },
  { name: "Refund",     icon: "↩️", color: "#0891b2" },
  { name: "Other",      icon: "💡", color: "#6b7280" },
];

export function useIncome() {
  const [incomes, setIncomes] = useState([]);
  const [loaded,  setLoaded]  = useState(false);
  const [error,   setError]   = useState(null);

  const loadData = useCallback(async () => {
    try {
      setLoaded(false);
      const token = localStorage.getItem("access_token");
      if (!token) { setLoaded(true); return; }

      await new Promise(resolve => setTimeout(resolve, 300));

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

  useEffect(() => {
    loadData();
  }, [loadData]);

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