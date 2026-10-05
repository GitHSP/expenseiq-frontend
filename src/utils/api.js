// ─────────────────────────────────────────────
// api.js — all communication with Django backend
// ─────────────────────────────────────────────

const BASE_URL = process.env.REACT_APP_API_URL || "http://127.0.0.1:8000/api";

function getToken() {
  return localStorage.getItem("access_token");
}

function getHeaders(auth = true) {
  const headers = { "Content-Type": "application/json" };
  if (auth) {
    const token = getToken();
    if (token) headers["Authorization"] = `Bearer ${token}`;
  }
  return headers;
}

async function handleResponse(res) {
  if (res.status === 204) return null;
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || data.detail || JSON.stringify(data));
  }
  return data;
}

// ─────────────────────────────────────────────
// AUTH
// ─────────────────────────────────────────────
export const authAPI = {
  register: async (email, username, password, password2) => {
    const res = await fetch(`${BASE_URL}/auth/register/`, {
      method: "POST", headers: getHeaders(false),
      body: JSON.stringify({ email, username, password, password2 }),
    });
    return handleResponse(res);
  },
  login: async (email, password) => {
    const res = await fetch(`${BASE_URL}/auth/login/`, {
      method: "POST", headers: getHeaders(false),
      body: JSON.stringify({ email, password }),
    });
    return handleResponse(res);
  },
  logout: async (refresh_token) => {
    const res = await fetch(`${BASE_URL}/auth/logout/`, {
      method: "POST", headers: getHeaders(true),
      body: JSON.stringify({ refresh_token }),
    });
    return handleResponse(res);
  },
  me: async () => {
    const res = await fetch(`${BASE_URL}/auth/me/`, {
      method: "GET", headers: getHeaders(true),
    });
    return handleResponse(res);
  },
  forgotPassword: async (email) => {
    const res = await fetch(`${BASE_URL}/auth/forgot-password/`, {
      method: "POST", headers: getHeaders(false),
      body: JSON.stringify({ email }),
    });
    return handleResponse(res);
  },
  resetPassword: async (uid, token, password) => {
    const res = await fetch(`${BASE_URL}/auth/reset-password/`, {
      method: "POST", headers: getHeaders(false),
      body: JSON.stringify({ uid, token, password }),
    });
    return handleResponse(res);
  },
  changePassword: async (currentPassword, newPassword, newPassword2) => {
    const res = await fetch(`${BASE_URL}/auth/change-password/`, {
      method: "POST", headers: getHeaders(true),
      body: JSON.stringify({
        old_password:  currentPassword,
        new_password:  newPassword,
        new_password2: newPassword2,
      }),
    });
    return handleResponse(res);
  },
};

// ─────────────────────────────────────────────
// EXPENSES
// ─────────────────────────────────────────────
export const expensesAPI = {
  getAll: async () => {
    const res = await fetch(`${BASE_URL}/expenses/`, {
      method: "GET", headers: getHeaders(true),
    });
    return handleResponse(res);
  },
  create: async (data) => {
    const res = await fetch(`${BASE_URL}/expenses/`, {
      method: "POST", headers: getHeaders(true),
      body: JSON.stringify(data),
    });
    return handleResponse(res);
  },
  update: async (id, data) => {
    const res = await fetch(`${BASE_URL}/expenses/${id}/`, {
      method: "PUT", headers: getHeaders(true),
      body: JSON.stringify(data),
    });
    return handleResponse(res);
  },
  delete: async (id) => {
    const res = await fetch(`${BASE_URL}/expenses/${id}/`, {
      method: "DELETE", headers: getHeaders(true),
    });
    return handleResponse(res);
  },
};

// ─────────────────────────────────────────────
// INCOME
// ─────────────────────────────────────────────
export const incomeAPI = {
  getAll: async () => {
    const res = await fetch(`${BASE_URL}/income/`, {
      method: "GET", headers: getHeaders(true),
    });
    return handleResponse(res);
  },
  create: async (data) => {
    const res = await fetch(`${BASE_URL}/income/`, {
      method: "POST", headers: getHeaders(true),
      body: JSON.stringify(data),
    });
    return handleResponse(res);
  },
  update: async (id, data) => {
    const res = await fetch(`${BASE_URL}/income/${id}/`, {
      method: "PUT", headers: getHeaders(true),
      body: JSON.stringify(data),
    });
    return handleResponse(res);
  },
  delete: async (id) => {
    const res = await fetch(`${BASE_URL}/income/${id}/`, {
      method: "DELETE", headers: getHeaders(true),
    });
    return handleResponse(res);
  },
};

// ─────────────────────────────────────────────
// FINANCIAL PLANNER API
// ─────────────────────────────────────────────
const FP_URL = `${BASE_URL}/fp`;

export const financialPlannerAPI = {

  // ── Debts ──
  getDebts: async () => {
    const res = await fetch(`${FP_URL}/debts/`, {
      method: "GET", headers: getHeaders(true),
    });
    return handleResponse(res);
  },
  createDebt: async (data) => {
    const res = await fetch(`${FP_URL}/debts/`, {
      method: "POST", headers: getHeaders(true),
      body: JSON.stringify(data),
    });
    return handleResponse(res);
  },
  updateDebt: async (id, data) => {
    const res = await fetch(`${FP_URL}/debts/${id}/`, {
      method: "PATCH", headers: getHeaders(true),
      body: JSON.stringify(data),
    });
    return handleResponse(res);
  },
  deleteDebt: async (id) => {
    const res = await fetch(`${FP_URL}/debts/${id}/`, {
      method: "DELETE", headers: getHeaders(true),
    });
    return handleResponse(res);
  },

  // ── Recurring payments ──
  getRecurring: async () => {
    const res = await fetch(`${FP_URL}/recurring/`, {
      method: "GET", headers: getHeaders(true),
    });
    return handleResponse(res);
  },
  createRecurring: async (data) => {
    const res = await fetch(`${FP_URL}/recurring/`, {
      method: "POST", headers: getHeaders(true),
      body: JSON.stringify(data),
    });
    return handleResponse(res);
  },
  updateRecurring: async (id, data) => {
    const res = await fetch(`${FP_URL}/recurring/${id}/`, {
      method: "PATCH", headers: getHeaders(true),
      body: JSON.stringify(data),
    });
    return handleResponse(res);
  },
  deleteRecurring: async (id) => {
    const res = await fetch(`${FP_URL}/recurring/${id}/`, {
      method: "DELETE", headers: getHeaders(true),
    });
    return handleResponse(res);
  },

  // ── Emergency Fund ──
  getEmergencyFund: async () => {
    const res = await fetch(`${FP_URL}/emergency-fund/`, {
      method: "GET", headers: getHeaders(true),
    });
    return handleResponse(res);
  },
  updateEmergencyFund: async (data) => {
    const res = await fetch(`${FP_URL}/emergency-fund/`, {
      method: "PATCH", headers: getHeaders(true),
      body: JSON.stringify(data),
    });
    return handleResponse(res);
  },

  // ── Monthly Plan ──
  getCurrentPlan: async () => {
    const res = await fetch(`${FP_URL}/plans/current/`, {
      method: "GET", headers: getHeaders(true),
    });
    return handleResponse(res);
  },
  updatePlan: async (id, data) => {
    const res = await fetch(`${FP_URL}/plans/${id}/`, {
      method: "PATCH", headers: getHeaders(true),
      body: JSON.stringify(data),
    });
    return handleResponse(res);
  },

  // ── Rollover ──
  rollover: async () => {
    const res = await fetch(`${FP_URL}/plans/rollover/`, {
      method: "POST", headers: getHeaders(true),
    });
    return handleResponse(res);
  },

  // ── Generate Checklist ──
  generateChecklist: async () => {
    const res = await fetch(`${FP_URL}/plans/generate-checklist/`, {
      method: "POST", headers: getHeaders(true),
    });
    return handleResponse(res);
  },


  // ── Checklist ──
  getChecklist: async (planId) => {
    const res = await fetch(`${FP_URL}/plans/${planId}/checklist/`, {
      method: "GET", headers: getHeaders(true),
    });
    return handleResponse(res);
  },
  createChecklist: async (planId, data) => {
    const res = await fetch(`${FP_URL}/plans/${planId}/checklist/`, {
      method: "POST", headers: getHeaders(true),
      body: JSON.stringify(data),
    });
    return handleResponse(res);
  },
  toggleChecklist: async (id) => {
    const res = await fetch(`${FP_URL}/checklist/${id}/toggle/`, {
      method: "POST", headers: getHeaders(true),
    });
    return handleResponse(res);
  },
  deleteChecklist: async (id) => {
    const res = await fetch(`${FP_URL}/checklist/${id}/`, {
      method: "DELETE", headers: getHeaders(true),
    });
    return handleResponse(res);
  },
};

// ─────────────────────────────────────────────
// AI ASSISTANT
// ─────────────────────────────────────────────
// Stateless proxy — sends the full message history the frontend owns
// (from IndexedDB) on every call; the backend never stores it.
export const assistantAPI = {
  chat: async (messages) => {
    const res = await fetch(`${BASE_URL}/assistant/chat/`, {
      method: "POST", headers: getHeaders(true),
      body: JSON.stringify({ messages }),
    });
    return handleResponse(res);
  },

  // ── Phase 2: sync — server only ever sees opaque ciphertext ──
  getEncryptionKey: async () => {
    const res = await fetch(`${BASE_URL}/assistant/encryption-key/`, {
      method: "GET", headers: getHeaders(true),
    });
    if (res.status === 404) return null;
    return handleResponse(res);
  },
  setEncryptionKey: async (data) => {
    const res = await fetch(`${BASE_URL}/assistant/encryption-key/`, {
      method: "PUT", headers: getHeaders(true),
      body: JSON.stringify(data),
    });
    return handleResponse(res);
  },
  pullMessages: async (since) => {
    const qs = since ? `?since=${encodeURIComponent(since)}` : "";
    const res = await fetch(`${BASE_URL}/assistant/sync/messages/${qs}`, {
      method: "GET", headers: getHeaders(true),
    });
    return handleResponse(res);
  },
  pushMessages: async (messages) => {
    const res = await fetch(`${BASE_URL}/assistant/sync/messages/`, {
      method: "POST", headers: getHeaders(true),
      body: JSON.stringify({ messages }),
    });
    return handleResponse(res);
  },
  clearSyncedMessages: async () => {
    const res = await fetch(`${BASE_URL}/assistant/sync/messages/`, {
      method: "DELETE", headers: getHeaders(true),
    });
    return handleResponse(res);
  },
};