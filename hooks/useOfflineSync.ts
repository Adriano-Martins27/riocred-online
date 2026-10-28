import { useCallback, useEffect, useState } from 'react';
import { useOnlineStatus } from './useOnlineStatus';
import { runFullSync, takeInitialSnapshot, readFromSnapshot, type SyncResult } from '@/offline/sync-engine';
import { getSyncQueueSummary, getUserState } from '@/offline/sync';
import { useAuth } from '@/contexts/AuthContext';

export function useOfflineSync() {
  const online = useOnlineStatus();
  const { user } = useAuth();
  const [syncing, setSyncing] = useState(false);
  const [lastSync, setLastSync] = useState<string | null>(null);
  const [queueSummary, setQueueSummary] = useState({ pending: 0, error: 0, synced: 0 });

  // Carregar estado inicial
  useEffect(() => {
    loadState();
  }, []);

  const loadState = async () => {
    const state = await getUserState();
    setLastSync(state.lastSync);
    const summary = await getSyncQueueSummary();
    setQueueSummary(summary);
  };

  // Sync automático quando voltar online
  useEffect(() => {
    if (online && !syncing) {
      sync();
    }
  }, [online]);

  // Snapshot inicial quando usuário loga
  useEffect(() => {
    if (user && !lastSync) {
      initialSnapshot();
    }
  }, [user, lastSync]);

  const sync = useCallback(async () => {
    if (!online) return;
    setSyncing(true);
    try {
      const result = await runFullSync();
      setLastSync(new Date().toISOString());
      await loadState();
      return result;
    } catch (err) {
      console.error('Sync failed:', err);
      throw err;
    } finally {
      setSyncing(false);
    }
  }, [online]);

  const initialSnapshot = useCallback(async () => {
    if (!user) return;
    try {
      await takeInitialSnapshot(user.$id);
      setLastSync(new Date().toISOString());
    } catch (err) {
      console.error('Initial snapshot failed:', err);
    }
  }, [user]);

  return {
    syncing,
    lastSync,
    queueSummary,
    sync,
    initialSnapshot,
    online,
  };
}

// Hook para ler dados offline-first
export function useOfflineData<T>(entityType: string) {
  const [data, setData] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, [entityType]);

  const loadData = async () => {
    try {
      setLoading(true);
      const snapshot = await readFromSnapshot<T>(entityType);
      setData(snapshot);
    } catch (err) {
      console.error(`Failed to load ${entityType} from snapshot:`, err);
    } finally {
      setLoading(false);
    }
  };

  return { data, loading, refresh: loadData };
}
