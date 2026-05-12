import { useState, useEffect, useCallback } from "react";

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

      await new Promise(resolve => setTimeout(resolve, 100));

      // ── Safely load — ignore 404 errors ──
      setDebts([]);
      setPaymentHistory([]);

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
    isDueSoon, isOverdue, daysUntilDue,
    reload: loadData,
  };
}