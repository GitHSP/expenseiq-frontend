import { useState } from "react";
import Icon from "../components/Icon";

export default function Login({ onLogin, onTwoFactor, onGoToRegister, onGoToForgot, onGoHome }) {
  const [email,    setEmail]    = useState("");
  const [password, setPassword] = useState("");
  const [error,    setError]    = useState("");
  const [loading,  setLoading]  = useState(false);
  const [mfaToken, setMfaToken] = useState(null);   // set when a code is needed
  const [code,     setCode]     = useState("");
  const [useBackup, setUseBackup] = useState(false);

  async function handleSubmit() {
    if (!email || !password) { setError("Please fill in all fields"); return; }
    setError("");
    setLoading(true);
    try {
      const result = await onLogin(email, password);
      if (result?.mfa_required) setMfaToken(result.mfa_token);
    } catch (err) {
      setError(err.message || "Invalid email or password");
    } finally {
      setLoading(false);
    }
  }

  async function handleCode() {
    if (!code.trim()) { setError("Enter the code from your authenticator app"); return; }
    setError("");
    setLoading(true);
    try {
      await onTwoFactor(mfaToken, code.trim());
    } catch (err) {
      setError(err.message || "That code didn't work");
      if (/expired|password again/i.test(err.message || "")) { setMfaToken(null); setCode(""); }
    } finally {
      setLoading(false);
    }
  }

  if (mfaToken) {
    return (
      <div style={styles.page}>
        <div style={styles.card}>
          <div style={styles.logo}><Icon name="shield-check" size={26} /></div>
          <div style={styles.title}>Two-factor sign-in</div>
          <div style={styles.subtitle}>
            {useBackup ? "Enter one of your backup codes" : "Enter the 6-digit code from your authenticator app"}
          </div>
          {error && <div style={styles.error}>{error}</div>}
          <div style={styles.formGroup}>
            <label style={styles.label} htmlFor="mfa-code">{useBackup ? "Backup code" : "Code"}</label>
            <input
              id="mfa-code"
              style={{ ...styles.input, letterSpacing: useBackup ? "1px" : "6px", fontSize: "20px", textAlign: "center" }}
              inputMode={useBackup ? "text" : "numeric"}
              autoComplete="one-time-code"
              autoFocus
              maxLength={useBackup ? 14 : 6}
              placeholder={useBackup ? "xxxx-xxxx-xxxx" : "123456"}
              value={code}
              onChange={e => setCode(useBackup ? e.target.value : e.target.value.replace(/\D/g, ""))}
              onKeyDown={e => e.key === "Enter" && handleCode()}
            />
          </div>
          <button style={{ ...styles.btn, opacity: loading ? 0.7 : 1 }} onClick={handleCode} disabled={loading}>
            {loading ? "Checking..." : "Verify"}
          </button>
          <div style={{ textAlign: "center", marginTop: "16px", display: "flex", flexDirection: "column", gap: "10px" }}>
            <span style={styles.link} onClick={() => { setUseBackup(b => !b); setCode(""); setError(""); }}>
              {useBackup ? "Use my authenticator app instead" : "Lost your phone? Use a backup code"}
            </span>
            <span style={{ ...styles.link, color: "var(--muted)" }} onClick={() => { setMfaToken(null); setCode(""); setError(""); }}>
              Back to sign in
            </span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.page}>
      <div style={styles.card}>

        <div style={styles.logo}><Icon name="mountain" size={26} /></div>
        <div style={styles.title}>Glacier</div>
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

        {onGoHome && (
          <div style={{ textAlign:"center", marginTop:"18px" }}>
            <span style={{ ...styles.link, display:"inline-flex", alignItems:"center", gap:"4px" }} onClick={onGoHome}>
              <Icon name="chevron-left" size={13} /> Back to home
            </span>
          </div>
        )}

      </div>
    </div>
  );
}

const styles = {
  page: {
    minHeight:      "100vh",
    background:     "var(--bg)",
    display:        "flex",
    alignItems:     "center",
    justifyContent: "center",
    fontFamily:     "'Inter', -apple-system, sans-serif",
    padding:        "20px",
  },
  card: {
    background:   "var(--card)",
    border:       "1px solid var(--border)",
    borderRadius: "16px",
    padding:      "40px",
    width:        "100%",
    maxWidth:     "420px",
    boxShadow:    "0 8px 40px rgba(0,0,0,0.08)",
  },
  logo: {
    width:          "52px",
    height:         "52px",
    margin:         "0 auto 12px",
    borderRadius:   "14px",
    background:     "#0070f3",
    color:          "#fff",
    display:        "flex",
    alignItems:     "center",
    justifyContent: "center",
    boxShadow:      "0 6px 16px rgba(0,112,243,0.3)",
  },
  title: {
    fontSize:      "22px",
    fontWeight:    800,
    color:         "var(--text)",
    textAlign:     "center",
    marginBottom:  "4px",
    letterSpacing: "-0.5px",
  },
  subtitle: {
    fontSize:     "13px",
    color:        "var(--muted)",
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
    color:         "var(--muted2)",
    fontWeight:    600,
    textTransform: "uppercase",
    letterSpacing: "0.6px",
    marginBottom:  "5px",
  },
  input: {
    width:        "100%",
    background:   "var(--card)",
    border:       "1px solid var(--border)",
    borderRadius: "8px",
    padding:      "10px 12px",
    color:        "var(--text)",
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
    color:         "var(--text)",
    border:        "1px solid var(--border)",
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
    color:      "var(--faint2)",
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