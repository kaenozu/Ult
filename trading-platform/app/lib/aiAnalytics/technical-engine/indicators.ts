import { OHLCV } from '../../../types/shared';
import { technicalIndicatorService } from '../../TechnicalIndicatorService';
import { RSIAnalysis, TrendAnalysis, VolatilityAnalysis, MomentumAnalysis } from './types';
import { detectRSIDivergence, detectCrossover, detectMACDCross } from './patterns';

export function analyzeRSI(data: OHLCV[]): RSIAnalysis {
  const prices = data.map(d => d.close);
  const rsi = technicalIndicatorService.calculateRSI(prices, 14);
  const currentRSI = rsi[rsi.length - 1];
  const prevRSI = rsi[rsi.length - 2];
  const rsi5Back = rsi[rsi.length - 6];

  const reasons: string[] = [];
  let score = 0;

  const trend = currentRSI > prevRSI 
    ? (currentRSI > rsi5Back ? 'rising' : 'neutral')
    : (currentRSI < rsi5Back ? 'falling' : 'neutral');

  let signal: RSIAnalysis['signal'] = 'neutral';
  if (currentRSI < 20) {
    signal = 'extreme_oversold';
    score = 0.8;
    reasons.push(`RSI(${currentRSI.toFixed(1)})が極度の売られすぎ水準`);
  } else if (currentRSI < 30) {
    signal = 'oversold';
    score = 0.5;
    reasons.push(`RSI(${currentRSI.toFixed(1)})が売られすぎ水準`);
  } else if (currentRSI > 80) {
    signal = 'extreme_overbought';
    score = -0.8;
    reasons.push(`RSI(${currentRSI.toFixed(1)})が極度の買われすぎ水準`);
  } else if (currentRSI > 70) {
    signal = 'overbought';
    score = -0.5;
    reasons.push(`RSI(${currentRSI.toFixed(1)})が買われすぎ水準`);
  } else {
    reasons.push(`RSI(${currentRSI.toFixed(1)})は中立圏内`);
  }

  const divergence = detectRSIDivergence(data, rsi);
  if (divergence.detected) {
    if (divergence.type === 'bullish') {
      score = Math.max(score, divergence.strength * 0.7);
      reasons.push(`強気ダイバージェンス検出 (強度: ${(divergence.strength * 100).toFixed(0)}%)`);
    } else {
      score = Math.min(score, -divergence.strength * 0.7);
      reasons.push(`弱気ダイバージェンス検出 (強度: ${(divergence.strength * 100).toFixed(0)}%)`);
    }
  }

  return { current: currentRSI, trend, signal, divergence, score, reasons };
}

export function analyzeTrend(data: OHLCV[]): TrendAnalysis {
  const prices = data.map(d => d.close);
  const currentPrice = prices[prices.length - 1];
  
  const sma5 = technicalIndicatorService.calculateSMA(prices, 5);
  const sma20 = technicalIndicatorService.calculateSMA(prices, 20);
  const sma50 = technicalIndicatorService.calculateSMA(prices, 50);
  const sma200 = data.length >= 200 
    ? technicalIndicatorService.calculateSMA(prices, 200)
    : [];

  const reasons: string[] = [];
  let score = 0;

  const shortTerm = compareMAs(sma5[sma5.length - 1], sma20[sma20.length - 1], currentPrice);
  const mediumTerm = compareMAs(sma20[sma20.length - 1], sma50[sma50.length - 1], currentPrice);
  const longTerm = sma200.length > 0
    ? compareMAs(sma50[sma50.length - 1], sma200[sma200.length - 1], currentPrice)
    : 'neutral' as const;

  const crossover = detectCrossover(sma20, sma50);

  const maArray = [sma5, sma20, sma50].map(ma => ma[ma.length - 1]).filter(v => !isNaN(v));
  const alignment = calculateAlignment(maArray, currentPrice);

  if (shortTerm === 'bullish') score += 0.3;
  else if (shortTerm === 'bearish') score -= 0.3;

  if (mediumTerm === 'bullish') score += 0.4;
  else if (mediumTerm === 'bearish') score -= 0.4;

  if (longTerm === 'bullish') score += 0.3;
  else if (longTerm === 'bearish') score -= 0.3;

  if (crossover.detected) {
    if (crossover.type === 'golden') {
      score += crossover.strength * 0.5;
      reasons.push(`ゴールデンクロス検出 (強度: ${(crossover.strength * 100).toFixed(0)}%)`);
    } else {
      score -= crossover.strength * 0.5;
      reasons.push(`デッドクロス検出 (強度: ${(crossover.strength * 100).toFixed(0)}%)`);
    }
  }

  if (shortTerm === 'bullish' && mediumTerm === 'bullish') {
    reasons.push('短期・中期トレンドともに強気');
  } else if (shortTerm === 'bearish' && mediumTerm === 'bearish') {
    reasons.push('短期・中期トレンドともに弱気');
  }

  if (Math.abs(alignment) > 0.7) {
    reasons.push(alignment > 0 ? '全移動平均線が強気配列' : '全移動平均線が弱気配列');
  }

  return {
    shortTerm,
    mediumTerm,
    longTerm,
    crossover,
    alignment,
    score: Math.max(-1, Math.min(1, score)),
    reasons,
  };
}

function compareMAs(fast: number, slow: number, currentPrice: number): 'bullish' | 'bearish' | 'neutral' {
  if (isNaN(fast) || isNaN(slow)) return 'neutral';
  if (fast > slow && currentPrice > fast) return 'bullish';
  if (fast < slow && currentPrice < fast) return 'bearish';
  return 'neutral';
}

function calculateAlignment(mas: number[], currentPrice: number): number {
  if (mas.length === 0) return 0;

  const bullishAlignment = mas.every((ma, i) => i === 0 || ma > mas[i - 1]);
  const bearishAlignment = mas.every((ma, i) => i === 0 || ma < mas[i - 1]);

  if (bullishAlignment && currentPrice > mas[0]) return 1;
  if (bearishAlignment && currentPrice < mas[0]) return -1;

  const bullishCount = mas.filter((ma, i) => i === 0 || ma > mas[i - 1]).length;
  const bearishCount = mas.filter((ma, i) => i === 0 || ma < mas[i - 1]).length;

  return (bullishCount - bearishCount) / mas.length;
}

export function analyzeVolatility(data: OHLCV[]): VolatilityAnalysis {
  const prices = data.map(d => d.close);
  const currentPrice = prices[prices.length - 1];
  
  const bollinger = technicalIndicatorService.calculateBollingerBands(prices, 20, 2);
  const atr = technicalIndicatorService.calculateATR(data, 14);

  const reasons: string[] = [];
  let score = 0;

  const currentATR = atr[atr.length - 1];
  const atrPercent = (currentATR / currentPrice) * 100;

  const upperBand = bollinger.upper[bollinger.upper.length - 1];
  const lowerBand = bollinger.lower[bollinger.lower.length - 1];
  const bollingerPosition = ((currentPrice - lowerBand) / (upperBand - lowerBand)) * 100;

  const bandwidth = ((upperBand - lowerBand) / currentPrice) * 100;
  const avgBandwidth = calculateAverageBandwidth(bollinger, prices, 20);

  let state: VolatilityAnalysis['state'] = 'normal';
  if (bandwidth < avgBandwidth * 0.7) {
    state = 'squeeze';
    reasons.push('ボリンジャーバンドがスクイーズ（ブレイクアウト待ち）');
  } else if (bandwidth > avgBandwidth * 1.3) {
    state = 'expansion';
    reasons.push('ボリンジャーバンドが拡張（高ボラティリティ）');
  }

  if (bollingerPosition < 10) {
    score = 0.6;
    reasons.push(`価格がボリンジャーバンド下限付近 (${bollingerPosition.toFixed(1)}%)`);
  } else if (bollingerPosition > 90) {
    score = -0.6;
    reasons.push(`価格がボリンジャーバンド上限付近 (${bollingerPosition.toFixed(1)}%)`);
  } else if (bollingerPosition > 80) {
    score = -0.3;
    reasons.push(`価格がボリンジャーバンド上部 (${bollingerPosition.toFixed(1)}%)`);
  } else if (bollingerPosition < 20) {
    score = 0.3;
    reasons.push(`価格がボリンジャーバンド下部 (${bollingerPosition.toFixed(1)}%)`);
  }

  return { current: atrPercent, state, bollingerPosition, bandwidth, score, reasons };
}

function calculateAverageBandwidth(
  bollinger: { upper: number[]; lower: number[] },
  prices: number[],
  period: number
): number {
  const bandwidths: number[] = [];
  const len = Math.min(bollinger.upper.length, period);

  for (let i = 0; i < len; i++) {
    const idx = bollinger.upper.length - len + i;
    const upper = bollinger.upper[idx];
    const lower = bollinger.lower[idx];
    const price = prices[idx];
    
    if (!isNaN(upper) && !isNaN(lower) && price > 0) {
      bandwidths.push(((upper - lower) / price) * 100);
    }
  }

  return bandwidths.length > 0
    ? bandwidths.reduce((a, b) => a + b, 0) / bandwidths.length
    : 0;
}

export function analyzeMomentum(data: OHLCV[]): MomentumAnalysis {
  const prices = data.map(d => d.close);
  const macd = technicalIndicatorService.calculateMACD(prices, 12, 26, 9);

  const reasons: string[] = [];
  let score = 0;

  const currentHistogram = macd.histogram[macd.histogram.length - 1];
  const prevHistogram = macd.histogram[macd.histogram.length - 2];
  const histogram5Back = macd.histogram[macd.histogram.length - 6];

  const histogramTrend = currentHistogram > prevHistogram
    ? (currentHistogram > histogram5Back ? 'increasing' : 'neutral')
    : (currentHistogram < histogram5Back ? 'decreasing' : 'neutral');

  const macdCross = detectMACDCross(macd.macd, macd.signal);

  if (currentHistogram > 0) {
    score += Math.min(Math.abs(currentHistogram) * 10, 0.5);
    reasons.push(`MACDヒストグラムが正(${currentHistogram.toFixed(3)})`);
  } else if (currentHistogram < 0) {
    score -= Math.min(Math.abs(currentHistogram) * 10, 0.5);
    reasons.push(`MACDヒストグラムが負(${currentHistogram.toFixed(3)})`);
  }

  if (histogramTrend === 'increasing') {
    score += 0.2;
    reasons.push('MACDヒストグラムが上昇中');
  } else if (histogramTrend === 'decreasing') {
    score -= 0.2;
    reasons.push('MACDヒストグラムが下降中');
  }

  if (macdCross.detected) {
    if (macdCross.type === 'bullish') {
      score += macdCross.strength * 0.5;
      reasons.push(`MACDが強気クロス (強度: ${(macdCross.strength * 100).toFixed(0)}%)`);
    } else {
      score -= macdCross.strength * 0.5;
      reasons.push(`MACDが弱気クロス (強度: ${(macdCross.strength * 100).toFixed(0)}%)`);
    }
  }

  return {
    macdHistogram: currentHistogram,
    histogramTrend,
    macdCross,
    score: Math.max(-1, Math.min(1, score)),
    reasons,
  };
}
