/**
 * StrategyCatalog.ts
 * 
 * 戦略カタログ - 様々な取引戦略のテンプレート
 * 
 * 【戦略一覧】
 * - Momentum (Trend Following)
 * - Mean Reversion
 * - Breakout
 * - Stat Arb (Pairs Trading)
 * - Market Making
 * - ML-Based Alpha
 */

import { OHLCV } from '@/app/types';
import { Strategy, StrategyAction, StrategyContext } from '../backtest/AdvancedBacktestEngine';
import { technicalIndicatorService } from '../TechnicalIndicatorService';

// ============================================================================
// Types
// ============================================================================

export interface StrategyTemplate {
  name: string;
  description: string;
  category: 'momentum' | 'mean_reversion' | 'breakout' | 'stat_arb' | 'market_making' | 'ml_based';
  defaultParams: Record<string, number | string>;
  createStrategy: (params: Record<string, number | string>) => Strategy;
}

export interface StrategyComposition {
  strategies: Array<{
    strategy: Strategy;
    weight: number;
  }>;
  rebalanceFrequency: number; // days
  correlationThreshold: number; // 相関が高すぎる場合は警告
}

// ============================================================================
// Strategy Templates
// ============================================================================

/**
 * Momentum Strategy (Trend Following)
 * トレンドフォロー戦略 - 強いトレンドに乗る
 */
export const MomentumStrategy: StrategyTemplate = {
  name: 'Momentum (Trend Following)',
  description: 'トレンドの勢いに従って売買。移動平均とRSIを使用。',
  category: 'momentum',
  defaultParams: {
    fastMA: 20,
    slowMA: 50,
    rsiPeriod: 14,
    rsiOverbought: 70,
    rsiOversold: 30,
    atrMultiplier: 2.0,
  },
  createStrategy: (params: Record<string, number | string>) => ({
    name: 'Momentum',
    description: 'Trend following with MA crossover and RSI filter',
    onData: (data: OHLCV, index: number, context: StrategyContext): StrategyAction => {
      if (index < (params.slowMA as number)) {
        return { action: 'HOLD' };
      }

      const closes = context.data.slice(0, index + 1).map(d => d.close);
      const fastMA = calculateSMA(closes, params.fastMA as number);
      const slowMA = calculateSMA(closes, params.slowMA as number);
      const rsi = calculateRSI(closes, params.rsiPeriod as number);
      const atr = calculateATR(context.data.slice(0, index + 1), 14);

      const currentPrice = data.close;
      const stopLossDistance = atr * (params.atrMultiplier as number);

      // ゴールデンクロス + RSI条件
      if (fastMA > slowMA && rsi < (params.rsiOverbought as number) && !context.currentPosition) {
        return {
          action: 'BUY',
          quantity: 1,
          stopLoss: currentPrice - stopLossDistance,
          takeProfit: currentPrice + stopLossDistance * 2,
        };
      }

      // デッドクロス + RSI条件
      if (fastMA < slowMA && rsi > (params.rsiOversold as number) && context.currentPosition === 'LONG') {
        return { action: 'CLOSE' };
      }

      return { action: 'HOLD' };
    },
  }),
};

/**
 * Mean Reversion Strategy
 * 平均回帰戦略 - 価格が平均から離れすぎた時に逆張り
 */
export const MeanReversionStrategy: StrategyTemplate = {
  name: 'Mean Reversion',
  description: 'ボリンジャーバンドを使った平均回帰戦略',
  category: 'mean_reversion',
  defaultParams: {
    bbPeriod: 20,
    bbStdDev: 2.0,
    rsiPeriod: 14,
    rsiOverbought: 70,
    rsiOversold: 30,
    exitThreshold: 0.5, // BBの中心線への回帰度合い
  },
  createStrategy: (params: Record<string, number | string>) => ({
    name: 'Mean Reversion',
    description: 'Bollinger Bands based mean reversion',
    onData: (data: OHLCV, index: number, context: StrategyContext): StrategyAction => {
      if (index < (params.bbPeriod as number)) {
        return { action: 'HOLD' };
      }

      const closes = context.data.slice(0, index + 1).map(d => d.close);
      const bb = calculateBollingerBands(closes, params.bbPeriod as number, params.bbStdDev as number);
      const rsi = calculateRSI(closes, params.rsiPeriod as number);

      const currentPrice = data.close;
      const bbWidth = bb.upper - bb.lower;

      // 下部バンド突破 + RSI過売
      if (currentPrice < bb.lower && rsi < (params.rsiOversold as number) && !context.currentPosition) {
        return {
          action: 'BUY',
          quantity: 1,
          stopLoss: bb.lower - bbWidth * 0.5,
          takeProfit: bb.middle,
        };
      }

      // 中心線回帰で利確
      if (context.currentPosition === 'LONG' && currentPrice > bb.middle * (params.exitThreshold as number)) {
        return { action: 'CLOSE' };
      }

      // 上部バンド突破 + RSI過買（ショート）
      if (currentPrice > bb.upper && rsi > (params.rsiOverbought as number) && !context.currentPosition) {
        return {
          action: 'SELL',
          quantity: 1,
          stopLoss: bb.upper + bbWidth * 0.5,
          takeProfit: bb.middle,
        };
      }

      return { action: 'HOLD' };
    },
  }),
};

/**
 * Breakout Strategy
 * ブレイクアウト戦略 - レンジブレイク時にエントリー
 */
export const BreakoutStrategy: StrategyTemplate = {
  name: 'Breakout',
  description: 'レンジブレイクアウトを捉える戦略',
  category: 'breakout',
  defaultParams: {
    lookbackPeriod: 20,
    volumeMultiplier: 1.5,
    atrMultiplier: 2.0,
    minChannelWidth: 0.02, // 2%
  },
  createStrategy: (params: Record<string, number | string>) => ({
    name: 'Breakout',
    description: 'Range breakout with volume confirmation',
    onData: (data: OHLCV, index: number, context: StrategyContext): StrategyAction => {
      if (index < (params.lookbackPeriod as number)) {
        return { action: 'HOLD' };
      }

      const recentData = context.data.slice(index - (params.lookbackPeriod as number), index + 1);
      const highs = recentData.map(d => d.high);
      const lows = recentData.map(d => d.low);
      const volumes = recentData.map(d => d.volume);

      const channelHigh = Math.max(...highs.slice(0, -1)); // 直近を除く
      const channelLow = Math.min(...lows.slice(0, -1));
      const channelWidth = (channelHigh - channelLow) / channelLow;
      const avgVolume = volumes.slice(0, -1).reduce((a, b) => a + b, 0) / (volumes.length - 1);
      
      const currentPrice = data.close;
      const currentVolume = data.volume;
      const atr = calculateATR(recentData, 14);

      // チャネル幅が十分にある
      if (channelWidth < (params.minChannelWidth as number)) {
        return { action: 'HOLD' };
      }

      // 上方ブレイクアウト + 出来高確認
      if (
        currentPrice > channelHigh &&
        currentVolume > avgVolume * (params.volumeMultiplier as number) &&
        !context.currentPosition
      ) {
        return {
          action: 'BUY',
          quantity: 1,
          stopLoss: channelHigh - atr * (params.atrMultiplier as number),
          takeProfit: currentPrice + (currentPrice - channelLow),
        };
      }

      // 損切り・利確
      if (context.currentPosition === 'LONG' && currentPrice < channelHigh * 0.98) {
        return { action: 'CLOSE' };
      }

      return { action: 'HOLD' };
    },
  }),
};

/**
 * Statistical Arbitrage Strategy (Simplified Pairs Trading)
 * 統計的裁定戦略 - 相関の高い銘柄ペアの価格差を利用
 */
export const StatArbStrategy: StrategyTemplate = {
  name: 'Statistical Arbitrage',
  description: 'Z-scoreベースのペアトレーディング（簡易版）',
  category: 'stat_arb',
  defaultParams: {
    lookbackPeriod: 60,
    entryZScore: 2.0,
    exitZScore: 0.5,
    stopLossZScore: 3.0,
  },
  createStrategy: (params: Record<string, number | string>) => ({
    name: 'Stat Arb',
    description: 'Z-score based pairs trading',
    onData: (data: OHLCV, index: number, context: StrategyContext): StrategyAction => {
      if (index < (params.lookbackPeriod as number)) {
        return { action: 'HOLD' };
      }

      const closes = context.data.slice(0, index + 1).map(d => d.close);
      const recentCloses = closes.slice(-(params.lookbackPeriod as number));
      
      // 移動平均とZ-scoreを計算
      const mean = recentCloses.reduce((a, b) => a + b, 0) / recentCloses.length;
      const variance = recentCloses.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / recentCloses.length;
      const std = Math.sqrt(variance);
      const zScore = (data.close - mean) / std;

      // Z-scoreが閾値を超えたらエントリー（平均回帰を期待）
      if (zScore > (params.entryZScore as number) && !context.currentPosition) {
        // 過剰に高い → ショート
        return {
          action: 'SELL',
          quantity: 1,
          stopLoss: data.close + std * (params.stopLossZScore as number),
          takeProfit: mean,
        };
      }

      if (zScore < -(params.entryZScore as number) && !context.currentPosition) {
        // 過剰に低い → ロング
        return {
          action: 'BUY',
          quantity: 1,
          stopLoss: data.close - std * (params.stopLossZScore as number),
          takeProfit: mean,
        };
      }

      // 平均回帰で利確
      if (context.currentPosition === 'SHORT' && zScore < (params.exitZScore as number)) {
        return { action: 'CLOSE' };
      }

      if (context.currentPosition === 'LONG' && zScore > -(params.exitZScore as number)) {
        return { action: 'CLOSE' };
      }

      return { action: 'HOLD' };
    },
  }),
};

/**
 * Market Making Strategy
 * マーケットメイク戦略 - ビッド・アスクスプレッドから利益を得る
 */
export const MarketMakingStrategy: StrategyTemplate = {
  name: 'Market Making',
  description: 'スプレッドキャプチャ戦略（簡易版）',
  category: 'market_making',
  defaultParams: {
    spreadPercentage: 0.01, // 1%
    inventoryLimit: 10,
    riskAdjustmentFactor: 0.5,
  },
  createStrategy: (params: Record<string, number | string>) => ({
    name: 'Market Making',
    description: 'Spread capture with inventory management',
    onData: (data: OHLCV, index: number, context: StrategyContext): StrategyAction => {
      const midPrice = (data.high + data.low) / 2;
      const spread = midPrice * (params.spreadPercentage as number);

      // 在庫管理: ポジションが偏りすぎていたら調整
      const inventory = context.currentPosition ? 1 : 0;

      if (!context.currentPosition) {
        // 両サイドに注文を出す（簡易実装）
        return {
          action: 'BUY',
          quantity: 1,
          stopLoss: midPrice - spread * 2,
          takeProfit: midPrice + spread,
        };
      }

      // 利確
      if (context.currentPosition === 'LONG' && data.close > context.entryPrice + spread) {
        return { action: 'CLOSE' };
      }

      return { action: 'HOLD' };
    },
  }),
};

/**
 * ML-Based Alpha Strategy
 * 機械学習ベースのアルファ戦略 - 特徴量エンジニアリング
 */
export const MLBasedAlphaStrategy: StrategyTemplate = {
  name: 'ML-Based Alpha',
  description: '機械学習的特徴量を使用した戦略',
  category: 'ml_based',
  defaultParams: {
    featurePeriod: 20,
    confidenceThreshold: 0.6,
    rsiWeight: 0.3,
    macdWeight: 0.3,
    volumeWeight: 0.2,
    momentumWeight: 0.2,
  },
  createStrategy: (params: Record<string, number | string>) => ({
    name: 'ML Alpha',
    description: 'Feature-based ML strategy',
    onData: (data: OHLCV, index: number, context: StrategyContext): StrategyAction => {
      if (index < (params.featurePeriod as number)) {
        return { action: 'HOLD' };
      }

      const closes = context.data.slice(0, index + 1).map(d => d.close);
      const volumes = context.data.slice(0, index + 1).map(d => d.volume);

      // 特徴量計算
      const rsi = calculateRSI(closes, 14);
      const macd = calculateMACD(closes);
      const volumeRatio = volumes[volumes.length - 1] / (volumes.slice(-20).reduce((a, b) => a + b, 0) / 20);
      const momentum = (closes[closes.length - 1] - closes[closes.length - 20]) / closes[closes.length - 20];

      // シグナルスコアを計算（擬似ML）
      const rsiSignal = (70 - rsi) / 40 - 0.5; // -0.5 to 0.5
      const macdSignal = Math.tanh(macd.histogram); // -1 to 1
      const volumeSignal = Math.min(1, volumeRatio - 1); // 0 to 1
      const momentumSignal = Math.tanh(momentum * 10); // -1 to 1

      const signal =
        (params.rsiWeight as number) * rsiSignal +
        (params.macdWeight as number) * macdSignal +
        (params.volumeWeight as number) * volumeSignal +
        (params.momentumWeight as number) * momentumSignal;

      const confidence = Math.abs(signal);

      // 信頼度が閾値を超えたらエントリー
      if (signal > (params.confidenceThreshold as number) && !context.currentPosition) {
        return {
          action: 'BUY',
          quantity: 1,
          stopLoss: data.close * 0.97,
          takeProfit: data.close * 1.05,
        };
      }

      if (signal < -(params.confidenceThreshold as number) && !context.currentPosition) {
        return {
          action: 'SELL',
          quantity: 1,
          stopLoss: data.close * 1.03,
          takeProfit: data.close * 0.95,
        };
      }

      // 信頼度が低下したら決済
      if (context.currentPosition && confidence < 0.3) {
        return { action: 'CLOSE' };
      }

      return { action: 'HOLD' };
    },
  }),
};

// ============================================================================
// Strategy Composition
// ============================================================================

/**
 * 複数戦略を組み合わせた合成戦略を作成
 */
export function createCompositeStrategy(composition: StrategyComposition): Strategy {
  return {
    name: 'Composite Strategy',
    description: `Combination of ${composition.strategies.length} strategies`,
    onData: (data: OHLCV, index: number, context: StrategyContext): StrategyAction => {
      // 各戦略のアクションを取得
      const actions = composition.strategies.map(({ strategy, weight }) => {
        const action = strategy.onData(data, index, context);
        return { action, weight };
      });

      // 重み付き投票で決定
      let buyScore = 0;
      let sellScore = 0;
      let closeScore = 0;

      actions.forEach(({ action, weight }) => {
        if (action.action === 'BUY') buyScore += weight;
        if (action.action === 'SELL') sellScore += weight;
        if (action.action === 'CLOSE') closeScore += weight;
      });

      const totalWeight = composition.strategies.reduce((sum, s) => sum + s.weight, 0);
      const threshold = totalWeight * 0.5; // 過半数

      if (closeScore > threshold) {
        return { action: 'CLOSE' };
      }

      if (buyScore > threshold && !context.currentPosition) {
        // 平均的なストップロスとテイクプロフィットを計算
        const avgStopLoss =
          actions
            .filter(a => a.action.action === 'BUY' && a.action.stopLoss)
            .reduce((sum, a) => sum + (a.action.stopLoss || 0), 0) /
          actions.filter(a => a.action.action === 'BUY').length;

        const avgTakeProfit =
          actions
            .filter(a => a.action.action === 'BUY' && a.action.takeProfit)
            .reduce((sum, a) => sum + (a.action.takeProfit || 0), 0) /
          actions.filter(a => a.action.action === 'BUY').length;

        return {
          action: 'BUY',
          quantity: 1,
          stopLoss: avgStopLoss,
          takeProfit: avgTakeProfit,
        };
      }

      if (sellScore > threshold && !context.currentPosition) {
        return {
          action: 'SELL',
          quantity: 1,
        };
      }

      return { action: 'HOLD' };
    },
  };
}

/**
 * 戦略間の相関を計算
 */
export function calculateStrategyCorrelation(
  strategy1Returns: number[],
  strategy2Returns: number[]
): number {
  if (strategy1Returns.length !== strategy2Returns.length || strategy1Returns.length === 0) {
    return 0;
  }

  const mean1 = strategy1Returns.reduce((a, b) => a + b, 0) / strategy1Returns.length;
  const mean2 = strategy2Returns.reduce((a, b) => a + b, 0) / strategy2Returns.length;

  let numerator = 0;
  let sum1Sq = 0;
  let sum2Sq = 0;

  for (let i = 0; i < strategy1Returns.length; i++) {
    const diff1 = strategy1Returns[i] - mean1;
    const diff2 = strategy2Returns[i] - mean2;
    numerator += diff1 * diff2;
    sum1Sq += diff1 * diff1;
    sum2Sq += diff2 * diff2;
  }

  const denominator = Math.sqrt(sum1Sq * sum2Sq);
  return denominator === 0 ? 0 : numerator / denominator;
}

// ============================================================================
// Utility Functions
// ============================================================================

function calculateSMA(data: number[], period: number): number {
  if (data.length < period) return data[data.length - 1];
  const slice = data.slice(-period);
  return slice.reduce((a, b) => a + b, 0) / period;
}

function calculateRSI(data: number[], period: number): number {
  if (data.length < period + 1) return 50;

  const changes = [];
  for (let i = 1; i < data.length; i++) {
    changes.push(data[i] - data[i - 1]);
  }

  const recentChanges = changes.slice(-period);
  const gains = recentChanges.filter(c => c > 0);
  const losses = recentChanges.filter(c => c < 0).map(c => Math.abs(c));

  const avgGain = gains.length > 0 ? gains.reduce((a, b) => a + b, 0) / period : 0;
  const avgLoss = losses.length > 0 ? losses.reduce((a, b) => a + b, 0) / period : 0;

  if (avgLoss === 0) return 100;
  const rs = avgGain / avgLoss;
  return 100 - 100 / (1 + rs);
}

function calculateMACD(data: number[]): { macd: number; signal: number; histogram: number } {
  const ema12 = calculateEMA(data, 12);
  const ema26 = calculateEMA(data, 26);
  const macd = ema12 - ema26;
  
  // 簡易的なシグナル線（SMAで代用）
  const signal = macd; // 本来はMACDのEMA
  const histogram = macd - signal;

  return { macd, signal, histogram };
}

function calculateEMA(data: number[], period: number): number {
  if (data.length < period) return data[data.length - 1];
  
  const multiplier = 2 / (period + 1);
  let ema = data.slice(0, period).reduce((a, b) => a + b, 0) / period;

  for (let i = period; i < data.length; i++) {
    ema = (data[i] - ema) * multiplier + ema;
  }

  return ema;
}

function calculateBollingerBands(
  data: number[],
  period: number,
  stdDev: number
): { upper: number; middle: number; lower: number } {
  const middle = calculateSMA(data, period);
  const slice = data.slice(-period);
  const variance = slice.reduce((sum, val) => sum + Math.pow(val - middle, 2), 0) / period;
  const std = Math.sqrt(variance);

  return {
    upper: middle + std * stdDev,
    middle,
    lower: middle - std * stdDev,
  };
}

function calculateATR(data: OHLCV[], period: number): number {
  if (data.length < period + 1) return 0;

  const trueRanges = [];
  for (let i = 1; i < data.length; i++) {
    const high = data[i].high;
    const low = data[i].low;
    const prevClose = data[i - 1].close;
    const tr = Math.max(high - low, Math.abs(high - prevClose), Math.abs(low - prevClose));
    trueRanges.push(tr);
  }

  const recentTR = trueRanges.slice(-period);
  return recentTR.reduce((a, b) => a + b, 0) / period;
}

// ============================================================================
// Strategy Catalog Export
// ============================================================================

export const strategyCatalog: StrategyTemplate[] = [
  MomentumStrategy,
  MeanReversionStrategy,
  BreakoutStrategy,
  StatArbStrategy,
  MarketMakingStrategy,
  MLBasedAlphaStrategy,
];

export function getStrategyByName(name: string): StrategyTemplate | undefined {
  return strategyCatalog.find(s => s.name === name);
}

export function getStrategiesByCategory(
  category: 'momentum' | 'mean_reversion' | 'breakout' | 'stat_arb' | 'market_making' | 'ml_based'
): StrategyTemplate[] {
  return strategyCatalog.filter(s => s.category === category);
}
