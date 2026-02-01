import { OHLCV } from '@/app/types';

const DB_NAME = 'TraderProDB';
const STORE_NAME = 'ohlcv_data';
const DB_VERSION = 1;

export class IndexedDBClient {
  private db: IDBDatabase | null = null;
  private initPromise: Promise<void> | null = null;

  async init(): Promise<void> {
    // If already initialized, return immediately
    if (this.db) return;

    // If initialization is in progress, return the existing promise
    if (this.initPromise) return this.initPromise;

    // Start new initialization
    this.initPromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => {
        this.initPromise = null; // Reset on error to allow retry
        reject(request.error);
      };
      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        const oldVersion = event.oldVersion;
        
        console.log(`IndexedDB Upgrade: ${oldVersion} -> ${DB_VERSION}`);

        if (oldVersion < 1) {
          if (!db.objectStoreNames.contains(STORE_NAME)) {
            db.createObjectStore(STORE_NAME);
          }
        }
        
        // Add future migration logic here (e.g., if (oldVersion < 2) { ... })
      };
    });

    return this.initPromise;
  }

  async clearAllData(): Promise<void> {
    await this.init();
    return new Promise((resolve, reject) => {
      if (!this.db) return reject('DB not initialized');
      const transaction = this.db.transaction(STORE_NAME, 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.clear();

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        console.log('IndexedDB: All data cleared.');
        resolve();
      };
    });
  }

  async getData(symbol: string): Promise<OHLCV[]> {
    await this.init();
    return new Promise((resolve, reject) => {
      if (!this.db) return reject('DB not initialized');
      const transaction = this.db.transaction(STORE_NAME, 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.get(symbol);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result || []);
    });
  }

  async saveData(symbol: string, data: OHLCV[]): Promise<void> {
    await this.init();
    return new Promise((resolve, reject) => {
      if (!this.db) return reject('DB not initialized');
      const transaction = this.db.transaction(STORE_NAME, 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      
      // Sort by date before saving to ensure consistency
      const sortedData = [...data].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
      
      const request = store.put(sortedData, symbol);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve();
    });
  }

  /**
   * Merges new data with existing data, avoiding duplicates
   */
  async mergeAndSave(symbol: string, newData: OHLCV[]): Promise<OHLCV[]> {
    const existingData = await this.getData(symbol);
    const dataMap = new Map<string, OHLCV>();
    
    // Add existing to map
    existingData.forEach(d => dataMap.set(d.date, d));
    // Overwrite/Add new to map
    newData.forEach(d => dataMap.set(d.date, d));
    
    const merged = Array.from(dataMap.values()).sort((a, b) => 
      new Date(a.date).getTime() - new Date(b.date).getTime()
    );
    
    await this.saveData(symbol, merged);
    return merged;
  }
}

export const idbClient = new IndexedDBClient();
