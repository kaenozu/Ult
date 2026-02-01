/**
 * Mathematical Utilities for Technical Analysis
 * 
 * Provides core mathematical functions for FFT, DWT, statistical calculations,
 * and signal processing operations.
 */

// ============================================================================
// Statistical Functions
// ============================================================================

/**
 * Calculate mean of an array
 */
export function mean(data: number[]): number {
  if (data.length === 0) return 0;
  const sum = data.reduce((acc, val) => acc + val, 0);
  return sum / data.length;
}

/**
 * Calculate standard deviation
 */
export function stdDev(data: number[]): number {
  if (data.length === 0) return 0;
  const avg = mean(data);
  const squaredDiffs = data.map(val => Math.pow(val - avg, 2));
  const variance = mean(squaredDiffs);
  return Math.sqrt(variance);
}

/**
 * Calculate correlation between two arrays
 */
export function correlation(x: number[], y: number[]): number {
  if (x.length !== y.length || x.length === 0) return 0;
  
  const meanX = mean(x);
  const meanY = mean(y);
  const stdX = stdDev(x);
  const stdY = stdDev(y);
  
  if (stdX === 0 || stdY === 0) return 0;
  
  let sum = 0;
  for (let i = 0; i < x.length; i++) {
    sum += ((x[i] - meanX) / stdX) * ((y[i] - meanY) / stdY);
  }
  
  return sum / x.length;
}

/**
 * Calculate skewness
 */
export function skewness(data: number[]): number {
  if (data.length === 0) return 0;
  const avg = mean(data);
  const std = stdDev(data);
  if (std === 0) return 0;
  
  const cubedDiffs = data.map(val => Math.pow((val - avg) / std, 3));
  return mean(cubedDiffs);
}

/**
 * Calculate kurtosis
 */
export function kurtosis(data: number[]): number {
  if (data.length === 0) return 0;
  const avg = mean(data);
  const std = stdDev(data);
  if (std === 0) return 0;
  
  const fourthDiffs = data.map(val => Math.pow((val - avg) / std, 4));
  return mean(fourthDiffs) - 3; // Excess kurtosis
}

// ============================================================================
// Fast Fourier Transform (FFT)
// ============================================================================

/**
 * Complex number representation
 */
export interface Complex {
  real: number;
  imag: number;
}

/**
 * Add two complex numbers
 */
function complexAdd(a: Complex, b: Complex): Complex {
  return { real: a.real + b.real, imag: a.imag + b.imag };
}

/**
 * Subtract two complex numbers
 */
function complexSubtract(a: Complex, b: Complex): Complex {
  return { real: a.real - b.real, imag: a.imag - b.imag };
}

/**
 * Multiply two complex numbers
 */
function complexMultiply(a: Complex, b: Complex): Complex {
  return {
    real: a.real * b.real - a.imag * b.imag,
    imag: a.real * b.imag + a.imag * b.real
  };
}

/**
 * Get magnitude of complex number
 */
export function complexMagnitude(c: Complex): number {
  return Math.sqrt(c.real * c.real + c.imag * c.imag);
}

/**
 * Cooley-Tukey FFT algorithm
 */
export function fft(data: number[]): Complex[] {
  const n = data.length;
  
  // Base case
  if (n <= 1) {
    return [{ real: data[0] || 0, imag: 0 }];
  }
  
  // Ensure power of 2
  if ((n & (n - 1)) !== 0) {
    // Pad with zeros to next power of 2
    const nextPow2 = Math.pow(2, Math.ceil(Math.log2(n)));
    const padded = [...data, ...Array(nextPow2 - n).fill(0)];
    return fft(padded);
  }
  
  // Divide
  const even: number[] = [];
  const odd: number[] = [];
  for (let i = 0; i < n; i++) {
    if (i % 2 === 0) even.push(data[i]);
    else odd.push(data[i]);
  }
  
  // Conquer
  const evenFFT = fft(even);
  const oddFFT = fft(odd);
  
  // Combine
  const result: Complex[] = Array(n);
  for (let k = 0; k < n / 2; k++) {
    const angle = -2 * Math.PI * k / n;
    const twiddle: Complex = {
      real: Math.cos(angle),
      imag: Math.sin(angle)
    };
    const t = complexMultiply(twiddle, oddFFT[k]);
    result[k] = complexAdd(evenFFT[k], t);
    result[k + n / 2] = complexSubtract(evenFFT[k], t);
  }
  
  return result;
}

/**
 * Inverse FFT
 */
export function ifft(spectrum: Complex[]): Complex[] {
  const n = spectrum.length;
  
  // Conjugate
  const conjugated = spectrum.map(c => ({ real: c.real, imag: -c.imag }));
  
  // Forward FFT
  const result = fft(conjugated.map(c => c.real));
  
  // Conjugate and scale
  return result.map(c => ({
    real: c.real / n,
    imag: -c.imag / n
  }));
}

/**
 * Power spectrum (magnitude squared)
 */
export function powerSpectrum(data: number[]): number[] {
  const spectrum = fft(data);
  return spectrum.map(c => c.real * c.real + c.imag * c.imag);
}

// ============================================================================
// Discrete Wavelet Transform (DWT)
// ============================================================================

/**
 * Haar wavelet coefficients
 */
const HAAR_LOW = [1 / Math.sqrt(2), 1 / Math.sqrt(2)];
const HAAR_HIGH = [1 / Math.sqrt(2), -1 / Math.sqrt(2)];

/**
 * Daubechies 4 wavelet coefficients
 */
const DB4_LOW = [
  (1 + Math.sqrt(3)) / (4 * Math.sqrt(2)),
  (3 + Math.sqrt(3)) / (4 * Math.sqrt(2)),
  (3 - Math.sqrt(3)) / (4 * Math.sqrt(2)),
  (1 - Math.sqrt(3)) / (4 * Math.sqrt(2))
];

const DB4_HIGH = [
  (1 - Math.sqrt(3)) / (4 * Math.sqrt(2)),
  -(3 - Math.sqrt(3)) / (4 * Math.sqrt(2)),
  (3 + Math.sqrt(3)) / (4 * Math.sqrt(2)),
  -(1 + Math.sqrt(3)) / (4 * Math.sqrt(2))
];

/**
 * Get wavelet filter coefficients
 */
export function getWaveletFilters(type: 'haar' | 'db4' | 'sym4'): { low: number[]; high: number[] } {
  switch (type) {
    case 'haar':
      return { low: HAAR_LOW, high: HAAR_HIGH };
    case 'db4':
      return { low: DB4_LOW, high: DB4_HIGH };
    case 'sym4':
      // Symlet 4 (simplified, using DB4 as approximation)
      return { low: DB4_LOW, high: DB4_HIGH };
    default:
      return { low: HAAR_LOW, high: HAAR_HIGH };
  }
}

/**
 * Convolution for wavelet transform
 */
function convolve(signal: number[], filter: number[]): number[] {
  const result: number[] = [];
  const halfLen = Math.floor(filter.length / 2);
  
  for (let i = 0; i < signal.length; i += 2) {
    let sum = 0;
    for (let j = 0; j < filter.length; j++) {
      const idx = i + j - halfLen;
      const val = idx >= 0 && idx < signal.length ? signal[idx] : 0;
      sum += val * filter[j];
    }
    result.push(sum);
  }
  
  return result;
}

/**
 * Single-level Discrete Wavelet Transform
 */
export function dwt(signal: number[], waveletType: 'haar' | 'db4' | 'sym4' = 'haar'): {
  approximation: number[];
  detail: number[];
} {
  const { low, high } = getWaveletFilters(waveletType);
  
  const approximation = convolve(signal, low);
  const detail = convolve(signal, high);
  
  return { approximation, detail };
}

/**
 * Multi-level Discrete Wavelet Transform
 */
export function dwtMultiLevel(
  signal: number[],
  levels: number,
  waveletType: 'haar' | 'db4' | 'sym4' = 'haar'
): Array<{ approximation: number[]; detail: number[] }> {
  const results: Array<{ approximation: number[]; detail: number[] }> = [];
  let currentSignal = signal;
  
  for (let i = 0; i < levels; i++) {
    const { approximation, detail } = dwt(currentSignal, waveletType);
    results.push({ approximation, detail });
    currentSignal = approximation;
  }
  
  return results;
}

/**
 * Wavelet reconstruction
 */
export function idwt(
  approximation: number[],
  detail: number[],
  waveletType: 'haar' | 'db4' | 'sym4' = 'haar'
): number[] {
  const { low, high } = getWaveletFilters(waveletType);
  
  // Upsample
  const approxUp = approximation.flatMap(x => [x, 0]);
  const detailUp = detail.flatMap(x => [x, 0]);
  
  // Convolve with reconstruction filters
  const result: number[] = [];
  const len = Math.max(approxUp.length, detailUp.length);
  
  for (let i = 0; i < len; i++) {
    let sum = 0;
    for (let j = 0; j < low.length; j++) {
      const idx = i - j;
      if (idx >= 0 && idx < approxUp.length) {
        sum += approxUp[idx] * low[j];
      }
      if (idx >= 0 && idx < detailUp.length) {
        sum += detailUp[idx] * high[j];
      }
    }
    result.push(sum);
  }
  
  return result;
}

// ============================================================================
// Detrended Fluctuation Analysis (DFA)
// ============================================================================

/**
 * Calculate DFA scaling exponent (Hurst exponent)
 */
export function dfa(data: number[], minScale: number = 4, maxScale: number = -1, scaleStep: number = 2): number {
  if (data.length < 10) return 0.5; // Default for insufficient data
  
  const n = data.length;
  if (maxScale === -1) {
    maxScale = Math.floor(n / 4);
  }
  
  // Calculate cumulative sum (integrate the series)
  const cumSum: number[] = [];
  let sum = 0;
  const avg = mean(data);
  for (let i = 0; i < n; i++) {
    sum += data[i] - avg;
    cumSum.push(sum);
  }
  
  const scales: number[] = [];
  const fluctuations: number[] = [];
  
  // Calculate fluctuations for different scales
  for (let scale = minScale; scale <= maxScale; scale += scaleStep) {
    const numSegments = Math.floor(n / scale);
    if (numSegments < 1) continue;
    
    let totalFluctuation = 0;
    
    for (let seg = 0; seg < numSegments; seg++) {
      const start = seg * scale;
      const end = start + scale;
      
      // Fit polynomial (linear for simplicity)
      const segment = cumSum.slice(start, end);
      const fit = linearFit(segment);
      
      // Calculate fluctuation
      let variance = 0;
      for (let i = 0; i < segment.length; i++) {
        const residual = segment[i] - (fit.slope * i + fit.intercept);
        variance += residual * residual;
      }
      totalFluctuation += variance;
    }
    
    const fluctuation = Math.sqrt(totalFluctuation / (numSegments * scale));
    scales.push(Math.log(scale));
    fluctuations.push(Math.log(fluctuation));
  }
  
  // Calculate slope (Hurst exponent)
  if (scales.length < 2) return 0.5;
  const fit = linearFit(fluctuations, scales);
  return fit.slope;
}

/**
 * Linear regression fit
 */
function linearFit(y: number[], x?: number[]): { slope: number; intercept: number } {
  const n = y.length;
  if (n === 0) return { slope: 0, intercept: 0 };
  
  const xData = x || Array.from({ length: n }, (_, i) => i);
  
  const meanX = mean(xData);
  const meanY = mean(y);
  
  let numerator = 0;
  let denominator = 0;
  
  for (let i = 0; i < n; i++) {
    numerator += (xData[i] - meanX) * (y[i] - meanY);
    denominator += (xData[i] - meanX) ** 2;
  }
  
  const slope = denominator === 0 ? 0 : numerator / denominator;
  const intercept = meanY - slope * meanX;
  
  return { slope, intercept };
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Calculate returns from price series
 */
export function calculateReturns(prices: number[]): number[] {
  const returns: number[] = [];
  for (let i = 1; i < prices.length; i++) {
    if (prices[i - 1] !== 0) {
      returns.push((prices[i] - prices[i - 1]) / prices[i - 1]);
    } else {
      returns.push(0);
    }
  }
  return returns;
}

/**
 * Calculate log returns
 */
export function calculateLogReturns(prices: number[]): number[] {
  const returns: number[] = [];
  for (let i = 1; i < prices.length; i++) {
    if (prices[i - 1] > 0 && prices[i] > 0) {
      returns.push(Math.log(prices[i] / prices[i - 1]));
    } else {
      returns.push(0);
    }
  }
  return returns;
}

/**
 * Normalize data to 0-1 range
 */
export function normalize(data: number[]): number[] {
  if (data.length === 0) return [];
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min;
  
  if (range === 0) return data.map(() => 0.5);
  
  return data.map(val => (val - min) / range);
}

/**
 * Z-score normalization
 */
export function zScore(data: number[]): number[] {
  const avg = mean(data);
  const std = stdDev(data);
  
  if (std === 0) return data.map(() => 0);
  
  return data.map(val => (val - avg) / std);
}
