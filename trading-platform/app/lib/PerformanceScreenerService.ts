/**
 * PerformanceScreenerService.ts
 * 
 * 全監視銘柄から最適な戦略を高速スキャンするサービス
 * - 直近3ヶ月のパフォーマンスを高速計算（O(N)）
 * - 複数銘柄を並列処理で効率的にスキャン
 * - 勝率・利益率・シャープレシオで総合評価
 */

import { OHLCV, BacktestResult } from '../types';
import { optimizedAccuracyService } from './OptimizedAccuracyService';

/**
 * パフォーマンススコアリング結果
 */
export interface PerformanceScore {
  symbol: string;
  name: string;
  market: 'japan' | 'usa';
  
  // パフォーマンス指標
  winRate: number;              // 勝率 (%)
  totalReturn: number;          // 総利益 (%)
  profitFactor: number;         // プロフィットファクター
  sharpeRatio: number;          // シャープレシオ
  maxDrawdown: number;          // 最大ドローダウン (%)
  totalTrades: number;          // トレード回数
  
  // 総合スコア
  performanceScore: number;     // 0-100の総合評価スコア
  
  // ランキング
  rank?: number;
  
  // バックテスト期間
  startDate: string;
  endDate: string;
}

/**
 * スクリーニング設定
 */
export interface ScreenerConfig {
  // フィルター
  minWinRate?: number;          // 最小勝率 (%)
  minProfitFactor?: number;     // 最小プロフィットファクター
  minTrades?: number;           // 最小トレード数
  maxDrawdown?: number;         // 最大許容ドローダウン (%)
  
  // 市場フィルター
  market?: 'japan' | 'usa' | 'all';
  
  // 結果制限
  topN?: number;                // 上位N件を返す
  
  // 期間設定
  lookbackDays?: number;        // 評価期間（デフォルト: 90日 = 3ヶ月）
}

/**
 * スクリーニング結果
 */
export interface ScreenerResult {
  results: PerformanceScore[];
  totalScanned: number;
  filteredCount: number;
  scanDuration: number;         // スキャン時間（ミリ秒）
  lastUpdated: Date;
}

/**
 * 銘柄データソース（データ取得インターフェース）
 */
export interface StockDataSource {
  symbol: string;
  name: string;
  market: 'japan' | 'usa';
  fetchData: () => Promise<OHLCV[]>;
}

/**
 * パフォーマンススクリーナーサービス
 */
export class PerformanceScreenerService {
  private cache: Map<string, { result: PerformanceScore; timestamp: number }> = new Map();
  private readonly CACHE_TTL_MS = 5 * 60 * 1000; // 5分キャッシュ

  /**
   * キャッシュのクリア
   */
  clearCache(): void {
    this.cache.clear();
  }

  /**
   * 複数銘柄を並列スキャン
   * @param dataSources データソースの配列
   * @param config スクリーニング設定
   */
  async scanMultipleStocks(
    dataSources: StockDataSource[],
    config: ScreenerConfig = {}
  ): Promise<ScreenerResult> {
    const startTime = performance.now();
    
    // デフォルト設定
    const {
      minWinRate = 0,
      minProfitFactor = 0,
      minTrades = 5,
      maxDrawdown = 100,
      market = 'all',
      topN = 20,
      lookbackDays = 90,
    } = config;

    // 市場でフィルタリング
    const filteredSources = dataSources.filter(ds => 
      market === 'all' || ds.market === market
    );

    console.log(`[PerformanceScreener] Scanning ${filteredSources.length} stocks...`);

    // 並列でバックテスト実行（チャンクサイズで制御）
    const CHUNK_SIZE = 10;
    const allResults: PerformanceScore[] = [];

    for (let i = 0; i < filteredSources.length; i += CHUNK_SIZE) {
      const chunk = filteredSources.slice(i, i + CHUNK_SIZE);
      
      const chunkResults = await Promise.all(
        chunk.map(async (ds) => {
          try {
            return await this.evaluateStock(ds, lookbackDays);
          } catch (error) {
            console.warn(`Failed to evaluate ${ds.symbol}:`, error);
            return null;
          }
        })
      );

      // nullを除外して結果を追加
      allResults.push(...chunkResults.filter((r): r is PerformanceScore => r !== null));
    }

    // フィルタリング
    const filtered = allResults.filter(result => 
      result.winRate >= minWinRate &&
      result.profitFactor >= minProfitFactor &&
      result.totalTrades >= minTrades &&
      result.maxDrawdown <= maxDrawdown
    );

    // パフォーマンススコアでソート（降順）
    filtered.sort((a, b) => b.performanceScore - a.performanceScore);

    // ランキング付与
    filtered.forEach((result, index) => {
      result.rank = index + 1;
    });

    // 上位N件を取得
    const topResults = filtered.slice(0, topN);

    const endTime = performance.now();
    const scanDuration = endTime - startTime;

    console.log(`[PerformanceScreener] Scan completed in ${scanDuration.toFixed(0)}ms`);
    console.log(`[PerformanceScreener] Found ${filtered.length} stocks matching criteria`);

    return {
      results: topResults,
      totalScanned: filteredSources.length,
      filteredCount: filtered.length,
      scanDuration,
      lastUpdated: new Date(),
    };
  }

  /**
   * 単一銘柄の評価
   * @param dataSource データソース
   * @param lookbackDays 評価期間
   */
  private async evaluateStock(
    dataSource: StockDataSource,
    lookbackDays: number
  ): Promise<PerformanceScore | null> {
    const { symbol, name, market, fetchData } = dataSource;

    // キャッシュチェック
    const cacheKey = `${symbol}:${lookbackDays}`;
    const cached = this.cache.get(cacheKey);
    if (cached && (Date.now() - cached.timestamp) < this.CACHE_TTL_MS) {
      console.log(`[PerformanceScreener] Cache hit for ${symbol}`);
      return cached.result;
    }

    // データ取得
    const data = await fetchData();
    
    if (data.length < lookbackDays) {
      console.warn(`[PerformanceScreener] Insufficient data for ${symbol}: ${data.length} days`);
      return null;
    }

    // 直近N日分のデータを使用
    const recentData = data.slice(-lookbackDays);

    // 最適化されたバックテスト実行
    const backtestResult = await this.runFastBacktest(symbol, recentData, market);

    // パフォーマンススコア計算
    const performanceScore = this.calculatePerformanceScore(backtestResult);

    const result: PerformanceScore = {
      symbol,
      name,
      market,
      winRate: backtestResult.winRate,
      totalReturn: backtestResult.totalReturn,
      profitFactor: backtestResult.profitFactor,
      sharpeRatio: backtestResult.sharpeRatio,
      maxDrawdown: backtestResult.maxDrawdown,
      totalTrades: backtestResult.totalTrades,
      performanceScore,
      startDate: backtestResult.startDate,
      endDate: backtestResult.endDate,
    };

    // キャッシュに保存
    this.cache.set(cacheKey, {
      result,
      timestamp: Date.now(),
    });

    return result;
  }

  /**
   * 高速バックテスト実行（O(N)）
   */
  private async runFastBacktest(
    symbol: string,
    data: OHLCV[],
    market: 'japan' | 'usa'
  ): Promise<BacktestResult> {
    // OptimizedAccuracyServiceを使用して高速バックテスト
    return optimizedAccuracyService.runOptimizedBacktest(symbol, data, market);
  }

  /**
   * パフォーマンススコア計算（0-100）
   * 
   * 複数の指標を重み付けして総合評価
   * - 勝率: 40%
   * - プロフィットファクター: 30%
   * - シャープレシオ: 20%
   * - ドローダウン（逆数）: 10%
   */
  private calculatePerformanceScore(result: BacktestResult): number {
    // トレード数が少ない場合はペナルティ
    if (result.totalTrades < 5) {
      return 0;
    }

    // 各指標を正規化（0-100）
    const winRateScore = Math.min(result.winRate, 100); // 0-100%
    
    const profitFactorScore = Math.min((result.profitFactor / 3) * 100, 100); // 3.0で満点
    
    const sharpeScore = Math.min(Math.max((result.sharpeRatio + 1) * 25, 0), 100); // -1～3の範囲を0-100に
    
    const drawdownScore = Math.max(100 - result.maxDrawdown, 0); // ドローダウンが小さいほど高得点

    // 重み付け合計
    const score = 
      winRateScore * 0.40 +
      profitFactorScore * 0.30 +
      sharpeScore * 0.20 +
      drawdownScore * 0.10;

    return parseFloat(score.toFixed(1));
  }

  /**
   * 特定の市場で最高パフォーマンスの銘柄を取得
   */
  async getBestPerformers(
    dataSources: StockDataSource[],
    market: 'japan' | 'usa',
    topN: number = 10
  ): Promise<PerformanceScore[]> {
    const result = await this.scanMultipleStocks(dataSources, {
      market,
      topN,
      minTrades: 5,
    });

    return result.results;
  }

  /**
   * 高勝率銘柄を取得
   */
  async getHighWinRateStocks(
    dataSources: StockDataSource[],
    minWinRate: number = 60,
    topN: number = 10
  ): Promise<PerformanceScore[]> {
    const result = await this.scanMultipleStocks(dataSources, {
      minWinRate,
      topN,
      minTrades: 10,
    });

    return result.results;
  }

  /**
   * 低リスク高リターン銘柄を取得
   */
  async getLowRiskHighReturnStocks(
    dataSources: StockDataSource[],
    maxDrawdown: number = 15,
    minProfitFactor: number = 2.0,
    topN: number = 10
  ): Promise<PerformanceScore[]> {
    const result = await this.scanMultipleStocks(dataSources, {
      maxDrawdown,
      minProfitFactor,
      topN,
      minTrades: 10,
    });

    return result.results;
  }
}

// シングルトンインスタンス
export const performanceScreenerService = new PerformanceScreenerService();
