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

// Access tokens are short-lived (15 min). When a request comes back 401,
// trade the refresh token for a new access token once and retry, so the user
// isn't logged out mid-session. Concurrent 401s share one refresh, because
// each refresh token can only be used once (they rotate).
let refreshInFlight = null;

function refreshAccessToken() {
  const refresh = localStorage.getItem("refresh_token");
  if (!refresh) return Promise.resolve(false);
  if (!refreshInFlight) {
    refreshInFlight = fetch(`${BASE_URL}/auth/token/refresh/`, {
      method: "POST", headers: getHeaders(false),
      body: JSON.stringify({ refresh }),
    })
      .then(async res => {
        if (!res.ok) return false;
        const data = await res.json();
        localStorage.setItem("access_token", data.access);
        if (data.refresh) localStorage.setItem("refresh_token", data.refresh);
        return true;
      })
      .catch(() => false)
      .finally(() => { refreshInFlight = null; });
  }
  return refreshInFlight;
}

async function authFetch(url, options = {}) {
  const res = await fetch(url, options);
  if (res.status !== 401 || !localStorage.getItem("refresh_token")) return res;
  if (!(await refreshAccessToken())) {
    // The session is over (expired, or revoked by a password change).
    localStorage.removeItem("access_token");
    localStorage.removeItem("refresh_token");
    window.dispatchEvent(new Event("auth:expired"));
    return res;
  }
  const headers = { ...(options.headers || {}), Authorization: `Bearer ${getToken()}` };
  return fetch(url, { ...options, headers });
}

async function handleResponse(res) {
  if (res.status === 204) return null;
  const data = await res.json();
  if (!res.ok) {
    const err = new Error(data.error || data.detail || JSON.stringify(data));
    err.status = res.status;
    throw err;
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
  // Second login step when two-factor is on.
  loginTwoFactor: async (mfaToken, code) => {
    const res = await fetch(`${BASE_URL}/auth/login/2fa/`, {
      method: "POST", headers: getHeaders(false),
      body: JSON.stringify({ mfa_token: mfaToken, code }),
    });
    return handleResponse(res);
  },
  logoutAll: async () => {
    const res = await authFetch(`${BASE_URL}/auth/logout-all/`, {
      method: "POST", headers: getHeaders(true),
    });
    return handleResponse(res);
  },
  me: async () => {
    const res = await authFetch(`${BASE_URL}/auth/me/`, {
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
    const res = await authFetch(`${BASE_URL}/auth/change-password/`, {
      method: "POST", headers: getHeaders(true),
      body: JSON.stringify({
        old_password:  currentPassword,
        new_password:  newPassword,
        new_password2: newPassword2,
      }),
    });
    const data = await handleResponse(res);
    // Changing the password signs out every other session; keep this one.
    if (data?.access_token) {
      localStorage.setItem("access_token", data.access_token);
      localStorage.setItem("refresh_token", data.refresh_token);
    }
    return data;
  },
};

// ─────────────────────────────────────────────
// TWO-FACTOR (authenticator app)
// ─────────────────────────────────────────────
export const twoFactorAPI = {
  status: async () => handleResponse(await authFetch(`${BASE_URL}/auth/2fa/`, { headers: getHeaders(true) })),
  // Returns { qr_svg, secret, otpauth_uri } — not active until confirmed.
  setup: async () => handleResponse(await authFetch(`${BASE_URL}/auth/2fa/`, { method: "POST", headers: getHeaders(true) })),
  // Returns { enabled: true, backup_codes: [...] }.
  confirm: async (code) => handleResponse(await authFetch(`${BASE_URL}/auth/2fa/`, {
    method: "PUT", headers: getHeaders(true), body: JSON.stringify({ code }),
  })),
  disable: async (password, code) => handleResponse(await authFetch(`${BASE_URL}/auth/2fa/`, {
    method: "DELETE", headers: getHeaders(true), body: JSON.stringify({ password, code }),
  })),
  newBackupCodes: async (code) => handleResponse(await authFetch(`${BASE_URL}/auth/2fa/backup-codes/`, {
    method: "POST", headers: getHeaders(true), body: JSON.stringify({ code }),
  })),
};

// ─────────────────────────────────────────────
// EXPENSES
// ─────────────────────────────────────────────
export const expensesAPI = {
  bulkDelete: async (ids, label) => {
    const res = await authFetch(`${BASE_URL}/expenses/bulk-delete/`, {
      method: "POST", headers: getHeaders(true),
      body: JSON.stringify({ ids, label }),
    });
    return handleResponse(res);
  },
  getAll: async () => {
    const res = await authFetch(`${BASE_URL}/expenses/`, {
      method: "GET", headers: getHeaders(true),
    });
    return handleResponse(res);
  },
  create: async (data) => {
    const res = await authFetch(`${BASE_URL}/expenses/`, {
      method: "POST", headers: getHeaders(true),
      body: JSON.stringify(data),
    });
    return handleResponse(res);
  },
  update: async (id, data) => {
    const res = await authFetch(`${BASE_URL}/expenses/${id}/`, {
      method: "PUT", headers: getHeaders(true),
      body: JSON.stringify(data),
    });
    return handleResponse(res);
  },
  delete: async (id) => {
    const res = await authFetch(`${BASE_URL}/expenses/${id}/`, {
      method: "DELETE", headers: getHeaders(true),
    });
    return handleResponse(res);
  },
};

// ─────────────────────────────────────────────
// INCOME
// ─────────────────────────────────────────────
export const incomeAPI = {
  bulkDelete: async (ids, label) => {
    const res = await authFetch(`${BASE_URL}/income/bulk-delete/`, {
      method: "POST", headers: getHeaders(true),
      body: JSON.stringify({ ids, label }),
    });
    return handleResponse(res);
  },
  getAll: async () => {
    const res = await authFetch(`${BASE_URL}/income/`, {
      method: "GET", headers: getHeaders(true),
    });
    return handleResponse(res);
  },
  create: async (data) => {
    const res = await authFetch(`${BASE_URL}/income/`, {
      method: "POST", headers: getHeaders(true),
      body: JSON.stringify(data),
    });
    return handleResponse(res);
  },
  update: async (id, data) => {
    const res = await authFetch(`${BASE_URL}/income/${id}/`, {
      method: "PUT", headers: getHeaders(true),
      body: JSON.stringify(data),
    });
    return handleResponse(res);
  },
  delete: async (id) => {
    const res = await authFetch(`${BASE_URL}/income/${id}/`, {
      method: "DELETE", headers: getHeaders(true),
    });
    return handleResponse(res);
  },
};

// ─────────────────────────────────────────────
// FINANCIAL PLANNER API
// ─────────────────────────────────────────────
// ─────────────────────────────────────────────
// ACTIVITY HISTORY
// ─────────────────────────────────────────────
export const activityAPI = {
  // Newest first; pass `before` (the last id received) to page backwards.
  list: async ({ area, before, limit = 50 } = {}) => {
    const params = new URLSearchParams({ limit: String(limit) });
    if (area) params.set("area", area);
    if (before) params.set("before", String(before));
    const res = await authFetch(`${BASE_URL}/activity/?${params}`, {
      method: "GET", headers: getHeaders(true),
    });
    return handleResponse(res);
  },
};

// ─────────────────────────────────────────────
// STATEMENT IMPORT
// ─────────────────────────────────────────────
export const statementsAPI = {
  // Upload PDF/CSV/OFX/QFX statements; returns parsed rows to review (nothing saved).
  preview: async (files) => {
    const body = new FormData();
    files.forEach(f => body.append("files", f));
    const headers = {};
    const token = getToken();
    if (token) headers["Authorization"] = `Bearer ${token}`;
    const res = await authFetch(`${BASE_URL}/statements/preview/`, { method: "POST", headers, body });
    return handleResponse(res);
  },
  // Save the confirmed rows: [{ kind, title, amount, date, category, source }]
  // and tick the matched Planner checklist items (ids).
  importRows: async (filename, rows, checklistItems = []) => {
    const res = await authFetch(`${BASE_URL}/statements/import/`, {
      method: "POST", headers: getHeaders(true),
      body: JSON.stringify({ filename, rows, checklist_items: checklistItems }),
    });
    return handleResponse(res);
  },
};

const FP_URL = `${BASE_URL}/fp`;

export const financialPlannerAPI = {

  // ── Debts ──
  getDebts: async () => {
    const res = await authFetch(`${FP_URL}/debts/`, {
      method: "GET", headers: getHeaders(true),
    });
    return handleResponse(res);
  },
  createDebt: async (data) => {
    const res = await authFetch(`${FP_URL}/debts/`, {
      method: "POST", headers: getHeaders(true),
      body: JSON.stringify(data),
    });
    return handleResponse(res);
  },
  updateDebt: async (id, data) => {
    const res = await authFetch(`${FP_URL}/debts/${id}/`, {
      method: "PATCH", headers: getHeaders(true),
      body: JSON.stringify(data),
    });
    return handleResponse(res);
  },
  deleteDebt: async (id) => {
    const res = await authFetch(`${FP_URL}/debts/${id}/`, {
      method: "DELETE", headers: getHeaders(true),
    });
    return handleResponse(res);
  },

  // ── Recurring payments ──
  getRecurring: async () => {
    const res = await authFetch(`${FP_URL}/recurring/`, {
      method: "GET", headers: getHeaders(true),
    });
    return handleResponse(res);
  },
  createRecurring: async (data) => {
    const res = await authFetch(`${FP_URL}/recurring/`, {
      method: "POST", headers: getHeaders(true),
      body: JSON.stringify(data),
    });
    return handleResponse(res);
  },
  updateRecurring: async (id, data) => {
    const res = await authFetch(`${FP_URL}/recurring/${id}/`, {
      method: "PATCH", headers: getHeaders(true),
      body: JSON.stringify(data),
    });
    return handleResponse(res);
  },
  deleteRecurring: async (id) => {
    const res = await authFetch(`${FP_URL}/recurring/${id}/`, {
      method: "DELETE", headers: getHeaders(true),
    });
    return handleResponse(res);
  },

  // ── Emergency Fund ──
  getEmergencyFund: async () => {
    const res = await authFetch(`${FP_URL}/emergency-fund/`, {
      method: "GET", headers: getHeaders(true),
    });
    return handleResponse(res);
  },
  updateEmergencyFund: async (data) => {
    const res = await authFetch(`${FP_URL}/emergency-fund/`, {
      method: "PATCH", headers: getHeaders(true),
      body: JSON.stringify(data),
    });
    return handleResponse(res);
  },

  // ── Monthly Plan ──
  getCurrentPlan: async () => {
    const res = await authFetch(`${FP_URL}/plans/current/`, {
      method: "GET", headers: getHeaders(true),
    });
    return handleResponse(res);
  },
  updatePlan: async (id, data) => {
    const res = await authFetch(`${FP_URL}/plans/${id}/`, {
      method: "PATCH", headers: getHeaders(true),
      body: JSON.stringify(data),
    });
    return handleResponse(res);
  },

  // ── Rollover ──
  rollover: async () => {
    const res = await authFetch(`${FP_URL}/plans/rollover/`, {
      method: "POST", headers: getHeaders(true),
    });
    return handleResponse(res);
  },

  // ── Generate Checklist ──
  generateChecklist: async () => {
    const res = await authFetch(`${FP_URL}/plans/generate-checklist/`, {
      method: "POST", headers: getHeaders(true),
    });
    return handleResponse(res);
  },


  // ── Checklist ──
  getChecklist: async (planId) => {
    const res = await authFetch(`${FP_URL}/plans/${planId}/checklist/`, {
      method: "GET", headers: getHeaders(true),
    });
    return handleResponse(res);
  },
  createChecklist: async (planId, data) => {
    const res = await authFetch(`${FP_URL}/plans/${planId}/checklist/`, {
      method: "POST", headers: getHeaders(true),
      body: JSON.stringify(data),
    });
    return handleResponse(res);
  },
  toggleChecklist: async (id) => {
    const res = await authFetch(`${FP_URL}/checklist/${id}/toggle/`, {
      method: "POST", headers: getHeaders(true),
    });
    return handleResponse(res);
  },
  deleteChecklist: async (id) => {
    const res = await authFetch(`${FP_URL}/checklist/${id}/`, {
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
    const res = await authFetch(`${BASE_URL}/assistant/chat/`, {
      method: "POST", headers: getHeaders(true),
      body: JSON.stringify({ messages }),
    });
    return handleResponse(res);
  },

  // ── Phase 2: sync — server only ever sees opaque ciphertext ──
  getEncryptionKey: async () => {
    const res = await authFetch(`${BASE_URL}/assistant/encryption-key/`, {
      method: "GET", headers: getHeaders(true),
    });
    if (res.status === 404) return null;
    return handleResponse(res);
  },
  setEncryptionKey: async (data) => {
    const res = await authFetch(`${BASE_URL}/assistant/encryption-key/`, {
      method: "PUT", headers: getHeaders(true),
      body: JSON.stringify(data),
    });
    return handleResponse(res);
  },
  pullMessages: async (since) => {
    const qs = since ? `?since=${encodeURIComponent(since)}` : "";
    const res = await authFetch(`${BASE_URL}/assistant/sync/messages/${qs}`, {
      method: "GET", headers: getHeaders(true),
    });
    return handleResponse(res);
  },
  pushMessages: async (messages) => {
    const res = await authFetch(`${BASE_URL}/assistant/sync/messages/`, {
      method: "POST", headers: getHeaders(true),
      body: JSON.stringify({ messages }),
    });
    return handleResponse(res);
  },
  clearSyncedMessages: async () => {
    const res = await authFetch(`${BASE_URL}/assistant/sync/messages/`, {
      method: "DELETE", headers: getHeaders(true),
    });
    return handleResponse(res);
  },
};