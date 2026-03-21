// ─────────────────────────────────────────────
// ProtectedRoute — redirects to login if
// user is not authenticated
//
// Usage:
//   <ProtectedRoute user={user} loading={loading}>
//     <Dashboard />
//   </ProtectedRoute>
// ─────────────────────────────────────────────

export default function ProtectedRoute({ user, loading, children }) {
  // Show loading screen while checking token
  if (loading) {
    return (
      <div style={{
        display:         "flex",
        alignItems:      "center",
        justifyContent:  "center",
        height:          "100vh",
        background:      "#0f0f1a",
        color:           "#fff",
        fontFamily:      "sans-serif",
        fontSize:        "18px",
      }}>
        Loading...
      </div>
    );
  }

  // Not logged in — show login prompt
  if (!user) {
    return (
      <div style={{
        display:        "flex",
        alignItems:     "center",
        justifyContent: "center",
        height:         "100vh",
        background:     "#0f0f1a",
        color:          "#fff",
        fontFamily:     "sans-serif",
        flexDirection:  "column",
        gap:            "20px",
      }}>
        <div style={{ fontSize: "40px" }}>💰</div>
        <div style={{ fontSize: "22px", fontWeight: 800 }}>ExpenseIQ</div>
        <div style={{ color: "#888" }}>Please log in to continue</div>
        <button
          onClick={() => window.location.href = "/login"}
          style={{
            background:   "linear-gradient(135deg,#FF6B6B,#FF8E53)",
            color:        "#fff",
            border:       "none",
            padding:      "12px 32px",
            borderRadius: "12px",
            fontWeight:   700,
            fontSize:     "15px",
            cursor:       "pointer",
          }}
        >
          Go to Login
        </button>
      </div>
    );
  }

  // Logged in — render the page
  return children;
}