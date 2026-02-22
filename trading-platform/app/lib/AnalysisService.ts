import { OHLCV, Signal, Stock } from '../types';
import { technicalIndicatorService } from './TechnicalIndicatorService';
import { marketDataService } from './MarketDataService';
import { volumeAnalysisService } from './VolumeAnalysis';
import {
    FORECAST_CONE,
    RSI_CONFIG,
    SMA_CONFIG,
    OPTIMIZATION,
    PRICE_CALCULATION
} from '@/app/constants';
import { accuracyService } from './AccuracyService';
import { marketRegimeDetector, RegimeDetectionResult } from './MarketRegimeDetector';
import { exitStrategy } from './ExitStrategy';
import { mlIntegrationService } from './services/MLIntegrationService';

import { logger } from '@/app/core/logger';
export interface AnalysisContext {
    startIndex?: number;
    endIndex?: number;
    minimal?: boolean; // New flag for performance optimization
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
        logger.debug('[calculateForecastCone] input data length:', data.length, `LOOKBACK: ${FORECAST_CONE.LOOKBACK_DAYS}`);
        if (data.length < FORECAST_CONE.LOOKBACK_DAYS) {
            logger.warn('[calculateForecastCone] Insufficient data, returning undefined');
            return undefined;
        }

        const recentData = data.slice(-FORECAST_CONE.LOOKBACK_DAYS);
        const closes = recentData.map(d => d.close);
        const currentPrice = closes[closes.length - 1];
        logger.debug('[calculateForecastCone] recentData length:', recentData.length, `currentPrice: ${currentPrice}`);

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
            const basePrice = data[data.length - 1].close;
            const confidenceFactor = Math.sqrt(i / FORECAST_CONE.STEPS);
            const priceVariation = basePrice * volatility * confidenceFactor;

            const bearishFactor = 1 - (atr * 0.5 * confidenceFactor);
            const bullishFactor = 1 + (atr * 0.5 * confidenceFactor);

            bearishLower.push(Math.max(0, (basePrice - priceVariation * 1.5) * bearishFactor));
            bearishUpper.push((basePrice - priceVariation * 0.5) * bearishFactor);
            bullishLower.push((basePrice + priceVariation * 0.5) * bullishFactor);
            bullishUpper.push((basePrice + priceVariation * 0.5) * bullishFactor);
            base.push(basePrice * (1 + meanPriceReturn));
        }

        const confidence = Math.min(
            100,
            Math.max(50, 100 - (volatility * 100 * 10))
        );

        const forecastConeResult = {
            bearish: { lower: bearishLower, upper: bearishUpper },
            bullish: { lower: bullishLower, upper: bullishUpper },
            base,
            confidence: parseFloat(confidence.toFixed(1))
        };
        logger.debug('[calculateForecastCone] success', {
            dataLength: data.length,
            bearishLowerCount: bearishLower.length,
            bullishLowerCount: bullishLower.length,
            baseCount: base.length,
            confidence: forecastConeResult.confidence
        });
        return forecastConeResult;
    }

    /**
     * 銘柄ごとに的中率が最大化するパラメータを探索
     * Walk-Forward Analysis implementation to prevent overfitting:
     * - Splits optimization window into train (70%) and validation (30%)
     * - Parameters optimized on training set only
     * - Best parameters validated on out-of-sample validation set
     * - Only validated parameters are used for actual trading signals
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

        // Walk-Forward Analysis: Split into train and validation sets
        // Training set: First 70% of the optimization window
        // Validation set: Last 30% of the optimization window
        const trainEndIndex = effectiveStartIndex + Math.floor(effectiveLength * OPTIMIZATION.WFA_TRAIN_RATIO);
        const validationStartIndex = trainEndIndex + 1;
        const validationPeriod = effectiveEndIndex - validationStartIndex + 1;

        // If validation period is too small, use the entire window for training (fallback)
        const useValidation = validationPeriod >= OPTIMIZATION.WFA_MIN_VALIDATION_PERIOD;

        let bestValidationAccuracy = -1;
        let bestRsiPeriod: number = RSI_CONFIG.DEFAULT_PERIOD;
        let bestSmaPeriod: number = SMA_CONFIG.MEDIUM_PERIOD;

        // Step 1: Optimize parameters on TRAINING set only
        for (const rsiP of RSI_CONFIG.PERIOD_OPTIONS) {
            for (const smaP of SMA_CONFIG.PERIOD_OPTIONS) {
                // Train on training period only
                const trainResult = this.internalCalculatePerformance(
                    data,
                    rsiP,
                    smaP,
                    closes,
                    atrArray,
                    rsiCache.get(rsiP)!,
                    smaCache.get(smaP)!,
                    useValidation ? trainEndIndex : effectiveEndIndex,
                    effectiveStartIndex
                );

                // Step 2: Validate on OUT-OF-SAMPLE validation set
                let finalAccuracy = trainResult.hitRate;
                if (useValidation && trainResult.total > 0) {
                    const validationResult = this.internalCalculatePerformance(
                        data,
                        rsiP,
                        smaP,
                        closes,
                        atrArray,
                        rsiCache.get(rsiP)!,
                        smaCache.get(smaP)!,
                        effectiveEndIndex,
                        validationStartIndex
                    );
                    // Use validation accuracy as the true performance metric
                    // This prevents overfitting to the training data
                    finalAccuracy = validationResult.hitRate;
                }

                if (finalAccuracy > bestValidationAccuracy) {
                    bestValidationAccuracy = finalAccuracy;
                    bestRsiPeriod = rsiP;
                    bestSmaPeriod = smaP;
                }
            }
        }

        return { rsiPeriod: bestRsiPeriod, smaPeriod: bestSmaPeriod, accuracy: bestValidationAccuracy };
    }

    private internalCalculatePerformance(
        data: OHLCV[],
        rsiP: number,
        smaP: number,
        closes: number[],
        atrArray: number[],
        preCalcRsi: number[],
        preCalcSma: number[],
        endIndex?: number,
        startIndex?: number
    ): { hitRate: number; total: number } {
        let hits = 0;
        let total = 0;
        const warmup = 50; 
        const step = 1;
        const limit = (endIndex !== undefined ? endIndex : data.length) - FORECAST_CONE.STEPS;
        const start = (startIndex || 0) + warmup;

        // Ensure we have pre-calculated data
        if (!preCalcRsi || !preCalcSma) return { hitRate: 0, total: 0 };

        for (let i = start; i < limit; i += step) {
            const currentRsi = preCalcRsi[i];
            const currentSma = preCalcSma[i];
            const currentPrice = closes[i];

            if (isNaN(currentRsi) || isNaN(currentSma)) continue;

            let type: 'BUY' | 'SELL' | 'HOLD' = 'HOLD';
            if (currentPrice > currentSma && currentRsi < (RSI_CONFIG.OVERSOLD + 10)) type = 'BUY';
            else if (currentPrice < currentSma && currentRsi > RSI_CONFIG.OVERBOUGHT) type = 'SELL';

            if (type === 'HOLD') continue;

            total++;
            const atr = atrArray[i];
            const defaultTargetRatio = PRICE_CALCULATION.DEFAULT_ATR_RATIO * 2; 
            const targetMove = Math.max(atr * 2, currentPrice * defaultTargetRatio);

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
    }, regime?: RegimeDetectionResult): {
        type: 'BUY' | 'SELL' | 'HOLD';
        reason: string;
    } {
        const isBullishRegime = regime?.regime === 'TRENDING' && regime?.trendDirection === 'UP';
        const isBearishRegime = regime?.regime === 'TRENDING' && regime?.trendDirection === 'DOWN';
        
        // プライスアクションによる簡易トレンド判定
        const isPriceAboveSMA = price > sma;
        const isPriceBelowSMA = price < sma;

        // 1. 強気トレンド（またはその兆候）の判定
        if (isPriceAboveSMA) {
            // 押し目買い: RSIが低い
            if (rsi < 45) {
                return { type: 'BUY', reason: `上昇トレンド中の押し目。RSI(${params.rsiPeriod})とSMA(${params.smaPeriod})による最適化予測。` };
            }
            // トレンド追随: トレンドが確定しているか、RSIが中立圏で上昇中
            if ((isBullishRegime || rsi < 75) && rsi > 45) {
                return { type: 'BUY', reason: '強力な上昇トレンドの継続を確認。順張り買い。' };
            }
            // 過熱警戒
            if (rsi > 85) {
                return { type: 'HOLD', reason: '強気相場だがRSIが極端に高いため、押し目を待つ。' };
            }
        }

        // 2. 弱気トレンド（またはその兆候）の判定
        if (isPriceBelowSMA) {
            // 戻り売り: 下落トレンド中でRSIが一時的に回復
            if (rsi > 55) {
                return { type: 'SELL', reason: `下落トレンド中の戻り売り。RSI(${params.rsiPeriod})とSMA(${params.smaPeriod})による最適化予測。` };
            }
            // トレンド追随: トレンドが確定しているか、RSIが中立圏以下で推移
            if ((isBearishRegime || rsi > 25) && rsi < 55) {
                return { type: 'SELL', reason: '強力な下落トレンドの継続を確認。順張り売り。' };
            }
            // 底打ち警戒 / 追撃禁止
            if (rsi < 20) {
                return { type: 'HOLD', reason: '弱気相場だがRSIが極端に低いため、安易な売りを控え、反発を警戒。' };
            }
        }

        // 3. レンジ相場での逆張り（トレンドが明確でない場合、またはレンジ相場確定時）
        const isRangingRegime = regime?.regime === 'RANGING';
        
        // レンジ相場、もしくはトレンド方向への逆行でない場合のみ逆張りを許可
        if (rsi < RSI_CONFIG.OVERSOLD) {
            if (isRangingRegime || !isPriceBelowSMA) {
                return { type: 'BUY', reason: isRangingRegime ? 'レンジ相場における逆張り買い。' : '売られすぎ水準からの反発期待。' };
            }
        }
        if (rsi > RSI_CONFIG.OVERBOUGHT) {
            if (isRangingRegime || !isPriceAboveSMA) {
                return { type: 'SELL', reason: isRangingRegime ? 'レンジ相場における逆張り売り。' : '買われすぎ水準からの反落期待。' };
            }
        }

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
        logger.debug('[analyzeStock] start', { symbol, market, dataLength: data.length, context: context ? { endIndex: context.endIndex, startIndex: context.startIndex } : 'none' });

        // Handle window data for legacy components
        let windowData = data;
        if (context?.endIndex !== undefined) {
            windowData = data.slice(context.startIndex || 0, context.endIndex + 1);
        }
        logger.debug('[analyzeStock] windowData length:', windowData.length);

        // Detect market regime (Skip if minimal mode for performance)
        let regimeResult: RegimeDetectionResult;
        if (context?.minimal) {
            // Simplified fallback for minimal mode
            regimeResult = {
                regime: 'RANGING',
                trendDirection: 'NEUTRAL',
                volatility: 'LOW',
                adx: 20,
                atr: 0,
                atrRatio: 1,
                confidence: 'INITIAL',
                daysInRegime: 0,
                timestamp: new Date().toISOString()
            };
        } else {
            regimeResult = marketRegimeDetector.detect(windowData);
        }

        const strategyRec = !context?.minimal ? marketRegimeDetector.getRecommendedStrategy(
            regimeResult.regime,
            regimeResult.trendDirection,
            regimeResult.volatility
        ) : { primary: 'SMA_RSI', weight: 1, positionSizeAdjustment: 1 };

        const regimeDescription = !context?.minimal ? marketRegimeDetector.getRegimeDescription(
            regimeResult.regime,
            regimeResult.trendDirection,
            regimeResult.volatility
        ) : '軽量分析モード';

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

        // ML prediction integration point - using Off-main-thread Workers
        // Note: Async/await cannot be used here because analyzeStock must be synchronous
        // for compatibility with the rest of the application architecture.
        // ML integration is handled separately via off-main-thread workers where applicable.

        let opt: { rsiPeriod: number; smaPeriod: number; accuracy: number };
        if (context?.forcedParams) {
            opt = context.forcedParams;
        } else if (context?.minimal) {
            opt = { rsiPeriod: RSI_CONFIG.DEFAULT_PERIOD, smaPeriod: SMA_CONFIG.MEDIUM_PERIOD, accuracy: 0 };
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

        const { type, reason } = this.determineSignalType(currentPrice, lastSMA, lastRSI, opt, regimeResult);

        const recentCloses = windowData.map(d => d.close)
            .slice(-RSI_CONFIG.DEFAULT_PERIOD)
            .filter(c => !isNaN(c) && c > 0);

        let atr = 0;
        if (recentCloses.length >= 2) {
            atr = (Math.max(...recentCloses) - Math.min(...recentCloses)) / 2;
        }

        // Fallback for ATR if calculation failed or resulted in 0/NaN
        if (!atr || isNaN(atr) || atr <= 0) {
            atr = currentPrice * PRICE_CALCULATION.DEFAULT_ATR_RATIO;
        }

        const atrRatio = Math.min(Math.max(atr / (currentPrice || 1), 0.01), 0.15);
        const targetPercent = Math.max(atrRatio, PRICE_CALCULATION.DEFAULT_ATR_RATIO);
        const forecastCone = this.calculateForecastCone(windowData);

        // トレンドの強さに応じてターゲット倍率を調整
        let targetMultiplier = 1.5;
        if (regimeResult.regime === 'TRENDING') {
            if ((type === 'BUY' && regimeResult.trendDirection === 'UP') ||
                (type === 'SELL' && regimeResult.trendDirection === 'DOWN')) {
                targetMultiplier = 2.5; // 強力なトレンド時は目標を拡大
            }
        }

        let targetPrice = currentPrice;
        if (type === 'BUY') {
            targetPrice = currentPrice * (1 + targetPercent * targetMultiplier);
        } else if (type === 'SELL') {
            targetPrice = currentPrice * (1 - targetPercent * targetMultiplier);
        } else {
            // HOLDの場合でも、微小なバイアスを反映
            const gap = lastSMA - currentPrice;
            const gapRatio = Math.min(Math.max(gap / (currentPrice || 1), -0.05), 0.05);
            targetPrice = currentPrice * (1 + gapRatio * 0.5); 
        }

        // 異常値ガード
        const maxDev = currentPrice * 0.3;
        targetPrice = Math.min(Math.max(targetPrice, currentPrice - maxDev), currentPrice + maxDev);

        let stopLoss = type === 'BUY' ? currentPrice * (1 - targetPercent) : type === 'SELL' ? currentPrice * (1 + targetPercent) : currentPrice;

        // Final safety check for NaN
        if (isNaN(targetPrice)) targetPrice = currentPrice;
        if (isNaN(stopLoss)) stopLoss = currentPrice;

        // 予測騰落率の計算（丸め処理前の生の値を保持）
        const rawChange = ((targetPrice - currentPrice) / (currentPrice || 1)) * 100;

        let confidence = 50 + (type === 'HOLD' ? 0 : Math.min(Math.abs(50 - lastRSI) * 1.5, 45));

        // Market correlation
        const relatedIndexSymbol = market === 'japan' ? '^N225' : '^GSPC';
        let marketContext: Signal['marketContext'];

        const indexData = indexDataOverride || marketDataService.getCachedMarketData(relatedIndexSymbol);
        logger.debug('[marketContext] relatedIndexSymbol:', relatedIndexSymbol, `indexData length: ${indexData?.length}`);
        if (indexData && indexData.length >= 50) {
            const correlation = marketDataService.calculateCorrelation(windowData, indexData);
            const indexTrend = marketDataService.calculateTrend(indexData);

            marketContext = {
                indexSymbol: relatedIndexSymbol,
                correlation: parseFloat(correlation.toFixed(2)),
                indexTrend,
            };
            logger.debug('[marketContext] set', { indexSymbol: relatedIndexSymbol, correlation: marketContext.correlation, indexTrend });

            if (type === 'BUY' && indexTrend === 'DOWN' && correlation < -0.5) {
                confidence -= Math.abs(correlation) * 30;
            }
        }

        let finalConfidence = forecastCone
            ? (confidence + forecastCone.confidence) / 2
            : confidence;

        // Apply regime-based confidence adjustment
        finalConfidence = this.calculateRegimeAdjustedConfidence(finalConfidence, regimeResult, type);

        if (marketContext && marketContext.correlation !== 0) {
            finalConfidence = finalConfidence * (1 - Math.abs(marketContext.correlation) * 0.1);
        }

        // Optimization: Skip very heavy calculations in minimal mode
        const predictionError = !context?.minimal ? accuracyService.calculatePredictionError(windowData) : 1.0;
        const volumeProfile = !context?.minimal ? volumeAnalysisService.calculateVolumeProfile(windowData) : undefined;

        // Calculate exit strategy for BUY/SELL signals
        const exitStrategy = !context?.minimal ? this.calculateExitStrategies(type, currentPrice, atr, regimeResult) : undefined;

        const result: Signal = {
            symbol,
            type,
            confidence: parseFloat(finalConfidence.toFixed(1)),
            accuracy: Math.round(opt.accuracy),
            atr,
            targetPrice: parseFloat(targetPrice.toFixed(2)),
            stopLoss: parseFloat(stopLoss.toFixed(2)),
            reason: (finalConfidence >= 80 ? '【強気】' : '') + reason,
            predictedChange: parseFloat(rawChange.toFixed(2)),
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
        logger.debug('[analyzeStock] result', {
            symbol, type, market,
            accuracy: result.accuracy,
            targetPrice: result.targetPrice,
            stopLoss: result.stopLoss,
            confidence: result.confidence,
            forecastConeExists: !!forecastCone,
            forecastConeConfidence: forecastCone?.confidence,
            marketContextIndexSymbol: marketContext?.indexSymbol,
            marketContextCorrelation: marketContext?.correlation
        });
        return result;
    }
}

export const analysisService = new AnalysisService();
export const analyzeStock = analysisService.analyzeStock.bind(analysisService);
