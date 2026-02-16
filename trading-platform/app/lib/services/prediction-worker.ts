/**
 * Prediction Web Worker
 * 
 * Offloads prediction calculations to a web worker
 * for better UI responsiveness
 */

import { OHLCV, Signal } from '@/app/types';
import { PredictionFeatures } from './feature-calculation-service';

// Worker message types
export interface PredictionRequest {
  id: string;
  symbol: string;
  data: OHLCV[];
  indicators?: {
    rsi: number[];
    sma5: number[];
    sma20: number[];
    sma50: number[];
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
// Simplified prediction logic for web worker
// Full implementation would import actual services

self.onmessage = function(e) {
  const { id, symbol, data, indicators } = e.data;
  
  try {
    // Calculate features
    const features = calculateFeatures(data, indicators);
    
    // Calculate predictions from each model
    const rf = calculateRF(features);
    const xgb = calculateXGB(features);
    const lstm = calculateLSTM(features);
    
    // Ensemble with optimized weights
    const weights = { RF: 0.35, XGB: 0.35, LSTM: 0.30 };
    const ensemble = rf * weights.RF + xgb * weights.XGB + lstm * weights.LSTM;
    
    // Calculate confidence
    const confidence = calculateConfidence(features, ensemble);
    
    // Generate signal
    const signal = generateSignal(ensemble, confidence, data[data.length - 1]);
    
    self.postMessage({
      id,
      signal,
      confidence,
      expectedReturn: Math.abs(ensemble),
      duration: ensemble > 0 ? 5 : -5,
      features,
      ensembleWeights: weights
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
  
  return {
    rsi: indicators?.rsi?.[indicators.rsi.length - 1] || 50,
    rsiChange: (indicators?.rsi?.[indicators.rsi.length - 1] || 50) - 
               (indicators?.rsi?.[indicators.rsi.length - 2] || 50),
    sma5: indicators?.sma5?.[indicators.sma5.length - 1] || 0,
    sma20: indicators?.sma20?.[indicators.sma20.length - 1] || 0,
    sma50: indicators?.sma50?.[indicators.sma50.length - 1] || 0,
    priceMomentum: ((last.close - prev.close) / prev.close) * 100,
    volumeRatio: last.volume / (prev.volume || 1),
    volatility: indicators?.atr?.[indicators.atr.length - 1] || 2,
    macdSignal: (indicators?.macd?.macd?.[indicators.macd.macd.length - 1] || 0) - 
                (indicators?.macd?.signal?.[indicators.macd.signal.length - 1] || 0),
    bollingerPosition: 0.5,
    atrPercent: indicators?.atr?.[indicators.atr.length - 1] || 2
  };
}

function calculateRF(features) {
  let score = 0;
  if (features.rsi < 20) score += 3;
  else if (features.rsi > 80) score -= 3;
  if (features.sma5 > 0) score += 2;
  if (features.priceMomentum > 2) score += 2;
  else if (features.priceMomentum < -2) score -= 2;
  return score * 0.85;
}

function calculateXGB(features) {
  let score = 0;
  if (features.rsi < 20) score += 3;
  else if (features.rsi > 80) score -= 3;
  score += Math.min(features.priceMomentum / 2.5, 4);
  score += (features.sma5 * 0.6 + features.sma20 * 0.4) / 8;
  return score * 0.95;
}

function calculateLSTM(features) {
  let pred = features.priceMomentum * 0.8;
  const trendStrength = (features.sma5 + features.sma20 + features.sma50) / 3;
  if (Math.sign(features.priceMomentum) === Math.sign(trendStrength) && Math.abs(trendStrength) > 1) {
    pred *= 1.3;
  }
  if (features.macdSignal > 0 && pred > 0) pred *= 1.1;
  else if (features.macdSignal < 0 && pred < 0) pred *= 1.1;
  return pred;
}

function calculateConfidence(features, ensemble) {
  let confidence = 0.5;
  
  // RSI extreme increases confidence
  if (features.rsi < 15 || features.rsi > 85) confidence += 0.15;
  else if (features.rsi < 30 || features.rsi > 70) confidence += 0.08;
  
  // Trend confirmation
  if (Math.abs(features.sma5) > 2) confidence += 0.1;
  if (Math.abs(features.sma20) > 1) confidence += 0.05;
  
  // Volume confirmation
  if (features.volumeRatio > 1.5) confidence += 0.05;
  
  return Math.min(0.95, confidence);
}

function generateSignal(ensemble, confidence, lastPrice) {
  if (confidence < 0.6) {
    return {
      symbol: '',
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
  const volatility = 0.02;
  
  return {
    symbol: '',
    type: isBuy ? 'BUY' : 'SELL',
    entryPrice: lastPrice.close,
    stopLoss: isBuy ? lastPrice.close * (1 - volatility) : lastPrice.close * (1 + volatility),
    takeProfit: isBuy ? lastPrice.close * (1 + volatility * 2) : lastPrice.close * (1 - volatility * 2),
    confidence,
    timestamp: Date.now(),
    horizon: 5
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
    const { CandlestickPatternService } = await import('./candlestick-pattern-service');
    const { FeatureCalculationService } = await import('./feature-calculation-service');
    
    const calculator = new PredictionCalculator();
    const patternService = new CandlestickPatternService();
    const featureService = new FeatureCalculationService();

    const { symbol, data, indicators } = request;
    const features = featureService.calculateFeatures(data, indicators);
    const patternFeatures = patternService.calculatePatternFeatures(data);
    
    // Calculate predictions
    const rf = calculator.calculateRandomForest(features);
    const xgb = calculator.calculateXGBoost(features);
    const lstm = calculator.calculateLSTM(features);
    
    // Add pattern signal
    const patternSignal = patternService.getPatternSignal(patternFeatures);
    
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
    patternFeatures: any, 
    ensemble: number
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
        entryPrice: lastPrice.close,
        stopLoss: null,
        takeProfit: null,
        confidence,
        timestamp: Date.now(),
        horizon: 5
      };
    }
    
    const isBuy = ensemble > 0;
    const atr = Math.abs(lastPrice.high - lastPrice.low) / lastPrice.close;
    
    return {
      symbol,
      type: isBuy ? 'BUY' : 'SELL',
      entryPrice: lastPrice.close,
      stopLoss: isBuy ? lastPrice.close * (1 - atr) : lastPrice.close * (1 + atr),
      takeProfit: isBuy ? lastPrice.close * (1 + atr * 2) : lastPrice.close * (1 - atr * 2),
      confidence,
      timestamp: Date.now(),
      horizon: 5
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
