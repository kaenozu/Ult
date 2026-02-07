/**
 * OptimizedAccuracyService.ts
 * 
 * バックテスト計算のパフォーマンス最適化版
 * - メモ化パターンによるパラメータキャッシュ
 * - インクリメンタル計算によるUIブロック防止
 * - Web Worker対応のための分離可能なロジック
 */

import { OHLCV, Signal, BacktestResult, BacktestTrade } from '../types';
import {
    VOLATILITY,
    OPTIMIZATION,
    RISK_MANAGEMENT,
    PRICE_CALCULATION,
    BACKTEST_CONFIG,
    RSI_CONFIG,
    SMA_CONFIG,
    FORECAST_CONE
} from './constants';
import { technicalIndicatorService } from './TechnicalIndicatorService';

// 最適化パラメータの型定義
interface OptimizedParams {
    rsiPeriod: number;
    smaPeriod: number;
    accuracy: number;
}

// キャッシュエントリの型
interface CacheEntry {
    params: OptimizedParams;
    timestamp: number;
    dataHash: string;
}

/**
 * データハッシュ生成（キャッシュキー用）
 * 最後の30日間の終値を使用して軽量なハッシュを生成
 */
function generateDataHash(data: OHLCV[]): string {
    const sampleSize = Math.min(30, data.length);
    const sample = data.slice(-sampleSize);
    return sample.map(d => d.close.toFixed(2)).join(',');
}

/**
 * パフォーマンス最適化されたバックテストサービス
 */
export class OptimizedAccuracyService {
    // パラメータキャッシュ（LRUキャッシュ）
    private paramCache = new Map<string, CacheEntry>();
    private readonly CACHE_MAX_SIZE = 50;
    private readonly CACHE_TTL_MS = 5 * 60 * 1000; // 5分

    // 事前計算済み指標のキャッシュ
    private indicatorCache = new Map<string, {
        rsi: Map<number, number[]>;
        sma: Map<number, number[]>;
        atr: number[];
    }>();

    /**
     * キャッシュのクリア（メモリ管理）
     */
    clearCache(): void {
        this.paramCache.clear();
        this.indicatorCache.clear();
    }

    /**
     * 古いキャッシュエントリの削除
     */
    private cleanExpiredCache(): void {
        const now = Date.now();
        for (const [key, entry] of this.paramCache.entries()) {
            if (now - entry.timestamp > this.CACHE_TTL_MS) {
                this.paramCache.delete(key);
            }
        }
    }

    /**
     * 最適化パラメータの取得（キャッシュ対応）
     * 計算量: O(1) - キャッシュヒット時
     * 計算量: O(P × Q × N) - キャッシュミス時（一度だけ実行）
     */
    getOptimizedParams(symbol: string, data: OHLCV[], market: 'japan' | 'usa'): OptimizedParams {
        // キャッシュキー生成
        const dataHash = generateDataHash(data);
        const cacheKey = `${symbol}:${market}:${dataHash}`;
        
        // キャッシュチェック
        const cached = this.paramCache.get(cacheKey);
        if (cached && (Date.now() - cached.timestamp) < this.CACHE_TTL_MS) {
            return cached.params;
        }

        // キャッシュミス: パラメータ最適化を実行
        const params = this.optimizeParameters(data, market);
        
        // キャッシュに保存
        this.paramCache.set(cacheKey, {
            params,
            timestamp: Date.now(),
            dataHash
        });

        // キャッシュサイズ制限（LRU）
        if (this.paramCache.size > this.CACHE_MAX_SIZE) {
            const firstKey = this.paramCache.keys().next().value;
            if (firstKey !== undefined) {
                this.paramCache.delete(firstKey);
            }
        }

        return params;
    }

    /**
     * パラメータ最適化（内部メソッド）
     * RSI/SMA期間の組み合わせを探索して最適なパラメータを見つける
     */
    private optimizeParameters(data: OHLCV[], market: 'japan' | 'usa'): OptimizedParams {
        if (data.length < OPTIMIZATION.REQUIRED_DATA_PERIOD) {
            return { 
                rsiPeriod: RSI_CONFIG.DEFAULT_PERIOD, 
                smaPeriod: SMA_CONFIG.MEDIUM_PERIOD, 
                accuracy: 0 
            };
        }

        let bestAccuracy = -1;
        let bestRsiPeriod: number = RSI_CONFIG.DEFAULT_PERIOD;
        let bestSmaPeriod: number = SMA_CONFIG.MEDIUM_PERIOD;

        const closes = data.map(d => d.close);
        
        // 事前計算: すべての期数のRSIとSMAを一度だけ計算
        const rsiCache = new Map<number, number[]>();
        const smaCache = new Map<number, number[]>();

        for (const rsiP of RSI_CONFIG.PERIOD_OPTIONS) {
            rsiCache.set(rsiP, technicalIndicatorService.calculateRSI(closes, rsiP));
        }
        for (const smaP of SMA_CONFIG.PERIOD_OPTIONS) {
            smaCache.set(smaP, technicalIndicatorService.calculateSMA(closes, smaP));
        }

        // ATRも事前計算
        const atrArray = this.calculateBatchSimpleATR(data);

        // すべての組み合わせを評価
        for (const rsiP of RSI_CONFIG.PERIOD_OPTIONS) {
            for (const smaP of SMA_CONFIG.PERIOD_OPTIONS) {
                const result = this.calculatePerformanceWithCachedIndicators(
                    data,
                    rsiP,
                    smaP,
                    closes,
                    atrArray,
                    rsiCache.get(rsiP)!,
                    smaCache.get(smaP)!
                );
                
                if (result.hitRate > bestAccuracy) {
                    bestAccuracy = result.hitRate;
                    bestRsiPeriod = rsiP;
                    bestSmaPeriod = smaP;
                }
            }
        }

        return { 
            rsiPeriod: bestRsiPeriod, 
            smaPeriod: bestSmaPeriod, 
            accuracy: bestAccuracy 
        };
    }

    /**
     * 事前計算済み指標を使用したパフォーマンス計算
     */
    private calculatePerformanceWithCachedIndicators(
        data: OHLCV[],
        rsiPeriod: number,
        smaPeriod: number,
        closes: number[],
        atrArray: number[],
        rsiValues: number[],
        smaValues: number[]
    ): { hitRate: number; total: number } {
        let hits = 0;
        let total = 0;
        const warmup = Math.max(rsiPeriod, smaPeriod) + 10;
        const step = 3; // スキップ間隔（計算量削減）

        for (let i = warmup; i < data.length - 10; i += step) {
            if (isNaN(rsiValues[i]) || isNaN(smaValues[i])) continue;

            let type: 'BUY' | 'SELL' | 'HOLD' = 'HOLD';
            if (closes[i] > smaValues[i] && rsiValues[i] < (RSI_CONFIG.OVERSOLD + 10)) {
                type = 'BUY';
            } else if (closes[i] < smaValues[i] && rsiValues[i] > RSI_CONFIG.OVERBOUGHT) {
                type = 'SELL';
            }

            if (type === 'HOLD') continue;

            total++;
            const atr = atrArray[i];
            const targetMove = Math.max(
                atr * RISK_MANAGEMENT.BULL_TARGET_MULTIPLIER, 
                closes[i] * 0.012
            );

            const result = this.simulateTrade(data, i, type, targetMove);
            if (result.won) hits++;
        }

        return {
            total,
            hitRate: total > 0 ? (hits / total) * 100 : 0,
        };
    }

    /**
     * バッチATR計算（O(N)）
     */
    private calculateBatchSimpleATR(data: OHLCV[]): number[] {
        const period = VOLATILITY.DEFAULT_ATR_PERIOD;
        const results: number[] = new Array(data.length).fill(0);
        
        let currentSum = 0;
        let currentCount = 0;
        let windowStart = 0;

        const hlArray: number[] = new Array(data.length);
        const trArray: number[] = new Array(data.length);
        const validArray: boolean[] = new Array(data.length);

        // 事前計算
        for (let i = 0; i < data.length; i++) {
            const d = data[i];
            if (!d || d.high === 0 || d.low === 0) {
                validArray[i] = false;
                hlArray[i] = 0;
                trArray[i] = 0;
                continue;
            }
            validArray[i] = true;
            hlArray[i] = d.high - d.low;

            if (i > 0) {
                const prev = data[i-1];
                if (prev) {
                    const highClose = Math.abs(d.high - prev.close);
                    const lowClose = Math.abs(d.low - prev.close);
                    trArray[i] = Math.max(hlArray[i], highClose, lowClose);
                } else {
                    trArray[i] = hlArray[i];
                }
            } else {
                trArray[i] = hlArray[i];
            }
        }

        // スライディングウィンドウでATR計算
        for (let i = 0; i < data.length; i++) {
            if (validArray[i]) {
                currentCount++;
                if (i === windowStart) {
                    currentSum += hlArray[i];
                } else {
                    currentSum += trArray[i];
                }
            }

            if (i - windowStart + 1 > period) {
                if (validArray[windowStart]) {
                    currentCount--;
                    currentSum -= hlArray[windowStart];
                }
                windowStart++;

                if (windowStart <= i && validArray[windowStart]) {
                    currentSum -= trArray[windowStart];
                    currentSum += hlArray[windowStart];
                }
            }

            results[i] = currentCount > 0 ? currentSum / currentCount : 0;
        }

        return results;
    }

    /**
     * トレードシミュレーション
     */
    private simulateTrade(
        data: OHLCV[], 
        startIndex: number, 
        type: 'BUY' | 'SELL', 
        targetMove: number
    ): { won: boolean; directionalHit: boolean } {
        const entryPrice = data[startIndex].close;
        const targetPrice = type === 'BUY' 
            ? entryPrice + targetMove 
            : entryPrice - targetMove;
        const stopLoss = type === 'BUY' 
            ? entryPrice - targetMove 
            : entryPrice + targetMove;

        let tradeWon = false;
        let tradeLost = false;
        const maxIndex = Math.min(startIndex + FORECAST_CONE.STEPS, data.length - 1);

        for (let j = startIndex + 1; j <= maxIndex; j++) {
            const day = data[j];
            if (!day || day.high === 0 || day.low === 0) break;

            if (type === 'BUY') {
                if (day.low <= stopLoss) { tradeLost = true; break; }
                if (day.high >= targetPrice) { tradeWon = true; break; }
            } else {
                if (day.high >= stopLoss) { tradeLost = true; break; }
                if (day.low <= targetPrice) { tradeWon = true; break; }
            }

            if (tradeWon && !tradeLost) break;
        }

        const forecastDaysLater = data[maxIndex]?.close || entryPrice;
        const directionalHit = type === 'BUY' 
            ? forecastDaysLater > entryPrice 
            : forecastDaysLater < entryPrice;

        return { won: tradeWon && !tradeLost, directionalHit };
    }

    /**
     * 最適化されたバックテスト実行
     * 計算量: O(N) - 線形時間（パラメータ最適化はキャッシュ）
     */
    runOptimizedBacktest(
        symbol: string, 
        data: OHLCV[], 
        market: 'japan' | 'usa'
    ): BacktestResult {
        const startTime = performance.now();
        
        // 1. 最適化パラメータの取得（キャッシュ対応）
        const optimizedParams = this.getOptimizedParams(symbol, data, market);
        
        // 2. 固定パラメータでバックテスト実行
        const result = this.runBacktestWithFixedParams(symbol, data, market, optimizedParams);
        
        const endTime = performance.now();
        
        return result;
    }

    /**
     * 固定パラメータでのバックテスト実行
     * 計算量: O(N) - 線形時間
     */
    private runBacktestWithFixedParams(
        symbol: string, 
        data: OHLCV[], 
        market: 'japan' | 'usa',
        params: OptimizedParams
    ): BacktestResult {
        const trades: BacktestTrade[] = [];
        let currentPosition: { type: 'BUY' | 'SELL', price: number, date: string } | null = null;

        const minPeriod = Math.max(params.rsiPeriod, params.smaPeriod) + 10;
        const startDate = data[0]?.date || new Date().toISOString();
        const endDate = data[data.length - 1]?.date || new Date().toISOString();

        if (data.length < minPeriod) {
            return this.createEmptyResult(symbol, startDate, endDate);
        }

        // 事前計算: すべての指標を一度だけ計算
        const closes = data.map(d => d.close);
        const rsiValues = technicalIndicatorService.calculateRSI(closes, params.rsiPeriod);
        const smaValues = technicalIndicatorService.calculateSMA(closes, params.smaPeriod);

        for (let i = minPeriod; i < data.length - 1; i++) {
            const nextDay = data[i + 1];
            
            // 事前計算済みの値を使用（O(1)）
            const currentRSI = rsiValues[i];
            const currentSMA = smaValues[i];
            const currentPrice = closes[i];
            
            // シグナル判定
            let signalType: 'BUY' | 'SELL' | 'HOLD' = 'HOLD';
            if (currentPrice > currentSMA && currentRSI < (RSI_CONFIG.OVERSOLD + 10)) {
                signalType = 'BUY';
            } else if (currentPrice < currentSMA && currentRSI > RSI_CONFIG.OVERBOUGHT) {
                signalType = 'SELL';
            }

            if (!currentPosition) {
                if (signalType === 'BUY' || signalType === 'SELL') {
                    currentPosition = {
                        type: signalType,
                        price: nextDay.open,
                        date: nextDay.date
                    };
                }
            } else {
                const change = (nextDay.close - currentPosition.price) / (currentPosition.price || 1);
                let shouldExit = false;
                let exitReason = '';

                if (currentPosition.type === 'BUY') {
                    if (signalType === 'SELL') {
                        shouldExit = true;
                        exitReason = 'Signal Reversal';
                    } else if (change > BACKTEST_CONFIG.BULL_TAKE_PROFIT) {
                        shouldExit = true;
                        exitReason = `Take Profit (+${(BACKTEST_CONFIG.BULL_TAKE_PROFIT * 100).toFixed(1)}%)`;
                    } else if (change < -BACKTEST_CONFIG.BULL_STOP_LOSS) {
                        shouldExit = true;
                        exitReason = `Stop Loss (-${(BACKTEST_CONFIG.BULL_STOP_LOSS * 100).toFixed(1)}%)`;
                    }
                } else {
                    if (signalType === 'BUY') {
                        shouldExit = true;
                        exitReason = 'Signal Reversal';
                    } else if (change < -BACKTEST_CONFIG.BEAR_TAKE_PROFIT) {
                        shouldExit = true;
                        exitReason = `Take Profit (+${(BACKTEST_CONFIG.BEAR_TAKE_PROFIT * 100).toFixed(1)}%)`;
                    } else if (change > BACKTEST_CONFIG.BEAR_STOP_LOSS) {
                        shouldExit = true;
                        exitReason = `Stop Loss (-${(BACKTEST_CONFIG.BEAR_STOP_LOSS * 100).toFixed(1)}%)`;
                    }
                }

                if (shouldExit) {
                    const exitPrice = nextDay.close;
                    const rawProfit = currentPosition.type === 'BUY'
                        ? (exitPrice - currentPosition.price) / (currentPosition.price || 1)
                        : (currentPosition.price - exitPrice) / (currentPosition.price || 1);

                    trades.push({
                        symbol,
                        entryDate: currentPosition.date,
                        exitDate: nextDay.date,
                        entryPrice: currentPosition.price,
                        exitPrice,
                        profitPercent: parseFloat((rawProfit * 100).toFixed(2)),
                        exitReason,
                        type: currentPosition.type
                    });

                    currentPosition = null;
                }
            }
        }

        return this.calculateStats(trades, symbol, startDate, endDate);
    }

    /**
     * 空の結果を生成
     */
    private createEmptyResult(symbol: string, startDate: string, endDate: string): BacktestResult {
        return {
            symbol,
            totalTrades: 0,
            winningTrades: 0,
            losingTrades: 0,
            winRate: 0,
            totalReturn: 0,
            avgProfit: 0,
            avgLoss: 0,
            profitFactor: 0,
            maxDrawdown: 0,
            sharpeRatio: 0,
            trades: [],
            startDate,
            endDate
        };
    }

    /**
     * 統計情報の計算
     */
    private calculateStats(
        trades: BacktestTrade[], 
        symbol: string, 
        startDate: string, 
        endDate: string
    ): BacktestResult {
        const winningTrades = trades.filter(t => (t.profitPercent || 0) > 0).length;
        const losingTrades = trades.filter(t => (t.profitPercent || 0) <= 0).length;
        const totalTrades = trades.length;
        const winRate = totalTrades > 0 ? (winningTrades / totalTrades) * 100 : 0;

        const totalReturn = trades.reduce((sum, t) => sum + (t.profitPercent || 0), 0);

        const winningTradesData = trades.filter(t => (t.profitPercent || 0) > 0);
        const losingTradesData = trades.filter(t => (t.profitPercent || 0) <= 0);
        
        const avgProfit = winningTradesData.length > 0
            ? winningTradesData.reduce((sum, t) => sum + (t.profitPercent || 0), 0) / winningTradesData.length
            : 0;
        const avgLoss = losingTradesData.length > 0
            ? losingTradesData.reduce((sum, t) => sum + (t.profitPercent || 0), 0) / losingTradesData.length
            : 0;

        const grossProfit = winningTradesData.reduce((sum, t) => sum + (t.profitPercent || 0), 0);
        const grossLoss = Math.abs(losingTradesData.reduce((sum, t) => sum + (t.profitPercent || 0), 0));
        const profitFactor = grossLoss > 0 
            ? grossProfit / grossLoss 
            : grossProfit > 0 
                ? Infinity 
                : 0;

        // Max Drawdown calculation
        let peak = 0;
        let maxDrawdown = 0;
        let equity = 100;

        for (const trade of trades) {
            equity *= (1 + (trade.profitPercent || 0) / 100);
            if (equity > peak) peak = equity;
            const drawdown = (peak - equity) / peak * 100;
            if (drawdown > maxDrawdown) maxDrawdown = drawdown;
        }

        // Simplified Sharpe Ratio
        const returns = trades.map(t => t.profitPercent || 0);
        const avgReturn = returns.length > 0 
            ? returns.reduce((sum, r) => sum + r, 0) / returns.length 
            : 0;
        const variance = returns.length > 0
            ? returns.reduce((sum, r) => sum + Math.pow(r - avgReturn, 2), 0) / returns.length
            : 0;
        const stdDev = Math.sqrt(variance);
        const sharpeRatio = stdDev > 0 ? avgReturn / stdDev : 0;

        return {
            symbol,
            totalTrades,
            winningTrades,
            losingTrades,
            winRate: parseFloat(winRate.toFixed(1)),
            totalReturn: parseFloat(totalReturn.toFixed(1)),
            avgProfit: parseFloat(avgProfit.toFixed(2)),
            avgLoss: parseFloat(avgLoss.toFixed(2)),
            profitFactor: parseFloat(profitFactor.toFixed(2)),
            maxDrawdown: parseFloat(maxDrawdown.toFixed(1)),
            sharpeRatio: parseFloat(sharpeRatio.toFixed(2)),
            trades: [...trades].reverse(),
            startDate,
            endDate
        };
    }
}

// シングルトンインスタンス
export const optimizedAccuracyService = new OptimizedAccuracyService();
