/**
 * Technical Analysis Utilities
 * 
 * Shared implementation of technical indicators to avoid duplication across engines.
 */

import { OHLCV } from '@/app/types';

/**
 * Calculate Average True Range (ATR)
 */
export function calculateATR(data: OHLCV[], period: number = 14): number[] {
  const atr: number[] = [];
  const trueRanges: number[] = [];
  
  for (let i = 1; i < data.length; i++) {
    const high = data[i].high;
    const low = data[i].low;
    const prevClose = data[i - 1].close;
    
    const tr = Math.max(
      high - low,
      Math.abs(high - prevClose),
      Math.abs(low - prevClose)
    );
    trueRanges.push(tr);
  }
  
  // First ATR is simple average
  atr.push(NaN); // padding for first
  for (let i = 0; i < trueRanges.length; i++) {
    if (i < period - 1) {
      atr.push(NaN);
    } else if (i === period - 1) {
      const sum = trueRanges.slice(0, period).reduce((a, b) => a + b, 0);
      atr.push(sum / period);
    } else {
      const prevATR = atr[atr.length - 1];
      const currentATR = (prevATR * (period - 1) + trueRanges[i]) / period;
      atr.push(currentATR);
    }
  }
  
  return atr;
}

/**
 * Calculate Average Directional Index (ADX)
 */
export function calculateADX(data: OHLCV[], period: number = 14): number[] {
  const adx: number[] = [];
  const dmPlus: number[] = [];
  const dmMinus: number[] = [];
  const tr: number[] = [];
  
  for (let i = 1; i < data.length; i++) {
    const upMove = data[i].high - data[i - 1].high;
    const downMove = data[i - 1].low - data[i].low;
    
    dmPlus.push(upMove > downMove && upMove > 0 ? upMove : 0);
    dmMinus.push(downMove > upMove && downMove > 0 ? downMove : 0);
    
    tr.push(Math.max(
      data[i].high - data[i].low,
      Math.abs(data[i].high - data[i - 1].close),
      Math.abs(data[i].low - data[i - 1].close)
    ));
  }
  
  // Wilders smoothing
  let avgTR = 0;
  let avgDMPlus = 0;
  let avgDMMinus = 0;
  
  for (let i = 0; i < tr.length; i++) {
    if (i < period) {
      avgTR += tr[i];
      avgDMPlus += dmPlus[i];
      avgDMMinus += dmMinus[i];
      adx.push(NaN);
    } else if (i === period) {
      const diPlus = (avgDMPlus / avgTR) * 100;
      const diMinus = (avgDMMinus / avgTR) * 100;
      const dx = (Math.abs(diPlus - diMinus) / (diPlus + diMinus)) * 100;
      adx.push(dx); // First DX
    } else {
      avgTR = avgTR - (avgTR / period) + tr[i];
      avgDMPlus = avgDMPlus - (avgDMPlus / period) + dmPlus[i];
      avgDMMinus = avgDMMinus - (avgDMMinus / period) + dmMinus[i];
      
      const diPlus = (avgDMPlus / avgTR) * 100;
      const diMinus = (avgDMMinus / avgTR) * 100;
      const dx = (Math.abs(diPlus - diMinus) / (diPlus + diMinus)) * 100;
      
      // ADX is another layer of smoothing
      const prevADX = adx[adx.length - 1];
      adx.push((prevADX * (period - 1) + dx) / period);
    }
  }
  
  // Pad one extra NaN at the beginning to match original data length (due to i=1 loop start)
  adx.unshift(NaN);
  
  return adx;
}
