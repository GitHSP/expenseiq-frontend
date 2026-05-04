import { useState, useEffect, useCallback } from "react";
import { expensesAPI, budgetsAPI }          from "../utils/api";

const DEFAULT_BUDGETS = {};

export function useExpenses() {
  const [expenses, setExpenses] = useState([]);
  const [budgets,  setBudgets]  = useState(DEFAULT_BUDGETS);
  const [loaded,   setLoaded]   = useState(false);
  const [error,    setError]    = useState(null);

  const loadData = useCallback(async () => {
    try {
      setLoaded(false);
      const token = localStorage.getItem("access_token");
      if (!token) { setLoaded(true); return; }

      await new Promise(resolve => setTimeout(resolve, 100));

      const [expensesData, budgetsData] = await Promise.all([
        expensesAPI.getAll(),
        budgetsAPI.getAll(),
      ]);

      setExpenses(Array.isArray(expensesData) ? expensesData : []);

      if (Array.isArray(budgetsData) && budgetsData.length > 0) {
        const budgetsObj = Object.fromEntries(
          budgetsData.map(b => [b.category, parseFloat(b.amount) || 0])
        );
        setBudgets(budgetsObj);
      } else {
        setBudgets(DEFAULT_BUDGETS);
      }

    } catch (err) {
      setError(err.message);
      console.error("Failed to load expenses:", err);
      setExpenses([]);
    } finally {
      setLoaded(true);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  async function addExpense(formData) {
    try {
      const newExpense = await expensesAPI.create({
        title:    formData.title,
        amount:   parseFloat(formData.amount),
        category: formData.category,
        date:     formData.date,
        tags:     typeof formData.tags === "string"
                    ? formData.tags.split(",").map(t => t.trim()).filter(Boolean)
                    : formData.tags || [],
        notes:    formData.notes || "",
      });
      setExpenses(prev => [newExpense, ...prev]);
    } catch (err) {
      throw new Error(err.message);
    }
  }

  async function updateExpense(id, formData) {
    try {
      const updated = await expensesAPI.update(id, {
        title:    formData.title,
        amount:   parseFloat(formData.amount),
        category: formData.category,
        date:     formData.date,
        tags:     typeof formData.tags === "string"
                    ? formData.tags.split(",").map(t => t.trim()).filter(Boolean)
                    : formData.tags || [],
        notes:    formData.notes || "",
      });
      setExpenses(prev => prev.map(e => e.id === id ? updated : e));
    } catch (err) {
      throw new Error(err.message);
    }
  }

  async function deleteExpense(id) {
    try {
      await expensesAPI.delete(id);
      setExpenses(prev => prev.filter(e => e.id !== id));
    } catch (err) {
      throw new Error(err.message);
    }
  }

  async function saveBudgets(newBudgets) {
    try {
      await Promise.all(
        Object.entries(newBudgets).map(([category, amount]) =>
          budgetsAPI.update(category, parseFloat(amount) || 0)
        )
      );
      setBudgets(newBudgets);
    } catch (err) {
      throw new Error(err.message);
    }
  }

  return {
    expenses, budgets, loaded, error,
    addExpense, updateExpense, deleteExpense,
    saveBudgets, reload: loadData,
  };
}