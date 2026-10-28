import { Client } from 'appwrite';
import { databases } from './appwrite';
import { COLLECTIONS } from './collections';
import { upsertSnapshot, deleteSnapshot } from '@/offline/sync';
import { useEffect } from 'react';

const DATABASE_ID = 'riocred';

let realtime: Client | null = null;
let subscriptions: any[] = [];

// Entidades para monitorar
const WATCH_ENTITIES = [
  'customers',
  'loans',
  'loan_installments',
  'loan_payments',
  'payable_accounts',
  'routes',
  'profiles',
  'manager_route_access',
] as const;

export function setupRealtime(onChange?: (entityType: string, entityId: string) => void) {
  if (realtime) {
    // Já inicializado
    return;
  }

  realtime = new Client(databases.client);

  for (const entity of WATCH_ENTITIES) {
    const collectionId = getCollectionId(entity);
    if (!collectionId) continue;

    const channel = `databases.${DATABASE_ID}.collections.${collectionId}.documents`;
    const subscription = realtime.subscribe(channel, (response: any) => {
      const { payload, events } = response;

      for (const event of events) {
        handleRealtimeEvent(event, entity, onChange);
      }
    });

    subscriptions.push(subscription);
  }
}

async function handleRealtimeEvent(
  event: any,
  entityType: string,
  onChange?: (entityType: string, entityId: string) => void
) {
  const payload = event.payload || {};
  const docId = payload.$id;

  if (!docId) return;

  if (event.event === 'database.documents.create' || event.event === 'database.documents.update') {
    // Atualizar snapshot
    await upsertSnapshot(entityType, docId, payload);
  } else if (event.event === 'database.documents.delete') {
    // Remover do snapshot
    await deleteSnapshot(entityType, docId);
  }

  // Notificar mudança para invalidar React Query
  if (onChange) {
    onChange(entityType, docId);
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

export function cleanupRealtime() {
  for (const sub of subscriptions) {
    try {
      sub.unsubscribe();
    } catch (err) {
      console.warn('Failed to unsubscribe:', err);
    }
  }
  subscriptions = [];
  realtime = null;
}

// Hook React para usar Realtime
export function useRealtimeInvalidate(queryClient: any) {
  useEffect(() => {
    const handleChange = (entityType: string, entityId: string) => {
      // Invalidar queries relacionadas
      const queryKeyMap: Record<string, string[]> = {
        customers: ['customers'],
        loans: ['loans', 'installments'],
        loan_installments: ['installments'],
        loan_payments: ['payments'],
        payable_accounts: ['payables'],
        routes: ['routes'],
        profiles: ['profiles'],
        manager_route_access: ['manager-routes'],
      };

      const keys = queryKeyMap[entityType] || [];
      for (const key of keys) {
        queryClient.invalidateQueries({ queryKey: [key] });
      }
    };

    setupRealtime(handleChange);

    return () => {
      cleanupRealtime();
    };
  }, [queryClient]);
}
