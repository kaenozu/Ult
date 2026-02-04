/**
 * @jest-environment jsdom
 */

import { IndexedDBClient, migrations, STORE_NAMES } from '../idb-migrations';

describe('IndexedDB Migration System', () => {
  let client: IndexedDBClient;

  beforeEach(() => {
    client = new IndexedDBClient();
  });

  afterEach(async () => {
    // Clean up with extended timeout
    try {
      await client.clearAllData();
    } catch (error) {
      // Ignore errors during cleanup
    }
  }, 30000); // 30 second timeout for cleanup

  describe('Initialization', () => {
    it('should initialize successfully', async () => {
      await expect(client.init()).resolves.not.toThrow();
    });

    it('should return correct database version', async () => {
      await client.init();
      const version = await client.getVersion();
      expect(version).toBeGreaterThan(0);
    });

    it('should handle multiple init calls', async () => {
      await client.init();
      await client.init();
      await client.init();
      const version = await client.getVersion();
      expect(version).toBeGreaterThan(0);
    });
  });

  describe('Migration History', () => {
    it('should track applied migrations', async () => {
      await client.init();
      const history = await client.getMigrationHistory();
      
      expect(Array.isArray(history)).toBe(true);
      if (history.length > 0) {
        expect(history[0]).toHaveProperty('version');
        expect(history[0]).toHaveProperty('name');
        expect(history[0]).toHaveProperty('appliedAt');
      }
    });

    it('should have migrations in sequential order', async () => {
      await client.init();
      const history = await client.getMigrationHistory();
      
      for (let i = 0; i < history.length - 1; i++) {
        expect(history[i].version).toBeLessThan(history[i + 1].version);
      }
    });
  });

  describe('Migrations Array', () => {
    it('should have valid migration structure', () => {
      expect(migrations.length).toBeGreaterThan(0);

      migrations.forEach((migration) => {
        expect(migration).toHaveProperty('version');
        expect(migration).toHaveProperty('name');
        expect(migration).toHaveProperty('up');
        expect(typeof migration.version).toBe('number');
        expect(typeof migration.name).toBe('string');
        expect(typeof migration.up).toBe('function');
      });
    });

    it('should have sequential version numbers', () => {
      const versions = migrations.map((m) => m.version);
      const sorted = [...versions].sort((a, b) => a - b);
      expect(versions).toEqual(sorted);

      for (let i = 0; i < versions.length; i++) {
        expect(versions[i]).toBe(i + 1);
      }
    });

    it('should have unique migration names', () => {
      const names = migrations.map((m) => m.name);
      const uniqueNames = new Set(names);
      expect(uniqueNames.size).toBe(names.length);
    });
  });

  describe('OHLCV Data Operations', () => {
    const testSymbol = 'TEST_SYMBOL';
    const testData = [
      { date: '2024-01-01', open: 100, high: 110, low: 95, close: 105, volume: 1000 },
      { date: '2024-01-02', open: 105, high: 115, low: 100, close: 110, volume: 1200 },
    ];

    it('should save and retrieve OHLCV data', async () => {
      await client.saveData(testSymbol, testData);
      const retrieved = await client.getData(testSymbol);
      expect(retrieved).toEqual(testData);
    });

    it('should sort data by date when saving', async () => {
      const unsortedData = [
        { date: '2024-01-03', open: 110, high: 120, low: 105, close: 115, volume: 1100 },
        { date: '2024-01-01', open: 100, high: 110, low: 95, close: 105, volume: 1000 },
        { date: '2024-01-02', open: 105, high: 115, low: 100, close: 110, volume: 1200 },
      ];

      await client.saveData(testSymbol, unsortedData);
      const retrieved = await client.getData(testSymbol);

      for (let i = 0; i < retrieved.length - 1; i++) {
        const date1 = new Date(retrieved[i].date).getTime();
        const date2 = new Date(retrieved[i + 1].date).getTime();
        expect(date1).toBeLessThanOrEqual(date2);
      }
    });

    it('should merge and save data without duplicates', async () => {
      const initialData = [
        { date: '2024-01-01', open: 100, high: 110, low: 95, close: 105, volume: 1000 },
        { date: '2024-01-02', open: 105, high: 115, low: 100, close: 110, volume: 1200 },
      ];

      const newData = [
        { date: '2024-01-02', open: 105, high: 116, low: 101, close: 111, volume: 1300 }, // Updated
        { date: '2024-01-03', open: 110, high: 120, low: 105, close: 115, volume: 1100 }, // New
      ];

      await client.saveData(testSymbol, initialData);
      const merged = await client.mergeAndSave(testSymbol, newData);

      expect(merged.length).toBe(3);
      expect(merged.find((d) => d.date === '2024-01-02')?.volume).toBe(1300); // Should be updated
    });

    it('should return empty array for non-existent symbol', async () => {
      const data = await client.getData('NON_EXISTENT');
      expect(data).toEqual([]);
    });
  });

  describe('User Preferences', () => {
    it('should save and retrieve preferences', async () => {
      await client.setPreference('theme', 'dark');
      const value = await client.getPreference('theme');
      expect(value).toBe('dark');
    });

    it('should return null for non-existent preference', async () => {
      const value = await client.getPreference('non_existent');
      expect(value).toBeNull();
    });

    it('should update existing preferences', async () => {
      await client.setPreference('language', 'en');
      await client.setPreference('language', 'ja');
      const value = await client.getPreference('language');
      expect(value).toBe('ja');
    });

    it('should support complex values', async () => {
      const complexValue = {
        indicators: ['RSI', 'MACD'],
        timeframe: '1d',
        chartType: 'candlestick',
      };

      await client.setPreference('chartSettings', complexValue);
      const value = await client.getPreference('chartSettings');
      expect(value).toEqual(complexValue);
    });
  });

  describe('Store Management', () => {
    it('should clear specific store', async () => {
      const testSymbol = 'TEST';
      const testData = [{ date: '2024-01-01', open: 100, high: 110, low: 95, close: 105, volume: 1000 }];

      await client.saveData(testSymbol, testData);
      await client.clearStore(STORE_NAMES.OHLCV_DATA);

      const retrieved = await client.getData(testSymbol);
      expect(retrieved).toEqual([]);
    });

    it('should throw error for non-existent store', async () => {
      await expect(client.clearStore('non_existent_store')).rejects.toThrow();
    });

    it('should clear all data except migrations', async () => {
      // Add some data
      await client.saveData('TEST', [{ date: '2024-01-01', open: 100, high: 110, low: 95, close: 105, volume: 1000 }]);
      await client.setPreference('test_pref', 'value');

      // Clear all
      await client.clearAllData();

      // Data should be cleared
      const data = await client.getData('TEST');
      expect(data).toEqual([]);

      const pref = await client.getPreference('test_pref');
      expect(pref).toBeNull();

      // But migrations history should remain
      const history = await client.getMigrationHistory();
      expect(Array.isArray(history)).toBe(true);
    });
  });

  describe('Store Names Constants', () => {
    it('should export store name constants', () => {
      expect(STORE_NAMES.OHLCV_DATA).toBe('ohlcv_data');
      expect(STORE_NAMES.CACHE_METADATA).toBe('cache_metadata');
      expect(STORE_NAMES.USER_PREFERENCES).toBe('user_preferences');
      expect(STORE_NAMES.MIGRATIONS).toBe('_migrations');
    });
  });

  describe('Error Handling', () => {
    it('should handle database errors gracefully', async () => {
      const badClient = new IndexedDBClient();
      
      // Try to perform operations before initialization might cause issues
      // But init should be called automatically
      await expect(badClient.getData('TEST')).resolves.toBeDefined();
    });
  });
});
