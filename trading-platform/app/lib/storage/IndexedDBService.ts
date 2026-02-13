/**
 * IndexedDBService.ts
 * 
 * 取引履歴・ポジション・パフォーマンスデータの永続化サービス
 * ブラウザのIndexedDBを使用してデータをローカルに保存
 */

import { Order, Position } from '@/app/types';
import { logger } from '@/app/core/logger';

const DB_NAME = 'TradingPlatformDB';
const DB_VERSION = 1;

// ストア名
const STORES = {
  TRADES: 'trades',
  POSITIONS: 'positions',
  PERFORMANCE: 'performance',
  SETTINGS: 'settings',
} as const;

// データ型定義
export interface StoredTrade extends Order {
  id: string;
  syncedAt?: number;
}

export interface StoredPosition extends Position {
  id: string;
  updatedAt: number;
}

export interface MonthlyPerformance {
  year: number;
  month: number;
  totalTrades: number;
  winningTrades: number;
  losingTrades: number;
  totalProfit: number;
  totalLoss: number;
  netProfit: number;
  winRate: number;
  profitFactor: number;
  maxDrawdown: number;
  sharpeRatio: number;
}

export interface TradeHistory {
  trades: StoredTrade[];
  totalCount: number;
  lastUpdated: number;
}

class IndexedDBService {
  private db: IDBDatabase | null = null;
  private initPromise: Promise<void> | null = null;

  /**
   * IndexedDBを初期化
   */
  async initialize(): Promise<void> {
    if (this.initPromise) {
      return this.initPromise;
    }

    this.initPromise = this.performInit();
    return this.initPromise;
  }

  private async performInit(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => {
        logger.error('IndexedDB initialization failed', request.error);
        reject(request.error);
      };

      request.onsuccess = () => {
        this.db = request.result;
        logger.info('IndexedDB initialized successfully');
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        // 取引履歴ストア
        if (!db.objectStoreNames.contains(STORES.TRADES)) {
          const tradeStore = db.createObjectStore(STORES.TRADES, { keyPath: 'id' });
          tradeStore.createIndex('symbol', 'symbol', { unique: false });
          tradeStore.createIndex('date', 'date', { unique: false });
          tradeStore.createIndex('timestamp', 'timestamp', { unique: false });
        }

        // ポジションストア
        if (!db.objectStoreNames.contains(STORES.POSITIONS)) {
          const positionStore = db.createObjectStore(STORES.POSITIONS, { keyPath: 'symbol' });
          positionStore.createIndex('updatedAt', 'updatedAt', { unique: false });
        }

        // パフォーマンスストア
        if (!db.objectStoreNames.contains(STORES.PERFORMANCE)) {
          const perfStore = db.createObjectStore(STORES.PERFORMANCE, { keyPath: 'id' });
          perfStore.createIndex('yearMonth', ['year', 'month'], { unique: true });
        }

        // 設定ストア
        if (!db.objectStoreNames.contains(STORES.SETTINGS)) {
          db.createObjectStore(STORES.SETTINGS, { keyPath: 'key' });
        }
      };
    });
  }

  /**
   * 取引を保存
   */
  async saveTrade(trade: Order): Promise<void> {
    await this.initialize();
    if (!this.db) throw new Error('Database not initialized');

    const storedTrade: StoredTrade = {
      ...trade,
      id: trade.id || `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      syncedAt: Date.now(),
    };

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORES.TRADES], 'readwrite');
      const store = transaction.objectStore(STORES.TRADES);
      const request = store.put(storedTrade);

      request.onsuccess = () => {
        logger.info(`Trade saved: ${storedTrade.symbol}`, { tradeId: storedTrade.id });
        resolve();
      };

      request.onerror = () => {
        logger.error('Failed to save trade', request.error);
        reject(request.error);
      };
    });
  }

  /**
   * 複数の取引を保存
   */
  async saveTrades(trades: Order[]): Promise<void> {
    await this.initialize();
    if (!this.db) throw new Error('Database not initialized');

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORES.TRADES], 'readwrite');
      const store = transaction.objectStore(STORES.TRADES);

      let completed = 0;
      let failed = 0;

      trades.forEach((trade) => {
        const storedTrade: StoredTrade = {
          ...trade,
          id: trade.id || `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          syncedAt: Date.now(),
        };

        const request = store.put(storedTrade);
        
        request.onsuccess = () => {
          completed++;
          if (completed + failed === trades.length) {
            logger.info(`Batch save complete: ${completed} succeeded, ${failed} failed`);
            resolve();
          }
        };

        request.onerror = () => {
          failed++;
          logger.error('Failed to save trade in batch', request.error);
          if (completed + failed === trades.length) {
            resolve(); // 部分的な失敗でも続行
          }
        };
      });
    });
  }

  /**
   * 取引履歴を取得
   */
  async getTrades(options?: {
    symbol?: string;
    startDate?: string;
    endDate?: string;
    limit?: number;
    offset?: number;
  }): Promise<TradeHistory> {
    await this.initialize();
    if (!this.db) throw new Error('Database not initialized');

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORES.TRADES], 'readonly');
      const store = transaction.objectStore(STORES.TRADES);
      const request = store.getAll();

      request.onsuccess = () => {
        let trades: StoredTrade[] = request.result;

        // フィルタリング
        if (options?.symbol) {
          trades = trades.filter((t) => t.symbol === options.symbol);
        }

        if (options?.startDate) {
          trades = trades.filter((t) => t.date >= options.startDate!);
        }

        if (options?.endDate) {
          trades = trades.filter((t) => t.date <= options.endDate!);
        }

        // 日付順にソート（新しい順）
        trades.sort((a, b) => {
          const dateA = new Date(a.date).getTime();
          const dateB = new Date(b.date).getTime();
          return dateB - dateA;
        });

        const totalCount = trades.length;

        // ページネーション
        if (options?.offset) {
          trades = trades.slice(options.offset);
        }

        if (options?.limit) {
          trades = trades.slice(0, options.limit);
        }

        resolve({
          trades,
          totalCount,
          lastUpdated: Date.now(),
        });
      };

      request.onerror = () => {
        logger.error('Failed to get trades', request.error);
        reject(request.error);
      };
    });
  }

  /**
   * 月次パフォーマンスを計算・保存
   */
  async calculateMonthlyPerformance(year: number, month: number): Promise<MonthlyPerformance> {
    const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
    const endDate = month === 12 
      ? `${year + 1}-01-01` 
      : `${year}-${String(month + 1).padStart(2, '0')}-01`;

    const { trades } = await this.getTrades({ startDate, endDate });

    // 損益計算
    const positionMap = new Map<string, { quantity: number; avgPrice: number }>();
    let totalProfit = 0;
    let totalLoss = 0;
    let winningTrades = 0;
    let losingTrades = 0;

    trades
      .filter((t) => t.status === 'FILLED')
      .forEach((trade) => {
        const price = trade.price || 0;

        if (trade.side === 'BUY') {
          const current = positionMap.get(trade.symbol);
          if (current) {
            const totalQuantity = current.quantity + trade.quantity;
            const totalCost = current.quantity * current.avgPrice + trade.quantity * price;
            positionMap.set(trade.symbol, {
              quantity: totalQuantity,
              avgPrice: totalCost / totalQuantity,
            });
          } else {
            positionMap.set(trade.symbol, { quantity: trade.quantity, avgPrice: price });
          }
        } else if (trade.side === 'SELL') {
          const position = positionMap.get(trade.symbol);
          if (position && position.quantity > 0) {
            const sellQuantity = Math.min(trade.quantity, position.quantity);
            const pnl = (price - position.avgPrice) * sellQuantity;

            if (pnl > 0) {
              totalProfit += pnl;
              winningTrades++;
            } else if (pnl < 0) {
              totalLoss += Math.abs(pnl);
              losingTrades++;
            }

            const remainingQuantity = position.quantity - sellQuantity;
            if (remainingQuantity > 0) {
              positionMap.set(trade.symbol, { ...position, quantity: remainingQuantity });
            } else {
              positionMap.delete(trade.symbol);
            }
          }
        }
      });

    const totalTrades = winningTrades + losingTrades;
    const netProfit = totalProfit - totalLoss;

    const performance: MonthlyPerformance = {
      year,
      month,
      totalTrades,
      winningTrades,
      losingTrades,
      totalProfit,
      totalLoss,
      netProfit,
      winRate: totalTrades > 0 ? winningTrades / totalTrades : 0,
      profitFactor: totalLoss > 0 ? totalProfit / totalLoss : totalProfit > 0 ? Infinity : 0,
      maxDrawdown: 0, // TODO: 計算実装
      sharpeRatio: 0, // TODO: 計算実装
    };

    // 保存
    await this.saveMonthlyPerformance(performance);

    return performance;
  }

  /**
   * 月次パフォーマンスを保存
   */
  private async saveMonthlyPerformance(performance: MonthlyPerformance): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORES.PERFORMANCE], 'readwrite');
      const store = transaction.objectStore(STORES.PERFORMANCE);
      const request = store.put({
        ...performance,
        id: `${performance.year}-${String(performance.month).padStart(2, '0')}`,
      });

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * 月次パフォーマンスを取得
   */
  async getMonthlyPerformance(year: number, month: number): Promise<MonthlyPerformance | null> {
    await this.initialize();
    if (!this.db) throw new Error('Database not initialized');

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORES.PERFORMANCE], 'readonly');
      const store = transaction.objectStore(STORES.PERFORMANCE);
      const request = store.get(`${year}-${String(month).padStart(2, '0')}`);

      request.onsuccess = () => {
        resolve(request.result || null);
      };

      request.onerror = () => {
        reject(request.error);
      };
    });
  }

  /**
   * 全期間の月次パフォーマンスを取得
   */
  async getAllMonthlyPerformance(): Promise<MonthlyPerformance[]> {
    await this.initialize();
    if (!this.db) throw new Error('Database not initialized');

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORES.PERFORMANCE], 'readonly');
      const store = transaction.objectStore(STORES.PERFORMANCE);
      const request = store.getAll();

      request.onsuccess = () => {
        const results = request.result.sort((a, b) => {
          if (a.year !== b.year) return b.year - a.year;
          return b.month - a.month;
        });
        resolve(results);
      };

      request.onerror = () => reject(request.error);
    });
  }

  /**
   * ポジションを保存
   */
  async savePosition(position: Position): Promise<void> {
    await this.initialize();
    if (!this.db) throw new Error('Database not initialized');

    const storedPosition: StoredPosition = {
      ...position,
      id: position.symbol,
      updatedAt: Date.now(),
    };

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORES.POSITIONS], 'readwrite');
      const store = transaction.objectStore(STORES.POSITIONS);
      const request = store.put(storedPosition);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * ポジションを取得
   */
  async getPositions(): Promise<Position[]> {
    await this.initialize();
    if (!this.db) throw new Error('Database not initialized');

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORES.POSITIONS], 'readonly');
      const store = transaction.objectStore(STORES.POSITIONS);
      const request = store.getAll();

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * データをエクスポート
   */
  async exportData(): Promise<{
    trades: StoredTrade[];
    positions: StoredPosition[];
    performance: MonthlyPerformance[];
    exportDate: string;
  }> {
    const [{ trades }, positions, performance] = await Promise.all([
      this.getTrades(),
      this.getPositions(),
      this.getAllMonthlyPerformance(),
    ]);

    return {
      trades,
      positions,
      performance,
      exportDate: new Date().toISOString(),
    };
  }

  /**
   * データをインポート
   */
  async importData(data: {
    trades?: StoredTrade[];
    positions?: StoredPosition[];
    performance?: MonthlyPerformance[];
  }): Promise<void> {
    if (data.trades) {
      await this.saveTrades(data.trades);
    }

    if (data.positions) {
      for (const position of data.positions) {
        await this.savePosition(position);
      }
    }

    if (data.performance) {
      for (const perf of data.performance) {
        await this.saveMonthlyPerformance(perf);
      }
    }

    logger.info('Data import completed');
  }

  /**
   * 全データを削除
   */
  async clearAllData(): Promise<void> {
    await this.initialize();
    if (!this.db) throw new Error('Database not initialized');

    const stores = [STORES.TRADES, STORES.POSITIONS, STORES.PERFORMANCE];

    for (const storeName of stores) {
      await new Promise<void>((resolve, reject) => {
        const transaction = this.db!.transaction([storeName], 'readwrite');
        const store = transaction.objectStore(storeName);
        const request = store.clear();

        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      });
    }

    logger.info('All data cleared');
  }
}

// シングルトンインスタンス
export const indexedDBService = new IndexedDBService();
