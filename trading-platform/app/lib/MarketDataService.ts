import { OHLCV } from '../types';
import { technicalIndicatorService } from './TechnicalIndicatorService';
import { logError } from '@/app/lib/errors';
import { dataQualityChecker, dataCompletionPipeline, dataLatencyMonitor } from './data';
import type { MarketData } from '@/app/types/data-quality';
import { CacheManager } from './api/CacheManager';

/**
 * 市場インデックスの定義
 * @property symbol - 銘柄シンボル（例: ^N225, ^GSPC）
 * @property name - 市場名
 * @property market - 市場区分（'japan' | 'usa'）
 */
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
 * 市場データ管理サービス
 * 
 * 市場データの取得、キャッシュ管理、相関分析、トレンド計算を担当するサービスクラス。
 * クライアントサイドで動作し、APIからのデータ取得とキャッシュ制御を行う。
 * 
 * @example
 * ```typescript
 * const service = new MarketDataService();
 * const data = await service.fetchMarketData('^N225');
 * const trend = service.calculateTrend(data);
 * ```
 */
export class MarketDataService {
  private marketDataCache = new CacheManager<OHLCV[]>({ ttl: 5 * 60 * 1000 }); // 5 minutes
  private qualityCheckEnabled = true;
  private dataCompletionEnabled = true;
  private latencyMonitoringEnabled = true;

  /**
   * 市場データを取得する
   * 
   * キャッシュが有効な場合はキャッシュから返却し、
   * 無効な場合はAPIから新規取得する。
   * 
   * @param symbol - 銘柄シンボル（例: '^N225', 'AAPL'）
   * @returns OHLCVデータ配列。エラー時は空配列を返す
   * @throws エラーは内部で捕捉され、空配列を返す
   * 
   * @example
   * ```typescript
   * const data = await marketDataService.fetchMarketData('^N225');
   * if (data.length > 0) {
   *   console.log(`取得データ数: ${data.length}`);
   * }
   * ```
   */
  async fetchMarketData(symbol: string): Promise<OHLCV[]> {
    // Check cache first
    const cached = this.marketDataCache.get(symbol);
    if (cached && cached.length > 0) {
      return cached;
    }

    try {
      const fetchStartTime = Date.now();
      const response = await fetch(`/api/market?type=history&symbol=${symbol}`);
      if (!response.ok) {
        throw new Error(`Failed to fetch market data: ${response.statusText}`);
      }

      const result = await response.json();
      if (result.success && result.data) {
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

        // Apply quality checks
        if (this.qualityCheckEnabled) {
          ohlcv = this.applyQualityChecks(symbol, ohlcv);
        }

        // Apply data completion
        if (this.dataCompletionEnabled) {
          const completionResult = await dataCompletionPipeline.complete(ohlcv, symbol);
          if (completionResult.success) {
            ohlcv = completionResult.data;
          }
        }

        // Cache the processed data
        this.marketDataCache.set(symbol, ohlcv);
        
        // Log fetch performance
        const fetchDuration = Date.now() - fetchStartTime;
        if (fetchDuration > 5000) {
          console.warn(`Slow market data fetch for ${symbol}: ${fetchDuration}ms`);
        }

        return ohlcv;
      }

      return [];
    } catch (error) {
      logError(error, `MarketDataService.fetchMarketData(${symbol})`);
      return [];
    }
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

      const marketData: MarketData = {
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
        console.warn(`Quality check failed for ${symbol} on ${item.date}:`, report.errors);
      }

      // Log warnings if any
      if (report.warnings.length > 0) {
        console.info(`Quality warnings for ${symbol} on ${item.date}:`, report.warnings);
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
      const data = await this.fetchMarketData(index.symbol);
      dataMap.set(index.symbol, data);
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
   *   console.log('上昇トレンド');
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
   *   console.log('市場と強い正の相関あり');
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
}

/**
 * MarketDataServiceのシングルトンインスタンス
 * 
 * アプリケーション全体で共有される市場データサービスインスタンス。
 */
export const marketDataService = new MarketDataService();