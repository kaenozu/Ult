import type { OHLCV } from './types';
import type { DetectedPattern, PatternType } from './types';

export function detectDoji(data: OHLCV[]): DetectedPattern | null {
  const last = data[data.length - 1];
  const body = Math.abs(last.close - last.open);
  const range = last.high - last.low;

  if (range === 0) return null;

  const bodyRatio = body / range;

  if (bodyRatio < 0.1) {
    return {
      type: 'DOJI',
      confidence: 1 - bodyRatio,
      startIndex: data.length - 1,
      endIndex: data.length - 1,
      direction: last.close > last.open ? 'BULLISH' : 'BEARISH',
    };
  }

  return null;
}

export function detectHammer(data: OHLCV[]): DetectedPattern | null {
  if (data.length < 1) return null;

  const last = data[data.length - 1];
  const body = Math.abs(last.close - last.open);
  const range = last.high - last.low;
  const lowerShadow = Math.min(last.open, last.close) - last.low;
  const upperShadow = last.high - Math.max(last.open, last.close);

  if (range === 0) return null;

  const bodyRatio = body / range;

  if (bodyRatio >= 0.1 && bodyRatio <= 0.3 && lowerShadow >= body * 2 && upperShadow <= body * 0.5) {
    return {
      type: 'HAMMER',
      confidence: 0.7,
      startIndex: data.length - 1,
      endIndex: data.length - 1,
      direction: 'BULLISH',
    };
  }

  if (bodyRatio >= 0.1 && bodyRatio <= 0.3 && upperShadow >= body * 2 && lowerShadow <= body * 0.5) {
    return {
      type: 'INVERTED_HAMMER',
      confidence: 0.7,
      startIndex: data.length - 1,
      endIndex: data.length - 1,
      direction: 'BULLISH',
    };
  }

  return null;
}

export function detectEngulfing(data: OHLCV[]): DetectedPattern | null {
  if (data.length < 2) return null;

  const prev = data[data.length - 2];
  const last = data[data.length - 1];

  const prevBody = Math.abs(prev.close - prev.open);
  const lastBody = Math.abs(last.close - last.open);
  const prevRange = prev.high - prev.low;
  const lastRange = last.high - last.low;

  if (prevRange === 0 || lastRange === 0) return null;

  const isBullishEngulfing =
    prev.close < prev.open &&
    last.close > last.open &&
    last.open < prev.close &&
    last.close > prev.high;

  if (isBullishEngulfing && lastBody > prevBody) {
    return {
      type: 'BULLISH_ENGULFING',
      confidence: 0.75,
      startIndex: data.length - 2,
      endIndex: data.length - 1,
      direction: 'BULLISH',
    };
  }

  const isBearishEngulfing =
    prev.close > prev.open &&
    last.close < last.open &&
    last.open > prev.high &&
    last.close < prev.low;

  if (isBearishEngulfing && lastBody > prevBody) {
    return {
      type: 'BEARISH_ENGULFING',
      confidence: 0.75,
      startIndex: data.length - 2,
      endIndex: data.length - 1,
      direction: 'BEARISH',
    };
  }

  return null;
}

export function detectStar(data: OHLCV[]): DetectedPattern | null {
  if (data.length < 3) return null;

  const first = data[data.length - 3];
  const middle = data[data.length - 2];
  const last = data[data.length - 1];

  const firstBody = Math.abs(first.close - first.open);
  const middleBody = Math.abs(middle.close - middle.open);
  const lastBody = Math.abs(last.close - last.open);

  const firstRange = first.high - first.low;
  const middleRange = middle.high - middle.low;
  const lastRange = last.high - last.low;

  if (firstRange === 0 || middleRange === 0 || lastRange === 0) return null;

  const isMorningStar =
    first.close < first.open &&
    middleBody / middleRange < 0.3 &&
    last.close > last.open &&
    last.close > (first.open + first.close) / 2;

  if (isMorningStar) {
    return {
      type: 'MORNING_STAR',
      confidence: 0.85,
      startIndex: data.length - 3,
      endIndex: data.length - 1,
      direction: 'BULLISH',
    };
  }

  const isEveningStar =
    first.close > first.open &&
    middleBody / middleRange < 0.3 &&
    last.close < last.open &&
    last.close < (first.open + first.close) / 2;

  if (isEveningStar) {
    return {
      type: 'EVENING_STAR',
      confidence: 0.85,
      startIndex: data.length - 3,
      endIndex: data.length - 1,
      direction: 'BEARISH',
    };
  }

  return null;
}

export function detectThreeWhiteSoldiers(data: OHLCV[]): DetectedPattern | null {
  if (data.length < 3) return null;

  const candles = data.slice(-3);

  const isThreeWhiteSoldiers = candles.every(
    c => c.close > c.open && Math.abs(c.close - c.open) / (c.high - c.low + 0.001) > 0.5
  );

  if (isThreeWhiteSoldiers && candles[2].low > candles[0].open) {
    return {
      type: 'THREE_WHITE_SOLDIERS',
      confidence: 0.8,
      startIndex: data.length - 3,
      endIndex: data.length - 1,
      direction: 'BULLISH',
    };
  }

  const isThreeBlackCrows = candles.every(
    c => c.close < c.open && Math.abs(c.close - c.open) / (c.high - c.low + 0.001) > 0.5
  );

  if (isThreeBlackCrows && candles[2].high < candles[0].open) {
    return {
      type: 'THREE_BLACK_CROWS',
      confidence: 0.8,
      startIndex: data.length - 3,
      endIndex: data.length - 1,
      direction: 'BEARISH',
    };
  }

  return null;
}

export function detectAllPatterns(data: OHLCV[]): DetectedPattern[] {
  const patterns: DetectedPattern[] = [];

  if (data.length < 3) return patterns;

  const dojiPattern = detectDoji(data);
  if (dojiPattern) patterns.push(dojiPattern);

  const hammerPattern = detectHammer(data);
  if (hammerPattern) patterns.push(hammerPattern);

  const engulfingPattern = detectEngulfing(data);
  if (engulfingPattern) patterns.push(engulfingPattern);

  const starPattern = detectStar(data);
  if (starPattern) patterns.push(starPattern);

  const threePattern = detectThreeWhiteSoldiers(data);
  if (threePattern) patterns.push(threePattern);

  return patterns;
}
