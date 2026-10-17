import { useEffect, useState } from "react";
import Icon, { IconLabel } from "./Icon";
import { twoFactorAPI } from "../utils/api";

// Profile → Security: turn authenticator-app two-factor login on or off and
// manage backup codes.

const inputStyle = {
  width: "100%", boxSizing: "border-box", background: "var(--bg)", border: "1px solid var(--border)",
  borderRadius: 8, padding: "10px 12px", color: "var(--text)", fontSize: 14, fontFamily: "inherit", outline: "none",
};
const codeInputStyle = { ...inputStyle, fontSize: 20, letterSpacing: 6, textAlign: "center", maxWidth: 200 };

function Notice({ tone = "error", children }) {
  const c = tone === "error" ? ["#fff1f2", "#fecdd3", "#e11d48", "warning"] : ["#f0fdf4", "#bbf7d0", "#059669", "check-circle"];
  return (
    <div style={{ background: c[0], border: `1px solid ${c[1]}`, color: c[2], borderRadius: 8, padding: "10px 14px",
                  fontSize: 13, display: "flex", gap: 8, alignItems: "center", marginBottom: 14 }}>
      <Icon name={c[3]} size={15} /> {children}
    </div>
  );
}

function BackupCodes({ codes, onDone }) {
  const text = codes.join("\n");
  function download() {
    const url = URL.createObjectURL(new Blob([`Glacier backup codes\nEach code works once.\n\n${text}\n`], { type: "text/plain" }));
    const a = document.createElement("a");
    a.href = url; a.download = "glacier-backup-codes.txt"; a.click();
    URL.revokeObjectURL(url);
  }
  return (
    <div>
      <Notice tone="ok">Save these backup codes now — you won't see them again.</Notice>
      <div style={{ fontSize: 13, color: "var(--muted2)", marginBottom: 12, lineHeight: 1.6 }}>
        If you lose your phone, each code lets you sign in once. Keep them somewhere safe, like a password manager.
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 8, marginBottom: 16,
                    fontFamily: "ui-monospace, Consolas, monospace", fontSize: 14 }}>
        {codes.map(c => (
          <div key={c} style={{ background: "var(--bg)", border: "1px solid var(--border)", borderRadius: 6, padding: "8px 10px", textAlign: "center" }}>{c}</div>
        ))}
      </div>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <button className="btn-secondary" onClick={() => navigator.clipboard?.writeText(text)}
          style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
          <Icon name="clipboard" size={14} /> Copy
        </button>
        <button className="btn-secondary" onClick={download} style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
          <Icon name="download" size={14} /> Download
        </button>
        <button className="btn-primary" onClick={onDone}>I've saved them</button>
      </div>
    </div>
  );
}

export default function SecurityTab() {
  const [status,  setStatus]  = useState(null);      // { enabled, backup_codes_left }
  const [setup,   setSetup]   = useState(null);      // { qr_svg, secret } while setting up
  const [codes,   setCodes]   = useState(null);      // backup codes to show once
  const [mode,    setMode]    = useState(null);      // "disable" | "regenerate"
  const [code,    setCode]    = useState("");
  const [password, setPassword] = useState("");
  const [busy,    setBusy]    = useState(false);
  const [error,   setError]   = useState("");

  async function refresh() {
    try { setStatus(await twoFactorAPI.status()); } catch (e) { setError(e.message); }
  }
  useEffect(() => { refresh(); }, []);

  async function run(fn) {
    setError(""); setBusy(true);
    try { await fn(); } catch (e) { setError(e.message || "Something went wrong"); } finally { setBusy(false); }
  }

  const reset = () => { setSetup(null); setMode(null); setCode(""); setPassword(""); setError(""); };

  if (!status) {
    return <div className="card"><div style={{ color: "var(--muted)", fontSize: 13 }}>Loading...</div></div>;
  }

  return (
    <div className="card">
      <div className="card-title" style={{ marginBottom: 6 }}>
        <IconLabel name="shield-check" size={16}>Two-factor sign-in</IconLabel>
      </div>
      <div style={{ fontSize: 13, color: "var(--muted)", marginBottom: 18, lineHeight: 1.6 }}>
        Ask for a 6-digit code from an authenticator app (Google Authenticator, Microsoft Authenticator,
        1Password…) whenever you sign in, so your password alone isn't enough.
      </div>

      {error && <Notice>{error}</Notice>}

      {codes ? (
        <BackupCodes codes={codes} onDone={() => { setCodes(null); reset(); refresh(); }} />
      ) : setup ? (
        <div>
          <div style={{ display: "flex", gap: 20, flexWrap: "wrap", alignItems: "flex-start", marginBottom: 16 }}>
            <img src={setup.qr_svg} alt="QR code to scan with your authenticator app" width={180} height={180}
              style={{ borderRadius: 8, border: "1px solid var(--border)", background: "#fff" }} />
            <div style={{ flex: 1, minWidth: 220, fontSize: 13, color: "var(--muted2)", lineHeight: 1.7 }}>
              <strong style={{ color: "var(--text)" }}>1.</strong> Open your authenticator app and scan this code.<br />
              <span style={{ fontSize: 12 }}>Can't scan? Enter this key instead:</span>
              <div style={{ fontFamily: "ui-monospace, Consolas, monospace", fontSize: 13, background: "var(--bg)",
                            border: "1px solid var(--border)", borderRadius: 6, padding: "6px 8px", margin: "4px 0 10px",
                            wordBreak: "break-all", color: "var(--text)" }}>{setup.secret}</div>
              <strong style={{ color: "var(--text)" }}>2.</strong> Enter the 6-digit code it shows:
            </div>
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <input style={codeInputStyle} inputMode="numeric" autoComplete="one-time-code" maxLength={6} placeholder="123456"
              aria-label="6-digit code" value={code} onChange={e => setCode(e.target.value.replace(/\D/g, ""))}
              onKeyDown={e => e.key === "Enter" && code.length === 6 && run(async () => setCodes((await twoFactorAPI.confirm(code)).backup_codes))} />
            <button className="btn-primary" disabled={busy || code.length !== 6}
              onClick={() => run(async () => setCodes((await twoFactorAPI.confirm(code)).backup_codes))}>
              {busy ? "Checking..." : "Turn on"}
            </button>
            <button className="btn-secondary" onClick={reset}>Cancel</button>
          </div>
        </div>
      ) : status.enabled ? (
        <div>
          <Notice tone="ok">
            Two-factor sign-in is on · {status.backup_codes_left} backup code{status.backup_codes_left === 1 ? "" : "s"} left
          </Notice>
          {mode ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 10, maxWidth: 320 }}>
              {mode === "disable" && (
                <input type="password" style={inputStyle} placeholder="Your password" aria-label="Password"
                  autoComplete="current-password" value={password} onChange={e => setPassword(e.target.value)} />
              )}
              <input style={{ ...inputStyle, letterSpacing: 2 }} placeholder={mode === "disable" ? "Code from your app (or a backup code)" : "Code from your app"}
                aria-label="Authenticator code" autoComplete="one-time-code" value={code} onChange={e => setCode(e.target.value)} />
              <div style={{ display: "flex", gap: 8 }}>
                {mode === "disable" ? (
                  <button className="btn-danger" disabled={busy}
                    onClick={() => run(async () => { await twoFactorAPI.disable(password, code); reset(); await refresh(); })}>
                    {busy ? "Turning off..." : "Turn off two-factor"}
                  </button>
                ) : (
                  <button className="btn-primary" disabled={busy}
                    onClick={() => run(async () => setCodes((await twoFactorAPI.newBackupCodes(code)).backup_codes))}>
                    {busy ? "Checking..." : "Get new backup codes"}
                  </button>
                )}
                <button className="btn-secondary" onClick={reset}>Cancel</button>
              </div>
            </div>
          ) : (
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <button className="btn-secondary" onClick={() => setMode("regenerate")}
                style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                <Icon name="refresh" size={14} /> New backup codes
              </button>
              <button className="btn-danger" onClick={() => setMode("disable")}>Turn off</button>
            </div>
          )}
        </div>
      ) : (
        <button className="btn-primary" disabled={busy} style={{ display: "inline-flex", alignItems: "center", gap: 6 }}
          onClick={() => run(async () => setSetup(await twoFactorAPI.setup()))}>
          <Icon name="shield-check" size={15} /> {busy ? "Preparing..." : "Set up authenticator app"}
        </button>
      )}
    </div>
  );
}
