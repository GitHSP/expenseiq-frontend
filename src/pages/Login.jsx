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
      setError(err.message || "Invalid email or password");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={styles.page}>
      <div style={styles.card}>

        <div style={styles.logo}>💰</div>
        <div style={styles.title}>ExpenseIQ</div>
        <div style={styles.subtitle}>Sign in to your account</div>

        {error && <div style={styles.error}>{error}</div>}

        <div style={styles.formGroup}>
          <label style={styles.label}>Email address</label>
          <input
            style={styles.input}
            type="email"
            placeholder="you@example.com"
            value={email}
            onChange={e => setEmail(e.target.value)}
            onKeyDown={e => e.key === "Enter" && handleSubmit()}
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
            onKeyDown={e => e.key === "Enter" && handleSubmit()}
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

        <div style={styles.divider}>
          <span style={styles.dividerText}>Don't have an account?</span>
        </div>

        <button
          style={styles.btnOutline}
          onClick={onGoToRegister}
        >
          Create account
        </button>

      </div>
    </div>
  );
}

const styles = {
  page: {
    minHeight:      "100vh",
    background:     "#f6f8fa",
    display:        "flex",
    alignItems:     "center",
    justifyContent: "center",
    fontFamily:     "'Inter', -apple-system, sans-serif",
    padding:        "20px",
  },
  card: {
    background:   "#ffffff",
    border:       "1px solid #eaeaea",
    borderRadius: "16px",
    padding:      "40px",
    width:        "100%",
    maxWidth:     "420px",
    boxShadow:    "0 8px 40px rgba(0,0,0,0.08)",
  },
  logo: {
    fontSize:     "36px",
    textAlign:    "center",
    marginBottom: "8px",
  },
  title: {
    fontSize:      "22px",
    fontWeight:    800,
    color:         "#0d0d0d",
    textAlign:     "center",
    marginBottom:  "4px",
    letterSpacing: "-0.5px",
  },
  subtitle: {
    fontSize:     "13px",
    color:        "#888",
    textAlign:    "center",
    marginBottom: "28px",
    fontWeight:   400,
  },
  error: {
    background:   "#fff1f2",
    border:       "1px solid #fecdd3",
    color:        "#e11d48",
    padding:      "10px 14px",
    borderRadius: "8px",
    fontSize:     "13px",
    marginBottom: "16px",
    fontWeight:   500,
  },
  formGroup: { marginBottom: "14px" },
  label: {
    display:       "block",
    fontSize:      "11px",
    color:         "#666",
    fontWeight:    600,
    textTransform: "uppercase",
    letterSpacing: "0.6px",
    marginBottom:  "5px",
  },
  input: {
    width:        "100%",
    background:   "#ffffff",
    border:       "1px solid #eaeaea",
    borderRadius: "8px",
    padding:      "10px 12px",
    color:        "#0d0d0d",
    fontSize:     "13.5px",
    fontFamily:   "inherit",
    outline:      "none",
    boxSizing:    "border-box",
    fontWeight:   500,
    transition:   "border-color 0.15s",
  },
  btn: {
    width:         "100%",
    background:    "#0070f3",
    color:         "#ffffff",
    border:        "none",
    padding:       "11px",
    borderRadius:  "8px",
    fontWeight:    600,
    fontSize:      "14px",
    fontFamily:    "inherit",
    cursor:        "pointer",
    marginBottom:  "14px",
    letterSpacing: "-0.1px",
    transition:    "all 0.15s",
  },
  btnOutline: {
    width:         "100%",
    background:    "transparent",
    color:         "#0d0d0d",
    border:        "1px solid #eaeaea",
    padding:       "11px",
    borderRadius:  "8px",
    fontWeight:    600,
    fontSize:      "14px",
    fontFamily:    "inherit",
    cursor:        "pointer",
    transition:    "all 0.15s",
  },
  divider: {
    textAlign:    "center",
    marginBottom: "12px",
  },
  dividerText: {
    fontSize:   "13px",
    color:      "#aaa",
    fontWeight: 400,
  },
  link: {
    color:          "#0070f3",
    cursor:         "pointer",
    fontWeight:     600,
    fontSize:       "12px",
    textDecoration: "none",
  },
};