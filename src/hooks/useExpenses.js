// ─────────────────────────────────────────────
// useExpenses — manages expenses and budgets
// Now connected to Django API
// ─────────────────────────────────────────────

import { useState, useEffect, useCallback } from "react";
import { expensesAPI, budgetsAPI } from "../utils/api";
import { DEFAULT_BUDGETS }         from "../constants/categories";

export function useExpenses() {
  const [expenses, setExpenses] = useState([]);
  const [budgets,  setBudgets]  = useState(DEFAULT_BUDGETS);
  const [loaded,   setLoaded]   = useState(false);
  const [error,    setError]    = useState(null);

  // ── Load all data on startup ──
  const loadData = useCallback(async () => {
    try {
      setLoaded(false);

      // Load expenses and budgets in parallel
      const [expensesData, budgetsData] = await Promise.all([
        expensesAPI.getAll(),
        budgetsAPI.getAll(),
      ]);

      setExpenses(expensesData);

      // Convert budgets array to object format
      // Django returns: [{ category: "Food", amount: 500 }]
      // We need:        { "Food": 500 }
      if (budgetsData.length > 0) {
        const budgetsObj = Object.fromEntries(
          budgetsData.map(b => [b.category, parseFloat(b.amount)])
        );
        setBudgets(prev => ({ ...prev, ...budgetsObj }));
      }

    } catch (err) {
      setError(err.message);
      console.error("Failed to load expenses:", err);
    } finally {
      setLoaded(true);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // ── Add new expense ──
  async function addExpense(formData) {
    try {
      const newExpense = await expensesAPI.create({
        title:    formData.title,
        amount:   parseFloat(formData.amount),
        category: formData.category,
        date:     formData.date,
        tags:     formData.tags.split(",").map(t => t.trim()).filter(Boolean),
        notes:    formData.notes || "",
      });
      // Add to top of list
      setExpenses(prev => [newExpense, ...prev]);
    } catch (err) {
      throw new Error(err.message);
    }
  }

  // ── Update existing expense ──
  async function updateExpense(id, formData) {
    try {
      const updated = await expensesAPI.update(id, {
        title:    formData.title,
        amount:   parseFloat(formData.amount),
        category: formData.category,
        date:     formData.date,
        tags:     formData.tags.split(",").map(t => t.trim()).filter(Boolean),
        notes:    formData.notes || "",
      });
      setExpenses(prev => prev.map(e => e.id === id ? updated : e));
    } catch (err) {
      throw new Error(err.message);
    }
  }

  // ── Delete expense ──
  async function deleteExpense(id) {
    try {
      await expensesAPI.delete(id);
      setExpenses(prev => prev.filter(e => e.id !== id));
    } catch (err) {
      throw new Error(err.message);
    }
  }

  // ── Save budgets ──
  async function saveBudgets(newBudgets) {
    try {
      // Save each budget category to Django
      await Promise.all(
        Object.entries(newBudgets).map(([category, amount]) =>
          budgetsAPI.update(category, amount)
        )
      );
      setBudgets(newBudgets);
    } catch (err) {
      throw new Error(err.message);
    }
  }

  return {
    expenses,
    budgets,
    loaded,
    error,
    addExpense,
    updateExpense,
    deleteExpense,
    saveBudgets,
    reload: loadData,
  };
}