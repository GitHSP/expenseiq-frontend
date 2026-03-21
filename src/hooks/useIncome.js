// ─────────────────────────────────────────────
// useIncome — manages income entries
// Now connected to Django API
// ─────────────────────────────────────────────

import { useState, useEffect, useCallback } from "react";
import { incomeAPI } from "../utils/api";

export const INCOME_CATEGORIES = [
  { name: "Salary",     icon: "💼", color: "#55EFC4" },
  { name: "Freelance",  icon: "💻", color: "#74B9FF" },
  { name: "Investment", icon: "📈", color: "#A29BFE" },
  { name: "Business",   icon: "🏢", color: "#FFE66D" },
  { name: "Rental",     icon: "🏠", color: "#FD79A8" },
  { name: "Gift",       icon: "🎁", color: "#FF6B6B" },
  { name: "Refund",     icon: "↩️", color: "#4ECDC4" },
  { name: "Other",      icon: "💡", color: "#B2BEC3" },
];

export function useIncome() {
  const [incomes, setIncomes] = useState([]);
  const [loaded,  setLoaded]  = useState(false);
  const [error,   setError]   = useState(null);

  // ── Load all income on startup ──
  const loadData = useCallback(async () => {
    try {
      setLoaded(false);
      const data = await incomeAPI.getAll();
      setIncomes(data);
    } catch (err) {
      setError(err.message);
      console.error("Failed to load income:", err);
    } finally {
      setLoaded(true);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // ── Add new income ──
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

  // ── Update existing income ──
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

  // ── Delete income ──
  async function deleteIncome(id) {
    try {
      await incomeAPI.delete(id);
      setIncomes(prev => prev.filter(i => i.id !== id));
    } catch (err) {
      throw new Error(err.message);
    }
  }

  return {
    incomes,
    loaded,
    error,
    addIncome,
    updateIncome,
    deleteIncome,
    reload: loadData,
  };
}