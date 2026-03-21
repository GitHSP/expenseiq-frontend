import { SUPPORTED_CURRENCIES } from "../hooks/useCurrency";

export default function ExchangeRatesWidget({
  rates, currency, getRate, getLastUpdatedText, loading, error, refresh
}) {
  const displayCurrencies = SUPPORTED_CURRENCIES.filter(c => c.code !== "CAD");

  return (
    <div className="card" style={{ marginBottom:20 }}>

      {/* Header */}
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:14 }}>
        <div>
          <div className="card-title">💱 Live Exchange Rates</div>
          <div style={{ fontSize:11, color:"#888", marginTop:2 }}>
            Base: 🇨🇦 CAD — Canadian Dollar
          </div>
        </div>
        <div style={{ display:"flex", alignItems:"center", gap:8 }}>
          <div style={{ fontSize:11, color:"#888" }}>
            Updated: {getLastUpdatedText()}
          </div>
          <button
            onClick={refresh}
            disabled={loading}
            style={{
              background:   "#f5f6fa",
              border:       "1px solid #e8eaf0",
              borderRadius: "8px",
              padding:      "6px 10px",
              fontSize:     12,
              cursor:       loading ? "not-allowed" : "pointer",
              color:        "#555",
              fontWeight:   600,
            }}
          >
            {loading ? "⏳" : "🔄 Refresh"}
          </button>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div style={{
          background:"#fff0f0", border:"1px solid #fca5a5",
          borderRadius:"10px", padding:"10px 14px",
          fontSize:12, color:"#dc2626", marginBottom:12
        }}>
          ⚠️ {error}
        </div>
      )}

      {/* Rate cards */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit, minmax(160px,1fr))", gap:"10px" }}>
        {displayCurrencies.map(curr => {
          const rate = getRate(curr.code);
          return (
            <div
              key={curr.code}
              style={{
                background:   currency === curr.code
                  ? "linear-gradient(135deg,#f0eeff,#e8e0ff)"
                  : "#fafbfc",
                borderRadius: "12px",
                padding:      "12px 14px",
                border:       currency === curr.code
                  ? "1.5px solid #A29BFE"
                  : "1px solid #e8eaf0",
                transition:   "all 0.2s",
              }}
            >
              <div style={{ display:"flex", alignItems:"center", gap:6, marginBottom:6 }}>
                <span style={{ fontSize:18 }}>{curr.flag}</span>
                <div>
                  <div style={{ fontWeight:700, fontSize:12, color:"#1a1a2e" }}>{curr.code}</div>
                  <div style={{ fontSize:10, color:"#888" }}>{curr.name}</div>
                </div>
              </div>
              <div style={{ fontWeight:800, fontSize:16, color: currency === curr.code ? "#6C5CE7" : "#1a1a2e" }}>
                {rate ? rate.toFixed(4) : "—"}
              </div>
              <div style={{ fontSize:10, color:"#888", marginTop:2 }}>
                1 CAD = {rate ? rate.toFixed(4) : "—"} {curr.code}
              </div>
            </div>
          );
        })}
      </div>

      {/* Active currency highlight */}
      {currency !== "CAD" && (
        <div style={{
          marginTop:      14,
          background:     "linear-gradient(135deg,#f0eeff,#e8e0ff)",
          borderRadius:   "12px",
          padding:        "12px 16px",
          border:         "1.5px solid #A29BFE",
          display:        "flex",
          justifyContent: "space-between",
          alignItems:     "center",
        }}>
          <div style={{ fontSize:13, color:"#6C5CE7", fontWeight:600 }}>
            Currently viewing in{" "}
            {SUPPORTED_CURRENCIES.find(c => c.code === currency)?.flag} {currency}
          </div>
          <div style={{ fontSize:12, color:"#888" }}>
            1 CAD = {getRate(currency)?.toFixed(4)} {currency}
          </div>
        </div>
      )}

    </div>
  );
}