// ==========================================================================
// IndexedDB persistence layer.
// Object stores:
//   settings   — single row, key "main"
//   logs       — one row per date "YYYY-MM-DD" (DailyLog)
//   photos     — autoincrement id, indexed by weekNumber (progress photos, blobs)
//   grocery    — one row per ISO week key "YYYY-Www" (checked item ids)
// Falls back to localStorage transparently if IndexedDB is unavailable.
// ==========================================================================

const DB_NAME = "transformationTrackerDB";
const DB_VERSION = 1;
let dbPromise = null;

function openDB() {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    if (!("indexedDB" in window)) {
      resolve(null); // signal fallback mode
      return;
    }
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains("settings")) db.createObjectStore("settings");
      if (!db.objectStoreNames.contains("logs")) db.createObjectStore("logs");
      if (!db.objectStoreNames.contains("photos")) {
        const store = db.createObjectStore("photos", { keyPath: "id", autoIncrement: true });
        store.createIndex("byWeek", "week");
      }
      if (!db.objectStoreNames.contains("grocery")) db.createObjectStore("grocery");
      if (!db.objectStoreNames.contains("meta")) db.createObjectStore("meta");
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => {
      console.warn("IndexedDB unavailable, falling back to localStorage", req.error);
      resolve(null);
    };
  });
  return dbPromise;
}

function lsKey(store, key) { return `ttdb:${store}:${key}`; }

async function idbTxn(store, mode) {
  const db = await openDB();
  if (!db) return null;
  return db.transaction(store, mode).objectStore(store);
}

export async function dbGet(store, key) {
  const os = await idbTxn(store, "readonly");
  if (!os) {
    const raw = localStorage.getItem(lsKey(store, key));
    return raw ? JSON.parse(raw) : undefined;
  }
  return new Promise((resolve, reject) => {
    const req = os.get(key);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function dbSet(store, key, value) {
  const os = await idbTxn(store, "readwrite");
  if (!os) {
    localStorage.setItem(lsKey(store, key), JSON.stringify(value));
    return;
  }
  return new Promise((resolve, reject) => {
    const req = os.put(value, key);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

export async function dbDelete(store, key) {
  const os = await idbTxn(store, "readwrite");
  if (!os) {
    localStorage.removeItem(lsKey(store, key));
    return;
  }
  return new Promise((resolve, reject) => {
    const req = os.delete(key);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

export async function dbGetAll(store) {
  const os = await idbTxn(store, "readonly");
  if (!os) {
    const out = [];
    const prefix = `ttdb:${store}:`;
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith(prefix)) out.push(JSON.parse(localStorage.getItem(k)));
    }
    return out;
  }
  return new Promise((resolve, reject) => {
    const req = os.getAll();
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function dbGetAllKeys(store) {
  const os = await idbTxn(store, "readonly");
  if (!os) {
    const out = [];
    const prefix = `ttdb:${store}:`;
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith(prefix)) out.push(k.slice(prefix.length));
    }
    return out;
  }
  return new Promise((resolve, reject) => {
    const req = os.getAllKeys();
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function dbAdd(store, value) {
  const os = await idbTxn(store, "readwrite");
  if (!os) {
    const id = Date.now() + Math.random();
    localStorage.setItem(lsKey(store, id), JSON.stringify({ ...value, id }));
    return id;
  }
  return new Promise((resolve, reject) => {
    const req = os.add(value);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function dbClearStore(store) {
  const os = await idbTxn(store, "readwrite");
  if (!os) {
    const prefix = `ttdb:${store}:`;
    const toRemove = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith(prefix)) toRemove.push(k);
    }
    toRemove.forEach((k) => localStorage.removeItem(k));
    return;
  }
  return new Promise((resolve, reject) => {
    const req = os.clear();
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

export async function clearAllData() {
  await Promise.all(["settings", "logs", "photos", "grocery", "meta"].map(dbClearStore));
}
