/**
 * Momentum Strategy (Trend Following)
 */

import type { OHLCV } from '@/app/types';
import type { StrategySignal, MomentumStrategyParams, StrategyParameterValue } from './types';
import { BaseStrategy } from './BaseStrategy';

export class MomentumStrategy extends BaseStrategy {
  constructor(params: Partial<MomentumStrategyParams> = {}) {
    super({
      name: 'Momentum Strategy',
      type: 'momentum',
      description: 'Trend-following strategy using momentum indicators',
      parameters: {
        lookbackPeriod: 20,
        momentumThreshold: 0.02,
        exitThreshold: 0.01,
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
    const lookback = this.config.parameters.lookbackPeriod as number;
    
    const sma20 = this.calculateSMA(closes, 20);
    const sma50 = this.calculateSMA(closes, 50);
    const ema12 = this.calculateEMA(closes, 12);
    const rsi = this.calculateRSI(closes, 14);
    
    const momentum: number[] = [];
    for (let i = 0; i < closes.length; i++) {
      if (i < lookback) {
        momentum.push(NaN);
      } else {
        const change = (closes[i] - closes[i - lookback]) / closes[i - lookback];
        momentum.push(change);
      }
    }
    
    return { sma20, sma50, ema12, rsi, momentum, closes };
  }

  async generateSignal(currentData: OHLCV, historicalData: OHLCV[]): Promise<StrategySignal> {
    const indicators = await this.calculateIndicators(historicalData);
    const lastIndex = indicators.closes.length - 1;
    
    const currentPrice = currentData.close;
    const sma20 = indicators.sma20[lastIndex];
    const sma50 = indicators.sma50[lastIndex];
    const momentum = indicators.momentum[lastIndex];
    const rsi = indicators.rsi[lastIndex];
    
    const momentumThreshold = this.config.parameters.momentumThreshold as number;
    const exitThreshold = this.config.parameters.exitThreshold as number;
    
    let signal: 'BUY' | 'SELL' | 'HOLD' = 'HOLD';
    let strength = 0;
    let confidence = 0;
    let reason = '';
    
    if (!isNaN(momentum) && !isNaN(sma20) && !isNaN(sma50) && !isNaN(rsi)) {
      if (momentum > momentumThreshold && currentPrice > sma20 && sma20 > sma50 && rsi < 70) {
        signal = 'BUY';
        strength = Math.min(1, momentum / (momentumThreshold * 2));
        confidence = 0.7 + (Math.min(momentum, 0.1) / 0.1) * 0.2;
        reason = `Strong upward momentum (${(momentum * 100).toFixed(1)}%), bullish trend`;
      }
      else if (momentum < -exitThreshold || (currentPrice < sma20 && sma20 < sma50)) {
        signal = 'SELL';
        strength = Math.min(1, Math.abs(momentum) / (exitThreshold * 2));
        confidence = 0.6;
        reason = momentum < -exitThreshold 
          ? `Negative momentum (${(momentum * 100).toFixed(1)}%)`
          : 'Price below moving averages, trend weakening';
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
      lookbackPeriod: Math.floor(10 + Math.random() * 40),
      momentumThreshold: 0.01 + Math.random() * 0.04,
      exitThreshold: 0.005 + Math.random() * 0.02
    };
  }
}
