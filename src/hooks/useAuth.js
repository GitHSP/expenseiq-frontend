import { useState, useEffect } from "react";
import { authAPI } from "../utils/api";

export function useAuth() {
  const [user,    setUser]    = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem("access_token");
    if (token) {
      authAPI.me()
        .then(userData => setUser(userData))
        .catch(err => {
          // Only a real "not logged in" ends the session. A network hiccup
          // or a server restart shouldn't throw away a valid login.
          if (err.status === 401) {
            localStorage.removeItem("access_token");
            localStorage.removeItem("refresh_token");
          }
        })
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  // The API client signals when the session can't be renewed (expired, or
  // revoked by a password change elsewhere) — show the login screen.
  useEffect(() => {
    const onExpired = () => setUser(null);
    window.addEventListener("auth:expired", onExpired);
    return () => window.removeEventListener("auth:expired", onExpired);
  }, []);

  function startSession(data) {
    localStorage.setItem("access_token",  data.access_token);
    localStorage.setItem("refresh_token", data.refresh_token);
    setUser(data.user);
    return data;
  }

  // Returns { mfa_required, mfa_token } when two-factor is on; the caller
  // then asks for a code and calls loginTwoFactor.
  async function login(email, password) {
    const data = await authAPI.login(email, password);
    if (data.mfa_required) return data;
    return startSession(data);
  }

  async function loginTwoFactor(mfaToken, code) {
    return startSession(await authAPI.loginTwoFactor(mfaToken, code));
  }

  async function logoutEverywhere() {
    try { await authAPI.logoutAll(); } catch {}
    localStorage.removeItem("access_token");
    localStorage.removeItem("refresh_token");
    setUser(null);
  }

  async function register(email, username, password, password2) {
    const data = await authAPI.register(email, username, password, password2);
    localStorage.setItem("access_token",  data.access_token);
    localStorage.setItem("refresh_token", data.refresh_token);
    setUser(data.user);
    return data;
  }

  async function logout() {
    try {
      const refresh_token = localStorage.getItem("refresh_token");
      await authAPI.logout(refresh_token);
    } catch {}
    finally {
      localStorage.removeItem("access_token");
      localStorage.removeItem("refresh_token");
      setUser(null);
    }
  }

  return {
    user,
    loading,
    login,
    loginTwoFactor,
    logoutEverywhere,
    register,
    logout,
    isLoggedIn: !!user,
  };
}