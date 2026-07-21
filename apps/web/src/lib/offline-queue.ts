import type { CompletePracticePayload } from "@murojaah/shared";

const DB_NAME = "murojaah-offline";
const STORE = "pending-sessions";

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => {
      request.result.createObjectStore(STORE, { keyPath: "clientId" });
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function withStore<T>(mode: IDBTransactionMode, fn: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, mode);
    const request = fn(tx.objectStore(STORE));
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
    tx.oncomplete = () => db.close();
  });
}

export type PendingSession = Required<CompletePracticePayload>;

export const addPendingSession = (session: PendingSession) => withStore("readwrite", store => store.put(session));
export const listPendingSessions = () => withStore<PendingSession[]>("readonly", store => store.getAll());
export const removePendingSession = (clientId: string) => withStore("readwrite", store => store.delete(clientId));
