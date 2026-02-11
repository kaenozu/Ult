/**
 * idb.test.ts
 * 
 * Legacy IndexedDB Client tests
 * Tests for backward compatibility with IndexedDBClient
 */

import { IndexedDBClient } from '../idb';

jest.setTimeout(10000);

describe('IndexedDBClient (Legacy)', () => {
  let client: IndexedDBClient;

  beforeEach(() => {
    client = new IndexedDBClient();
  });

  afterEach(async () => {
    try {
      await client.clearAllData();
    } catch {
      // Ignore cleanup errors
    }
  });

  describe('データベース接続', () => {
    it('データベースを初期化できる', async () => {
      await expect(client.init()).resolves.not.toThrow();
    });

    it('複数回initを呼んでも問題ない', async () => {
      await client.init();
      await client.init();
      await client.init();
    });
  });

  describe('データ操作', () => {
    const testSymbol = 'TEST_SYMBOL';
    const testData = [
      { date: '2024-01-01', open: 100, high: 110, low: 95, close: 105, volume: 1000 },
      { date: '2024-01-02', open: 105, high: 115, low: 100, close: 110, volume: 1200 },
    ];

    it('データを保存・取得できる', async () => {
      await client.saveData(testSymbol, testData);
      const retrieved = await client.getData(testSymbol);
      expect(retrieved).toEqual(testData);
    });

    it('存在しないシンボルは空配列を返す', async () => {
      const data = await client.getData('NON_EXISTENT');
      expect(data).toEqual([]);
    });

    it('データをマージして保存できる', async () => {
      const initialData = [
        { date: '2024-01-01', open: 100, high: 110, low: 95, close: 105, volume: 1000 },
      ];

      const newData = [
        { date: '2024-01-01', open: 100, high: 111, low: 96, close: 106, volume: 1100 },
        { date: '2024-01-02', open: 105, high: 115, low: 100, close: 110, volume: 1200 },
      ];

      await client.saveData(testSymbol, initialData);
      const merged = await client.mergeAndSave(testSymbol, newData);

      expect(merged.length).toBe(2);
      expect(merged.find(d => d.date === '2024-01-01')?.volume).toBe(1100);
    });

    it('全データをクリアできる', async () => {
      await client.saveData(testSymbol, testData);
      await client.clearAllData();
      const data = await client.getData(testSymbol);
      expect(data).toEqual([]);
    });
  });
});
