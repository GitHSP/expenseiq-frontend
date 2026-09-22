// ─────────────────────────────────────────────
// crypto.js — client-side encryption for assistant chat history
// ─────────────────────────────────────────────
//
// Everything here runs in the browser via the Web Crypto API. Plaintext
// and unwrapped keys never leave this file's callers — nothing is ever
// sent to the backend except opaque ciphertext (and, only if the user
// opts into sync, the Data Encryption Key wrapped by a passphrase-derived
// key that the server never sees).

const textEncoder = new TextEncoder();
const textDecoder = new TextDecoder();

function toB64(bytes) {
  const arr = bytes instanceof ArrayBuffer ? new Uint8Array(bytes) : bytes;
  let binary = "";
  for (let i = 0; i < arr.byteLength; i++) binary += String.fromCharCode(arr[i]);
  return btoa(binary);
}

function fromB64(b64) {
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

// ── Data Encryption Key (DEK) — one per user, encrypts all message content ──

export async function generateDek() {
  return crypto.subtle.generateKey({ name: "AES-GCM", length: 256 }, true, ["encrypt", "decrypt"]);
}

export async function exportDek(dek) {
  const raw = await crypto.subtle.exportKey("raw", dek);
  return toB64(raw);
}

export async function importDek(b64) {
  return crypto.subtle.importKey("raw", fromB64(b64), { name: "AES-GCM" }, true, ["encrypt", "decrypt"]);
}

// ── Encrypting / decrypting message content with the DEK ──

export async function encryptText(dek, plaintext) {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ciphertext = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, dek, textEncoder.encode(plaintext));
  return { iv: toB64(iv), ciphertext: toB64(ciphertext) };
}

export async function decryptText(dek, ivB64, ciphertextB64) {
  const iv = fromB64(ivB64);
  const plainBuf = await crypto.subtle.decrypt({ name: "AES-GCM", iv }, dek, fromB64(ciphertextB64));
  return textDecoder.decode(plainBuf);
}

// ── Passphrase-derived Key Encryption Key (KEK) — wraps the DEK for sync ──
// This passphrase is a separate secret from the account login password and
// is never transmitted anywhere; only its derived key (and only in memory)
// is used to wrap/unwrap the DEK.

export async function deriveKek(passphrase, saltB64) {
  const salt = saltB64 ? fromB64(saltB64) : crypto.getRandomValues(new Uint8Array(16));
  const baseKey = await crypto.subtle.importKey(
    "raw", textEncoder.encode(passphrase), "PBKDF2", false, ["deriveKey"]
  );
  const kek = await crypto.subtle.deriveKey(
    { name: "PBKDF2", salt, iterations: 210000, hash: "SHA-256" },
    baseKey,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"]
  );
  return { kek, saltB64: toB64(salt) };
}

export async function wrapDek(dek, kek) {
  const rawDek = await crypto.subtle.exportKey("raw", dek);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const wrapped = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, kek, rawDek);
  return { wrappedDek: toB64(wrapped), wrapIv: toB64(iv) };
}

// Throws if the passphrase/salt don't match the wrapped key (AES-GCM's
// built-in auth tag check) — callers should treat any throw here as
// "wrong passphrase".
export async function unwrapDek(wrappedDekB64, wrapIvB64, kek) {
  const iv = fromB64(wrapIvB64);
  const rawDek = await crypto.subtle.decrypt({ name: "AES-GCM", iv }, kek, fromB64(wrappedDekB64));
  return crypto.subtle.importKey("raw", rawDek, { name: "AES-GCM" }, true, ["encrypt", "decrypt"]);
}

export function randomClientId() {
  if (crypto.randomUUID) return crypto.randomUUID();
  return toB64(crypto.getRandomValues(new Uint8Array(16))).replace(/[^a-zA-Z0-9]/g, "");
}
