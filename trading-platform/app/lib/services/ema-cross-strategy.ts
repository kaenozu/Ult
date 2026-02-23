import type { OHLCV } from '../../types';
import { calculateEMA, calculateSMA, calculateADX } from './indicators';
import type { EMASignal, EMAStrategyConfig } from './ema-types';
import { DEFAULT_CONFIG } from './ema-types';

export class EMACrossStrategy {
  private config: EMAStrategyConfig;

  constructor(config?: Partial<EMAStrategyConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  generateSignal(data: OHLCV[]): EMASignal {
    if (data.length < 100) {
      return this.createHoldSignal('データ不足', 0, 0, 0, 0);
    }

    const closes = data.map(d => d.close);
    const highs = data.map(d => d.high);
    const lows = data.map(d => d.low);
    
    const ema9 = calculateEMA(closes, this.config.shortPeriod);
    const ema21 = calculateEMA(closes, this.config.longPeriod);
    const sma50 = calculateSMA(closes, this.config.smaPeriod);
    const adx = calculateADX(highs, lows, closes, this.config.adxPeriod);

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
      return this.evaluateBuySignal(currentAdx, currentPrice, currentSma50, currentEma9, currentEma21, baseConfidence, strength);
    }

    if (crossDown) {
      return this.evaluateSellSignal(currentAdx, currentPrice, currentSma50, currentEma9, currentEma21, baseConfidence, strength);
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

  private evaluateBuySignal(
    adx: number,
    price: number,
    sma50: number,
    ema9: number,
    ema21: number,
    confidence: number,
    strength: 'WEAK' | 'MODERATE' | 'STRONG'
  ): EMASignal {
    const adxOk = adx >= this.config.adxThreshold;
    const trendOk = price >= sma50;
    
    if (adxOk && trendOk) {
      return {
        type: 'BUY',
        probability: 0.65,
        confidence: Math.min(confidence + 10, 98),
        strength,
        reason: `EMA9上抜け + ADX${adx.toFixed(0)} + トレンド上昇中`,
        ema9,
        ema21,
        adx,
        sma50,
        currentPrice: price,
      };
    }
    
    return {
      type: 'HOLD',
      probability: 0.5,
      confidence: 50,
      strength: 'WEAK',
      reason: `EMA上抜けだが条件不足 (ADX:${adx.toFixed(0)} ${adxOk ? '✓' : '✗'}, トレンド:${trendOk ? '✓' : '✗'})`,
      ema9,
      ema21,
      adx,
      sma50,
      currentPrice: price,
    };
  }

  private evaluateSellSignal(
    adx: number,
    price: number,
    sma50: number,
    ema9: number,
    ema21: number,
    confidence: number,
    strength: 'WEAK' | 'MODERATE' | 'STRONG'
  ): EMASignal {
    const adxOk = adx >= this.config.adxThreshold;
    const trendOk = price <= sma50;
    
    if (adxOk && trendOk) {
      return {
        type: 'SELL',
        probability: 0.65,
        confidence: Math.min(confidence + 10, 98),
        strength,
        reason: `EMA9下抜け + ADX${adx.toFixed(0)} + トレンド下降中`,
        ema9,
        ema21,
        adx,
        sma50,
        currentPrice: price,
      };
    }
    
    return {
      type: 'HOLD',
      probability: 0.5,
      confidence: 50,
      strength: 'WEAK',
      reason: `EMA下抜けだが条件不足 (ADX:${adx.toFixed(0)} ${adxOk ? '✓' : '✗'}, トレンド:${trendOk ? '✓' : '✗'})`,
      ema9,
      ema21,
      adx,
      sma50,
      currentPrice: price,
    };
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
