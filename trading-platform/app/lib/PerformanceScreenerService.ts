/**
 * PerformanceScreenerService.ts
 * 
 * 全監視銘柄から最適な戦略を高速スキャンするサービス
 * - 直近3ヶ月のパフォーマンスを高速計算（O(N)）
 * - 複数銘柄を並列処理で効率的にスキャン
 * - 勝率・利益率・シャープレシオで総合評価
 */

import { OHLCV, BacktestResult, Signal, Stock } from '../types';
import { devLog, devWarn } from '@/app/lib/utils/dev-logger';
import { optimizedAccuracyService } from './OptimizedAccuracyService';
import { consensusSignalService } from './ConsensusSignalService';
import { mlPredictionService } from './mlPrediction';
import { technicalIndicatorService } from './TechnicalIndicatorService';
import { TIME_INTERVALS } from '@/app/constants/common';
import pLimit from 'p-limit';

const isDev = process.env.NODE_ENV !== 'production';



// レビュー対応: マジックナンバーを定数化
const MIN_DATA_REQUIRED = 50;  // 最低必要データ件数
const DUAL_SCORE_WEIGHT_PERF = 0.5;  // パフォーマンススコア重み
const DUAL_SCORE_WEIGHT_AI = 0.5;    // AI信頼度重み
const DUAL_SCORE_BONUS_BUY = 10;     // BUYボーナス
const DUAL_SCORE_BONUS_SELL = 5;     // SELLボーナス
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
  private scanCache: Map<string, { result: DualScanResult; timestamp: number }> = new Map();
  private readonly CACHE_TTL_MS = TIME_INTERVALS.CACHE_5_MIN;

  /**
   * キャッシュのクリア
   */
  clearCache(): void {
    this.cache.clear();
    this.scanCache.clear();
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
      minTrades = 5,
      market = 'all',
      topN = 20,
      lookbackDays = 90,
    } = config;

    // 市場でフィルタリング
    let filteredSources = dataSources.filter(ds =>
      market === 'all' || ds.market === market
    );

    // development環境では20銘柄に制限（レートリミット対策）

        if (isDev && filteredSources.length > 20) {
      filteredSources = filteredSources.slice(0, 20);
    }


    // 並列処理制限（Yahoo Financeのレートリミット考慮）
    const limit = pLimit(5);
    const allResults: PerformanceScore[] = [];

    // 並列実行
    await Promise.all(filteredSources.map(ds => limit(async () => {
      try {
        const result = await this.evaluateStock(ds, lookbackDays);
        if (result) {
          allResults.push(result);
        }
      } catch (error) {
        // 個別銘柄の評価失敗はログに記録して継続
        devWarn(`[PerformanceScreener] Failed to evaluate ${ds.symbol}:`, error);
      }
    })));

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
    config: ScreenerConfig & AIScreenerConfig = {},
    forceRefresh: boolean = false
  ): Promise<DualScanResult> {
    // スキャンレベルキャッシュ
    const cacheKey = `dual-${config.market || 'all'}-${config.lookbackDays || 90}-${config.minWinRate || 20}-${config.minProfitFactor || 0.8}-${config.minConfidence || 30}`;
    if (!forceRefresh) {
      const cached = this.scanCache.get(cacheKey);
      if (cached && Date.now() - cached.timestamp < this.CACHE_TTL_MS) {
        return cached.result;
      }
    }

    const startTime = performance.now();

    const {
      market = 'all',
      lookbackDays = 90,
      topN = 20,
      minWinRate = 20,
      minProfitFactor = 0.8,
      minConfidence = 30,
      minTrades = 3, // Revert to 3 (Valid backtest required)
      minDualScore = 30, // Revert to 30 (Require decent score)
      minPredictedChange = 0,
    } = config;

    // 市場フィルタリング
    let filteredSources = dataSources.filter(ds =>
      market === 'all' || ds.market === market
    );

    // 開発環境制限（デュアルスキャンでは50銘柄まで許可。母数が少ないとマッチが出にくい）
        if (isDev && filteredSources.length > 60) {
      filteredSources = filteredSources.slice(0, 60);
    }

    const performanceResults: PerformanceScore[] = [];
    const aiSignalResults: AISignalResult[] = [];
    const dualMatches: DualMatchEntry[] = [];
    const dualMatchSymbols: string[] = [];

    const limit = pLimit(5);

    await Promise.all(filteredSources.map(ds => limit(async () => {
      try {
        // 1回のデータ取得を共有
        const data = await ds.fetchData();
        if (data.length < MIN_DATA_REQUIRED) {
          return;
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
        const consensus = await consensusSignalService.generateConsensus(recentData);
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
        const mlSignal = await mlPredictionService.generateSignal(mockStock, recentData, mlPred, indicators);

        // シグナル統合ロジック (Hybrid Signal)
        // テクニカル分析とMLが一致する場合に信頼度をブースト
        let finalType = consensus.type;
        let finalConfidence = consensus.confidence;

        // HIGH CONFIDENCE ML OVERRIDE
        if (mlSignal.type === 'BUY' && mlSignal.confidence >= 60 &&
          consensus.type === 'SELL' && consensus.confidence < 50) {
          finalType = 'BUY';
          finalConfidence = mlSignal.confidence * 0.85; // Slight penalty for conflict
          consensus.reason = `[AI逆張り] テクニカルは弱気だがAIが強気 (${mlSignal.confidence.toFixed(0)}%)`;
        }
        else if (mlSignal.type === consensus.type) {
          finalConfidence = Math.min(finalConfidence + 10, 98);
        } else if (mlSignal.type !== 'HOLD' && consensus.type === 'HOLD') {
          finalType = mlSignal.type;
          finalConfidence = Math.max(mlSignal.confidence * 0.8, 40);
        }

        // AI結果の保存（BUYのみに限定せず、上位抽出用に全て保持）
        const atrs = technicalIndicatorService.calculateATR(recentData);
        const lastAtr = atrs[atrs.length - 1] || currentPrice * 0.02;
        const targetPrice = (mlSignal.type === finalType) ? mlSignal.targetPrice : (finalType === 'BUY' ? currentPrice + (lastAtr * 2) : currentPrice - (lastAtr * 2));
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

        // パフォーマンスタブ用
        if (perfScore.totalTrades >= minTrades) {
          performanceResults.push(perfScore);
        }

        // デュアルマッチ判定
        const buyBonus = finalType === 'BUY' ? DUAL_SCORE_BONUS_BUY : (finalType === 'SELL' ? DUAL_SCORE_BONUS_SELL : 0);
        const dualScore = (pScoreValue * DUAL_SCORE_WEIGHT_PERF) + (finalConfidence * DUAL_SCORE_WEIGHT_AI) + buyBonus;

        const isDualCandidate =
          dualScore >= minDualScore &&
          finalType === 'BUY' && // デュアルマッチは「買い」シグナルのみに限定
          (mlSignal.predictedChange || 0) >= minPredictedChange &&
          // ユーザー指定のフィルタを適用
          perfScore.winRate >= minWinRate &&
          perfScore.profitFactor >= minProfitFactor;

        devLog(`[DualMatch] ${ds.symbol}: perfScore=${pScoreValue.toFixed(1)}, aiType=${finalType}, aiConf=${finalConfidence.toFixed(1)}%, dualScore=${dualScore.toFixed(1)}, trades=${perfScore.totalTrades} → ${isDualCandidate ? '✅ MATCH' : '❌'}`);

        if (isDualCandidate) {
          // Promise並列実行中のpushは競合しない（JSシングルスレッド）が、念のため
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
        devWarn(`[PerformanceScreener] Dual scan failed for ${ds.symbol}:`, err);
      }
    })));

    // ソートとランキング
    performanceResults.sort((a, b) => b.performanceScore - a.performanceScore).forEach((r, i) => r.rank = i + 1);
    aiSignalResults.sort((a, b) => b.confidence - a.confidence).forEach((r, i) => r.rank = i + 1);
    dualMatches.sort((a, b) => (b.dualScore || 0) - (a.dualScore || 0));

    const scanDuration = performance.now() - startTime;
    const lastUpdated = new Date();

    const result: DualScanResult = {
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

    // キャッシュに保存
    this.scanCache.set(cacheKey, { result, timestamp: Date.now() });

    return result;
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
      devLog(`[PerformanceScreener] Cache hit for ${symbol}`);
      return cached.result;
    }

    // データ取得
    devLog(`[PerformanceScreener] Fetching data for ${symbol} (market: ${market}, lookbackDays: ${lookbackDays})`);
    const data = await fetchData();
    devLog(`[PerformanceScreener] Data fetched for ${symbol}: ${data.length} records (need ${lookbackDays})`);

    if (data.length < lookbackDays) {
      devWarn(`[PerformanceScreener] Insufficient data for ${symbol}: ${data.length} < ${lookbackDays}`);
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
    // トレード数が極端に少ない場合は段階的にペナルティ
    // 3回未満はスコア0（統計的に評価不能）
    if (result.totalTrades < 3) {
      return 0;
    }

    // 各指標を正規化（0-100）
    const winRateScore = Math.min(result.winRate, 100); // 0-100%

    const profitFactorScore = Math.min((result.profitFactor / 2) * 100, 100); // PF 2.0で満点

    const sharpeScore = Math.min(result.sharpeRatio * 50, 100); // シャープ2.0で満点

    const drawdownScore = Math.max(100 - result.maxDrawdown * 2, 0); // ドローダウン50%で0点

    // 重み付け合計
    let score =
      winRateScore * 0.30 +
      profitFactorScore * 0.30 +
      sharpeScore * 0.20 +
      drawdownScore * 0.20;

    // 統計的有意性のためのトレード数による段階的ペナルティ
    if (result.totalTrades < 5) {
      score *= 0.5; // 3-4回: 50%減（非常に低い信頼性）
    } else if (result.totalTrades < 10) {
      score *= 0.7; // 5-9回: 30%減（低信頼性）
    } else if (result.totalTrades < 15) {
      score *= 0.9; // 10-14回: 10%減（中信頼性）
    }

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
        if (isDev && filteredSources.length > 50) {
      filteredSources = filteredSources.slice(0, 50);
    }

    const allResults: AISignalResult[] = [];
    // Debug stats
    const debugStats = { total: 0, buy: 0, sell: 0, hold: 0 };
    let maxBuyConfidence = 0;
    let maxBuySymbol = '';

    const limitAISignals = pLimit(5);
    await Promise.all(filteredSources.map(ds => limitAISignals(async () => {
      try {
        // データ取得
        const data = await ds.fetchData();
        if (data.length < lookbackDays) {
          return;
        }
        const recentData = data.slice(-lookbackDays);

        // コンセンサスシグナル生成
        const consensus = await consensusSignalService.generateConsensus(recentData);

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
        const mlSignal = await mlPredictionService.generateSignal(mockStock, recentData, mlPred, indicators);

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
        devLog(`[AISignal] ${ds.symbol}: Tech=${consensus.type}(${consensus.confidence.toFixed(0)}%), ML=${mlSignal.type}(${mlSignal.confidence.toFixed(0)}%), Change=${mlSignal.predictedChange}%`);

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
        devWarn(`[PerformanceScreener] AI signal failed for ${ds.symbol}:`, error);
      }
    })));

    // Log debug summary
    devLog(`[AISignal Summary] Total scanned: ${debugStats.total}, BUY: ${debugStats.buy}, SELL: ${debugStats.sell}, HOLD: ${debugStats.hold}`);
    if (maxBuyConfidence > 0) {
      devLog(`[AISignal Max Confidence BUY] Symbol: ${maxBuySymbol}, Confidence: ${maxBuyConfidence.toFixed(1)}%`);
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
