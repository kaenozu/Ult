/**
 * Multiple Trading Strategies Service
 * 
 * このモジュールは、複数の取引戦略（ムーメメント、均値回帰、ブレイクアウトなど）を実装する機能を提供します。
 */

import { OHLCV } from '@/app/types';

export interface StrategyInput {
  symbol: string;
  priceData: OHLCV[];
  indicators: {
    rsi: number[];
    sma: number[];
    bollinger: { upper: number[]; middle: number[]; lower: number[] };
    atr: number[];
  };
  marketContext?: {
    economicIndicators?: Record<string, number>;
    sentiment?: {
      fearGreedIndex?: number;
      vix?: number;
      putCallRatio?: number;
    };
    marketRegime?: 'bull' | 'bear' | 'neutral';
    correlationData?: Record<string, number>;
  }; // 市場コンテキスト（経済指標、センチメントなど）
}

export interface StrategyOutput {
  signal: 'BUY' | 'SELL' | 'HOLD';
  confidence: number;
  targetPrice: number;
  stopLoss: number;
  timeHorizon: 'short' | 'medium' | 'long';
  strategy: string;
  reasoning: string;
}

export interface StrategyConfig {
  rsiOverbought: number;
  rsiOversold: number;
  smaPeriod: number;
  bollingerStdDev: number;
  atrMultiplier: number;
  volumeThreshold: number;
}

class MultipleTradingStrategiesService {
  private defaultConfig: StrategyConfig = {
    rsiOverbought: 70,
    rsiOversold: 30,
    smaPeriod: 20,
    bollingerStdDev: 2,
    atrMultiplier: 2,
    volumeThreshold: 1.5 // 平均出来高の1.5倍以上
  };

  /**
   * ムーメメント戦略を実行
   */
  executeMomentumStrategy(input: StrategyInput, config?: StrategyConfig): StrategyOutput {
    const cfg = { ...this.defaultConfig, ...config };
    const { priceData, indicators } = input;
    
    if (priceData.length < 2) {
      return {
        signal: 'HOLD',
        confidence: 0,
        targetPrice: priceData[priceData.length - 1].close,
        stopLoss: priceData[priceData.length - 1].close,
        timeHorizon: 'short',
        strategy: 'Momentum',
        reasoning: 'Insufficient data for momentum analysis'
      };
    }

    const latestCandle = priceData[priceData.length - 1];
    const prevCandle = priceData[priceData.length - 2];
    
    // 価格モメンタムを確認
    const priceMomentum = (latestCandle.close - prevCandle.close) / prevCandle.close;
    const volumeMomentum = latestCandle.volume > (this.calculateAverageVolume(priceData) * cfg.volumeThreshold);
    
    // RSIが上昇トレンドにあるか
    const latestRSI = indicators.rsi[indicators.rsi.length - 1];
    const prevRSI = indicators.rsi[indicators.rsi.length - 2];
    const rsiMomentum = latestRSI > prevRSI;
    
    // SMAとの関係
    const aboveSMA = latestCandle.close > indicators.sma[indicators.sma.length - 1];
    
    let signal: 'BUY' | 'SELL' | 'HOLD' = 'HOLD';
    let confidence = 0;
    let reasoning = '';

    if (priceMomentum > 0.02 && volumeMomentum && rsiMomentum && aboveSMA) {
      // 強い上昇モメンタム
      signal = 'BUY';
      confidence = Math.min(95, 70 + (priceMomentum * 100) + (volumeMomentum ? 10 : 0));
      reasoning = 'Strong upward momentum confirmed by price, volume, RSI and SMA';
    } else if (priceMomentum < -0.02 && volumeMomentum && !rsiMomentum && !aboveSMA) {
      // 強い下降モメンタム
      signal = 'SELL';
      confidence = Math.min(95, 70 + Math.abs(priceMomentum * 100) + (volumeMomentum ? 10 : 0));
      reasoning = 'Strong downward momentum confirmed by price, volume, RSI and SMA';
    } else if (Math.abs(priceMomentum) < 0.01) {
      // モメントが弱い
      signal = 'HOLD';
      confidence = 30;
      reasoning = 'Weak momentum, insufficient directional confirmation';
    } else {
      // 中程度のモメンタム
      signal = priceMomentum > 0 ? 'BUY' : 'SELL';
      confidence = Math.max(40, 50 + (Math.abs(priceMomentum) * 50));
      reasoning = 'Moderate momentum with directional bias';
    }

    // タージェット価格とストップロスを計算
    const atr = indicators.atr[indicators.atr.length - 1];
    const targetPrice = signal === 'BUY' 
      ? latestCandle.close * (1 + Math.abs(priceMomentum) * 2)
      : latestCandle.close * (1 - Math.abs(priceMomentum) * 2);
    const stopLoss = signal === 'BUY'
      ? latestCandle.close - (atr * cfg.atrMultiplier)
      : latestCandle.close + (atr * cfg.atrMultiplier);

    return {
      signal,
      confidence,
      targetPrice,
      stopLoss,
      timeHorizon: 'short',
      strategy: 'Momentum',
      reasoning
    };
  }

  /**
   * 均値回帰戦略を実行
   */
  executeMeanReversionStrategy(input: StrategyInput, config?: StrategyConfig): StrategyOutput {
    const cfg = { ...this.defaultConfig, ...config };
    const { priceData, indicators } = input;
    
    if (priceData.length < cfg.smaPeriod) {
      return {
        signal: 'HOLD',
        confidence: 0,
        targetPrice: priceData[priceData.length - 1].close,
        stopLoss: priceData[priceData.length - 1].close,
        timeHorizon: 'short',
        strategy: 'MeanReversion',
        reasoning: 'Insufficient data for mean reversion analysis'
      };
    }

    const latestCandle = priceData[priceData.length - 1];
    const sma = indicators.sma[indicators.sma.length - 1];
    const rsi = indicators.rsi[indicators.rsi.length - 1];
    const bb = indicators.bollinger;
    const upperBand = bb.upper[bb.upper.length - 1];
    const middleBand = bb.middle[bb.middle.length - 1];

    let signal: 'BUY' | 'SELL' | 'HOLD' = 'HOLD';
    let confidence = 0;
    let reasoning = '';

    // ボリンジャーバンドでの位置
    const bbPosition = (latestCandle.close - middleBand) / (upperBand - middleBand);

    if (rsi < cfg.rsiOversold && bbPosition < 0.1) {
      // RSIとBBで超売状態
      signal = 'BUY';
      confidence = Math.min(90, 60 + (cfg.rsiOversold - rsi) * 2 + (0.1 - bbPosition) * 100);
      reasoning = 'Oversold conditions confirmed by RSI and Bollinger Bands';
    } else if (rsi > cfg.rsiOverbought && bbPosition > 0.9) {
      // RSIとBBで超買状態
      signal = 'SELL';
      confidence = Math.min(90, 60 + (rsi - cfg.rsiOverbought) * 2 + (bbPosition - 0.9) * 100);
      reasoning = 'Overbought conditions confirmed by RSI and Bollinger Bands';
    } else if (latestCandle.close < sma * 0.95 && rsi < 50) {
      // 5%以上SMAを下回り、RSIが50以下
      signal = 'BUY';
      confidence = Math.min(80, 50 + (sma - latestCandle.close) / sma * 100 + (50 - rsi));
      reasoning = 'Significant undervaluation below SMA with bearish RSI';
    } else if (latestCandle.close > sma * 1.05 && rsi > 50) {
      // 5%以上SMAを上回り、RSIが50以上
      signal = 'SELL';
      confidence = Math.min(80, 50 + (latestCandle.close - sma) / sma * 100 + (rsi - 50));
      reasoning = 'Significant overvaluation above SMA with bullish RSI';
    } else {
      signal = 'HOLD';
      confidence = 25;
      reasoning = 'Price near fair value, no clear mean reversion signal';
    }

    // タージェット価格とストップロスを計算
    const atr = indicators.atr[indicators.atr.length - 1];
    const targetPrice = signal === 'BUY' 
      ? Math.min(middleBand, latestCandle.close * 1.05) // 均価への回帰
      : Math.max(middleBand, latestCandle.close * 0.95);
    const stopLoss = signal === 'BUY'
      ? latestCandle.close - (atr * cfg.atrMultiplier * 1.5) // 均値回帰はリスクが高いのでマージンを広く
      : latestCandle.close + (atr * cfg.atrMultiplier * 1.5);

    return {
      signal,
      confidence,
      targetPrice,
      stopLoss,
      timeHorizon: 'medium',
      strategy: 'MeanReversion',
      reasoning
    };
  }

  /**
   * ブレイクアウト戦略を実行
   */
  executeBreakoutStrategy(input: StrategyInput, config?: StrategyConfig): StrategyOutput {
    const cfg = { ...this.defaultConfig, ...config };
    const { priceData, indicators } = input;
    
    if (priceData.length < 20) {
      return {
        signal: 'HOLD',
        confidence: 0,
        targetPrice: priceData[priceData.length - 1].close,
        stopLoss: priceData[priceData.length - 1].close,
        timeHorizon: 'short',
        strategy: 'Breakout',
        reasoning: 'Insufficient data for breakout analysis'
      };
    }

    const latestCandle = priceData[priceData.length - 1];
    const bb = indicators.bollinger;
    const upperBand = bb.upper[bb.upper.length - 1];
    const lowerBand = bb.lower[bb.lower.length - 1];

    // 遽20本の高値と安値を取得
    const recentHighs = priceData.slice(-20).map(c => c.high);
    const recentLows = priceData.slice(-20).map(c => c.low);
    const highestHigh = Math.max(...recentHighs);
    const lowestLow = Math.min(...recentLows);

    let signal: 'BUY' | 'SELL' | 'HOLD' = 'HOLD';
    let confidence = 0;
    let reasoning = '';

    // ブレイクアウトの検出
    const volumeSurge = latestCandle.volume > this.calculateAverageVolume(priceData) * cfg.volumeThreshold;
    const closeAboveUpperBB = latestCandle.close > upperBand;
    const closeBelowLowerBB = latestCandle.close < lowerBand;
    const closeAboveRecentHigh = latestCandle.close > highestHigh * 0.995; // 0.5%のマージン
    const closeBelowRecentLow = latestCandle.close < lowestLow * 1.005; // 0.5%のマージン

    if (closeAboveUpperBB && closeAboveRecentHigh && volumeSurge) {
      // 上方ブレイクアウト
      signal = 'BUY';
      confidence = Math.min(95, 70 + (latestCandle.close - upperBand) / upperBand * 100 + (volumeSurge ? 15 : 0));
      reasoning = 'Bullish breakout above resistance confirmed by volume surge';
    } else if (closeBelowLowerBB && closeBelowRecentLow && volumeSurge) {
      // 下方ブレイクアウト
      signal = 'SELL';
      confidence = Math.min(95, 70 + (lowerBand - latestCandle.close) / lowerBand * 100 + (volumeSurge ? 15 : 0));
      reasoning = 'Bearish breakdown below support confirmed by volume surge';
    } else if (closeAboveRecentHigh && !closeAboveUpperBB) {
      // 技値ブレイク（BB外ではないが期間高値を更新）
      signal = 'BUY';
      confidence = Math.min(80, 60 + (latestCandle.close - highestHigh) / highestHigh * 100);
      reasoning = 'New high breakout without Bollinger band confirmation';
    } else if (closeBelowRecentLow && !closeBelowLowerBB) {
      // 安値ブレイク（BB外ではないが期間安値を更新）
      signal = 'SELL';
      confidence = Math.min(80, 60 + (lowestLow - latestCandle.close) / lowestLow * 100);
      reasoning = 'New low breakdown without Bollinger band confirmation';
    } else {
      signal = 'HOLD';
      confidence = 20;
      reasoning = 'No clear breakout pattern detected';
    }

    // タージェット価格とストップロスを計算
    const targetPrice = signal === 'BUY'
      ? latestCandle.close * 1.05 // 5%の利益目標
      : latestCandle.close * 0.95; // 5%の利益目標
    const stopLoss = signal === 'BUY'
      ? lowestLow * 0.99 // 直近の安値の1%下
      : highestHigh * 1.01; // 直近の高値の1%上

    return {
      signal,
      confidence,
      targetPrice,
      stopLoss,
      timeHorizon: 'short',
      strategy: 'Breakout',
      reasoning
    };
  }

  /**
   * 総合戦略を実行（複数戦略の統合）
   */
  executeConsolidatedStrategy(input: StrategyInput, config?: StrategyConfig): StrategyOutput {
    // 各戦略を実行
    const momentumResult = this.executeMomentumStrategy(input, config);
    const meanRevResult = this.executeMeanReversionStrategy(input, config);
    const breakoutResult = this.executeBreakoutStrategy(input, config);

    // 信頼度を統合
    const signals = [momentumResult, meanRevResult, breakoutResult];
    const buySignals = signals.filter(s => s.signal === 'BUY').length;
    const sellSignals = signals.filter(s => s.signal === 'SELL').length;
    const holdSignals = signals.filter(s => s.signal === 'HOLD').length;

    let finalSignal: 'BUY' | 'SELL' | 'HOLD';
    let finalConfidence = 0;
    let reasoning = '';

    if (buySignals > sellSignals && buySignals > holdSignals) {
      finalSignal = 'BUY';
      finalConfidence = signals.filter(s => s.signal === 'BUY').reduce((sum, s) => sum + s.confidence, 0) / buySignals;
      reasoning = `Consensus BUY: ${buySignals} out of 3 strategies agree`;
    } else if (sellSignals > buySignals && sellSignals > holdSignals) {
      finalSignal = 'SELL';
      finalConfidence = signals.filter(s => s.signal === 'SELL').reduce((sum, s) => sum + s.confidence, 0) / sellSignals;
      reasoning = `Consensus SELL: ${sellSignals} out of 3 strategies agree`;
    } else {
      finalSignal = 'HOLD';
      finalConfidence = signals.filter(s => s.signal === 'HOLD').reduce((sum, s) => sum + s.confidence, 0) / holdSignals;
      reasoning = `Consensus HOLD: No clear majority among strategies`;
    }

    // タージェット価格とストップロスはBUY/SELL信号の平均を使用
    const activeSignals = signals.filter(s => s.signal === finalSignal);
    if (activeSignals.length > 0) {
      const avgTarget = activeSignals.reduce((sum, s) => sum + s.targetPrice, 0) / activeSignals.length;
      const avgStopLoss = activeSignals.reduce((sum, s) => sum + s.stopLoss, 0) / activeSignals.length;

      return {
        signal: finalSignal,
        confidence: Math.min(100, finalConfidence),
        targetPrice: avgTarget,
        stopLoss: avgStopLoss,
        timeHorizon: 'short', // 最も短期的な戦略に合わせる
        strategy: 'Consolidated',
        reasoning
      };
    } else {
      // すべてHOLDの場合は最初のHOLD信号を使用
      return signals[0];
    }
  }

  /**
   * ボラティリティ適応型戦略を実行
   */
  executeVolatilityAdaptiveStrategy(input: StrategyInput, config?: StrategyConfig): StrategyOutput {
    const cfg = { ...this.defaultConfig, ...config };
    const { priceData } = input;

    // ボラティリティを計算
    const volatility = this.calculateVolatility(priceData);

    // ボラティリティが高ければブレイクアウト戦略を優先、低ければ均値回帰戦略を優先
    if (volatility > 0.025) { // 高ボラティリティ（2.5%以上）
      // ブレイクアウト戦略を調整して実行
      const adjustedConfig = { ...cfg, atrMultiplier: cfg.atrMultiplier * 1.5 }; // ストップを広げる
      return this.executeBreakoutStrategy(input, adjustedConfig);
    } else if (volatility < 0.01) { // 低ボラティリティ（1%以下）
      // 均値回帰戦略を調整して実行
      const adjustedConfig = { ...cfg, atrMultiplier: cfg.atrMultiplier * 0.7 }; // ストップを狭める
      return this.executeMeanReversionStrategy(input, adjustedConfig);
    } else {
      // 中程度のボラティリティの場合は統合戦略
      return this.executeConsolidatedStrategy(input, cfg);
    }
  }

  /**
   * 平均出来高を計算
   */
  private calculateAverageVolume(priceData: OHLCV[]): number {
    if (priceData.length === 0) return 0;
    const totalVolume = priceData.reduce((sum, candle) => sum + candle.volume, 0);
    return totalVolume / priceData.length;
  }

  /**
   * ボラティリティを計算
   */
  private calculateVolatility(priceData: OHLCV[]): number {
    if (priceData.length < 2) return 0;
    
    const returns = [];
    for (let i = 1; i < priceData.length; i++) {
      const ret = (priceData[i].close - priceData[i-1].close) / priceData[i-1].close;
      returns.push(Math.abs(ret));
    }
    
    if (returns.length === 0) return 0;
    
    const avgReturn = returns.reduce((sum, ret) => sum + ret, 0) / returns.length;
    const variance = returns.reduce((sum, ret) => sum + Math.pow(ret - avgReturn, 2), 0) / returns.length;
    
    return Math.sqrt(variance);
  }
}

export const multipleTradingStrategiesService = new MultipleTradingStrategiesService();