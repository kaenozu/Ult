/**
 * Enhanced Prediction Service v2.0
 * 
 * High-accuracy prediction service with:
 * - Optimized ensemble weights
 * - Candlestick pattern recognition
 * - Web Worker support for non-blocking calculations
 * - Adaptive confidence scoring
 */

import { OHLCV, Signal, TechnicalIndicatorsWithATR } from '@/app/types';
import { PredictionCalculator } from './implementations/prediction-calculator';
import { candlestickPatternService, PatternFeatures } from './candlestick-pattern-service';
import { predictionWorker, PredictionRequest } from './prediction-worker';
import { OPTIMIZED_REGIME_WEIGHTS, RSI_THRESHOLDS, SIGNAL_THRESHOLDS } from '@/app/lib/config/prediction-config';

export interface PredictionInput {
  symbol: string;
  data: OHLCV[];
  indicators?: TechnicalIndicatorsWithATR;
}

export interface EnhancedPredictionResult {
  signal: Signal;
  confidence: number;
  direction: number; // -1 to 1
  expectedReturn: number;
  ensembleContribution: {
    rf: number;
    xgb: number;
    lstm: number;
    pattern: number;
  };
  features: {
    technical: any;
    pattern: PatternFeatures;
  };
  marketRegime: string;
  calculationTime: number;
}

export class EnhancedPredictionService {
  private calculator = new PredictionCalculator();
  private useWorker = typeof window !== 'undefined' && typeof Worker !== 'undefined';
  
  // メモ化キャッシュ（パフォーマンス最適化）
  private predictionCache = new Map<string, {
    result: EnhancedPredictionResult;
    timestamp: number;
    dataHash: string;
  }>();
  private readonly CACHE_TTL = 5000; // 5秒間キャッシュ
  private readonly MAX_CACHE_SIZE = 50; // 最大キャッシュエントリ数
  
  // 重複リクエスト防止
  private pendingRequests = new Map<string, Promise<EnhancedPredictionResult>>();

  // パフォーマンス監視
  private performanceMetrics = {
    totalCalculations: 0,
    cacheHits: 0,
    averageCalculationTime: 0,
    lastCleanup: Date.now()
  };

  /**
   * データハッシュを生成（キャッシュキー用）
   * 軽量なハッシュ関数で最後の数ローソク足のみを使用
   */
  private generateDataHash(data: OHLCV[]): string {
    // 最後の10ローソク足のみを使用してハッシュ生成
    const recentData = data.slice(-10);
    const hashInput = recentData.map(d => 
      `${d.close.toFixed(2)}${d.volume.toFixed(0)}`
    ).join('');
    
    // 簡易ハッシュ（FNV-1a風）
    let hash = 2166136261;
    for (let i = 0; i < hashInput.length; i++) {
      hash ^= hashInput.charCodeAt(i);
      hash += (hash << 1) + (hash << 4) + (hash << 7) + (hash << 8) + (hash << 24);
    }
    return hash.toString(16);
  }

  /**
   * キャッシュをクリーンアップ
   */
  private cleanupCache(): void {
    const now = Date.now();
    
    // 古いエントリを削除
    for (const [key, entry] of this.predictionCache.entries()) {
      if (now - entry.timestamp > this.CACHE_TTL) {
        this.predictionCache.delete(key);
      }
    }
    
    // サイズ制限を超えた場合、古いエントリから削除
    if (this.predictionCache.size > this.MAX_CACHE_SIZE) {
      const sortedEntries = Array.from(this.predictionCache.entries())
        .sort((a, b) => a[1].timestamp - b[1].timestamp);
      
      const entriesToDelete = sortedEntries.slice(0, sortedEntries.length - this.MAX_CACHE_SIZE);
      entriesToDelete.forEach(([key]) => this.predictionCache.delete(key));
    }
    
    this.performanceMetrics.lastCleanup = now;
  }

  /**
   * パフォーマンスメトリクスを取得
   */
  getPerformanceMetrics() {
    return { ...this.performanceMetrics };
  }

  /**
   * メモリ使用量を推定（バイト単位）
   */
  estimateMemoryUsage(): number {
    let cacheSize = 0;
    for (const [key, entry] of this.predictionCache.entries()) {
      cacheSize += key.length * 2; // 文字列は2バイト/文字
      cacheSize += JSON.stringify(entry).length * 2;
    }
    return cacheSize + (this.pendingRequests.size * 1000); // ペンディングリクエストの概算
  }

  /**
   * Calculate comprehensive prediction with all optimizations
   */
  async calculatePrediction(input: PredictionInput): Promise<EnhancedPredictionResult> {
    const startTime = performance.now();
    const { symbol, data, indicators } = input;

    if (data.length < 20) {
      throw new Error('Insufficient data for prediction (minimum 20 candles required)');
    }

    // Detect market regime
    const regime = this.detectMarketRegime(data);
    
    // Get optimized weights for regime
    const weights = OPTIMIZED_REGIME_WEIGHTS[regime];

    // Try to use web worker first
    if (this.useWorker) {
      try {
        const result = await this.predictWithWorker(symbol, data, indicators);
        return {
          ...result,
          marketRegime: regime,
          calculationTime: performance.now() - startTime
        };
      } catch (error) {
        console.warn('Worker prediction failed, falling back to main thread:', error);
      }
    }

    // Fallback to main thread calculation
    const result = await this.predictOnMainThread(symbol, data, indicators, weights);
    return {
      ...result,
      marketRegime: regime,
      calculationTime: performance.now() - startTime
    };
  }

  /**
   * Predict using web worker
   */
  private async predictWithWorker(
    symbol: string, 
    data: OHLCV[], 
    indicators?: TechnicalIndicatorsWithATR
  ): Promise<Omit<EnhancedPredictionResult, 'marketRegime' | 'calculationTime'>> {
    const request: PredictionRequest = {
      id: `pred_${Date.now()}_${symbol}`,
      symbol,
      data,
      indicators: indicators ? {
        rsi: indicators.rsi || [],
        sma5: indicators.sma5 || [],
        sma20: indicators.sma20 || [],
        sma50: indicators.sma50 || [],
        macd: {
          macd: indicators.macd?.macd || [],
          signal: indicators.macd?.signal || []
        },
        bb: {
          upper: indicators.bb?.upper || [],
          middle: indicators.bb?.middle || [],
          lower: indicators.bb?.lower || []
        },
        atr: indicators.atr || []
      } : undefined
    };

    const result = await predictionWorker.predict(request);

    return {
      signal: result.signal,
      confidence: result.confidence,
      direction: result.expectedReturn > 0 ? 1 : -1,
      expectedReturn: result.expectedReturn,
      ensembleContribution: {
        rf: 0.3, // Simplified for worker
        xgb: 0.3,
        lstm: 0.3,
        pattern: 0.1
      },
      features: {
        technical: result.features,
        pattern: {
          isDoji: 0, isHammer: 0, isInvertedHammer: 0, isShootingStar: 0,
          isBullishEngulfing: 0, isBearishEngulfing: 0, isMorningStar: 0, isEveningStar: 0,
          isPiercingLine: 0, isDarkCloudCover: 0, isBullishHarami: 0, isBearishHarami: 0,
          bodyRatio: 0.5, upperShadowRatio: 0.25, lowerShadowRatio: 0.25, candleStrength: 0
        }
      }
    };
  }

  /**
   * Predict on main thread with full feature calculation
   */
  private async predictOnMainThread(
    symbol: string,
    data: OHLCV[],
    indicators: TechnicalIndicatorsWithATR | undefined,
    weights: { RF: number; XGB: number; LSTM: number; TECHNICAL: number }
  ): Promise<Omit<EnhancedPredictionResult, 'marketRegime' | 'calculationTime'>> {
    
    // Calculate features
    const features = this.calculateFeatures(data, indicators);
    const patternFeatures = candlestickPatternService.calculatePatternFeatures(data);

    // Calculate model predictions
    const rf = this.calculator.calculateRandomForest(features);
    const xgb = this.calculator.calculateXGBoost(features);
    const lstm = this.calculator.calculateLSTM(features);
    const patternSignal = candlestickPatternService.getPatternSignal(patternFeatures);

    // Weighted ensemble
    const totalWeight = weights.RF + weights.XGB + weights.LSTM + weights.TECHNICAL;
    const normalizedWeights = {
      RF: weights.RF / totalWeight,
      XGB: weights.XGB / totalWeight,
      LSTM: weights.LSTM / totalWeight,
      TECHNICAL: weights.TECHNICAL / totalWeight
    };

    const ensemble = 
      rf * normalizedWeights.RF +
      xgb * normalizedWeights.XGB +
      lstm * normalizedWeights.LSTM +
      patternSignal * normalizedWeights.TECHNICAL;

    // Calculate confidence
    const confidence = this.calculateEnhancedConfidence(
      features, 
      patternFeatures, 
      ensemble,
      rf, xgb, lstm
    );

    // Generate signal
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

  /**
   * Calculate technical features
   */
  private calculateFeatures(data: OHLCV[], indicators?: TechnicalIndicatorsWithATR): any {
    const last = data[data.length - 1];
    const prev = data[data.length - 2] || last;
    const prev5 = data[Math.max(0, data.length - 6)];
    
    return {
      rsi: indicators?.rsi?.[indicators.rsi.length - 1] || 50,
      rsiChange: (indicators?.rsi?.[indicators.rsi.length - 1] || 50) - 
                 (indicators?.rsi?.[indicators.rsi.length - 2] || 50),
      sma5: indicators?.sma5?.[indicators.sma5.length - 1] || 0,
      sma20: indicators?.sma20?.[indicators.sma20.length - 1] || 0,
      sma50: indicators?.sma50?.[indicators.sma50.length - 1] || 0,
      priceMomentum: ((last.close - prev5.close) / prev5.close) * 100,
      volumeRatio: last.volume / (prev.volume || 1),
      volatility: indicators?.atr?.[indicators.atr.length - 1] || 2,
      macdSignal: (indicators?.macd?.macd?.[indicators.macd.macd.length - 1] || 0) - 
                  (indicators?.macd?.signal?.[indicators.macd.signal.length - 1] || 0),
      bollingerPosition: 0.5,
      atrPercent: ((indicators?.atr?.[indicators.atr.length - 1] || 2) / last.close) * 100
    };
  }

  /**
   * Detect market regime based on price action
   */
  private detectMarketRegime(data: OHLCV[]): 'TRENDING' | 'RANGING' | 'VOLATILE' | 'UNKNOWN' {
    if (data.length < 20) return 'UNKNOWN';

    const closes = data.map(d => d.close);
    const returns: number[] = [];
    
    for (let i = 1; i < closes.length; i++) {
      returns.push((closes[i] - closes[i-1]) / closes[i-1]);
    }

    // Calculate annualized volatility
    const mean = returns.reduce((a, b) => a + b, 0) / returns.length;
    const variance = returns.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / returns.length;
    const volatility = Math.sqrt(variance) * Math.sqrt(252) * 100;

    // Calculate trend strength using available data
    const period = Math.min(20, closes.length);
    const sma = closes.slice(-period).reduce((a, b) => a + b, 0) / period;
    const currentPrice = closes[closes.length - 1];
    const trendStrength = Math.abs((currentPrice - sma) / sma) * 100;

    // Regime classification
    if (volatility > 40) return 'VOLATILE';
    if (trendStrength > 3) return 'TRENDING';  // Relaxed from 5 to 3
    return 'RANGING';
  }

  /**
   * Calculate enhanced confidence score
   */
  private calculateEnhancedConfidence(
    features: any,
    patternFeatures: PatternFeatures,
    ensemble: number,
    rf: number,
    xgb: number,
    lstm: number
  ): number {
    let confidence = 0.5;

    // RSI extreme values
    if (features.rsi < RSI_THRESHOLDS.EXTREME_OVERSOLD || 
        features.rsi > RSI_THRESHOLDS.EXTREME_OVERBOUGHT) {
      confidence += 0.15;
    } else if (features.rsi < RSI_THRESHOLDS.MODERATE_OVERSOLD || 
               features.rsi > RSI_THRESHOLDS.MODERATE_OVERBOUGHT) {
      confidence += 0.08;
    }

    // Trend confirmation
    if (Math.abs(features.sma5) > 2) confidence += 0.1;
    if (Math.abs(features.sma20) > 1) confidence += 0.05;
    if (Math.abs(features.sma50) > 0.5) confidence += 0.03;

    // Volume confirmation
    if (features.volumeRatio > 1.5) confidence += 0.05;
    if (features.volumeRatio > 2.0) confidence += 0.03;

    // Pattern confidence
    if (patternFeatures.candleStrength > 0.7) confidence += 0.08;
    if (patternFeatures.isBullishEngulfing > 0.8 || patternFeatures.isBearishEngulfing > 0.8) {
      confidence += 0.05;
    }

    // Model agreement
    const predictions = [rf, xgb, lstm];
    const signs = predictions.map(p => Math.sign(p));
    if (signs.every(s => s === signs[0]) && signs[0] !== 0) {
      confidence += 0.1; // All models agree
    }

    // Volatility adjustment
    if (features.volatility > 5) confidence *= 0.9;
    if (features.volatility > 10) confidence *= 0.85;

    return Math.min(SIGNAL_THRESHOLDS.EXTREME_CONFIDENCE, Math.max(0, confidence));
  }

  /**
   * Generate trading signal
   */
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
        entryPrice: lastPrice.close,
        stopLoss: null,
        takeProfit: null,
        confidence,
        timestamp: Date.now(),
        horizon: 5
      };
    }

    const isBuy = ensemble > 0;
    const atr = lastPrice.high - lastPrice.low;
    const volatility = atr / lastPrice.close;
    
    // Kelly criterion inspired position sizing
    const kellyFraction = Math.min(confidence * 0.5, 0.25);
    
    return {
      symbol,
      type: isBuy ? 'BUY' : 'SELL',
      entryPrice: lastPrice.close,
      stopLoss: isBuy ? 
        lastPrice.close * (1 - volatility * 1.5) : 
        lastPrice.close * (1 + volatility * 1.5),
      takeProfit: isBuy ? 
        lastPrice.close * (1 + volatility * 3 * kellyFraction) : 
        lastPrice.close * (1 - volatility * 3 * kellyFraction),
      confidence,
      timestamp: Date.now(),
      horizon: 5
    };
  }
}

// Export singleton
export const enhancedPredictionService = new EnhancedPredictionService();
