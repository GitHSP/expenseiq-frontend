import { useState }   from "react";
import { CATEGORIES } from "../constants/categories";
import { isSameMonth } from "../utils/helpers";
import Icon from "../components/Icon";

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
    if (sortBy !== col) return <Icon name="sort" size={12} style={{ color:"var(--faint)", marginLeft:4 }} />;
    return <Icon name={sortDir === "asc" ? "arrow-up" : "arrow-down"} size={12} style={{ color:"#0070f3", marginLeft:4 }} />;
  }

  const thStyle = {
    padding:       "11px 14px",
    textAlign:     "left",
    fontSize:      11,
    fontWeight:    700,
    textTransform: "uppercase",
    letterSpacing: "0.6px",
    color:         "var(--muted)",
    whiteSpace:    "nowrap",
    borderBottom:  "1px solid var(--border)",
    background:    "var(--subtle)",
    cursor:        "pointer",
    userSelect:    "none",
  };

  const tdStyle = {
    padding:      "12px 14px",
    fontSize:     13,
    color:        "var(--text)",
    borderBottom: "1px solid var(--subtle2)",
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
        background:"var(--card)", border:"1px solid var(--border)", borderRadius:12,
        padding:"14px 16px", marginBottom:16,
        display:"flex", gap:10, flexWrap:"wrap", alignItems:"center",
      }}>
        <div style={{ position:"relative", flex:1, minWidth:180 }}>
          <Icon name="search" size={15} style={{ position:"absolute", left:10, top:"50%", transform:"translateY(-50%)", color:"var(--faint2)" }} />
          <input
            style={{ width:"100%", background:"var(--bg)", border:"1px solid var(--border)", borderRadius:8, padding:"9px 12px 9px 32px", color:"var(--text)", fontSize:13, fontFamily:"inherit", outline:"none", boxSizing:"border-box" }}
            placeholder="Search expenses..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <select className="filter-select" style={{ flex:1, minWidth:150 }} value={filterCat} onChange={e => setFilterCat(e.target.value)}>
          <option value="All">All Categories</option>
          {CATEGORIES.map(c => <option key={c.name} value={c.name}>{c.name}</option>)}
        </select>
        <select className="filter-select" style={{ flex:1, minWidth:140 }} value={filterMonth} onChange={e => setFilterMonth(e.target.value)}>
          <option value="All">All Months</option>
          {MONTHS.map((m, i) => <option key={i} value={i}>{m}</option>)}
        </select>
        {(filterCat !== "All" || filterMonth !== "All" || search !== "") && (
          <button className="btn-secondary" style={{ padding:"9px 14px", fontSize:12, display:"inline-flex", alignItems:"center", gap:4 }} onClick={() => { setFilterCat("All"); setFilterMonth("All"); setSearch(""); }}>
            <Icon name="x" size={13} /> Clear
          </button>
        )}
      </div>

      {/* ── Table ── */}
      <div style={{ background:"var(--card)", border:"1px solid var(--border)", borderRadius:12, overflow:"hidden", boxShadow:"0 1px 3px rgba(0,0,0,0.04)" }}>
        {filtered.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon"><Icon name="receipt" size={40} strokeWidth={1.5} /></div>
            <div style={{ fontWeight:600, color:"var(--faint)", marginBottom:4, fontSize:15 }}>No expenses found</div>
            <div style={{ fontSize:13, color:"var(--faint)" }}>Try adjusting your filters</div>
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
                      style={{ background: idx % 2 === 0 ? "var(--card)" : "var(--subtle)" }}
                      onMouseEnter={e => e.currentTarget.style.background = "#f0f7ff"}
                      onMouseLeave={e => e.currentTarget.style.background = idx % 2 === 0 ? "var(--card)" : "var(--subtle)"}
                    >
                      <td style={{ ...tdStyle, color:"var(--muted)", fontSize:12, fontWeight:500 }}>{exp.date}</td>
                      <td style={{ ...tdStyle, maxWidth:200 }}>
                        <div style={{ fontWeight:600, overflow:"hidden", textOverflow:"ellipsis" }}>{exp.title}</div>
                        {exp.notes && <div style={{ fontSize:11, color:"var(--faint2)", marginTop:2 }}>{exp.notes}</div>}
                      </td>
                      <td style={tdStyle}>
                        <div style={{ display:"inline-flex", alignItems:"center", gap:6, background: cat ? `${cat.color}12` : "var(--bg)", border:`1px solid ${cat ? cat.color+"30" : "var(--border)"}`, borderRadius:6, padding:"4px 10px", fontSize:11, fontWeight:600, color:cat?.color || "var(--muted)" }}>
                          <Icon name={cat?.icon || "package"} size={12} /> {exp.category}
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
                            : <span style={{ color:"var(--faint)", fontSize:11 }}>—</span>
                          }
                        </div>
                      </td>
                      <td style={{ ...tdStyle, textAlign:"center" }}>
                        <div style={{ display:"flex", gap:6, justifyContent:"center" }}>
                          <button onClick={() => onEdit(exp)} style={{ background:"var(--bg)", color:"var(--muted2)", border:"1px solid var(--border)", padding:"5px 10px", borderRadius:6, fontSize:11, fontWeight:600, cursor:"pointer", fontFamily:"inherit", display:"inline-flex", alignItems:"center", gap:4 }}><Icon name="pencil" size={12} /> Edit</button>
                          <button onClick={() => onDelete(exp.id)} style={{ background:"#fff1f2", color:"#e11d48", border:"1px solid #fecdd3", padding:"5px 10px", borderRadius:6, fontSize:11, fontWeight:600, cursor:"pointer", fontFamily:"inherit", display:"inline-flex", alignItems:"center", gap:4 }}><Icon name="trash" size={12} /> Delete</button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr style={{ background:"var(--bg)" }}>
                  <td colSpan={3} style={{ ...tdStyle, fontWeight:700, borderTop:"1px solid var(--border)", borderBottom:"none" }}>
                    {filtered.length} transaction{filtered.length !== 1 ? "s" : ""}
                  </td>
                  <td style={{ ...tdStyle, textAlign:"right", fontWeight:800, color:"#e11d48", fontSize:15, letterSpacing:"-0.5px", borderTop:"1px solid var(--border)", borderBottom:"none" }}>
                    -{fmt(totalFiltered)}
                  </td>
                  <td colSpan={2} style={{ borderTop:"1px solid var(--border)", borderBottom:"none" }} />
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>
    </>
  );
}