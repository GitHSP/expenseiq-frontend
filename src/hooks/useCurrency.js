// ─────────────────────────────────────────────
// useCurrency — manages exchange rates
// and default currency for the whole app
// ─────────────────────────────────────────────

import { useState, useEffect, useCallback } from "react";

export const SUPPORTED_CURRENCIES = [
  { code: "CAD", name: "Canadian Dollar",  symbol: "CA$", flag: "🇨🇦" },
  { code: "USD", name: "US Dollar",        symbol: "$",   flag: "🇺🇸" },
  { code: "GBP", name: "British Pound",    symbol: "£",   flag: "🇬🇧" },
  { code: "EUR", name: "Euro",             symbol: "€",   flag: "🇪🇺" },
  { code: "AUD", name: "Australian Dollar",symbol: "A$",  flag: "🇦🇺" },
  { code: "INR", name: "Indian Rupee",     symbol: "₹",   flag: "🇮🇳" },
  { code: "AED", name: "UAE Dirham",       symbol: "د.إ", flag: "🇦🇪" },
];

// ── Replace with your actual API key ──
const API_KEY  = "5c2786f80cba92182d20bf72";
const BASE_URL = `https://v6.exchangerate-api.com/v6/${API_KEY}`;

export function useCurrency() {
  // Default currency is CAD
  const [currency,     setCurrency]     = useState(() => localStorage.getItem("expenseiq_currency") || "CAD");
  const [rates,        setRates]        = useState({});
  const [lastUpdated,  setLastUpdated]  = useState(null);
  const [loading,      setLoading]      = useState(false);
  const [error,        setError]        = useState(null);

  // ── Fetch live rates from API ──
  const fetchRates = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // Check if we have cached rates less than 1 hour old
      const cached    = localStorage.getItem("expenseiq_rates");
      const cachedTime = localStorage.getItem("expenseiq_rates_time");

      if (cached && cachedTime) {
        const age = Date.now() - parseInt(cachedTime);
        if (age < 60 * 60 * 1000) { // less than 1 hour old
          setRates(JSON.parse(cached));
          setLastUpdated(new Date(parseInt(cachedTime)));
          setLoading(false);
          return;
        }
      }

      // Fetch fresh rates with CAD as base
      const res  = await fetch(`${BASE_URL}/latest/CAD`);
      const data = await res.json();

      if (data.result === "success") {
        setRates(data.conversion_rates);
        setLastUpdated(new Date());
        // Cache rates to avoid hitting API limit
        localStorage.setItem("expenseiq_rates",      JSON.stringify(data.conversion_rates));
        localStorage.setItem("expenseiq_rates_time", Date.now().toString());
      } else {
        setError("Failed to fetch rates");
      }
    } catch (err) {
      setError("Network error — using cached rates");
      // Try to use cached rates even if expired
      const cached = localStorage.getItem("expenseiq_rates");
      if (cached) setRates(JSON.parse(cached));
    } finally {
      setLoading(false);
    }
  }, []);

  // ── Load rates on startup ──
  useEffect(() => {
    fetchRates();
  }, [fetchRates]);

  // ── Save currency preference ──
  useEffect(() => {
    localStorage.setItem("expenseiq_currency", currency);
  }, [currency]);

  // ── Convert amount from CAD (base) to selected currency ──
  function convert(amountInCAD) {
    if (!amountInCAD || isNaN(amountInCAD)) return 0;
    if (currency === "CAD") return amountInCAD;
    const rate = rates[currency];
    if (!rate) return amountInCAD;
    return amountInCAD * rate;
  }

  // ── Convert amount from any currency to CAD (for storage) ──
  function toCAD(amount, fromCurrency) {
    if (fromCurrency === "CAD") return amount;
    const rate = rates[fromCurrency];
    if (!rate) return amount;
    return amount / rate;
  }

  // ── Format amount in selected currency ──
  function formatAmount(amountInCAD) {
    const converted = convert(amountInCAD);
    // const curr      = SUPPORTED_CURRENCIES.find(c => c.code === currency);
    return new Intl.NumberFormat("en-US", {
      style:    "currency",
      currency: currency,
      minimumFractionDigits: 2,
    }).format(converted);
  }

  // ── Get exchange rate between CAD and a currency ──
  function getRate(toCurrency) {
    if (toCurrency === "CAD") return 1;
    return rates[toCurrency] || null;
  }

  // ── Get time since last update ──
  function getLastUpdatedText() {
    if (!lastUpdated) return "Never";
    const diff = Math.floor((Date.now() - lastUpdated.getTime()) / 1000);
    if (diff < 60)   return `${diff} seconds ago`;
    if (diff < 3600) return `${Math.floor(diff / 60)} minutes ago`;
    return `${Math.floor(diff / 3600)} hours ago`;
  }

  return {
    currency,
    setCurrency,
    rates,
    loading,
    error,
    lastUpdated,
    convert,
    toCAD,
    formatAmount,
    getRate,
    getLastUpdatedText,
    refresh: fetchRates,
  };
}