import { OHLCV, Signal, Stock } from '../types';
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
import { marketRegimeDetector, RegimeDetectionResult } from './MarketRegimeDetector';
import { exitStrategy, ExitType, TrailingStopConfig, TimeBasedExitConfig, CompoundExitConfig } from './ExitStrategy';
import { mlIntegrationService } from './services/MLIntegrationService';

export interface AnalysisContext {
    startIndex?: number;
    endIndex?: number;
    preCalculatedIndicators?: {
        rsi: Map<number, number[]>;
        sma: Map<number, number[]>;
        atr?: number[];
    };
    forcedParams?: {
        rsiPeriod: number;
        smaPeriod: number;
        accuracy: number;
    };
}

/**
 * High-level orchestration service for stock analysis.
 */
class AnalysisService {
    /**
     * 予測コーン（Forecast Cone）の計算
     */
    calculateForecastCone(data: OHLCV[]): Signal['forecastCone'] | undefined {
        if (data.length < FORECAST_CONE.LOOKBACK_DAYS) return undefined;

        const recentData = data.slice(-FORECAST_CONE.LOOKBACK_DAYS);
        const closes = recentData.map(d => d.close);
        const currentPrice = closes[closes.length - 1];

        const priceReturns = [];
        for (let index = 1; index < closes.length; index++) {
            priceReturns.push((closes[index] - closes[index - 1]) / (closes[index - 1] || 1));
        }

        const meanPriceReturn = priceReturns.reduce((accumulator, returnValue) => accumulator + returnValue, 0) / (priceReturns.length || 1);
        const stdDeviation = Math.sqrt(
            priceReturns.reduce((accumulator, returnValue) => accumulator + Math.pow(returnValue - meanPriceReturn, 2), 0) / (priceReturns.length || 1)
        );

        const atr = (Math.max(...closes) - Math.min(...closes)) / (closes.length || 1);
        const volatility = stdDeviation * Math.sqrt(FORECAST_CONE.STEPS);

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
            base.push(basePrice * (1 + meanPriceReturn));
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
     */
    optimizeParameters(data: OHLCV[], market: 'japan' | 'usa', context?: AnalysisContext): {
        rsiPeriod: number;
        smaPeriod: number;
        accuracy: number;
    } {
        const effectiveEndIndex = context?.endIndex !== undefined ? context.endIndex : data.length - 1;
        const effectiveStartIndex = context?.startIndex !== undefined ? context.startIndex : 0;
        const effectiveLength = effectiveEndIndex - effectiveStartIndex + 1;

        if (effectiveLength < OPTIMIZATION.REQUIRED_DATA_PERIOD) {
            return { rsiPeriod: RSI_CONFIG.DEFAULT_PERIOD, smaPeriod: SMA_CONFIG.MEDIUM_PERIOD, accuracy: 0 };
        }

        let bestAccuracy = -1;
        let bestRsiPeriod = RSI_CONFIG.DEFAULT_PERIOD;
        let bestSmaPeriod = SMA_CONFIG.MEDIUM_PERIOD;

        const closes = data.map(d => d.close);

        let rsiCache: Map<number, number[]>;
        let smaCache: Map<number, number[]>;

        if (context?.preCalculatedIndicators) {
            rsiCache = context.preCalculatedIndicators.rsi;
            smaCache = context.preCalculatedIndicators.sma;
        } else {
            rsiCache = new Map<number, number[]>();
            smaCache = new Map<number, number[]>();
            for (const rsiP of RSI_CONFIG.PERIOD_OPTIONS) {
                rsiCache.set(rsiP, technicalIndicatorService.calculateRSI(closes, rsiP));
            }
            for (const smaP of SMA_CONFIG.PERIOD_OPTIONS) {
                smaCache.set(smaP, technicalIndicatorService.calculateSMA(closes, smaP));
            }
        }

        // Pre-calculate ATR (O(N)) once, instead of inside the nested loop (O(N * M))
        // Use cached ATR if available in context
        const atrArray = context?.preCalculatedIndicators?.atr || accuracyService.calculateBatchSimpleATR(data);

        // RSI and SMA are already calculated and cached above (lines 120-132)
        // No need to recalculate them here - removed duplicate calculations

        for (const rsiP of RSI_CONFIG.PERIOD_OPTIONS) {
            for (const smaP of SMA_CONFIG.PERIOD_OPTIONS) {
                const result = this.internalCalculatePerformance(
                    data,
                    rsiP,
                    smaP,
                    closes,
                    atrArray,
                    rsiCache.get(rsiP),
                    smaCache.get(smaP),
                    effectiveEndIndex,
                    effectiveStartIndex
                );
                if (result.hitRate > bestAccuracy) {
                    bestAccuracy = result.hitRate;
                    bestRsiPeriod = rsiP;
                    bestSmaPeriod = smaP;
                }
            }
        }

        return { rsiPeriod: bestRsiPeriod, smaPeriod: bestSmaPeriod, accuracy: bestAccuracy };
    }

    private internalCalculatePerformance(
        data: OHLCV[],
        rsiP: number,
        smaP: number,
        closes: number[],
        atrArray: number[],
        preCalcRsi?: number[],
        preCalcSma?: number[],
        endIndex?: number,
        startIndex?: number
    ): { hitRate: number; total: number } {
        let hits = 0;
        let total = 0;
        const warmup = 100;
        const step = 3;
        const limit = (endIndex !== undefined ? endIndex : data.length) - 10;
        const start = (startIndex || 0) + warmup;

        const rsi = preCalcRsi || technicalIndicatorService.calculateRSI(closes, rsiP);
        const sma = preCalcSma || technicalIndicatorService.calculateSMA(closes, smaP);

        for (let i = start; i < limit; i += step) {
            if (isNaN(rsi[i]) || isNaN(sma[i])) continue;

            let type: 'BUY' | 'SELL' | 'HOLD' = 'HOLD';
            if (closes[i] > sma[i] && rsi[i] < (RSI_CONFIG.OVERSOLD + 10)) type = 'BUY';
            else if (closes[i] < sma[i] && rsi[i] > RSI_CONFIG.OVERBOUGHT) type = 'SELL';

            if (type === 'HOLD') continue;

            total++;
            // Use pre-calculated ATR (O(1) lookup)
            const atr = atrArray[i];
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
     * Calculate regime-based confidence adjustment
     */
    private calculateRegimeAdjustedConfidence(
        baseConfidence: number,
        regime: RegimeDetectionResult,
        signalType: 'BUY' | 'SELL' | 'HOLD'
    ): number {
        let adjustedConfidence = baseConfidence;

        // Reduce confidence if regime is not confirmed
        if (regime.confidence === 'INITIAL') {
            adjustedConfidence *= 0.9;
        }

        // Reduce confidence in high volatility
        if (regime.volatility === 'HIGH') {
            adjustedConfidence *= 0.85;
        }

        // Adjust based on regime-signal alignment
        if (regime.regime === 'TRENDING') {
            if ((signalType === 'BUY' && regime.trendDirection === 'UP') ||
                (signalType === 'SELL' && regime.trendDirection === 'DOWN')) {
                // Aligned with trend - boost confidence
                adjustedConfidence *= 1.1;
            } else if (signalType !== 'HOLD') {
                // Against trend - reduce confidence
                adjustedConfidence *= 0.8;
            }
        } else if (regime.regime === 'RANGING') {
            // Mean reversion signals work better in ranging markets
            if (signalType !== 'HOLD') {
                adjustedConfidence *= 1.05;
            }
        }

        // Cap at 100
        return Math.min(100, adjustedConfidence);
    }

    /**
     * Calculate exit strategies based on market regime and signal type
     */
    private calculateExitStrategies(
        signalType: 'BUY' | 'SELL' | 'HOLD',
        currentPrice: number,
        atr: number,
        regime: RegimeDetectionResult
    ): Signal['exitStrategy'] {
        if (signalType === 'HOLD' || atr <= 0) {
            return undefined;
        }

        const strategies: string[] = [];
        const exitReasons: string[] = [];
        
        // Determine primary strategy based on regime
        let primary = 'TRAILING_ATR';
        
        if (regime.regime === 'TRENDING') {
            if (regime.volatility === 'HIGH') {
                primary = 'TRAILING_ATR';
                strategies.push('TIME_BASED', 'HIGH_LOW');
                exitReasons.push('ATR trailing stop for high volatility trending market');
                exitReasons.push('Time-based exit to limit exposure');
            } else {
                primary = 'TRAILING_ATR';
                strategies.push('PARABOLIC_SAR');
                exitReasons.push('ATR trailing stop for trend following');
                exitReasons.push('Parabolic SAR for trend reversal detection');
            }
        } else if (regime.regime === 'RANGING') {
            if (regime.volatility === 'HIGH') {
                primary = 'COMPOUND';
                strategies.push('TIME_BASED', 'HIGH_LOW');
                exitReasons.push('Compound conditions for ranging market with high volatility');
                exitReasons.push('Time-based exit for range-bound markets');
            } else {
                primary = 'HIGH_LOW';
                strategies.push('TIME_BASED');
                exitReasons.push('High/low breakout detection for ranging market');
            }
        } else {
            // Unknown regime - use conservative approach
            primary = 'TRAILING_ATR';
            strategies.push('TIME_BASED');
            exitReasons.push('Conservative ATR trailing stop');
        }

        // Calculate ATR-based trailing stop
        const atrMultiplier = regime.volatility === 'HIGH' ? 3 : regime.volatility === 'LOW' ? 1.5 : 2;
        const trailingStopLevel = signalType === 'BUY' 
            ? currentPrice - (atr * atrMultiplier)
            : currentPrice + (atr * atrMultiplier);

        // Calculate time-based parameters
        const maxHoldingDays = regime.regime === 'TRENDING' ? 10 : 5;
        const decayFactor = regime.volatility === 'HIGH' ? 0.15 : 0.1;

        // Build compound conditions if needed
        const compoundConditions: string[] = [];
        if (primary === 'COMPOUND' || strategies.includes('COMPOUND')) {
            if (signalType === 'BUY') {
                compoundConditions.push('RSI > 70 (overbought)');
                compoundConditions.push('Price touches upper Bollinger Band');
            } else {
                compoundConditions.push('RSI < 30 (oversold)');
                compoundConditions.push('Price touches lower Bollinger Band');
            }
            compoundConditions.push('MACD signal crossover');
        }

        return {
            primary,
            strategies: [primary, ...strategies],
            trailingStop: {
                enabled: true,
                atrMultiplier,
                currentLevel: parseFloat(trailingStopLevel.toFixed(2)),
            },
            timeBased: {
                enabled: true,
                maxHoldingDays,
                decayFactor,
            },
            compoundConditions: compoundConditions.length > 0 ? {
                enabled: true,
                conditions: compoundConditions,
                requireAll: regime.regime === 'RANGING' && regime.volatility !== 'HIGH',
            } : undefined,
            recommendedATR: parseFloat(atr.toFixed(2)),
            exitReasons,
        };
    }

    /**
     * 銘柄の総合分析を実行
     * ML予測が利用可能な場合は優先的に使用し、そうでない場合はルールベースにフォールバック
     */
    analyzeStock(symbol: string, data: OHLCV[], market: 'japan' | 'usa', indexDataOverride?: OHLCV[], context?: AnalysisContext): Signal {
        // Handle window data for legacy components
        let windowData = data;
        if (context?.endIndex !== undefined) {
             windowData = data.slice(context.startIndex || 0, context.endIndex + 1);
        }

        // Detect market regime first (even for insufficient data)
        const regimeResult = marketRegimeDetector.detect(windowData);
        const strategyRec = marketRegimeDetector.getRecommendedStrategy(
            regimeResult.regime,
            regimeResult.trendDirection,
            regimeResult.volatility
        );
        const regimeDescription = marketRegimeDetector.getRegimeDescription(
            regimeResult.regime,
            regimeResult.trendDirection,
            regimeResult.volatility
        );

        if (windowData.length < OPTIMIZATION.MIN_DATA_PERIOD) {
            return {
                symbol,
                type: 'HOLD',
                confidence: 0,
                targetPrice: 0,
                stopLoss: 0,
                reason: 'データ不足',
                predictedChange: 0,
                predictionDate: '',
                regimeInfo: {
                    regime: regimeResult.regime,
                    trendDirection: regimeResult.trendDirection,
                    volatility: regimeResult.volatility,
                    adx: regimeResult.adx,
                    atr: regimeResult.atr,
                    confidence: regimeResult.confidence,
                    daysInRegime: regimeResult.daysInRegime,
                },
                recommendedStrategy: strategyRec.primary,
                regimeDescription,
                strategyWeight: strategyRec.weight,
                positionSizeAdjustment: strategyRec.positionSizeAdjustment,
                exitStrategy: undefined,
            };
        }

        // Try ML prediction first if available (non-blocking)
        // Note: This is currently a placeholder for future ML integration
        // When ML models are trained, they will be used here with graceful fallback
        // For now, we continue with rule-based predictions
        const mlAvailable = mlIntegrationService.isAvailable();
        if (mlAvailable) {
            // TODO: When models are trained, uncomment this:
            // const mlPrediction = await mlIntegrationService.predictWithML(
            //     { symbol } as Stock, 
            //     data, 
            //     indexDataOverride
            // );
            // if (mlPrediction) return mlPrediction;
        }

        let opt: { rsiPeriod: number; smaPeriod: number; accuracy: number };
        if (context?.forcedParams) {
            opt = context.forcedParams;
        } else {
            opt = this.optimizeParameters(data, market, context);
        }

        const closes = data.map(d => d.close);
        const effectiveEndIndex = context?.endIndex !== undefined ? context.endIndex : data.length - 1;

        // Efficient lookup using pre-calculated indicators if available
        let lastRSI: number;
        let lastSMA: number;

        if (context?.preCalculatedIndicators) {
             const rsiArr = context.preCalculatedIndicators.rsi.get(opt.rsiPeriod) || [];
             const smaArr = context.preCalculatedIndicators.sma.get(opt.smaPeriod) || [];
             lastRSI = rsiArr[effectiveEndIndex] || 50;
             lastSMA = smaArr[effectiveEndIndex] || closes[effectiveEndIndex];
        } else {
            const rsi = technicalIndicatorService.calculateRSI(closes, opt.rsiPeriod);
            const sma = technicalIndicatorService.calculateSMA(closes, opt.smaPeriod);
            lastRSI = rsi[effectiveEndIndex] || 50;
            lastSMA = sma[effectiveEndIndex] || closes[effectiveEndIndex];
        }

        const currentPrice = closes[effectiveEndIndex];

        const { type, reason } = this.determineSignalType(currentPrice, lastSMA, lastRSI, opt);

        const recentCloses = windowData.map(d => d.close).slice(-RSI_CONFIG.DEFAULT_PERIOD);
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
            const correlation = marketDataService.calculateCorrelation(windowData, indexData);
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

        const forecastCone = this.calculateForecastCone(windowData);
        const predictionError = accuracyService.calculatePredictionError(windowData);
        const volumeProfile = volumeAnalysisService.calculateVolumeProfile(windowData);

        let finalConfidence = forecastCone
            ? (confidence + forecastCone.confidence) / 2
            : confidence;

        // Apply regime-based confidence adjustment
        finalConfidence = this.calculateRegimeAdjustedConfidence(finalConfidence, regimeResult, type);

        if (marketContext && marketContext.correlation !== 0) {
            finalConfidence = finalConfidence * (1 - Math.abs(marketContext.correlation) * 0.1);
        }

        // Calculate exit strategy for BUY/SELL signals
        const exitStrategy = this.calculateExitStrategies(type, currentPrice, atr, regimeResult);

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
            // Market regime information
            regimeInfo: {
                regime: regimeResult.regime,
                trendDirection: regimeResult.trendDirection,
                volatility: regimeResult.volatility,
                adx: regimeResult.adx,
                atr: regimeResult.atr,
                confidence: regimeResult.confidence,
                daysInRegime: regimeResult.daysInRegime,
            },
            recommendedStrategy: strategyRec.primary,
            regimeDescription,
            strategyWeight: strategyRec.weight,
            positionSizeAdjustment: strategyRec.positionSizeAdjustment,
            exitStrategy,
        };
    }
}

export const analysisService = new AnalysisService();
export const analyzeStock = analysisService.analyzeStock.bind(analysisService);
