// ─────────────────────────────────────────────
// useDebts — manages debt and payment data
// Now connected to Django API
// ─────────────────────────────────────────────

import { useState, useEffect, useCallback } from "react";
import { debtsAPI, paymentsAPI } from "../utils/api";

export const DEBT_TYPES = [
  { name: "Credit Card",       icon: "💳", color: "#FF6B6B" },
  { name: "Personal Loan",     icon: "🏦", color: "#A29BFE" },
  { name: "Car Loan",          icon: "🚗", color: "#4ECDC4" },
  { name: "Mortgage",          icon: "🏠", color: "#FFE66D" },
  { name: "Student Loan",      icon: "🎓", color: "#74B9FF" },
  { name: "Buy Now Pay Later", icon: "🛍️", color: "#FD79A8" },
  { name: "Friends & Family",  icon: "👥", color: "#55EFC4" },
];

export function useDebts() {
  const [debts,          setDebts]          = useState([]);
  const [paymentHistory, setPaymentHistory] = useState([]);
  const [loaded,         setLoaded]         = useState(false);
  const [error,          setError]          = useState(null);

  // ── Load all data on startup ──
  const loadData = useCallback(async () => {
    try {
      setLoaded(false);
      const [debtsData, paymentsData] = await Promise.all([
        debtsAPI.getAll(),
        paymentsAPI.getAll(),
      ]);

      // Normalize Django snake_case to camelCase for React
      setDebts(debtsData.map(normalizeDebt));
      setPaymentHistory(paymentsData.map(normalizePayment));
    } catch (err) {
      setError(err.message);
      console.error("Failed to load debts:", err);
    } finally {
      setLoaded(true);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // ── Convert Django snake_case to React camelCase ──
  function normalizeDebt(d) {
    return {
      id:              d.id,
      name:            d.name,
      type:            d.type,
      balance:         parseFloat(d.balance),
      originalAmount:  parseFloat(d.original_amount),
      interestRate:    parseFloat(d.interest_rate),
      monthlyPayment:  parseFloat(d.monthly_payment),
      limit:           parseFloat(d.limit),
      lender:          d.lender,
      nextPaymentDate: d.next_payment_date,
      notes:           d.notes,
      isPaidOff:       d.is_paid_off,
      createdAt:       d.created_at,
    };
  }

  function normalizePayment(p) {
    return {
      id:     p.id,
      debtId: p.debt,
      amount: parseFloat(p.amount),
      date:   p.date,
      note:   p.note,
    };
  }

  // ── Convert React camelCase to Django snake_case ──
  function denormalizeDebt(formData) {
    return {
      name:             formData.name,
      type:             formData.type,
      balance:          parseFloat(formData.balance)        || 0,
      original_amount:  parseFloat(formData.originalAmount) || 0,
      interest_rate:    parseFloat(formData.interestRate)   || 0,
      monthly_payment:  parseFloat(formData.monthlyPayment) || 0,
      limit:            parseFloat(formData.limit)          || 0,
      lender:           formData.lender                     || "",
      next_payment_date: formData.nextPaymentDate            || null,
      notes:            formData.notes                      || "",
    };
  }

  // ── Add new debt ──
  async function addDebt(formData) {
    try {
      const newDebt = await debtsAPI.create(denormalizeDebt(formData));
      setDebts(prev => [normalizeDebt(newDebt), ...prev]);
    } catch (err) {
      throw new Error(err.message);
    }
  }

  // ── Update existing debt ──
  async function updateDebt(id, formData) {
    try {
      const updated = await debtsAPI.update(id, denormalizeDebt(formData));
      setDebts(prev => prev.map(d => d.id === id ? normalizeDebt(updated) : d));
    } catch (err) {
      throw new Error(err.message);
    }
  }

  // ── Delete debt ──
  async function deleteDebt(id) {
    try {
      await debtsAPI.delete(id);
      setDebts(prev => prev.filter(d => d.id !== id));
      // Also remove payment history for this debt
      setPaymentHistory(prev => prev.filter(p => p.debtId !== id));
    } catch (err) {
      throw new Error(err.message);
    }
  }

  // ── Mark debt as paid off ──
  async function markPaidOff(id) {
    try {
      const updated = await debtsAPI.markPaidOff(id);
      setDebts(prev => prev.map(d => d.id === id ? normalizeDebt(updated) : d));
    } catch (err) {
      throw new Error(err.message);
    }
  }

  // ── Record a payment ──
  async function recordPayment(debtId, amount, note) {
    try {
      const result = await paymentsAPI.create(debtId, amount, note);
      // Add payment to history
      setPaymentHistory(prev => [normalizePayment(result.payment), ...prev]);
      // Update debt balance from API response
      setDebts(prev =>
        prev.map(d => d.id === debtId ? normalizeDebt(result.debt) : d)
      );
    } catch (err) {
      throw new Error(err.message);
    }
  }

  // ── Helper functions ──
  function isDueSoon(nextPaymentDate) {
    if (!nextPaymentDate) return false;
    const today   = new Date();
    const dueDate = new Date(nextPaymentDate);
    const diff    = Math.ceil((dueDate - today) / (1000 * 60 * 60 * 24));
    return diff >= 0 && diff <= 7;
  }

  function isOverdue(nextPaymentDate) {
    if (!nextPaymentDate) return false;
    return new Date(nextPaymentDate) < new Date();
  }

  function daysUntilDue(nextPaymentDate) {
    if (!nextPaymentDate) return null;
    return Math.ceil((new Date(nextPaymentDate) - new Date()) / (1000 * 60 * 60 * 24));
  }

  return {
    debts,
    paymentHistory,
    loaded,
    error,
    addDebt,
    updateDebt,
    deleteDebt,
    markPaidOff,
    recordPayment,
    isDueSoon,
    isOverdue,
    daysUntilDue,
    reload: loadData,
  };
}