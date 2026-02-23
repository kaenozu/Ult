/**
 * Statistical Arbitrage Strategy (Simplified Pairs Trading)
 */

import type { OHLCV } from '@/app/types';
import type { StrategySignal, StatArbStrategyParams, StrategyParameterValue } from './types';
import { isString } from './types';
import { BaseStrategy } from './BaseStrategy';

export class StatArbStrategy extends BaseStrategy {
  constructor(params: Partial<StatArbStrategyParams> = {}) {
    super({
      name: 'Statistical Arbitrage Strategy',
      type: 'stat_arb',
      description: 'Statistical arbitrage based on mean reversion of spread',
      parameters: {
        pairSymbol: 'SPY',
        lookbackPeriod: 30,
        entryZScore: 2.0,
        exitZScore: 0.5,
        hedgeRatio: 1.0,
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
    const period = this.config.parameters.lookbackPeriod as number;
    const hedgeRatio = this.config.parameters.hedgeRatio as number;
    
    const pairPrices = closes.map(c => c * (0.95 + Math.random() * 0.1));
    
    const spread: number[] = [];
    for (let i = 0; i < closes.length; i++) {
      spread.push(closes[i] - hedgeRatio * pairPrices[i]);
    }
    
    const zScore: number[] = [];
    for (let i = 0; i < spread.length; i++) {
      if (i < period) {
        zScore.push(NaN);
      } else {
        const recentSpread = spread.slice(i - period, i + 1);
        const mean = recentSpread.reduce((sum, s) => sum + s, 0) / recentSpread.length;
        const variance = recentSpread.reduce((sum, s) => sum + Math.pow(s - mean, 2), 0) / recentSpread.length;
        const std = Math.sqrt(variance);
        
        if (std === 0) {
          zScore.push(0);
        } else {
          zScore.push((spread[i] - mean) / std);
        }
      }
    }
    
    return { closes, pairPrices, spread, zScore };
  }

  async generateSignal(currentData: OHLCV, historicalData: OHLCV[]): Promise<StrategySignal> {
    const indicators = await this.calculateIndicators(historicalData);
    const lastIndex = indicators.closes.length - 1;
    
    const zScore = indicators.zScore[lastIndex];
    const entryZScore = this.config.parameters.entryZScore as number;
    const exitZScore = this.config.parameters.exitZScore as number;
    
    let signal: 'BUY' | 'SELL' | 'HOLD' = 'HOLD';
    let strength = 0;
    let confidence = 0;
    let reason = '';
    
    if (!isNaN(zScore)) {
      if (zScore < -entryZScore) {
        signal = 'BUY';
        strength = Math.min(1, Math.abs(zScore) / (entryZScore * 2));
        confidence = 0.75;
        reason = `Spread z-score ${zScore.toFixed(2)} below -${entryZScore}, mean reversion expected`;
      }
      else if (zScore > entryZScore) {
        signal = 'SELL';
        strength = Math.min(1, zScore / (entryZScore * 2));
        confidence = 0.75;
        reason = `Spread z-score ${zScore.toFixed(2)} above ${entryZScore}, mean reversion expected`;
      }
      else if (Math.abs(zScore) < exitZScore) {
        signal = 'SELL';
        strength = 0.5;
        confidence = 0.7;
        reason = `Spread normalized (z-score ${zScore.toFixed(2)}), taking profit`;
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
    const pairSymbol = isString(originalParams.pairSymbol) 
      ? originalParams.pairSymbol 
      : 'SPY';
    return {
      pairSymbol,
      lookbackPeriod: Math.floor(20 + Math.random() * 40),
      entryZScore: 1.5 + Math.random() * 1.0,
      exitZScore: 0.3 + Math.random() * 0.5,
      hedgeRatio: 0.8 + Math.random() * 0.4
    };
  }
}
