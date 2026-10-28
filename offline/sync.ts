import * as SQLite from 'expo-sqlite';
import { getDatabase } from './db';

export type SyncStatus = 'pending' | 'synced' | 'error';

export interface OfflineRecord {
  id: number;
  entityType: string;
  operation: 'create' | 'update' | 'delete';
  payload: string; // JSON string
  clientRequestId?: string;
  status: SyncStatus;
  errorMessage?: string;
  createdAt: string;
  syncedAt?: string;
  retryCount: number;
}

export interface UserState {
  lastSync: string | null;
  userId: string | null;
  syncErrors: number;
}

// === User State ===

export async function getUserState(): Promise<UserState> {
  const db = await getDatabase();
  const result = await db.getFirstAsync<any>(
    'SELECT * FROM offline_user_state WHERE id = 1'
  );
  return {
    lastSync: result?.last_sync || null,
    userId: result?.user_id || null,
    syncErrors: result?.sync_errors || 0,
  };
}

export async function updateUserState(updates: Partial<UserState>): Promise<void> {
  const db = await getDatabase();
  const updatesArr: string[] = [];
  const values: any[] = [];

  if (updates.lastSync !== undefined) {
    updatesArr.push('last_sync = ?');
    values.push(updates.lastSync);
  }
  if (updates.userId !== undefined) {
    updatesArr.push('user_id = ?');
    values.push(updates.userId);
  }
  if (updates.syncErrors !== undefined) {
    updatesArr.push('sync_errors = ?');
    values.push(updates.syncErrors);
  }

  if (updatesArr.length === 0) return;

  const sql = `UPDATE offline_user_state SET ${updatesArr.join(', ')} WHERE id = 1`;
  await db.runAsync(sql, ...values);
}

// === Offline Records (Sync Queue) ===

export async function addToSyncQueue(
  entityType: string,
  operation: 'create' | 'update' | 'delete',
  payload: any,
  clientRequestId?: string
): Promise<void> {
  const db = await getDatabase();
  await db.runAsync(
    `INSERT INTO offline_records (entity_type, operation, payload, client_request_id, status, created_at)
     VALUES (?, ?, ?, ?, 'pending', ?)`,
    entityType,
    operation,
    JSON.stringify(payload),
    clientRequestId || null,
    new Date().toISOString()
  );
}

export async function getPendingRecords(): Promise<OfflineRecord[]> {
  const db = await getDatabase();
  const rows = await db.getAllAsync<any>(
    `SELECT * FROM offline_records WHERE status = 'pending' ORDER BY created_at ASC`
  );
  return rows.map(row => ({
    id: row.id,
    entityType: row.entity_type,
    operation: row.operation,
    payload: row.payload,
    clientRequestId: row.client_request_id,
    status: row.status,
    errorMessage: row.error_message,
    createdAt: row.created_at,
    syncedAt: row.synced_at,
    retryCount: row.retry_count,
  }));
}

export async function markRecordSynced(recordId: number, serverId?: string): Promise<void> {
  const db = await getDatabase();
  await db.runAsync(
    `UPDATE offline_records SET status = 'synced', synced_at = ?, payload = ?
     WHERE id = ?`,
    new Date().toISOString(),
    serverId ? JSON.stringify({ ...JSON.parse((await db.getFirstAsync('SELECT payload FROM offline_records WHERE id = ?', recordId))?.payload || '{}'), serverId }) : null,
    recordId
  );
}

export async function markRecordError(recordId: number, errorMessage: string): Promise<void> {
  const db = await getDatabase();
  await db.runAsync(
    `UPDATE offline_records SET status = 'error', error_message = ?, retry_count = retry_count + 1
     WHERE id = ?`,
    errorMessage,
    recordId
  );
}

export async function deleteRecord(recordId: number): Promise<void> {
  const db = await getDatabase();
  await db.runAsync('DELETE FROM offline_records WHERE id = ?', recordId);
}

export async function clearSyncedRecords(): Promise<void> {
  const db = await getDatabase();
  await db.runAsync("DELETE FROM offline_records WHERE status = 'synced'");
}

export async function getSyncQueueSummary(): Promise<{ pending: number; error: number; synced: number }> {
  const db = await getDatabase();
  const pending = await db.getFirstAsync<any>("SELECT COUNT(*) as count FROM offline_records WHERE status = 'pending'");
  const error = await db.getFirstAsync<any>("SELECT COUNT(*) as count FROM offline_records WHERE status = 'error'");
  const synced = await db.getFirstAsync<any>("SELECT COUNT(*) as count FROM offline_records WHERE status = 'synced'");
  return {
    pending: pending?.count || 0,
    error: error?.count || 0,
    synced: synced?.count || 0,
  };
}

// === Snapshot (Offline Data) ===

export async function upsertSnapshot(entityType: string, entityId: string, data: any): Promise<void> {
  const db = await getDatabase();
  await db.runAsync(
    `INSERT INTO offline_snapshot (entity_type, entity_id, data, updated_at)
     VALUES (?, ?, ?, ?)
     ON CONFLICT(entity_type, entity_id) DO UPDATE SET
       data = excluded.data,
       updated_at = excluded.updated_at`,
    entityType,
    entityId,
    JSON.stringify(data),
    new Date().toISOString()
  );
}

export async function getSnapshot(entityType: string, entityId: string): Promise<any | null> {
  const db = await getDatabase();
  const result = await db.getFirstAsync<any>(
    'SELECT data FROM offline_snapshot WHERE entity_type = ? AND entity_id = ?',
    entityType,
    entityId
  );
  return result ? JSON.parse(result.data) : null;
}

export async function getSnapshotByType(entityType: string): Promise<any[]> {
  const db = await getDatabase();
  const rows = await db.getAllAsync<any>(
    'SELECT entity_id, data FROM offline_snapshot WHERE entity_type = ? ORDER BY updated_at DESC',
    entityType
  );
  return rows.map(row => ({
    $id: row.entity_id,
    ...JSON.parse(row.data),
  }));
}

export async function deleteSnapshot(entityType: string, entityId: string): Promise<void> {
  const db = await getDatabase();
  await db.runAsync(
    'DELETE FROM offline_snapshot WHERE entity_type = ? AND entity_id = ?',
    entityType,
    entityId
  );
}

export async function clearSnapshot(): Promise<void> {
  const db = await getDatabase();
  await db.runAsync('DELETE FROM offline_snapshot');
}

// === Utils ===

function generateUUID(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  // Fallback simples
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export function generateLocalId(entityType: string): string {
  return `local:${entityType}:${generateUUID()}`;
}

export function isLocalId(id: string): boolean {
  return id.startsWith('local:');
}
