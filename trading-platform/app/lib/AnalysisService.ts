import { OHLCV, Signal } from '../types';
import { technicalIndicatorService } from './TechnicalIndicatorService';
import { marketDataService } from './MarketDataService';
import { volumeAnalysisService } from './VolumeAnalysis';
import {
    FORECAST_CONE,
    RSI_CONFIG,
    SMA_CONFIG,
    OPTIMIZATION,
    SIGNAL_THRESHOLDS,
    RISK_MANAGEMENT,
    PRICE_CALCULATION,
    VOLATILITY
} from './constants';
import { accuracyService } from './AccuracyService';

/**
 * High-level orchestration service for stock analysis.
 */
class AnalysisService {
    private parameterCache = new Map<string, { rsiPeriod: number; smaPeriod: number; accuracy: number; dataHash: string }>();

    private generateDataHash(data: OHLCV[]): string {
        const lastData = data[data.length - 1];
        return `${data.length}-${lastData?.close || 0}-${lastData?.date || ''}`;
    }

    /**
     * 予測コーン（Forecast Cone）の計算
     */
    calculateForecastCone(data: OHLCV[]): Signal['forecastCone'] | undefined {
        if (data.length < FORECAST_CONE.LOOKBACK_DAYS) return undefined;

        const recentData = data.slice(-FORECAST_CONE.LOOKBACK_DAYS);
        const closes = recentData.map(d => d.close);
        const currentPrice = closes[closes.length - 1];

        const returns = [];
        for (let i = 1; i < closes.length; i++) {
            returns.push((closes[i] - closes[i - 1]) / (closes[i - 1] || 1));
        }

        const meanReturn = returns.reduce((a, b) => a + b, 0) / (returns.length || 1);
        const stdReturn = Math.sqrt(
            returns.reduce((sum, r) => sum + Math.pow(r - meanReturn, 2), 0) / (returns.length || 1)
        );

        const atr = (Math.max(...closes) - Math.min(...closes)) / (closes.length || 1);
        const volatility = stdReturn * Math.sqrt(FORECAST_CONE.STEPS);

        const bearishLower: number[] = [currentPrice];
        const bearishUpper: number[] = [currentPrice];
        const bullishLower: number[] = [currentPrice];
        const bullishUpper: number[] = [currentPrice];
        const base: number[] = [currentPrice];

        for (let i = 1; i <= FORECAST_CONE.STEPS; i++) {
            const basePrice = base[base.length - 1];
            const confidenceFactor = Math.sqrt(i / FORECAST_CONE.STEPS);
            const priceVariation = basePrice * volatility * confidenceFactor;

            const bearishFactor = 1 - (atr * 0.5 * confidenceFactor);
            const bullishFactor = 1 + (atr * 0.5 * confidenceFactor);

            bearishLower.push(Math.max(0, (basePrice - priceVariation * 1.5) * bearishFactor));
            bearishUpper.push((basePrice - priceVariation * 0.5) * bearishFactor);
            bullishLower.push((basePrice + priceVariation * 0.5) * bullishFactor);
            bullishUpper.push((basePrice + priceVariation * 1.5) * bullishFactor);
            base.push(basePrice * (1 + meanReturn));
        }

        const confidence = Math.min(
            100,
            Math.max(50, 100 - (volatility * 100 * 10))
        );

        return {
            bearish: { lower: bearishLower, upper: bearishUpper },
            bullish: { lower: bullishLower, upper: bullishUpper },
            base,
            confidence: parseFloat(confidence.toFixed(1)),
        };
    }

    /**
     * 銘柄ごとに的中率が最大化するパラメータを探索
     * 結果をメモ化して計算量を削減
     */
    optimizeParameters(data: OHLCV[], market: 'japan' | 'usa', skipCache: boolean = false): {
        rsiPeriod: number;
        smaPeriod: number;
        accuracy: number;
    } {
        const dataHash = this.generateDataHash(data);
        const cacheKey = `${market}-${dataHash}`;

        if (!skipCache && this.parameterCache.has(cacheKey)) {
            return this.parameterCache.get(cacheKey)!;
        }
        if (data.length < OPTIMIZATION.REQUIRED_DATA_PERIOD) {
            return { rsiPeriod: RSI_CONFIG.DEFAULT_PERIOD, smaPeriod: SMA_CONFIG.MEDIUM_PERIOD, accuracy: 0 };
        }

        let bestAccuracy = -1;
        let bestRsiPeriod = RSI_CONFIG.DEFAULT_PERIOD;
        let bestSmaPeriod = SMA_CONFIG.MEDIUM_PERIOD;

        const closes = data.map(d => d.close);
        const rsiCache = new Map<number, number[]>();
        const smaCache = new Map<number, number[]>();

        for (const rsiP of RSI_CONFIG.PERIOD_OPTIONS) {
            rsiCache.set(rsiP, technicalIndicatorService.calculateRSI(closes, rsiP));
        }
        for (const smaP of SMA_CONFIG.PERIOD_OPTIONS) {
            smaCache.set(smaP, technicalIndicatorService.calculateSMA(closes, smaP));
        }

        for (const rsiP of RSI_CONFIG.PERIOD_OPTIONS) {
            for (const smaP of SMA_CONFIG.PERIOD_OPTIONS) {
                const result = this.internalCalculatePerformance(
                    data,
                    rsiP,
                    smaP,
                    closes,
                    rsiCache.get(rsiP),
                    smaCache.get(smaP)
                );
                if (result.hitRate > bestAccuracy) {
                    bestAccuracy = result.hitRate;
                    bestRsiPeriod = rsiP;
                    bestSmaPeriod = smaP;
                }
            }
        }

        const result = { rsiPeriod: bestRsiPeriod, smaPeriod: bestSmaPeriod, accuracy: bestAccuracy };
        this.parameterCache.set(cacheKey, { ...result, dataHash });
        return result;
    }

    private internalCalculatePerformance(
        data: OHLCV[],
        rsiP: number,
        smaP: number,
        closes: number[],
        preCalcRsi?: number[],
        preCalcSma?: number[]
    ): { hitRate: number; total: number } {
        let hits = 0;
        let total = 0;
        const warmup = 100;
        const step = 3;
        const rsi = preCalcRsi || technicalIndicatorService.calculateRSI(closes, rsiP);
        const sma = preCalcSma || technicalIndicatorService.calculateSMA(closes, smaP);

        for (let i = warmup; i < data.length - 10; i += step) {
            if (isNaN(rsi[i]) || isNaN(sma[i])) continue;

            let type: 'BUY' | 'SELL' | 'HOLD' = 'HOLD';
            if (closes[i] > sma[i] && rsi[i] < (RSI_CONFIG.OVERSOLD + 10)) type = 'BUY';
            else if (closes[i] < sma[i] && rsi[i] > RSI_CONFIG.OVERBOUGHT) type = 'SELL';

            if (type === 'HOLD') continue;

            total++;
            const atr = accuracyService.calculateSimpleATR(data, i);
            const targetMove = Math.max(atr * RISK_MANAGEMENT.BULL_TARGET_MULTIPLIER, closes[i] * 0.012);

            const result = accuracyService.simulateTrade(data, i, type, targetMove);
            if (result.won) hits++;
        }

        return {
            total,
            hitRate: total > 0 ? (hits / total) * 100 : 0,
        };
    }

    private determineSignalType(price: number, sma: number, rsi: number, params: {
        rsiPeriod: number;
        smaPeriod: number;
    }): {
        type: 'BUY' | 'SELL' | 'HOLD';
        reason: string;
    } {
        if (price > sma && rsi < (RSI_CONFIG.OVERSOLD + 10)) {
            return { type: 'BUY', reason: `上昇トレンド中の押し目。RSI(${params.rsiPeriod})とSMA(${params.smaPeriod})による最適化予測。` };
        }
        if (price < sma && rsi > RSI_CONFIG.OVERBOUGHT) {
            return { type: 'SELL', reason: `下落トレンド中の戻り売り。RSI(${params.rsiPeriod})とSMA(${params.smaPeriod})による最適化予測。` };
        }
        if (rsi < RSI_CONFIG.OVERSOLD) return { type: 'BUY', reason: '売られすぎ水準からの自律反発。' };
        if (rsi > RSI_CONFIG.OVERBOUGHT) return { type: 'SELL', reason: '買われすぎ水準からの反落。' };
        return { type: 'HOLD', reason: '明確な優位性なし。' };
    }

    /**
     * 事前に最適化されたパラメータを使って分析を実行（バックテスト用）
     * 公開メソッドとして公開してAccuracyServiceから呼べるようにする
     */
    analyzeStockWithPrecomputedParams(
        symbol: string,
        data: OHLCV[],
        market: 'japan' | 'usa',
        opt: { rsiPeriod: number; smaPeriod: number; accuracy: number },
        startIndex: number = -1
    ): Signal {
        const closes = data.map(d => d.close);

        // startIndexが指定された場合、その時点までのデータを使用
        const analysisData = startIndex >= 0 ? data.slice(0, startIndex + 1) : data;
        const analysisCloses = startIndex >= 0 ? closes.slice(0, startIndex + 1) : closes;

        const lastRSI = technicalIndicatorService.calculateRSI(analysisCloses, opt.rsiPeriod).pop() || 50;
        const lastSMA = technicalIndicatorService.calculateSMA(analysisCloses, opt.smaPeriod).pop() || analysisCloses[analysisCloses.length - 1];
        const currentPrice = analysisCloses[analysisCloses.length - 1];

        const { type, reason } = this.determineSignalType(currentPrice, lastSMA, lastRSI, opt);

        const recentCloses = analysisCloses.slice(-RSI_CONFIG.DEFAULT_PERIOD);
        const atr = (Math.max(...recentCloses) - Math.min(...recentCloses)) / 2;
        const targetPercent = Math.max(atr / currentPrice, PRICE_CALCULATION.DEFAULT_ATR_RATIO);

        const targetPrice = type === 'BUY' ? currentPrice * (1 + targetPercent * 2) : type === 'SELL' ? currentPrice * (1 - targetPercent * 2) : currentPrice;
        const stopLoss = type === 'BUY' ? currentPrice * (1 - targetPercent) : type === 'SELL' ? currentPrice * (1 + targetPercent) : currentPrice;

        let confidence = 50 + (type === 'HOLD' ? 0 : Math.min(Math.abs(50 - lastRSI) * 1.5, 45));

        return {
            symbol,
            type,
            confidence: parseFloat(confidence.toFixed(1)),
            accuracy: Math.round(opt.accuracy),
            atr,
            targetPrice: parseFloat(targetPrice.toFixed(2)),
            stopLoss: parseFloat(stopLoss.toFixed(2)),
            reason,
            predictedChange: parseFloat(((targetPrice - currentPrice) / (currentPrice || 1) * 100).toFixed(2)),
            predictionDate: new Date().toISOString().split('T')[0],
            optimizedParams: { rsiPeriod: opt.rsiPeriod, smaPeriod: opt.smaPeriod },
        };
    }

    /**
     * 銘柄の総合分析を実行
     */
    analyzeStock(symbol: string, data: OHLCV[], market: 'japan' | 'usa', indexDataOverride?: OHLCV[]): Signal {
        if (data.length < OPTIMIZATION.MIN_DATA_PERIOD) {
            return {
                symbol,
                type: 'HOLD',
                confidence: 0,
                targetPrice: 0,
                stopLoss: 0,
                reason: 'データ不足',
                predictedChange: 0,
                predictionDate: '',
            };
        }

        const opt = this.optimizeParameters(data, market);
        const closes = data.map(d => d.close);
        const lastRSI = technicalIndicatorService.calculateRSI(closes, opt.rsiPeriod).pop() || 50;
        const lastSMA = technicalIndicatorService.calculateSMA(closes, opt.smaPeriod).pop() || closes[closes.length - 1];
        const currentPrice = closes[closes.length - 1];

        const { type, reason } = this.determineSignalType(currentPrice, lastSMA, lastRSI, opt);

        const recentCloses = closes.slice(-RSI_CONFIG.DEFAULT_PERIOD);
        const atr = (Math.max(...recentCloses) - Math.min(...recentCloses)) / 2;
        const targetPercent = Math.max(atr / currentPrice, PRICE_CALCULATION.DEFAULT_ATR_RATIO);

        const targetPrice = type === 'BUY' ? currentPrice * (1 + targetPercent * 2) : type === 'SELL' ? currentPrice * (1 - targetPercent * 2) : currentPrice;
        const stopLoss = type === 'BUY' ? currentPrice * (1 - targetPercent) : type === 'SELL' ? currentPrice * (1 + targetPercent) : currentPrice;

        let confidence = 50 + (type === 'HOLD' ? 0 : Math.min(Math.abs(50 - lastRSI) * 1.5, 45));

        // Market correlation
        const relatedIndexSymbol = market === 'japan' ? '^N225' : '^GSPC';
        let marketContext: Signal['marketContext'];

        const indexData = indexDataOverride || marketDataService.getCachedMarketData(relatedIndexSymbol);
        if (indexData && indexData.length >= 50) {
            const correlation = marketDataService.calculateCorrelation(data, indexData);
            const indexTrend = marketDataService.calculateTrend(indexData);

            marketContext = {
                indexSymbol: relatedIndexSymbol,
                correlation: parseFloat(correlation.toFixed(2)),
                indexTrend,
            };

            if (type === 'BUY' && indexTrend === 'DOWN' && correlation < -0.5) {
                confidence -= Math.abs(correlation) * 30;
            }
        }

        const forecastCone = this.calculateForecastCone(data);
        const predictionError = accuracyService.calculatePredictionError(data);
        const volumeProfile = volumeAnalysisService.calculateVolumeProfile(data);

        let finalConfidence = forecastCone
            ? (confidence + forecastCone.confidence) / 2
            : confidence;

        if (marketContext && marketContext.correlation !== 0) {
            finalConfidence = finalConfidence * (1 - Math.abs(marketContext.correlation) * 0.1);
        }

        return {
            symbol,
            type,
            confidence: parseFloat(finalConfidence.toFixed(1)),
            accuracy: Math.round(opt.accuracy),
            atr,
            targetPrice: parseFloat(targetPrice.toFixed(2)),
            stopLoss: parseFloat(stopLoss.toFixed(2)),
            reason: (finalConfidence >= 80 ? '【強気】' : '') + reason,
            predictedChange: parseFloat(((targetPrice - currentPrice) / (currentPrice || 1) * 100).toFixed(2)),
            predictionDate: new Date().toISOString().split('T')[0],
            optimizedParams: { rsiPeriod: opt.rsiPeriod, smaPeriod: opt.smaPeriod },
            predictionError,
            volumeResistance: volumeProfile,
            forecastCone,
            marketContext,
        };
    }
}

export const analysisService = new AnalysisService();
export const analyzeStock = analysisService.analyzeStock.bind(analysisService);
