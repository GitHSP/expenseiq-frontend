import { useCallback, useEffect, useRef, useState } from "react";
import Icon from "./Icon";
import { documentsAPI } from "../utils/api";

// Documents for one investment or account: contracts, illustrations and
// statements, stored encrypted on the server. Upload, open, delete.

const KINDS = { policy: "Policy / contract", illustration: "Illustration", statement: "Statement", receipt: "Receipt", other: "Other" };
const size = b => (b > 1024 * 1024 ? `${(b / 1024 / 1024).toFixed(1)} MB` : `${Math.max(1, Math.round(b / 1024))} KB`);
const when = iso => new Date(`${iso.slice(0, 10)}T12:00:00`).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });

export default function DocumentsPanel({ investment, account, defaultKind = "other" }) {
  const [docs, setDocs] = useState(null);
  const [kind, setKind] = useState(defaultKind);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const pick = useRef(null);
  const filter = investment ? { investment } : { account };

  const load = useCallback(() => {
    documentsAPI.list(investment ? { investment } : { account }).then(setDocs).catch(() => setErr("Couldn't load documents."));
  }, [investment, account]);
  useEffect(() => { load(); }, [load]);

  async function upload(files) {
    setBusy(true); setErr("");
    try {
      for (const f of Array.from(files || [])) await documentsAPI.upload(f, { ...filter, kind });
      load();
    } catch (e) { setErr(e.message || "Couldn't upload that."); } finally { setBusy(false); }
  }

  return (
    <div style={{ marginTop: 12, borderTop: "1px solid var(--subtle2)", paddingTop: 10 }}>
      <div style={{ fontSize: 11, fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 6 }}>
        Documents
      </div>
      {docs && docs.length === 0 && <div style={{ fontSize: 13, color: "var(--muted)", marginBottom: 8 }}>No documents yet.</div>}
      {(docs || []).map(d => (
        <div key={d.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 0", borderBottom: "1px solid var(--subtle2)" }}>
          <Icon name={d.content_type === "application/pdf" ? "file-text" : "download"} size={16} color="var(--muted)" />
          <button onClick={() => documentsAPI.open(d).catch(e => setErr(e.message))}
            style={{ flex: 1, minWidth: 0, textAlign: "left", background: "none", border: "none", padding: 0, cursor: "pointer",
                     fontFamily: "inherit", color: "var(--text)" }}>
            <span style={{ display: "block", fontSize: 14, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{d.name}</span>
            <span style={{ display: "block", fontSize: 11, color: "var(--muted)" }}>
              {KINDS[d.kind]} · {d.doc_date ? when(d.doc_date) : `added ${when(d.uploaded_at)}`} · {size(d.size)}
            </span>
          </button>
          <button className="btn-ghost" aria-label={`Delete ${d.name}`} style={{ padding: 8, color: "var(--muted)" }}
            onClick={() => window.confirm(`Delete ${d.name}? This removes the stored copy.`) &&
              documentsAPI.remove(d.id).then(load).catch(e => setErr(e.message))}>
            <Icon name="trash" size={14} />
          </button>
        </div>
      ))}
      <div style={{ display: "flex", gap: 6, marginTop: 8, flexWrap: "wrap" }}>
        <select value={kind} onChange={e => setKind(e.target.value)} aria-label="Document type"
          style={{ background: "var(--card)", color: "var(--text)", border: "1px solid var(--border)", borderRadius: 8, padding: "7px 8px", fontSize: 13 }}>
          {Object.entries(KINDS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
        <button className="btn-secondary" disabled={busy} style={{ padding: "7px 12px", fontSize: 13, display: "inline-flex", alignItems: "center", gap: 5 }}
          onClick={() => pick.current?.click()}>
          <Icon name="plus" size={13} /> {busy ? "Uploading..." : "Add PDF or photo"}
        </button>
        <input ref={pick} type="file" accept="application/pdf,image/jpeg,image/png,image/heic,.heic" multiple hidden
          onChange={e => { upload(e.target.files); e.target.value = ""; }} />
      </div>
      <div style={{ fontSize: 11, color: "var(--faint2)", marginTop: 6 }}>Stored encrypted; only you can open them. Up to 20 MB each.</div>
      {err && <div style={{ fontSize: 12, color: "var(--neg-text)", marginTop: 6 }}>{err}</div>}
    </div>
  );
}
