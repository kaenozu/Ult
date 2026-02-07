/**
 * DataPersistenceLayer
 * 
 * Unified data persistence layer providing:
 * - Time-series data storage (OHLCV)
 * - Trade history persistence
 * - Model/configuration storage
 * - Backup/restore functionality
 * - IndexedDB for client-side storage
 * - Future: Server-side SQL database support
 */

import type { OHLCV } from '@/app/types/shared';

export interface TradeHistory {
  id: string;
  timestamp: number;
  symbol: string;
  entryPrice: number;
  exitPrice?: number;
  quantity: number;
  profit?: number;
  profitPercent?: number;
  signalType: string;
  indicator: string;
  status: 'OPEN' | 'CLOSED' | 'CANCELLED';
  notes?: string;
}

export interface ModelConfiguration {
  id: string;
  name: string;
  type: 'technical' | 'ml' | 'hybrid';
  parameters: Record<string, unknown>;
  performance: {
    accuracy?: number;
    winRate?: number;
    sharpeRatio?: number;
  };
  createdAt: number;
  updatedAt: number;
}

export interface BackupMetadata {
  id: string;
  timestamp: number;
  version: string;
  dataTypes: string[];
  size: number;
  compressed: boolean;
}

export interface PersistenceOptions {
  storeName: string;
  dbName?: string;
  version?: number;
  enableBackup?: boolean;
}

export interface QueryOptions {
  startDate?: string;
  endDate?: string;
  limit?: number;
  offset?: number;
  orderBy?: 'asc' | 'desc';
}

/**
 * Data Persistence Layer
 * 
 * Provides unified interface for storing and retrieving trading data
 * using IndexedDB for client-side persistence.
 */
export class DataPersistenceLayer {
  private dbName: string;
  private version: number;
  private db: IDBDatabase | null = null;
  private enableBackup: boolean;

  constructor(options: PersistenceOptions = { storeName: 'tradingData' }) {
    this.dbName = options.dbName || 'ULT_TradingPlatform';
    this.version = options.version || 3;
    this.enableBackup = options.enableBackup || false;
  }

  /**
   * Initialize the database connection
   */
  async initialize(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.version);

      request.onerror = () => {
        reject(new Error(`Failed to open database: ${request.error?.message}`));
      };

      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        this.upgradeDatabase(db, event.oldVersion, event.newVersion || this.version);
      };
    });
  }

  /**
   * Upgrade database schema
   */
  private upgradeDatabase(db: IDBDatabase, oldVersion: number, newVersion: number): void {
    console.log(`Upgrading database from version ${oldVersion} to ${newVersion}`);

    // Create object stores
    if (!db.objectStoreNames.contains('ohlcv')) {
      const ohlcvStore = db.createObjectStore('ohlcv', { keyPath: 'id', autoIncrement: true });
      ohlcvStore.createIndex('symbol', 'symbol', { unique: false });
      ohlcvStore.createIndex('date', 'date', { unique: false });
      ohlcvStore.createIndex('symbolDate', ['symbol', 'date'], { unique: true });
    }

    if (!db.objectStoreNames.contains('tradeHistory')) {
      const tradeStore = db.createObjectStore('tradeHistory', { keyPath: 'id' });
      tradeStore.createIndex('symbol', 'symbol', { unique: false });
      tradeStore.createIndex('timestamp', 'timestamp', { unique: false });
      tradeStore.createIndex('status', 'status', { unique: false });
    }

    if (!db.objectStoreNames.contains('modelConfig')) {
      const modelStore = db.createObjectStore('modelConfig', { keyPath: 'id' });
      modelStore.createIndex('name', 'name', { unique: true });
      modelStore.createIndex('type', 'type', { unique: false });
    }

    if (!db.objectStoreNames.contains('backups')) {
      const backupStore = db.createObjectStore('backups', { keyPath: 'id' });
      backupStore.createIndex('timestamp', 'timestamp', { unique: false });
    }
  }

  /**
   * Store OHLCV data
   */
  async saveOHLCV(data: OHLCV[]): Promise<void> {
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    const transaction = this.db.transaction(['ohlcv'], 'readwrite');
    const store = transaction.objectStore('ohlcv');

    const promises = data.map((ohlcv) => {
      return new Promise<void>((resolve, reject) => {
        const request = store.put(ohlcv);
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      });
    });

    await Promise.all(promises);
  }

  /**
   * Retrieve OHLCV data for a symbol
   */
  async getOHLCV(symbol: string, options: QueryOptions = {}): Promise<OHLCV[]> {
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['ohlcv'], 'readonly');
      const store = transaction.objectStore('ohlcv');
      const index = store.index('symbol');
      const request = index.getAll(symbol);

      request.onsuccess = () => {
        let results = request.result as OHLCV[];

        // Apply filters
        if (options.startDate) {
          results = results.filter(d => d.date >= options.startDate!);
        }
        if (options.endDate) {
          results = results.filter(d => d.date <= options.endDate!);
        }

        // Apply sorting
        results.sort((a, b) => {
          const comparison = a.date.localeCompare(b.date);
          return options.orderBy === 'desc' ? -comparison : comparison;
        });

        // Apply pagination
        if (options.offset) {
          results = results.slice(options.offset);
        }
        if (options.limit) {
          results = results.slice(0, options.limit);
        }

        resolve(results);
      };

      request.onerror = () => {
        reject(new Error(`Failed to retrieve OHLCV data: ${request.error?.message}`));
      };
    });
  }

  /**
   * Delete old OHLCV data
   */
  async deleteOldOHLCV(symbol: string, beforeDate: string): Promise<number> {
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    const data = await this.getOHLCV(symbol);
    const toDelete = data.filter(d => d.date < beforeDate);

    const transaction = this.db.transaction(['ohlcv'], 'readwrite');
    const store = transaction.objectStore('ohlcv');

    const promises = toDelete.map((item) => {
      return new Promise<void>((resolve, reject) => {
        const index = store.index('symbolDate');
        const request = index.getKey([symbol, item.date]);
        
        request.onsuccess = () => {
          if (request.result) {
            const deleteRequest = store.delete(request.result);
            deleteRequest.onsuccess = () => resolve();
            deleteRequest.onerror = () => reject(deleteRequest.error);
          } else {
            resolve();
          }
        };
        
        request.onerror = () => reject(request.error);
      });
    });

    await Promise.all(promises);
    return toDelete.length;
  }

  /**
   * Save trade history
   */
  async saveTrade(trade: TradeHistory): Promise<void> {
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['tradeHistory'], 'readwrite');
      const store = transaction.objectStore('tradeHistory');
      const request = store.put(trade);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(new Error(`Failed to save trade: ${request.error?.message}`));
    });
  }

  /**
   * Retrieve trade history
   */
  async getTrades(symbol?: string, status?: 'OPEN' | 'CLOSED' | 'CANCELLED'): Promise<TradeHistory[]> {
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['tradeHistory'], 'readonly');
      const store = transaction.objectStore('tradeHistory');
      
      let request: IDBRequest;
      
      if (symbol) {
        const index = store.index('symbol');
        request = index.getAll(symbol);
      } else if (status) {
        const index = store.index('status');
        request = index.getAll(status);
      } else {
        request = store.getAll();
      }

      request.onsuccess = () => {
        let results = request.result as TradeHistory[];
        
        // Additional filtering if both symbol and status specified
        if (symbol && status) {
          results = results.filter(t => t.status === status);
        }
        
        resolve(results);
      };

      request.onerror = () => {
        reject(new Error(`Failed to retrieve trades: ${request.error?.message}`));
      };
    });
  }

  /**
   * Save model configuration
   */
  async saveModelConfig(config: ModelConfiguration): Promise<void> {
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['modelConfig'], 'readwrite');
      const store = transaction.objectStore('modelConfig');
      const request = store.put({
        ...config,
        updatedAt: Date.now()
      });

      request.onsuccess = () => resolve();
      request.onerror = () => reject(new Error(`Failed to save model config: ${request.error?.message}`));
    });
  }

  /**
   * Retrieve model configuration
   */
  async getModelConfig(name: string): Promise<ModelConfiguration | null> {
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['modelConfig'], 'readonly');
      const store = transaction.objectStore('modelConfig');
      const index = store.index('name');
      const request = index.get(name);

      request.onsuccess = () => {
        resolve(request.result || null);
      };

      request.onerror = () => {
        reject(new Error(`Failed to retrieve model config: ${request.error?.message}`));
      };
    });
  }

  /**
   * List all model configurations
   */
  async listModelConfigs(): Promise<ModelConfiguration[]> {
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['modelConfig'], 'readonly');
      const store = transaction.objectStore('modelConfig');
      const request = store.getAll();

      request.onsuccess = () => {
        resolve(request.result as ModelConfiguration[]);
      };

      request.onerror = () => {
        reject(new Error(`Failed to list model configs: ${request.error?.message}`));
      };
    });
  }

  /**
   * Create a backup of all data
   */
  async createBackup(): Promise<BackupMetadata> {
    if (!this.db || !this.enableBackup) {
      throw new Error('Backup not enabled or database not initialized');
    }

    const backupId = `backup_${Date.now()}`;
    const metadata: BackupMetadata = {
      id: backupId,
      timestamp: Date.now(),
      version: String(this.version),
      dataTypes: ['ohlcv', 'tradeHistory', 'modelConfig'],
      size: 0,
      compressed: false
    };

    // Export all data
    const ohlcvData = await this.exportStore('ohlcv');
    const tradeData = await this.exportStore('tradeHistory');
    const modelData = await this.exportStore('modelConfig');

    const backupData = {
      metadata,
      data: {
        ohlcv: ohlcvData,
        tradeHistory: tradeData,
        modelConfig: modelData
      }
    };

    // Calculate size
    metadata.size = JSON.stringify(backupData).length;

    // Save backup metadata
    await this.saveBackupMetadata(metadata);

    // Store backup in IndexedDB
    await this.storeBackup(backupId, backupData);

    return metadata;
  }

  /**
   * Restore from backup
   */
  async restoreBackup(backupId: string): Promise<void> {
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    const backup = await this.loadBackup(backupId);
    
    if (!backup) {
      throw new Error(`Backup ${backupId} not found`);
    }

    // Restore each store
    await this.restoreStore('ohlcv', backup.data.ohlcv);
    await this.restoreStore('tradeHistory', backup.data.tradeHistory);
    await this.restoreStore('modelConfig', backup.data.modelConfig);
  }

  /**
   * List all backups
   */
  async listBackups(): Promise<BackupMetadata[]> {
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['backups'], 'readonly');
      const store = transaction.objectStore('backups');
      const request = store.getAll();

      request.onsuccess = () => {
        resolve(request.result as BackupMetadata[]);
      };

      request.onerror = () => {
        reject(new Error(`Failed to list backups: ${request.error?.message}`));
      };
    });
  }

  /**
   * Helper: Export data from a store
   */
  private async exportStore(storeName: string): Promise<unknown[]> {
    if (!this.db) return [];

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([storeName], 'readonly');
      const store = transaction.objectStore(storeName);
      const request = store.getAll();

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Helper: Restore data to a store
   */
  private async restoreStore(storeName: string, data: unknown[]): Promise<void> {
    if (!this.db) return;

    const transaction = this.db.transaction([storeName], 'readwrite');
    const store = transaction.objectStore(storeName);

    // Clear existing data
    await new Promise<void>((resolve, reject) => {
      const clearRequest = store.clear();
      clearRequest.onsuccess = () => resolve();
      clearRequest.onerror = () => reject(clearRequest.error);
    });

    // Add restored data
    const promises = data.map((item) => {
      return new Promise<void>((resolve, reject) => {
        const request = store.add(item);
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      });
    });

    await Promise.all(promises);
  }

  /**
   * Helper: Save backup metadata
   */
  private async saveBackupMetadata(metadata: BackupMetadata): Promise<void> {
    if (!this.db) return;

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['backups'], 'readwrite');
      const store = transaction.objectStore('backups');
      const request = store.put({ ...metadata, data: null });

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Helper: Store backup data
   */
  private async storeBackup(backupId: string, backup: unknown): Promise<void> {
    if (!this.db) return;

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['backups'], 'readwrite');
      const store = transaction.objectStore('backups');
      const request = store.put({ id: backupId, data: backup });

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Helper: Load backup data
   */
  private async loadBackup(backupId: string): Promise<unknown> {
    if (!this.db) return null;

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['backups'], 'readonly');
      const store = transaction.objectStore('backups');
      const request = store.get(backupId);

      request.onsuccess = () => {
        const result = request.result;
        resolve(result?.data || null);
      };

      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Get database statistics
   */
  async getStats(): Promise<{
    ohlcvCount: number;
    tradeCount: number;
    modelCount: number;
    backupCount: number;
  }> {
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    const [ohlcvData, tradeData, modelData, backupData] = await Promise.all([
      this.exportStore('ohlcv'),
      this.exportStore('tradeHistory'),
      this.exportStore('modelConfig'),
      this.listBackups()
    ]);

    return {
      ohlcvCount: ohlcvData.length,
      tradeCount: tradeData.length,
      modelCount: modelData.length,
      backupCount: backupData.length
    };
  }

  /**
   * Close database connection
   */
  close(): void {
    if (this.db) {
      this.db.close();
      this.db = null;
    }
  }
}

/**
 * Singleton instance for convenient access
 */
export const dataPersistenceLayer = new DataPersistenceLayer({
  storeName: 'tradingData',
  enableBackup: true
});
