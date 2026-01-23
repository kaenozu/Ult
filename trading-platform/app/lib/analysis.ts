import { OHLCV, Signal } from '@/app/types';
import { calculateRSI, calculateSMA } from './utils';

/**
 * 銘柄ごとに最適なインジケーター設定を探索する（パラメータ最適化）
 */
function optimizeParameters(data: OHLCV[], market: 'japan' | 'usa'): { rsiPeriod: number, smaPeriod: number, accuracy: number } {
  const rsiOptions = [10, 14, 20];
  const smaOptions = [20, 50, 100];
  
  let bestAccuracy = -1;
  let bestParams = { rsiPeriod: 14, smaPeriod: 50 };

  // 全組み合わせをテストして最も的中率の高いものを探す
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
 * 特定のパラメータでの的中率を計算（内部用高速版）
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

    // ターゲット価格の算出（ボラティリティ近似）
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
 * 直近の予測誤差係数を計算する（自己矯正用）
 */
function calculatePredictionError(data: OHLCV[]): number {
  if (data.length < 30) return 1.0;
  
  let totalError = 0;
  let count = 0;
  const window = 20;

  for (let i = data.length - window; i < data.length - 5; i++) {
    const current = data[i];
    const actualFuture = data[i + 5].close;
    
    // 5日前の移動平均からの予測値をシミュレート
    const sma = calculateSMA(data.slice(0, i + 1).map(d => d.close), 20).pop() || current.close;
    const error = Math.abs(actualFuture - sma) / sma;
    totalError += error;
    count++;
  }

  const avgError = totalError / count;
  // 標準的な誤差を 2% と仮定し、それに対する比率を返す (最小 0.8, 最大 2.5)
  return Math.min(Math.max(avgError / 0.02, 0.8), 2.5);
}

/**
 * 価格帯別出来高（ボリュームプロファイル）から主要な抵抗帯を抽出する
 */
function calculateVolumeProfile(data: OHLCV[]): { price: number, strength: number }[] {
  if (data.length === 0) return [];
  
  const prices = data.map(d => d.close);
  const minPrice = Math.min(...prices);
  const maxPrice = Math.max(...prices);
  const range = maxPrice - minPrice;
  if (range === 0) return [];

  const binCount = 10;
  const binSize = range / binCount;
  const bins = new Array(binCount).fill(0);

  data.forEach(d => {
    const binIdx = Math.min(Math.floor((d.close - minPrice) / binSize), binCount - 1);
    bins[binIdx] += d.volume;
  });

  const maxVolume = Math.max(...bins);
  return bins.map((vol, i) => ({
    price: minPrice + (binSize * i) + (binSize / 2),
    strength: vol / maxVolume
  })).filter(b => b.strength > 0.5); // 強い壁だけを抽出
}

export function analyzeStock(symbol: string, data: OHLCV[], _market: 'japan' | 'usa'): Signal {
  if (data.length < 50) {
    return {
      symbol,
      type: 'HOLD',
      confidence: 0,
      targetPrice: 0,
      stopLoss: 0,
      reason: 'データ不足により分析不可',
      predictedChange: 0,
      predictionDate: new Date().toISOString().split('T')[0],
    };
  }

  // パラメータの自動最適化を実行（銘柄ごとに最適な脳を作る）
  const { rsiPeriod, smaPeriod, accuracy } = optimizeParameters(data, _market);

  const closes = data.map(d => d.close);
  const rsi = calculateRSI(closes, rsiPeriod);
  const sma = calculateSMA(closes, smaPeriod);

  const currentPrice = closes[closes.length - 1];
  const lastRSI = rsi[rsi.length - 1] || 50;
  const lastSMA = sma[sma.length - 1] || currentPrice;

  let type: 'BUY' | 'SELL' | 'HOLD' = 'HOLD';
  let reason = '';
  const isUptrend = currentPrice > lastSMA;
  const isDowntrend = currentPrice < lastSMA;

  if (isUptrend && lastRSI < 40) {
    type = 'BUY';
    reason = `上昇トレンド中の押し目。最適化設定(RSI:${rsiPeriod}, SMA:${smaPeriod})により高確率な反発を予測。`;
  } else if (isDowntrend && lastRSI > 60) {
    type = 'SELL';
    reason = `下降トレンド中の戻り売り。最適化設定(RSI:${rsiPeriod}, SMA:${smaPeriod})に基づき続落を予測。`;
  } else if (lastRSI < 30) {
    type = 'BUY';
    reason = `極端な売られすぎ水準。短期的な自律反発を予測。`;
  } else if (lastRSI > 70) {
    type = 'SELL';
    reason = `買われすぎによる加熱。利益確定売りの優勢を予測。`;
  } else {
    type = 'HOLD';
    reason = `現在のパラメータ設定(RSI:${rsiPeriod}, SMA:${smaPeriod})では明確な優位性なし。`;
  }

  const confidence = 50 + (type === 'HOLD' ? 0 : Math.min(Math.abs(50 - lastRSI) * 1.5, 45));
  const recentCloses = closes.slice(-14);
  const high = Math.max(...recentCloses);
  const low = Math.min(...recentCloses);
  const atr = (high - low) / 2;
  
  const rewardRatio = 2.0;
  const targetPercent = Math.max(atr / currentPrice, 0.02) * rewardRatio;
  const stopPercent = Math.max(atr / currentPrice, 0.02);

  let targetPrice = currentPrice;
  let stopLoss = currentPrice;
  let predictedChange = 0;

  if (type === 'BUY') {
    targetPrice = currentPrice * (1 + targetPercent);
    stopLoss = currentPrice * (1 - stopPercent);
    predictedChange = targetPercent * 100;
  } else if (type === 'SELL') {
    targetPrice = currentPrice * (1 - targetPercent);
    stopLoss = currentPrice * (1 + stopPercent);
    predictedChange = -targetPercent * 100;
  }

  // 自己矯正用データの計算
  const predictionError = calculatePredictionError(data);
  const volumeResistance = calculateVolumeProfile(data);

  return {
    symbol,
    type,
    confidence: parseFloat(confidence.toFixed(1)),
    accuracy: accuracy,
    atr: atr,
    targetPrice: parseFloat(targetPrice.toFixed(2)),
    stopLoss: parseFloat(stopLoss.toFixed(2)),
    reason: (confidence >= 80 ? '【強気】' : '') + reason,
    predictedChange: parseFloat(predictedChange.toFixed(2)),
    predictionDate: new Date().toISOString().split('T')[0],
    optimizedParams: { rsiPeriod, smaPeriod },
    predictionError,
    volumeResistance
  };
}