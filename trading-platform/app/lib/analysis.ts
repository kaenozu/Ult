import { OHLCV, Signal } from '@/app/types';
import { calculateRSI, calculateSMA } from './utils';

export function analyzeStock(symbol: string, data: OHLCV[], market: 'japan' | 'usa'): Signal {
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
  const sma20 = calculateSMA(closes, 20);
  const sma50 = calculateSMA(closes, 50);

  const currentPrice = closes[closes.length - 1];
  // Helper to safely get value or 0
  const getVal = (arr: number[], idx: number) => !isNaN(arr[idx]) ? arr[idx] : 0;

  const currentRSI = getVal(rsi, rsi.length - 1);
  const currentSMA20 = getVal(sma20, sma20.length - 1);
  const prevSMA20 = getVal(sma20, sma20.length - 2);
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

  // Targets based on Volatility (ATR-like approx)
  const recentCloses = closes.slice(-14);
  const high = Math.max(...recentCloses);
  const low = Math.min(...recentCloses);
  const volatility = (high - low) / currentPrice; // Approx % volatility
  
  // Dynamic Target/Stop
  const rewardRatio = 2.0;
  const targetPercent = Math.max(volatility, 0.02) * rewardRatio; // Min 2% move
  const stopPercent = Math.max(volatility, 0.02);

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
    targetPrice: parseFloat(targetPrice.toFixed(2)),
    stopLoss: parseFloat(stopLoss.toFixed(2)),
    reason,
    predictedChange: parseFloat(predictedChange.toFixed(2)),
    predictionDate: new Date().toISOString().split('T')[0],
  };
}
