/**
 * WinningStrategyEngine.ts
 * 
 * Includes core logic for individual trading strategies.
 */

import { OHLCV } from '@/app/types';
import { StrategyResult, StrategyType, StrategyConfig } from '../strategy/types';
import { technicalIndicatorService } from '../TechnicalIndicatorService';
import { marketRegimeDetector } from '../MarketRegimeDetector';
import { calculateATR, calculateADX } from '../utils/technical-analysis';

export const DEFAULT_STRATEGY_CONFIG: StrategyConfig = {
  name: 'Default',
  type: 'momentum',
  description: 'Default Strategy',
  parameters: {
    rsiOverbought: 70,
    rsiOversold: 30,
    rsiPeriod: 14,
    macdFast: 12,
    macdSlow: 26,
    macdSignal: 9,
    smaShortPeriod: 20,
    smaMediumPeriod: 50,
    smaLongPeriod: 200,
    bbPeriod: 20,
    bbStdDev: 2,
    atrPeriod: 14,
    atrMultiplier: 2,
    volumeThreshold: 1.5,
    adxPeriod: 14,
    adxTrendingThreshold: 25,
    maxRiskPerTrade: 2,
    minRiskRewardRatio: 2,
    maxPositionSize: 20,
  },
  enabled: true,
};

export type { StrategyResult, StrategyType, StrategyConfig };

export class WinningStrategyEngine {
  private config: StrategyConfig;

  constructor(config: Partial<StrategyConfig> = {}) {
    this.config = { ...DEFAULT_STRATEGY_CONFIG, ...config };
  }

  /**
   * Execute adaptive strategy based on market regime
   */
  executeAdaptiveStrategy(data: OHLCV[], symbol: string, capital: number = 100000): StrategyResult {
    const regime = marketRegimeDetector.detect(data);
    let result: StrategyResult;
    
    if (regime.regime === 'TRENDING' && regime.trendDirection === 'UP') {
        result = this.executeTrendFollowingStrategy(data, 'LONG', capital);
    } else if (regime.regime === 'TRENDING' && regime.trendDirection === 'DOWN') {
        result = this.executeTrendFollowingStrategy(data, 'SHORT', capital);
    } else if (regime.regime === 'RANGING') {
        result = this.executeMeanReversionStrategy(data, capital);
        if (result.confidence > 50) result.confidence = Math.round(result.confidence * 0.7);
    } else {
        result = this.executeCompositeStrategy(data, capital);
    }
    
    // Apply signal restrictions and multiplier adjustments from regime
    if (regime.signalRestriction === 'BUY_ONLY' && result.signal === 'SELL') result.signal = 'HOLD';
    if (regime.signalRestriction === 'SELL_ONLY' && result.signal === 'BUY') result.signal = 'HOLD';
    
    if (result.signal !== 'HOLD') {
      const strengthMultiplier = marketRegimeDetector.getSignalStrengthMultiplier(regime, result.signal);
      result.confidence = Math.round(result.confidence * strengthMultiplier);
    }
    
    result.strategy = 'ADAPTIVE';
    result.reasoning = `[${regime.regime}] ${result.reasoning}`;
    return result;
  }

  /**
   * Trend Following Strategy
   */
  executeTrendFollowingStrategy(data: OHLCV[], forcedDirection?: 'LONG' | 'SHORT', capital: number = 100000): StrategyResult {
    const indicators = this.calculateAllIndicators(data);
    const latest = data[data.length - 1];
    
    const isUptrend = indicators.sma20 > indicators.sma50 && latest.close > indicators.sma20;
    const isDowntrend = indicators.sma20 < indicators.sma50 && latest.close < indicators.sma20;
    const strongTrend = indicators.adx > (this.config.parameters.adxTrendingThreshold as number);
    
    let signal: 'BUY' | 'SELL' | 'HOLD' = 'HOLD';
    if (forcedDirection === 'LONG' || (isUptrend && strongTrend)) signal = 'BUY';
    else if (forcedDirection === 'SHORT' || (isDowntrend && strongTrend)) signal = 'SELL';
    
    return this.buildStrategyResult(signal, 75, latest, indicators, 'TREND_FOLLOWING', `Trend: ${signal}`, capital);
  }

  /**
   * Mean Reversion Strategy
   */
  executeMeanReversionStrategy(data: OHLCV[], capital: number = 100000): StrategyResult {
    const indicators = this.calculateAllIndicators(data);
    const latest = data[data.length - 1];
    
    const rsiOversold = indicators.rsi < (this.config.parameters.rsiOversold as number);
    const bbOversold = latest.close < indicators.bbLower;
    
    let signal: 'BUY' | 'SELL' | 'HOLD' = 'HOLD';
    if (rsiOversold && bbOversold) signal = 'BUY';
    else if (indicators.rsi > (this.config.parameters.rsiOverbought as number) && latest.close > indicators.bbUpper) signal = 'SELL';
    
    return this.buildStrategyResult(signal, 70, latest, indicators, 'MEAN_REVERSION', `Reversion: ${signal}`, capital);
  }

  /**
   * Composite Strategy
   */
  executeCompositeStrategy(data: OHLCV[], capital: number = 100000): StrategyResult {
    const trend = this.executeTrendFollowingStrategy(data, undefined, capital);
    const meanRev = this.executeMeanReversionStrategy(data, capital);
    
    const finalSignal = trend.signal === meanRev.signal ? trend.signal : 'HOLD';
    return { ...trend, signal: finalSignal, strategy: 'COMPOSITE', confidence: 60 };
  }

  /**
   * Main entry for specific strategy execution
   */
  executeStrategy(type: StrategyType, data: OHLCV[], capital: number = 100000): StrategyResult {
    switch (type) {
      case 'TREND_FOLLOWING': return this.executeTrendFollowingStrategy(data, undefined, capital);
      case 'MEAN_REVERSION': return this.executeMeanReversionStrategy(data, capital);
      case 'ADAPTIVE': return this.executeAdaptiveStrategy(data, '', capital);
      default: return this.executeCompositeStrategy(data, capital);
    }
  }

  private calculateAllIndicators(data: OHLCV[]): StrategyResult['indicators'] {
    const closes = data.map(d => d.close);
    const latest = data[data.length - 1];
    
    const rsi = technicalIndicatorService.calculateRSI(closes, this.config.parameters.rsiPeriod as number);
    const macd = technicalIndicatorService.calculateMACD(closes, this.config.parameters.macdFast as number, this.config.parameters.macdSlow as number, this.config.parameters.macdSignal as number);
    const sma20 = technicalIndicatorService.calculateSMA(closes, this.config.parameters.smaShortPeriod as number);
    const sma50 = technicalIndicatorService.calculateSMA(closes, this.config.parameters.smaMediumPeriod as number);
    const bb = technicalIndicatorService.calculateBollingerBands(closes, this.config.parameters.bbPeriod as number, this.config.parameters.bbStdDev as number);
    const atr = calculateATR(data, this.config.parameters.atrPeriod as number);
    const adx = calculateADX(data, this.config.parameters.adxPeriod as number);
    
    return {
      rsi: rsi[rsi.length - 1] || 50,
      macd: macd.macd[macd.macd.length - 1] || 0,
      sma20: sma20[sma20.length - 1] || latest.close,
      sma50: sma50[sma50.length - 1] || latest.close,
      bbUpper: bb.upper[bb.upper.length - 1] || latest.close * 1.02,
      bbLower: bb.lower[bb.lower.length - 1] || latest.close * 0.98,
      atr: atr[atr.length - 1] || latest.close * 0.02,
      adx: adx[adx.length - 1] || 20,
    };
  }

  private buildStrategyResult(
    signal: 'BUY' | 'SELL' | 'HOLD', 
    confidence: number, 
    latest: OHLCV, 
    indicators: StrategyResult['indicators'], 
    strategy: StrategyType, 
    reasoning: string, 
    capital: number
  ): StrategyResult {
    const atr = indicators.atr;
    const stopLoss = signal === 'BUY' ? latest.close - atr * 2 : latest.close + atr * 2;
    const takeProfit = signal === 'BUY' ? latest.close + atr * 4 : latest.close - atr * 4;
    
    return {
      signal, confidence, entryPrice: latest.close, stopLoss, takeProfit,
      positionSize: 10, riskRewardRatio: 2, strategy, reasoning, indicators,
      metadata: { trendStrength: indicators.adx, volatility: atr / latest.close, volumeConfirmation: true }
    };
  }
}

export const winningStrategyEngine = new WinningStrategyEngine();
export default WinningStrategyEngine;