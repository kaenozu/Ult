/**
 * Integrated Technical Analyzer
 * 
 * Combines pattern recognition, cycle analysis, fractal analysis, and wavelet analysis
 * into a comprehensive technical analysis system.
 */

import { OHLCV } from '../../types/shared';
import { PatternRecognizer, createDefaultPatternConfig } from './PatternRecognizer';
import { CycleAnalyzer, createDefaultCycleConfig } from './CycleAnalyzer';
import { FractalAnalyzer, createDefaultFractalConfig } from './FractalAnalyzer';
import { WaveletAnalyzer, createDefaultWaveletConfig } from './WaveletAnalyzer';
import {
  IntegratedConfig,
  ComprehensiveAnalysis,
  IntegratedAnalysisResult,
  IntegratedPrediction,
  IntegratedForecast
} from './types';
import { mean } from './mathUtils';

export class IntegratedTechnicalAnalyzer {
  private patternRecognizer: PatternRecognizer;
  private cycleAnalyzer: CycleAnalyzer;
  private fractalAnalyzer: FractalAnalyzer;
  private waveletAnalyzer: WaveletAnalyzer;

  constructor(config?: Partial<IntegratedConfig>) {
    const fullConfig: IntegratedConfig = {
      pattern: config?.pattern || createDefaultPatternConfig(),
      cycle: config?.cycle || createDefaultCycleConfig(),
      fractal: config?.fractal || createDefaultFractalConfig(),
      wavelet: config?.wavelet || createDefaultWaveletConfig()
    };

    this.patternRecognizer = new PatternRecognizer(fullConfig.pattern);
    this.cycleAnalyzer = new CycleAnalyzer(fullConfig.cycle);
    this.fractalAnalyzer = new FractalAnalyzer(fullConfig.fractal);
    this.waveletAnalyzer = new WaveletAnalyzer(fullConfig.wavelet);
  }

  /**
   * Perform comprehensive technical analysis
   */
  performComprehensiveAnalysis(data: OHLCV[]): ComprehensiveAnalysis {
    // Pattern recognition
    const candlestickPatterns = this.patternRecognizer.recognizeCandlestickPatterns(data);
    const chartPatterns = this.patternRecognizer.recognizeChartPatterns(data);
    const geometricPatterns = this.patternRecognizer.recognizeGeometricPatterns(data);

    // Cycle analysis
    const cycleDetection = this.cycleAnalyzer.detectPriceCycles(data);
    const seasonality = this.cycleAnalyzer.analyzeSeasonality(data);

    // Fractal analysis
    const fractalDimension = this.fractalAnalyzer.calculateFractalDimension(data);
    const hurstExponent = this.fractalAnalyzer.calculateHurstExponent(data);

    // Wavelet analysis
    const waveletTransform = this.waveletAnalyzer.performDiscreteWaveletTransform(data);

    // Integrate all analyses
    const integrated = this.integrateAnalyses({
      candlestickPatterns,
      chartPatterns,
      geometricPatterns,
      cycleDetection,
      seasonality,
      fractalDimension,
      hurstExponent,
      waveletTransform
    });

    return {
      symbol: data[0]?.symbol || 'UNKNOWN',
      analysisDate: new Date(),
      patterns: {
        candlestick: candlestickPatterns,
        chart: chartPatterns,
        geometric: geometricPatterns
      },
      cycles: {
        detection: cycleDetection,
        seasonality
      },
      fractals: {
        dimension: fractalDimension,
        hurst: hurstExponent
      },
      wavelets: waveletTransform,
      integrated,
      recommendations: this.generateComprehensiveRecommendations(integrated, data)
    };
  }

  /**
   * Integrate all analyses into a single result
   */
  private integrateAnalyses(components: {
    candlestickPatterns: any[];
    chartPatterns: any[];
    geometricPatterns: any[];
    cycleDetection: any;
    seasonality: any;
    fractalDimension: any;
    hurstExponent: any;
    waveletTransform: any;
  }): IntegratedAnalysisResult {
    // Calculate bullish/bearish scores
    let bullishScore = 0;
    let bearishScore = 0;
    const factors: string[] = [];

    // Pattern analysis
    const recentCandlestick = components.candlestickPatterns.slice(-5);
    const bullishPatterns = recentCandlestick.filter(p => p.type === 'BULLISH').length;
    const bearishPatterns = recentCandlestick.filter(p => p.type === 'BEARISH').length;
    
    bullishScore += bullishPatterns * 10;
    bearishScore += bearishPatterns * 10;
    
    if (bullishPatterns > 0) {
      factors.push(`${bullishPatterns} bullish candlestick pattern(s) detected`);
    }
    if (bearishPatterns > 0) {
      factors.push(`${bearishPatterns} bearish candlestick pattern(s) detected`);
    }

    // Cycle analysis
    if (components.cycleDetection.cycleStrength > 0.3) {
      const phase = components.cycleDetection.phase;
      const cyclePosition = (phase / (2 * Math.PI)) * 100;
      
      if (cyclePosition < 25 || cyclePosition > 75) {
        // Near cycle bottom or top
        if (cyclePosition < 25) {
          bullishScore += 15;
          factors.push('Near cycle bottom - potential reversal upward');
        } else {
          bearishScore += 15;
          factors.push('Near cycle top - potential reversal downward');
        }
      }
    }

    // Fractal analysis
    const hurst = components.hurstExponent.hurstExponent;
    if (hurst > 0.6) {
      bullishScore += 10;
      factors.push('Persistent trending behavior detected');
    } else if (hurst < 0.4) {
      bearishScore += 5;
      factors.push('Mean-reverting behavior detected');
    }

    // Determine overall signal
    const totalScore = bullishScore + bearishScore;
    let overallSignal: IntegratedAnalysisResult['overallSignal'];
    
    if (totalScore === 0) {
      overallSignal = 'HOLD';
    } else {
      const bullishPercent = bullishScore / totalScore;
      
      if (bullishPercent > 0.7) {
        overallSignal = 'STRONG_BUY';
      } else if (bullishPercent > 0.55) {
        overallSignal = 'BUY';
      } else if (bullishPercent > 0.45) {
        overallSignal = 'HOLD';
      } else if (bullishPercent > 0.3) {
        overallSignal = 'SELL';
      } else {
        overallSignal = 'STRONG_SELL';
      }
    }

    // Calculate confidence
    const confidence = Math.min(0.95, totalScore / 100);

    // Determine risk level
    const volatility = components.fractalDimension.fractalDimension;
    let riskLevel: IntegratedAnalysisResult['riskLevel'];
    
    if (volatility > 1.7) {
      riskLevel = 'HIGH';
    } else if (volatility > 1.4) {
      riskLevel = 'MEDIUM';
    } else {
      riskLevel = 'LOW';
    }

    // Determine time horizon
    const dominantCyclePeriod = components.cycleDetection.dominantCycle.period;
    let timeHorizon: IntegratedAnalysisResult['timeHorizon'];
    
    if (dominantCyclePeriod < 10) {
      timeHorizon = 'SHORT';
    } else if (dominantCyclePeriod < 50) {
      timeHorizon = 'MEDIUM';
    } else {
      timeHorizon = 'LONG';
    }

    return {
      overallSignal,
      confidence,
      keyFactors: factors.slice(0, 5), // Top 5 factors
      riskLevel,
      timeHorizon
    };
  }

  /**
   * Generate comprehensive recommendations
   */
  private generateComprehensiveRecommendations(
    integrated: IntegratedAnalysisResult,
    data: OHLCV[]
  ): string[] {
    const recommendations: string[] = [];

    // Signal-based recommendations
    switch (integrated.overallSignal) {
      case 'STRONG_BUY':
        recommendations.push('Strong bullish signals detected - Consider opening long positions');
        break;
      case 'BUY':
        recommendations.push('Bullish signals present - Cautiously consider long positions');
        break;
      case 'HOLD':
        recommendations.push('Mixed signals - Consider holding current positions');
        break;
      case 'SELL':
        recommendations.push('Bearish signals present - Consider reducing long exposure');
        break;
      case 'STRONG_SELL':
        recommendations.push('Strong bearish signals - Consider exiting long positions or shorting');
        break;
    }

    // Risk-based recommendations
    switch (integrated.riskLevel) {
      case 'HIGH':
        recommendations.push('High volatility detected - Use tight stop losses and position sizing');
        break;
      case 'MEDIUM':
        recommendations.push('Moderate risk environment - Standard risk management applies');
        break;
      case 'LOW':
        recommendations.push('Low volatility environment - Consider larger position sizes if signal is strong');
        break;
    }

    // Time horizon recommendations
    switch (integrated.timeHorizon) {
      case 'SHORT':
        recommendations.push('Short-term cycles dominant - Focus on intraday to swing trading');
        break;
      case 'MEDIUM':
        recommendations.push('Medium-term cycles present - Position trading recommended');
        break;
      case 'LONG':
        recommendations.push('Long-term cycles active - Consider longer holding periods');
        break;
    }

    return recommendations;
  }

  /**
   * Integrate predictions from all engines
   */
  async integratePredictions(data: OHLCV[], horizon: number = 5): Promise<IntegratedPrediction> {
    // Get predictions from each engine
    const cyclePrediction = this.cycleAnalyzer.predictFromCycles(data, horizon);
    const fractalPrediction = this.fractalAnalyzer.predictFromFractals(data, horizon);
    const waveletPrediction = this.waveletAnalyzer.predictFromWavelets(data, horizon);

    // Integrate predictions
    const predictions: IntegratedForecast[] = [];
    
    for (let i = 0; i < horizon; i++) {
      const cycleChange = cyclePrediction.predictions[i]?.expectedChange || 0;
      const fractalChange = fractalPrediction.predictions[i]?.expectedChange || 0;
      const waveletChange = waveletPrediction.predictions[i]?.expectedChange || 0;
      
      // Weighted ensemble
      const cycleWeight = 0.3;
      const fractalWeight = 0.4;
      const waveletWeight = 0.3;
      
      const ensembleChange = 
        cycleChange * cycleWeight +
        fractalChange * fractalWeight +
        waveletChange * waveletWeight;
      
      // Average confidence
      const confidences = [
        cyclePrediction.predictions[i]?.confidence || 0,
        fractalPrediction.predictions[i]?.confidence || 0,
        waveletPrediction.predictions[i]?.confidence || 0
      ];
      const avgConfidence = mean(confidences);
      
      predictions.push({
        step: i + 1,
        cyclePrediction: cycleChange,
        fractalPrediction: fractalChange,
        waveletPrediction: waveletChange,
        ensemblePrediction: ensembleChange,
        confidence: avgConfidence
      });
    }

    return {
      symbol: data[0]?.symbol || 'UNKNOWN',
      horizon,
      predictions,
      confidence: mean(predictions.map(p => p.confidence)),
      timestamp: new Date()
    };
  }
}

/**
 * Create default integrated technical analyzer
 */
export function createIntegratedTechnicalAnalyzer(): IntegratedTechnicalAnalyzer {
  return new IntegratedTechnicalAnalyzer();
}

// Export singleton instance
export const integratedTechnicalAnalyzer = createIntegratedTechnicalAnalyzer();
