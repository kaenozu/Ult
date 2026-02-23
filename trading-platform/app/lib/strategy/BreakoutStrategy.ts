/**
 * Breakout Strategy
 */

import type { OHLCV } from '@/app/types';
import type { StrategySignal, BreakoutStrategyParams, StrategyParameterValue } from './types';
import { BaseStrategy } from './BaseStrategy';

export class BreakoutStrategy extends BaseStrategy {
  constructor(params: Partial<BreakoutStrategyParams> = {}) {
    super({
      name: 'Breakout Strategy',
      type: 'breakout',
      description: 'Breakout strategy using price action and volume',
      parameters: {
        breakoutPeriod: 20,
        volumeConfirmation: true,
        volumeThreshold: 1.5,
        atrMultiplier: 2.0,
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
    const highs = data.map(d => d.high);
    const lows = data.map(d => d.low);
    const volumes = data.map(d => d.volume);
    const period = this.config.parameters.breakoutPeriod as number;
    
    const atr = this.calculateATR(data, 14);
    const avgVolume = this.calculateSMA(volumes, period);
    
    const resistance: number[] = [];
    const support: number[] = [];
    
    for (let i = 0; i < data.length; i++) {
      if (i < period) {
        resistance.push(NaN);
        support.push(NaN);
      } else {
        const recentHighs = highs.slice(i - period, i);
        const recentLows = lows.slice(i - period, i);
        resistance.push(Math.max(...recentHighs));
        support.push(Math.min(...recentLows));
      }
    }
    
    return { closes, highs, lows, volumes, atr, avgVolume, resistance, support };
  }

  async generateSignal(currentData: OHLCV, historicalData: OHLCV[]): Promise<StrategySignal> {
    const indicators = await this.calculateIndicators(historicalData);
    const lastIndex = indicators.closes.length - 1;
    
    const currentPrice = currentData.close;
    const currentVolume = currentData.volume;
    const resistance = indicators.resistance[lastIndex];
    const support = indicators.support[lastIndex];
    const atr = indicators.atr[lastIndex];
    const avgVolume = indicators.avgVolume[lastIndex];
    
    const volumeConfirmation = this.config.parameters.volumeConfirmation as boolean;
    const volumeThreshold = this.config.parameters.volumeThreshold as number;
    
    let signal: 'BUY' | 'SELL' | 'HOLD' = 'HOLD';
    let strength = 0;
    let confidence = 0;
    let reason = '';
    
    if (!isNaN(resistance) && !isNaN(support) && !isNaN(atr)) {
      const volumeConfirmed = !volumeConfirmation || 
        (currentVolume > avgVolume * volumeThreshold);
      
      if (currentPrice > resistance && volumeConfirmed) {
        const breakoutStrength = (currentPrice - resistance) / atr;
        signal = 'BUY';
        strength = Math.min(1, breakoutStrength);
        confidence = volumeConfirmed ? 0.8 : 0.6;
        reason = `Upward breakout above resistance ${resistance.toFixed(2)}${volumeConfirmed ? ' with volume confirmation' : ''}`;
      }
      else if (currentPrice < support && volumeConfirmed) {
        const breakoutStrength = (support - currentPrice) / atr;
        signal = 'SELL';
        strength = Math.min(1, breakoutStrength);
        confidence = volumeConfirmed ? 0.8 : 0.6;
        reason = `Downward breakout below support ${support.toFixed(2)}${volumeConfirmed ? ' with volume confirmation' : ''}`;
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
      breakoutPeriod: Math.floor(10 + Math.random() * 30),
      volumeConfirmation: Math.random() > 0.3,
      volumeThreshold: 1.2 + Math.random() * 0.8,
      atrMultiplier: 1.5 + Math.random() * 1.0
    };
  }
}
