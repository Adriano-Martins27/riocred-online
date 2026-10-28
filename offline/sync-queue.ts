// Este arquivo agora é um wrapper para compatibilidade com o novo sistema SQLite
// Recomenda-se usar os métodos de offline/sync.ts diretamente

import { getPendingRecords, getUserState, updateUserState, runFullSync } from './sync';
import type { OfflineRecord } from './sync';

export type SyncQueueItem = {
  id: string;
  entityType: string;
  label: string;
  createdAt: string;
  status: "pending" | "error";
  error?: string;
};

export async function getSyncQueue(): Promise<SyncQueueItem[]> {
  const records = await getPendingRecords();
  return records.map(r => ({
    id: String(r.id),
    entityType: r.entityType,
    label: `${r.operation} ${r.entityType}`,
    createdAt: r.createdAt,
    status: r.status === 'synced' ? 'pending' : r.status,
    error: r.errorMessage,
  }));
}

export async function addToSyncQueue(
  item: Omit<SyncQueueItem, "id" | "createdAt" | "status">,
): Promise<void> {
  const { addToSyncQueue: add } = await import('./sync');
  await add(item.entityType, 'create', { label: item.label });
}

export async function clearSyncQueue(): Promise<void> {
  const { clearSyncedRecords } = await import('./sync');
  await clearSyncedRecords();
}

export async function getLastSync(): Promise<string | null> {
  const state = await getUserState();
  return state.lastSync;
}

export async function setLastSync(iso: string): Promise<void> {
  await updateUserState({ lastSync: iso });
}

export async function runSyncNow(): Promise<number> {
  const result = await runFullSync();
  return result.pushed + result.pulled;
}
