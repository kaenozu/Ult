import { OHLCV, Signal } from '@/app/types';
import { calculateRSI, calculateSMA } from './utils';

/**
 * 銘柄ごとに最適なインジケーター設定を探索する
 */
export function optimizeParameters(data: OHLCV[], market: 'japan' | 'usa'): { rsiPeriod: number, smaPeriod: number, accuracy: number } {
  const rsiOptions = [10, 14, 20];
  const smaOptions = [20, 50, 100];
  
  let bestAccuracy = -1;
  let bestParams = { rsiPeriod: 14, smaPeriod: 50 };

  for (const rsiP of rsiOptions) {
    for (const smaP of smaOptions) {
      const accuracy = calculateHistoricalAccuracyWithParams(data, market, rsiP, smaP);
      if (accuracy > bestAccuracy) {
        bestAccuracy = accuracy;
        bestParams = { rsiPeriod: rsiP, smaPeriod: smaP };
      }
    }
  }

  return { ...bestParams, accuracy: bestAccuracy };
}

/**
 * 特定のパラメータでの的中率を計算（シミュレーション）
 */
function calculateHistoricalAccuracyWithParams(data: OHLCV[], market: 'japan' | 'usa', rsiP: number, smaP: number): number {
  if (data.length < 100) return 0;
  const closes = data.map(d => d.close);
  const rsi = calculateRSI(closes, rsiP);
  const sma = calculateSMA(closes, smaP);

  let totalSignals = 0;
  let hitCount = 0;
  const step = 5;

  for (let i = Math.max(rsiP, smaP); i < data.length - 10; i += step) {
    const currentPrice = closes[i];
    const currentRSI = rsi[i];
    const currentSMA = sma[i];
    if (isNaN(currentRSI) || isNaN(currentSMA)) continue;

    let simType: 'BUY' | 'SELL' | 'HOLD' = 'HOLD';
    if (currentPrice > currentSMA && currentRSI < 40) simType = 'BUY';
    else if (currentPrice < currentSMA && currentRSI > 60) simType = 'SELL';
    else if (currentRSI < 30) simType = 'BUY';
    else if (currentRSI > 70) simType = 'SELL';

    if (simType === 'HOLD') continue;
    totalSignals++;

    const recentWindow = closes.slice(Math.max(0, i - 14), i + 1);
    const vol = (Math.max(...recentWindow) - Math.min(...recentWindow)) / currentPrice;
    const targetMove = currentPrice * Math.max(vol, 0.02) * 2.0;
    const stopMove = currentPrice * Math.max(vol, 0.02);
    const targetPrice = simType === 'BUY' ? currentPrice + targetMove : currentPrice - targetMove;
    const stopLoss = simType === 'BUY' ? currentPrice - stopMove : currentPrice + stopMove;

    const futureWindow = data.slice(i + 1, i + 6);
    for (const day of futureWindow) {
      if (simType === 'BUY') {
        if (day.high >= targetPrice) { hitCount++; break; }
        if (day.low <= stopLoss) break;
      } else {
        if (day.low <= targetPrice) { hitCount++; break; }
        if (day.high >= stopLoss) break;
      }
    }
  }
  return totalSignals > 0 ? Math.round((hitCount / totalSignals) * 100) : 0;
}

/**
 * 直近の予測誤差係数を計算する
 */
export function calculatePredictionError(data: OHLCV[]): number {
  if (data.length < 30) return 1.0;
  let totalError = 0, count = 0;
  const window = 20;

  for (let i = data.length - window; i < data.length - 5; i++) {
    const current = data[i];
    const actualFuture = data[i + 5].close;
    const sma = calculateSMA(data.slice(0, i + 1).map(d => d.close), 20).pop() || current.close;
    totalError += Math.abs(actualFuture - sma) / sma;
    count++;
  }
  return Math.min(Math.max((totalError / count) / 0.02, 0.8), 2.5);
}

/**
 * 需給の壁（ボリュームプロファイル）を抽出
 */
export function calculateVolumeProfile(data: OHLCV[]): { price: number, strength: number }[] {
  if (data.length === 0) return [];
  
  // 直近1年分（約250日）のデータに絞って計算することで、現在の価格に近い壁を抽出する
  const recentData = data.slice(-250);
  const prices = recentData.map(d => d.close);
  const minP = Math.min(...prices), maxP = Math.max(...prices);
  const range = maxP - minP;
  if (range === 0) return [];

  const binCount = 20, binSize = range / binCount;
  const bins = new Array(binCount).fill(0);

  recentData.forEach(d => {
    const startBin = Math.max(0, Math.floor((d.low - minP) / binSize));
    const endBin = Math.min(binCount - 1, Math.floor((d.high - minP) / binSize));
    const volPerBin = d.volume / (endBin - startBin + 1);
    for (let i = startBin; i <= endBin; i++) bins[i] += volPerBin;
  });

  const maxV = Math.max(...bins);
  return bins.map((vol, i) => ({
    price: minP + (binSize * i) + (binSize / 2),
    strength: vol / maxV
  })).filter(b => b.strength > 0.2); // フィルタリングを緩和(0.4 -> 0.2)
}

/**
 * 基本的なテクニカル指標に基づきシグナルタイプを決定する
 */
function determineSignalType(price: number, sma: number, rsi: number, params: { rsiPeriod: number, smaPeriod: number }): { type: 'BUY' | 'SELL' | 'HOLD', reason: string } {
  if (price > sma && rsi < 40) {
    return { type: 'BUY', reason: `上昇トレンド中の押し目。最適化設定(RSI:${params.rsiPeriod}, SMA:${params.smaPeriod})により反発を予測。` };
  } 
  if (price < sma && rsi > 60) {
    return { type: 'SELL', reason: `下降トレンド中の戻り売り。最適化設定(RSI:${params.rsiPeriod}, SMA:${params.smaPeriod})に基づき続落を予測。` };
  }
  if (rsi < 30) return { type: 'BUY', reason: '極端な売られすぎ水準。短期的な自律反発を予測。' };
  if (rsi > 70) return { type: 'SELL', reason: '買われすぎによる加熱。利益確定売りの優勢を予測。' };
  
  return { type: 'HOLD', reason: `現在のパラメータ設定(RSI:${params.rsiPeriod}, SMA:${params.smaPeriod})では明確な優位性なし。` };
}

/**
 * 銘柄の総合的なテクニカル分析を実行
 */
export function analyzeStock(symbol: string, data: OHLCV[], market: 'japan' | 'usa'): Signal {
  if (data.length < 50) {
    return { symbol, type: 'HOLD', confidence: 0, targetPrice: 0, stopLoss: 0, reason: 'データ不足により分析不可', predictedChange: 0, predictionDate: new Date().toISOString().split('T')[0] };
  }

  // 1. パラメータ最適化
  const opt = optimizeParameters(data, market);
  const closes = data.map(d => d.close);
  const lastRSI = calculateRSI(closes, opt.rsiPeriod).pop() || 50;
  const lastSMA = calculateSMA(closes, opt.smaPeriod).pop() || closes[closes.length - 1];
  const currentPrice = closes[closes.length - 1];

  // 2. シグナル判定
  const { type, reason } = determineSignalType(currentPrice, lastSMA, lastRSI, opt);
  
  // 3. ボラティリティとリスク管理の計算
  const recentCloses = closes.slice(-14);
  const atr = (Math.max(...recentCloses) - Math.min(...recentCloses)) / 2;
  const targetPercent = Math.max(atr / currentPrice, 0.02);
  
  const targetPrice = type === 'BUY' ? currentPrice * (1 + targetPercent * 2) : type === 'SELL' ? currentPrice * (1 - targetPercent * 2) : currentPrice;
  const stopLoss = type === 'BUY' ? currentPrice * (1 - targetPercent) : type === 'SELL' ? currentPrice * (1 + targetPercent) : currentPrice;
  const confidence = 50 + (type === 'HOLD' ? 0 : Math.min(Math.abs(50 - lastRSI) * 1.5, 45));

  return {
    symbol, type,
    confidence: parseFloat(confidence.toFixed(1)),
    accuracy: opt.accuracy,
    atr,
    targetPrice: parseFloat(targetPrice.toFixed(2)),
    stopLoss: parseFloat(stopLoss.toFixed(2)),
    reason: (confidence >= 80 ? '【強気】' : '') + reason,
    predictedChange: parseFloat(((targetPrice - currentPrice) / currentPrice * 100).toFixed(2)),
    predictionDate: new Date().toISOString().split('T')[0],
    optimizedParams: { rsiPeriod: opt.rsiPeriod, smaPeriod: opt.smaPeriod },
    predictionError: calculatePredictionError(data),
    volumeResistance: calculateVolumeProfile(data)
  };
}
