/**
 * Advanced Technical Analysis Module
 * 
 * Exports all technical analysis engines and utilities.
 */

// Main analyzers
export { PatternRecognizer, createDefaultPatternConfig } from './PatternRecognizer';
export { CycleAnalyzer, createDefaultCycleConfig } from './CycleAnalyzer';
export { FractalAnalyzer, createDefaultFractalConfig } from './FractalAnalyzer';
export { WaveletAnalyzer, createDefaultWaveletConfig } from './WaveletAnalyzer';
export {
  IntegratedTechnicalAnalyzer,
  createIntegratedTechnicalAnalyzer,
  integratedTechnicalAnalyzer
} from './IntegratedTechnicalAnalyzer';

// Sub-components
export { CandlestickPatternRecognizer } from './CandlestickPatternRecognizer';

// Types
export * from './types';

// Math utilities
export * from './mathUtils';
