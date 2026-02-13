/**
 * useTradeHistory.ts
 * 
 * 取引履歴を管理するReact Hook
 * IndexedDBと連携してデータを永続化
 */

import { useState, useEffect, useCallback } from 'react';
import { Order } from '@/app/types';
import { indexedDBService, StoredTrade, MonthlyPerformance } from '../storage/IndexedDBService';
import { logger } from '@/app/core/logger';

export interface UseTradeHistoryReturn {
  trades: StoredTrade[];
  isLoading: boolean;
  error: Error | null;
  totalCount: number;
  monthlyPerformance: MonthlyPerformance[];
  
  // Actions
  saveTrade: (trade: Order) => Promise<void>;
  saveTrades: (trades: Order[]) => Promise<void>;
  refreshTrades: () => Promise<void>;
  getTradesBySymbol: (symbol: string) => Promise<StoredTrade[]>;
  getTradesByDateRange: (startDate: string, endDate: string) => Promise<StoredTrade[]>;
  exportData: () => Promise<string>;
  importData: (jsonData: string) => Promise<void>;
  clearAllData: () => Promise<void>;
}

export function useTradeHistory(): UseTradeHistoryReturn {
  const [trades, setTrades] = useState<StoredTrade[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [totalCount, setTotalCount] = useState(0);
  const [monthlyPerformance, setMonthlyPerformance] = useState<MonthlyPerformance[]>([]);

  // 初期化時にデータを読み込み
  useEffect(() => {
    const init = async () => {
      try {
        setIsLoading(true);
        await indexedDBService.initialize();
        await refreshTrades();
        await loadMonthlyPerformance();
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Failed to initialize'));
        logger.error('Failed to initialize trade history', err);
      } finally {
        setIsLoading(false);
      }
    };

    init();
  }, []);

  // 取引履歴を再読み込み
  const refreshTrades = useCallback(async () => {
    try {
      const result = await indexedDBService.getTrades({ limit: 100 });
      setTrades(result.trades);
      setTotalCount(result.totalCount);
    } catch (err) {
      logger.error('Failed to refresh trades', err);
      throw err;
    }
  }, []);

  // 月次パフォーマンスを読み込み
  const loadMonthlyPerformance = useCallback(async () => {
    try {
      const performance = await indexedDBService.getAllMonthlyPerformance();
      setMonthlyPerformance(performance);
    } catch (err) {
      logger.error('Failed to load monthly performance', err);
    }
  }, []);

  // 単一の取引を保存
  const saveTrade = useCallback(async (trade: Order) => {
    try {
      await indexedDBService.saveTrade(trade);
      await refreshTrades();
      logger.info('Trade saved successfully', { symbol: trade.symbol });
    } catch (err) {
      logger.error('Failed to save trade', err);
      throw err;
    }
  }, [refreshTrades]);

  // 複数の取引を保存
  const saveTrades = useCallback(async (newTrades: Order[]) => {
    try {
      await indexedDBService.saveTrades(newTrades);
      await refreshTrades();
      logger.info(`${newTrades.length} trades saved`);
    } catch (err) {
      logger.error('Failed to save trades', err);
      throw err;
    }
  }, [refreshTrades]);

  // 銘柄別の取引を取得
  const getTradesBySymbol = useCallback(async (symbol: string) => {
    try {
      const result = await indexedDBService.getTrades({ symbol });
      return result.trades;
    } catch (err) {
      logger.error('Failed to get trades by symbol', err);
      throw err;
    }
  }, []);

  // 日付範囲別の取引を取得
  const getTradesByDateRange = useCallback(async (startDate: string, endDate: string) => {
    try {
      const result = await indexedDBService.getTrades({ startDate, endDate });
      return result.trades;
    } catch (err) {
      logger.error('Failed to get trades by date range', err);
      throw err;
    }
  }, []);

  // データをエクスポート
  const exportData = useCallback(async (): Promise<string> => {
    try {
      const data = await indexedDBService.exportData();
      const jsonString = JSON.stringify(data, null, 2);
      logger.info('Data exported successfully');
      return jsonString;
    } catch (err) {
      logger.error('Failed to export data', err);
      throw err;
    }
  }, []);

  // データをインポート
  const importData = useCallback(async (jsonData: string) => {
    try {
      const data = JSON.parse(jsonData);
      await indexedDBService.importData(data);
      await refreshTrades();
      await loadMonthlyPerformance();
      logger.info('Data imported successfully');
    } catch (err) {
      logger.error('Failed to import data', err);
      throw err;
    }
  }, [refreshTrades, loadMonthlyPerformance]);

  // 全データを削除
  const clearAllData = useCallback(async () => {
    try {
      await indexedDBService.clearAllData();
      setTrades([]);
      setTotalCount(0);
      setMonthlyPerformance([]);
      logger.info('All data cleared');
    } catch (err) {
      logger.error('Failed to clear data', err);
      throw err;
    }
  }, []);

  return {
    trades,
    isLoading,
    error,
    totalCount,
    monthlyPerformance,
    saveTrade,
    saveTrades,
    refreshTrades,
    getTradesBySymbol,
    getTradesByDateRange,
    exportData,
    importData,
    clearAllData,
  };
}
