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
import { analysisService } from './AnalysisService';

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
     * Replicates the exact logic of calculateSimpleATR but faster.
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

        for (let i = 0; i < data.length; i++) {
            // Add new element i
            if (validArray[i]) {
                currentCount++;
                if (i === windowStart) {
                    currentSum += hlArray[i];
                } else {
                    currentSum += trArray[i];
                }
            }

            if (i - windowStart + 1 > period) {
                // Remove windowStart
                if (validArray[windowStart]) {
                    currentCount--;
                    currentSum -= hlArray[windowStart];
                }
                windowStart++;

                // Adjust the new windowStart to contribute HL instead of TR
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
                    const highLow = d.high - d.low;
                    const highClose = Math.abs(d.high - prev.close);
                    const lowClose = Math.abs(d.low - prev.close);
                    sumTr += Math.max(highLow, highClose, lowClose);
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
     * 予測誤差（Prediction Error）を計算
     * SMAとEMAのアンサンブルで精度向上
     */
    calculatePredictionError(data: OHLCV[]): number {
        if (data.length < VOLATILITY.CALCULATION_PERIOD + 5) return 1.0;
        const period = SMA_CONFIG.SHORT_PERIOD;
        const endIndex = data.length - 5;
        let totalError = 0;
        let count = 0;

        // EMA計算用のスムージング係数
        const alpha = 2 / (period + 1);
        let ema = data[0]?.close || 0;

        for (let i = Math.max(0, data.length - VOLATILITY.CALCULATION_PERIOD); i < endIndex; i++) {
            const current = data[i];
            const actualFuture = data[i + 5].close;

            // SMA計算
            let sma = 0;
            if (i >= period - 1) {
                let sum = 0;
                for (let j = i - period + 1; j <= i; j++) {
                    sum += data[j].close;
                }
                sma = sum / period;
            } else {
                sma = current.close;
            }

            // EMA計算
            if (i > 0) {
                ema = alpha * current.close + (1 - alpha) * ema;
            } else {
                ema = current.close;
            }

            // SMAとEMAのアンサンブル（加重平均）
            const ensemblePrediction = (sma * 0.4) + (ema * 0.6);

            totalError += Math.abs(actualFuture - ensemblePrediction) / (ensemblePrediction || 1);
            count++;
        }

        const avgError = count > 0 ? totalError / count : 1.0;
        // 予測誤差を少し厳しくして精度向上
        return Math.min(Math.max(avgError / (PRICE_CALCULATION.DEFAULT_ERROR_MULTIPLIER * 0.9), 0.75), 2.0);
    }

    /**
     * 統計情報の計算
     */
    calculateStats(trades: BacktestTrade[], symbol: string, startDate: string, endDate: string): BacktestResult {
        const winningTrades = trades.filter(t => t.profitPercent > 0).length;
        const losingTrades = trades.filter(t => t.profitPercent <= 0).length;
        const totalTrades = trades.length;
        const winRate = totalTrades > 0 ? (winningTrades / totalTrades) * 100 : 0;

        const totalReturn = trades.reduce((sum, t) => sum + t.profitPercent, 0);

        const winningTradesData = trades.filter(t => t.profitPercent > 0);
        const losingTradesData = trades.filter(t => t.profitPercent <= 0);
        const avgProfit = winningTradesData.length > 0
            ? winningTradesData.reduce((sum, t) => sum + t.profitPercent, 0) / winningTradesData.length
            : 0;
        const avgLoss = losingTradesData.length > 0
            ? losingTradesData.reduce((sum, t) => sum + t.profitPercent, 0) / losingTradesData.length
            : 0;

        const grossProfit = winningTradesData.reduce((sum, t) => sum + t.profitPercent, 0);
        const grossLoss = Math.abs(losingTradesData.reduce((sum, t) => sum + t.profitPercent, 0));
        const profitFactor = grossLoss > 0 ? grossProfit / grossLoss : grossProfit > 0 ? Infinity : 0;

        // Max Drawdown calculation
        let peak = 0;
        let maxDrawdown = 0;
        let equity = 100;

        for (const trade of trades) {
            equity *= (1 + trade.profitPercent / 100);
            if (equity > peak) peak = equity;
            const drawdown = (peak - equity) / peak * 100;
            if (drawdown > maxDrawdown) maxDrawdown = drawdown;
        }

        // Simplified Sharpe Ratio calculation (risk-free rate assumed 0)
        const returns = trades.map(t => t.profitPercent);
        const avgReturn = returns.length > 0 ? returns.reduce((sum, r) => sum + r, 0) / returns.length : 0;
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

    /**
     * 本格的なバックテスト実行
     */
    runBacktest(symbol: string, data: OHLCV[], market: 'japan' | 'usa'): BacktestResult {
        const trades: BacktestTrade[] = [];
        let currentPosition: { type: 'BUY' | 'SELL', price: number, date: string } | null = null;

        const minPeriod = OPTIMIZATION.MIN_DATA_PERIOD;
        const startDate = data[0]?.date || new Date().toISOString();
        const endDate = data[data.length - 1]?.date || new Date().toISOString();

        if (data.length < minPeriod) {
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

        for (let i = minPeriod; i < data.length - 1; i++) {
            const nextDay = data[i + 1];
            const historicalWindow = data.slice(Math.max(0, i - OPTIMIZATION.MIN_DATA_PERIOD + 10), i + 1);
            const signal = analysisService.analyzeStock(symbol, historicalWindow, market);

            if (!currentPosition) {
                if (signal.type === 'BUY' || signal.type === 'SELL') {
                    if (signal.confidence >= BACKTEST_CONFIG.MIN_SIGNAL_CONFIDENCE) {
                        currentPosition = {
                            type: signal.type,
                            price: nextDay.open,
                            date: nextDay.date
                        };
                    }
                }
            } else {
                let shouldExit = false;
                let exitReason = '';
                const change = (nextDay.close - currentPosition.price) / (currentPosition.price || 1);

                if (currentPosition.type === 'BUY') {
                    if (signal.type === 'SELL') {
                        shouldExit = true;
                        exitReason = 'Signal Reversal';
                    } else if (change > BACKTEST_CONFIG.BULL_TAKE_PROFIT) {
                        shouldExit = true;
                        exitReason = `Take Profit (+${BACKTEST_CONFIG.BULL_TAKE_PROFIT * 100}%)`;
                    } else if (change < -BACKTEST_CONFIG.BULL_STOP_LOSS) {
                        shouldExit = true;
                        exitReason = `Stop Loss (-${BACKTEST_CONFIG.BULL_STOP_LOSS * 100}%)`;
                    }
                } else {
                    if (signal.type === 'BUY') {
                        shouldExit = true;
                        exitReason = 'Signal Reversal';
                    } else if (change < -BACKTEST_CONFIG.BEAR_TAKE_PROFIT) {
                        shouldExit = true;
                        exitReason = `Take Profit (+${BACKTEST_CONFIG.BEAR_TAKE_PROFIT * 100}%)`;
                    } else if (change > BACKTEST_CONFIG.BEAR_STOP_LOSS) {
                        shouldExit = true;
                        exitReason = `Stop Loss (-${BACKTEST_CONFIG.BEAR_STOP_LOSS * 100}%)`;
                    }
                }

                if (shouldExit) {
                    const exitPrice = nextDay.close;
                    const rawProfit = currentPosition.type === 'BUY'
                        ? (exitPrice - currentPosition.price) / (currentPosition.price || 1)
                        : (currentPosition.price - exitPrice) / (currentPosition.price || 1);

                    trades.push({
                        symbol,
                        type: currentPosition.type,
                        entryPrice: currentPosition.price,
                        exitPrice: exitPrice,
                        entryDate: currentPosition.date,
                        exitDate: nextDay.date,
                        profitPercent: rawProfit * 100,
                        reason: exitReason
                    });
                    currentPosition = null;
                }
            }
        }

        return this.calculateStats(trades, symbol, startDate, endDate);
    }

    /**
     * 過去的中率をリアルタイム計算（スライディングウィンドウ型）
     * データ期間を252日（1年分）に拡大して精度向上
     */
    calculateRealTimeAccuracy(symbol: string, data: OHLCV[], market: 'japan' | 'usa' = 'japan'): {
        hitRate: number;
        directionalAccuracy: number;
        totalTrades: number;
    } | null {
        if (data.length < 252) return null;

        const windowSize = 20;
        let hits = 0;
        let dirHits = 0;
        let total = 0;

        for (let i = 252; i < data.length - windowSize; i += 5) {
            const window = data.slice(0, i);
            const signal = analysisService.analyzeStock(symbol, window, market);

            if (signal.type === 'HOLD') continue;

            const future = data[i + windowSize];
            const priceChange = (future.close - data[i].close) / (data[i].close || 1);
            const predictedChange = (signal.targetPrice - data[i].close) / (data[i].close || 1);

            // 判定基準を厳しく（50%→40%）して精度向上
            const hit = Math.abs(priceChange - predictedChange) < Math.abs(predictedChange * 0.4);
            const dirHit = (priceChange > 0) === (signal.type === 'BUY');

            if (hit) hits++;
            if (dirHit) dirHits++;
            total++;
        }

        return {
            hitRate: total > 0 ? Math.round((hits / total) * 100) : 0,
            directionalAccuracy: total > 0 ? Math.round((dirHits / total) * 100) : 0,
            totalTrades: total,
        };
    }

    /**
     * AIの的中率と戦績を計算（最適化パラメータを使用）
     * データ期間を252日（1年分）に拡大して精度向上
     */
    calculateAIHitRate(symbol: string, data: OHLCV[], market: 'japan' | 'usa' = 'japan') {
        if (data.length < 252) {
            return {
                hitRate: 0,
                directionalAccuracy: 0,
                totalTrades: 0,
                averageProfit: 0,
            };
        }

        let hits = 0;
        let dirHits = 0;
        let total = 0;
        const step = 3;

        for (let i = 100; i < data.length - 10; i += step) {
            const window = data.slice(0, i);
            const signal = analysisService.analyzeStock(symbol, window, market);

            if (signal.type === 'HOLD') continue;

            total++;
            const atr = this.calculateSimpleATR(data, i);
            const targetMove = Math.max(atr * RISK_MANAGEMENT.BULL_TARGET_MULTIPLIER, data[i].close * 0.012);

            const result = this.simulateTrade(data, i, signal.type as 'BUY' | 'SELL', targetMove);
            if (result.won) hits++;
            if (result.directionalHit) dirHits++;
        }

        return {
            hitRate: total > 0 ? Math.round((hits / total) * 100) : 0,
            directionalAccuracy: total > 0 ? Math.round((dirHits / total) * 100) : 0,
            totalTrades: total,
            averageProfit: 0,
        };
    }
}

export const accuracyService = new AccuracyService();
