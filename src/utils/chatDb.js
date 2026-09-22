// ─────────────────────────────────────────────
// chatDb.js — local-first storage for assistant chat history
// ─────────────────────────────────────────────
//
// This file only ever touches AES-GCM ciphertext (see crypto.js) plus the
// local copy of the Data Encryption Key that encrypts/decrypts it — never
// plaintext message content. If sync is enabled, the same opaque
// {iv, ciphertext} blobs stored here are exactly what gets pushed to the
// backend; see useAssistant.js for the encrypt/decrypt boundary.

const DB_NAME = "expenseiq_assistant";
const DB_VERSION = 2;
const MESSAGES_STORE = "messages";
const KEYS_STORE = "keys";

function openDb() {
  return new Promise((resolve, reject) => {
    if (!window.indexedDB) {
      reject(new Error("IndexedDB is not available in this browser."));
      return;
    }
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = (event) => {
      const db = req.result;
      if (event.oldVersion < 2 && db.objectStoreNames.contains(MESSAGES_STORE)) {
        // v1 stored plaintext messages; the encrypted schema below is
        // incompatible with it. The assistant only just shipped, so
        // there's no real chat history at stake in this reset.
        db.deleteObjectStore(MESSAGES_STORE);
      }
      if (!db.objectStoreNames.contains(MESSAGES_STORE)) {
        const store = db.createObjectStore(MESSAGES_STORE, { keyPath: "id", autoIncrement: true });
        store.createIndex("createdAt", "createdAt");
      }
      if (!db.objectStoreNames.contains(KEYS_STORE)) {
        db.createObjectStore(KEYS_STORE, { keyPath: "id" });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

// ── Encrypted messages ──
// record shape: { id, clientId, iv, ciphertext, createdAt }

export async function getAllMessages() {
  try {
    const db = await openDb();
    return await new Promise((resolve, reject) => {
      const tx = db.transaction(MESSAGES_STORE, "readonly");
      const req = tx.objectStore(MESSAGES_STORE).index("createdAt").getAll();
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.error("Failed to read chat history:", err);
    return [];
  }
}

export async function addMessageRecord(record) {
  try {
    const db = await openDb();
    return await new Promise((resolve, reject) => {
      const tx = db.transaction(MESSAGES_STORE, "readwrite");
      const req = tx.objectStore(MESSAGES_STORE).add(record);
      req.onsuccess = () => resolve({ ...record, id: req.result });
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.error("Failed to save chat message:", err);
    return { ...record, id: `mem-${Date.now()}-${Math.random().toString(36).slice(2)}` };
  }
}

// Upserts records pulled from the sync API, matching by clientId so a
// message that already exists locally is updated in place, not duplicated.
export async function putMessageRecords(records) {
  if (!records || records.length === 0) return;
  try {
    const db = await openDb();
    const existing = await getAllMessages();
    const byClientId = new Map(existing.map(m => [m.clientId, m]));
    await new Promise((resolve, reject) => {
      const tx = db.transaction(MESSAGES_STORE, "readwrite");
      const store = tx.objectStore(MESSAGES_STORE);
      for (const record of records) {
        const existingRecord = byClientId.get(record.clientId);
        if (existingRecord) {
          store.put({ ...record, id: existingRecord.id });
        } else {
          store.add(record);
        }
      }
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch (err) {
    console.error("Failed to store synced messages:", err);
  }
}

export async function clearMessages() {
  try {
    const db = await openDb();
    await new Promise((resolve, reject) => {
      const tx = db.transaction(MESSAGES_STORE, "readwrite");
      tx.objectStore(MESSAGES_STORE).clear();
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch (err) {
    console.error("Failed to clear chat history:", err);
  }
}

// ── Local key storage ──
// Keeps this device's exported DEK (base64) so it survives page reloads
// without needing to re-derive or re-enter anything.

export async function getStoredDek() {
  try {
    const db = await openDb();
    return await new Promise((resolve, reject) => {
      const tx = db.transaction(KEYS_STORE, "readonly");
      const req = tx.objectStore(KEYS_STORE).get("dek");
      req.onsuccess = () => resolve(req.result ? req.result.value : null);
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.error("Failed to read local encryption key:", err);
    return null;
  }
}

export async function setStoredDek(b64Key) {
  try {
    const db = await openDb();
    await new Promise((resolve, reject) => {
      const tx = db.transaction(KEYS_STORE, "readwrite");
      tx.objectStore(KEYS_STORE).put({ id: "dek", value: b64Key });
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch (err) {
    console.error("Failed to save local encryption key:", err);
  }
}
