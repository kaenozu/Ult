import { OHLCV } from '@/app/types';

export interface MarketRegime {
  type: 'TRENDING_UP' | 'TRENDING_DOWN' | 'RANGING' | 'VOLATILE';
  volatilityLevel: 'LOW' | 'NORMAL' | 'HIGH' | 'EXTREME';
  trendStrength: number;
  momentumQuality: number;
}

interface ADXResult {
  adx: number[];
  plusDI: number[];
  minusDI: number[];
}

export class MarketRegimeDetector {
  private readonly minDataPoints = 14;
  private readonly adxPeriod = 14;
  private readonly atrPeriod = 14;

  detect(data: OHLCV[]): MarketRegime {
    if (data.length < this.minDataPoints) {
      throw new Error(`Insufficient data: need at least ${this.minDataPoints} data points, got ${data.length}`);
    }

    const atr = this.calculateATR(data, this.atrPeriod);
    const adxResult = this.calculateADX(data, this.adxPeriod);
    
    const latestADX = adxResult.adx[adxResult.adx.length - 1] || 0;
    const latestPlusDI = adxResult.plusDI[adxResult.plusDI.length - 1] || 0;
    const latestMinusDI = adxResult.minusDI[adxResult.minusDI.length - 1] || 0;
    const latestATR = atr[atr.length - 1] || 0;
    
    const atrRatio = this.calculateATRRatio(data, atr);
    const volatilityLevel = this.determineVolatilityLevel(atrRatio);
    const trendStrength = this.normalizeADX(latestADX);
    const momentumQuality = this.calculateMomentumQuality(data, adxResult);
    
    const type = this.determineRegimeType(
      latestADX,
      latestPlusDI,
      latestMinusDI,
      atrRatio
    );

    return {
      type,
      volatilityLevel,
      trendStrength,
      momentumQuality
    };
  }

  private calculateATR(data: OHLCV[], period: number): number[] {
    const trValues: number[] = [];
    
    for (let i = 0; i < data.length; i++) {
      if (i === 0) {
        trValues.push(data[i].high - data[i].low);
      } else {
        const tr = Math.max(
          data[i].high - data[i].low,
          Math.abs(data[i].high - data[i - 1].close),
          Math.abs(data[i].low - data[i - 1].close)
        );
        trValues.push(tr);
      }
    }

    const atr: number[] = [];
    for (let i = 0; i < trValues.length; i++) {
      if (i < period - 1) {
        atr.push(0);
      } else if (i === period - 1) {
        const sum = trValues.slice(0, period).reduce((a, b) => a + b, 0);
        atr.push(sum / period);
      } else {
        const prevATR = atr[i - 1];
        atr.push((prevATR * (period - 1) + trValues[i]) / period);
      }
    }
    
    return atr;
  }

  private calculateADX(data: OHLCV[], period: number): ADXResult {
    const plusDM: number[] = [];
    const minusDM: number[] = [];
    const trValues: number[] = [];

    for (let i = 0; i < data.length; i++) {
      if (i === 0) {
        plusDM.push(0);
        minusDM.push(0);
        trValues.push(data[i].high - data[i].low);
      } else {
        const upMove = data[i].high - data[i - 1].high;
        const downMove = data[i - 1].low - data[i].low;
        
        plusDM.push(upMove > downMove && upMove > 0 ? upMove : 0);
        minusDM.push(downMove > upMove && downMove > 0 ? downMove : 0);
        
        trValues.push(Math.max(
          data[i].high - data[i].low,
          Math.abs(data[i].high - data[i - 1].close),
          Math.abs(data[i].low - data[i - 1].close)
        ));
      }
    }

    const smoothTR = this.calculateSmoothed(trValues, period);
    const smoothPlusDM = this.calculateSmoothed(plusDM, period);
    const smoothMinusDM = this.calculateSmoothed(minusDM, period);

    const plusDI: number[] = [];
    const minusDI: number[] = [];
    const dx: number[] = [];

    for (let i = 0; i < data.length; i++) {
      const tr = smoothTR[i] || 0;
      const pDM = smoothPlusDM[i] || 0;
      const mDM = smoothMinusDM[i] || 0;

      plusDI.push(tr > 0 ? (pDM / tr) * 100 : 0);
      minusDI.push(tr > 0 ? (mDM / tr) * 100 : 0);

      const diSum = plusDI[i] + minusDI[i];
      dx.push(diSum > 0 ? (Math.abs(plusDI[i] - minusDI[i]) / diSum) * 100 : 0);
    }

    const adx = this.calculateSmoothed(dx, period);

    return { adx, plusDI, minusDI };
  }

  private calculateSmoothed(values: number[], period: number): number[] {
    const result: number[] = [];
    
    for (let i = 0; i < values.length; i++) {
      if (i < period - 1) {
        result.push(0);
      } else if (i === period - 1) {
        const sum = values.slice(0, period).reduce((a, b) => a + b, 0);
        result.push(sum / period);
      } else {
        const prevSmoothed = result[i - 1];
        result.push(prevSmoothed - prevSmoothed / period + values[i]);
      }
    }
    
    return result;
  }

  private calculateATRRatio(data: OHLCV[], atr: number[]): number {
    const atrValues = atr.filter(v => v > 0);
    if (atrValues.length < 2) return 1;

    const recentATR = atrValues[atrValues.length - 1];
    const avgATR = atrValues.reduce((a, b) => a + b, 0) / atrValues.length;
    
    if (avgATR === 0) return 1;
    return recentATR / avgATR;
  }

  private determineVolatilityLevel(atrRatio: number): 'LOW' | 'NORMAL' | 'HIGH' | 'EXTREME' {
    if (atrRatio < 0.7) return 'LOW';
    if (atrRatio < 1.3) return 'NORMAL';
    if (atrRatio < 2.0) return 'HIGH';
    return 'EXTREME';
  }

  private normalizeADX(adx: number): number {
    return Math.min(100, Math.max(0, adx));
  }

  private calculateMomentumQuality(data: OHLCV[], adxResult: ADXResult): number {
    if (data.length < 5) return 50;

    const closes = data.map(d => d.close);
    const returns: number[] = [];
    
    for (let i = 1; i < closes.length; i++) {
      returns.push((closes[i] - closes[i - 1]) / closes[i - 1]);
    }

    const recentReturns = returns.slice(-10);
    const avgReturn = recentReturns.reduce((a, b) => a + b, 0) / recentReturns.length;
    
    const variance = recentReturns.reduce((sum, r) => sum + Math.pow(r - avgReturn, 2), 0) / recentReturns.length;
    const stdDev = Math.sqrt(variance);
    
    const consistency = stdDev > 0 ? Math.min(1, Math.abs(avgReturn) / (stdDev * 2)) : 0;
    
    const latestADX = adxResult.adx[adxResult.adx.length - 1] || 0;
    const adxQuality = Math.min(1, latestADX / 50);
    
    return Math.round((consistency * 0.5 + adxQuality * 0.5) * 100);
  }

  private determineRegimeType(
    adx: number,
    plusDI: number,
    minusDI: number,
    atrRatio: number
  ): 'TRENDING_UP' | 'TRENDING_DOWN' | 'RANGING' | 'VOLATILE' {
    const isTrending = adx > 25;
    const isVolatile = atrRatio > 1.5;

    if (isVolatile && !isTrending) {
      return 'VOLATILE';
    }

    if (isTrending) {
      if (plusDI > minusDI) {
        return 'TRENDING_UP';
      } else {
        return 'TRENDING_DOWN';
      }
    }

    return 'RANGING';
  }
}
