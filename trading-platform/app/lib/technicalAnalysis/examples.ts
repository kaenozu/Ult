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
  
  
  // Display integrated signal
  
  // Display key factors
  analysis.integrated.keyFactors.forEach((factor, i) => {
  });
  
  // Display pattern analysis
  
  // Show recent patterns
  const recentPatterns = analysis.patterns.candlestick.slice(-3);
  recentPatterns.forEach(pattern => {
  });
  
  // Display cycle analysis
  
  // Display fractal analysis
  
  // Display recommendations
  analysis.recommendations.forEach((rec, i) => {
  });
  
  // Generate prediction
  const prediction = await integratedTechnicalAnalyzer.integratePredictions(marketData, 5);
  
  prediction.predictions.forEach(forecast => {
    const changePercent = (forecast.ensemblePrediction * 100).toFixed(2);
    const confidencePercent = (forecast.confidence * 100).toFixed(1);
  });
  
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
