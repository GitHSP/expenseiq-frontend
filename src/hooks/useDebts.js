import { useState, useEffect, useCallback } from "react";
import { debtsAPI, paymentsAPI }            from "../utils/api";

export const DEBT_TYPES = [
  { name: "Credit Card",       icon: "💳", color: "#e11d48" },
  { name: "Personal Loan",     icon: "🏦", color: "#7c3aed" },
  { name: "Car Loan",          icon: "🚗", color: "#0891b2" },
  { name: "Mortgage",          icon: "🏠", color: "#d97706" },
  { name: "Student Loan",      icon: "🎓", color: "#0070f3" },
  { name: "Buy Now Pay Later", icon: "🛍️", color: "#db2777" },
  { name: "Friends & Family",  icon: "👥", color: "#059669" },
];

export function useDebts() {
  const [debts,          setDebts]          = useState([]);
  const [paymentHistory, setPaymentHistory] = useState([]);
  const [loaded,         setLoaded]         = useState(false);
  const [error,          setError]          = useState(null);

  const loadData = useCallback(async () => {
    try {
      setLoaded(false);
      const token = localStorage.getItem("access_token");
      if (!token) { setLoaded(true); return; }

      const [debtsData, paymentsData] = await Promise.all([
        debtsAPI.getAll(),
        paymentsAPI.getAll(),
      ]);

      setDebts(Array.isArray(debtsData)
        ? debtsData.map(normalizeDebt)
        : []);
      setPaymentHistory(Array.isArray(paymentsData)
        ? paymentsData.map(normalizePayment)
        : []);
    } catch (err) {
      setError(err.message);
      console.error("Failed to load debts:", err);
      setDebts([]);
      setPaymentHistory([]);
    } finally {
      setLoaded(true);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  function normalizeDebt(d) {
    return {
      id:              d.id,
      name:            d.name,
      type:            d.type,
      balance:         parseFloat(d.balance)         || 0,
      originalAmount:  parseFloat(d.original_amount) || 0,
      interestRate:    parseFloat(d.interest_rate)   || 0,
      monthlyPayment:  parseFloat(d.monthly_payment) || 0,
      limit:           parseFloat(d.limit)           || 0,
      lender:          d.lender          || "",
      nextPaymentDate: d.next_payment_date || null,
      notes:           d.notes           || "",
      isPaidOff:       d.is_paid_off     || false,
      createdAt:       d.created_at,
    };
  }

  function normalizePayment(p) {
    return {
      id:     p.id,
      debtId: p.debt,
      amount: parseFloat(p.amount) || 0,
      date:   p.date,
      note:   p.note || "",
    };
  }

  function denormalizeDebt(formData) {
    return {
      name:              formData.name,
      type:              formData.type,
      balance:           parseFloat(formData.balance)        || 0,
      original_amount:   parseFloat(formData.originalAmount) || 0,
      interest_rate:     parseFloat(formData.interestRate)   || 0,
      monthly_payment:   parseFloat(formData.monthlyPayment) || 0,
      limit:             parseFloat(formData.limit)          || 0,
      lender:            formData.lender                     || "",
      next_payment_date: formData.nextPaymentDate            || null,
      notes:             formData.notes                      || "",
    };
  }

  async function addDebt(formData) {
    try {
      const newDebt = await debtsAPI.create(denormalizeDebt(formData));
      setDebts(prev => [normalizeDebt(newDebt), ...prev]);
    } catch (err) { throw new Error(err.message); }
  }

  async function updateDebt(id, formData) {
    try {
      const updated = await debtsAPI.update(id, denormalizeDebt(formData));
      setDebts(prev => prev.map(d => d.id === id ? normalizeDebt(updated) : d));
    } catch (err) { throw new Error(err.message); }
  }

  async function deleteDebt(id) {
    try {
      await debtsAPI.delete(id);
      setDebts(prev => prev.filter(d => d.id !== id));
      setPaymentHistory(prev => prev.filter(p => p.debtId !== id));
    } catch (err) { throw new Error(err.message); }
  }

  async function markPaidOff(id) {
    try {
      const updated = await debtsAPI.markPaidOff(id);
      setDebts(prev => prev.map(d => d.id === id ? normalizeDebt(updated) : d));
    } catch (err) { throw new Error(err.message); }
  }

  async function recordPayment(debtId, amount, note) {
    try {
      const result = await paymentsAPI.create(debtId, amount, note);
      setPaymentHistory(prev => [normalizePayment(result.payment), ...prev]);
      setDebts(prev => prev.map(d =>
        d.id === debtId ? normalizeDebt(result.debt) : d
      ));
    } catch (err) { throw new Error(err.message); }
  }

  function isDueSoon(nextPaymentDate) {
    if (!nextPaymentDate) return false;
    const diff = Math.ceil((new Date(nextPaymentDate) - new Date()) / 86400000);
    return diff >= 0 && diff <= 7;
  }

  function isOverdue(nextPaymentDate) {
    if (!nextPaymentDate) return false;
    return new Date(nextPaymentDate) < new Date();
  }

  function daysUntilDue(nextPaymentDate) {
    if (!nextPaymentDate) return null;
    return Math.ceil((new Date(nextPaymentDate) - new Date()) / 86400000);
  }

  return {
    debts, paymentHistory, loaded, error,
    addDebt, updateDebt, deleteDebt,
    markPaidOff, recordPayment,
    isDueSoon, isOverdue, daysUntilDue,
    reload: loadData,
  };
}