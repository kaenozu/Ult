import { OHLCV, BacktestResult, Stock } from '../../types';
import { devLog, devWarn } from '@/app/lib/utils/dev-logger';
import { optimizedAccuracyService } from '../OptimizedAccuracyService';
import { consensusSignalService } from '../ConsensusSignalService';
import { mlPredictionService } from '../mlPrediction';
import { technicalIndicatorService } from '../TechnicalIndicatorService';
import { TIME_INTERVALS } from '@/app/constants/common';
import pLimit from 'p-limit';
import {
  PerformanceScore,
  ScreenerConfig,
  ScreenerResult,
  StockDataSource,
  AISignalResult,
  DualMatchEntry,
  DualScanResult,
  AIScreenerConfig,
  MIN_DATA_REQUIRED,
  DUAL_SCORE_WEIGHT_PERF,
  DUAL_SCORE_WEIGHT_AI,
  DUAL_SCORE_BONUS_BUY,
  DUAL_SCORE_BONUS_SELL,
} from './types';

const isDev = process.env.NODE_ENV !== 'production';

export class PerformanceScreenerService {
  private cache: Map<string, { result: PerformanceScore; timestamp: number }> = new Map();
  private scanCache: Map<string, { result: DualScanResult; timestamp: number }> = new Map();
  private readonly CACHE_TTL_MS = TIME_INTERVALS.CACHE_5_MIN;

  clearCache(): void {
    this.cache.clear();
    this.scanCache.clear();
  }

  async scanMultipleStocks(
    dataSources: StockDataSource[],
    config: ScreenerConfig = {}
  ): Promise<ScreenerResult<PerformanceScore>> {
    const startTime = performance.now();
    const { minTrades = 5, market = 'all', topN = 20, lookbackDays = 90 } = config;

    let filteredSources = dataSources.filter(ds =>
      market === 'all' || ds.market === market
    );

    if (isDev && filteredSources.length > 20) {
      filteredSources = filteredSources.slice(0, 20);
    }

    const limit = pLimit(5);
    const allResults: PerformanceScore[] = [];

    await Promise.all(filteredSources.map(ds => limit(async () => {
      try {
        const result = await this.evaluateStock(ds, lookbackDays);
        if (result) allResults.push(result);
      } catch (error) {
        devWarn(`[PerformanceScreener] Failed to evaluate ${ds.symbol}:`, error);
      }
    })));

    const minTradesFiltered = allResults.filter(r => r.totalTrades >= (minTrades || 0));
    minTradesFiltered.sort((a, b) => b.performanceScore - a.performanceScore);
    minTradesFiltered.forEach((result, index) => { result.rank = index + 1; });
    const topResults = minTradesFiltered.slice(0, topN);
    const scanDuration = performance.now() - startTime;

    return {
      results: topResults,
      totalScanned: filteredSources.length,
      filteredCount: minTradesFiltered.length,
      scanDuration,
      lastUpdated: new Date(),
    };
  }

  async scanDual(
    dataSources: StockDataSource[],
    config: ScreenerConfig & AIScreenerConfig = {},
    forceRefresh: boolean = false
  ): Promise<DualScanResult> {
    const cacheKey = `dual-${config.market || 'all'}-${config.lookbackDays || 90}-${config.minWinRate || 20}-${config.minProfitFactor || 0.8}-${config.minConfidence || 30}`;
    if (!forceRefresh) {
      const cached = this.scanCache.get(cacheKey);
      if (cached && Date.now() - cached.timestamp < this.CACHE_TTL_MS) return cached.result;
    }

    const startTime = performance.now();
    const {
      market = 'all', lookbackDays = 90, topN = 20, minWinRate = 20, minProfitFactor = 0.8,
      minConfidence = 30, minTrades = 3, minDualScore = 30, minPredictedChange = 0,
    } = config;

    let filteredSources = dataSources.filter(ds => market === 'all' || ds.market === market);
    if (isDev && filteredSources.length > 60) filteredSources = filteredSources.slice(0, 60);

    const performanceResults: PerformanceScore[] = [];
    const aiSignalResults: AISignalResult[] = [];
    const dualMatches: DualMatchEntry[] = [];
    const dualMatchSymbols: string[] = [];
    const limit = pLimit(5);

    await Promise.all(filteredSources.map(ds => limit(async () => {
      try {
        const data = await ds.fetchData();
        if (data.length < MIN_DATA_REQUIRED) return;
        const actualLookback = Math.min(data.length, lookbackDays);
        const recentData = data.slice(-actualLookback);

        const backtestResult = await this.runFastBacktest(ds.symbol, recentData, ds.market);
        const pScoreValue = this.calculatePerformanceScore(backtestResult);
        const perfScore: PerformanceScore = {
          symbol: ds.symbol, name: ds.name, market: ds.market,
          winRate: backtestResult.winRate, totalReturn: backtestResult.totalReturn,
          profitFactor: backtestResult.profitFactor, sharpeRatio: backtestResult.sharpeRatio,
          maxDrawdown: backtestResult.maxDrawdown, totalTrades: backtestResult.totalTrades,
          performanceScore: pScoreValue, startDate: backtestResult.startDate, endDate: backtestResult.endDate,
        };

        const consensus = await consensusSignalService.generateEnhancedConsensus(recentData);
        const currentPrice = recentData[recentData.length - 1].close;
        const mockStock: Stock = {
          symbol: ds.symbol, name: ds.name, market: ds.market, sector: '不明',
          price: currentPrice, change: 0, changePercent: 0, volume: recentData[recentData.length - 1].volume,
        };
        const indicators = mlPredictionService.calculateIndicators(recentData);
        const mlPred = await mlPredictionService.predictAsync(mockStock, recentData, indicators);
        const mlSignal = mlPredictionService.generateSignal(mockStock, recentData, mlPred, indicators);

        let finalType = consensus.type;
        let finalConfidence = consensus.confidence;
        if (mlSignal.type === 'BUY' && mlSignal.confidence >= 60 && consensus.type === 'SELL' && consensus.confidence < 50) {
          finalType = 'BUY';
          finalConfidence = mlSignal.confidence * 0.85;
          consensus.reason = `[AI逆張り] テクニカルは弱気だがAIが強気 (${mlSignal.confidence.toFixed(0)}%)`;
        } else if (mlSignal.type === consensus.type) {
          finalConfidence = Math.min(finalConfidence + 10, 98);
        } else if (mlSignal.type !== 'HOLD' && consensus.type === 'HOLD') {
          finalType = mlSignal.type;
          finalConfidence = Math.max(mlSignal.confidence * 0.8, 40);
        }

        const atrs = technicalIndicatorService.calculateATR(recentData);
        const lastAtr = atrs[atrs.length - 1] || currentPrice * 0.02;
        const targetPrice = (mlSignal.type === finalType) ? mlSignal.targetPrice : (finalType === 'BUY' ? currentPrice + (lastAtr * 2) : currentPrice - (lastAtr * 2));
        let enhancedReason = consensus.reason;
        if (mlSignal.type === finalType) {
          const icon = finalType === 'BUY' ? '🚀' : '📉';
          enhancedReason = `${icon} AI予測 ${mlSignal.predictedChange}%: ${enhancedReason}`;
        }

        const aiResult: AISignalResult = {
          symbol: ds.symbol, name: ds.name, market: ds.market, signalType: finalType,
          confidence: finalConfidence, mlConfidence: mlSignal.confidence, predictedChange: mlSignal.predictedChange,
          targetPrice, forecastCone: mlSignal.forecastCone, reason: enhancedReason,
        };

        if (perfScore.totalTrades >= minTrades) performanceResults.push(perfScore);

        const buyBonus = finalType === 'BUY' ? DUAL_SCORE_BONUS_BUY : (finalType === 'SELL' ? DUAL_SCORE_BONUS_SELL : 0);
        const dualScore = (pScoreValue * DUAL_SCORE_WEIGHT_PERF) + (finalConfidence * DUAL_SCORE_WEIGHT_AI) + buyBonus;
        const isDualCandidate = dualScore >= minDualScore && finalType === 'BUY' &&
          (mlSignal.predictedChange || 0) >= minPredictedChange &&
          perfScore.winRate >= minWinRate && perfScore.profitFactor >= minProfitFactor;

        devLog(`[DualMatch] ${ds.symbol}: perfScore=${pScoreValue.toFixed(1)}, aiType=${finalType}, aiConf=${finalConfidence.toFixed(1)}%, dualScore=${dualScore.toFixed(1)}, trades=${perfScore.totalTrades} → ${isDualCandidate ? '✅ MATCH' : '❌'}`);

        if (isDualCandidate) {
          dualMatchSymbols.push(ds.symbol);
          dualMatches.push({ symbol: ds.symbol, name: ds.name, market: ds.market, performance: perfScore, aiSignal: aiResult, dualScore });
        }
        if (finalConfidence >= minConfidence) aiSignalResults.push(aiResult);
      } catch (err) {
        devWarn(`[PerformanceScreener] Dual scan failed for ${ds.symbol}:`, err);
      }
    })));

    performanceResults.sort((a, b) => b.performanceScore - a.performanceScore).forEach((r, i) => r.rank = i + 1);
    aiSignalResults.sort((a, b) => b.confidence - a.confidence).forEach((r, i) => r.rank = i + 1);
    dualMatches.sort((a, b) => (b.dualScore || 0) - (a.dualScore || 0));

    const scanDuration = performance.now() - startTime;
    const lastUpdated = new Date();
    const result: DualScanResult = {
      performance: { results: performanceResults.slice(0, topN), totalScanned: filteredSources.length, filteredCount: performanceResults.length, scanDuration, lastUpdated },
      aiSignals: { results: aiSignalResults.slice(0, topN), totalScanned: filteredSources.length, filteredCount: aiSignalResults.length, scanDuration, lastUpdated },
      dualMatches, dualMatchSymbols,
    };
    this.scanCache.set(cacheKey, { result, timestamp: Date.now() });
    return result;
  }

  private async evaluateStock(dataSource: StockDataSource, lookbackDays: number): Promise<PerformanceScore | null> {
    const { symbol, name, market, fetchData } = dataSource;
    const cacheKey = `${symbol}:${lookbackDays}`;
    const cached = this.cache.get(cacheKey);
    if (cached && (Date.now() - cached.timestamp) < this.CACHE_TTL_MS) return cached.result;

    devLog(`[PerformanceScreener] Fetching data for ${symbol} (market: ${market}, lookbackDays: ${lookbackDays})`);
    const data = await fetchData();
    devLog(`[PerformanceScreener] Data fetched for ${symbol}: ${data.length} records (need ${lookbackDays})`);

    if (data.length < lookbackDays) {
      devWarn(`[PerformanceScreener] Insufficient data for ${symbol}: ${data.length} < ${lookbackDays}`);
      return null;
    }

    const recentData = data.slice(-lookbackDays);
    const backtestResult = await this.runFastBacktest(symbol, recentData, market);
    const performanceScore = this.calculatePerformanceScore(backtestResult);
    const result: PerformanceScore = {
      symbol, name, market, winRate: backtestResult.winRate, totalReturn: backtestResult.totalReturn,
      profitFactor: backtestResult.profitFactor, sharpeRatio: backtestResult.sharpeRatio,
      maxDrawdown: backtestResult.maxDrawdown, totalTrades: backtestResult.totalTrades,
      performanceScore, startDate: backtestResult.startDate, endDate: backtestResult.endDate,
    };
    this.cache.set(cacheKey, { result, timestamp: Date.now() });
    return result;
  }

  private async runFastBacktest(symbol: string, data: OHLCV[], market: 'japan' | 'usa'): Promise<BacktestResult> {
    return optimizedAccuracyService.runOptimizedBacktest(symbol, data, market);
  }

  private calculatePerformanceScore(result: BacktestResult): number {
    if (result.totalTrades < 3) return 0;
    const winRateScore = Math.min(result.winRate, 100);
    const profitFactorScore = Math.min((result.profitFactor / 2) * 100, 100);
    const sharpeScore = Math.min(result.sharpeRatio * 50, 100);
    const drawdownScore = Math.max(100 - result.maxDrawdown * 2, 0);
    let score = winRateScore * 0.30 + profitFactorScore * 0.30 + sharpeScore * 0.20 + drawdownScore * 0.20;
    if (result.totalTrades < 5) score *= 0.5;
    else if (result.totalTrades < 10) score *= 0.7;
    else if (result.totalTrades < 15) score *= 0.9;
    return parseFloat(score.toFixed(1));
  }

  async getBestPerformers(dataSources: StockDataSource[], market: 'japan' | 'usa', topN: number = 10): Promise<PerformanceScore[]> {
    const result = await this.scanMultipleStocks(dataSources, { market, topN, minTrades: 5 });
    return result.results;
  }

  async getHighWinRateStocks(dataSources: StockDataSource[], minWinRate: number = 60, topN: number = 10): Promise<PerformanceScore[]> {
    const result = await this.scanMultipleStocks(dataSources, { minWinRate, topN, minTrades: 10 });
    return result.results;
  }

  async getLowRiskHighReturnStocks(dataSources: StockDataSource[], maxDrawdown: number = 15, minProfitFactor: number = 2.0, topN: number = 10): Promise<PerformanceScore[]> {
    const result = await this.scanMultipleStocks(dataSources, { maxDrawdown, minProfitFactor, topN, minTrades: 10 });
    return result.results;
  }

  async scanMultipleStocksForAISignals(dataSources: StockDataSource[], config: AIScreenerConfig = {}): Promise<ScreenerResult<AISignalResult>> {
    const startTime = performance.now();
    const { market = 'all', topN = 20, lookbackDays = 90, minConfidence = 30 } = config;

    let filteredSources = dataSources.filter(ds => market === 'all' || ds.market === market);
    if (isDev && filteredSources.length > 50) filteredSources = filteredSources.slice(0, 50);

    const allResults: AISignalResult[] = [];
    const debugStats = { total: 0, buy: 0, sell: 0, hold: 0 };
    let maxBuyConfidence = 0, maxBuySymbol = '';
    const limitAISignals = pLimit(5);

    await Promise.all(filteredSources.map(ds => limitAISignals(async () => {
      try {
        const data = await ds.fetchData();
        if (data.length < lookbackDays) return;
        const recentData = data.slice(-lookbackDays);
        const consensus = await consensusSignalService.generateEnhancedConsensus(recentData);
        const currentPrice = recentData[recentData.length - 1].close;
        const mockStock: Stock = {
          symbol: ds.symbol, name: ds.name, market: ds.market, sector: '不明',
          price: currentPrice, change: 0, changePercent: 0, volume: recentData[recentData.length - 1].volume,
        };
        const indicators = mlPredictionService.calculateIndicators(recentData);
        const mlPred = await mlPredictionService.predictAsync(mockStock, recentData, indicators);
        const mlSignal = mlPredictionService.generateSignal(mockStock, recentData, mlPred, indicators);

        let finalType = consensus.type, finalConfidence = consensus.confidence;
        if (mlSignal.type === consensus.type) finalConfidence = Math.min(finalConfidence + 10, 98);
        else if (mlSignal.type !== 'HOLD' && consensus.type === 'HOLD') {
          finalType = mlSignal.type;
          finalConfidence = Math.max(mlSignal.confidence * 0.8, 40);
        }

        devLog(`[AISignal] ${ds.symbol}: Tech=${consensus.type}(${consensus.confidence.toFixed(0)}%), ML=${mlSignal.type}(${mlSignal.confidence.toFixed(0)}%), Change=${mlSignal.predictedChange}%`);
        debugStats.total++;
        if (finalType === 'BUY') debugStats.buy++;
        else if (finalType === 'SELL') debugStats.sell++;
        else debugStats.hold++;
        if (finalType === 'BUY' && finalConfidence > maxBuyConfidence) { maxBuyConfidence = finalConfidence; maxBuySymbol = ds.symbol; }

        if ((finalType === 'BUY' || finalType === 'SELL') && finalConfidence >= minConfidence) {
          const signal = consensusSignalService.convertToSignal(consensus, ds.symbol, recentData);
          const targetPrice = (mlSignal.type === finalType) ? mlSignal.targetPrice : signal.targetPrice;
          let enhancedReason = consensus.reason;
          if (mlSignal.type === finalType) {
            const icon = finalType === 'BUY' ? '🚀' : '📉';
            const action = finalType === 'BUY' ? '上昇' : '下落';
            enhancedReason = `${icon} AI予測 ${mlSignal.predictedChange}% (${action}, 信頼度${mlSignal.confidence}%): ${enhancedReason}`;
          }
          allResults.push({
            symbol: ds.symbol, name: ds.name, market: ds.market, signalType: finalType,
            confidence: finalConfidence, mlConfidence: mlSignal.confidence, predictedChange: mlSignal.predictedChange,
            targetPrice, forecastCone: mlSignal.forecastCone, reason: enhancedReason,
          });
        }
      } catch (error) {
        devWarn(`[PerformanceScreener] AI signal failed for ${ds.symbol}:`, error);
      }
    })));

    devLog(`[AISignal Summary] Total scanned: ${debugStats.total}, BUY: ${debugStats.buy}, SELL: ${debugStats.sell}, HOLD: ${debugStats.hold}`);
    if (maxBuyConfidence > 0) devLog(`[AISignal Max Confidence BUY] Symbol: ${maxBuySymbol}, Confidence: ${maxBuyConfidence.toFixed(1)}%`);

    allResults.sort((a, b) => b.confidence - a.confidence);
    allResults.forEach((result, index) => { result.rank = index + 1; });
    const topResults = allResults.slice(0, topN);

    return { results: topResults, totalScanned: filteredSources.length, filteredCount: allResults.length, scanDuration: performance.now() - startTime, lastUpdated: new Date() };
  }
}

export const performanceScreenerService = new PerformanceScreenerService();
