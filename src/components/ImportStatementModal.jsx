import { useMemo, useRef, useState } from "react";
import Icon from "./Icon";
import { CATEGORIES } from "../constants/categories";
import { INCOME_CATEGORIES } from "../hooks/useIncome";
import { statementsAPI } from "../utils/api";

// Upload one or more bank/card statements (PDF, CSV, OFX, QFX), review the parsed
// rows, then import the ones that are ticked. The backend guesses categories
// and flags transfers (including ones between the user's own accounts across
// statements) and likely duplicates; those start unticked.

const EXPENSE_NAMES = CATEGORIES.map(c => c.name);
const FILE_COLORS   = ["#0070f3", "#059669", "#d97706", "#db2777", "#0891b2", "#7c3aed"];
const INCOME_NAMES  = INCOME_CATEGORIES.map(c => c.name);

const cellStyle = { padding: "8px 10px", borderBottom: "1px solid var(--subtle2)", fontSize: 13, verticalAlign: "middle" };
const selectStyle = {
  background: "var(--card)", color: "var(--text)", border: "1px solid var(--border)",
  borderRadius: 6, padding: "5px 6px", fontSize: 12, fontFamily: "inherit", maxWidth: 160,
};

function Badge({ color, children }) {
  return (
    <span style={{
      display: "inline-block", fontSize: 10, fontWeight: 700, color,
      background: `${color}14`, border: `1px solid ${color}40`,
      borderRadius: 4, padding: "0 5px", marginLeft: 6, whiteSpace: "nowrap",
    }}>{children}</span>
  );
}

export default function ImportStatementModal({ onClose, onImported, formatAmount }) {
  const [step,     setStep]     = useState("upload");   // upload | review
  const [busy,     setBusy]     = useState(false);
  const [error,    setError]    = useState("");
  const [preview,  setPreview]  = useState(null);
  const [flips,    setFlips]    = useState({});          // file index -> purchases are positive
  const [edits,    setEdits]    = useState({});          // row id -> { include?, kind?, category? }
  const [dragOver, setDragOver] = useState(false);
  const fileInput = useRef(null);

  const fmt = v => formatAmount ? formatAmount(parseFloat(v) || 0) : `$${(parseFloat(v) || 0).toFixed(2)}`;

  async function handleFiles(fileList) {
    const files = Array.from(fileList || []);
    if (!files.length) return;
    setError("");
    setBusy(true);
    try {
      const data = await statementsAPI.preview(files);
      setPreview(data);
      setFlips(Object.fromEntries(data.files.map((f, i) => [i, f.suggest_flip])));
      setEdits({});
      setStep("review");
    } catch (err) {
      setError(err.message || "Couldn't read that file.");
    } finally {
      setBusy(false);
    }
  }

  // Effective state of each row = backend guess, adjusted by the flip toggle,
  // then by anything the user changed.
  const rows = useMemo(() => {
    if (!preview) return [];
    return preview.rows.map(r => {
      const moneyOut = (parseFloat(r.signed_amount) < 0) !== !!flips[r.file];
      const e = edits[r.id] || {};
      const kind = e.kind || (moneyOut ? "expense" : "income");
      const duplicate = kind === "expense" ? r.duplicate_expense : r.duplicate_income;
      const category = e.category && e.kind === kind
        ? e.category
        : (kind === "expense" ? r.expense_category : r.income_category);
      const include = e.include ?? (!r.is_transfer && !r.transfer_match && !duplicate);
      return { ...r, kind, duplicate, category, include };
    });
  }, [preview, flips, edits]);

  function edit(id, change) {
    setEdits(prev => ({ ...prev, [id]: { ...prev[id], ...change } }));
  }

  function setAll(include) {
    setEdits(prev => {
      const next = { ...prev };
      rows.forEach(r => { next[r.id] = { ...next[r.id], include }; });
      return next;
    });
  }

  const selected   = rows.filter(r => r.include);
  const pairCount  = rows.filter(r => r.transfer_match?.type === "pair").length / 2;
  const earlierHalves = rows.filter(r => r.transfer_match?.type === "existing");
  const expenses   = selected.filter(r => r.kind === "expense");
  const income     = selected.filter(r => r.kind === "income");
  const sum        = list => list.reduce((s, r) => s + (parseFloat(r.amount) || 0), 0);

  async function handleImport() {
    setError("");
    setBusy(true);
    try {
      const result = await statementsAPI.importRows("statement", selected.map(r => ({
        kind: r.kind, title: r.title, amount: r.amount, date: r.date, category: r.category,
        source: preview.files[r.file]?.filename,
      })));
      onImported(result);
    } catch (err) {
      setError(err.message || "Import failed — nothing was saved.");
      setBusy(false);
    }
  }

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && !busy && onClose()}>
      <div className="modal-box" style={{ maxWidth: step === "review" ? 960 : 520, display: "flex", flexDirection: "column" }}>
        <div className="modal-handle" />
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
          <div className="modal-title" style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <Icon name="download" size={18} /> Import statement
          </div>
          <button onClick={onClose} disabled={busy} aria-label="Close"
            style={{ background: "transparent", border: "none", color: "var(--muted)", cursor: "pointer", padding: 4 }}>
            <Icon name="x" size={18} />
          </button>
        </div>

        {error && (
          <div style={{ background: "#fff1f2", border: "1px solid #fecdd3", color: "#e11d48", borderRadius: 8,
                        padding: "10px 12px", fontSize: 13, margin: "8px 0 12px", display: "flex", gap: 8, alignItems: "center" }}>
            <Icon name="warning" size={15} /> {error}
          </div>
        )}

        {/* ── Step 1: upload ── */}
        {step === "upload" && (
          <>
            <div
              onClick={() => !busy && fileInput.current?.click()}
              onDragOver={e => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={e => { e.preventDefault(); setDragOver(false); handleFiles(e.dataTransfer.files); }}
              role="button" tabIndex={0}
              onKeyDown={e => (e.key === "Enter" || e.key === " ") && fileInput.current?.click()}
              style={{
                border: `2px dashed ${dragOver ? "#0070f3" : "var(--border)"}`,
                background: dragOver ? "rgba(0,112,243,0.05)" : "var(--bg)",
                borderRadius: 12, padding: "36px 20px", textAlign: "center", cursor: busy ? "wait" : "pointer",
                margin: "8px 0 16px",
              }}
            >
              <div style={{ color: "#0070f3", marginBottom: 10 }}>
                <Icon name={busy ? "loader" : "receipt"} size={32} className={busy ? "spin" : undefined} />
              </div>
              <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 4 }}>
                {busy ? "Reading your statements..." : "Drop statements here, or click to choose"}
              </div>
              <div style={{ fontSize: 12, color: "var(--muted)" }}>PDF, CSV, OFX or QFX · up to 10 files, 5 MB each</div>
              <input
                ref={fileInput} type="file" accept=".pdf,.csv,.ofx,.qfx,.txt" multiple hidden
                onChange={e => { handleFiles(e.target.files); e.target.value = ""; }}
              />
            </div>
            <div style={{ fontSize: 12, color: "var(--muted2)", lineHeight: 1.6 }}>
              <strong>How to get one:</strong> in your bank's online banking, open the account or card,
              save the <em>PDF statement</em> — or, for the most reliable import, choose
              <em>Download transactions</em> and pick <em>CSV</em> (or <em>Quicken / QFX</em>).
              <br />
              <strong>Tip:</strong> add all your accounts and cards for the same period together —
              money moved between your own accounts is then matched up and skipped, so it isn't counted twice.
              Nothing is saved until you review and confirm.
            </div>
          </>
        )}

        {/* ── Step 2: review ── */}
        {step === "review" && preview && (
          <>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10, margin: "4px 0 12px" }}>
              <div style={{ fontSize: 13, color: "var(--muted)" }}>
                {rows.length} transactions from {preview.files.length} statement{preview.files.length === 1 ? "" : "s"}
                {pairCount > 0 && <> · <strong style={{ color: "#7c3aed" }}>{pairCount} transfer{pairCount === 1 ? "" : "s"} between your accounts</strong></>}
              </div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <button className="btn-secondary" style={{ padding: "5px 10px", fontSize: 12 }} onClick={() => setAll(true)}>Select all</button>
                <button className="btn-secondary" style={{ padding: "5px 10px", fontSize: 12 }} onClick={() => setAll(false)}>Select none</button>
              </div>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 4, marginBottom: 10 }}>
              {preview.files.map((f, i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", fontSize: 12 }}>
                  <span style={{ fontWeight: 700, color: FILE_COLORS[i % FILE_COLORS.length], display: "inline-flex", alignItems: "center", gap: 5 }}>
                    <Icon name="receipt" size={12} /> {f.filename}
                  </span>
                  <span style={{ color: "var(--muted)" }}>{f.count} rows</span>
                  <label style={{ display: "flex", alignItems: "center", gap: 5, cursor: "pointer", color: "var(--muted2)" }}
                    title="Tick this if purchases are showing up as income (common on credit-card statements)">
                    <input type="checkbox" checked={!!flips[i]}
                      onChange={e => {
                        const on = e.target.checked;
                        setFlips(prev => ({ ...prev, [i]: on }));
                        setEdits(prev => Object.fromEntries(Object.entries(prev).filter(([id]) => preview.rows[id]?.file !== i)));
                      }} />
                    Purchases are positive numbers{f.suggest_flip ? " (detected)" : ""}
                  </label>
                </div>
              ))}
            </div>

            {earlierHalves.length > 0 && (
              <div style={{ fontSize: 12, color: "#7c3aed", background: "rgba(124,58,237,0.07)", border: "1px solid rgba(124,58,237,0.25)",
                            borderRadius: 8, padding: "8px 12px", marginBottom: 10, lineHeight: 1.5 }}>
                {earlierHalves.length} transfer{earlierHalves.length === 1 ? "" : "s"} here match{earlierHalves.length === 1 ? "es" : ""} something
                you imported before (e.g. "{earlierHalves[0].transfer_match.title}", {earlierHalves[0].transfer_match.date}). If that was
                money moving between your own accounts, delete the earlier entry too so it isn't counted as spending or income.
              </div>
            )}

            <div style={{ overflow: "auto", maxHeight: "50vh", border: "1px solid var(--border)", borderRadius: 10 }}>
              <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 680 }}>
                <thead style={{ position: "sticky", top: 0, background: "var(--subtle)", zIndex: 1 }}>
                  <tr>
                    {["", "Date", "Description", "Type", "Category", "Amount"].map((h, i) => (
                      <th key={i} style={{ ...cellStyle, fontSize: 11, fontWeight: 700, color: "var(--muted)", textTransform: "uppercase",
                                           letterSpacing: "0.5px", textAlign: i === 5 ? "right" : "left" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows.map(r => {
                    const names = r.kind === "expense" ? EXPENSE_NAMES : INCOME_NAMES;
                    const options = names.includes(r.category) ? names : [r.category, ...names];
                    return (
                      <tr key={r.id} style={{ opacity: r.include ? 1 : 0.5 }}>
                        <td style={cellStyle}>
                          <input type="checkbox" checked={r.include} aria-label={`Include ${r.title}`}
                            onChange={e => edit(r.id, { include: e.target.checked })} />
                        </td>
                        <td style={{ ...cellStyle, color: "var(--muted)", whiteSpace: "nowrap" }}>{r.date}</td>
                        <td style={cellStyle}>
                          {preview.files.length > 1 && (
                            <span style={{ display: "block", fontSize: 10, fontWeight: 700, color: FILE_COLORS[r.file % FILE_COLORS.length] }}>
                              {preview.files[r.file]?.filename}
                            </span>
                          )}
                          <span style={{ fontWeight: 600 }} title={r.raw_description}>{r.title}</span>
                          {r.transfer_match?.type === "pair" && (
                            <span title={`Matches "${r.transfer_match.title}" on ${r.transfer_match.date} in ${preview.files[r.transfer_match.file]?.filename}`}>
                              <Badge color="#7c3aed">Transfer between your accounts</Badge>
                            </span>
                          )}
                          {r.transfer_match?.type === "existing" && (
                            <span title={`You imported "${r.transfer_match.title}" (${r.transfer_match.date}) as ${r.transfer_match.kind} earlier`}>
                              <Badge color="#7c3aed">Other half imported earlier</Badge>
                            </span>
                          )}
                          {r.is_transfer && !r.transfer_match && <Badge color="#7c3aed">Transfer</Badge>}
                          {r.duplicate && <Badge color="#d97706">Possible duplicate</Badge>}
                        </td>
                        <td style={cellStyle}>
                          <select style={selectStyle} value={r.kind} aria-label="Type"
                            onChange={e => edit(r.id, { kind: e.target.value, category: undefined })}>
                            <option value="expense">Expense</option>
                            <option value="income">Income</option>
                          </select>
                        </td>
                        <td style={cellStyle}>
                          <select style={selectStyle} value={r.category} aria-label="Category"
                            onChange={e => edit(r.id, { kind: r.kind, category: e.target.value })}>
                            {options.map(c => <option key={c} value={c}>{c}</option>)}
                          </select>
                        </td>
                        <td style={{ ...cellStyle, textAlign: "right", fontWeight: 700, whiteSpace: "nowrap",
                                     color: r.kind === "expense" ? "#e11d48" : "#059669" }}>
                          {r.kind === "expense" ? "−" : "+"}{fmt(r.amount)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10, marginTop: 14 }}>
              <div style={{ fontSize: 13, color: "var(--muted2)" }}>
                {expenses.length} expense{expenses.length === 1 ? "" : "s"} ({fmt(sum(expenses))})
                {" · "}{income.length} income ({fmt(sum(income))})
                {rows.length - selected.length > 0 && ` · ${rows.length - selected.length} skipped`}
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <button className="btn-secondary" onClick={() => { setStep("upload"); setPreview(null); setError(""); }} disabled={busy}>
                  Choose another file
                </button>
                <button className="btn-primary" onClick={handleImport} disabled={busy || selected.length === 0}
                  style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                  {busy ? "Importing..." : `Import ${selected.length} transaction${selected.length === 1 ? "" : "s"}`}
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
