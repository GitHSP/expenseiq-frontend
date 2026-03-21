import { useState } from "react";

export default function Login({ onLogin, onGoToRegister, onGoToForgot }) {
  const [email,    setEmail]    = useState("");
  const [password, setPassword] = useState("");
  const [error,    setError]    = useState("");
  const [loading,  setLoading]  = useState(false);

  async function handleSubmit() {
    if (!email || !password) { setError("Please fill in all fields"); return; }
    setError("");
    setLoading(true);
    try {
      await onLogin(email, password);
    } catch (err) {
      setError(err.message || "Login failed");
    } finally {
      setLoading(false);
    }
  }

  function handleKeyDown(e) {
    if (e.key === "Enter") handleSubmit();
  }

  return (
    <div style={styles.page}>
      <div style={styles.card}>

        <div style={styles.logo}>💰</div>
        <div style={styles.title}>ExpenseIQ</div>
        <div style={styles.subtitle}>Sign in to your account</div>

        {error && <div style={styles.error}>{error}</div>}

        <div style={styles.formGroup}>
          <label style={styles.label}>Email</label>
          <input
            style={styles.input}
            type="email"
            placeholder="you@example.com"
            value={email}
            onChange={e => setEmail(e.target.value)}
            onKeyDown={handleKeyDown}
          />
        </div>

        <div style={styles.formGroup}>
          <label style={styles.label}>Password</label>
          <input
            style={styles.input}
            type="password"
            placeholder="Your password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            onKeyDown={handleKeyDown}
          />
        </div>

        <div style={{ textAlign:"right", marginBottom:"20px" }}>
          <span style={styles.link} onClick={onGoToForgot}>
            Forgot password?
          </span>
        </div>

        <button
          style={{ ...styles.btn, opacity: loading ? 0.7 : 1 }}
          onClick={handleSubmit}
          disabled={loading}
        >
          {loading ? "Signing in..." : "Sign In"}
        </button>

        <div style={styles.footer}>
          Don't have an account?{" "}
          <span style={styles.link} onClick={onGoToRegister}>
            Create one
          </span>
        </div>

      </div>
    </div>
  );
}

const styles = {
  page: {
    minHeight:      "100vh",
    background:     "#0a0a0a",
    display:        "flex",
    alignItems:     "center",
    justifyContent: "center",
    fontFamily:     "'DM Sans', 'Segoe UI', sans-serif",
    padding:        "20px",
  },
  card: {
    background:   "#111111",
    border:       "1px solid #222222",
    borderRadius: "20px",
    padding:      "40px",
    width:        "100%",
    maxWidth:     "420px",
    boxShadow:    "0 20px 60px rgba(0,0,0,0.5)",
  },
  logo: {
    fontSize:     "40px",
    textAlign:    "center",
    marginBottom: "8px",
  },
  title: {
    fontSize:     "24px",
    fontWeight:   800,
    color:        "#ffffff",
    textAlign:    "center",
    marginBottom: "6px",
  },
  subtitle: {
    fontSize:     "14px",
    color:        "#555",
    textAlign:    "center",
    marginBottom: "28px",
  },
  error: {
    background:   "#1a0000",
    border:       "1px solid #440000",
    color:        "#ff4444",
    padding:      "12px 16px",
    borderRadius: "10px",
    fontSize:     "13px",
    marginBottom: "16px",
  },
  formGroup: { marginBottom: "16px" },
  label: {
    display:       "block",
    fontSize:      "11px",
    color:         "#555",
    fontWeight:    600,
    textTransform: "uppercase",
    letterSpacing: "0.5px",
    marginBottom:  "6px",
  },
  input: {
    width:        "100%",
    background:   "#161616",
    border:       "1px solid #2a2a2a",
    borderRadius: "12px",
    padding:      "12px 14px",
    color:        "#e8e8e8",
    fontSize:     "14px",
    outline:      "none",
    boxSizing:    "border-box",
  },
  btn: {
    width:        "100%",
    background:   "#ffffff",
    color:        "#000000",
    border:       "none",
    padding:      "14px",
    borderRadius: "12px",
    fontWeight:   700,
    fontSize:     "15px",
    cursor:       "pointer",
    marginBottom: "16px",
  },
  footer: {
    textAlign: "center",
    fontSize:  "13px",
    color:     "#555",
  },
  link: {
    color:          "#888",
    cursor:         "pointer",
    fontWeight:     600,
    textDecoration: "underline",
  },
};