import type { OHLCV } from '@/app/types';

export interface EMASignal {
  type: 'BUY' | 'SELL' | 'HOLD';
  probability: number;
  confidence: number;
  strength: 'WEAK' | 'MODERATE' | 'STRONG';
  reason: string;
  ema9: number;
  ema21: number;
  adx: number;
  sma50: number;
  currentPrice: number;
}

export class EMACrossStrategy {
  private readonly SHORT_PERIOD = 9;
  private readonly LONG_PERIOD = 21;
  private readonly SMA_PERIOD = 50;
  private readonly ADX_PERIOD = 14;
  private readonly ADX_THRESHOLD = 25;

  generateSignal(data: OHLCV[]): EMASignal {
    if (data.length < 100) {
      return this.createHoldSignal('データ不足', 0, 0, 0, 0);
    }

    const closes = data.map(d => d.close);
    const highs = data.map(d => d.high);
    const lows = data.map(d => d.low);
    
    const ema9 = this.calculateEMA(closes, this.SHORT_PERIOD);
    const ema21 = this.calculateEMA(closes, this.LONG_PERIOD);
    const sma50 = this.calculateSMA(closes, this.SMA_PERIOD);
    const adx = this.calculateADX(highs, lows, closes);

    const lastIdx = data.length - 1;
    const currentEma9 = ema9[lastIdx];
    const currentEma21 = ema21[lastIdx];
    const currentSma50 = sma50[lastIdx];
    const currentAdx = adx[lastIdx];
    const currentPrice = closes[lastIdx];
    
    const prevEma9 = ema9[lastIdx - 1];
    const prevEma21 = ema21[lastIdx - 1];

    if (!currentEma9 || !currentEma21 || !currentSma50 || !currentAdx) {
      return this.createHoldSignal('計算エラー', 0, 0, 0, currentPrice);
    }

    const crossUp = prevEma9 <= prevEma21 && currentEma9 > currentEma21;
    const crossDown = prevEma9 >= prevEma21 && currentEma9 < currentEma21;

    const distance = Math.abs(currentEma9 - currentEma21) / currentEma21;
    const strength = distance > 0.02 ? 'STRONG' : distance > 0.01 ? 'MODERATE' : 'WEAK';
    const baseConfidence = Math.min(70 + distance * 1000, 95);

    if (crossUp) {
      const adxOk = currentAdx >= this.ADX_THRESHOLD;
      const trendOk = currentPrice >= currentSma50;
      
      if (adxOk && trendOk) {
        const confidence = Math.min(baseConfidence + 10, 98);
        return {
          type: 'BUY',
          probability: 0.65,
          confidence,
          strength,
          reason: `EMA9上抜け + ADX${currentAdx.toFixed(0)} + トレンド上昇中`,
          ema9: currentEma9,
          ema21: currentEma21,
          adx: currentAdx,
          sma50: currentSma50,
          currentPrice,
        };
      } else {
        return {
          type: 'HOLD',
          probability: 0.5,
          confidence: 50,
          strength: 'WEAK',
          reason: `EMA上抜けだが条件不足 (ADX:${currentAdx.toFixed(0)} ${adxOk ? '✓' : '✗'}, トレンド:${trendOk ? '✓' : '✗'})`,
          ema9: currentEma9,
          ema21: currentEma21,
          adx: currentAdx,
          sma50: currentSma50,
          currentPrice,
        };
      }
    }

    if (crossDown) {
      const adxOk = currentAdx >= this.ADX_THRESHOLD;
      const trendOk = currentPrice <= currentSma50;
      
      if (adxOk && trendOk) {
        const confidence = Math.min(baseConfidence + 10, 98);
        return {
          type: 'SELL',
          probability: 0.65,
          confidence,
          strength,
          reason: `EMA9下抜け + ADX${currentAdx.toFixed(0)} + トレンド下降中`,
          ema9: currentEma9,
          ema21: currentEma21,
          adx: currentAdx,
          sma50: currentSma50,
          currentPrice,
        };
      } else {
        return {
          type: 'HOLD',
          probability: 0.5,
          confidence: 50,
          strength: 'WEAK',
          reason: `EMA下抜けだが条件不足 (ADX:${currentAdx.toFixed(0)} ${adxOk ? '✓' : '✗'}, トレンド:${trendOk ? '✓' : '✗'})`,
          ema9: currentEma9,
          ema21: currentEma21,
          adx: currentAdx,
          sma50: currentSma50,
          currentPrice,
        };
      }
    }

    return {
      type: 'HOLD',
      probability: 0.5,
      confidence: 50,
      strength: 'WEAK',
      reason: 'シグナルなし',
      ema9: currentEma9,
      ema21: currentEma21,
      adx: currentAdx,
      sma50: currentSma50,
      currentPrice,
    };
  }

  private calculateEMA(data: number[], period: number): number[] {
    const result: number[] = [];
    const multiplier = 2 / (period + 1);

    for (let i = 0; i < data.length; i++) {
      if (i < period - 1) {
        result.push(0);
      } else if (i === period - 1) {
        const sum = data.slice(0, period).reduce((a, b) => a + b, 0);
        result.push(sum / period);
      } else {
        result.push((data[i] - result[i - 1]) * multiplier + result[i - 1]);
      }
    }

    return result;
  }

  private calculateSMA(data: number[], period: number): number[] {
    const result: number[] = [];
    for (let i = 0; i < data.length; i++) {
      if (i < period - 1) {
        result.push(0);
      } else {
        const sum = data.slice(i - period + 1, i + 1).reduce((a, b) => a + b, 0);
        result.push(sum / period);
      }
    }
    return result;
  }

  private calculateADX(highs: number[], lows: number[], closes: number[], period: number = 14): number[] {
    const result: number[] = [];
    const plusDM: number[] = [0];
    const minusDM: number[] = [0];
    const tr: number[] = [0];

    for (let i = 1; i < closes.length; i++) {
      const upMove = highs[i] - highs[i - 1];
      const downMove = lows[i - 1] - lows[i];
      
      plusDM.push(upMove > downMove && upMove > 0 ? upMove : 0);
      minusDM.push(downMove > upMove && downMove > 0 ? downMove : 0);
      
      const trValue = Math.max(
        highs[i] - lows[i],
        Math.abs(highs[i] - closes[i - 1]),
        Math.abs(lows[i] - closes[i - 1])
      );
      tr.push(trValue);
    }

    for (let i = 0; i < closes.length; i++) {
      if (i < period * 2) {
        result.push(0);
      } else {
        const smoothTR = tr.slice(i - period + 1, i + 1).reduce((a, b) => a + b, 0) / period;
        const smoothPlusDM = plusDM.slice(i - period + 1, i + 1).reduce((a, b) => a + b, 0) / period;
        const smoothMinusDM = minusDM.slice(i - period + 1, i + 1).reduce((a, b) => a + b, 0) / period;
        
        const plusDI = smoothTR === 0 ? 0 : (smoothPlusDM / smoothTR) * 100;
        const minusDI = smoothTR === 0 ? 0 : (smoothMinusDM / smoothTR) * 100;
        
        const dx = plusDI + minusDI === 0 ? 0 : (Math.abs(plusDI - minusDI) / (plusDI + minusDI)) * 100;
        result.push(dx);
      }
    }

    return result;
  }

  private createHoldSignal(reason: string, ema9: number, ema21: number, adx: number, price: number): EMASignal {
    return {
      type: 'HOLD',
      probability: 0.5,
      confidence: 50,
      strength: 'WEAK',
      reason,
      ema9,
      ema21,
      adx,
      sma50: 0,
      currentPrice: price,
    };
  }
}

export const emaCrossStrategy = new EMACrossStrategy();
