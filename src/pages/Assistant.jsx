import { useState, useRef, useEffect } from "react";
import { useAssistant } from "../hooks/useAssistant";
import Icon, { stripEmoji } from "../components/Icon";
import { assistantAPI } from "../utils/api";

const SUGGESTIONS = [
  "How did my last month go?",
  "Which card should I pay first, and how much?",
  "How much did I spend on coffee, and on which card?",
  "Keep my dining under $300 a month",
];

const ALERT_COLORS = { danger: "#e11d48", warning: "#d97706", info: "#0070f3" };

// Things Aurora would flag right now, shown before the first message.
function Heads({ onAsk }) {
  const [alerts, setAlerts] = useState([]);
  useEffect(() => {
    let alive = true;
    assistantAPI.alerts().then(d => alive && setAlerts(d.alerts || [])).catch(() => {});
    return () => { alive = false; };
  }, []);
  if (!alerts.length) return null;
  return (
    <div style={{ maxWidth: 420, margin: "0 auto 14px", border: "1px solid var(--border)", borderRadius: 10,
                  background: "var(--card)", overflow: "hidden" }}>
      <div style={{ padding: "8px 12px", fontSize: 12, fontWeight: 700, color: "var(--muted)", display: "flex",
                    alignItems: "center", gap: 6, borderBottom: "1px solid var(--subtle2)" }}>
        <Icon name="bell" size={13} /> Worth a look
      </div>
      {alerts.slice(0, 4).map((a, i) => (
        <button key={i} onClick={() => onAsk(`Tell me more about this: ${a.title}`)}
          style={{ display: "block", width: "100%", textAlign: "left", padding: "8px 12px", background: "transparent",
                   border: "none", borderTop: i ? "1px solid var(--subtle2)" : "none", cursor: "pointer",
                   fontFamily: "inherit", color: "var(--text)" }}>
          <div style={{ fontSize: 13, fontWeight: 600, display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ width: 7, height: 7, borderRadius: 4, background: ALERT_COLORS[a.severity] || "#64748b", flexShrink: 0 }} />
            {a.title}
          </div>
          <div style={{ fontSize: 11.5, color: "var(--muted)", marginTop: 2, marginLeft: 13, display: "-webkit-box",
                        WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{a.detail}</div>
        </button>
      ))}
      {alerts.length > 4 && (
        <button onClick={() => onAsk("What needs my attention?")}
          style={{ width: "100%", padding: "7px 12px", fontSize: 12, color: "#0070f3", background: "transparent",
                   border: "none", borderTop: "1px solid var(--subtle2)", cursor: "pointer", fontFamily: "inherit" }}>
          {alerts.length - 4} more — ask Aurora
        </button>
      )}
    </div>
  );
}

// Light formatting for Aurora's replies: **bold**, "- " bullet lists and
// "| a | b |" tables. Built from React elements (text is never parsed as
// HTML), so anything in a reply is shown, not run.
// Markdown escapes ("upg\*paymentico") are shown without the backslash.
const unescape = s => s.replace(/\\([*_#|`[\]()>~-])/g, "$1");

function Inline({ text }) {
  // Bold first (it may contain escaped stars), then everything else.
  return String(text).split(/(\*\*(?:\\.|[^*\\])+\*\*)/g).map((part, i) =>
    part.startsWith("**") && part.endsWith("**") && part.length > 4
      ? <strong key={i}>{unescape(part.slice(2, -2))}</strong>
      : <span key={i}>{unescape(part.replace(/(^|\s)\*([^*\s][^*]*)\*(?=\s|$)/g, "$1$2"))}</span>);
}

function RichText({ text }) {
  const lines = String(text || "").split("\n");
  const blocks = [];
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (/^\s*\|.*\|\s*$/.test(line)) {
      const rows = [];
      while (i < lines.length && /^\s*\|.*\|\s*$/.test(lines[i])) {
        if (!/^\s*\|[\s:|-]+\|\s*$/.test(lines[i])) rows.push(lines[i].trim().slice(1, -1).split("|").map(c => c.trim()));
        i++;
      }
      i--;
      blocks.push({ type: "table", rows });
    } else if (/^\s*([-•*]|\d+\.)\s+/.test(line)) {
      const items = [];
      while (i < lines.length && /^\s*([-•*]|\d+\.)\s+/.test(lines[i])) {
        items.push(lines[i].replace(/^\s*([-•*]|\d+\.)\s+/, ""));
        i++;
      }
      i--;
      blocks.push({ type: "list", items });
    } else {
      blocks.push({ type: "text", text: line.replace(/^#{1,4}\s+/, "") , heading: /^#{1,4}\s+/.test(line) });
    }
  }
  return blocks.map((b, i) => {
    if (b.type === "table") {
      return (
        <div key={i} style={{ overflowX: "auto", margin: "6px 0" }}>
          <table style={{ borderCollapse: "collapse", fontSize: 13, width: "100%" }}>
            <tbody>
              {b.rows.map((r, ri) => (
                <tr key={ri} style={{ borderTop: ri ? "1px solid var(--subtle2)" : "none" }}>
                  {r.map((c, ci) => {
                    const Cell = ri === 0 ? "th" : "td";
                    return (
                      <Cell key={ci} style={{ padding: "4px 8px 4px 0", textAlign: ci && /^[-−]?[A-Z$€£₹]*\$?[\d,.]+/.test(c) ? "right" : "left",
                                             fontWeight: ri === 0 ? 700 : 400, whiteSpace: ci ? "nowrap" : "normal" }}>
                        <Inline text={c} />
                      </Cell>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    }
    if (b.type === "list") {
      return (
        <ul key={i} style={{ margin: "4px 0", paddingLeft: 18 }}>
          {b.items.map((it, ii) => <li key={ii} style={{ margin: "2px 0" }}><Inline text={it} /></li>)}
        </ul>
      );
    }
    return b.text.trim() === ""
      ? <div key={i} style={{ height: 6 }} />
      : <div key={i} style={b.heading ? { fontWeight: 700, marginTop: 4 } : undefined}><Inline text={b.text} /></div>;
  });
}

function ActionChips({ actions }) {
  if (!actions || actions.length === 0) return null;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: 8 }}>
      {actions.map((a, i) => (
        <div
          key={i}
          style={{
            fontSize:     12,
            fontWeight:   600,
            color:        "#059669",
            background:   "rgba(5,150,105,0.1)",
            border:       "1px solid rgba(5,150,105,0.25)",
            borderRadius: 8,
            padding:      "6px 10px",
            display:      "flex",
            alignItems:   "center",
            gap:          6,
          }}
        >
          <Icon name="check-circle" size={13} /> {a.message}
        </div>
      ))}
    </div>
  );
}

function MessageBubble({ message, onRetry, canRetry }) {
  const isUser = message.role === "user";
  return (
    <div style={{
      display:        "flex",
      justifyContent: isUser ? "flex-end" : "flex-start",
      marginBottom:   14,
    }}>
      <div style={{
        maxWidth:     "78%",
        padding:      "10px 14px",
        borderRadius: isUser ? "14px 14px 2px 14px" : "14px 14px 14px 2px",
        background:   isUser ? "#0070f3" : "var(--card)",
        color:        isUser ? "#fff" : "var(--text)",
        border:       isUser ? "none" : "1px solid var(--border)",
        boxShadow:    `0 1px 2px var(--shadow)`,
        fontSize:     14,
        lineHeight:   1.5,
        whiteSpace:   isUser ? "pre-wrap" : "normal",
        wordBreak:    "break-word",
      }}>
        {message.isError && (
          <Icon name="warning" size={14} color="#d97706" style={{ marginRight: 6, verticalAlign: "-2px" }} />
        )}
        {message.isError ? stripEmoji(message.content) : isUser ? message.content : <RichText text={message.content} />}
        {!isUser && <ActionChips actions={message.actions} />}
        {message.isError && message.retryText && canRetry && (
          <button onClick={() => onRetry(message.retryText)}
            style={{ display: "inline-flex", alignItems: "center", gap: 5, marginTop: 8, fontSize: 12, fontWeight: 700,
                     color: "#0070f3", background: "rgba(0,112,243,0.08)", border: "1px solid rgba(0,112,243,0.25)",
                     borderRadius: 8, padding: "5px 10px", cursor: "pointer", fontFamily: "inherit" }}>
            <Icon name="refresh" size={12} /> Retry
          </button>
        )}
      </div>
    </div>
  );
}

function SyncPanel({ syncEnabled, syncBusy, syncError, enableSync, disableSync }) {
  const [open, setOpen] = useState(false);
  const [passphrase, setPassphrase] = useState("");
  const [confirmPassphrase, setConfirmPassphrase] = useState("");
  const [localError, setLocalError] = useState(null);

  async function handleSubmit(e) {
    e.preventDefault();
    setLocalError(null);
    if (passphrase.length < 8) {
      setLocalError("Use at least 8 characters.");
      return;
    }
    if (passphrase !== confirmPassphrase) {
      setLocalError("Passphrases don't match.");
      return;
    }
    try {
      await enableSync(passphrase);
      setOpen(false);
      setPassphrase("");
      setConfirmPassphrase("");
    } catch {
      // syncError from the hook is already shown below
    }
  }

  if (syncEnabled) {
    return (
      <button
        onClick={disableSync}
        title="Stop syncing this device (doesn't delete history already synced)"
        style={syncBtnStyle}
      >
        <Icon name="link" size={13} /> Synced
      </button>
    );
  }

  if (!open) {
    return (
      <button onClick={() => setOpen(true)} style={syncBtnStyle}>
        <Icon name="lock" size={13} /> Not synced
      </button>
    );
  }

  return (
    <form onSubmit={handleSubmit} style={{
      display: "flex", flexDirection: "column", gap: 8,
      background: "var(--card)", border: "1px solid var(--border)",
      borderRadius: 10, padding: 12, fontSize: 12, minWidth: 240,
    }}>
      <div style={{ color: "var(--muted)", lineHeight: 1.4 }}>
        Create (or, on a device that already has sync, re-enter) your sync
        passphrase. It's never sent anywhere — only your encrypted chat
        blobs and a key wrapped by it are. If this device has local-only
        history and another device already syncs, that local history will
        be replaced by the synced history.
      </div>
      <input
        type="password" placeholder="Sync passphrase" value={passphrase}
        onChange={(e) => setPassphrase(e.target.value)}
        style={syncInputStyle}
      />
      <input
        type="password" placeholder="Confirm passphrase" value={confirmPassphrase}
        onChange={(e) => setConfirmPassphrase(e.target.value)}
        style={syncInputStyle}
      />
      {(localError || syncError) && (
        <div style={{ color: "#e11d48" }}>{localError || syncError}</div>
      )}
      <div style={{ display: "flex", gap: 8 }}>
        <button type="submit" disabled={syncBusy} style={{ ...syncBtnStyle, flex: 1, background: "#0070f3", color: "#fff", border: "none" }}>
          {syncBusy ? "Working..." : "Enable sync"}
        </button>
        <button type="button" onClick={() => setOpen(false)} style={{ ...syncBtnStyle, flex: 1 }}>
          Cancel
        </button>
      </div>
    </form>
  );
}

const syncBtnStyle = {
  display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 5,
  fontSize: 12, fontWeight: 600, color: "var(--muted)",
  background: "var(--card)", border: "1px solid var(--border)",
  borderRadius: 8, padding: "8px 12px", cursor: "pointer",
};

const syncInputStyle = {
  fontSize: 13, color: "var(--text)", background: "var(--bg)",
  border: "1px solid var(--border)", borderRadius: 8, padding: "8px 10px",
};

// Rendered inside the floating AssistantWidget panel, which sets its size.
export default function Assistant({ onActionsTaken, onClose }) {
  const {
    messages, loaded, sending, error, sendMessage, resetConversation,
    syncEnabled, syncBusy, syncError, enableSync, disableSync,
  } = useAssistant();
  const [input, setInput] = useState("");
  const listRef = useRef(null);

  useEffect(() => {
    if (listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight;
    }
  }, [messages, sending]);

  async function handleSend(text) {
    const value = (text ?? input).trim();
    if (!value || sending) return;
    setInput("");
    const data = await sendMessage(value);
    if (data?.actions?.length && onActionsTaken) onActionsTaken(data.actions);
  }

  function handleKeyDown(e) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  return (
    <div style={{
      display:       "flex",
      flexDirection: "column",
      height:        "100%",
      padding:       16,
      boxSizing:     "border-box",
    }}>
      {/* ── Header ── */}
      <div style={{
        display:        "flex",
        alignItems:     "flex-start",
        justifyContent: "space-between",
        flexWrap:       "wrap",
        gap:            8,
        marginBottom:   12,
      }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 17, fontWeight: 700, color: "var(--text)" }}>
            Aurora
          </h2>
          <p style={{ margin: "2px 0 0", fontSize: 12, color: "var(--muted)" }}>
            Log expenses, update debts, manage your checklist.
          </p>
        </div>
        <div style={{ display: "flex", alignItems: "flex-start", gap: 8, flexWrap: "wrap" }}>
          <SyncPanel
            syncEnabled={syncEnabled}
            syncBusy={syncBusy}
            syncError={syncError}
            enableSync={enableSync}
            disableSync={disableSync}
          />
          {messages.length > 0 && (
            <button onClick={resetConversation} style={syncBtnStyle}>
              New chat
            </button>
          )}
          {onClose && (
            <button onClick={onClose} aria-label="Close Aurora" style={syncBtnStyle}>
              <Icon name="x" size={14} />
            </button>
          )}
        </div>
      </div>

      {/* ── Message list ── */}
      <div
        ref={listRef}
        style={{
          flex:         1,
          overflowY:    "auto",
          background:   "var(--bg)",
          border:       "1px solid var(--border)",
          borderRadius: 12,
          padding:      16,
          marginBottom: 12,
        }}
      >
        {!loaded ? (
          <div style={{ color: "var(--muted)", fontSize: 13, textAlign: "center", padding: 40 }}>
            Loading conversation...
          </div>
        ) : messages.length === 0 ? (
          <div style={{ padding: "24px 8px" }}>
            <Heads onAsk={handleSend} />
            <div style={{ color: "var(--muted)", fontSize: 14, marginBottom: 14, textAlign: "center" }}>
              <Icon name="wave" size={15} style={{ marginRight: 6, verticalAlign: "-2px" }} />Hi! I'm Aurora, your money assistant. Try something like:
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8, maxWidth: 420, margin: "0 auto" }}>
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  onClick={() => handleSend(s)}
                  style={{
                    textAlign:    "left",
                    fontSize:     13,
                    color:        "var(--text)",
                    background:   "var(--card)",
                    border:       "1px solid var(--border)",
                    borderRadius: 10,
                    padding:      "10px 14px",
                    cursor:       "pointer",
                  }}
                >
                  "{s}"
                </button>
              ))}
            </div>
          </div>
        ) : (
          <>
            {messages.map((m, i) => (
              <MessageBubble key={m.id} message={m} canRetry={i === messages.length - 1 && !sending}
                onRetry={async text => {
                  const data = await sendMessage(text, { retry: true });
                  if (data?.actions?.length && onActionsTaken) onActionsTaken(data.actions);
                }} />
            ))}
            {sending && (
              <div style={{ display: "flex", justifyContent: "flex-start", marginBottom: 14 }}>
                <div style={{
                  padding:      "10px 14px",
                  borderRadius: "14px 14px 14px 2px",
                  background:   "var(--card)",
                  border:       "1px solid var(--border)",
                  color:        "var(--muted)",
                  fontSize:     14,
                }}>
                  Thinking...
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {error && (
        <div style={{ fontSize: 12, color: "#e11d48", marginBottom: 8 }}>
          {error}
        </div>
      )}

      {/* ── Input ── */}
      <div style={{ display: "flex", gap: 8 }}>
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="I spent $20 on gas today..."
          rows={1}
          style={{
            flex:         1,
            resize:       "none",
            fontFamily:   "inherit",
            fontSize:     14,
            color:        "var(--text)",
            background:   "var(--card)",
            border:       "1px solid var(--border)",
            borderRadius: 10,
            padding:      "12px 14px",
            outline:      "none",
          }}
        />
        <button
          onClick={() => handleSend()}
          disabled={sending || !input.trim()}
          style={{
            fontSize:     14,
            fontWeight:   600,
            color:        "#fff",
            background:   sending || !input.trim() ? "var(--faint)" : "#0070f3",
            border:       "none",
            borderRadius: 10,
            padding:      "0 20px",
            cursor:       sending || !input.trim() ? "default" : "pointer",
          }}
        >
          Send
        </button>
      </div>
    </div>
  );
}
