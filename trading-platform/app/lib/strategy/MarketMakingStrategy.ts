/**
 * Market Making Strategy (Simplified)
 */

import type { OHLCV } from '@/app/types';
import type { StrategySignal, MarketMakingStrategyParams, StrategyParameterValue } from './types';
import { BaseStrategy } from './BaseStrategy';

export class MarketMakingStrategy extends BaseStrategy {
  constructor(params: Partial<MarketMakingStrategyParams> = {}) {
    super({
      name: 'Market Making Strategy',
      type: 'market_making',
      description: 'Provides liquidity by quoting bid-ask spreads',
      parameters: {
        spreadBps: 10,
        inventoryLimit: 1000,
        skewFactor: 0.1,
        minOrderSize: 100,
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
    const volumes = data.map(d => d.volume);
    
    const volatility = this.calculateRollingVolatility(closes, 20);
    const avgVolume = this.calculateSMA(volumes, 20);
    
    return { closes, volumes, volatility, avgVolume };
  }

  private calculateRollingVolatility(prices: number[], period: number): number[] {
    const volatility: number[] = [];
    
    for (let i = 0; i < prices.length; i++) {
      if (i < period) {
        volatility.push(NaN);
      } else {
        const returns = [];
        for (let j = i - period + 1; j <= i; j++) {
          returns.push((prices[j] - prices[j - 1]) / prices[j - 1]);
        }
        const mean = returns.reduce((sum, r) => sum + r, 0) / returns.length;
        const variance = returns.reduce((sum, r) => sum + Math.pow(r - mean, 2), 0) / returns.length;
        volatility.push(Math.sqrt(variance));
      }
    }
    
    return volatility;
  }

  async generateSignal(currentData: OHLCV, historicalData: OHLCV[]): Promise<StrategySignal> {
    const indicators = await this.calculateIndicators(historicalData);
    const lastIndex = indicators.closes.length - 1;
    
    const currentPrice = currentData.close;
    const volatility = indicators.volatility[lastIndex];
    const spreadBps = this.config.parameters.spreadBps as number;
    const skewFactor = this.config.parameters.skewFactor as number;
    
    let signal: 'BUY' | 'SELL' | 'HOLD' = 'HOLD';
    const strength = 0.5;
    const confidence = 0.6;
    let reason = '';
    
    if (!isNaN(volatility)) {
      const adjustedSpread = spreadBps * (1 + volatility * 10);
      const bidPrice = currentPrice * (1 - adjustedSpread / 10000);
      const askPrice = currentPrice * (1 + adjustedSpread / 10000);
      
      const shouldBuy = Math.random() > 0.5;
      
      if (shouldBuy) {
        signal = 'BUY';
        reason = `Market making: bid at ${bidPrice.toFixed(2)} (spread: ${adjustedSpread.toFixed(1)}bps)`;
      } else {
        signal = 'SELL';
        reason = `Market making: ask at ${askPrice.toFixed(2)} (spread: ${adjustedSpread.toFixed(1)}bps)`;
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
      spreadBps: 5 + Math.random() * 15,
      inventoryLimit: 500 + Math.random() * 1000,
      skewFactor: 0.05 + Math.random() * 0.15,
      minOrderSize: 50 + Math.random() * 100
    };
  }
}
