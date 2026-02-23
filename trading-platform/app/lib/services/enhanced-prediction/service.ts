import { OHLCV, Signal, TechnicalIndicatorsWithATR } from '@/app/types';
import { devWarn } from '@/app/lib/utils/dev-logger';
import { PredictionCalculator } from '../implementations/prediction-calculator';
import { candlestickPatternService } from '../candlestick-pattern-service';
import { predictionWorker, PredictionRequest, predictionCache } from '../prediction-worker';
import { featureEngineeringService } from '../feature-engineering-service';
import { OPTIMIZED_ENSEMBLE_WEIGHTS } from '@/app/lib/config/prediction-config';
import {
  PredictionInput,
  EnhancedPredictionResult,
  CacheEntry,
  PerformanceMetrics,
  EnsembleWeights,
  SIGNAL_THRESHOLDS,
} from './types';
import { generateDataHash, detectMarketRegime, calculateEnhancedConfidence } from './model-utils';

export class EnhancedPredictionService {
  private calculator = new PredictionCalculator();
  private useWorker = typeof window !== 'undefined' && typeof Worker !== 'undefined';
  
  private predictionCache = new Map<string, CacheEntry>();
  private readonly CACHE_TTL = 5000;
  private readonly MAX_CACHE_SIZE = 50;
  
  private pendingRequests = new Map<string, Promise<EnhancedPredictionResult>>();

  private performanceMetrics: PerformanceMetrics = {
    totalCalculations: 0,
    cacheHits: 0,
    averageCalculationTime: 0,
    lastCleanup: Date.now()
  };

  getPerformanceMetrics(): PerformanceMetrics {
    return { ...this.performanceMetrics };
  }

  estimateMemoryUsage(): number {
    let cacheSize = 0;
    for (const [key, entry] of this.predictionCache.entries()) {
      cacheSize += key.length * 2;
      cacheSize += JSON.stringify(entry).length * 2;
    }
    return cacheSize + (this.pendingRequests.size * 1000);
  }

  async calculatePrediction(input: PredictionInput): Promise<EnhancedPredictionResult> {
    const startTime = performance.now();
    const { symbol, data, indicators } = input;

    if (data.length < 20) {
      throw new Error('Insufficient data for prediction (minimum 20 candles required)');
    }

    const dataHash = generateDataHash(data);
    const cacheKey = `${symbol}_${dataHash}`;
    
    const sharedCached = predictionCache.get<EnhancedPredictionResult>(cacheKey);
    if (sharedCached) {
      this.performanceMetrics.cacheHits++;
      return { ...sharedCached, cacheHit: true };
    }

    const cached = this.predictionCache.get(cacheKey);
    
    if (cached && (Date.now() - cached.timestamp < this.CACHE_TTL)) {
      this.performanceMetrics.cacheHits++;
      return { ...cached.result, cacheHit: true };
    }

    if (this.pendingRequests.has(cacheKey)) {
      return this.pendingRequests.get(cacheKey)!;
    }

    const predictionPromise = (async () => {
      const regime = detectMarketRegime(data);
      const weights = OPTIMIZED_ENSEMBLE_WEIGHTS[regime as keyof typeof OPTIMIZED_ENSEMBLE_WEIGHTS] || OPTIMIZED_ENSEMBLE_WEIGHTS.RANGING;

      let result: Omit<EnhancedPredictionResult, 'marketRegime' | 'calculationTime' | 'cacheHit'>;

      if (this.useWorker) {
        try {
          result = await this.predictWithWorker(symbol, data, indicators);
        } catch (error) {
          devWarn('Worker prediction failed, falling back to main thread:', error);
          result = await this.predictOnMainThread(symbol, data, indicators, weights);
        }
      } else {
        result = await this.predictOnMainThread(symbol, data, indicators, weights);
      }

      const finalResult: EnhancedPredictionResult = {
        ...result,
        marketRegime: regime,
        calculationTime: performance.now() - startTime,
        cacheHit: false
      };

      this.performanceMetrics.totalCalculations++;
      const currentAvg = this.performanceMetrics.averageCalculationTime;
      this.performanceMetrics.averageCalculationTime = 
        (currentAvg * (this.performanceMetrics.totalCalculations - 1) + finalResult.calculationTime) / 
        this.performanceMetrics.totalCalculations;

      this.setCache(cacheKey, finalResult, dataHash);
      predictionCache.set(cacheKey, finalResult);
      
      return finalResult;
    })();

    this.pendingRequests.set(cacheKey, predictionPromise);
    
    try {
      return await predictionPromise;
    } finally {
      this.pendingRequests.delete(cacheKey);
      if (Date.now() - this.performanceMetrics.lastCleanup > 60000) {
        this.cleanupCache();
      }
    }
  }

  private setCache(key: string, result: EnhancedPredictionResult, dataHash: string): void {
    this.predictionCache.set(key, {
      result,
      timestamp: Date.now(),
      dataHash
    });

    if (this.predictionCache.size > this.MAX_CACHE_SIZE) {
      this.cleanupCache();
    }
  }

  private cleanupCache(): void {
    const now = Date.now();
    
    for (const [key, entry] of this.predictionCache.entries()) {
      if (now - entry.timestamp > this.CACHE_TTL) {
        this.predictionCache.delete(key);
      }
    }
    
    if (this.predictionCache.size > this.MAX_CACHE_SIZE) {
      const sortedEntries = Array.from(this.predictionCache.entries())
        .sort((a, b) => a[1].timestamp - b[1].timestamp);
      
      const entriesToDelete = sortedEntries.slice(0, sortedEntries.length - this.MAX_CACHE_SIZE);
      entriesToDelete.forEach(([key]) => this.predictionCache.delete(key));
    }
    
    this.performanceMetrics.lastCleanup = now;
  }

  private async predictWithWorker(
    symbol: string, 
    data: OHLCV[], 
    indicators?: TechnicalIndicatorsWithATR
  ): Promise<Omit<EnhancedPredictionResult, 'marketRegime' | 'calculationTime' | 'cacheHit'>> {
    const request: PredictionRequest = {
      id: `pred_${Date.now()}_${symbol}`,
      symbol,
      data,
      indicators: indicators ? {
        symbol: indicators.symbol,
        rsi: indicators.rsi || [],
        sma5: indicators.sma5 || [],
        sma20: indicators.sma20 || [],
        sma50: indicators.sma50 || [],
        sma200: indicators.sma200 || [],
        macd: { macd: indicators.macd?.macd || [], signal: indicators.macd?.signal || [] },
        bb: {
          upper: indicators.bollingerBands?.upper || [],
          middle: indicators.bollingerBands?.middle || [],
          lower: indicators.bollingerBands?.lower || []
        },
        atr: indicators.atr || []
      } : undefined
    };

    const result = await predictionWorker.predict(request);
    const emptyPattern = {
      isDoji: 0, isHammer: 0, isInvertedHammer: 0, isShootingStar: 0,
      isBullishEngulfing: 0, isBearishEngulfing: 0, isMorningStar: 0, isEveningStar: 0,
      isPiercingLine: 0, isDarkCloudCover: 0, isBullishHarami: 0, isBearishHarami: 0,
      bodyRatio: 0.5, upperShadowRatio: 0.25, lowerShadowRatio: 0.25, candleStrength: 0
    };
    return {
      signal: result.signal,
      confidence: result.confidence,
      direction: result.expectedReturn > 0 ? 1 : -1,
      expectedReturn: result.expectedReturn,
      ensembleContribution: { rf: 0.3, xgb: 0.3, lstm: 0.3, pattern: 0.1 },
      features: { technical: result.features, pattern: emptyPattern }
    };
  }

  private async predictOnMainThread(
    symbol: string,
    data: OHLCV[],
    indicators: TechnicalIndicatorsWithATR | undefined,
    weights: EnsembleWeights
  ): Promise<Omit<EnhancedPredictionResult, 'marketRegime' | 'calculationTime' | 'cacheHit'>> {
    
    const features = featureEngineeringService.calculateBasicFeatures(data);
    const patternFeatures = candlestickPatternService.calculatePatternFeatures(data);

    const rf = this.calculator.calculateRandomForest(features);
    const xgb = this.calculator.calculateXGBoost(features);
    const lstm = this.calculator.calculateLSTM(features);
    const patternSignal = candlestickPatternService.getPatternSignal(patternFeatures);

    const totalWeight = weights.RF + weights.XGB + weights.LSTM + weights.TECHNICAL;
    const normalizedWeights = {
      RF: weights.RF / totalWeight, XGB: weights.XGB / totalWeight,
      LSTM: weights.LSTM / totalWeight, TECHNICAL: weights.TECHNICAL / totalWeight
    };
    const ensemble = rf * normalizedWeights.RF + xgb * normalizedWeights.XGB +
      lstm * normalizedWeights.LSTM + patternSignal * normalizedWeights.TECHNICAL;
    const confidence = calculateEnhancedConfidence(features, patternFeatures, ensemble, rf, xgb, lstm);

    const lastPrice = data[data.length - 1];
    const signal = this.generateSignal(symbol, ensemble, confidence, lastPrice);

    return {
      signal,
      confidence,
      direction: Math.sign(ensemble),
      expectedReturn: Math.abs(ensemble),
      ensembleContribution: {
        rf: rf * normalizedWeights.RF,
        xgb: xgb * normalizedWeights.XGB,
        lstm: lstm * normalizedWeights.LSTM,
        pattern: patternSignal * normalizedWeights.TECHNICAL
      },
      features: {
        technical: features,
        pattern: patternFeatures
      }
    };
  }

  private generateSignal(
    symbol: string, 
    ensemble: number, 
    confidence: number, 
    lastPrice: OHLCV
  ): Signal {
    if (confidence < SIGNAL_THRESHOLDS.MIN_CONFIDENCE) {
      return {
        symbol,
        type: 'HOLD',
        targetPrice: lastPrice.close,
        stopLoss: 0,
        reason: 'Low confidence',
        predictedChange: 0,
        predictionDate: new Date().toISOString(),
        confidence,
        timestamp: Date.now()
      };
    }

    const isBuy = ensemble > 0;
    const atr = lastPrice.high - lastPrice.low;
    const volatility = atr / lastPrice.close;
    
    const kellyFraction = Math.min(confidence * 0.5, 0.25);
    
    return {
      symbol,
      type: isBuy ? 'BUY' : 'SELL',
      targetPrice: isBuy ? 
        lastPrice.close * (1 + volatility * 3 * kellyFraction) : 
        lastPrice.close * (1 - volatility * 3 * kellyFraction),
      stopLoss: isBuy ? 
        lastPrice.close * (1 - volatility * 1.5) : 
        lastPrice.close * (1 + volatility * 1.5),
      reason: isBuy ? 'Buy signal from ensemble model' : 'Sell signal from ensemble model',
      predictedChange: ensemble,
      predictionDate: new Date().toISOString(),
      confidence,
      timestamp: Date.now(),
      atr
    };
  }
}

export const enhancedPredictionService = new EnhancedPredictionService();
