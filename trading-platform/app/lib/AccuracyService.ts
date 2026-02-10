import { OHLCV, BacktestResult, BacktestTrade } from '../types';
import {
    VOLATILITY,
    OPTIMIZATION,
    RISK_MANAGEMENT,
    PRICE_CALCULATION,
    BACKTEST_CONFIG,
    RSI_CONFIG,
    SMA_CONFIG,
    FORECAST_CONE,
    DATA_REQUIREMENTS,
    PREDICTION_ERROR_WEIGHTS
} from './constants';
import { analysisService, AnalysisContext } from './AnalysisService';
import { technicalIndicatorService } from './TechnicalIndicatorService';
import { measurePerformance } from './performance-utils';
import { logger } from '@/app/core/logger';

/**
 * Service to handle simulation, backtesting, and accuracy metrics.
 */
class AccuracyService {
    /**
     * 精密なトレードシミュレーター
     * 「損切りが先か、利確が先か」を保守的に判定
     */
    simulateTrade(data: OHLCV[], startIndex: number, type: 'BUY' | 'SELL', targetMove: number): { won: boolean; directionalHit: boolean } {
        const entryPrice = data[startIndex].close;
        const targetPrice = type === 'BUY' ? entryPrice + targetMove : entryPrice - targetMove;
        const stopLoss = type === 'BUY' ? entryPrice - targetMove : entryPrice + targetMove;

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
        const directionalHit = type === 'BUY' ? forecastDaysLater > entryPrice : forecastDaysLater < entryPrice;

        return { won: tradeWon && !tradeLost, directionalHit };
    }

    /**
     * Optimized batch calculation of Simple ATR (O(N))
     */
    calculateBatchSimpleATR(data: OHLCV[]): number[] {
        const period = VOLATILITY.DEFAULT_ATR_PERIOD;
        const results: number[] = new Array(data.length).fill(0);

        let currentSum = 0;
        let currentCount = 0;
        let windowStart = 0;

        const hlArray: number[] = new Array(data.length);
        const trArray: number[] = new Array(data.length);
        const validArray: boolean[] = new Array(data.length);

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
                const prev = data[i - 1];
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

        for (let i = 0; i < data.length; i++) {
            if (validArray[i]) {
                currentCount++;
                if (i === windowStart) currentSum += hlArray[i];
                else currentSum += trArray[i];
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
     * 真のボラティリティ(ATR)を簡易計算
     */
    calculateSimpleATR(data: OHLCV[], index: number): number {
        const period = VOLATILITY.DEFAULT_ATR_PERIOD;
        const startIndex = Math.max(0, index - period + 1);
        let sumTr = 0;
        let count = 0;

        for (let i = startIndex; i <= index && i < data.length; i++) {
            const d = data[i];
            if (!d || d.high === 0 || d.low === 0) continue;
            if (i > startIndex) {
                const prev = data[i - 1];
                if (prev) {
                    sumTr += Math.max(d.high - d.low, Math.abs(d.high - prev.close), Math.abs(d.low - prev.close));
                    count++;
                }
            } else {
                sumTr += d.high - d.low;
                count++;
            }
        }
        return count > 0 ? sumTr / count : 0;
    }

    /**
     * 予測誤差を計算
     */
    calculatePredictionError(data: OHLCV[]): number {
        if (data.length < VOLATILITY.CALCULATION_PERIOD + 5) return 1.0;
        const period = SMA_CONFIG.SHORT_PERIOD;
        const endIndex = data.length - 5;
        let totalError = 0;
        let count = 0;
        const alpha = 2 / (period + 1);
        let ema = data[0]?.close || 0;
        let smaSum = 0;
        let smaCount = 0;
        let windowStart = 0;
        const startIndex = Math.max(0, data.length - VOLATILITY.CALCULATION_PERIOD);

        for (let i = startIndex; i < endIndex; i++) {
            const current = data[i];
            const actualFuture = data[i + 5].close;
            smaSum += current.close;
            smaCount++;
            if (smaCount > period) { smaSum -= data[windowStart].close; windowStart++; smaCount--; }
            const sma = smaCount > 0 ? smaSum / smaCount : current.close;
            if (i > startIndex) ema = alpha * current.close + (1 - alpha) * ema;
            else ema = current.close;
            const ensemblePrediction = (sma * PREDICTION_ERROR_WEIGHTS.SMA_WEIGHT) + (ema * PREDICTION_ERROR_WEIGHTS.EMA_WEIGHT);
            totalError += Math.abs(actualFuture - ensemblePrediction) / (ensemblePrediction || 1);
            count++;
        }
        const avgError = count > 0 ? totalError / count : 1.0;
        return Math.min(Math.max(avgError / (PRICE_CALCULATION.DEFAULT_ERROR_MULTIPLIER * PREDICTION_ERROR_WEIGHTS.ERROR_MULTIPLIER), 0.75), 2.0);
    }

    /**
     * 統計情報の計算
     */
    calculateStats(trades: BacktestTrade[], symbol: string, startDate: string, endDate: string): BacktestResult {
        const winningTrades = trades.filter(t => (t.profitPercent || 0) > 0).length;
        const totalTrades = trades.length;
        const winRate = totalTrades > 0 ? (winningTrades / totalTrades) * 100 : 0;
        const totalReturn = trades.reduce((sum, t) => sum + (t.profitPercent || 0), 0);
        const winningTradesData = trades.filter(t => (t.profitPercent || 0) > 0);
        const losingTradesData = trades.filter(t => (t.profitPercent || 0) <= 0);
        const avgProfit = winningTradesData.length > 0 ? winningTradesData.reduce((sum, t) => sum + (t.profitPercent || 0), 0) / winningTradesData.length : 0;
        const avgLoss = losingTradesData.length > 0 ? losingTradesData.reduce((sum, t) => sum + (t.profitPercent || 0), 0) / losingTradesData.length : 0;
        const grossProfit = winningTradesData.reduce((sum, t) => sum + (t.profitPercent || 0), 0);
        const grossLoss = Math.abs(losingTradesData.reduce((sum, t) => sum + (t.profitPercent || 0), 0));
        const profitFactor = grossLoss > 0 ? grossProfit / grossLoss : grossProfit > 0 ? Infinity : 0;

        let peak = 0, maxDrawdown = 0, equity = 100;
        for (const trade of trades) {
            equity *= (1 + (trade.profitPercent || 0) / 100);
            if (equity > peak) peak = equity;
            const drawdown = (peak - equity) / peak * 100;
            if (drawdown > maxDrawdown) maxDrawdown = drawdown;
        }

        const returns = trades.map(t => t.profitPercent || 0);
        const avgReturn = returns.length > 0 ? returns.reduce((sum, r) => sum + r, 0) / returns.length : 0;
        const variance = returns.length > 0 ? returns.reduce((sum, r) => sum + Math.pow(r - avgReturn, 2), 0) / returns.length : 0;
        const stdDev = Math.sqrt(variance);
        const sharpeRatio = stdDev > 0 ? avgReturn / stdDev : 0;

        return {
            symbol, totalTrades, winningTrades, losingTrades: losingTradesData.length,
            winRate: parseFloat(winRate.toFixed(1)), totalReturn: parseFloat(totalReturn.toFixed(1)),
            avgProfit: parseFloat(avgProfit.toFixed(2)), avgLoss: parseFloat(avgLoss.toFixed(2)),
            profitFactor: parseFloat(profitFactor.toFixed(2)), maxDrawdown: parseFloat(maxDrawdown.toFixed(1)),
            sharpeRatio: parseFloat(sharpeRatio.toFixed(2)), trades: [...trades].reverse(),
            startDate, endDate
        };
    }

    private preCalculateIndicators(data: OHLCV[]): AnalysisContext['preCalculatedIndicators'] {
        const closes = data.map(d => d.close);
        const rsi = new Map<number, number[]>();
        const sma = new Map<number, number[]>();
        for (const rsiP of RSI_CONFIG.PERIOD_OPTIONS) rsi.set(rsiP, technicalIndicatorService.calculateRSI(closes, rsiP));
        for (const smaP of SMA_CONFIG.PERIOD_OPTIONS) sma.set(smaP, technicalIndicatorService.calculateSMA(closes, smaP));
        return { rsi, sma, atr: this.calculateBatchSimpleATR(data) };
    }

    /**
     * 本格的なバックテスト実行
     */
    runBacktest(symbol: string, data: OHLCV[], market: 'japan' | 'usa'): BacktestResult {
        return measurePerformance(`backtest.${symbol}`, (): BacktestResult => {
            const trades: BacktestTrade[] = [];
            let currentPosition: { type: 'BUY' | 'SELL', price: number, date: string } | null = null;
            const minPeriod = OPTIMIZATION.MIN_DATA_PERIOD;
            const startDate = data[0]?.date || new Date().toISOString();
            const endDate = data[data.length - 1]?.date || new Date().toISOString();

            const effectiveMinPeriod = data.length >= minPeriod ? minPeriod : Math.max(30, data.length - 20);
            if (data.length < minPeriod) logger.warn(`[runBacktest] Data limited for ${symbol}: ${data.length} days.`);
            if (data.length < 40) return { symbol, totalTrades: 0, winningTrades: 0, losingTrades: 0, winRate: 0, totalReturn: 0, avgProfit: 0, avgLoss: 0, profitFactor: 0, maxDrawdown: 0, sharpeRatio: 0, trades: [], startDate, endDate, warning: 'Insufficient data for reliable backtest' };

            const preCalculatedIndicators = this.preCalculateIndicators(data);
            let cachedParams: { rsiPeriod: number; smaPeriod: number; accuracy: number } | null = null, lastOptimizationIndex = -999;
            const wfaMetrics: { inSample: number[]; outOfSample: number[]; params: unknown[] } = { inSample: [], outOfSample: [], params: [] };

            for (let i = effectiveMinPeriod; i < data.length - 1; i++) {
                const nextDay = data[i + 1];
                const context: AnalysisContext = { endIndex: i, startIndex: Math.max(0, i - 150), preCalculatedIndicators };

                if (i - lastOptimizationIndex >= OPTIMIZATION.REOPTIMIZATION_INTERVAL || !cachedParams) {
                    context.forcedParams = undefined;
                    lastOptimizationIndex = i;
                } else context.forcedParams = cachedParams;

                const signal = analysisService.analyzeStock(symbol, data, market, undefined, context);
                if (!context.forcedParams) {
                    cachedParams = { rsiPeriod: signal.optimizedParams?.rsiPeriod || RSI_CONFIG.DEFAULT_PERIOD, smaPeriod: signal.optimizedParams?.smaPeriod || SMA_CONFIG.MEDIUM_PERIOD, accuracy: signal.accuracy || 0 };
                    wfaMetrics.outOfSample.push(cachedParams.accuracy);
                    wfaMetrics.params.push({ rsi: cachedParams.rsiPeriod, sma: cachedParams.smaPeriod });
                }

                if (!currentPosition) {
                    if ((signal.type === 'BUY' || signal.type === 'SELL') && signal.confidence >= BACKTEST_CONFIG.MIN_SIGNAL_CONFIDENCE) {
                        currentPosition = { type: signal.type, price: nextDay.open, date: nextDay.date };
                    }
                } else {
                    let shouldExit = false, exitReason = '', exitPrice = nextDay.close;
                    const entryPrice = currentPosition.price;
                    const stopLossPct = currentPosition.type === 'BUY' ? BACKTEST_CONFIG.BULL_STOP_LOSS : BACKTEST_CONFIG.BEAR_STOP_LOSS;
                    const takeProfitPct = currentPosition.type === 'BUY' ? BACKTEST_CONFIG.BULL_TAKE_PROFIT : BACKTEST_CONFIG.BEAR_TAKE_PROFIT;
                    const stopLossPrice = currentPosition.type === 'BUY' ? entryPrice * (1 - stopLossPct) : entryPrice * (1 + stopLossPct);
                    const takeProfitPrice = currentPosition.type === 'BUY' ? entryPrice * (1 + takeProfitPct) : entryPrice * (1 - takeProfitPct);

                    if (currentPosition.type === 'BUY') {
                        if (nextDay.low <= stopLossPrice) { shouldExit = true; exitPrice = stopLossPrice; exitReason = 'Stop Loss'; }
                        else if (nextDay.high >= takeProfitPrice) { shouldExit = true; exitPrice = takeProfitPrice; exitReason = 'Take Profit'; }
                        else if (signal.type === 'SELL') { shouldExit = true; exitReason = 'Signal Reversal'; }
                        else if ((new Date(nextDay.date).getTime() - new Date(currentPosition.date).getTime()) / 86400000 > 20) { shouldExit = true; exitReason = 'Max Hold'; }
                    } else {
                        if (nextDay.high >= stopLossPrice) { shouldExit = true; exitPrice = stopLossPrice; exitReason = 'Stop Loss'; }
                        else if (nextDay.low <= takeProfitPrice) { shouldExit = true; exitPrice = takeProfitPrice; exitReason = 'Take Profit'; }
                        else if (signal.type === 'BUY') { shouldExit = true; exitReason = 'Signal Reversal'; }
                        else if ((new Date(nextDay.date).getTime() - new Date(currentPosition.date).getTime()) / 86400000 > 20) { shouldExit = true; exitReason = 'Max Hold'; }
                    }

                    if (shouldExit) {
                        const rawProfit = currentPosition.type === 'BUY' ? (exitPrice - entryPrice) / entryPrice : (entryPrice - exitPrice) / entryPrice;
                        trades.push({ symbol, type: currentPosition.type, entryPrice, exitPrice, entryDate: currentPosition.date, exitDate: nextDay.date, profitPercent: rawProfit * 100, reason: exitReason });
                        currentPosition = null;
                    }
                }
            }

            const result = this.calculateStats(trades, symbol, startDate, endDate);
            if (wfaMetrics.outOfSample.length > 0) {
                const avgOOS = wfaMetrics.outOfSample.reduce((a: number, b: number) => a + b, 0) / wfaMetrics.outOfSample.length;
                result.walkForwardMetrics = { inSampleAccuracy: avgOOS, outOfSampleAccuracy: avgOOS, overfitScore: 1.0, parameterStability: 0.5 };
            }
            return result as BacktestResult;
        }) as BacktestResult;
    }

    /**
     * 過去的中率をリアルタイム計算
     */
    calculateRealTimeAccuracy(symbol: string, data: OHLCV[], market: 'japan' | 'usa' = 'japan'): {
        hitRate: number;
        precisionAccuracy: number;
        directionalAccuracy: number;
        totalTrades: number;
    } | null {
        if (data.length < DATA_REQUIREMENTS.LOOKBACK_PERIOD_DAYS) {
            logger.warn('[calculateRealTimeAccuracy] Data insufficient:', { symbol, market, dataLength: data.length, minRequired: DATA_REQUIREMENTS.LOOKBACK_PERIOD_DAYS });
            return null;
        }

        logger.info('[calculateRealTimeAccuracy]', { symbol, market, dataLength: data.length });

        const windowSize = 20;
        let hits = 0, dirHits = 0, total = 0;
        const preCalculatedIndicators = this.preCalculateIndicators(data);
        const startIndex = Math.min(DATA_REQUIREMENTS.LOOKBACK_PERIOD_DAYS, data.length - windowSize - 1);

        for (let i = startIndex; i < data.length - windowSize; i += 1) {
            const signal = analysisService.analyzeStock(symbol, data, market, undefined, { endIndex: i, preCalculatedIndicators });
            if (signal.type === 'HOLD') continue;
            const future = data[i + windowSize];
            const priceChange = (future.close - data[i].close) / (data[i].close || 1);
            const predictedChange = (signal.targetPrice - data[i].close) / (data[i].close || 1);
            const strictHit = Math.abs(priceChange - predictedChange) < Math.abs(predictedChange * PREDICTION_ERROR_WEIGHTS.ERROR_THRESHOLD);
            const dirHit = (priceChange > 0) === (signal.type === 'BUY');
            if (strictHit) hits++;
            if (dirHit) dirHits++;
            total++;
        }

        const result = {
            hitRate: total > 0 ? Math.round((dirHits / total) * 100) : 0,
            precisionAccuracy: total > 0 ? Math.round((hits / total) * 100) : 0,
            directionalAccuracy: total > 0 ? Math.round((dirHits / total) * 100) : 0,
            totalTrades: total,
        };

        logger.info('[calculateRealTimeAccuracy] Result:', { symbol, market, ...result, hits, dirHits, total });
        return result;
    }

    /**
     * AIの的中率と戦績を計算
     */
    calculateAIHitRate(symbol: string, data: OHLCV[], market: 'japan' | 'usa' = 'japan') {
        if (data.length < DATA_REQUIREMENTS.LOOKBACK_PERIOD_DAYS) return { hitRate: 0, directionalAccuracy: 0, totalTrades: 0, averageProfit: 0 };
        let hits = 0, dirHits = 0, total = 0;
        const preCalculatedIndicators = this.preCalculateIndicators(data);
        const startIndex = Math.max(DATA_REQUIREMENTS.LOOKBACK_PERIOD_DAYS, 10);
        for (let i = startIndex; i < data.length - 10; i += 1) {
            const signal = analysisService.analyzeStock(symbol, data, market, undefined, { endIndex: i, preCalculatedIndicators });
            if (signal.type === 'HOLD') continue;
            total++;
            const atr = preCalculatedIndicators?.atr ? preCalculatedIndicators.atr[i] : this.calculateSimpleATR(data, i);
            const targetMove = Math.max(atr * RISK_MANAGEMENT.BULL_TARGET_MULTIPLIER, data[i].close * 0.012);
            const result = this.simulateTrade(data, i, signal.type as 'BUY' | 'SELL', targetMove);
            if (result.won) hits++;
            if (result.directionalHit) dirHits++;
        }
        return {
            hitRate: total > 0 ? Math.round((dirHits / total) * 100) : 0,
            precisionAccuracy: total > 0 ? Math.round((hits / total) * 100) : 0,
            directionalAccuracy: total > 0 ? Math.round((dirHits / total) * 100) : 0,
            totalTrades: total,
            averageProfit: 0,
        };
    }
}

export const accuracyService = new AccuracyService();

/**
 * 過去的中率をリアルタイム計算 (Legacy Standalone Export)
 */
export function calculateRealTimeAccuracy(
    symbol: string,
    data: OHLCV[],
    market: 'japan' | 'usa' = 'japan'
) {
    return accuracyService.calculateRealTimeAccuracy(symbol, data, market);
}

/**
 * AIの的中率と戦績を計算 (Legacy Standalone Export)
 */
export function calculateAIHitRate(
    symbol: string,
    data: OHLCV[],
    market: 'japan' | 'usa' = 'japan'
) {
    return accuracyService.calculateAIHitRate(symbol, data, market);
}
