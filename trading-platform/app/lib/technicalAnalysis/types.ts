/**
 * Advanced Technical Analysis Types
 * 
 * Type definitions for pattern recognition, cycle analysis, fractal analysis,
 * and wavelet analysis engines.
 */

// ============================================================================
// Pattern Recognition Types
// ============================================================================

export interface PatternConfig {
  candlestick: CandlestickPatternConfig;
  chart: ChartPatternConfig;
  geometric: GeometricPatternConfig;
}

export interface CandlestickPatternConfig {
  minBodySize: number;
  wickThreshold: number;
}

export interface ChartPatternConfig {
  minPatternBars: number;
  tolerancePercent: number;
}

export interface GeometricPatternConfig {
  fibonacciLevels: number[];
  gannAngles: number[];
}

export interface CandlestickPatternResult {
  id: string;
  name: string;
  type: 'BULLISH' | 'BEARISH' | 'NEUTRAL';
  timestamp: Date;
  confidence: number;
  significance: 'HIGH' | 'MEDIUM' | 'LOW';
}

export interface ChartPatternResult {
  id: string;
  name: string;
  type: 'CONTINUATION' | 'REVERSAL' | 'SUPPORT_RESISTANCE';
  startIndex: number;
  endIndex: number;
  keyLevels: number[];
  confidence: number;
}

export interface GeometricPatternResult {
  id: string;
  name: string;
  type: 'FIBONACCI' | 'GANN' | 'PIVOT';
  levels: Array<{ level: number; price: number }>;
  validity: 'ACTIVE' | 'BROKEN';
}

export type PatternResult = CandlestickPatternResult | ChartPatternResult | GeometricPatternResult;

export interface PatternReliability {
  patternId: string;
  successRate: number;
  averageMove: number;
  averageTimeToTarget: number;
  sampleSize: number;
  confidence: number;
  recommendedAction: 'ENTER' | 'WAIT' | 'AVOID';
}

// ============================================================================
// Cycle Analysis Types
// ============================================================================

export interface CycleConfig {
  fft: FFTConfig;
  seasonal: SeasonalityConfig;
}

export interface FFTConfig {
  minCycleLength: number;
  maxCycleLength: number;
  significanceThreshold: number;
}

export interface SeasonalityConfig {
  periodsToAnalyze: number;
  confidenceLevel: number;
}

export interface CycleInfo {
  period: number;
  amplitude: number;
  phase: number;
  strength: number;
}

export interface CycleDetectionResult {
  cycles: CycleInfo[];
  dominantCycle: CycleInfo;
  cycleStrength: number;
  phase: number;
  timestamp: Date;
}

export interface SeasonalityResult {
  monthly: SeasonalPattern;
  weekly: SeasonalPattern;
  daily: SeasonalPattern;
  overallSeasonality: number;
  recommendations: string[];
}

export interface SeasonalPattern {
  periods: Array<{ period: string; avgReturn: number; significance: number }>;
  strength: number;
}

export interface CycleBasedPrediction {
  symbol: string;
  horizon: number;
  predictions: CyclePrediction[];
  dominantCycle: CycleInfo;
  confidence: number;
  timestamp: Date;
}

export interface CyclePrediction {
  step: number;
  phase: number;
  expectedChange: number;
  confidence: number;
}

export interface TurningPoint {
  timestamp: Date;
  price: number;
  type: 'CYCLE_TOP' | 'CYCLE_BOTTOM';
  cycle: CycleInfo;
  confidence: number;
}

// ============================================================================
// Fractal Analysis Types
// ============================================================================

export interface FractalConfig {
  hurst: HurstConfig;
  boxCounting: BoxCountingConfig;
  dfa: DFAConfig;
}

export interface HurstConfig {
  minLag: number;
  maxLag: number;
}

export interface BoxCountingConfig {
  minBoxSize: number;
  maxBoxSize: number;
}

export interface DFAConfig {
  minScale: number;
  maxScale: number;
  scaleStep: number;
}

export interface FractalDimensionResult {
  fractalDimension: number;
  boxCountingDimension: number;
  dfaDimension: number;
  interpretation: string;
  timestamp: Date;
}

export interface HurstExponentResult {
  hurstExponent: number;
  interpretation: string;
  confidence: number;
  timestamp: Date;
}

export interface SelfSimilarityMetric {
  scale: number;
  similarity: number;
  correlation: number;
}

export interface SelfSimilarityResult {
  similarities: SelfSimilarityMetric[];
  overallSimilarity: number;
  isSelfSimilar: boolean;
  timestamp: Date;
}

export interface TimeframeAnalysis {
  timeframe: string;
  fractalDimension: number;
  hurstExponent: number;
  trend: 'BULLISH' | 'BEARISH' | 'NEUTRAL';
}

export interface MultiTimeframeResult {
  symbol: string;
  timeframes: TimeframeAnalysis[];
  consistency: number;
  recommendations: string[];
  timestamp: Date;
}

export interface FractalPrediction {
  symbol: string;
  horizon: number;
  predictions: FractalForecast[];
  fractalCharacteristics: {
    dimension: number;
    hurst: number;
    selfSimilarity: number;
  };
  confidence: number;
  timestamp: Date;
}

export interface FractalForecast {
  step: number;
  expectedPrice: number;
  expectedChange: number;
  confidence: number;
}

// ============================================================================
// Wavelet Analysis Types
// ============================================================================

export interface WaveletConfig {
  discrete: DiscreteWaveletConfig;
  denoising: DenoisingConfig;
}

export interface DiscreteWaveletConfig {
  waveletType: 'haar' | 'db4' | 'sym4';
  decompositionLevels: number;
}

export interface DenoisingConfig {
  thresholdMethod: 'soft' | 'hard';
  thresholdMultiplier: number;
}

export interface DiscreteWaveletResult {
  levels: WaveletLevel[];
  reconstructed: number[];
  reconstructionError: number;
  timestamp: Date;
}

export interface WaveletLevel {
  level: number;
  approximation: number[];
  detail: number[];
  energy: number;
}

export interface WaveletDenoisingResult {
  original: number[];
  denoised: number[];
  noise: number[];
  noiseCharacteristics: NoiseCharacteristics;
  signalToNoiseRatio: number;
  timestamp: Date;
}

export interface NoiseCharacteristics {
  mean: number;
  stdDev: number;
  skewness: number;
  kurtosis: number;
}

export interface WaveletPrediction {
  symbol: string;
  horizon: number;
  predictions: WaveletForecast[];
  confidence: number;
  timestamp: Date;
}

export interface WaveletForecast {
  step: number;
  expectedPrice: number;
  expectedChange: number;
  confidence: number;
}

// ============================================================================
// Integrated Analysis Types
// ============================================================================

export interface IntegratedConfig {
  pattern: PatternConfig;
  cycle: CycleConfig;
  fractal: FractalConfig;
  wavelet: WaveletConfig;
}

export interface ComprehensiveAnalysis {
  symbol: string;
  analysisDate: Date;
  patterns: {
    candlestick: CandlestickPatternResult[];
    chart: ChartPatternResult[];
    geometric: GeometricPatternResult[];
  };
  cycles: {
    detection: CycleDetectionResult;
    seasonality: SeasonalityResult;
  };
  fractals: {
    dimension: FractalDimensionResult;
    hurst: HurstExponentResult;
  };
  wavelets: DiscreteWaveletResult;
  integrated: IntegratedAnalysisResult;
  recommendations: string[];
}

export interface IntegratedAnalysisResult {
  overallSignal: 'STRONG_BUY' | 'BUY' | 'HOLD' | 'SELL' | 'STRONG_SELL';
  confidence: number;
  keyFactors: string[];
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH';
  timeHorizon: 'SHORT' | 'MEDIUM' | 'LONG';
}

export interface IntegratedPrediction {
  symbol: string;
  horizon: number;
  predictions: IntegratedForecast[];
  confidence: number;
  timestamp: Date;
}

export interface IntegratedForecast {
  step: number;
  cyclePrediction: number;
  fractalPrediction: number;
  waveletPrediction: number;
  ensemblePrediction: number;
  confidence: number;
}
