/**
 * ML-Based Alpha Strategy (Simplified)
 */

import type { OHLCV } from '@/app/types';
import type { StrategySignal, MLAlphaStrategyParams, StrategyParameterValue } from './types';
import { isString, isStringArray } from './types';
import { BaseStrategy } from './BaseStrategy';

export class MLAlphaStrategy extends BaseStrategy {
  constructor(params: Partial<MLAlphaStrategyParams> = {}) {
    super({
      name: 'ML-Based Alpha Strategy',
      type: 'ml_alpha',
      description: 'Machine learning-based alpha generation',
      parameters: {
        model: 'gradient_boosting',
        features: ['price_momentum', 'volume_trend', 'volatility', 'rsi', 'macd'],
        lookbackPeriod: 30,
        retrainFrequency: 30,
        predictionThreshold: 0.6,
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
    const lookback = this.config.parameters.lookbackPeriod as number;
    
    const priceMomentum: number[] = [];
    const volumeTrend: number[] = [];
    const volatility: number[] = [];
    
    for (let i = 0; i < closes.length; i++) {
      if (i < lookback) {
        priceMomentum.push(NaN);
        volumeTrend.push(NaN);
        volatility.push(NaN);
      } else {
        const priceChange = (closes[i] - closes[i - lookback]) / closes[i - lookback];
        priceMomentum.push(priceChange);
        
        const recentVolume = volumes.slice(i - lookback, i + 1);
        const volumeChange = (volumes[i] - recentVolume.reduce((sum, v) => sum + v, 0) / recentVolume.length) / volumes[i];
        volumeTrend.push(volumeChange);
        
        const returns = [];
        for (let j = i - lookback + 1; j <= i; j++) {
          returns.push((closes[j] - closes[j - 1]) / closes[j - 1]);
        }
        const mean = returns.reduce((sum, r) => sum + r, 0) / returns.length;
        const variance = returns.reduce((sum, r) => sum + Math.pow(r - mean, 2), 0) / returns.length;
        volatility.push(Math.sqrt(variance));
      }
    }
    
    const rsi = this.calculateRSI(closes, 14);
    
    return { closes, priceMomentum, volumeTrend, volatility, rsi };
  }

  async generateSignal(currentData: OHLCV, historicalData: OHLCV[]): Promise<StrategySignal> {
    const indicators = await this.calculateIndicators(historicalData);
    const lastIndex = indicators.closes.length - 1;
    
    const priceMomentum = indicators.priceMomentum[lastIndex];
    const volumeTrend = indicators.volumeTrend[lastIndex];
    const volatility = indicators.volatility[lastIndex];
    const rsi = indicators.rsi[lastIndex];
    const predictionThreshold = this.config.parameters.predictionThreshold as number;
    
    let signal: 'BUY' | 'SELL' | 'HOLD' = 'HOLD';
    let strength = 0;
    let confidence = 0;
    let reason = '';
    
    if (!isNaN(priceMomentum) && !isNaN(volumeTrend) && !isNaN(volatility) && !isNaN(rsi)) {
      const prediction = 
        0.4 * Math.tanh(priceMomentum * 10) +
        0.2 * Math.tanh(volumeTrend * 10) +
        0.2 * (50 - rsi) / 50 +
        0.2 * (1 - Math.min(volatility * 100, 1));
      
      if (prediction > predictionThreshold) {
        signal = 'BUY';
        strength = Math.min(1, (prediction - predictionThreshold) / (1 - predictionThreshold));
        confidence = 0.65 + strength * 0.15;
        reason = `ML prediction: ${(prediction * 100).toFixed(1)}% bullish (momentum: ${(priceMomentum * 100).toFixed(1)}%)`;
      } else if (prediction < -predictionThreshold) {
        signal = 'SELL';
        strength = Math.min(1, (Math.abs(prediction) - predictionThreshold) / (1 - predictionThreshold));
        confidence = 0.65 + strength * 0.15;
        reason = `ML prediction: ${(prediction * 100).toFixed(1)}% bearish (momentum: ${(priceMomentum * 100).toFixed(1)}%)`;
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
    const model = isString(originalParams.model) 
      ? originalParams.model 
      : 'gradient_boosting';
    const features = isStringArray(originalParams.features)
      ? originalParams.features
      : ['price_momentum', 'volume_trend', 'volatility', 'rsi', 'macd'];
    return {
      model,
      features,
      lookbackPeriod: Math.floor(20 + Math.random() * 30),
      retrainFrequency: Math.floor(20 + Math.random() * 40),
      predictionThreshold: 0.5 + Math.random() * 0.3
    };
  }
}
