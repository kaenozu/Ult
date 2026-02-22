/**
 * Mean Reversion Strategy
 */

import type { OHLCV } from '@/app/types';
import type { StrategySignal, MeanReversionStrategyParams, StrategyParameterValue } from './types';
import { BaseStrategy } from './BaseStrategy';

export class MeanReversionStrategy extends BaseStrategy {
  constructor(params: Partial<MeanReversionStrategyParams> = {}) {
    super({
      name: 'Mean Reversion Strategy',
      type: 'mean_reversion',
      description: 'Mean reversion strategy using Bollinger Bands and RSI',
      parameters: {
        bollingerPeriod: 20,
        bollingerStdDev: 2,
        rsiPeriod: 14,
        rsiOversold: 30,
        rsiOverbought: 70,
        ...params
      },
      enabled: true
    });
  }

  async initialize(data: OHLCV[]): Promise<void> {
    this.indicators = await this.calculateIndicators(data);
  }

  async calculateIndicators(data: OHLCV[]): Promise<Record<string, number[]>> {
    const closes = data.map(d => d.close);
    const period = this.config.parameters.bollingerPeriod as number;
    const stdDev = this.config.parameters.bollingerStdDev as number;
    const rsiPeriod = this.config.parameters.rsiPeriod as number;
    
    const sma = this.calculateSMA(closes, period);
    const rsi = this.calculateRSI(closes, rsiPeriod);
    
    const bbUpper: number[] = [];
    const bbLower: number[] = [];
    
    for (let i = 0; i < closes.length; i++) {
      if (i < period - 1) {
        bbUpper.push(NaN);
        bbLower.push(NaN);
      } else {
        const slice = closes.slice(i - period + 1, i + 1);
        const mean = sma[i];
        const variance = slice.reduce((sum, price) => sum + Math.pow(price - mean, 2), 0) / period;
        const std = Math.sqrt(variance);
        
        bbUpper.push(mean + stdDev * std);
        bbLower.push(mean - stdDev * std);
      }
    }
    
    return { closes, sma, bbUpper, bbLower, rsi };
  }

  async generateSignal(currentData: OHLCV, historicalData: OHLCV[]): Promise<StrategySignal> {
    const indicators = await this.calculateIndicators(historicalData);
    const lastIndex = indicators.closes.length - 1;
    
    const currentPrice = currentData.close;
    const sma = indicators.sma[lastIndex];
    const bbUpper = indicators.bbUpper[lastIndex];
    const bbLower = indicators.bbLower[lastIndex];
    const rsi = indicators.rsi[lastIndex];
    
    const rsiOversold = this.config.parameters.rsiOversold as number;
    const rsiOverbought = this.config.parameters.rsiOverbought as number;
    
    let signal: 'BUY' | 'SELL' | 'HOLD' = 'HOLD';
    let strength = 0;
    let confidence = 0;
    let reason = '';
    
    if (!isNaN(sma) && !isNaN(bbUpper) && !isNaN(bbLower) && !isNaN(rsi)) {
      if (currentPrice < bbLower && rsi < rsiOversold) {
        signal = 'BUY';
        const bbDeviation = (bbLower - currentPrice) / bbLower;
        const rsiDeviation = (rsiOversold - rsi) / rsiOversold;
        strength = Math.min(1, (bbDeviation + rsiDeviation) / 2);
        confidence = 0.75 + strength * 0.15;
        reason = `Price ${((bbDeviation) * 100).toFixed(1)}% below lower BB, RSI oversold at ${rsi.toFixed(1)}`;
      }
      else if (currentPrice > bbUpper && rsi > rsiOverbought) {
        signal = 'SELL';
        const bbDeviation = (currentPrice - bbUpper) / bbUpper;
        const rsiDeviation = (rsi - rsiOverbought) / rsiOverbought;
        strength = Math.min(1, (bbDeviation + rsiDeviation) / 2);
        confidence = 0.75 + strength * 0.15;
        reason = `Price ${(bbDeviation * 100).toFixed(1)}% above upper BB, RSI overbought at ${rsi.toFixed(1)}`;
      }
      else if (Math.abs(currentPrice - sma) / sma < 0.005) {
        signal = 'SELL';
        strength = 0.5;
        confidence = 0.6;
        reason = 'Price reverted to mean';
      }
    }
    
    return {
      timestamp: currentData.date,
      signal,
      strength,
      confidence,
      reason
    };
  }

  protected randomizeParameters(originalParams: Record<string, StrategyParameterValue>): Record<string, StrategyParameterValue> {
    return {
      bollingerPeriod: Math.floor(15 + Math.random() * 15),
      bollingerStdDev: 1.5 + Math.random() * 1,
      rsiPeriod: Math.floor(10 + Math.random() * 10),
      rsiOversold: 25 + Math.random() * 10,
      rsiOverbought: 65 + Math.random() * 10
    };
  }
}
