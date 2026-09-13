/** Offline scan queue backed by IndexedDB.
 *
 * When a scan cannot reach the server (offline), the photo is stored locally
 * and synced automatically when connectivity returns.
 */

const DB_NAME = "ricepest-offline";
const STORE = "pending-scans";
const META = "offline-model"; // key-value store for the cached TF.js model manifest

function openDb() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE, { keyPath: "id" });
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function withStore(mode, fn) {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, mode);
    const store = tx.objectStore(STORE);
    const result = fn(store);
    tx.oncomplete = () => resolve(result?.result ?? result);
    tx.onerror = () => reject(tx.error);
  });
}

export async function enqueueScan(blob, meta = {}) {
  const record = {
    id: crypto.randomUUID(),
    blob,
    meta,
    queuedAt: new Date().toISOString(),
  };
  await withStore("readwrite", (store) => store.add(record));
  return record;
}

export async function listPendingScans() {
  return (await withStore("readonly", (store) => store.getAll())) ?? [];
}

export async function removePendingScan(id) {
  await withStore("readwrite", (store) => store.delete(id));
}

/** Try to flush the offline queue; returns the number of synced scans. */
export async function syncPendingScans(predictFn) {
  const pending = await listPendingScans();
  let synced = 0;
  for (const record of pending) {
    try {
      await predictFn(record.blob, record.meta);
      await removePendingScan(record.id);
      synced += 1;
    } catch {
      break; // still offline or server error - keep the rest queued
    }
  }
  return synced;
}
