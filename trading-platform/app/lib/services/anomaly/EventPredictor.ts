/**
 * Event Predictor
 * Predicts market events and price movements
 * TRADING-010: 異常検知と市場予測システムの実装
 */

import { OHLCV } from '@/app/types/shared';
import {
  Asset,
  EventPrediction,
  EventType,
  PredictionConfig,
  PriceMovementPrediction,
  Portfolio,
  TailRiskAssessment,
  RiskCorrelationAnalysis,
  MonteCarloResult,
  ExtremeValueAnalysis,
  CopulaModel,
  StressScenario,
} from './types';

export class EventPredictor {
  private config: PredictionConfig;

  constructor(config?: Partial<PredictionConfig>) {
    this.config = {
      lstmConfig: {
        sequenceLength: 20,
        hiddenUnits: 64,
        learningRate: 0.001,
        ...config?.lstmConfig,
      },
      transformerConfig: {
        nHeads: 4,
        nLayers: 2,
        hiddenDim: 128,
        ...config?.transformerConfig,
      },
      attentionConfig: {
        heads: 4,
        dropout: 0.1,
        ...config?.attentionConfig,
      },
    };
  }

  /**
   * Predict market events
   */
  async predictEvent(marketData: OHLCV[]): Promise<EventPrediction> {
    const features = this.extractFeatures(marketData);
    
    // Simplified prediction logic (in production, this would use trained models)
    const eventType = this.determineEventType(marketData);
    const probability = this.calculateEventProbability(marketData, eventType);
    const expectedTime = this.estimateEventTime(marketData);
    const attentionWeights = this.computeAttentionWeights(features);
    
    return {
      eventType,
      probability,
      expectedTime,
      confidence: this.calculateConfidence(probability),
      attentionWeights,
      recommendedActions: this.getRecommendedActions(eventType, probability),
    };
  }

  /**
   * Predict price movement
   */
  async predictPriceMovement(
    symbol: string,
    historicalData: OHLCV[],
    horizon: number = 5
  ): Promise<PriceMovementPrediction> {
    const features = this.extractPriceFeatures(historicalData);
    const predictions = this.generatePredictions(historicalData, horizon);
    const uncertainty = this.quantifyUncertainty(predictions);

    return {
      symbol,
      predictions,
      uncertainty,
      confidence: this.calculatePredictionConfidence(predictions, uncertainty),
      horizon,
      timestamp: new Date(),
    };
  }

  /**
   * Assess tail risk
   */
  assessTailRisk(portfolio: Portfolio): TailRiskAssessment {
    const returns = portfolio.getHistoricalReturns();
    
    const evtAnalysis = this.performExtremeValueAnalysis(returns);
    const monteCarloResults = this.runMonteCarloSimulation(portfolio, 10000);
    
    const var95 = this.calculateVaR(returns, 0.95);
    const var99 = this.calculateVaR(returns, 0.99);
    const cvar95 = this.calculateCVaR(returns, var95);
    const cvar99 = this.calculateCVaR(returns, var99);

    return {
      var95,
      var99,
      cvar95,
      cvar99,
      evtAnalysis,
      monteCarloResults,
      riskLevel: this.assessRiskLevel(cvar99),
      recommendations: this.getTailRiskRecommendations(cvar99),
    };
  }

  /**
   * Analyze risk correlation
   */
  analyzeRiskCorrelation(assets: Asset[]): RiskCorrelationAnalysis {
    const returns = assets.map(asset => asset.getReturns());
    const correlationMatrix = this.calculateCorrelationMatrix(returns);
    const copula = this.fitCopula(returns);
    const stressScenarios = this.generateStressScenarios(assets);

    return {
      correlationMatrix,
      copula,
      stressScenarios,
      diversificationBenefit: this.calculateDiversificationBenefit(correlationMatrix),
      recommendations: this.getCorrelationRecommendations(correlationMatrix),
    };
  }

  /**
   * Extract features from market data
   */
  private extractFeatures(data: OHLCV[]): Record<string, number> {
    const recent = data.slice(-20);
    
    return {
      avgVolume: recent.reduce((sum, d) => sum + d.volume, 0) / recent.length,
      priceChange: (recent[recent.length - 1].close - recent[0].close) / recent[0].close,
      volatility: this.calculateVolatility(recent),
      momentum: this.calculateMomentum(recent),
    };
  }

  /**
   * Extract price-specific features
   */
  private extractPriceFeatures(data: OHLCV[]): number[] {
    return data.slice(-this.config.lstmConfig.sequenceLength).map(d => d.close);
  }

  /**
   * Determine event type from data patterns
   */
  private determineEventType(data: OHLCV[]): EventType {
    const volatility = this.calculateVolatility(data);
    const trend = this.calculateTrend(data);
    const momentum = this.calculateMomentum(data);

    if (volatility > 0.03) return 'HIGH_VOLATILITY';
    if (trend > 0.02 && momentum > 0.5) return 'RALLY';
    if (trend < -0.02 && momentum < -0.5) return 'MARKET_CRASH';
    if (Math.abs(trend) < 0.005) return 'CONSOLIDATION';
    if (Math.abs(momentum) > 0.7) return 'BREAKOUT';
    
    return 'TREND_REVERSAL';
  }

  /**
   * Calculate event probability
   */
  private calculateEventProbability(data: OHLCV[], eventType: EventType): number {
    // Simplified probability calculation
    const volatility = this.calculateVolatility(data);
    const momentum = Math.abs(this.calculateMomentum(data));
    
    const baseProbability = 0.3;
    const volatilityFactor = Math.min(volatility * 10, 0.3);
    const momentumFactor = Math.min(momentum * 0.4, 0.4);
    
    return Math.min(baseProbability + volatilityFactor + momentumFactor, 0.95);
  }

  /**
   * Estimate when event might occur
   */
  private estimateEventTime(data: OHLCV[]): Date {
    // Simplified: estimate based on current momentum
    const momentum = this.calculateMomentum(data);
    const daysAhead = Math.max(1, Math.floor(10 * (1 - Math.abs(momentum))));
    
    const estimatedDate = new Date();
    estimatedDate.setDate(estimatedDate.getDate() + daysAhead);
    return estimatedDate;
  }

  /**
   * Compute attention weights for features
   */
  private computeAttentionWeights(features: Record<string, number>): Record<string, number> {
    // Simplified attention mechanism
    const total = Object.values(features).reduce((sum, val) => sum + Math.abs(val), 0);
    
    const weights: Record<string, number> = {};
    for (const [key, value] of Object.entries(features)) {
      weights[key] = total > 0 ? Math.abs(value) / total : 0.25;
    }
    
    return weights;
  }

  /**
   * Generate price predictions
   */
  private generatePredictions(
    data: OHLCV[],
    horizon: number
  ): Array<{ timestamp: Date; price: number; confidence: number }> {
    const lastPrice = data[data.length - 1].close;
    const trend = this.calculateTrend(data);
    const volatility = this.calculateVolatility(data);
    
    const predictions: Array<{ timestamp: Date; price: number; confidence: number }> = [];
    
    for (let i = 1; i <= horizon; i++) {
      const expectedReturn = trend * i;
      const noise = (Math.random() - 0.5) * volatility * i;
      const predictedPrice = lastPrice * (1 + expectedReturn + noise);
      
      const date = new Date();
      date.setDate(date.getDate() + i);
      
      predictions.push({
        timestamp: date,
        price: predictedPrice,
        confidence: Math.max(0.5 - i * 0.05, 0.2),
      });
    }
    
    return predictions;
  }

  /**
   * Quantify prediction uncertainty
   */
  private quantifyUncertainty(
    predictions: Array<{ timestamp: Date; price: number; confidence: number }>
  ): { lower: number[]; upper: number[]; std: number[] } {
    const lower: number[] = [];
    const upper: number[] = [];
    const std: number[] = [];
    
    predictions.forEach((pred, i) => {
      const uncertainty = pred.price * (0.02 + i * 0.01);
      lower.push(pred.price - uncertainty);
      upper.push(pred.price + uncertainty);
      std.push(uncertainty / 2);
    });
    
    return { lower, upper, std };
  }

  /**
   * Calculate VaR (Value at Risk)
   */
  private calculateVaR(returns: number[], confidence: number): number {
    const sorted = [...returns].sort((a, b) => a - b);
    const index = Math.floor((1 - confidence) * sorted.length);
    return Math.abs(sorted[index] ?? 0);
  }

  /**
   * Calculate CVaR (Conditional Value at Risk)
   */
  private calculateCVaR(returns: number[], var_: number): number {
    const losses = returns.filter(r => r < -var_);
    if (losses.length === 0) return var_;
    
    return Math.abs(losses.reduce((sum, loss) => sum + loss, 0) / losses.length);
  }

  /**
   * Perform Extreme Value Analysis
   */
  private performExtremeValueAnalysis(returns: number[]): ExtremeValueAnalysis {
    const sorted = [...returns].sort((a, b) => a - b);
    const extremes = sorted.slice(0, Math.floor(sorted.length * 0.05));
    
    const mean = extremes.reduce((sum, val) => sum + val, 0) / extremes.length;
    const variance = extremes.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / extremes.length;
    const std = Math.sqrt(variance);
    
    return {
      shape: -0.1, // Simplified
      scale: std,
      location: mean,
      tailIndex: 3.0, // Simplified
      extremeQuantiles: {
        '0.01': sorted[Math.floor(sorted.length * 0.01)],
        '0.05': sorted[Math.floor(sorted.length * 0.05)],
        '0.10': sorted[Math.floor(sorted.length * 0.10)],
      },
    };
  }

  /**
   * Run Monte Carlo simulation
   */
  private runMonteCarloSimulation(portfolio: Portfolio, scenarios: number): MonteCarloResult {
    const returns = portfolio.getHistoricalReturns();
    const mean = returns.reduce((sum, r) => sum + r, 0) / returns.length;
    const std = Math.sqrt(
      returns.reduce((sum, r) => sum + Math.pow(r - mean, 2), 0) / returns.length
    );
    
    const simulations: number[] = [];
    
    for (let i = 0; i < scenarios; i++) {
      // Box-Muller transform for normal distribution
      const u1 = Math.random();
      const u2 = Math.random();
      const z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
      const simulatedReturn = mean + z * std;
      simulations.push(simulatedReturn * portfolio.totalValue);
    }
    
    simulations.sort((a, b) => a - b);
    
    return {
      scenarios,
      worstCase: simulations[0],
      bestCase: simulations[simulations.length - 1],
      meanReturn: simulations.reduce((sum, val) => sum + val, 0) / scenarios,
      stdDev: std * portfolio.totalValue,
      distribution: simulations,
    };
  }

  /**
   * Calculate correlation matrix
   */
  private calculateCorrelationMatrix(returnsArray: number[][]): number[][] {
    const n = returnsArray.length;
    const matrix: number[][] = [];
    
    for (let i = 0; i < n; i++) {
      matrix[i] = [];
      for (let j = 0; j < n; j++) {
        if (i === j) {
          matrix[i][j] = 1.0;
        } else {
          matrix[i][j] = this.calculateCorrelation(returnsArray[i], returnsArray[j]);
        }
      }
    }
    
    return matrix;
  }

  /**
   * Calculate correlation between two series
   */
  private calculateCorrelation(x: number[], y: number[]): number {
    const n = Math.min(x.length, y.length);
    const meanX = x.slice(0, n).reduce((sum, val) => sum + val, 0) / n;
    const meanY = y.slice(0, n).reduce((sum, val) => sum + val, 0) / n;
    
    let numerator = 0;
    let denomX = 0;
    let denomY = 0;
    
    for (let i = 0; i < n; i++) {
      const dx = x[i] - meanX;
      const dy = y[i] - meanY;
      numerator += dx * dy;
      denomX += dx * dx;
      denomY += dy * dy;
    }
    
    const denom = Math.sqrt(denomX * denomY);
    return denom > 0 ? numerator / denom : 0;
  }

  /**
   * Fit copula model (simplified Gaussian copula)
   */
  private fitCopula(returnsArray: number[][]): CopulaModel {
    const correlationMatrix = this.calculateCorrelationMatrix(returnsArray);
    
    return {
      type: 'gaussian',
      parameters: { df: 5 },
      dependenceStructure: correlationMatrix,
    };
  }

  /**
   * Generate stress scenarios
   */
  private generateStressScenarios(assets: Asset[]): StressScenario[] {
    return [
      {
        name: 'Market Crash',
        description: 'Sudden 20% market decline',
        impact: -0.2,
        probability: 0.05,
        affectedAssets: assets.map(a => a.symbol),
      },
      {
        name: 'Sector Rotation',
        description: 'Major sector-specific sell-off',
        impact: -0.15,
        probability: 0.1,
        affectedAssets: assets.slice(0, Math.floor(assets.length / 2)).map(a => a.symbol),
      },
      {
        name: 'Volatility Spike',
        description: 'Sharp increase in market volatility',
        impact: -0.1,
        probability: 0.15,
        affectedAssets: assets.map(a => a.symbol),
      },
    ];
  }

  /**
   * Calculate diversification benefit
   */
  private calculateDiversificationBenefit(correlationMatrix: number[][]): number {
    const n = correlationMatrix.length;
    if (n <= 1) return 0;
    
    let avgCorrelation = 0;
    let count = 0;
    
    for (let i = 0; i < n; i++) {
      for (let j = i + 1; j < n; j++) {
        avgCorrelation += Math.abs(correlationMatrix[i][j]);
        count++;
      }
    }
    
    avgCorrelation = count > 0 ? avgCorrelation / count : 0;
    return 1 - avgCorrelation;
  }

  /**
   * Helper: Calculate volatility
   */
  private calculateVolatility(data: OHLCV[]): number {
    const returns = data.slice(1).map((d, i) => {
      return (d.close - data[i].close) / data[i].close;
    });
    
    const mean = returns.reduce((sum, r) => sum + r, 0) / returns.length;
    const variance = returns.reduce((sum, r) => sum + Math.pow(r - mean, 2), 0) / returns.length;
    return Math.sqrt(variance);
  }

  /**
   * Helper: Calculate trend
   */
  private calculateTrend(data: OHLCV[]): number {
    if (data.length < 2) return 0;
    return (data[data.length - 1].close - data[0].close) / data[0].close;
  }

  /**
   * Helper: Calculate momentum
   */
  private calculateMomentum(data: OHLCV[]): number {
    if (data.length < 10) return 0;
    
    const recent = data.slice(-5);
    const previous = data.slice(-10, -5);
    
    const recentAvg = recent.reduce((sum, d) => sum + d.close, 0) / recent.length;
    const previousAvg = previous.reduce((sum, d) => sum + d.close, 0) / previous.length;
    
    return previousAvg > 0 ? (recentAvg - previousAvg) / previousAvg : 0;
  }

  /**
   * Calculate confidence from probability
   */
  private calculateConfidence(probability: number): number {
    return Math.min(probability * 1.2, 0.95);
  }

  /**
   * Calculate prediction confidence
   */
  private calculatePredictionConfidence(
    predictions: Array<{ timestamp: Date; price: number; confidence: number }>,
    uncertainty: { lower: number[]; upper: number[]; std: number[] }
  ): number {
    const avgConfidence = predictions.reduce((sum, p) => sum + p.confidence, 0) / predictions.length;
    const avgUncertaintyRatio = uncertainty.std.reduce((sum, s, index) => {
      const price = predictions[index].price;
      return sum + s / price;
    }, 0) / uncertainty.std.length;
    
    return avgConfidence * (1 - avgUncertaintyRatio);
  }

  /**
   * Assess risk level from CVaR
   */
  private assessRiskLevel(cvar99: number): 'LOW' | 'MEDIUM' | 'HIGH' | 'EXTREME' {
    if (cvar99 > 0.2) return 'EXTREME';
    if (cvar99 > 0.1) return 'HIGH';
    if (cvar99 > 0.05) return 'MEDIUM';
    return 'LOW';
  }

  /**
   * Get tail risk recommendations
   */
  private getTailRiskRecommendations(cvar99: number): string[] {
    if (cvar99 > 0.2) {
      return [
        'Extreme tail risk detected',
        'Consider significant position reduction',
        'Implement strict stop losses',
        'Increase cash reserves',
      ];
    }
    if (cvar99 > 0.1) {
      return [
        'High tail risk identified',
        'Review and adjust position sizes',
        'Consider hedging strategies',
      ];
    }
    return ['Tail risk within acceptable limits', 'Continue monitoring'];
  }

  /**
   * Get correlation recommendations
   */
  private getCorrelationRecommendations(correlationMatrix: number[][]): string[] {
    const avgCorr = this.calculateDiversificationBenefit(correlationMatrix);
    
    if (avgCorr < 0.3) {
      return [
        'High correlation detected between assets',
        'Consider diversifying into uncorrelated assets',
        'Portfolio may not be adequately diversified',
      ];
    }
    
    return ['Correlation levels are acceptable', 'Maintain current diversification'];
  }

  /**
   * Get recommended actions for event type
   */
  private getRecommendedActions(eventType: EventType, probability: number): string[] {
    const actions: Record<EventType, string[]> = {
      MARKET_CRASH: ['Reduce exposure', 'Raise cash levels', 'Consider hedging'],
      RALLY: ['Consider increasing exposure', 'Trail stop losses', 'Take partial profits'],
      CONSOLIDATION: ['Wait for breakout', 'Tighten stops', 'Reduce position sizes'],
      BREAKOUT: ['Enter positions on confirmation', 'Set stop losses', 'Monitor volume'],
      TREND_REVERSAL: ['Exit counter-trend positions', 'Wait for confirmation', 'Reduce exposure'],
      HIGH_VOLATILITY: ['Reduce position sizes', 'Widen stops', 'Be prepared for swings'],
    };
    
    const baseActions = actions[eventType] || ['Monitor closely'];
    
    if (probability > 0.7) {
      return ['High probability event', ...baseActions];
    }
    
    return baseActions;
  }
}
