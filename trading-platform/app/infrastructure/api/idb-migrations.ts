/**
 * IndexedDB Migration System
 * 
 * Manages schema versioning and migrations for client-side IndexedDB storage.
 * Follows the same principles as SQL migrations but adapted for IndexedDB.
 */

<<<<<<< HEAD
import { OHLCV } from '@/app/types';
import { devLog, devWarn, devError } from '@/app/lib/utils/logger';
=======

import { OHLCV } from '@/app/types';
import { devLog, devError } from '@/app/lib/utils/dev-logger';
>>>>>>> origin/main

const DB_NAME = 'TraderProDB';
const DB_VERSION = 2; // Increment when schema changes
const MIGRATIONS_STORE = '_migrations';

/**
 * Migration interface
 */
export interface Migration {
  version: number;
  name: string;
  up: (db: IDBDatabase, transaction: IDBTransaction) => void;
  down?: (db: IDBDatabase, transaction: IDBTransaction) => void;
}

/**
 * All migrations in order
 */
export const migrations: Migration[] = [
  {
    version: 1,
    name: 'initial_schema',
    up: (db: IDBDatabase) => {
      // Create OHLCV data store
      if (!db.objectStoreNames.contains('ohlcv_data')) {
        db.createObjectStore('ohlcv_data');
      }
    },
    down: (db: IDBDatabase) => {
      if (db.objectStoreNames.contains('ohlcv_data')) {
        db.deleteObjectStore('ohlcv_data');
      }
    },
  },
  {
    version: 2,
    name: 'add_metadata_store',
    up: (db: IDBDatabase) => {
      // Create migrations tracking store
      if (!db.objectStoreNames.contains(MIGRATIONS_STORE)) {
        const migrationStore = db.createObjectStore(MIGRATIONS_STORE, { keyPath: 'version' });
        migrationStore.createIndex('name', 'name', { unique: true });
        migrationStore.createIndex('appliedAt', 'appliedAt', { unique: false });
      }

      // Create cache metadata store
      if (!db.objectStoreNames.contains('cache_metadata')) {
        const cacheStore = db.createObjectStore('cache_metadata', { keyPath: 'key' });
        cacheStore.createIndex('symbol', 'symbol', { unique: false });
        cacheStore.createIndex('dataType', 'dataType', { unique: false });
        cacheStore.createIndex('expiresAt', 'expiresAt', { unique: false });
      }

      // Create user preferences store
      if (!db.objectStoreNames.contains('user_preferences')) {
        const prefStore = db.createObjectStore('user_preferences', { keyPath: 'key' });
        prefStore.createIndex('category', 'category', { unique: false });
      }
    },
    down: (db: IDBDatabase) => {
      if (db.objectStoreNames.contains('cache_metadata')) {
        db.deleteObjectStore('cache_metadata');
      }
      if (db.objectStoreNames.contains('user_preferences')) {
        db.deleteObjectStore('user_preferences');
      }
      // Don't delete migrations store in rollback to maintain history
    },
  },
];

/**
 * Enhanced IndexedDB Client with migration support
 */
export class IndexedDBClient {
  private db: IDBDatabase | null = null;
  private initPromise: Promise<void> | null = null;

  /**
   * Initialize database with migrations
   */
  async init(): Promise<void> {
    // If already initialized, return immediately
    if (this.db) return;

    // If initialization is in progress, return the existing promise
    if (this.initPromise) return this.initPromise;

    // Start new initialization
    let pendingMigrations: Array<{ version: number; name: string }> = [];

    this.initPromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => {
        this.initPromise = null;
        reject(request.error);
      };

      request.onsuccess = async () => {
        this.db = request.result;
        
        // Record migrations after database is successfully opened
        if (pendingMigrations.length > 0 && this.db.objectStoreNames.contains(MIGRATIONS_STORE)) {
          try {
            const transaction = this.db.transaction(MIGRATIONS_STORE, 'readwrite');
            const store = transaction.objectStore(MIGRATIONS_STORE);
            for (const migration of pendingMigrations) {
              store.put({
                version: migration.version,
                name: migration.name,
                appliedAt: new Date().toISOString(),
              });
            }
          } catch (error) {
            devError('[IndexedDB] Failed to record migrations:', error);
          }
        }
        pendingMigrations = [];
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        const transaction = (event.target as IDBOpenDBRequest).transaction!;
        const oldVersion = event.oldVersion;
        const newVersion = event.newVersion || DB_VERSION;

        devLog(`[IndexedDB] Upgrade: v${oldVersion} → v${newVersion}`);

        // Apply migrations sequentially
        for (const migration of migrations) {
          if (migration.version > oldVersion && migration.version <= newVersion) {
            devLog(`[IndexedDB] Applying migration: ${migration.name} (v${migration.version})`);
            try {
              migration.up(db, transaction);
              pendingMigrations.push({ version: migration.version, name: migration.name });
            } catch (error) {
              devError(`[IndexedDB] Migration failed: ${migration.name}`, error);
              throw error;
            }
          }
        }

        devLog(`[IndexedDB] Upgrade complete: v${newVersion}`);
      };
    });

    return this.initPromise;
  }

  /**
   * Get current database version
   */
  async getVersion(): Promise<number> {
    await this.init();
    return this.db?.version || 0;
  }

  /**
   * Get migration history
   */
  async getMigrationHistory(): Promise<Array<{ version: number; name: string; appliedAt: string }>> {
    await this.init();
    return new Promise((resolve, reject) => {
      if (!this.db) return reject(new Error('DB not initialized'));
      
      if (!this.db.objectStoreNames.contains(MIGRATIONS_STORE)) {
        return resolve([]);
      }

      const transaction = this.db.transaction(MIGRATIONS_STORE, 'readonly');
      const store = transaction.objectStore(MIGRATIONS_STORE);
      const request = store.getAll();

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result || []);
    });
  }

  /**
   * Clear all data from a specific store
   */
  async clearStore(storeName: string): Promise<void> {
    await this.init();
    return new Promise((resolve, reject) => {
      if (!this.db) return reject(new Error('DB not initialized'));
      if (!this.db.objectStoreNames.contains(storeName)) {
        return reject(new Error(`Store '${storeName}' does not exist`));
      }

      const transaction = this.db.transaction(storeName, 'readwrite');
      const store = transaction.objectStore(storeName);
      const request = store.clear();

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        devLog(`[IndexedDB] Store '${storeName}' cleared`);
        resolve();
      };
    });
  }

  /**
   * Clear all data from all stores (except migrations)
   */
  async clearAllData(): Promise<void> {
    await this.init();
    if (!this.db) throw new Error('DB not initialized');

    const storeNames = Array.from(this.db.objectStoreNames).filter(
      (name) => name !== MIGRATIONS_STORE
    );

    for (const storeName of storeNames) {
      await this.clearStore(storeName);
    }
    devLog('[IndexedDB] All data cleared');
  }

  /**
   * Get OHLCV data for a symbol
   */
  async getData(symbol: string): Promise<OHLCV[]> {
    await this.init();
    return new Promise((resolve, reject) => {
      if (!this.db) return reject(new Error('DB not initialized'));
      const transaction = this.db.transaction('ohlcv_data', 'readonly');
      const store = transaction.objectStore('ohlcv_data');
      const request = store.get(symbol);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result || []);
    });
  }

  /**
   * Save OHLCV data for a symbol
   */
  async saveData(symbol: string, data: OHLCV[]): Promise<void> {
    await this.init();
    return new Promise((resolve, reject) => {
      if (!this.db) return reject(new Error('DB not initialized'));
      const transaction = this.db.transaction('ohlcv_data', 'readwrite');
      const store = transaction.objectStore('ohlcv_data');

      // Sort by date before saving to ensure consistency
      const sortedData = [...data].sort((a, b) => 
        new Date(a.date).getTime() - new Date(b.date).getTime()
      );

      const request = store.put(sortedData, symbol);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve();
    });
  }

  /**
   * Merge and save data, avoiding duplicates
   */
  async mergeAndSave(symbol: string, newData: OHLCV[]): Promise<OHLCV[]> {
    const existingData = await this.getData(symbol);
    const dataMap = new Map<string, OHLCV>();

    // Add existing to map
    existingData.forEach((d) => dataMap.set(d.date, d));
    // Overwrite/Add new to map
    newData.forEach((d) => dataMap.set(d.date, d));

    const merged = Array.from(dataMap.values()).sort((a, b) =>
      new Date(a.date).getTime() - new Date(b.date).getTime()
    );

    await this.saveData(symbol, merged);
    return merged;
  }

  /**
   * Get user preference
   */
  async getPreference(key: string): Promise<unknown> {
    await this.init();
    return new Promise((resolve, reject) => {
      if (!this.db) return reject(new Error('DB not initialized'));
      if (!this.db.objectStoreNames.contains('user_preferences')) {
        return resolve(null);
      }

      const transaction = this.db.transaction('user_preferences', 'readonly');
      const store = transaction.objectStore('user_preferences');
      const request = store.get(key);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result?.value || null);
    });
  }

  /**
   * Set user preference
   */
  async setPreference(key: string, value: unknown, category = 'general'): Promise<void> {
    await this.init();
    return new Promise((resolve, reject) => {
      if (!this.db) return reject(new Error('DB not initialized'));
      if (!this.db.objectStoreNames.contains('user_preferences')) {
        return reject(new Error('user_preferences store does not exist'));
      }

      const transaction = this.db.transaction('user_preferences', 'readwrite');
      const store = transaction.objectStore('user_preferences');
      const request = store.put({ key, value, category, updatedAt: new Date().toISOString() });

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve();
    });
  }
}

export const idbClient = new IndexedDBClient();

// Export store names as constants for type safety
export const STORE_NAMES = {
  OHLCV_DATA: 'ohlcv_data',
  CACHE_METADATA: 'cache_metadata',
  USER_PREFERENCES: 'user_preferences',
  MIGRATIONS: MIGRATIONS_STORE,
} as const;
