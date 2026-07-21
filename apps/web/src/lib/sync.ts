import { completePractice } from "./api";
import { listPendingSessions, removePendingSession } from "./offline-queue";

let syncing = false;

export async function syncPendingSessions(notify?: (message: string) => void): Promise<void> {
  if (syncing || !navigator.onLine) return;
  syncing = true;
  try {
    const pending = await listPendingSessions();
    if (pending.length === 0) return;
    let synced = 0;
    for (const session of pending) {
      try {
        await completePractice(session);
        await removePendingSession(session.clientId);
        synced++;
      } catch {
        break; // still offline or server unavailable — stop and retry on the next online event
      }
    }
    if (synced > 0) notify?.(`${synced} sesi latihan offline berhasil disinkronkan.`);
  } finally {
    syncing = false;
  }
}
