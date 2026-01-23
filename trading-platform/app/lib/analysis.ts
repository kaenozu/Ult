import { OHLCV, Signal } from '@/app/types';
import { calculateRSI, calculateSMA } from './utils';

export function analyzeStock(symbol: string, data: OHLCV[], _market: 'japan' | 'usa'): Signal {
  // Need at least 50 points for SMA50
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

  // Extract closing prices
  const closes = data.map(d => d.close);
  
  // Calculate Indicators
  const rsi = calculateRSI(closes, 14);
  const sma50 = calculateSMA(closes, 50);

  const currentPrice = closes[closes.length - 1];
  // Helper to safely get value or 0
  const getVal = (arr: number[], idx: number) => !isNaN(arr[idx]) ? arr[idx] : 0;

  const currentRSI = getVal(rsi, rsi.length - 1);
  const currentSMA50 = getVal(sma50, sma50.length - 1);

  let type: 'BUY' | 'SELL' | 'HOLD' = 'HOLD';
  let reason = '';
  let confidence = 50;

  // Logic: Trend + Reversal
  // BUY: Uptrend (Price > SMA50) AND Oversold (RSI < 40)
  // SELL: Downtrend (Price < SMA50) AND Overbought (RSI > 60)

  const isUptrend = currentPrice > currentSMA50;
  const isDowntrend = currentPrice < currentSMA50;
  
  const rsiOversold = 40;
  const rsiOverbought = 60;

  if (isUptrend && currentRSI < rsiOversold) {
    type = 'BUY';
    confidence = 60 + (rsiOversold - currentRSI); // Boost confidence if deeper dip
    reason = `上昇トレンド中の押し目買いチャンス (価格 > SMA50 かつ RSI ${currentRSI.toFixed(1)} < 40)`;
  } else if (isDowntrend && currentRSI > rsiOverbought) {
    type = 'SELL';
    confidence = 60 + (currentRSI - rsiOverbought); // Boost confidence if higher rally
    reason = `下降トレンド中の戻り売り推奨 (価格 < SMA50 かつ RSI ${currentRSI.toFixed(1)} > 60)`;
  } else if (currentRSI < 30) {
    type = 'BUY';
    confidence = 55;
    reason = `売られすぎ水準 (RSI ${currentRSI.toFixed(1)}) - 短期リバウンド期待`;
  } else if (currentRSI > 70) {
    type = 'SELL';
    confidence = 55;
    reason = `買われすぎ水準 (RSI ${currentRSI.toFixed(1)}) - 加熱感あり`;
  } else {
    type = 'HOLD';
    reason = `明確なシグナルなし (RSI ${currentRSI.toFixed(1)}, トレンド${isUptrend ? '上昇' : '下降'})`;
  }

  // Cap confidence
  confidence = Math.min(Math.max(confidence, 0), 95);

  // ATR-based volatility for unique cloud shapes
  const recentCloses = closes.slice(-14);
  const high = Math.max(...recentCloses);
  const low = Math.min(...recentCloses);
  const atr = (high - low) / 2; // Simple ATR approximation
  
  // Dynamic Target/Stop
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

  return {
    symbol,
    type,
    confidence: parseFloat(confidence.toFixed(1)),
    accuracy: calculateHistoricalAccuracy(symbol, data, _market),
    atr: atr,
    targetPrice: parseFloat(targetPrice.toFixed(2)),
    stopLoss: parseFloat(stopLoss.toFixed(2)),
    reason,
    predictedChange: parseFloat(predictedChange.toFixed(2)),
    predictionDate: new Date().toISOString().split('T')[0],
  };
}

/**
 * AIロジックの過去5年間の的中率を計算する（高速版）
 */
function calculateHistoricalAccuracy(symbol: string, data: OHLCV[], market: 'japan' | 'usa'): number {
  if (data.length < 100) return 0;

  // インジケーターを事前に一括計算（これが高速化の鍵）
  const closes = data.map(d => d.close);
  const rsi = calculateRSI(closes, 14);
  const sma50 = calculateSMA(closes, 50);

  let totalSignals = 0;
  let hitCount = 0;

  const step = 5; 
  for (let i = 50; i < data.length - 10; i += step) {
    const currentPrice = closes[i];
    const currentRSI = rsi[i];
    const currentSMA50 = sma50[i];
    
    if (isNaN(currentRSI) || isNaN(currentSMA50)) continue;

    // 簡易的なシグナル判定（高速シミュレーション用）
    let simType: 'BUY' | 'SELL' | 'HOLD' = 'HOLD';
    if (currentPrice > currentSMA50 && currentRSI < 40) simType = 'BUY';
    else if (currentPrice < currentSMA50 && currentRSI > 60) simType = 'SELL';
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

    // その後5日間の動きをチェック
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
 * 内部用の分析ロジック（再帰呼び出しを避けるため）
 */
function analyzeStockInternal(symbol: string, data: OHLCV[], market: 'japan' | 'usa') {
  // Extract closing prices
  const closes = data.map(d => d.close);
  const rsi = calculateRSI(closes, 14);
  const sma50 = calculateSMA(closes, 50);
  const currentPrice = closes[closes.length - 1];
  const getVal = (arr: number[], idx: number) => !isNaN(arr[idx]) ? arr[idx] : 0;
  const currentRSI = getVal(rsi, rsi.length - 1);
  const currentSMA50 = getVal(sma50, sma50.length - 1);

  let type: 'BUY' | 'SELL' | 'HOLD' = 'HOLD';
  const isUptrend = currentPrice > currentSMA50;
  const isDowntrend = currentPrice < currentSMA50;

  if (isUptrend && currentRSI < 40) type = 'BUY';
  else if (isDowntrend && currentRSI > 60) type = 'SELL';
  else if (currentRSI < 30) type = 'BUY';
  else if (currentRSI > 70) type = 'SELL';

  const recentCloses = closes.slice(-14);
  const volatility = (Math.max(...recentCloses) - Math.min(...recentCloses)) / currentPrice;
  const targetPercent = Math.max(volatility, 0.02) * 2.0;
  const stopPercent = Math.max(volatility, 0.02);

  let targetPrice = currentPrice;
  let stopLoss = currentPrice;

  if (type === 'BUY') {
    targetPrice = currentPrice * (1 + targetPercent);
    stopLoss = currentPrice * (1 - stopPercent);
  } else if (type === 'SELL') {
    targetPrice = currentPrice * (1 - targetPercent);
    stopLoss = currentPrice * (1 + stopPercent);
  }

  return { type, targetPrice, stopLoss };
}
