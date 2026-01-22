import { OHLCV, Signal } from '@/app/types';
import { calculateRSI, calculateSMA, calculateMACD, calculateATR } from './utils';

export function analyzeStock(symbol: string, data: OHLCV[], market: 'japan' | 'usa'): Signal {
  // Need at least 50 points for reliable indicators
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
  const sma200 = calculateSMA(closes, 200);
  const macdData = calculateMACD(closes);
  const atr = calculateATR(data, 14);

  const currentPrice = closes[closes.length - 1];
  
  // Helper to safely get value or 0
  const getVal = (arr: number[], idx: number) => !isNaN(arr[idx]) ? arr[idx] : 0;

  const currentRSI = getVal(rsi, rsi.length - 1);
  const currentSMA50 = getVal(sma50, sma50.length - 1);
  const currentSMA200 = getVal(sma200, sma200.length - 1);
  const currentATR = getVal(atr, atr.length - 1);
  
  // MACD Logic
  const macdLine = macdData.macd;
  const signalLine = macdData.signal;
  const currMacd = getVal(macdLine, macdLine.length - 1);
  const prevMacd = getVal(macdLine, macdLine.length - 2);
  const currSig = getVal(signalLine, signalLine.length - 1);
  const prevSig = getVal(signalLine, signalLine.length - 2);

  const isGoldenCross = prevMacd <= prevSig && currMacd > currSig;
  const isDeadCross = prevMacd >= prevSig && currMacd < currSig;

  let type: 'BUY' | 'SELL' | 'HOLD' = 'HOLD';
  let reason = '';
  let confidence = 50;

  const isUptrend = currentPrice > currentSMA50 && (currentSMA200 === 0 || currentPrice > currentSMA200);
  
  // Combined Logic (Volatility Adjusted)
  const rsiOversold = currentRSI < 30;
  const rsiOverbought = currentRSI > 70;

  if (isGoldenCross && currentRSI < 65) {
    type = 'BUY';
    confidence = isUptrend ? 88 : 70;
    reason = `MACDゴールデンクロスと${isUptrend ? '強気トレンド' : '反転傾向'}を確認。RSI(${currentRSI.toFixed(1)})は適正。`;
  } else if (isDeadCross && currentRSI > 35) {
    type = 'SELL';
    confidence = !isUptrend ? 88 : 70;
    reason = `MACDデッドクロスと${!isUptrend ? '弱気トレンド' : '調整局面'}を確認。RSI(${currentRSI.toFixed(1)})は低下中。`;
  } else if (rsiOversold) {
    type = 'BUY';
    confidence = 65;
    reason = `RSIが売られすぎ水準(${currentRSI.toFixed(1)})に到達。ボラティリティ(${((currentATR/currentPrice)*100).toFixed(1)}%)に基づいた自律反発を期待。`;
  } else if (rsiOverbought) {
    type = 'SELL';
    confidence = 65;
    reason = `RSIが買われすぎ水準(${currentRSI.toFixed(1)})に到達。短期的過熱感による調整リスク。`;
  } else {
    type = 'HOLD';
    reason = `明確なトレンド転換サイン待ち。現在のRSI: ${currentRSI.toFixed(1)}。`;
  }

  // Dynamic Target/Stop based on ATR (Volatility)
  // Standard logic: Stop = 2.0 * ATR, Target = 4.0 * ATR (Reward/Risk = 2)
  const atrMultiplier = 2.0;
  const rewardRiskRatio = 2.5; // Slightly more aggressive target

  let targetPrice = currentPrice;
  let stopLoss = currentPrice;
  let predictedChange = 0;

  if (type === 'BUY') {
    stopLoss = currentPrice - (currentATR * atrMultiplier);
    targetPrice = currentPrice + (currentATR * atrMultiplier * rewardRiskRatio);
    predictedChange = ((targetPrice - currentPrice) / currentPrice) * 100;
  } else if (type === 'SELL') {
    stopLoss = currentPrice + (currentATR * atrMultiplier);
    targetPrice = currentPrice - (currentATR * atrMultiplier * rewardRiskRatio);
    predictedChange = ((targetPrice - currentPrice) / currentPrice) * 100;
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
