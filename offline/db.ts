import { Platform } from 'react-native';

// Na web, expo-sqlite não existe (sem módulo nativo). Stub no-op:
// o app web opera sempre online, então a camada offline vira no-op.
const webStubDb: any = {
  execAsync: async () => {},
  runAsync: async () => ({ changes: 0, lastInsertRowId: 0 }),
  getFirstAsync: async () => null,
  getAllAsync: async () => [],
  closeAsync: async () => {},
};

const IS_WEB = Platform.OS === 'web';
const SQLite: any = IS_WEB ? null : require('expo-sqlite');

const DB_NAME = 'riocred_offline.db';

let db: any = null;

export async function getDatabase(): Promise<any> {
  if (IS_WEB) return webStubDb;
  if (db) return db;

  db = await SQLite.openDatabaseAsync(DB_NAME);
  await initSchema(db);
  return db;
}

async function initSchema(database: any) {
  // Tabela de estado do usuário (última sync, erros, etc)
  await database.execAsync(`
    CREATE TABLE IF NOT EXISTS offline_user_state (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      last_sync TEXT,
      user_id TEXT,
      sync_errors INTEGER DEFAULT 0
    );
  `);

  // Garantir um único registro
  await database.execAsync(`
    INSERT OR IGNORE INTO offline_user_state (id, last_sync, user_id, sync_errors)
    VALUES (1, NULL, NULL, 0);
  `);

  // Tabela de registros pendentes de sincronização
  await database.execAsync(`
    CREATE TABLE IF NOT EXISTS offline_records (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      entity_type TEXT NOT NULL,
      operation TEXT NOT NULL,
      payload TEXT NOT NULL,
      client_request_id TEXT,
      status TEXT NOT NULL DEFAULT 'pending',
      error_message TEXT,
      created_at TEXT NOT NULL,
      synced_at TEXT,
      retry_count INTEGER DEFAULT 0
    );

    CREATE INDEX IF NOT EXISTS idx_offline_records_status
      ON offline_records(status);

    CREATE INDEX IF NOT EXISTS idx_offline_records_entity
      ON offline_records(entity_type);
  `);

  // Snapshot de dados para leitura offline
  await database.execAsync(`
    CREATE TABLE IF NOT EXISTS offline_snapshot (
      entity_type TEXT NOT NULL,
      entity_id TEXT NOT NULL,
      data TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      PRIMARY KEY (entity_type, entity_id)
    );

    CREATE INDEX IF NOT EXISTS idx_offline_snapshot_type
      ON offline_snapshot(entity_type);
  `);
}

export async function closeDatabase() {
  if (db) {
    await db.closeAsync();
    db = null;
  }
}
