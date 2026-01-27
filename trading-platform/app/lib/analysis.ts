import { OHLCV, Signal } from '../types';
import { calculateRSI, calculateSMA } from './utils';
import {
  FORECAST_CONE,
  RSI_CONFIG,
  SMA_CONFIG,
  OPTIMIZATION,
  RISK_MANAGEMENT,
  PRICE_CALCULATION,
  VOLATILITY,
} from '@/app/constants';
import { marketDataService } from './MarketDataService';
import { volumeAnalysisService } from './VolumeAnalysis';

/**
 * 精密なトレードシミュレーター
 * 「損切りが先か、利確が先か」を保守的に判定
 */
function simulateTrade(data: OHLCV[], startIndex: number, type: 'BUY' | 'SELL', targetMove: number) {
  const entryPrice = data[startIndex].close;
  const targetPrice = type === 'BUY' ? entryPrice + targetMove : entryPrice - targetMove;
  const stopLoss = type === 'BUY' ? entryPrice - targetMove : entryPrice + targetMove;

  let tradeWon = false;
  let tradeLost = false;
  const maxIndex = Math.min(startIndex + FORECAST_CONE.STEPS, data.length - 1);

  for (let j = startIndex + 1; j <= maxIndex; j++) {
    const day = data[j];
    if (!day || day.high === 0 || day.low === 0) break;

    if (type === 'BUY') {
      if (day.low <= stopLoss) { tradeLost = true; break; }
      if (day.high >= targetPrice) { tradeWon = true; break; }
    } else {
      if (day.high >= stopLoss) { tradeLost = true; break; }
      if (day.low <= targetPrice) { tradeWon = true; break; }
    }

    if (tradeWon && !tradeLost) break;
    if (tradeLost) break;
  }

  const forecastDaysLater = data[maxIndex]?.close || data[data.length - 1].close;
  const directionalHit = type === 'BUY' ? forecastDaysLater > entryPrice : forecastDaysLater < entryPrice;

  return { won: tradeWon && !tradeLost, directionalHit };
}

/**
 * 真のボラティリティ(ATR)を簡易計算
 */
function calculateSimpleATR(data: OHLCV[], index: number) {
  const period = VOLATILITY.DEFAULT_ATR_PERIOD;
  const startIndex = Math.max(0, index - period + 1);
  let sumTr = 0;
  let count = 0;

  for (let i = startIndex; i <= index && i < data.length; i++) {
    const d = data[i];
    if (!d || d.high === 0 || d.low === 0) continue;

    if (i > startIndex) {
      const prev = data[i - 1];
      if (prev) {
        const highLow = d.high - d.low;
        const highClose = Math.abs(d.high - prev.close);
        const lowClose = Math.abs(d.low - prev.close);
        sumTr += Math.max(highLow, highClose, lowClose);
        count++;
      }
    } else {
      sumTr += d.high - d.low;
      count++;
    }
  }

  return count > 0 ? sumTr / count : 0;
}

/**
 * 銘柄ごとに的中率が最大化するパラメータを探索
 */
export function optimizeParameters(
  data: OHLCV[],
  market: 'japan' | 'usa',
  context?: { endIndex?: number, indicators?: Map<string, number[]> }
): { rsiPeriod: number, smaPeriod: number, accuracy: number } {
  const endIndex = context?.endIndex ?? data.length;
  if (endIndex < OPTIMIZATION.REQUIRED_DATA_PERIOD) {
    return { rsiPeriod: RSI_CONFIG.DEFAULT_PERIOD, smaPeriod: SMA_CONFIG.MEDIUM_PERIOD, accuracy: 0 };
  }

  let bestAccuracy = -1;
  let bestRsiPeriod = RSI_CONFIG.DEFAULT_PERIOD;
  let bestSmaPeriod = SMA_CONFIG.MEDIUM_PERIOD;

  const closes = data.map(d => d.close);
  const localRsiCache = context?.indicators ? null : new Map<string, number[]>();
  const localSmaCache = context?.indicators ? null : new Map<string, number[]>();

  const getRSI = (p: number) => {
    if (context?.indicators?.has(`rsi-${p}`)) return context.indicators.get(`rsi-${p}`)!;
    const key = `rsi-${p}`;
    if (localRsiCache?.has(key)) return localRsiCache.get(key)!;
    const val = calculateRSI(closes, p);
    localRsiCache?.set(key, val);
    return val;
  };

  const getSMA = (p: number) => {
    if (context?.indicators?.has(`sma-${p}`)) return context.indicators.get(`sma-${p}`)!;
    const key = `sma-${p}`;
    if (localSmaCache?.has(key)) return localSmaCache.get(key)!;
    const val = calculateSMA(closes, p);
    localSmaCache?.set(key, val);
    return val;
  };

  for (const rsiP of RSI_CONFIG.PERIOD_OPTIONS) {
    for (const smaP of SMA_CONFIG.PERIOD_OPTIONS) {
      const result = internalCalculatePerformance(
        data,
        rsiP,
        smaP,
        closes,
        getRSI(rsiP),
        getSMA(smaP),
        endIndex
      );
      if (result.hitRate > bestAccuracy) {
        bestAccuracy = result.hitRate;
        bestRsiPeriod = rsiP;
        bestSmaPeriod = smaP;
      }
    }
  }

  return { rsiPeriod: bestRsiPeriod, smaPeriod: bestSmaPeriod, accuracy: bestAccuracy };
}

function internalCalculatePerformance(
  data: OHLCV[],
  rsiP: number,
  smaP: number,
  closes: number[],
  preCalcRsi?: number[],
  preCalcSma?: number[],
  endIndex: number = data.length
) {
  let hits = 0, dirHits = 0, total = 0;
  const warmup = 100;
  const step = 3;
  const rsi = preCalcRsi || calculateRSI(closes, rsiP);
  const sma = preCalcSma || calculateSMA(closes, smaP);

  for (let i = warmup; i < endIndex - 10; i += step) {
    if (isNaN(rsi[i]) || isNaN(sma[i])) continue;

    let type: 'BUY' | 'SELL' | 'HOLD' = 'HOLD';
    if (closes[i] > sma[i] && rsi[i] < (RSI_CONFIG.OVERSOLD + 10)) type = 'BUY';
    else if (closes[i] < sma[i] && rsi[i] > RSI_CONFIG.OVERBOUGHT) type = 'SELL';

    if (type === 'HOLD') continue;

    total++;
    const atr = calculateSimpleATR(data, i);
    const targetMove = Math.max(atr * RISK_MANAGEMENT.BULL_TARGET_MULTIPLIER, closes[i] * 0.012);

    const result = simulateTrade(data, i, type, targetMove);
    if (result.won) hits++;
    if (result.directionalHit) dirHits++;
  }

  return {
    hits,
    dirHits,
    total,
    hitRate: total > 0 ? (hits / total) * 100 : 0,
    directionalAccuracy: total > 0 ? (dirHits / total) * 100 : 0,
  };
}

export function calculateAIHitRate(symbol: string, data: OHLCV[], market: 'japan' | 'usa' = 'japan') {
  const opt = optimizeParameters(data, market);
  const closes = data.map(d => d.close);
  const result = internalCalculatePerformance(data, opt.rsiPeriod, opt.smaPeriod, closes);

  return {
    hitRate: Math.round(result.hitRate),
    directionalAccuracy: Math.round(result.directionalAccuracy),
    totalTrades: result.total,
    averageProfit: 0,
  };
}

export function calculateVolumeProfile(
  data: OHLCV[],
  bins: number = OPTIMIZATION.VOLUME_PROFILE_BINS,
  endIndex: number = data.length
) {
  if (endIndex === 0) return [];
  const start = Math.max(0, endIndex - FORECAST_CONE.LOOKBACK_DAYS);
  const recentData = data.slice(start, endIndex);

  const totalVolume = recentData.reduce((sum, d) => sum + d.volume, 0);
  if (totalVolume === 0) return [];

  const prices = recentData.map(d => d.close);
  const min = Math.min(...prices);
  const max = Math.max(...prices);
  if (max === min) return [];
  const step = (max - min) / bins;
  const profile = Array.from({ length: bins }, (_, i) => ({
    price: min + step * i,
    volume: 0,
    strength: 0,
  }));

  recentData.forEach(d => {
    const binIndex = Math.min(Math.floor((d.close - min) / step), bins - 1);
    if (binIndex >= 0) profile[binIndex].volume += d.volume;
  });

  const totalVol = profile.reduce((sum, p) => sum + p.volume, 0);
  if (totalVol === 0) return [];

  const maxVol = Math.max(...profile.map(p => p.volume));
  profile.forEach(p => { p.strength = maxVol > 0 ? p.volume / maxVol : 0; });
  return profile;
}

export function calculatePredictionError(data: OHLCV[], endIndex: number = data.length): number {
  if (endIndex < VOLATILITY.CALCULATION_PERIOD) return 1.0;
  let totalError = 0, count = 0;
  for (let i = endIndex - VOLATILITY.CALCULATION_PERIOD; i < endIndex - 5; i++) {
    const current = data[i];
    const actualFuture = data[i + 5].close;
    const sma = calculateSMA(data.slice(0, i + 1).map(d => d.close), SMA_CONFIG.SHORT_PERIOD).pop() || current.close;
    totalError += Math.abs(actualFuture - sma) / sma;
    count++;
  }

  const avgError = count > 0 ? totalError / count : 1.0;
  return Math.min(Math.max(avgError / PRICE_CALCULATION.DEFAULT_ERROR_MULTIPLIER, 0.8), 2.5);
}

function determineSignalType(price: number, sma: number, rsi: number, params: {
  rsiPeriod: number;
  smaPeriod: number;
}): {
  type: 'BUY' | 'SELL' | 'HOLD';
  reason: string;
} {
  if (price > sma && rsi < (RSI_CONFIG.OVERSOLD + 10)) {
    return { type: 'BUY', reason: `上昇トレンド中の押し目。RSI(${params.rsiPeriod})とSMA(${params.smaPeriod})による最適化予測。` };
  }
  if (price < sma && rsi > RSI_CONFIG.OVERBOUGHT) {
    return { type: 'SELL', reason: `下落トレンド中の戻り売り。RSI(${params.rsiPeriod})とSMA(${params.smaPeriod})による最適化予測。` };
  }
  if (rsi < RSI_CONFIG.OVERSOLD) return { type: 'BUY', reason: '売られすぎ水準からの自律反発。' };
  if (rsi > RSI_CONFIG.OVERBOUGHT) return { type: 'SELL', reason: '買われすぎ水準からの反落。' };
  return { type: 'HOLD', reason: '明確な優位性なし。' };
}

/**
 * 予測コーン（Forecast Cone）の計算
 * 楽観・悲観シナリオの予測範囲を生成
 */
function calculateForecastCone(data: OHLCV[]): {
  bearish: { lower: number[]; upper: number[] };
  bullish: { lower: number[]; upper: number[] };
  base: number[];
  confidence: number;
} | null {
  if (data.length < FORECAST_CONE.LOOKBACK_DAYS) return null;

  const recentData = data.slice(-FORECAST_CONE.LOOKBACK_DAYS);
  const closes = recentData.map(d => d.close);
  const currentPrice = closes[closes.length - 1];

  const returns = [];
  for (let i = 1; i < closes.length; i++) {
    returns.push((closes[i] - closes[i - 1]) / closes[i - 1]);
  }

  const meanReturn = returns.reduce((a, b) => a + b, 0) / returns.length;
  const stdReturn = Math.sqrt(
    returns.reduce((sum, r) => sum + Math.pow(r - meanReturn, 2), 0) / returns.length
  );

  const atr = (Math.max(...closes) - Math.min(...closes)) / closes.length;
  const volatility = stdReturn * Math.sqrt(FORECAST_CONE.STEPS);

  const bearishLower: number[] = [currentPrice];
  const bearishUpper: number[] = [currentPrice];
  const bullishLower: number[] = [currentPrice];
  const bullishUpper: number[] = [currentPrice];
  const base: number[] = [currentPrice];

  for (let i = 1; i <= FORECAST_CONE.STEPS; i++) {
    const basePrice = base[base.length - 1];

    const confidenceFactor = Math.sqrt(i / FORECAST_CONE.STEPS);
    const priceVariation = basePrice * volatility * confidenceFactor;

    const bearishFactor = 1 - (atr * 0.5 * confidenceFactor);
    const bullishFactor = 1 + (atr * 0.5 * confidenceFactor);

    bearishLower.push(Math.max(0, (basePrice - priceVariation * 1.5) * bearishFactor));
    bearishUpper.push((basePrice - priceVariation * 0.5) * bearishFactor);
    bullishLower.push((basePrice + priceVariation * 0.5) * bullishFactor);
    bullishUpper.push((basePrice + priceVariation * 1.5) * bullishFactor);
    base.push(basePrice * (1 + meanReturn));
  }

  const confidence = Math.min(
    100,
    Math.max(50, 100 - (volatility * 100 * 10))
  );

  return {
    bearish: { lower: bearishLower, upper: bearishUpper },
    bullish: { lower: bullishLower, upper: bullishUpper },
    base,
    confidence: parseFloat(confidence.toFixed(1)),
  };
}

/**
 * 過去的中率をリアルタイム計算
 */
function calculateRealTimeAccuracy(symbol: string, data: OHLCV[]): {
  hitRate: number;
  directionalAccuracy: number;
  totalTrades: number;
} | null {
  if (data.length < 100) return null;

  const windowSize = 20;
  let hits = 0;
  let dirHits = 0;
  let total = 0;

  for (let i = 100; i < data.length - windowSize; i++) {
    const window = data.slice(0, i);
    const signal = analyzeStock(symbol, window, 'japan');

    if (signal.type === 'HOLD') continue;

    const future = data[i + windowSize];
    const priceChange = (future.close - data[i].close) / data[i].close;
    const predictedChange = (signal.targetPrice - data[i].close) / data[i].close;

    const hit = Math.abs(priceChange - predictedChange) < Math.abs(predictedChange * 0.5);
    const dirHit = (priceChange > 0) === (signal.type === 'BUY');

    if (hit) hits++;
    if (dirHit) dirHits++;
    total++;
  }

  return {
    hitRate: total > 0 ? Math.round((hits / total) * 100) : 0,
    directionalAccuracy: total > 0 ? Math.round((dirHits / total) * 100) : 0,
    totalTrades: total,
  };
}

export function analyzeStock(
  symbol: string,
  data: OHLCV[],
  market: 'japan' | 'usa',
  context?: { endIndex?: number, indicators?: Map<string, number[]>, indexDataOverride?: OHLCV[] }
): Signal {
  const endIndex = context?.endIndex ?? data.length;
  if (endIndex < OPTIMIZATION.MIN_DATA_PERIOD) {
    return { symbol, type: 'HOLD', confidence: 0, targetPrice: 0, stopLoss: 0, reason: 'データ不足', predictedChange: 0, predictionDate: '' };
  }
  const opt = optimizeParameters(data, market, context);
  const closes = data.map(d => d.close);

  const rsiValues = context?.indicators?.get(`rsi-${opt.rsiPeriod}`) || calculateRSI(closes, opt.rsiPeriod);
  const smaValues = context?.indicators?.get(`sma-${opt.smaPeriod}`) || calculateSMA(closes, opt.smaPeriod);

  const lastRSI = rsiValues[endIndex - 1] ?? 50;
  const lastSMA = smaValues[endIndex - 1] ?? closes[endIndex - 1];
  const currentPrice = closes[endIndex - 1];
  const { type, reason } = determineSignalType(currentPrice, lastSMA, lastRSI, opt);
  const recentCloses = closes.slice(Math.max(0, endIndex - RSI_CONFIG.DEFAULT_PERIOD), endIndex);
  const atr = (Math.max(...recentCloses) - Math.min(...recentCloses)) / 2;
  const targetPercent = Math.max(atr / currentPrice, PRICE_CALCULATION.DEFAULT_ATR_RATIO);
  const targetPrice = type === 'BUY' ? currentPrice * (1 + targetPercent * 2) : type === 'SELL' ? currentPrice * (1 - targetPercent * 2) : currentPrice;
  const stopLoss = type === 'BUY' ? currentPrice * (1 - targetPercent) : type === 'SELL' ? currentPrice * (1 + targetPercent) : currentPrice;
  let confidence = 50 + (type === 'HOLD' ? 0 : Math.min(Math.abs(50 - lastRSI) * 1.5, 45));

  // Market correlation analysis
  const relatedIndexSymbol = market === 'japan' ? '^N225' : '^GSPC';
  let marketContext: Signal['marketContext'] | undefined;

  if (data.length >= 50) {
    try {
      // Use override data if provided, otherwise try synchronous cache
      const indexData = context?.indexDataOverride || marketDataService.getCachedMarketData(relatedIndexSymbol);

      if (indexData && indexData.length >= 50) {
        const correlation = marketDataService.calculateCorrelation(data, indexData);
        const indexTrend = marketDataService.calculateTrend(indexData);

        marketContext = {
          indexSymbol: relatedIndexSymbol,
          correlation: parseFloat(correlation.toFixed(2)),
          indexTrend,
        };

        // Adjust signal based on market context
        if (type === 'BUY' && indexTrend === 'DOWN' && correlation < -0.5) {
          // Bearish market with high correlation - reduce confidence
          confidence -= Math.abs(correlation) * 30;
          marketContext.correlation = parseFloat(correlation.toFixed(2));
        }
      }
    } catch (error) {
      console.warn('Failed to fetch market correlation data:', error);
    }
  }

  // Forecast cone
  const forecastCone = calculateForecastCone(data);
  const realTimeAccuracy = calculateRealTimeAccuracy(symbol, data);

  const finalAccuracy = realTimeAccuracy?.hitRate || opt.accuracy;
  let finalConfidence = forecastCone
    ? (confidence + forecastCone.confidence) / 2
    : confidence;

  // Apply beta adjustment if market context is available
  if (marketContext && marketContext.correlation !== 0) {
    const beta = Math.abs(marketContext.correlation);
    finalConfidence = finalConfidence * (1 - beta * 0.1);
  }

  return {
    symbol,
    type,
    confidence: parseFloat(finalConfidence.toFixed(1)),
    accuracy: Math.round(finalAccuracy),
    atr,
    targetPrice: parseFloat(targetPrice.toFixed(2)),
    stopLoss: parseFloat(stopLoss.toFixed(2)),
    reason: (finalConfidence >= 80 ? '【強気】' : '') + reason,
    predictedChange: parseFloat(((targetPrice - currentPrice) / currentPrice * 100).toFixed(2)),
    predictionDate: new Date().toISOString().split('T')[0],
    optimizedParams: { rsiPeriod: opt.rsiPeriod, smaPeriod: opt.smaPeriod },
    predictionError: calculatePredictionError(data, endIndex),
    volumeResistance: calculateVolumeProfile(data, OPTIMIZATION.VOLUME_PROFILE_BINS, endIndex),
    forecastCone: forecastCone || undefined,
    marketContext,
  };
}
