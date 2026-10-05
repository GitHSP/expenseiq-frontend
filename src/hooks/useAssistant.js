import { useState, useEffect, useCallback, useRef } from "react";
import { assistantAPI } from "../utils/api";
import {
  getAllMessages, addMessageRecord, putMessageRecords, clearMessages,
  getStoredDek, setStoredDek,
} from "../utils/chatDb";
import {
  generateDek, exportDek, importDek, encryptText, decryptText,
  deriveKek, wrapDek, unwrapDek, randomClientId,
} from "../utils/crypto";

const SYNC_FLAG_KEY   = "expenseiq_assistant_sync_enabled";
const LAST_SYNCED_KEY = "expenseiq_assistant_last_synced_at";

async function decryptRecord(dek, record) {
  try {
    const json = await decryptText(dek, record.iv, record.ciphertext);
    const parsed = JSON.parse(json);
    return { id: record.id, clientId: record.clientId, createdAt: record.createdAt, ...parsed };
  } catch (err) {
    console.error("Failed to decrypt a stored message:", err);
    return {
      id: record.id, clientId: record.clientId, createdAt: record.createdAt,
      role: "assistant", content: "Couldn't decrypt this message on this device.", isError: true,
    };
  }
}

export function useAssistant() {
  const [messages, setMessages]       = useState([]);
  const [loaded,   setLoaded]         = useState(false);
  const [sending,  setSending]        = useState(false);
  const [error,    setError]          = useState(null);
  const [syncEnabled, setSyncEnabled] = useState(() => localStorage.getItem(SYNC_FLAG_KEY) === "true");
  const [syncBusy,  setSyncBusy]      = useState(false);
  const [syncError, setSyncError]     = useState(null);

  const dekRef = useRef(null);
  const syncEnabledRef = useRef(syncEnabled);
  useEffect(() => { syncEnabledRef.current = syncEnabled; }, [syncEnabled]);

  const loadFromLocal = useCallback(async (dek) => {
    const records = await getAllMessages();
    const decrypted = await Promise.all(records.map(r => decryptRecord(dek, r)));
    setMessages(decrypted);
    return decrypted;
  }, []);

  // ── Init: load or generate this device's local DEK, then load history ──
  useEffect(() => {
    (async () => {
      let dekB64 = await getStoredDek();
      let dek;
      if (dekB64) {
        dek = await importDek(dekB64);
      } else {
        dek = await generateDek();
        dekB64 = await exportDek(dek);
        await setStoredDek(dekB64);
      }
      dekRef.current = dek;
      await loadFromLocal(dek);
      setLoaded(true);
    })();
  }, [loadFromLocal]);

  // ── If sync is already on, pull anything new since last time ──
  useEffect(() => {
    if (!loaded || !syncEnabled || !dekRef.current) return;
    (async () => {
      try {
        const since = localStorage.getItem(LAST_SYNCED_KEY);
        const remote = await assistantAPI.pullMessages(since);
        if (remote && remote.length) {
          const records = remote.map(m => ({
            clientId: m.client_id, iv: m.iv, ciphertext: m.ciphertext,
            createdAt: new Date(m.created_at).getTime(),
          }));
          await putMessageRecords(records);
          localStorage.setItem(LAST_SYNCED_KEY, new Date().toISOString());
          await loadFromLocal(dekRef.current);
        }
      } catch (err) {
        console.error("Sync pull failed:", err);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loaded, syncEnabled]);

  const pushToSync = useCallback(async (records) => {
    if (!syncEnabledRef.current || !records || records.length === 0) return;
    try {
      await assistantAPI.pushMessages(records.map(r => ({
        client_id: r.clientId, ciphertext: r.ciphertext, iv: r.iv,
      })));
      localStorage.setItem(LAST_SYNCED_KEY, new Date().toISOString());
    } catch (err) {
      console.error("Sync push failed:", err);
    }
  }, []);

  // payload: { role, content, actions?, isError? }
  const saveMessage = useCallback(async (payload) => {
    const dek = dekRef.current;
    const { iv, ciphertext } = await encryptText(dek, JSON.stringify(payload));
    const record = await addMessageRecord({
      clientId: randomClientId(), iv, ciphertext, createdAt: Date.now(),
    });
    setMessages(prev => [...prev, { ...payload, id: record.id, clientId: record.clientId, createdAt: record.createdAt }]);
    pushToSync([record]);
    return record;
  }, [pushToSync]);

  const sendMessage = useCallback(async (text) => {
    const trimmed = (text || "").trim();
    if (!trimmed || sending || !dekRef.current) return null;

    setError(null);
    await saveMessage({ role: "user", content: trimmed });
    setSending(true);

    try {
      const historyRecords = await getAllMessages();
      const decrypted = await Promise.all(historyRecords.map(r => decryptRecord(dekRef.current, r)));
      const history = decrypted.map(m => ({ role: m.role, content: m.content }));
      const data = await assistantAPI.chat(history);

      await saveMessage({ role: "assistant", content: data.reply || "Done.", actions: data.actions || [] });
      return data;
    } catch (err) {
      const message = err.message || "Something went wrong talking to the assistant.";
      setError(message);
      await saveMessage({ role: "assistant", content: message, isError: true });
      return null;
    } finally {
      setSending(false);
    }
  }, [sending, saveMessage]);

  const resetConversation = useCallback(async () => {
    await clearMessages();
    setMessages([]);
    setError(null);
    if (syncEnabledRef.current) {
      try { await assistantAPI.clearSyncedMessages(); } catch (err) { console.error(err); }
      localStorage.removeItem(LAST_SYNCED_KEY);
    }
  }, []);

  // Creates a new sync passphrase (first device) or joins an existing one
  // (any later device) — the server tells us which case we're in.
  const enableSync = useCallback(async (passphrase) => {
    setSyncBusy(true);
    setSyncError(null);
    try {
      const existing = await assistantAPI.getEncryptionKey();

      if (existing) {
        const { kek } = await deriveKek(passphrase, existing.salt);
        let unwrapped;
        try {
          unwrapped = await unwrapDek(existing.wrapped_dek, existing.wrap_iv, kek);
        } catch {
          throw new Error("That passphrase doesn't match your existing sync passphrase.");
        }

        // This device's own local-only history (if any) was encrypted
        // with a different key and can't be merged with the synced key —
        // clear it before switching, then pull the real synced history.
        await clearMessages();

        const dekB64 = await exportDek(unwrapped);
        await setStoredDek(dekB64);
        dekRef.current = unwrapped;

        const remote = await assistantAPI.pullMessages(null);
        const records = (remote || []).map(m => ({
          clientId: m.client_id, iv: m.iv, ciphertext: m.ciphertext,
          createdAt: new Date(m.created_at).getTime(),
        }));
        await putMessageRecords(records);
        localStorage.setItem(LAST_SYNCED_KEY, new Date().toISOString());
        await loadFromLocal(unwrapped);
      } else {
        const { kek, saltB64 } = await deriveKek(passphrase);
        const { wrappedDek, wrapIv } = await wrapDek(dekRef.current, kek);
        await assistantAPI.setEncryptionKey({
          wrapped_dek: wrappedDek, wrap_iv: wrapIv, salt: saltB64, kdf_iterations: 210000,
        });

        const localRecords = await getAllMessages();
        if (localRecords.length > 0) {
          await assistantAPI.pushMessages(localRecords.map(r => ({
            client_id: r.clientId, ciphertext: r.ciphertext, iv: r.iv,
          })));
        }
        localStorage.setItem(LAST_SYNCED_KEY, new Date().toISOString());
      }

      localStorage.setItem(SYNC_FLAG_KEY, "true");
      setSyncEnabled(true);
    } catch (err) {
      setSyncError(err.message || "Couldn't enable sync.");
      throw err;
    } finally {
      setSyncBusy(false);
    }
  }, [loadFromLocal]);

  // Stops this device from syncing. Doesn't delete history already on the
  // server — use resetConversation (or another synced device) for that.
  const disableSync = useCallback(() => {
    localStorage.removeItem(SYNC_FLAG_KEY);
    localStorage.removeItem(LAST_SYNCED_KEY);
    setSyncEnabled(false);
  }, []);

  return {
    messages, loaded, sending, error,
    sendMessage, resetConversation,
    syncEnabled, syncBusy, syncError, enableSync, disableSync,
  };
}
