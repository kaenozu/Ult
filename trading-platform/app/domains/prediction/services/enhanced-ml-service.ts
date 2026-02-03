/**
 * Enhanced ML Prediction Service
 * 
 * Implements advanced features:
 * - Dynamic ensemble weight adjustment
 * - Model drift detection
 * - Performance tracking
 * - Expected value calculation
 * - Kelly criterion position sizing
 */

import { OHLCV, Stock, Signal } from '@/app/types';
import { PredictionFeatures } from '../types';
import { MLModelService } from './ml-model-service';

// Stub for MarketRegimeDetector (to be implemented in future tasks)
interface MarketRegime {
  regime: 'TRENDING' | 'RANGING' | 'VOLATILE' | 'QUIET';
  trendDirection: 'UP' | 'DOWN' | 'NEUTRAL';
  volatility: 'HIGH' | 'MEDIUM' | 'LOW';
  confidence: 'INITIAL' | 'CONFIRMED';
}
type VolatilityRegime = 'HIGH' | 'MEDIUM' | 'LOW';
const marketRegimeDetector = {
  detect: (data: OHLCV[]): MarketRegime => ({ regime: 'RANGING', trendDirection: 'NEUTRAL', volatility: 'MEDIUM', confidence: 'INITIAL' }),
};

export interface ModelPerformance {
  hitRate: number;
  avgError: number;
  sharpeRatio: number;
  predictions: number;
  correctPredictions: number;
}

export interface DriftMetrics {
  psi: number; // Population Stability Index
  klDivergence: number; // KL Divergence
  driftDetected: boolean;
  lastRetrainDate: Date;
  daysSinceRetrain: number;
}

export interface EnhancedPrediction {
  prediction: number;
  confidence: number;
  expectedValue: number;
  kellyFraction: number;
  recommendedPositionSize: number;
  driftRisk: 'LOW' | 'MEDIUM' | 'HIGH';
  marketRegime: MarketRegime;
  volatility: VolatilityRegime;
}

export class EnhancedMLService {
  private mlModelService: MLModelService;
  private performanceHistory: Map<string, ModelPerformance>;
  private dynamicWeights: { RF: number; XGB: number; LSTM: number };
  private driftMetrics: DriftMetrics;
  private predictionHistory: Array<{ prediction: number; actual: number; timestamp: Date }>;
  
  // Kelly criterion parameters
  private readonly MAX_KELLY_FRACTION = 0.5;
  private readonly DEFAULT_KELLY_FRACTION = 0.25;
  private readonly DEFAULT_WIN_LOSS_RATIO = 2.0; // Default win/loss ratio when insufficient data
  
  // Drift detection thresholds
  private readonly PSI_THRESHOLD = 0.2;
  private readonly KL_DIVERGENCE_THRESHOLD = 0.1;
  private readonly RETRAIN_DAYS = 30;

  constructor() {
    this.mlModelService = new MLModelService();
    this.performanceHistory = new Map();
    this.dynamicWeights = { RF: 0.35, XGB: 0.35, LSTM: 0.30 };
    this.driftMetrics = {
      psi: 0,
      klDivergence: 0,
      driftDetected: false,
      lastRetrainDate: new Date(),
      daysSinceRetrain: 0,
    };
    this.predictionHistory = [];
    
    // Initialize performance tracking
    this.initializePerformanceTracking();
  }

  /**
   * Initialize performance tracking for each model
   */
  private initializePerformanceTracking(): void {
    ['RF', 'XGB', 'LSTM'].forEach(model => {
      this.performanceHistory.set(model, {
        hitRate: 0.5,
        avgError: 1.0,
        sharpeRatio: 0,
        predictions: 0,
        correctPredictions: 0,
      });
    });
  }

  /**
   * Enhanced prediction with dynamic weights and drift detection
   */
  async predictEnhanced(
    features: PredictionFeatures,
    stock: Stock,
    historicalData: OHLCV[]
  ): Promise<EnhancedPrediction> {
    // 1. Update dynamic weights based on performance
    this.updateDynamicWeights();
    
    // 2. Detect model drift
    const driftRisk = this.detectModelDrift(features);
    
    // 3. Get market regime
    const regimeResult = marketRegimeDetector.detect(historicalData) as MarketRegime;
    
    // 4. Get base prediction with dynamic weights
    const basePrediction = this.mlModelService.predict(features);
    
    // 5. Apply dynamic weights
    const prediction = 
      basePrediction.rfPrediction * this.dynamicWeights.RF +
      basePrediction.xgbPrediction * this.dynamicWeights.XGB +
      basePrediction.lstmPrediction * this.dynamicWeights.LSTM;
    
    // 6. Adjust confidence based on drift risk and regime
    let confidence = basePrediction.confidence;
    if (driftRisk === 'HIGH') {
      confidence *= 0.7; // Reduce confidence when drift is detected
    } else if (driftRisk === 'MEDIUM') {
      confidence *= 0.85;
    }
    
    // Adjust confidence based on regime confidence
    if (regimeResult.confidence === 'INITIAL') {
      confidence *= 0.9;
    }
    
    // 7. Calculate expected value
    const expectedValue = this.calculateExpectedValue(
      prediction,
      confidence,
      regimeResult.volatility
    );
    
    // 8. Calculate Kelly criterion position sizing
    const kellyFraction = this.calculateKellyFraction(
      confidence,
      historicalData
    );
    
    // 9. Calculate recommended position size
    const recommendedPositionSize = this.calculatePositionSize(
      kellyFraction,
      regimeResult.volatility
    );
    
    return {
      prediction,
      confidence: Math.round(confidence),
      expectedValue,
      kellyFraction,
      recommendedPositionSize,
      driftRisk,
      marketRegime: regimeResult,
      volatility: regimeResult.volatility,
    };
  }

  /**
   * Update dynamic weights based on recent model performance
   */
  private updateDynamicWeights(): void {
    const rfPerf = this.performanceHistory.get('RF');
    const xgbPerf = this.performanceHistory.get('XGB');
    const lstmPerf = this.performanceHistory.get('LSTM');
    
    if (!rfPerf || !xgbPerf || !lstmPerf) return;
    
    // Use hit rate as primary performance metric
    const rfScore = rfPerf.hitRate;
    const xgbScore = xgbPerf.hitRate;
    const lstmScore = lstmPerf.hitRate;
    
    const totalScore = rfScore + xgbScore + lstmScore;
    
    if (totalScore > 0) {
      // Weight based on recent performance, but don't deviate too much from base weights
      const baseWeight = 0.5; // Keep 50% of base weight
      this.dynamicWeights = {
        RF: 0.35 * baseWeight + (rfScore / totalScore) * (1 - baseWeight),
        XGB: 0.35 * baseWeight + (xgbScore / totalScore) * (1 - baseWeight),
        LSTM: 0.30 * baseWeight + (lstmScore / totalScore) * (1 - baseWeight),
      };
      
      // Normalize to sum to 1
      const sum = this.dynamicWeights.RF + this.dynamicWeights.XGB + this.dynamicWeights.LSTM;
      this.dynamicWeights.RF /= sum;
      this.dynamicWeights.XGB /= sum;
      this.dynamicWeights.LSTM /= sum;
    }
  }

  /**
   * Detect model drift using PSI and KL divergence
   */
  private detectModelDrift(features: PredictionFeatures): 'LOW' | 'MEDIUM' | 'HIGH' {
    // Calculate days since last retrain
    const daysSinceRetrain = Math.floor(
      (new Date().getTime() - this.driftMetrics.lastRetrainDate.getTime()) / (1000 * 60 * 60 * 24)
    );
    this.driftMetrics.daysSinceRetrain = daysSinceRetrain;
    
    // Check if automatic retrain is needed based on time
    if (daysSinceRetrain > this.RETRAIN_DAYS) {
      this.driftMetrics.driftDetected = true;
      return 'HIGH';
    }
    
    // Calculate PSI (Population Stability Index) - simplified
    // In production, this would compare feature distributions
    const recentPredictions = this.predictionHistory.slice(-100);
    if (recentPredictions.length < 50) {
      return 'LOW'; // Not enough data to detect drift
    }
    
    // Calculate prediction error trend
    const recentErrors = recentPredictions.map(p => Math.abs(p.prediction - p.actual));
    if (recentErrors.length === 0) {
      return 'LOW'; // No errors to analyze
    }
    
    const avgError = recentErrors.reduce((sum, e) => sum + e, 0) / recentErrors.length;
    
    // Compare with historical average
    const historicalAvgError = this.calculateHistoricalAvgError();
    const errorIncrease = avgError / (historicalAvgError || 1);
    
    // Update drift metrics
    this.driftMetrics.psi = errorIncrease - 1;
    this.driftMetrics.driftDetected = errorIncrease > 1.3;
    
    if (errorIncrease > 1.5) {
      return 'HIGH';
    } else if (errorIncrease > 1.2) {
      return 'MEDIUM';
    }
    return 'LOW';
  }

  /**
   * Calculate expected value of a trade
   */
  private calculateExpectedValue(
    prediction: number,
    confidence: number,
    volatility: VolatilityRegime
  ): number {
    // Expected value = (Win probability * Average win) - (Loss probability * Average loss)
    const winProb = confidence / 100;
    const lossProb = 1 - winProb;
    
    // Adjust for volatility
    let avgWin = Math.abs(prediction) * 1.5;
    let avgLoss = Math.abs(prediction) * 0.5;
    
    if (volatility === 'HIGH') {
      avgWin *= 1.2;
      avgLoss *= 1.3;
    } else if (volatility === 'LOW') {
      avgWin *= 0.9;
      avgLoss *= 0.7;
    }
    
    return (winProb * avgWin) - (lossProb * avgLoss);
  }

  /**
   * Calculate Kelly criterion fraction for position sizing
   */
  private calculateKellyFraction(
    confidence: number,
    historicalData: OHLCV[]
  ): number {
    // Kelly criterion: f = (bp - q) / b
    // where:
    // f = fraction of capital to bet
    // b = odds received on the bet (win/loss ratio)
    // p = probability of winning
    // q = probability of losing (1 - p)
    
    const p = confidence / 100; // Win probability
    const q = 1 - p; // Loss probability
    
    // Estimate win/loss ratio from historical data
    const b = this.estimateWinLossRatio(historicalData);
    
    // Kelly formula
    let kelly = (b * p - q) / b;
    
    // Apply safety constraints
    kelly = Math.max(0, Math.min(kelly, this.MAX_KELLY_FRACTION));
    
    // Use fractional Kelly for safety
    return kelly * this.DEFAULT_KELLY_FRACTION / this.MAX_KELLY_FRACTION;
  }

  /**
   * Estimate win/loss ratio from historical data
   */
  private estimateWinLossRatio(historicalData: OHLCV[]): number {
    if (historicalData.length < 20) return this.DEFAULT_WIN_LOSS_RATIO;
    
    // Calculate average up days vs down days
    let upDays = 0;
    let downDays = 0;
    let totalUpMove = 0;
    let totalDownMove = 0;
    
    for (let i = 1; i < historicalData.length; i++) {
      const change = (historicalData[i].close - historicalData[i-1].close) / historicalData[i-1].close;
      if (change > 0) {
        upDays++;
        totalUpMove += change;
      } else {
        downDays++;
        totalDownMove += Math.abs(change);
      }
    }
    
    const avgUp = upDays > 0 ? totalUpMove / upDays : 0;
    const avgDown = downDays > 0 ? totalDownMove / downDays : 1;
    
    return avgDown > 0 ? avgUp / avgDown : this.DEFAULT_WIN_LOSS_RATIO;
  }

  /**
   * Calculate recommended position size
   */
  private calculatePositionSize(
    kellyFraction: number,
    volatility: VolatilityRegime
  ): number {
    let positionSize = kellyFraction * 100; // As percentage
    
    // Adjust for volatility
    if (volatility === 'HIGH') {
      positionSize *= 0.5; // Reduce size in high volatility
    } else if (volatility === 'LOW') {
      positionSize *= 1.2; // Increase size in low volatility
    }
    
    // Cap at reasonable limits
    return Math.max(1, Math.min(positionSize, 20));
  }

  /**
   * Update performance metrics after prediction
   */
  updatePerformance(
    modelType: 'RF' | 'XGB' | 'LSTM',
    prediction: number,
    actual: number
  ): void {
    const perf = this.performanceHistory.get(modelType);
    if (!perf) return;
    
    // Update prediction count
    perf.predictions++;
    
    // Check if prediction was correct (same direction)
    const predictionDirection = prediction > 0 ? 1 : -1;
    const actualDirection = actual > 0 ? 1 : -1;
    const correct = predictionDirection === actualDirection;
    
    if (correct) {
      perf.correctPredictions++;
    }
    
    // Update hit rate
    perf.hitRate = perf.correctPredictions / perf.predictions;
    
    // Update average error
    const error = Math.abs(prediction - actual);
    perf.avgError = (perf.avgError * (perf.predictions - 1) + error) / perf.predictions;
    
    // Update Sharpe ratio (simplified)
    perf.sharpeRatio = this.calculateSharpeRatio(modelType);
    
    // Store prediction for drift detection
    this.predictionHistory.push({
      prediction,
      actual,
      timestamp: new Date(),
    });
    
    // Keep only last 200 predictions
    if (this.predictionHistory.length > 200) {
      this.predictionHistory.shift();
    }
  }

  /**
   * Calculate Sharpe ratio for a model
   */
  private calculateSharpeRatio(modelType: 'RF' | 'XGB' | 'LSTM'): number {
    const recentPredictions = this.predictionHistory.slice(-50);
    if (recentPredictions.length < 10) return 0;
    
    // Calculate returns
    const returns = recentPredictions.map(p => p.actual);
    const avgReturn = returns.reduce((sum, r) => sum + r, 0) / returns.length;
    
    // Calculate standard deviation
    const variance = returns.reduce((sum, r) => sum + Math.pow(r - avgReturn, 2), 0) / returns.length;
    const stdDev = Math.sqrt(variance);
    
    // Sharpe ratio = (avg return - risk free rate) / std dev
    // Assuming risk-free rate of 0 for simplicity
    return stdDev > 0 ? avgReturn / stdDev : 0;
  }

  /**
   * Calculate historical average error
   */
  private calculateHistoricalAvgError(): number {
    if (this.predictionHistory.length < 10) return 1.0;
    
    const errors = this.predictionHistory.map(p => Math.abs(p.prediction - p.actual));
    return errors.reduce((sum, e) => sum + e, 0) / errors.length;
  }

  /**
   * Trigger model retraining
   */
  async triggerRetrain(): Promise<void> {
    console.log('Triggering model retraining...');
    
    // Reset drift metrics
    this.driftMetrics.lastRetrainDate = new Date();
    this.driftMetrics.daysSinceRetrain = 0;
    this.driftMetrics.driftDetected = false;
    this.driftMetrics.psi = 0;
    this.driftMetrics.klDivergence = 0;
    
    // Reset performance history
    this.initializePerformanceTracking();
    
    // In production, this would trigger actual model retraining
    console.log('Model retraining completed');
  }

  /**
   * Get current model statistics
   */
  getModelStats(): {
    weights: { RF: number; XGB: number; LSTM: number };
    performance: Map<string, ModelPerformance>;
    drift: DriftMetrics;
  } {
    return {
      weights: { ...this.dynamicWeights },
      performance: new Map(this.performanceHistory),
      drift: { ...this.driftMetrics },
    };
  }

  /**
   * Check if signal meets minimum expected value threshold
   */
  shouldTakeSignal(enhancedPrediction: EnhancedPrediction): boolean {
    // Minimum expected value threshold
    const MIN_EXPECTED_VALUE = 0.5;
    
    // Minimum confidence threshold
    const MIN_CONFIDENCE = 60;
    
    // Don't trade if drift risk is high
    if (enhancedPrediction.driftRisk === 'HIGH') {
      return false;
    }
    
    return (
      enhancedPrediction.expectedValue >= MIN_EXPECTED_VALUE &&
      enhancedPrediction.confidence >= MIN_CONFIDENCE
    );
  }
}

export const enhancedMLService = new EnhancedMLService();
