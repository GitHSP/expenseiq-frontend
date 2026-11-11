import { useEffect, useState } from "react";
import Icon from "./Icon";
import { accountsAPI } from "../utils/api";

// "Available = balance + overdraft" for the user's bank accounts. The balance is
// typed in from the bank app (statements are weeks old), so it shows how fresh it is.

export function updatedAgo(iso) {
  if (!iso) return "";
  const mins = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (mins < 2) return "updated just now";
  if (mins < 60) return `updated ${mins} min ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `updated ${hours} hour${hours === 1 ? "" : "s"} ago`;
  const days = Math.round(hours / 24);
  return `updated ${days} day${days === 1 ? "" : "s"} ago`;
}

// "Estimated: $1,374 you typed − $107 paid since (Insurance)": Planner payments ticked
// after the balance was typed, worked out by the backend (card payments left out).
function SinceLine({ account, fmt }) {
  const s = account.since_update;
  if (!s) return null;
  const paid = s.items.filter(i => !i.income).map(i => i.label);
  const got = s.items.filter(i => i.income).map(i => i.label);
  const names = list => (list.length > 2 ? `${list.slice(0, 2).join(", ")} +${list.length - 2} more` : list.join(", "));
  return (
    <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 2 }}>
      Estimated: {fmt(account.current_balance)} you typed
      {parseFloat(s.paid) > 0 && <> − {fmt(s.paid)} paid since ({names(paid)})</>}
      {parseFloat(s.received) > 0 && <> + {fmt(s.received)} received ({names(got)})</>}
    </div>
  );
}

const field = { background: "var(--card)", border: "1px solid var(--border)", borderRadius: 8, padding: "8px 10px",
                fontSize: 14, color: "var(--text)", fontFamily: "inherit", boxSizing: "border-box", minWidth: 0 };

// Balance + overdraft on one bank account (Accounts page).
export function BalanceEditor({ account, fmt, onSaved }) {
  const [open, setOpen] = useState(false);
  const [balance, setBalance] = useState(account.current_balance ?? "");
  const [overdraft, setOverdraft] = useState(parseFloat(account.overdraft_limit) ? account.overdraft_limit : "");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const has = account.current_balance !== null && account.current_balance !== undefined;
  const stale = has && (Date.now() - new Date(account.balance_updated_at).getTime()) > 3 * 86400000;

  async function save() {
    setBusy(true); setErr("");
    try {
      await accountsAPI.update(account.id, { current_balance: balance === "" ? null : balance, overdraft_limit: overdraft || 0 });
      setOpen(false);
      onSaved();
    } catch (e) { setErr(e.message || "Couldn't save."); } finally { setBusy(false); }
  }

  return (
    <div style={{ marginTop: 12, padding: "12px 14px", borderRadius: 10, background: "var(--subtle)" }}>
      {!open ? (
        <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
          <div style={{ flex: 1, minWidth: 160 }}>
            {has ? (
              <>
                <div style={{ fontSize: 12, color: "var(--muted)" }}>Available to spend</div>
                <div style={{ fontSize: 20, fontWeight: 700, color: parseFloat(account.available) < 0 ? "var(--neg-text)" : "var(--text)" }}>
                  {fmt(account.available)}
                </div>
                <div style={{ fontSize: 12, color: stale ? "var(--warn-text)" : "var(--muted)", marginTop: 2 }}>
                  Balance {fmt(account.estimated_balance ?? account.current_balance)}
                  {parseFloat(account.overdraft_limit) > 0 && ` + overdraft ${fmt(account.overdraft_limit)}`}
                  {" · "}{updatedAgo(account.balance_updated_at)}
                </div>
                <SinceLine account={account} fmt={fmt} />
              </>
            ) : (
              <div style={{ fontSize: 13, color: "var(--muted)" }}>
                Add the balance from your bank app (and any overdraft) to see what you can spend right now.
              </div>
            )}
          </div>
          <button className="btn-secondary" style={{ padding: "7px 12px", fontSize: 12 }} onClick={() => setOpen(true)}>
            {has ? "Update balance" : "Add balance"}
          </button>
        </div>
      ) : (
        <div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <label style={{ flex: "1 1 140px", fontSize: 12, color: "var(--muted)" }}>
              Current balance (CAD)
              <input type="number" inputMode="decimal" step="0.01" value={balance} placeholder="e.g. 1250.40"
                onChange={e => setBalance(e.target.value)} style={{ ...field, width: "100%", marginTop: 4 }} />
            </label>
            <label style={{ flex: "1 1 140px", fontSize: 12, color: "var(--muted)" }}>
              Overdraft limit (CAD)
              <input type="number" inputMode="decimal" min="0" step="0.01" value={overdraft} placeholder="0"
                onChange={e => setOverdraft(e.target.value)} style={{ ...field, width: "100%", marginTop: 4 }} />
            </label>
          </div>
          <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 6 }}>
            If you're overdrawn, type the balance as a minus number, e.g. -120.
          </div>
          <div style={{ display: "flex", gap: 6, marginTop: 10 }}>
            <button className="btn-primary" disabled={busy} style={{ padding: "7px 14px", fontSize: 12 }} onClick={save}>
              {busy ? "Saving..." : "Save"}
            </button>
            <button className="btn-secondary" style={{ padding: "7px 12px", fontSize: 12 }} onClick={() => setOpen(false)}>Cancel</button>
          </div>
          {err && <div style={{ fontSize: 12, color: "var(--neg-text)", marginTop: 6 }}>{err}</div>}
        </div>
      )}
    </div>
  );
}

// Home: the total available across bank accounts. Hidden until a balance is added.
export default function AvailableBalance({ fmt, refreshKey, onOpenAccounts }) {
  const [data, setData] = useState(null);
  useEffect(() => {
    let live = true;
    accountsAPI.available().then(d => { if (live) setData(d); }).catch(() => {});
    return () => { live = false; };
  }, [refreshKey]);

  if (!data) return null;
  const counted = data.accounts.filter(a => a.available !== null);
  if (counted.length === 0) {
    if (data.accounts.length === 0) return null;
    return (
      <button className="card" onClick={onOpenAccounts} style={{ width: "100%", display: "flex", alignItems: "center", gap: 12,
        padding: "14px 16px", marginBottom: 20, textAlign: "left", cursor: "pointer", fontFamily: "inherit", color: "var(--text)" }}>
        <Icon name="wallet" size={16} />
        <span style={{ flex: 1, fontSize: 14 }}>Add your bank balance to see what you can spend right now</span>
        <Icon name="chevron-right" size={16} color="var(--muted)" />
      </button>
    );
  }
  const oldest = counted.map(a => a.balance_updated_at).sort()[0];
  const stale = (Date.now() - new Date(oldest).getTime()) > 3 * 86400000;
  const over = parseFloat(data.total_overdraft) > 0;
  return (
    <>
      <div style={{ fontSize: 12, fontWeight: 600, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.6px", margin: "0 2px 8px" }}>
        Available now
      </div>
      <button className="card" onClick={onOpenAccounts} style={{ width: "100%", padding: "14px 16px", marginBottom: 20, textAlign: "left",
        cursor: "pointer", fontFamily: "inherit", color: "var(--text)", display: "block" }}>
        <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
          <span style={{ fontSize: 26, fontWeight: 700, color: parseFloat(data.total_available) < 0 ? "var(--neg-text)" : "var(--text)" }}>
            {fmt(data.total_available)}
          </span>
          <span style={{ fontSize: 12, color: "var(--muted)" }}>
            Balance {fmt(data.total_balance)}{over && ` + overdraft ${fmt(data.total_overdraft)}`}
          </span>
        </div>
        {counted.length > 1 && (
          <div style={{ marginTop: 8, display: "flex", flexDirection: "column", gap: 3 }}>
            {counted.map(a => (
              <div key={a.id} style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "var(--muted)" }}>
                <span>{a.name}</span><span>{fmt(a.available)}</span>
              </div>
            ))}
          </div>
        )}
        {counted.filter(a => a.since_update).map(a => <SinceLine key={a.id} account={a} fmt={fmt} />)}
        <div style={{ fontSize: 12, marginTop: 6, color: stale ? "var(--warn-text)" : "var(--muted)" }}>
          {stale ? `Balance ${updatedAgo(oldest)}. Tap to update it.` : updatedAgo(oldest)[0].toUpperCase() + updatedAgo(oldest).slice(1)}
        </div>
      </button>
    </>
  );
}
