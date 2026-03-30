import { useState } from "react";
import { authAPI }  from "../utils/api";

export default function Profile({ user, onLogout }) {
  const [tab,         setTab]         = useState("profile");
  const [username,    setUsername]    = useState(user?.username || "");
  const [email] = useState(user?.email || "");
  const [currentPass, setCurrentPass] = useState("");
  const [newPass,     setNewPass]     = useState("");
  const [newPass2,    setNewPass2]    = useState("");
  const [loading,     setLoading]     = useState(false);
  const [success,     setSuccess]     = useState("");
  const [error,       setError]       = useState("");

  const inputStyle = {
    width:        "100%",
    background:   "#ffffff",
    border:       "1px solid #eaeaea",
    borderRadius: "8px",
    padding:      "10px 12px",
    color:        "#0d0d0d",
    fontSize:     "13.5px",
    fontFamily:   "inherit",
    fontWeight:   500,
    outline:      "none",
    boxSizing:    "border-box",
  };

  const labelStyle = {
    display:       "block",
    fontSize:      "11px",
    color:         "#666",
    fontWeight:    600,
    textTransform: "uppercase",
    letterSpacing: "0.6px",
    marginBottom:  "5px",
  };

  async function handleChangePassword() {
    if (!currentPass || !newPass || !newPass2) {
      setError("Please fill in all fields"); return;
    }
    if (newPass !== newPass2) {
      setError("New passwords do not match"); return;
    }
    if (newPass.length < 8) {
      setError("Password must be at least 8 characters"); return;
    }
    setError("");
    setLoading(true);
    try {
      await authAPI.changePassword(currentPass, newPass, newPass2);
      setSuccess("Password changed successfully!");
      setCurrentPass(""); setNewPass(""); setNewPass2("");
    } catch (err) {
      setError(err.message || "Failed to change password");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <div style={{ marginBottom:28 }}>
        <div className="page-title">Profile</div>
        <div className="page-sub">Manage your account settings</div>
      </div>

      {/* Avatar card */}
      <div className="card" style={{ marginBottom:20, display:"flex", alignItems:"center", gap:20 }}>
        <div style={{
          width:         72,
          height:        72,
          borderRadius:  "50%",
          background:    "linear-gradient(135deg, #0070f3, #0050b3)",
          display:       "flex",
          alignItems:    "center",
          justifyContent:"center",
          fontSize:      28,
          fontWeight:    800,
          color:         "#fff",
          flexShrink:    0,
        }}>
          {user?.username?.[0]?.toUpperCase() || user?.email?.[0]?.toUpperCase() || "U"}
        </div>
        <div>
          <div style={{ fontWeight:800, fontSize:18, color:"#0d0d0d", letterSpacing:"-0.4px" }}>
            {user?.username || "User"}
          </div>
          <div style={{ fontSize:13, color:"#888", marginTop:2 }}>
            {user?.email}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div style={{
        display:      "flex",
        gap:          4,
        marginBottom: 20,
        background:   "#ffffff",
        border:       "1px solid #eaeaea",
        borderRadius: 10,
        padding:      4,
        width:        "fit-content",
      }}>
        {[
          { id:"profile",  label:"👤 Profile"  },
          { id:"password", label:"🔐 Password" },
          { id:"danger",   label:"⚠️ Danger"   },
        ].map(t => (
          <button
            key={t.id}
            onClick={() => { setTab(t.id); setError(""); setSuccess(""); }}
            style={{
              background:  tab === t.id ? "#0070f3" : "transparent",
              color:       tab === t.id ? "#fff"    : "#888",
              border:      "none",
              padding:     "8px 18px",
              borderRadius:7,
              fontWeight:  600,
              fontSize:    13,
              fontFamily:  "inherit",
              cursor:      "pointer",
              transition:  "all 0.15s",
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Success / Error messages */}
      {success && (
        <div style={{
          background:"#f0fdf4", border:"1px solid #bbf7d0",
          borderRadius:8, padding:"10px 14px",
          fontSize:13, color:"#059669", fontWeight:500,
          marginBottom:16,
        }}>
          ✅ {success}
        </div>
      )}
      {error && (
        <div style={{
          background:"#fff1f2", border:"1px solid #fecdd3",
          borderRadius:8, padding:"10px 14px",
          fontSize:13, color:"#e11d48", fontWeight:500,
          marginBottom:16,
        }}>
          ⚠️ {error}
        </div>
      )}

      {/* Profile tab */}
      {tab === "profile" && (
        <div className="card">
          <div className="card-title" style={{ marginBottom:20 }}>Account Information</div>
          <div className="form-group">
            <label style={labelStyle}>Username</label>
            <input
              style={inputStyle}
              value={username}
              onChange={e => setUsername(e.target.value)}
              placeholder="Your username"
            />
          </div>
          <div className="form-group">
            <label style={labelStyle}>Email</label>
            <input
              style={{ ...inputStyle, background:"#f6f8fa", color:"#888" }}
              value={email}
              disabled
            />
            <div style={{ fontSize:11, color:"#aaa", marginTop:4 }}>
              Email cannot be changed
            </div>
          </div>
          <div style={{
            background:"#f0f7ff", border:"1px solid #bfdbfe",
            borderRadius:8, padding:"12px 14px", marginTop:8,
            fontSize:12, color:"#0070f3",
          }}>
            💡 Profile editing coming soon — for now your username and email are set at registration.
          </div>
        </div>
      )}

      {/* Password tab */}
      {tab === "password" && (
        <div className="card">
          <div className="card-title" style={{ marginBottom:20 }}>Change Password</div>
          <div className="form-group">
            <label style={labelStyle}>Current Password</label>
            <input
              style={inputStyle}
              type="password"
              placeholder="Your current password"
              value={currentPass}
              onChange={e => setCurrentPass(e.target.value)}
            />
          </div>
          <div className="form-group">
            <label style={labelStyle}>New Password</label>
            <input
              style={inputStyle}
              type="password"
              placeholder="Min 8 characters"
              value={newPass}
              onChange={e => setNewPass(e.target.value)}
            />
          </div>
          <div className="form-group">
            <label style={labelStyle}>Confirm New Password</label>
            <input
              style={inputStyle}
              type="password"
              placeholder="Repeat new password"
              value={newPass2}
              onChange={e => setNewPass2(e.target.value)}
            />
          </div>
          <button
            className="btn-primary"
            onClick={handleChangePassword}
            disabled={loading}
            style={{ opacity: loading ? 0.7 : 1, padding:"10px 24px" }}
          >
            {loading ? "Changing..." : "Change Password"}
          </button>
        </div>
      )}

      {/* Danger zone tab */}
      {tab === "danger" && (
        <div className="card" style={{ border:"1.5px solid #fecdd3" }}>
          <div className="card-title" style={{ marginBottom:6, color:"#e11d48" }}>
            ⚠️ Danger Zone
          </div>
          <div style={{ fontSize:13, color:"#888", marginBottom:20 }}>
            These actions are permanent and cannot be undone.
          </div>
          <div style={{
            display:      "flex",
            justifyContent:"space-between",
            alignItems:   "center",
            padding:      "14px",
            background:   "#fff1f2",
            borderRadius: 8,
            border:       "1px solid #fecdd3",
            marginBottom: 10,
          }}>
            <div>
              <div style={{ fontWeight:700, fontSize:13, color:"#0d0d0d" }}>Sign out of all devices</div>
              <div style={{ fontSize:12, color:"#888", marginTop:2 }}>Logs you out everywhere</div>
            </div>
            <button
              onClick={onLogout}
              style={{
                background:   "#fff1f2",
                color:        "#e11d48",
                border:       "1px solid #fecdd3",
                padding:      "8px 16px",
                borderRadius: 8,
                fontWeight:   600,
                fontSize:     12,
                cursor:       "pointer",
                fontFamily:   "inherit",
              }}
            >
              Sign Out
            </button>
          </div>
        </div>
      )}
    </>
  );
}