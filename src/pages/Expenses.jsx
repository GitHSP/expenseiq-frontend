import { useState }   from "react";
import { CATEGORIES } from "../constants/categories";
import { isSameMonth } from "../utils/helpers";

const MONTHS = [
  "January","February","March","April","May","June",
  "July","August","September","October","November","December"
];

export default function Expenses({ expenses, onEdit, onDelete, formatAmount }) {
  const [filterCat,   setFilterCat]   = useState("All");
  const [filterMonth, setFilterMonth] = useState("All");
  const [sortBy,      setSortBy]      = useState("date");
  const [sortDir,     setSortDir]     = useState("desc");
  const [search,      setSearch]      = useState("");

  const fmt = v => formatAmount
    ? formatAmount(parseFloat(v) || 0)
    : `$${(parseFloat(v) || 0).toFixed(2)}`;

  const currentYear = new Date().getFullYear();

  const filtered = expenses
    .filter(e => {
      const matchCat    = filterCat   === "All" || e.category === filterCat;
      const matchMonth  = filterMonth === "All" ||
        isSameMonth(e.date, parseInt(filterMonth), currentYear);
      const matchSearch = search === "" ||
        e.title.toLowerCase().includes(search.toLowerCase()) ||
        e.category.toLowerCase().includes(search.toLowerCase());
      return matchCat && matchMonth && matchSearch;
    })
    .sort((a, b) => {
      let valA, valB;
      if (sortBy === "date")     { valA = new Date(a.date); valB = new Date(b.date); }
      if (sortBy === "amount")   { valA = parseFloat(a.amount)||0; valB = parseFloat(b.amount)||0; }
      if (sortBy === "title")    { valA = a.title.toLowerCase(); valB = b.title.toLowerCase(); }
      if (sortBy === "category") { valA = a.category.toLowerCase(); valB = b.category.toLowerCase(); }
      return sortDir === "asc" ? (valA > valB ? 1 : -1) : (valA < valB ? 1 : -1);
    });

  const totalFiltered = filtered.reduce((s, e) => s + (parseFloat(e.amount) || 0), 0);

  function handleSort(col) {
    if (sortBy === col) setSortDir(d => d === "asc" ? "desc" : "asc");
    else { setSortBy(col); setSortDir("desc"); }
  }

  function SortIcon({ col }) {
    if (sortBy !== col) return <span style={{ color:"#ddd", marginLeft:4 }}>↕</span>;
    return <span style={{ color:"#0070f3", marginLeft:4 }}>{sortDir === "asc" ? "↑" : "↓"}</span>;
  }

  const thStyle = {
    padding:       "11px 14px",
    textAlign:     "left",
    fontSize:      11,
    fontWeight:    700,
    textTransform: "uppercase",
    letterSpacing: "0.6px",
    color:         "#888",
    whiteSpace:    "nowrap",
    borderBottom:  "1px solid #eaeaea",
    background:    "#fafafa",
    cursor:        "pointer",
    userSelect:    "none",
  };

  const tdStyle = {
    padding:      "12px 14px",
    fontSize:     13,
    color:        "#0d0d0d",
    borderBottom: "1px solid #f5f5f5",
    verticalAlign:"middle",
    whiteSpace:   "nowrap",
  };

  return (
    <>
      <div style={{ marginBottom:24 }}>
        <div className="page-title">Expenses</div>
        <div className="page-sub">
          {filtered.length} transactions · Total {fmt(totalFiltered)}
        </div>
      </div>

      {/* ── Filters ── */}
      <div style={{
        background:"#ffffff", border:"1px solid #eaeaea", borderRadius:12,
        padding:"14px 16px", marginBottom:16,
        display:"flex", gap:10, flexWrap:"wrap", alignItems:"center",
      }}>
        <div style={{ position:"relative", flex:1, minWidth:180 }}>
          <span style={{ position:"absolute", left:10, top:"50%", transform:"translateY(-50%)", fontSize:14, color:"#aaa" }}>🔍</span>
          <input
            style={{ width:"100%", background:"#f6f8fa", border:"1px solid #eaeaea", borderRadius:8, padding:"9px 12px 9px 32px", color:"#0d0d0d", fontSize:13, fontFamily:"inherit", outline:"none", boxSizing:"border-box" }}
            placeholder="Search expenses..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <select className="filter-select" style={{ flex:1, minWidth:150 }} value={filterCat} onChange={e => setFilterCat(e.target.value)}>
          <option value="All">All Categories</option>
          {CATEGORIES.map(c => <option key={c.name} value={c.name}>{c.icon} {c.name}</option>)}
        </select>
        <select className="filter-select" style={{ flex:1, minWidth:140 }} value={filterMonth} onChange={e => setFilterMonth(e.target.value)}>
          <option value="All">All Months</option>
          {MONTHS.map((m, i) => <option key={i} value={i}>{m}</option>)}
        </select>
        {(filterCat !== "All" || filterMonth !== "All" || search !== "") && (
          <button className="btn-secondary" style={{ padding:"9px 14px", fontSize:12 }} onClick={() => { setFilterCat("All"); setFilterMonth("All"); setSearch(""); }}>
            ✕ Clear
          </button>
        )}
      </div>

      {/* ── Table ── */}
      <div style={{ background:"#ffffff", border:"1px solid #eaeaea", borderRadius:12, overflow:"hidden", boxShadow:"0 1px 3px rgba(0,0,0,0.04)" }}>
        {filtered.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">💸</div>
            <div style={{ fontWeight:600, color:"#ccc", marginBottom:4, fontSize:15 }}>No expenses found</div>
            <div style={{ fontSize:13, color:"#ccc" }}>Try adjusting your filters</div>
          </div>
        ) : (
          <div style={{ overflowX:"auto" }}>
            <table style={{ width:"100%", borderCollapse:"collapse" }}>
              <thead>
                <tr>
                  <th style={thStyle} onClick={() => handleSort("date")}>Date <SortIcon col="date" /></th>
                  <th style={thStyle} onClick={() => handleSort("title")}>Title <SortIcon col="title" /></th>
                  <th style={thStyle} onClick={() => handleSort("category")}>Category <SortIcon col="category" /></th>
                  <th style={{ ...thStyle, textAlign:"right" }} onClick={() => handleSort("amount")}>Amount <SortIcon col="amount" /></th>
                  <th style={{ ...thStyle, textAlign:"center" }}>Tags</th>
                  <th style={{ ...thStyle, textAlign:"center" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((exp, idx) => {
                  const cat = CATEGORIES.find(c => c.name === exp.category);
                  return (
                    <tr
                      key={exp.id}
                      style={{ background: idx % 2 === 0 ? "#ffffff" : "#fafafa" }}
                      onMouseEnter={e => e.currentTarget.style.background = "#f0f7ff"}
                      onMouseLeave={e => e.currentTarget.style.background = idx % 2 === 0 ? "#ffffff" : "#fafafa"}
                    >
                      <td style={{ ...tdStyle, color:"#888", fontSize:12, fontWeight:500 }}>{exp.date}</td>
                      <td style={{ ...tdStyle, maxWidth:200 }}>
                        <div style={{ fontWeight:600, overflow:"hidden", textOverflow:"ellipsis" }}>{exp.title}</div>
                        {exp.notes && <div style={{ fontSize:11, color:"#aaa", marginTop:2 }}>{exp.notes}</div>}
                      </td>
                      <td style={tdStyle}>
                        <div style={{ display:"inline-flex", alignItems:"center", gap:6, background: cat ? `${cat.color}12` : "#f6f8fa", border:`1px solid ${cat ? cat.color+"30" : "#eaeaea"}`, borderRadius:6, padding:"4px 10px", fontSize:11, fontWeight:600, color:cat?.color || "#888" }}>
                          {cat?.icon || "📦"} {exp.category}
                        </div>
                      </td>
                      <td style={{ ...tdStyle, textAlign:"right" }}>
                        <span style={{ fontWeight:700, fontSize:14, color:"#e11d48", letterSpacing:"-0.3px" }}>
                          -{fmt(exp.amount)}
                        </span>
                      </td>
                      <td style={{ ...tdStyle, textAlign:"center" }}>
                        <div style={{ display:"flex", gap:4, justifyContent:"center", flexWrap:"wrap" }}>
                          {Array.isArray(exp.tags) && exp.tags.filter(Boolean).length > 0
                            ? exp.tags.filter(Boolean).map((tag, i) => (
                                <span key={i} style={{ background:"#f0f7ff", color:"#0070f3", padding:"2px 8px", borderRadius:4, fontSize:10, fontWeight:600 }}>{tag}</span>
                              ))
                            : <span style={{ color:"#ddd", fontSize:11 }}>—</span>
                          }
                        </div>
                      </td>
                      <td style={{ ...tdStyle, textAlign:"center" }}>
                        <div style={{ display:"flex", gap:6, justifyContent:"center" }}>
                          <button onClick={() => onEdit(exp)} style={{ background:"#f6f8fa", color:"#555", border:"1px solid #eaeaea", padding:"5px 10px", borderRadius:6, fontSize:11, fontWeight:600, cursor:"pointer", fontFamily:"inherit" }}>✏️ Edit</button>
                          <button onClick={() => onDelete(exp.id)} style={{ background:"#fff1f2", color:"#e11d48", border:"1px solid #fecdd3", padding:"5px 10px", borderRadius:6, fontSize:11, fontWeight:600, cursor:"pointer", fontFamily:"inherit" }}>🗑 Delete</button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr style={{ background:"#f6f8fa" }}>
                  <td colSpan={3} style={{ ...tdStyle, fontWeight:700, borderTop:"1px solid #eaeaea", borderBottom:"none" }}>
                    {filtered.length} transaction{filtered.length !== 1 ? "s" : ""}
                  </td>
                  <td style={{ ...tdStyle, textAlign:"right", fontWeight:800, color:"#e11d48", fontSize:15, letterSpacing:"-0.5px", borderTop:"1px solid #eaeaea", borderBottom:"none" }}>
                    -{fmt(totalFiltered)}
                  </td>
                  <td colSpan={2} style={{ borderTop:"1px solid #eaeaea", borderBottom:"none" }} />
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>
    </>
  );
}