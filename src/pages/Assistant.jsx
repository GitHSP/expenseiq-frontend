import { useState, useRef, useEffect } from "react";
import { useAssistant } from "../hooks/useAssistant";

const SUGGESTIONS = [
  "I spent $12 on lunch today",
  "Add my Visa, $2000 at 22%, minimum $60",
  "How much debt do I have left?",
  "Mark my rent payment as paid",
];

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
          }}
        >
          ✅ {a.message}
        </div>
      ))}
    </div>
  );
}

function MessageBubble({ message }) {
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
        whiteSpace:   "pre-wrap",
        wordBreak:    "break-word",
      }}>
        {message.content}
        {!isUser && <ActionChips actions={message.actions} />}
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
        🔗 Synced
      </button>
    );
  }

  if (!open) {
    return (
      <button onClick={() => setOpen(true)} style={syncBtnStyle}>
        🔒 Not synced
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
  fontSize: 12, fontWeight: 600, color: "var(--muted)",
  background: "var(--card)", border: "1px solid var(--border)",
  borderRadius: 8, padding: "8px 12px", cursor: "pointer",
};

const syncInputStyle = {
  fontSize: 13, color: "var(--text)", background: "var(--bg)",
  border: "1px solid var(--border)", borderRadius: 8, padding: "8px 10px",
};

export default function Assistant({ onActionsTaken }) {
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
      height:        "calc(100vh - 140px)",
      maxHeight:     760,
    }}>
      {/* ── Header ── */}
      <div style={{
        display:        "flex",
        alignItems:     "center",
        justifyContent: "space-between",
        marginBottom:   16,
      }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: "var(--text)" }}>
            Assistant
          </h2>
          <p style={{ margin: "4px 0 0", fontSize: 13, color: "var(--muted)" }}>
            Tell it what happened — it'll log expenses, update debts, and manage your checklist.
          </p>
        </div>
        <div style={{ display: "flex", alignItems: "flex-start", gap: 8 }}>
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
            <div style={{ color: "var(--muted)", fontSize: 14, marginBottom: 14, textAlign: "center" }}>
              👋 Hi! I'm your personal assistant. Try something like:
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
            {messages.map((m) => (
              <MessageBubble key={m.id} message={m} />
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
