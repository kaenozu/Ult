/**
 * Wavelet Analyzer
 * 
 * Performs discrete wavelet transform, denoising, and wavelet-based predictions.
 */

import { OHLCV } from '../../types/shared';
import {
  WaveletConfig,
  DiscreteWaveletResult,
  WaveletLevel,
  WaveletDenoisingResult,
  NoiseCharacteristics,
  WaveletPrediction,
  WaveletForecast
} from './types';
import { dwtMultiLevel, idwt, mean, stdDev, skewness, kurtosis } from './mathUtils';

export class WaveletAnalyzer {
  constructor(private config: WaveletConfig) {}

  /**
   * Perform discrete wavelet transform
   */
  performDiscreteWaveletTransform(
    data: OHLCV[],
    levels?: number
  ): DiscreteWaveletResult {
    const prices = data.map(d => d.close);
    const decompositionLevels = levels || this.config.discrete.decompositionLevels;
    
    // Perform DWT
    const dwtResults = dwtMultiLevel(
      prices,
      decompositionLevels,
      this.config.discrete.waveletType
    );
    
    // Analyze each level
    const levelsAnalysis: WaveletLevel[] = dwtResults.map((result, idx) => ({
      level: idx + 1,
      approximation: result.approximation,
      detail: result.detail,
      energy: this.calculateEnergy(result.detail)
    }));
    
    // Reconstruct signal
    const reconstructed = this.reconstructSignal(dwtResults);
    const error = this.calculateReconstructionError(prices, reconstructed);
    
    return {
      levels: levelsAnalysis,
      reconstructed,
      reconstructionError: error,
      timestamp: new Date()
    };
  }

  /**
   * Calculate energy of a signal
   */
  private calculateEnergy(signal: number[]): number {
    return signal.reduce((sum, val) => sum + val * val, 0);
  }

  /**
   * Reconstruct signal from wavelet coefficients
   */
  private reconstructSignal(dwtResults: Array<{ approximation: number[]; detail: number[] }>): number[] {
    if (dwtResults.length === 0) return [];
    
    // Start with the last approximation
    let signal = dwtResults[dwtResults.length - 1].approximation;
    
    // Reconstruct backwards
    for (let i = dwtResults.length - 1; i >= 0; i--) {
      signal = idwt(signal, dwtResults[i].detail, this.config.discrete.waveletType);
    }
    
    return signal;
  }

  /**
   * Calculate reconstruction error
   */
  private calculateReconstructionError(original: number[], reconstructed: number[]): number {
    const minLength = Math.min(original.length, reconstructed.length);
    let sumSquaredError = 0;
    
    for (let i = 0; i < minLength; i++) {
      const error = original[i] - reconstructed[i];
      sumSquaredError += error * error;
    }
    
    return Math.sqrt(sumSquaredError / minLength);
  }

  /**
   * Denoise signal using wavelets
   */
  denoiseWithWavelets(data: OHLCV[]): WaveletDenoisingResult {
    const prices = data.map(d => d.close);
    
    // Perform DWT
    const dwtResults = dwtMultiLevel(
      prices,
      this.config.discrete.decompositionLevels,
      this.config.discrete.waveletType
    );
    
    // Apply thresholding to detail coefficients
    const denoisedDWT = dwtResults.map(level => ({
      approximation: level.approximation,
      detail: this.applyThreshold(level.detail)
    }));
    
    // Reconstruct denoised signal
    const denoised = this.reconstructSignal(denoisedDWT);
    
    // Extract noise
    const noise = this.extractNoise(prices, denoised);
    const noiseCharacteristics = this.analyzeNoise(noise);
    const snr = this.calculateSNR(prices, denoised);
    
    return {
      original: prices,
      denoised,
      noise,
      noiseCharacteristics,
      signalToNoiseRatio: snr,
      timestamp: new Date()
    };
  }

  /**
   * Apply wavelet threshold to coefficients
   */
  private applyThreshold(coefficients: number[]): number[] {
    // Calculate threshold using median absolute deviation
    const absCoeffs = coefficients.map(Math.abs);
    const median = this.calculateMedian(absCoeffs);
    const mad = this.calculateMedian(absCoeffs.map(c => Math.abs(c - median)));
    const threshold = this.config.denoising.thresholdMultiplier * mad;
    
    // Apply soft or hard thresholding
    if (this.config.denoising.thresholdMethod === 'soft') {
      return coefficients.map(c => {
        if (Math.abs(c) < threshold) return 0;
        return Math.sign(c) * (Math.abs(c) - threshold);
      });
    } else {
      // Hard thresholding
      return coefficients.map(c => Math.abs(c) < threshold ? 0 : c);
    }
  }

  /**
   * Calculate median of an array
   */
  private calculateMedian(arr: number[]): number {
    if (arr.length === 0) return 0;
    const sorted = [...arr].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 === 0
      ? (sorted[mid - 1] + sorted[mid]) / 2
      : sorted[mid];
  }

  /**
   * Extract noise from signal
   */
  private extractNoise(original: number[], denoised: number[]): number[] {
    const minLength = Math.min(original.length, denoised.length);
    const noise: number[] = [];
    
    for (let i = 0; i < minLength; i++) {
      noise.push(original[i] - denoised[i]);
    }
    
    return noise;
  }

  /**
   * Analyze noise characteristics
   */
  private analyzeNoise(noise: number[]): NoiseCharacteristics {
    return {
      mean: mean(noise),
      stdDev: stdDev(noise),
      skewness: skewness(noise),
      kurtosis: kurtosis(noise)
    };
  }

  /**
   * Calculate Signal-to-Noise Ratio
   */
  private calculateSNR(signal: number[], denoised: number[]): number {
    const signalPower = this.calculateEnergy(denoised);
    const noise = this.extractNoise(signal, denoised);
    const noisePower = this.calculateEnergy(noise);
    
    if (noisePower === 0) return Infinity;
    return 10 * Math.log10(signalPower / noisePower);
  }

  /**
   * Predict future prices using wavelet analysis
   */
  predictFromWavelets(data: OHLCV[], horizon: number = 5): WaveletPrediction {
    // Denoise the signal first
    const denoisingResult = this.denoiseWithWavelets(data);
    const denoised = denoisingResult.denoised;
    
    // Perform DWT on denoised signal
    const dwt = this.performDiscreteWaveletTransform(data);
    
    // Analyze trend from approximation coefficients
    const lastLevel = dwt.levels[dwt.levels.length - 1];
    const trend = this.analyzeTrend(lastLevel.approximation);
    
    // Generate predictions
    const predictions: WaveletForecast[] = [];
    const lastPrice = data[data.length - 1].close;
    
    for (let t = 1; t <= horizon; t++) {
      // Simple extrapolation based on trend
      const expectedChange = trend * t;
      const expectedPrice = lastPrice * (1 + expectedChange);
      
      // Confidence decreases with horizon
      const confidence = Math.exp(-t / 10) * (denoisingResult.signalToNoiseRatio > 10 ? 0.8 : 0.6);
      
      predictions.push({
        step: t,
        expectedPrice,
        expectedChange,
        confidence
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

  /**
   * Analyze trend from coefficients
   */
  private analyzeTrend(coefficients: number[]): number {
    if (coefficients.length < 2) return 0;
    
    // Simple linear regression
    const n = coefficients.length;
    const x = Array.from({ length: n }, (_, i) => i);
    const y = coefficients;
    
    const sumX = x.reduce((a, b) => a + b, 0);
    const sumY = y.reduce((a, b) => a + b, 0);
    const sumXY = x.reduce((sum, xi, i) => sum + xi * y[i], 0);
    const sumXX = x.reduce((sum, xi) => sum + xi * xi, 0);
    
    const denominator = n * sumXX - sumX * sumX;
    if (denominator === 0) return 0;
    
    const slope = (n * sumXY - sumX * sumY) / denominator;
    
    // Normalize slope
    const avgY = sumY / n;
    return avgY !== 0 ? slope / avgY : 0;
  }
}

/**
 * Create default wavelet analyzer configuration
 */
export function createDefaultWaveletConfig(): WaveletConfig {
  return {
    discrete: {
      waveletType: 'haar',
      decompositionLevels: 3
    },
    denoising: {
      thresholdMethod: 'soft',
      thresholdMultiplier: 1.5
    }
  };
}
