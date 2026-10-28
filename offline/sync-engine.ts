import { Client, Databases, Query } from 'appwrite';
import { getDatabase } from './db';
import {
  addToSyncQueue,
  clearSyncedRecords,
  deleteRecord,
  getPendingRecords,
  getUserState,
  markRecordError,
  markRecordSynced,
  upsertSnapshot,
  updateUserState,
  getSnapshotByType,
  clearSnapshot,
  type OfflineRecord,
} from './sync';
import { databases } from '@/lib/appwrite';
import { COLLECTIONS } from '@/lib/collections';

const DATABASE_ID = 'riocred';

// Entidades que sincronizam
const SYNC_ENTITIES = [
  'customers',
  'loans',
  'loan_installments',
  'loan_payments',
  'payable_accounts',
  'routes',
  'profiles',
  'manager_route_access',
] as const;

export interface SyncResult {
  pushed: number;
  pulled: number;
  errors: number;
  duration: number;
}

export async function runFullSync(): Promise<SyncResult> {
  const startTime = Date.now();
  let pushed = 0;
  let pulled = 0;
  let errors = 0;

  try {
    // 1. Push fila pendente
    const pending = await getPendingRecords();
    for (const record of pending) {
      try {
        await pushRecord(record);
        await markRecordSynced(record.id);
        pushed++;
      } catch (err) {
        await markRecordError(record.id, err instanceof Error ? err.message : String(err));
        errors++;
      }
    }

    // 2. Limpar registros synced antigos
    await clearSyncedRecords();

    // 3. Pull delta desde última sync
    const state = await getUserState();
    const lastSync = state.lastSync;
    await pullDelta(lastSync);

    // 4. Atualizar timestamp de sync
    await updateUserState({ lastSync: new Date().toISOString() });

    // 5. Resetar contador de erros se sync sucesso
    if (errors === 0) {
      await updateUserState({ syncErrors: 0 });
    } else {
      const currentErrors = (await getUserState()).syncErrors;
      await updateUserState({ syncErrors: currentErrors + 1 });
    }
  } catch (err) {
    console.error('Sync error:', err);
    throw err;
  }

  return {
    pushed,
    pulled,
    errors,
    duration: Date.now() - startTime,
  };
}

async function pushRecord(record: OfflineRecord): Promise<void> {
  const payload = JSON.parse(record.payload);
  const entityType = record.entityType;

  switch (entityType) {
    case 'customers':
      await pushCustomer(record, payload);
      break;
    case 'loans':
      await pushLoan(record, payload);
      break;
    case 'loan_payments':
      await pushPayment(record, payload);
      break;
    case 'payable_accounts':
      await pushPayable(record, payload);
      break;
    default:
      console.warn(`Unknown entity type for sync: ${entityType}`);
  }
}

async function pushCustomer(record: OfflineRecord, payload: any): Promise<void> {
  const { clientRequestId, ...data } = payload;

  if (record.operation === 'create') {
    const doc = await databases.createDocument(
      DATABASE_ID,
      COLLECTIONS.customers,
      clientRequestId || 'unique()',
      data
    );
    // Atualizar snapshot com ID real do servidor
    await upsertSnapshot('customers', doc.$id, doc);
  } else if (record.operation === 'update') {
    await databases.updateDocument(
      DATABASE_ID,
      COLLECTIONS.customers,
      payload.$id,
      data
    );
  } else if (record.operation === 'delete') {
    await databases.deleteDocument(
      DATABASE_ID,
      COLLECTIONS.customers,
      payload.$id
    );
  }
}

async function pushLoan(record: OfflineRecord, payload: any): Promise<void> {
  const { clientRequestId, ...data } = payload;

  if (record.operation === 'create') {
    const doc = await databases.createDocument(
      DATABASE_ID,
      COLLECTIONS.loans,
      clientRequestId || 'unique()',
      data
    );
    await upsertSnapshot('loans', doc.$id, doc);
  } else if (record.operation === 'update') {
    await databases.updateDocument(
      DATABASE_ID,
      COLLECTIONS.loans,
      payload.$id,
      data
    );
  } else if (record.operation === 'delete') {
    await databases.deleteDocument(
      DATABASE_ID,
      COLLECTIONS.loans,
      payload.$id
    );
  }
}

async function pushPayment(record: OfflineRecord, payload: any): Promise<void> {
  if (record.operation === 'create') {
    await databases.createDocument(
      DATABASE_ID,
      COLLECTIONS.loanPayments,
      'unique()',
      payload
    );
  } else if (record.operation === 'update') {
    await databases.updateDocument(
      DATABASE_ID,
      COLLECTIONS.loanPayments,
      payload.$id,
      payload
    );
  }
}

async function pushPayable(record: OfflineRecord, payload: any): Promise<void> {
  if (record.operation === 'create') {
    await databases.createDocument(
      DATABASE_ID,
      COLLECTIONS.payableAccounts,
      'unique()',
      payload
    );
  } else if (record.operation === 'update') {
    await databases.updateDocument(
      DATABASE_ID,
      COLLECTIONS.payableAccounts,
      payload.$id,
      payload
    );
  } else if (record.operation === 'delete') {
    await databases.deleteDocument(
      DATABASE_ID,
      COLLECTIONS.payableAccounts,
      payload.$id
    );
  }
}

async function pullDelta(lastSync: string | null): Promise<void> {
  // Para cada entidade, buscar dados e atualizar snapshot
  for (const entity of SYNC_ENTITIES) {
    const collectionId = getCollectionId(entity);
    if (!collectionId) continue;

    // Buscar todos os dados (idealmente seria delta, mas Appwrite não tem cursor de delta fácil)
    // Em produção, usaríamos $updatedAt > lastSync
    const query = lastSync
      ? [Query.greaterThan('$updatedAt', lastSync)]
      : [];

    const docs = await databases.listDocuments(DATABASE_ID, collectionId, query);

    for (const doc of docs.documents) {
      await upsertSnapshot(entity, doc.$id, doc);
    }
  }
}

function getCollectionId(entity: string): string | null {
  const map: Record<string, string> = {
    customers: COLLECTIONS.customers,
    loans: COLLECTIONS.loans,
    loan_installments: COLLECTIONS.loanInstallments,
    loan_payments: COLLECTIONS.loanPayments,
    payable_accounts: COLLECTIONS.payableAccounts,
    routes: COLLECTIONS.routes,
    profiles: COLLECTIONS.profiles,
    manager_route_access: COLLECTIONS.managerRouteAccess,
  };
  return map[entity] || null;
}

// Função para snapshot inicial (primeira sync)
export async function takeInitialSnapshot(userId: string): Promise<void> {
  await clearSnapshot();

  for (const entity of SYNC_ENTITIES) {
    const collectionId = getCollectionId(entity);
    if (!collectionId) continue;

    // Buscar todos os dados do usuário
    const docs = await databases.listDocuments(DATABASE_ID, collectionId);

    for (const doc of docs.documents) {
      await upsertSnapshot(entity, doc.$id, doc);
    }
  }

  await updateUserState({
    userId,
    lastSync: new Date().toISOString(),
  });
}

// Função para ler dados do snapshot (offline-first read)
export async function readFromSnapshot<T>(entityType: string): Promise<T[]> {
  return getSnapshotByType(entityType) as Promise<T[]>;
}
