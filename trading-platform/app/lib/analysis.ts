import { OHLCV, Signal } from '@/app/types';
import { calculateRSI, calculateSMA } from './utils';

const LookbackDays = 250;

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

  for (let j = 1; j <= 5; j++) {
    const day = data[startIndex + j];
    if (!day || day.high === 0 || day.low === 0) break;

    if (type === 'BUY') {
      // 保守的ルール: 同じ日に両方当たったら負けとする
      if (day.low <= stopLoss) { tradeLost = true; break; }
      if (day.high >= targetPrice) { tradeWon = true; break; }
    } else {
      if (day.high >= stopLoss) { tradeLost = true; break; }
      if (day.low <= targetPrice) { tradeWon = true; break; }
    }
  }

  const fiveDaysLater = data[startIndex + 5]?.close || data[data.length - 1].close;
  const directionalHit = type === 'BUY' ? fiveDaysLater > entryPrice : fiveDaysLater < entryPrice;

  return { won: tradeWon && !tradeLost, directionalHit };
}

/**
 * 真のボラティリティ(ATR)を簡易計算
 */
function calculateSimpleATR(data: OHLCV[], index: number) {
  const window = data.slice(Math.max(0, index - 14), index + 1);
  const trs = window.map((d, i) => {
    if (i === 0) return d.high - d.low;
    const highLow = d.high - d.low;
    const highClose = Math.abs(d.high - window[i - 1].close);
    const lowClose = Math.abs(d.low - window[i - 1].close);
    return Math.max(highLow, highClose, lowClose);
  });
  return trs.reduce((a, b) => a + b, 0) / trs.length;
}

/**
 * 銘柄ごとに的中率が最大化するパラメータを探索
 */
export function optimizeParameters(data: OHLCV[], market: 'japan' | 'usa'): { rsiPeriod: number, smaPeriod: number, accuracy: number } {
  if (data.length < 120) return { rsiPeriod: 14, smaPeriod: 50, accuracy: 0 };
  
  const rsiOptions = [10, 14, 21];
  const smaOptions = [20, 50, 100];
  let bestAccuracy = -1;
  let bestParams = { rsiPeriod: 14, smaPeriod: 50 };

  for (const rsiP of rsiOptions) {
    for (const smaP of smaOptions) {
      const result = internalCalculatePerformance(data, rsiP, smaP);
      if (result.hitRate > bestAccuracy) {
        bestAccuracy = result.hitRate;
        bestParams = { rsiPeriod: rsiP, smaPeriod: smaP };
      }
    }
  }
  return { ...bestParams, accuracy: bestAccuracy };
}

function internalCalculatePerformance(data: OHLCV[], rsiP: number, smaP: number) {
  let wins = 0, dirHits = 0, total = 0;
  const warmup = 100;
  const step = 3;
  const closes = data.map(d => d.close);
  const rsi = calculateRSI(closes, rsiP);
  const sma = calculateSMA(closes, smaP);

  for (let i = warmup; i < data.length - 10; i += step) {
    if (isNaN(rsi[i]) || isNaN(sma[i])) continue;
    
    let type: 'BUY' | 'SELL' | 'HOLD' = 'HOLD';
    if (closes[i] > sma[i] && rsi[i] < 40) type = 'BUY';
    else if (closes[i] < sma[i] && rsi[i] > 60) type = 'SELL';
    
    if (type === 'HOLD') continue;
    
    total++;
    const atr = calculateSimpleATR(data, i);
    const targetMove = Math.max(atr * 0.8, closes[i] * 0.012);
    
    const result = simulateTrade(data, i, type, targetMove);
    if (result.won) wins++;
    if (result.directionalHit) dirHits++;
  }
  return { 
    hitRate: total > 0 ? (wins / total) * 100 : 0, 
    directionalAccuracy: total > 0 ? (dirHits / total) * 100 : 0,
    total 
  };
}

export function calculateAIHitRate(symbol: string, data: OHLCV[], market: 'japan' | 'usa' = 'japan') {
  const opt = optimizeParameters(data, market);
  const result = internalCalculatePerformance(data, opt.rsiPeriod, opt.smaPeriod);
  
  return {
    hitRate: Math.round(result.hitRate),
    directionalAccuracy: Math.round(result.directionalAccuracy),
    totalTrades: result.total,
    averageProfit: 0 // 今回は的中率にフォーカス
  };
}

export function calculateVolumeProfile(data: OHLCV[], bins: number = 20) {
  if (data.length === 0) return [];
  const recentData = data.slice(-LookbackDays);
  const prices = recentData.map(d => d.close);
  const min = Math.min(...prices), max = Math.max(...prices);
  if (max === min) return [];
  const step = (max - min) / bins;
  const profile = Array.from({ length: bins }, (_, i) => ({ price: min + step * i, volume: 0, strength: 0 }));
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

export function calculatePredictionError(data: OHLCV[]): number {
  if (data.length < 30) return 1.0;
  let totalError = 0, count = 0;
  for (let i = data.length - 20; i < data.length - 5; i++) {
    const current = data[i];
    const actualFuture = data[i + 5].close;
    const sma = calculateSMA(data.slice(0, i + 1).map(d => d.close), 20).pop() || current.close;
    totalError += Math.abs(actualFuture - sma) / sma;
    count++;
  }
  return Math.min(Math.max((totalError / count) / 0.02, 0.8), 2.5);
}

function determineSignalType(price: number, sma: number, rsi: number, params: { rsiPeriod: number, smaPeriod: number }): { type: 'BUY' | 'SELL' | 'HOLD', reason: string } {
  if (price > sma && rsi < 40) return { type: 'BUY', reason: `上昇トレンド中の押し目。RSI(${params.rsiPeriod})とSMA(${params.smaPeriod})による最適化予測。` };
  if (price < sma && rsi > 60) return { type: 'SELL', reason: `下落トレンド中の戻り売り。RSI(${params.rsiPeriod})とSMA(${params.smaPeriod})による最適化予測。` };
  if (rsi < 30) return { type: 'BUY', reason: '売られすぎ水準からの自律反発。' };
  if (rsi > 70) return { type: 'SELL', reason: '買われすぎ水準からの反落。' };
  return { type: 'HOLD', reason: '明確な優位性なし。' };
}

export function analyzeStock(symbol: string, data: OHLCV[], market: 'japan' | 'usa'): Signal {
  if (data.length < 50) return { symbol, type: 'HOLD', confidence: 0, targetPrice: 0, stopLoss: 0, reason: 'データ不足', predictedChange: 0, predictionDate: '' };
  const opt = optimizeParameters(data, market);
  const closes = data.map(d => d.close);
  const lastRSI = calculateRSI(closes, opt.rsiPeriod).pop() || 50;
  const lastSMA = calculateSMA(closes, opt.smaPeriod).pop() || closes[closes.length - 1];
  const currentPrice = closes[closes.length - 1];
  const { type, reason } = determineSignalType(currentPrice, lastSMA, lastRSI, opt);
  const recentCloses = closes.slice(-14);
  const atr = (Math.max(...recentCloses) - Math.min(...recentCloses)) / 2;
  const targetPercent = Math.max(atr / currentPrice, 0.02);
  const targetPrice = type === 'BUY' ? currentPrice * (1 + targetPercent * 2) : type === 'SELL' ? currentPrice * (1 - targetPercent * 2) : currentPrice;
  const stopLoss = type === 'BUY' ? currentPrice * (1 - targetPercent) : type === 'SELL' ? currentPrice * (1 + targetPercent) : currentPrice;
  const confidence = 50 + (type === 'HOLD' ? 0 : Math.min(Math.abs(50 - lastRSI) * 1.5, 45));
  return {
    symbol, type, confidence: parseFloat(confidence.toFixed(1)), accuracy: Math.round(opt.accuracy), atr,
    targetPrice: parseFloat(targetPrice.toFixed(2)), stopLoss: parseFloat(stopLoss.toFixed(2)),
    reason: (confidence >= 80 ? '【強気】' : '') + reason,
    predictedChange: parseFloat(((targetPrice - currentPrice) / currentPrice * 100).toFixed(2)),
    predictionDate: new Date().toISOString().split('T')[0],
    optimizedParams: { rsiPeriod: opt.rsiPeriod, smaPeriod: opt.smaPeriod },
    predictionError: calculatePredictionError(data),
    volumeResistance: calculateVolumeProfile(data)
  };
}