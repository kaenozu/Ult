/**
 * Example Usage of Advanced Technical Analysis System
 * 
 * This file demonstrates how to use the technical analysis engines.
 */

import { integratedTechnicalAnalyzer } from './index';
import { OHLCV } from '../../types/shared';

/**
 * Example: Analyze market data and generate trading signal
 */
export async function analyzeMarketAndGenerateSignal(marketData: OHLCV[]) {
  // Perform comprehensive analysis
  const analysis = integratedTechnicalAnalyzer.performComprehensiveAnalysis(marketData);
  
  console.log('=== Technical Analysis Results ===');
  console.log(`Symbol: ${analysis.symbol}`);
  console.log(`Analysis Date: ${analysis.analysisDate}`);
  console.log('');
  
  // Display integrated signal
  console.log('=== Trading Signal ===');
  console.log(`Signal: ${analysis.integrated.overallSignal}`);
  console.log(`Confidence: ${(analysis.integrated.confidence * 100).toFixed(1)}%`);
  console.log(`Risk Level: ${analysis.integrated.riskLevel}`);
  console.log(`Time Horizon: ${analysis.integrated.timeHorizon}`);
  console.log('');
  
  // Display key factors
  console.log('=== Key Factors ===');
  analysis.integrated.keyFactors.forEach((factor, i) => {
    console.log(`${i + 1}. ${factor}`);
  });
  console.log('');
  
  // Display pattern analysis
  console.log('=== Pattern Analysis ===');
  console.log(`Candlestick Patterns: ${analysis.patterns.candlestick.length} detected`);
  
  // Show recent patterns
  const recentPatterns = analysis.patterns.candlestick.slice(-3);
  recentPatterns.forEach(pattern => {
    console.log(`  - ${pattern.name} (${pattern.type}) - Confidence: ${(pattern.confidence * 100).toFixed(1)}%`);
  });
  console.log('');
  
  // Display cycle analysis
  console.log('=== Cycle Analysis ===');
  console.log(`Dominant Cycle Period: ${analysis.cycles.detection.dominantCycle.period.toFixed(1)} periods`);
  console.log(`Cycle Strength: ${(analysis.cycles.detection.cycleStrength * 100).toFixed(1)}%`);
  console.log('');
  
  // Display fractal analysis
  console.log('=== Fractal Analysis ===');
  console.log(`Fractal Dimension: ${analysis.fractals.dimension.fractalDimension.toFixed(3)}`);
  console.log(`  ${analysis.fractals.dimension.interpretation}`);
  console.log(`Hurst Exponent: ${analysis.fractals.hurst.hurstExponent.toFixed(3)}`);
  console.log(`  ${analysis.fractals.hurst.interpretation}`);
  console.log('');
  
  // Display recommendations
  console.log('=== Recommendations ===');
  analysis.recommendations.forEach((rec, i) => {
    console.log(`${i + 1}. ${rec}`);
  });
  console.log('');
  
  // Generate prediction
  console.log('=== Price Predictions (Next 5 Periods) ===');
  const prediction = await integratedTechnicalAnalyzer.integratePredictions(marketData, 5);
  
  prediction.predictions.forEach(forecast => {
    const changePercent = (forecast.ensemblePrediction * 100).toFixed(2);
    const confidencePercent = (forecast.confidence * 100).toFixed(1);
    console.log(`Step ${forecast.step}: ${changePercent > '0' ? '+' : ''}${changePercent}% (Confidence: ${confidencePercent}%)`);
  });
  console.log('');
  
  return {
    signal: analysis.integrated.overallSignal,
    confidence: analysis.integrated.confidence,
    riskLevel: analysis.integrated.riskLevel,
    recommendations: analysis.recommendations,
    prediction: prediction.predictions[0] // Next period prediction
  };
}

/**
 * Example: Real-time analysis with streaming data
 */
export class RealTimeAnalyzer {
  private dataBuffer: OHLCV[] = [];
  private readonly maxBufferSize: number = 500;
  
  /**
   * Add new candle and update analysis
   */
  addCandle(candle: OHLCV): void {
    this.dataBuffer.push(candle);
    
    // Maintain buffer size
    if (this.dataBuffer.length > this.maxBufferSize) {
      this.dataBuffer.shift();
    }
  }
  
  /**
   * Get current analysis
   */
  getCurrentAnalysis() {
    if (this.dataBuffer.length < 50) {
      return {
        error: 'Insufficient data for analysis (minimum 50 candles required)',
        bufferedCandles: this.dataBuffer.length
      };
    }
    
    return integratedTechnicalAnalyzer.performComprehensiveAnalysis(this.dataBuffer);
  }
  
  /**
   * Check if signal changed
   */
  hasSignalChanged(previousSignal: string): boolean {
    if (this.dataBuffer.length < 50) return false;
    
    const currentAnalysis = this.getCurrentAnalysis();
    if ('error' in currentAnalysis) return false;
    
    return currentAnalysis.integrated.overallSignal !== previousSignal;
  }
}

/**
 * Example: Batch analysis of multiple symbols
 */
export async function analyzeMultipleSymbols(
  dataBySymbol: Map<string, OHLCV[]>
): Promise<Map<string, AnalysisResult>> {
  const results = new Map<string, AnalysisResult>();
  
  for (const [symbol, data] of dataBySymbol.entries()) {
    if (data.length < 50) {
      results.set(symbol, { error: 'Insufficient data' });
      continue;
    }
    
    try {
      const analysis = integratedTechnicalAnalyzer.performComprehensiveAnalysis(data);
      results.set(symbol, {
        signal: analysis.integrated.overallSignal,
        confidence: analysis.integrated.confidence,
        riskLevel: analysis.integrated.riskLevel
      });
    } catch (error) {
      results.set(symbol, { error: error instanceof Error ? error.message : 'Unknown error' });
    }
  }
  
  return results;
}

interface AnalysisResult {
  signal?: string;
  confidence?: number;
  riskLevel?: string;
  error?: string;
}

/**
 * Example: Filter symbols by technical criteria
 */
export function filterByTechnicalCriteria(
  analyses: Map<string, AnalysisResult>,
  criteria: {
    minConfidence?: number;
    allowedSignals?: string[];
    maxRisk?: string;
  }
): string[] {
  const filtered: string[] = [];
  
  for (const [symbol, analysis] of analyses.entries()) {
    if ('error' in analysis) continue;
    
    // Check confidence
    if (criteria.minConfidence && (analysis.confidence === undefined || analysis.confidence < criteria.minConfidence)) {
      continue;
    }
    
    // Check signal
    if (criteria.allowedSignals && (!analysis.signal || !criteria.allowedSignals.includes(analysis.signal))) {
      continue;
    }
    
    // Check risk level
    if (criteria.maxRisk) {
      const riskOrder = { LOW: 1, MEDIUM: 2, HIGH: 3 };
      const maxRiskLevel = riskOrder[criteria.maxRisk as keyof typeof riskOrder] || 3;
      const currentRiskLevel = riskOrder[analysis.riskLevel as keyof typeof riskOrder] || 3;
      
      if (currentRiskLevel > maxRiskLevel) {
        continue;
      }
    }
    
    filtered.push(symbol);
  }
  
  return filtered;
}
