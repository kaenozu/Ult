/**
 * PerformanceScreenerService.ts
 * 
 * 全監視銘柄から最適な戦略を高速スキャンするサービス
 * - 直近3ヶ月のパフォーマンスを高速計算（O(N)）
 * - 複数銘柄を並列処理で効率的にスキャン
 * - 勝率・利益率・シャープレシオで総合評価
 */

import { OHLCV, BacktestResult, Signal, Stock } from '../types';
import { optimizedAccuracyService } from './OptimizedAccuracyService';
import { consensusSignalService } from './ConsensusSignalService';
import { mlPredictionService } from './mlPrediction';

// レビュー対応: マジックナンバーを定数化
const MIN_DATA_REQUIRED = 50;  // 最低必要データ件数
const DUAL_SCORE_WEIGHT_PERF = 0.5;  // パフォーマンススコア重み
const DUAL_SCORE_WEIGHT_AI = 0.5;    // AI信頼度重み
const DUAL_SCORE_BONUS_BUY = 10;     // BUYボーナス
const DUAL_SCORE_BONUS_SELL = 5;     // SELLボーナス

/**
 * パフォーマンススコアリング結果
 */
// import { logger } from '@/app/core/logger'; // Temporarily disabled for debugging
// const logger = { warn: (...args: any[]) => console.warn('[PerformanceScreener]', ...args) };
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
export interface ScreenerResult<T = PerformanceScore> {
  results: T[];
  totalScanned: number;
  filteredCount: number;
  scanDuration: number;
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
 * AI Signal screening result
 */
export interface AISignalResult {
  symbol: string;
  name: string;
  market: 'japan' | 'usa';
  signalType: 'BUY' | 'SELL' | 'HOLD';
  confidence: number;           // 総合信頼度
  mlConfidence?: number;        // MLモデル独自の信頼度
  predictedChange?: number;     // 予測騰落率 (%)
  targetPrice: number;
  forecastCone?: Signal['forecastCone'];
  reason: string;
  rank?: number;
}

/**
 * デュアルスキャン結果の単一エントリ
 */
export interface DualMatchEntry {
  symbol: string;
  name: string;
  market: 'japan' | 'usa';
  performance: PerformanceScore;
  aiSignal: AISignalResult;
  dualScore?: number;
}

/**
 * デュアルスキャン結果
 */
export interface DualScanResult {
  performance: ScreenerResult<PerformanceScore>;
  aiSignals: ScreenerResult<AISignalResult>;
  dualMatches: DualMatchEntry[];
  dualMatchSymbols: string[];
}

/**
 * AI用スクリーニング設定
 */
export interface AIScreenerConfig {
  market?: 'japan' | 'usa' | 'all';
  topN?: number;
  lookbackDays?: number;
  minConfidence?: number;
  minDualScore?: number;
  minPredictedChange?: number;
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
  ): Promise<ScreenerResult<PerformanceScore>> {
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
    let filteredSources = dataSources.filter(ds =>
      market === 'all' || ds.market === market
    );

    // development環境では20銘柄に制限（レートリミット対策）
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const isDev = process.env.NODE_ENV !== 'production';
    if (isDev && filteredSources.length > 20) {
      filteredSources = filteredSources.slice(0, 20);
    }


    // バックテスト実行（直列処理でレートリミット回避）
    const allResults: PerformanceScore[] = [];

    for (let i = 0; i < filteredSources.length; i++) {
      const ds = filteredSources[i];

      try {
        const result = await this.evaluateStock(ds, lookbackDays);
        if (result) {
          allResults.push(result);
        }
      } catch (error) {
        // 個別銘柄の評価失敗はログに記録して継続
        console.warn(`[PerformanceScreener] Failed to evaluate ${ds.symbol}:`, error);
      }

      // 各リクエスト後に遅延（レートリミット対策）
      // テスト環境では遅延をスキップ
      if (i < filteredSources.length - 1) {
        const delayMs = process.env.JEST_WORKER_ID ? 0 : 1500;
        if (delayMs > 0) {
          await new Promise(resolve => setTimeout(resolve, delayMs));
        }
      }
    }

    // 最小トレード数でフィルタリング
    const minTradesFiltered = allResults.filter(r => r.totalTrades >= (minTrades || 0));

    // パフォーマンススコアでソート（降順）
    minTradesFiltered.sort((a, b) => b.performanceScore - a.performanceScore);

    // ランキング付与
    minTradesFiltered.forEach((result, index) => {
      result.rank = index + 1;
    });

    // 上位N件を取得
    const topResults = minTradesFiltered.slice(0, topN);

    const endTime = performance.now();
    const scanDuration = endTime - startTime;


    return {
      results: topResults,
      totalScanned: filteredSources.length,
      filteredCount: minTradesFiltered.length,
      scanDuration,
      lastUpdated: new Date(),
    } as ScreenerResult<PerformanceScore>;
  }

  /**
   * パフォーマンスとAIシグナルの両方を統合スキャン
   */
  async scanDual(
    dataSources: StockDataSource[],
    config: ScreenerConfig & AIScreenerConfig = {}
  ): Promise<DualScanResult> {
    const startTime = performance.now();

    const {
      market = 'all',
      lookbackDays = 90,
      topN = 20,
      minConfidence = 30,  // レビュー対応: UIと一貫性を持たせるため30に変更
      minTrades = 3,
      minDualScore = 30,
      minPredictedChange = 0,
    } = config;

    // 市場フィルタリング
    let filteredSources = dataSources.filter(ds =>
      market === 'all' || ds.market === market
    );

    // 開発環境制限（デュアルスキャンでは50銘柄まで許可。母数が少ないとマッチが出にくい）
    const isDev = process.env.NODE_ENV !== 'production';
    if (isDev && filteredSources.length > 50) {
      filteredSources = filteredSources.slice(0, 50);
    }

    const performanceResults: PerformanceScore[] = [];
    const aiSignalResults: AISignalResult[] = [];
    const dualMatches: DualMatchEntry[] = [];
    const dualMatchSymbols: string[] = [];

    // 診断カウンター
    // 診断カウンター（レビュー対応: passedAI未使用のため削除）
    let skipDataInsufficient = 0;
    let skipFetchError = 0;
    let skipLowTrades = 0;
    let passedPerf = 0;

    for (let i = 0; i < filteredSources.length; i++) {
      const ds = filteredSources[i];
      try {
        // 1回のデータ取得を共有
        // データ最低50件は必要。lookbackDaysに足りない場合はあるだけ使う
        const data = await ds.fetchData();
        if (data.length < MIN_DATA_REQUIRED) {
          skipDataInsufficient++;
          console.log(`[DualDiag] ${ds.symbol}: SKIP (data=${data.length} < min=${MIN_DATA_REQUIRED})`);
          continue;
        }
        const actualLookback = Math.min(data.length, lookbackDays);
        const recentData = data.slice(-actualLookback);

        // 1. パフォーマンス評価
        const backtestResult = await this.runFastBacktest(ds.symbol, recentData, ds.market);
        const pScoreValue = this.calculatePerformanceScore(backtestResult);

        const perfScore: PerformanceScore = {
          symbol: ds.symbol,
          name: ds.name,
          market: ds.market,
          winRate: backtestResult.winRate,
          totalReturn: backtestResult.totalReturn,
          profitFactor: backtestResult.profitFactor,
          sharpeRatio: backtestResult.sharpeRatio,
          maxDrawdown: backtestResult.maxDrawdown,
          totalTrades: backtestResult.totalTrades,
          performanceScore: pScoreValue,
          startDate: backtestResult.startDate,
          endDate: backtestResult.endDate,
        };

        // 2. AIシグナル評価
        const consensus = consensusSignalService.generateConsensus(recentData);
        const currentPrice = recentData[recentData.length - 1].close;
        const mockStock: Stock = {
          symbol: ds.symbol,
          name: ds.name,
          market: ds.market,
          sector: '不明',
          price: currentPrice,
          change: 0,
          changePercent: 0,
          volume: recentData[recentData.length - 1].volume,
        };

        const indicators = mlPredictionService.calculateIndicators(recentData);
        const mlPred = await mlPredictionService.predictAsync(mockStock, recentData, indicators);
        const mlSignal = mlPredictionService.generateSignal(mockStock, recentData, mlPred, indicators);

        let finalType = consensus.type;
        let finalConfidence = consensus.confidence;
        if (mlSignal.type === consensus.type) {
          finalConfidence = Math.min(finalConfidence + 10, 98);
        } else if (mlSignal.type !== 'HOLD' && consensus.type === 'HOLD') {
          finalType = mlSignal.type;
          finalConfidence = Math.max(mlSignal.confidence * 0.8, 40);
        }

        // AI結果の保存（BUYのみに限定せず、上位抽出用に全て保持）
        const targetPrice = (mlSignal.type === finalType) ? mlSignal.targetPrice : currentPrice * 1.05;
        let enhancedReason = consensus.reason;
        if (mlSignal.type === finalType) {
          const icon = finalType === 'BUY' ? '🚀' : '📉';
          enhancedReason = `${icon} AI予測 ${mlSignal.predictedChange}%: ${enhancedReason}`;
        }

        const aiResult: AISignalResult = {
          symbol: ds.symbol,
          name: ds.name,
          market: ds.market,
          signalType: finalType,
          confidence: finalConfidence,
          mlConfidence: mlSignal.confidence,
          predictedChange: mlSignal.predictedChange,
          targetPrice: targetPrice,
          forecastCone: mlSignal.forecastCone,
          reason: enhancedReason,
        };

        // パフォーマンスタブ用: 取引回数が十分な銘柄のみ
        if (perfScore.totalTrades >= minTrades) {
          passedPerf++;
          performanceResults.push(perfScore);
        } else {
          skipLowTrades++;
        }

        // デュアルマッチ判定: 全銘柄を対象に複合スコアで評価（取引数フィルタとは独立）
        // レビュー対応: マジックナンバーを定数化
        const buyBonus = finalType === 'BUY' ? DUAL_SCORE_BONUS_BUY : (finalType === 'SELL' ? DUAL_SCORE_BONUS_SELL : 0);
        const dualScore = (pScoreValue * DUAL_SCORE_WEIGHT_PERF) + (finalConfidence * DUAL_SCORE_WEIGHT_AI) + buyBonus;

        const isDualCandidate =
          dualScore >= minDualScore &&
          pScoreValue > 0 &&
          finalType !== 'HOLD' &&
          (mlSignal.predictedChange || 0) >= minPredictedChange;

        console.log(`[DualMatch] ${ds.symbol}: perfScore=${pScoreValue.toFixed(1)}, aiType=${finalType}, aiConf=${finalConfidence.toFixed(1)}%, dualScore=${dualScore.toFixed(1)}, trades=${perfScore.totalTrades} → ${isDualCandidate ? '✅ MATCH' : '❌'}`);

        if (isDualCandidate) {
          dualMatchSymbols.push(ds.symbol);
          dualMatches.push({
            symbol: ds.symbol,
            name: ds.name,
            market: ds.market,
            performance: perfScore,
            aiSignal: aiResult,
            dualScore,
          });
        }

        // AIシグナルは取引数フィルタとは独立して収集
        if (finalConfidence >= minConfidence) {
          aiSignalResults.push(aiResult);
        }
      } catch (err) {
        skipFetchError++;
        console.warn(`[PerformanceScreener] Dual scan failed for ${ds.symbol}:`, err);
      }

      // レートリミット
      if (i < filteredSources.length - 1) {
        const delayMs = process.env.JEST_WORKER_ID ? 0 : 800; // 統合スキャンなので少し短縮
        if (delayMs > 0) await new Promise(r => setTimeout(r, delayMs));
      }
    }

    // ソートとランキング
    performanceResults.sort((a, b) => b.performanceScore - a.performanceScore).forEach((r, i) => r.rank = i + 1);
    aiSignalResults.sort((a, b) => b.confidence - a.confidence).forEach((r, i) => r.rank = i + 1);
    dualMatches.sort((a, b) => (b.dualScore || 0) - (a.dualScore || 0));

    const scanDuration = performance.now() - startTime;
    const lastUpdated = new Date();

    // 診断サマリー
    console.error(`[DualDiag] === SCAN SUMMARY ===`);
    console.error(`[DualDiag] Total sources: ${filteredSources.length}`);
    console.error(`[DualDiag] Skipped (data insufficient): ${skipDataInsufficient}`);
    console.error(`[DualDiag] Skipped (low trades < ${minTrades}): ${skipLowTrades}`);
    console.error(`[DualDiag] Skipped (fetch error): ${skipFetchError}`);
    console.error(`[DualDiag] Passed performance filter: ${passedPerf}`);
    console.error(`[DualDiag] AI signals collected: ${aiSignalResults.length}`);
    console.error(`[DualDiag] Dual matches: ${dualMatches.length}`);
    console.error(`[DualDiag] Duration: ${scanDuration.toFixed(0)}ms`);

    return {
      performance: {
        results: performanceResults.slice(0, topN),
        totalScanned: filteredSources.length,
        filteredCount: performanceResults.length,
        scanDuration,
        lastUpdated,
      },
      aiSignals: {
        results: aiSignalResults.slice(0, topN),
        totalScanned: filteredSources.length,
        filteredCount: aiSignalResults.length,
        scanDuration,
        lastUpdated,
      },
      dualMatches,
      dualMatchSymbols,
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
    console.log(`[PerformanceScreener] Fetching data for ${symbol} (market: ${market}, lookbackDays: ${lookbackDays})`);
    const data = await fetchData();
    console.log(`[PerformanceScreener] Data fetched for ${symbol}: ${data.length} records (need ${lookbackDays})`);

    if (data.length < lookbackDays) {
      console.warn(`[PerformanceScreener] Insufficient data for ${symbol}: ${data.length} < ${lookbackDays}`);
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
   * - 勝率: 30%
   * - プロフィットファクター: 30%
   * - シャープレシオ: 20%
   * - ドローダウン: 20%
   */
  private calculatePerformanceScore(result: BacktestResult): number {
    // トレード数が少ない場合はペナルティ
    if (result.totalTrades < 3) {
      return 0;
    }

    // 各指標を正規化（0-100）
    const winRateScore = Math.min(result.winRate, 100); // 0-100%

    const profitFactorScore = Math.min((result.profitFactor / 2) * 100, 100); // PF 2.0で満点

    const sharpeScore = Math.min(result.sharpeRatio * 50, 100); // シャープ2.0で満点

    const drawdownScore = Math.max(100 - result.maxDrawdown * 2, 0); // ドローダウン50%で0点

    // 重み付け合計
    const score =
      winRateScore * 0.30 +
      profitFactorScore * 0.30 +
      sharpeScore * 0.20 +
      drawdownScore * 0.20;

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
    }) as ScreenerResult<PerformanceScore>;

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
    }) as ScreenerResult<PerformanceScore>;

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
    }) as ScreenerResult<PerformanceScore>;

    return result.results;
  }

  /**
   * 複数銘柄をAIシグナルモードでスキャン
   */
  async scanMultipleStocksForAISignals(
    dataSources: StockDataSource[],
    config: AIScreenerConfig = {}
  ): Promise<ScreenerResult<AISignalResult>> {
    const startTime = performance.now();

    const {
      market = 'all',
      topN = 20,
      lookbackDays = 90,
      minConfidence = 30,  // レビュー対応: UIと一貫性を持たせるため30に変更
    } = config;

    // 市場でフィルタリング
    let filteredSources = dataSources.filter(ds =>
      market === 'all' || ds.market === market
    );

    // development環境では50銘柄に制限
    const isDev = process.env.NODE_ENV !== 'production';
    if (isDev && filteredSources.length > 50) {
      filteredSources = filteredSources.slice(0, 50);
    }

    const allResults: AISignalResult[] = [];
    // Debug stats
    let debugStats = { total: 0, buy: 0, sell: 0, hold: 0 };
    let maxBuyConfidence = 0;
    let maxBuySymbol = '';

    for (let i = 0; i < filteredSources.length; i++) {
      const ds = filteredSources[i];

      try {
        // データ取得
        const data = await ds.fetchData();
        if (data.length < lookbackDays) {
          continue;
        }
        const recentData = data.slice(-lookbackDays);

        // コンセンサスシグナル生成
        const consensus = consensusSignalService.generateConsensus(recentData);

        // ML予測を実行 (Phase 1 Integration)
        const currentPrice = recentData[recentData.length - 1].close;
        const mockStock: Stock = {
          symbol: ds.symbol,
          name: ds.name,
          market: ds.market,
          sector: '不明',
          price: currentPrice,
          change: 0,
          changePercent: 0,
          volume: recentData[recentData.length - 1].volume,
        };

        const indicators = mlPredictionService.calculateIndicators(recentData);
        const mlPred = await mlPredictionService.predictAsync(mockStock, recentData, indicators);
        const mlSignal = mlPredictionService.generateSignal(mockStock, recentData, mlPred, indicators);

        // シグナル統合ロジック (Hybrid Signal)
        // テクニカル分析とMLが一致する場合に信頼度をブースト
        let finalType = consensus.type;
        let finalConfidence = consensus.confidence;

        // MLが強い確信を持っている場合はMLを優先、または信頼度を調整
        if (mlSignal.type === consensus.type) {
          finalConfidence = Math.min(finalConfidence + 10, 98);
        } else if (mlSignal.type !== 'HOLD' && consensus.type === 'HOLD') {
          // テクニカルが中立でもMLがシグナルを出している場合、弱めのシグナルとして採用
          finalType = mlSignal.type;
          finalConfidence = Math.max(mlSignal.confidence * 0.8, 40);
        }

        // Debug logging for each stock
        console.log(`[AISignal] ${ds.symbol}: Tech=${consensus.type}(${consensus.confidence.toFixed(0)}%), ML=${mlSignal.type}(${mlSignal.confidence.toFixed(0)}%), Change=${mlSignal.predictedChange}%`);

        // Update debug stats
        debugStats.total++;
        if (finalType === 'BUY') debugStats.buy++;
        else if (finalType === 'SELL') debugStats.sell++;
        else debugStats.hold++;

        // Track max confidence BUY
        if (finalType === 'BUY' && finalConfidence > maxBuyConfidence) {
          maxBuyConfidence = finalConfidence;
          maxBuySymbol = ds.symbol;
        }

        // フィルタ: BUYまたはSELLを採用、信頼度しきい値
        if ((finalType === 'BUY' || finalType === 'SELL') && finalConfidence >= minConfidence) {
          // 最適なターゲット価格を選択
          // SELLの場合はmlSignalのターゲットを使用、またはコンセンサスから変換
          const signal = consensusSignalService.convertToSignal(consensus, ds.symbol, recentData);
          const targetPrice = (mlSignal.type === finalType) ? mlSignal.targetPrice : signal.targetPrice;

          // 理由の強化
          let enhancedReason = consensus.reason;
          if (mlSignal.type === finalType) {
            const icon = finalType === 'BUY' ? '🚀' : '📉';
            const action = finalType === 'BUY' ? '上昇' : '下落';
            enhancedReason = `${icon} AI予測 ${mlSignal.predictedChange}% (${action}, 信頼度${mlSignal.confidence}%): ${enhancedReason}`;
          }

          const aiResult: AISignalResult = {
            symbol: ds.symbol,
            name: ds.name,
            market: ds.market,
            signalType: finalType,
            confidence: finalConfidence,
            mlConfidence: mlSignal.confidence,
            predictedChange: mlSignal.predictedChange,
            targetPrice: targetPrice,
            forecastCone: mlSignal.forecastCone,
            reason: enhancedReason,
          };

          allResults.push(aiResult);
        }
      } catch (error) {
        console.warn(`[PerformanceScreener] AI signal failed for ${ds.symbol}:`, error);
      }

      // 遅延
      if (i < filteredSources.length - 1) {
        const delayMs = process.env.JEST_WORKER_ID ? 0 : 1500;
        if (delayMs > 0) {
          await new Promise(resolve => setTimeout(resolve, delayMs));
        }
      }
    }

    // Log debug summary
    console.log(`[AISignal Summary] Total scanned: ${debugStats.total}, BUY: ${debugStats.buy}, SELL: ${debugStats.sell}, HOLD: ${debugStats.hold}`);
    if (maxBuyConfidence > 0) {
      console.log(`[AISignal Max Confidence BUY] Symbol: ${maxBuySymbol}, Confidence: ${maxBuyConfidence.toFixed(1)}%`);
    }

    // 信頼度でソート（降順）
    allResults.sort((a, b) => b.confidence - a.confidence);

    // ランキング付与
    allResults.forEach((result, index) => {
      result.rank = index + 1;
    });

    // 上位N件
    const topResults = allResults.slice(0, topN);

    const endTime = performance.now();
    const scanDuration = endTime - startTime;

    return {
      results: topResults,
      totalScanned: filteredSources.length,
      filteredCount: allResults.length,
      scanDuration,
      lastUpdated: new Date(),
    } as ScreenerResult<AISignalResult>;
  }
}

// シングルトンインスタンス
export const performanceScreenerService = new PerformanceScreenerService();
