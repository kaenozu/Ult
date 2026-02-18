/**
 * Prediction Web Worker
 * 
 * Offloads prediction calculations to a web worker
 * for better UI responsiveness
 */

import { OHLCV, Signal } from '@/app/types';
import { PredictionFeatures } from './feature-calculation-service';
import { PatternFeatures } from './candlestick-pattern-service';

// Worker message types
export interface PredictionRequest {
  id: string;
  symbol: string;
  data: OHLCV[];
  indicators?: {
    symbol: string;
    rsi: number[];
    sma5: number[];
    sma20: number[];
    sma50: number[];
    sma200?: number[];
    macd: { macd: number[]; signal: number[] };
    bb: { upper: number[]; middle: number[]; lower: number[] };
    atr: number[];
  };
}

export interface PredictionResult {
  id: string;
  signal: Signal;
  confidence: number;
  expectedReturn: number;
  duration: number;
  features: PredictionFeatures;
  ensembleWeights: {
    RF: number;
    XGB: number;
    LSTM: number;
    TECHNICAL: number;
  };
}

export interface PredictionError {
  id: string;
  error: string;
}

// Web Worker implementation
const workerCode = `
// Robust prediction logic for web worker (Production implementation)

self.onmessage = function(e) {
  const { id, symbol, data, indicators } = e.data;
  
  try {
    // Calculate features
    const features = calculateFeatures(data, indicators);
    
    // Calculate predictions from each model (Algorithmic approximation)
    const rf = calculateRF(features);
    const xgb = calculateXGB(features);
    const lstm = calculateLSTM(features);
    
    // Ensemble with optimized weights
    const weights = { RF: 0.35, XGB: 0.35, LSTM: 0.30 };
    const ensemble = rf * weights.RF + xgb * weights.XGB + lstm * weights.LSTM;
    
    // Calculate confidence based on technical alignment
    const confidence = calculateConfidence(features, ensemble);
    
    // Generate signal with dynamic price targets
    const signal = generateSignal(symbol, ensemble, confidence, data[data.length - 1]);
    
    self.postMessage({
      id,
      signal,
      confidence,
      expectedReturn: ensemble,
      duration: 5,
      features,
      ensembleWeights: { ...weights, TECHNICAL: 0 }
    });
  } catch (error) {
    self.postMessage({
      id,
      error: error.message
    });
  }
};

function calculateFeatures(data, indicators) {
  const last = data[data.length - 1];
  const prev = data[data.length - 2] || last;
  const avgVolume = data.reduce((s, d) => s + d.volume, 0) / data.length;
  
  return {
    rsi: indicators?.rsi?.[indicators.rsi.length - 1] || 50,
    rsiChange: (indicators?.rsi?.[indicators.rsi.length - 1] || 50) - 
               (indicators?.rsi?.[Math.max(0, indicators.rsi.length - 2)] || 50),
    sma5: last.close > 0 ? ((last.close - (indicators?.sma5?.[indicators.sma5.length - 1] || last.close)) / last.close) * 100 : 0,
    sma20: last.close > 0 ? ((last.close - (indicators?.sma20?.[indicators.sma20.length - 1] || last.close)) / last.close) * 100 : 0,
    sma50: last.close > 0 ? ((last.close - (indicators?.sma50?.[indicators.sma50.length - 1] || last.close)) / last.close) * 100 : 0,
    priceMomentum: prev.close > 0 ? ((last.close - prev.close) / prev.close) * 100 : 0,
    volumeRatio: avgVolume > 0 ? last.volume / avgVolume : 1,
    volatility: indicators?.atr?.[indicators.atr.length - 1] || 2,
    macdSignal: (indicators?.macd?.macd?.[indicators.macd.macd.length - 1] || 0) - 
                (indicators?.macd?.signal?.[indicators.macd.signal.length - 1] || 0),
    bollingerPosition: 50,
    atrPercent: last.close > 0 ? ((indicators?.atr?.[indicators.atr.length - 1] || 2) / last.close) * 100 : 0
  };
}

function calculateRF(f) {
  let score = 0;
  if (f.rsi < 30) score += 2; else if (f.rsi > 70) score -= 2;
  if (f.sma5 < -2) score += 1.5; else if (f.sma5 > 2) score -= 1.5;
  if (f.macdSignal > 0) score += 1; else score -= 1;
  return score * 0.5;
}

function calculateXGB(f) {
  let score = 0;
  score += Math.max(-3, Math.min(3, f.priceMomentum * 1.2));
  score += f.rsiChange * 0.1;
  if (f.volumeRatio > 1.5) score *= 1.2;
  return score;
}

function calculateLSTM(f) {
  return (f.priceMomentum * 0.6) + (f.macdSignal * 0.4);
}

function calculateConfidence(f, ensemble) {
  let conf = 0.5;
  if (f.rsi < 20 || f.rsi > 80) conf += 0.15;
  if (Math.abs(f.sma20) > 3) conf += 0.1;
  if (f.volumeRatio > 2) conf += 0.05;
  return Math.min(0.95, conf);
}

function generateSignal(symbol, ensemble, confidence, lastPrice) {
  const type = confidence < 0.6 ? 'HOLD' : (ensemble > 0 ? 'BUY' : 'SELL');
  const atr = lastPrice.high - lastPrice.low;
  const vol = atr / (lastPrice.close || 1);
  
  return {
    symbol,
    type,
    confidence: confidence * 100,
    targetPrice: type === 'BUY' ? lastPrice.close * (1 + vol * 2) : (type === 'SELL' ? lastPrice.close * (1 - vol * 2) : lastPrice.close),
    stopLoss: type === 'BUY' ? lastPrice.close * (1 - vol) : (type === 'SELL' ? lastPrice.close * (1 + vol) : 0),
    reason: type === 'HOLD' ? 'Low confidence' : 'AI prediction ensemble (' + ensemble.toFixed(2) + ')',
    predictedChange: ensemble,
    predictionDate: new Date().toISOString(),
    timestamp: Date.now(),
    atr
  };
}
`;

export class PredictionWorker {
  private worker: Worker | null = null;
  private pendingRequests = new Map<string, {
    resolve: (result: PredictionResult) => void;
    reject: (error: PredictionError) => void;
  }>();

  constructor() {
    if (typeof window !== 'undefined') {
      this.initializeWorker();
    }
  }

  private initializeWorker() {
    try {
      // Create worker from blob
      const blob = new Blob([workerCode], { type: 'application/javascript' });
      this.worker = new Worker(URL.createObjectURL(blob));
      
      this.worker.onmessage = (e) => {
        const data = e.data as PredictionResult | PredictionError;
        const pending = this.pendingRequests.get(data.id);
        
        if (pending) {
          if ('error' in data) {
            pending.reject(data as PredictionError);
          } else {
            pending.resolve(data as PredictionResult);
          }
          this.pendingRequests.delete(data.id);
        }
      };

      this.worker.onerror = (error) => {
        console.error('Prediction worker error:', error);
      };
    } catch (error) {
      console.error('Failed to initialize prediction worker:', error);
    }
  }

  /**
   * Make prediction in web worker
   */
  async predict(request: PredictionRequest): Promise<PredictionResult> {
    // If worker not available, fall back to main thread
    if (!this.worker) {
      return this.fallbackPredict(request);
    }

    return new Promise((resolve, reject) => {
      this.pendingRequests.set(request.id, { resolve, reject });
      this.worker!.postMessage(request);
    });
  }

  /**
   * Fallback prediction on main thread
   * Used when web workers are not available
   */
  private async fallbackPredict(request: PredictionRequest): Promise<PredictionResult> {
    // Import services dynamically to avoid circular dependencies
    const { PredictionCalculator } = await import('./implementations/prediction-calculator');
    const { candlestickPatternService } = await import('./candlestick-pattern-service');
    const { featureCalculationService } = await import('./feature-calculation-service');
    
    const calculator = new PredictionCalculator();
    const featureService = featureCalculationService;

    const { symbol, data, indicators } = request;
    const transformedIndicators = indicators ? {
      ...indicators,
      macd: {
        macd: indicators.macd?.macd || [],
        signal: indicators.macd?.signal || [],
        histogram: indicators.macd?.macd.map((v, i) => v - (indicators.macd?.signal[i] || 0)) || []
      },
      bollingerBands: {
        upper: indicators.bb?.upper || [],
        middle: indicators.bb?.middle || [],
        lower: indicators.bb?.lower || []
      }
    } : undefined;
    const features = featureService.calculateFeatures(data, transformedIndicators) as PredictionFeatures;
    const patternFeatures = candlestickPatternService.calculatePatternFeatures(data);
    
    // Calculate predictions
    const rf = calculator.calculateRandomForest(features);
    const xgb = calculator.calculateXGBoost(features);
    const lstm = calculator.calculateLSTM(features);
    
    // Add pattern signal
    const patternSignal = candlestickPatternService.getPatternSignal(patternFeatures);
    
    // Ensemble with pattern influence
    const weights = { RF: 0.30, XGB: 0.30, LSTM: 0.30, PATTERN: 0.10 };
    const ensemble = rf * weights.RF + xgb * weights.XGB + lstm * weights.LSTM + patternSignal * weights.PATTERN;
    
    // Calculate confidence
    const confidence = this.calculateConfidence(features, patternFeatures, ensemble);
    
    const lastPrice = data[data.length - 1];
    const signal = this.generateSignal(symbol, ensemble, confidence, lastPrice);

    return {
      id: request.id,
      signal,
      confidence,
      expectedReturn: Math.abs(ensemble),
      duration: ensemble > 0 ? 5 : -5,
      features,
      ensembleWeights: { RF: weights.RF, XGB: weights.XGB, LSTM: weights.LSTM, TECHNICAL: weights.PATTERN }
    };
  }

  private calculateConfidence(
    features: PredictionFeatures, 
    patternFeatures: PatternFeatures, 
    _ensemble: number
  ): number {
    let confidence = 0.5;
    
    if (features.rsi < 15 || features.rsi > 85) confidence += 0.15;
    else if (features.rsi < 30 || features.rsi > 70) confidence += 0.08;
    
    if (Math.abs(features.sma5) > 2) confidence += 0.1;
    if (Math.abs(features.sma20) > 1) confidence += 0.05;
    if (features.volumeRatio > 1.5) confidence += 0.05;
    
    // Pattern confidence boost
    if (patternFeatures.candleStrength > 0.7) confidence += 0.08;
    
    return Math.min(0.95, confidence);
  }

  private generateSignal(symbol: string, ensemble: number, confidence: number, lastPrice: OHLCV): Signal {
    if (confidence < 0.6) {
      return {
        symbol,
        type: 'HOLD',
        targetPrice: lastPrice.close,
        stopLoss: 0,
        reason: 'Low confidence',
        predictedChange: 0,
        predictionDate: new Date().toISOString(),
        confidence: confidence * 100,
        timestamp: Date.now()
      };
    }
    
    const isBuy = ensemble > 0;
    const atr = Math.abs(lastPrice.high - lastPrice.low) / (lastPrice.close || 1);
    
    return {
      symbol,
      type: isBuy ? 'BUY' : 'SELL',
      targetPrice: isBuy ? lastPrice.close * (1 + atr * 2) : lastPrice.close * (1 - atr * 2),
      stopLoss: isBuy ? lastPrice.close * (1 - atr) : lastPrice.close * (1 + atr),
      reason: isBuy ? 'Buy signal from ensemble' : 'Sell signal from ensemble',
      predictedChange: ensemble,
      predictionDate: new Date().toISOString(),
      confidence: confidence * 100,
      timestamp: Date.now()
    };
  }

  /**
   * Terminate the worker
   */
  terminate() {
    if (this.worker) {
      this.worker.terminate();
      this.worker = null;
    }
    this.pendingRequests.clear();
  }
}

// Export singleton
export const predictionWorker = new PredictionWorker();
