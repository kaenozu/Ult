import { OHLCV } from '../types';
import { technicalIndicatorService } from './TechnicalIndicatorService';
import { logError } from '@/app/lib/errors';
import { 
  dataQualityChecker, 
  dataCompletionPipeline, 
  dataLatencyMonitor,
  dataQualityValidator,
  dataPersistenceLayer,
  marketDataCache
} from './data';
import type { MarketData as QualityMarketData } from '@/app/types/data-quality';

import { IMarketDataService } from './interfaces/IMarketDataService';
import { TIME_INTERVALS } from './constants/common';
import { logger } from '@/app/core/logger';
export interface MarketIndex {
  symbol: string;
  name: string;
  market: 'japan' | 'usa';
}

/**
 * 市場データの構造
 * @property symbol - 銘柄シンボル
 * @property data - OHLCVデータ配列
 * @property trend - 現在のトレンド方向
 * @property changePercent - 変動率（%）
 */
export interface MarketData {
  symbol: string;
  data: OHLCV[];
  trend: 'UP' | 'DOWN' | 'NEUTRAL';
  changePercent: number;
}

/**
 * 相関分析データ
 * @property symbol - 銘柄シンボル
 * @property correlation - 相関係数（-1〜1）
 * @property beta - ベータ値
 * @property indexSymbol - インデックスシンボル
 * @property indexTrend - インデックスのトレンド
 * @property confidence - 信頼度（'low' | 'medium' | 'high'）
 */
export interface CorrelationData {
  symbol: string;
  correlation: number;
  beta: number;
  indexSymbol: string;
  indexTrend: 'UP' | 'DOWN' | 'NEUTRAL';
  confidence: 'low' | 'medium' | 'high';
}

/**
 * 主要市場インデックスの定義
 * 日本市場（日経225）と米国市場（S&P 500）をサポート
 */
export const MARKET_INDICES: MarketIndex[] = [
  { symbol: '^N225', name: '日経225', market: 'japan' },
  { symbol: '^GSPC', name: 'S&P 500', market: 'usa' },
];

/**
 * 市場データの取得結果
 * 成功時はデータ、失敗時はエラーメッセージを保持する
 */
export type MarketDataResult = {
  success: true;
  data: OHLCV[];
  source: 'cache' | 'persistence' | 'api';
} | {
  success: false;
  error: string;
  code: 'NETWORK_ERROR' | 'VALIDATION_ERROR' | 'NOT_FOUND' | 'INITIALIZATION_ERROR';
};

/**
 * 市場データ管理サービス
 * 
 * 市場データの取得、キャッシュ管理、相関分析、トレンド計算を担当するサービスクラス。
 * クライアントサイドで動作し、APIからのデータ取得とキャッシュ制御を行う。
 */
export class MarketDataService implements IMarketDataService {
  private marketDataCache = new Map<string, OHLCV[]>();
  private cacheTimeout = TIME_INTERVALS.CACHE_5_MIN;
  private qualityCheckEnabled = true;
  private dataCompletionEnabled = true;
  private latencyMonitoringEnabled = true;
  private persistenceEnabled = false; // Disabled by default until initialized
  private useSmartCache = true;
  private isInitialized = false;

  /**
   * 市場データを取得する
   * 
   * キャッシュが有効な場合はキャッシュから返却し、
   * 無効な場合はAPIから新規取得する。
   * 
   * @param symbol - 銘柄シンボル（例: '^N225', 'AAPL'）
   * @returns MarketDataResult
   */
  async fetchMarketData(symbol: string): Promise<MarketDataResult> {
    const now = Date.now();

    // 1. Try smart cache first
    if (this.useSmartCache) {
      const cacheKey = `market-data:${symbol}`;
      const cached = marketDataCache.get(cacheKey);
      if (cached) {
        return { success: true, data: cached as OHLCV[], source: 'cache' };
      }
    }

    // 2. Fallback to old cache
    const cached = this.marketDataCache.get(symbol);
    if (cached && cached.length > 0 && (now - new Date(cached[cached.length - 1].date).getTime()) < this.cacheTimeout) {
      return { success: true, data: cached, source: 'cache' };
    }

    // 3. Try to load from persistence layer
    if (this.persistenceEnabled) {
      try {
        const persisted = await dataPersistenceLayer.getOHLCV(symbol, {
          limit: 365,
          orderBy: 'desc'
        });
        if (persisted.length > 0) {
          const latestDate = new Date(persisted[0].date);
          const age = now - latestDate.getTime();
          
          if (age < this.cacheTimeout) {
            this.marketDataCache.set(symbol, persisted);
            if (this.useSmartCache) {
              marketDataCache.set(`market-data:${symbol}`, persisted as unknown);
            }
            return { success: true, data: persisted, source: 'persistence' };
          }
        }
      } catch (error) {
        logger.warn(`[MarketDataService] Failed to load persisted data:`, error);
      }
    }

    // 4. Fetch from API
    try {
      const fetchStartTime = Date.now();
      const response = await fetch(`/api/market?type=history&symbol=${symbol}`);

      if (!response.ok) {
        return {
          success: false,
          error: `API returned ${response.status}: ${response.statusText}`,
          code: 'NETWORK_ERROR'
        };
      }

      const result = await response.json();
      if (!result.success || !result.data) {
        return {
          success: false,
          error: result.error || 'No data returned from API',
          code: 'NOT_FOUND'
        };
      }

      let ohlcv = result.data.map((item: { date: string; open: string; high: string; low: string; close: string; volume: string | number }) => ({
        symbol,
        date: item.date,
        open: parseFloat(item.open),
        high: parseFloat(item.high),
        low: parseFloat(item.low),
        close: parseFloat(item.close),
        volume: parseFloat(String(item.volume)) || 0,
      }));

      // Record data latency
      if (this.latencyMonitoringEnabled && ohlcv.length > 0) {
        const latestDataTime = new Date(ohlcv[ohlcv.length - 1].date).getTime();
        dataLatencyMonitor.recordLatency(symbol, latestDataTime, Date.now(), 'api');
      }

      // Validation and cleaning
      if (this.qualityCheckEnabled) {
        ohlcv = this.applyEnhancedQualityChecks(symbol, ohlcv);
        if (ohlcv.length === 0) {
          return {
            success: false,
            error: 'Data failed quality validation checks',
            code: 'VALIDATION_ERROR'
          };
        }
      }

      // Apply data completion
      if (this.dataCompletionEnabled) {
        const completionResult = await dataCompletionPipeline.complete(ohlcv, symbol);
        if (completionResult.success) {
          ohlcv = completionResult.data;
        }
      }

      // Update caches
      this.marketDataCache.set(symbol, ohlcv);
      if (this.useSmartCache) {
        marketDataCache.set(`market-data:${symbol}`, ohlcv as unknown, this.cacheTimeout);
      }

      // Persist to IndexedDB
      if (this.persistenceEnabled) {
        try {
          await dataPersistenceLayer.saveOHLCV(ohlcv);
        } catch (error) {
          logger.warn(`[MarketDataService] Failed to persist data:`, error);
        }
      }

      // Log fetch performance
      const fetchDuration = Date.now() - fetchStartTime;
      if (fetchDuration > 5000) {
        logger.warn(`Slow market data fetch for ${symbol}: ${fetchDuration}ms`);
      }

      return { success: true, data: ohlcv, source: 'api' };
    } catch (error) {
      logError(error, `MarketDataService.fetchMarketData(${symbol})`);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error during fetch',
        code: 'NETWORK_ERROR'
      };
    }
  }

  /**
   * Apply enhanced quality checks using the new validator
   * 
   * @param symbol - Symbol for the data
   * @param ohlcv - OHLCV data array
   * @returns Filtered data array with only valid entries
   */
  private applyEnhancedQualityChecks(symbol: string, ohlcv: OHLCV[]): OHLCV[] {
    const validatedData: OHLCV[] = [];
    
    for (let i = 0; i < ohlcv.length; i++) {
      const item = ohlcv[i];
      const marketData: QualityMarketData = {
        symbol,
        timestamp: new Date(item.date).getTime(),
        ohlcv: item,
        previousClose: i > 0 ? ohlcv[i - 1].close : undefined,
        previousVolume: i > 0 ? ohlcv[i - 1].volume : undefined,
        source: 'api'
      };

      // Validate with new validator
      const report = dataQualityValidator.validate(marketData);
      
      if (report.isValid) {
        validatedData.push(item);
        
        // Update historical data for anomaly detection
        dataQualityValidator.updateHistoricalData(symbol, item);
      } else {
        logger.warn(`Quality check failed for ${symbol} on ${item.date}:`, report.errors);
      }

      // Log warnings
      if (report.warnings.length > 0) {
        logger.warn(`Quality warnings for ${symbol} on ${item.date}:`, report.warnings);
      }
    }

    return validatedData;
  }

  /**
   * Apply quality checks to market data
   * 
   * @param symbol - Symbol for the data
   * @param data - OHLCV data array
   * @returns Filtered data array with only valid entries
   */
  private applyQualityChecks(symbol: string, data: OHLCV[]): OHLCV[] {
    const validData: OHLCV[] = [];

    for (let i = 0; i < data.length; i++) {
      const item = data[i];
      const prevItem = i > 0 ? data[i - 1] : undefined;

      const marketData: QualityMarketData = {
        symbol,
        timestamp: new Date(item.date).getTime(),
        ohlcv: item,
        previousClose: prevItem?.close,
        previousVolume: prevItem?.volume,
        source: 'api'
      };

      const report = dataQualityChecker.check(marketData);
      
      if (report.isValid) {
        validData.push(item);
      } else {
        logger.warn(`Quality check failed for ${symbol} on ${item.date}:`, report.errors);
      }

      // Log warnings if any
      if (report.warnings.length > 0) {
        logger.info(`Quality warnings for ${symbol} on ${item.date}:`, report.warnings);
      }
    }

    return validData;
  }

  /**
   * キャッシュされた市場データを取得する
   * 
   * @param symbol - 銘柄シンボル
   * @returns キャッシュされたOHLCVデータ、存在しない場合はundefined
   */
  getCachedMarketData(symbol: string): OHLCV[] | undefined {
    return this.marketDataCache.get(symbol);
  }

  /**
   * すべての主要市場インデックスのデータを取得する
   * 
   * MARKET_INDICESに定義されたすべてのインデックスのデータを
   * 並列で取得してMapとして返す。
   * 
   * @returns シンボルをキーとするOHLCVデータのMap
   * @example
   * ```typescript
   * const allData = await service.getAllMarketData();
   * const n225Data = allData.get('^N225');
   * ```
   */
  async getAllMarketData(): Promise<Map<string, OHLCV[]>> {
    const dataMap = new Map<string, OHLCV[]>();

    for (const index of MARKET_INDICES) {
      const result = await this.fetchMarketData(index.symbol);
      if (result.success) {
        dataMap.set(index.symbol, result.data);
      }
    }

    return dataMap;
  }

  /**
   * トレンド方向を計算する
   * 
   * 短期SMA（10日）と長期SMA（50日）のゴールデンクロス/デッドクロス、
   * および現在価格との関係からトレンドを判定する。
   * 
   * @param data - OHLCVデータ配列（最低20データポイント必要）
   * @returns 'UP' | 'DOWN' | 'NEUTRAL'
   * 
   * @example
   * ```typescript
   * const trend = service.calculateTrend(ohlcvData);
   * if (trend === 'UP') {
   * }
   * ```
   */
  calculateTrend(data: OHLCV[]): 'UP' | 'DOWN' | 'NEUTRAL' {
    if (data.length < 20) return 'NEUTRAL';

    const closes = data.map(d => d.close);
    const shortSMA = technicalIndicatorService.calculateSMA(closes, 10);
    const longSMA = technicalIndicatorService.calculateSMA(closes, 50);

    const latestShort = shortSMA[shortSMA.length - 1];
    const latestLong = longSMA[longSMA.length - 1];
    const latestPrice = closes[closes.length - 1];

    if (latestShort > latestLong && latestPrice > latestShort) {
      return 'UP';
    } else if (latestShort < latestLong && latestPrice < latestShort) {
      return 'DOWN';
    }
    return 'NEUTRAL';
  }

  /**
   * 株価データと市場インデックスの相関係数を計算する
   * 
   * ピアソンの相関係数を使用し、-1（完全な負の相関）から
   * 1（完全な正の相関）の範囲で返す。
   * 
   * @param stockData - 個別銘柄のOHLCVデータ
   * @param indexData - 市場インデックスのOHLCVデータ
   * @returns 相関係数（-1〜1）。データ不足時は0
   * 
   * @example
   * ```typescript
   * const correlation = service.calculateCorrelation(stockData, indexData);
   * if (correlation > 0.7) {
   * }
   * ```
   */
  calculateCorrelation(stockData: OHLCV[], indexData: OHLCV[]): number {
    if (stockData.length < 50 || indexData.length < 50) {
      return 0;
    }

    const minLen = Math.min(stockData.length, indexData.length);
    const stockReturns: number[] = [];
    const indexReturns: number[] = [];

    for (let i = 1; i < minLen; i++) {
      const stockRet = (stockData[i].close - stockData[i - 1].close) / stockData[i - 1].close;
      const indexRet = (indexData[i].close - indexData[i - 1].close) / indexData[i - 1].close;
      stockReturns.push(stockRet);
      indexReturns.push(indexRet);
    }

    const avgStockRet = stockReturns.reduce((a, b) => a + b, 0) / stockReturns.length;
    const avgIndexRet = indexReturns.reduce((a, b) => a + b, 0) / indexReturns.length;

    let covarianceSum = 0;
    for (let i = 0; i < stockReturns.length; i++) {
      covarianceSum += (stockReturns[i] - avgStockRet) * (indexReturns[i] - avgIndexRet);
    }

    const covariance = covarianceSum / stockReturns.length;

    const stockVariance = stockReturns.reduce((sum, ret) => {
      return sum + Math.pow(ret - avgStockRet, 2);
    }, 0) / stockReturns.length;

    const indexVariance = indexReturns.reduce((sum, ret) => {
      return sum + Math.pow(ret - avgIndexRet, 2);
    }, 0) / indexReturns.length;

    const stockStd = Math.sqrt(stockVariance);
    const indexStd = Math.sqrt(indexVariance);

    if (indexStd === 0 || stockStd === 0) return 0;
    return covariance / (stockStd * indexStd);
  }

  /**
   * ベータ値を計算する
   * 
   * 個別銘柄の市場全体に対する感応度を示す指標。
   * β > 1: 市場よりも変動が大きい
   * β = 1: 市場と同じ変動
   * β < 1: 市場よりも変動が小さい
   * 
   * @param stockData - 個別銘柄のOHLCVデータ
   * @param indexData - 市場インデックスのOHLCVデータ
   * @returns ベータ値。データ不足時は0
   */
  calculateBeta(stockData: OHLCV[], indexData: OHLCV[]): number {
    const correlation = this.calculateCorrelation(stockData, indexData);

    const stockStd = this.calculateStd(stockData.map(d => d.close));
    const indexStd = this.calculateStd(indexData.map(d => d.close));

    if (indexStd === 0) return 0;
    return correlation * (stockStd / indexStd);
  }

  /**
   * 標準偏差を計算する
   * 
   * @param data - 数値配列
   * @returns 標準偏差。データ不足時は0
   */
  calculateStd(data: number[]): number {
    if (data.length < 2) return 0;

    const mean = data.reduce((sum, val) => sum + val, 0) / data.length;
    const variance = data.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / data.length;
    return Math.sqrt(variance);
  }

  /**
   * 相関分析の信頼度を判定する
   * 
   * データポイント数に基づいて信頼度を判定する。
   * - high: 1年分以上のデータ（252営業日）
   * - medium: 6ヶ月分以上のデータ（126営業日）
   * - low: 6ヶ月未満のデータ
   * 
   * @param dataLength - データポイント数
   * @returns 信頼度レベル（'low' | 'medium' | 'high'）
   */
  getCorrelationConfidence(dataLength: number): 'low' | 'medium' | 'high' {
    if (dataLength >= 252) return 'high';    // 1 year of daily data
    if (dataLength >= 126) return 'medium'; // 6 months
    return 'low';                             // < 6 months
  }

  /**
   * Enable or disable quality checking
   * 
   * @param enabled - Whether to enable quality checking
   */
  setQualityCheckEnabled(enabled: boolean): void {
    this.qualityCheckEnabled = enabled;
  }

  /**
   * Enable or disable data completion
   * 
   * @param enabled - Whether to enable data completion
   */
  setDataCompletionEnabled(enabled: boolean): void {
    this.dataCompletionEnabled = enabled;
  }

  /**
   * Enable or disable latency monitoring
   * 
   * @param enabled - Whether to enable latency monitoring
   */
  setLatencyMonitoringEnabled(enabled: boolean): void {
    this.latencyMonitoringEnabled = enabled;
  }

  /**
   * Get data quality report for cached data
   * 
   * @param symbol - Symbol to check
   * @returns Summary of data quality or null if no cached data
   */
  getDataQualityReport(symbol: string): {
    totalPoints: number;
    validPoints: number;
    completeness: number;
    freshness: string;
    avgLatency: number;
  } | null {
    const data = this.marketDataCache.get(symbol);
    if (!data || data.length === 0) {
      return null;
    }

    // Get completion stats
    const completionStats = dataCompletionPipeline.getStats(data);

    // Get freshness info
    const freshness = dataLatencyMonitor.checkFreshness(symbol);

    // Get latency stats
    const latencyStats = dataLatencyMonitor.getStats(symbol);

    return {
      totalPoints: data.length,
      validPoints: data.length,
      completeness: completionStats.completeness,
      freshness: freshness.staleness,
      avgLatency: latencyStats?.avgLatencyMs || 0
    };
  }

  /**
   * 市場データを取得する（getMarketDataエイリアス）
   * 
   * テスト互換性とMarketData構造での取得をサポート
   * 
   * @param symbol - 銘柄シンボル
   * @returns MarketData構造（symbol, data, trend, changePercent）
   */
  async getMarketData(symbol: string): Promise<MarketData> {
    const result = await this.fetchMarketData(symbol);
    const data = result.success ? result.data : [];
    const trend = data.length > 0 ? this.calculateTrend(data) : 'NEUTRAL';
    
    let changePercent = 0;
    if (data.length >= 2) {
      const firstClose = data[0].close;
      const lastClose = data[data.length - 1].close;
      changePercent = ((lastClose - firstClose) / firstClose) * 100;
    }
    
    return {
      symbol,
      data,
      trend,
      changePercent
    };
  }

  /**
   * キャッシュされた市場データを取得する（getCachedDataエイリアス）
   * 
   * @param symbol - 銘柄シンボル
   * @returns キャッシュされたMarketData、存在しない場合はundefined
   */
  getCachedData(symbol: string): MarketData | undefined {
    const data = this.getCachedMarketData(symbol);
    if (!data) return undefined;
    
    const trend = data.length > 0 ? this.calculateTrend(data) : 'NEUTRAL';
    let changePercent = 0;
    if (data.length >= 2) {
      const firstClose = data[0].close;
      const lastClose = data[data.length - 1].close;
      changePercent = ((lastClose - firstClose) / firstClose) * 100;
    }
    
    return {
      symbol,
      data,
      trend,
      changePercent
    };
  }

  /**
   * 日本市場のインデックスを取得する
   * 
   * @returns 日本市場のMarketIndex配列
   */
  getJapanMarketIndices(): MarketIndex[] {
    return MARKET_INDICES.filter(index => index.market === 'japan');
  }

  /**
   * 米国市場のインデックスを取得する
   * 
   * @returns 米国市場のMarketIndex配列
   */
  getUSAMarketIndices(): MarketIndex[] {
    return MARKET_INDICES.filter(index => index.market === 'usa');
  }

  /**
   * Get cache statistics
   */
  getCacheStats() {
    if (this.useSmartCache) {
      return marketDataCache.getStats();
    }
    return {
      hits: 0,
      misses: 0,
      hitRate: 0,
      size: this.marketDataCache.size,
      maxSize: 0,
      evictions: 0
    };
  }

  /**
   * Get persistence statistics
   */
  async getPersistenceStats() {
    if (this.persistenceEnabled) {
      try {
        return await dataPersistenceLayer.getStats();
      } catch (error) {
        logger.warn('[MarketDataService] Failed to get persistence stats:', error instanceof Error ? error : new Error(String(error)));
      }
    }
    return null;
  }

  /**
   * Create a backup of all persisted data
   */
  async createBackup() {
    if (this.persistenceEnabled) {
      try {
        return await dataPersistenceLayer.createBackup();
      } catch (error) {
        logger.error('[MarketDataService] Failed to create backup:', error instanceof Error ? error : new Error(String(error)));
        throw error;
      }
    }
    throw new Error('Persistence not enabled');
  }

  /**
   * Clear old data to free up space
   */
  async clearOldData(symbol: string, daysToKeep: number = 365) {
    if (this.persistenceEnabled) {
      try {
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);
        const beforeDate = cutoffDate.toISOString().split('T')[0];
        
        const deleted = await dataPersistenceLayer.deleteOldOHLCV(symbol, beforeDate);
        return deleted;
      } catch (error) {
        logger.error('[MarketDataService] Failed to clear old data:', error instanceof Error ? error : new Error(String(error)));
        throw error;
      }
    }
    return 0;
  }
}

/**
 * MarketDataServiceのシングルトンインスタンス
 * 
 * アプリケーション全体で共有される市場データサービスインスタンス。
 */
export const marketDataService = new MarketDataService();