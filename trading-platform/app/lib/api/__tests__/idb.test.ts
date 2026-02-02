/**
 * idb.test.ts
 * 
 * IndexedDBラッパーのテスト
 * データ保存、取得、削除、インデックスのテスト
 */

import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { IDBHelper } from '../idb';

describe('IDBHelper', () => {
  let db: IDBHelper;
  const DB_NAME = 'test-db';
  const STORE_NAME = 'test-store';

  beforeEach(async () => {
    db = new IDBHelper(DB_NAME, 1, {
      [STORE_NAME]: { keyPath: 'id', autoIncrement: true },
    });
    await db.open();
  });

  afterEach(async () => {
    await db.clear(STORE_NAME);
    await db.close();
  });

  describe('データベース接続', () => {
    it('データベースを開くことができる', async () => {
      const testDb = new IDBHelper('test-db-2', 1, {
        'test-store': { keyPath: 'id', autoIncrement: true },
      });
      await testDb.open();
      
      expect(testDb.isOpen()).toBe(true);
      await testDb.close();
    });

    it('データベースを閉じることができる', async () => {
      await db.close();
      expect(db.isOpen()).toBe(false);
    });
  });

  describe('データ操作', () => {
    it('データを追加できる', async () => {
      const data = { name: 'Test', value: 123 };
      const result = await db.add(STORE_NAME, data);
      
      expect(result).toBeDefined();
      expect(result.id).toBeDefined();
    });

    it('データを取得できる', async () => {
      const data = { name: 'Test', value: 123 };
      const added = await db.add(STORE_NAME, data);
      const retrieved = await db.get(STORE_NAME, added.id);
      
      expect(retrieved).toEqual({ ...data, id: added.id });
    });

    it('存在しないデータを取得するとundefinedを返す', async () => {
      const result = await db.get(STORE_NAME, 999);
      
      expect(result).toBeUndefined();
    });

    it('データを更新できる', async () => {
      const data = { name: 'Test', value: 123 };
      const added = await db.add(STORE_NAME, data);
      
      const updated = await db.put(STORE_NAME, { ...data, id: added.id, value: 456 });
      const retrieved = await db.get(STORE_NAME, added.id);
      
      expect(retrieved?.value).toBe(456);
    });

    it('データを削除できる', async () => {
      const data = { name: 'Test', value: 123 };
      const added = await db.add(STORE_NAME, data);
      
      await db.delete(STORE_NAME, added.id);
      const retrieved = await db.get(STORE_NAME, added.id);
      
      expect(retrieved).toBeUndefined();
    });

    it('すべてのデータを取得できる', async () => {
      const data1 = { name: 'Test1', value: 123 };
      const data2 = { name: 'Test2', value: 456 };
      const data3 = { name: 'Test3', value: 789 };
      
      await db.add(STORE_NAME, data1);
      await db.add(STORE_NAME, data2);
      await db.add(STORE_NAME, data3);
      
      const all = await db.getAll(STORE_NAME);
      
      expect(all).toHaveLength(3);
      expect(all.map(item => item.name)).toEqual(['Test1', 'Test2', 'Test3']);
    });

    it('ストアをクリアできる', async () => {
      const data1 = { name: 'Test1', value: 123 };
      const data2 = { name: 'Test2', value: 456 };
      
      await db.add(STORE_NAME, data1);
      await db.add(STORE_NAME, data2);
      
      await db.clear(STORE_NAME);
      const all = await db.getAll(STORE_NAME);
      
      expect(all).toHaveLength(0);
    });
  });

  describe('インデックス操作', () => {
    beforeEach(async () => {
      // インデックス付きのストアを作成
      const indexedDb = new IDBHelper('test-db-indexed', 1, {
        'indexed-store': {
          keyPath: 'id',
          autoIncrement: true,
          indexes: [
            { name: 'name', keyPath: 'name', options: { unique: false } },
            { name: 'value', keyPath: 'value', options: { unique: false } },
          ],
        },
      });
      await indexedDb.open();
      db = indexedDb;
    });

    it('インデックスを使用してデータを検索できる', async () => {
      const data1 = { name: 'Test1', value: 123 };
      const data2 = { name: 'Test2', value: 456 };
      const data3 = { name: 'Test1', value: 789 };
      
      await db.add('indexed-store', data1);
      await db.add('indexed-store', data2);
      await db.add('indexed-store', data3);
      
      const results = await db.getByIndex('indexed-store', 'name', 'Test1');
      
      expect(results).toHaveLength(2);
      expect(results.map(item => item.value)).toEqual([123, 789]);
    });

    it('インデックスを使用して範囲検索ができる', async () => {
      const data1 = { name: 'Test1', value: 100 };
      const data2 = { name: 'Test2', value: 200 };
      const data3 = { name: 'Test3', value: 300 };
      const data4 = { name: 'Test4', value: 400 };
      
      await db.add('indexed-store', data1);
      await db.add('indexed-store', data2);
      await db.add('indexed-store', data3);
      await db.add('indexed-store', data4);
      
      const results = await db.getByIndexRange('indexed-store', 'value', 200, 300);
      
      expect(results).toHaveLength(2);
      expect(results.map(item => item.value)).toEqual([200, 300]);
    });
  });

  describe('エラーハンドリング', () => {
    it('存在しないストアにアクセスするとエラーを投げる', async () => {
      await expect(db.get('non-existent-store', 1)).rejects.toThrow();
    });

    it('重複キーで追加するとエラーを投げる', async () => {
      const data = { id: 1, name: 'Test', value: 123 };
      await db.add(STORE_NAME, data);
      
      await expect(db.add(STORE_NAME, data)).rejects.toThrow();
    });
  });

  describe('トランザクション', () => {
    it('複数の操作をアトミックに実行できる', async () => {
      const data1 = { name: 'Test1', value: 123 };
      const data2 = { name: 'Test2', value: 456 };
      const data3 = { name: 'Test3', value: 789 };
      
      await db.transaction([STORE_NAME], async (store) => {
        await store.add(data1);
        await store.add(data2);
        await store.add(data3);
      });
      
      const all = await db.getAll(STORE_NAME);
      
      expect(all).toHaveLength(3);
    });

    it('トランザクション内でエラーが発生するとロールバックされる', async () => {
      const data1 = { name: 'Test1', value: 123 };
      const data2 = { name: 'Test2', value: 456 };
      
      await expect(
        db.transaction([STORE_NAME], async (store) => {
          await store.add(data1);
          await store.add(data2);
          throw new Error('Transaction error');
        })
      ).rejects.toThrow('Transaction error');
      
      const all = await db.getAll(STORE_NAME);
      
      // トランザクションがロールバックされたため、データが追加されていない
      expect(all).toHaveLength(0);
    });
  });

  describe('パフォーマンス', () => {
    it('大量のデータを効率的に追加できる', async () => {
      const batchSize = 1000;
      const startTime = performance.now();
      
      const promises = Array.from({ length: batchSize }, (_, i) =>
        db.add(STORE_NAME, { name: `Test${i}`, value: i })
      );
      
      await Promise.all(promises);
      const endTime = performance.now();
      
      const all = await db.getAll(STORE_NAME);
      expect(all).toHaveLength(batchSize);
      
      // パフォーマンスチェック: 1000件の追加が1秒以内で完了する
      expect(endTime - startTime).toBeLessThan(1000);
    });
  });
});
