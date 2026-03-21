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
        .catch(() => {
          localStorage.removeItem("access_token");
          localStorage.removeItem("refresh_token");
        })
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  async function login(email, password) {
    const data = await authAPI.login(email, password);
    localStorage.setItem("access_token",  data.access_token);
    localStorage.setItem("refresh_token", data.refresh_token);
    setUser(data.user);
    return data;
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
    register,
    logout,
    isLoggedIn: !!user,
  };
}