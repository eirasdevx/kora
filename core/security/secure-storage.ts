"use client";

type EncryptedPayload = {
  v: 1;
  iv: string;
  data: string;
};

const KEY_DB_NAME = "kora-secure";
const KEY_STORE_NAME = "keys";
const KEY_ID = "local-storage-master";
const FALLBACK_KEY = "kora-secure-key";

const encoder = new TextEncoder();
const decoder = new TextDecoder();

const requireCrypto = () => {
  const cryptoRef = globalThis.crypto;
  if (!cryptoRef?.subtle || !cryptoRef?.getRandomValues) {
    throw new Error("Secure crypto is not available.");
  }
  return cryptoRef;
};

const toBase64 = (value: ArrayBuffer | Uint8Array) => {
  const bytes = value instanceof Uint8Array ? value : new Uint8Array(value);
  let binary = "";
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });
  return btoa(binary);
};

const fromBase64 = (value: string) => {
  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return bytes;
};

const openKeyDb = () =>
  new Promise<IDBDatabase>((resolve, reject) => {
    if (typeof indexedDB === "undefined") {
      reject(new Error("IndexedDB is not available."));
      return;
    }
    const request = indexedDB.open(KEY_DB_NAME, 1);
    request.onupgradeneeded = () => {
      request.result.createObjectStore(KEY_STORE_NAME);
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });

const readKeyFromDb = async () => {
  const db = await openKeyDb();
  try {
    const key = await new Promise<CryptoKey | null>((resolve, reject) => {
      const tx = db.transaction(KEY_STORE_NAME, "readonly");
      const store = tx.objectStore(KEY_STORE_NAME);
      const request = store.get(KEY_ID);
      request.onsuccess = () => resolve((request.result as CryptoKey) ? null);
      request.onerror = () => reject(request.error);
    });
    return key;
  } finally {
    db.close();
  }
};

const writeKeyToDb = async (key: CryptoKey) => {
  const db = await openKeyDb();
  try {
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(KEY_STORE_NAME, "readwrite");
      const store = tx.objectStore(KEY_STORE_NAME);
      const request = store.put(key, KEY_ID);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  } finally {
    db.close();
  }
};

const createKey = async (extractable: boolean) => {
  const cryptoRef = requireCrypto();
  return cryptoRef.subtle.generateKey(
    { name: "AES-GCM", length: 256 },
    extractable,
    ["encrypt", "decrypt"]
  );
};

const readKeyFromLocalStorage = async () => {
  try {
    const raw = localStorage.getItem(FALLBACK_KEY);
    if (!raw) return null;
    const bytes = fromBase64(raw);
    const cryptoRef = requireCrypto();
    return cryptoRef.subtle.importKey(
      "raw",
      bytes,
      { name: "AES-GCM" },
      false,
      ["encrypt", "decrypt"]
    );
  } catch (error) {
    console.error(error);
    return null;
  }
};

const writeKeyToLocalStorage = async (key: CryptoKey) => {
  const cryptoRef = requireCrypto();
  const raw = await cryptoRef.subtle.exportKey("raw", key);
  localStorage.setItem(FALLBACK_KEY, toBase64(raw));
};

let cachedKey: CryptoKey | null = null;
let keyPromise: Promise<CryptoKey> | null = null;

const getMasterKey = async () => {
  if (cachedKey) return cachedKey;
  if (keyPromise) return keyPromise;
  keyPromise = (async () => {
    try {
      const storedKey = await readKeyFromDb();
      if (storedKey) {
        cachedKey = storedKey;
        return storedKey;
      }
      const created = await createKey(false);
      await writeKeyToDb(created);
      cachedKey = created;
      return created;
    } catch {
      const fallbackKey = await readKeyFromLocalStorage();
      if (fallbackKey) {
        cachedKey = fallbackKey;
        return fallbackKey;
      }
      const created = await createKey(true);
      await writeKeyToLocalStorage(created);
      cachedKey = created;
      return created;
    } finally {
      keyPromise = null;
    }
  })();
  return keyPromise;
};

const encryptString = async (value: string) => {
  const cryptoRef = requireCrypto();
  const key = await getMasterKey();
  const iv = cryptoRef.getRandomValues(new Uint8Array(12));
  const encrypted = await cryptoRef.subtle.encrypt(
    { name: "AES-GCM", iv },
    key,
    encoder.encode(value)
  );
  const payload: EncryptedPayload = {
    v: 1,
    iv: toBase64(iv),
    data: toBase64(encrypted),
  };
  return JSON.stringify(payload);
};

const decryptString = async (payload: string) => {
  let parsed: EncryptedPayload | null = null;
  try {
    parsed = JSON.parse(payload) as EncryptedPayload;
  } catch {
    return null;
  }
  if (!parsed || parsed.v !== 1 || !parsed.iv || !parsed.data) {
    return null;
  }
  const cryptoRef = requireCrypto();
  const key = await getMasterKey();
  const iv = fromBase64(parsed.iv);
  const data = fromBase64(parsed.data);
  const decrypted = await cryptoRef.subtle.decrypt(
    { name: "AES-GCM", iv },
    key,
    data
  );
  return decoder.decode(decrypted);
};

const tryParse = <T>(value: string): T | null => {
  try {
    return JSON.parse(value) as T;
  } catch {
    return null;
  }
};

export const setSecureItem = async (key: string, value: unknown) => {
  const encrypted = await encryptString(JSON.stringify(value));
  localStorage.setItem(key, encrypted);
};

export const getSecureItem = async <T>(key: string): Promise<T | null> => {
  const raw = localStorage.getItem(key);
  if (!raw) return null;
  try {
    const decrypted = await decryptString(raw);
    if (decrypted) {
      return tryParse<T>(decrypted);
    }
  } catch (error) {
    console.error(error);
  }
  const fallback = tryParse<T>(raw);
  if (fallback) {
    void setSecureItem(key, fallback);
    return fallback;
  }
  return null;
};

export const removeSecureItem = (key: string) => {
  localStorage.removeItem(key);
};
