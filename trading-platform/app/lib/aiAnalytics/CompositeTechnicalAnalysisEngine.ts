/**
 * CompositeTechnicalAnalysisEngine.ts
 * 
 * 複合テクニカル分析エンジン。複数のテクニカル指標を組み合わせて、
 * 論理的で解釈可能な売買シグナルを生成します。
 * 
 * 【主要機能】
 * - RSI: ダイバージェンス検知、買われすぎ/売られすぎ判定
 * - Trend: 移動平均線の配列、ゴールデン/デッドクロス判定
 * - Volatility: ボリンジャーバンドのスクイーズ/エクスパンション分析
 * - Momentum: MACDヒストグラムの推移分析
 * - Explainable AI: 「なぜBuy/Sellなのか」を説明するテキスト生成
 */

import { OHLCV } from '../../types/shared';
import { technicalIndicatorService } from '../TechnicalIndicatorService';
import { ConsensusSignalService } from '../ConsensusSignalService';
import type { ConsensusSignal } from '../ConsensusSignalService';
import { TECHNICAL_INDICATORS } from '../constants/technical-indicators';
import { CHART_ANALYSIS, BOLLINGER_BANDS_CONFIG } from '../constants/chart';

// ============================================================================
// Types
// ============================================================================

/**
 * RSI分析結果
 */
export interface RSIAnalysis {
  current: number;
  trend: 'rising' | 'falling' | 'neutral';
  signal: 'oversold' | 'overbought' | 'neutral' | 'extreme_oversold' | 'extreme_overbought';
  divergence: {
    detected: boolean;
    type: 'bullish' | 'bearish' | 'none';
    strength: number; // 0-1
  };
  score: number; // -1 to 1 (売り←→買い)
  reasons: string[];
}

/**
 * トレンド分析結果
 */
export interface TrendAnalysis {
  shortTerm: 'bullish' | 'bearish' | 'neutral'; // 短期 (5-20)
  mediumTerm: 'bullish' | 'bearish' | 'neutral'; // 中期 (20-50)
  longTerm: 'bullish' | 'bearish' | 'neutral'; // 長期 (50-200)
  crossover: {
    detected: boolean;
    type: 'golden' | 'dead' | 'none';
    strength: number; // 0-1
  };
  alignment: number; // -1 to 1 (全MA配列の一致度)
  score: number; // -1 to 1
  reasons: string[];
}

/**
 * ボラティリティ分析結果
 */
export interface VolatilityAnalysis {
  current: number; // ATR%
  state: 'squeeze' | 'expansion' | 'normal';
  bollingerPosition: number; // 0-100 (下限=0, 上限=100)
  bandwidth: number; // ボリンジャーバンド幅
  score: number; // -1 to 1
  reasons: string[];
}

/**
 * モメンタム分析結果
 */
export interface MomentumAnalysis {
  macdHistogram: number;
  histogramTrend: 'increasing' | 'decreasing' | 'neutral';
  macdCross: {
    detected: boolean;
    type: 'bullish' | 'bearish' | 'none';
    strength: number;
  };
  score: number; // -1 to 1
  reasons: string[];
}

/**
 * 複合分析結果
 */
export interface CompositeAnalysis {
  rsi: RSIAnalysis;
  trend: TrendAnalysis;
  volatility: VolatilityAnalysis;
  momentum: MomentumAnalysis;
  consensus: ConsensusSignal;
  finalScore: number; // -1 to 1 (統合スコア)
  direction: 'BUY' | 'SELL' | 'NEUTRAL';
  confidence: number; // 0-1
  strength: 'WEAK' | 'MODERATE' | 'STRONG';
  explainability: {
    primaryReasons: string[]; // 主要な理由（上位3つ）
    supportingReasons: string[]; // 補助的な理由
    warnings: string[]; // 注意事項
  };
}

// ============================================================================
// Composite Technical Analysis Engine
// ============================================================================

export class CompositeTechnicalAnalysisEngine {
  private consensusService: ConsensusSignalService;

  constructor() {
    this.consensusService = new ConsensusSignalService();
  }

  /**
   * メインメソッド：複合テクニカル分析を実行
   */
  analyze(data: OHLCV[]): CompositeAnalysis {
    if (data.length < 60) {
      return this.createNeutralAnalysis('データ不足: 最低60期間必要です');
    }

    // 各指標を分析
    const rsiAnalysis = this.analyzeRSI(data);
    const trendAnalysis = this.analyzeTrend(data);
    const volatilityAnalysis = this.analyzeVolatility(data);
    const momentumAnalysis = this.analyzeMomentum(data);
    
    // コンセンサスシグナルを生成
    const consensus = this.consensusService.generateConsensus(data);

    // 統合スコアを計算 (重み付き平均)
    const finalScore = this.calculateFinalScore({
      rsi: rsiAnalysis.score,
      trend: trendAnalysis.score,
      volatility: volatilityAnalysis.score,
      momentum: momentumAnalysis.score,
      consensus: this.consensusToScore(consensus),
    });

    // 方向と確信度を決定
    const direction = this.determineDirection(finalScore);
    const confidence = this.calculateConfidence(
      rsiAnalysis,
      trendAnalysis,
      volatilityAnalysis,
      momentumAnalysis,
      consensus
    );
    const strength = this.determineStrength(confidence, finalScore);

    // 説明可能性テキストを生成
    const explainability = this.generateExplainability({
      rsiAnalysis,
      trendAnalysis,
      volatilityAnalysis,
      momentumAnalysis,
      consensus,
      direction,
      confidence,
    });

    return {
      rsi: rsiAnalysis,
      trend: trendAnalysis,
      volatility: volatilityAnalysis,
      momentum: momentumAnalysis,
      consensus,
      finalScore,
      direction,
      confidence,
      strength,
      explainability,
    };
  }

  // ============================================================================
  // RSI Analysis
  // ============================================================================

  private analyzeRSI(data: OHLCV[]): RSIAnalysis {
    const prices = data.map(d => d.close);
    const rsi = technicalIndicatorService.calculateRSI(prices, TECHNICAL_INDICATORS.RSI_PERIOD);
    const currentRSI = rsi[rsi.length - 1];
    const prevRSI = rsi[rsi.length - 2];
    const rsi5Back = rsi[rsi.length - 6];

    const reasons: string[] = [];
    let score = 0;

    // トレンド判定
    const trend = currentRSI > prevRSI 
      ? (currentRSI > rsi5Back ? 'rising' : 'neutral')
      : (currentRSI < rsi5Back ? 'falling' : 'neutral');

    // シグナル判定
    let signal: RSIAnalysis['signal'] = 'neutral';
    if (currentRSI < TECHNICAL_INDICATORS.RSI_EXTREME_OVERSOLD) {
      signal = 'extreme_oversold';
      score = 0.8;
      reasons.push(`RSI(${currentRSI.toFixed(1)})が極度の売られすぎ水準`);
    } else if (currentRSI < TECHNICAL_INDICATORS.RSI_OVERSOLD) {
      signal = 'oversold';
      score = 0.5;
      reasons.push(`RSI(${currentRSI.toFixed(1)})が売られすぎ水準`);
    } else if (currentRSI > TECHNICAL_INDICATORS.RSI_EXTREME_OVERBOUGHT) {
      signal = 'extreme_overbought';
      score = -0.8;
      reasons.push(`RSI(${currentRSI.toFixed(1)})が極度の買われすぎ水準`);
    } else if (currentRSI > TECHNICAL_INDICATORS.RSI_OVERBOUGHT) {
      signal = 'overbought';
      score = -0.5;
      reasons.push(`RSI(${currentRSI.toFixed(1)})が買われすぎ水準`);
    } else {
      reasons.push(`RSI(${currentRSI.toFixed(1)})は中立圏内`);
    }

    // ダイバージェンス検知
    const divergence = this.detectRSIDivergence(data, rsi);
    if (divergence.detected) {
      if (divergence.type === 'bullish') {
        score = Math.max(score, divergence.strength * CHART_ANALYSIS.DIVERGENCE_STRENGTH_MULTIPLIER);
        reasons.push(`強気ダイバージェンス検出 (強度: ${(divergence.strength * 100).toFixed(0)}%)`);
      } else {
        score = Math.min(score, -divergence.strength * CHART_ANALYSIS.DIVERGENCE_STRENGTH_MULTIPLIER);
        reasons.push(`弱気ダイバージェンス検出 (強度: ${(divergence.strength * 100).toFixed(0)}%)`);
      }
    }

    return {
      current: currentRSI,
      trend,
      signal,
      divergence,
      score,
      reasons,
    };
  }

  /**
   * RSIダイバージェンス検知
   */
  private detectRSIDivergence(
    data: OHLCV[],
    rsi: number[]
  ): { detected: boolean; type: 'bullish' | 'bearish' | 'none'; strength: number } {
    if (data.length < CHART_ANALYSIS.MIN_DATA_LENGTH) {
      return { detected: false, type: 'none', strength: 0 };
    }

    const lookback = CHART_ANALYSIS.DIVERGENCE_LOOKBACK;
    const recentPrices = data.slice(-lookback).map(d => d.close);
    const recentRSI = rsi.slice(-lookback);

    // 価格の高値・安値
    const priceHigh = Math.max(...recentPrices);
    const priceLow = Math.min(...recentPrices);
    const priceHighIdx = recentPrices.lastIndexOf(priceHigh);
    const priceLowIdx = recentPrices.lastIndexOf(priceLow);

    // RSIの高値・安値
    const rsiHigh = Math.max(...recentRSI);
    const rsiLow = Math.min(...recentRSI);
    const rsiHighIdx = recentRSI.lastIndexOf(rsiHigh);
    const rsiLowIdx = recentRSI.lastIndexOf(rsiLow);

    // 強気ダイバージェンス: 価格が安値更新、RSIは高値更新
    if (priceLowIdx > lookback / 2 && rsiHighIdx > lookback / 2) {
      const priceTrend = (recentPrices[priceLowIdx] - recentPrices[0]) / recentPrices[0];
      const rsiTrend = (recentRSI[rsiHighIdx] - recentRSI[0]) / 100;
      
      if (priceTrend < -0.02 && rsiTrend > 0.05) {
        const strength = Math.min(Math.abs(priceTrend) + rsiTrend, 1);
        return { detected: true, type: 'bullish', strength };
      }
    }

    // 弱気ダイバージェンス: 価格が高値更新、RSIは安値更新
    if (priceHighIdx > lookback / 2 && rsiLowIdx > lookback / 2) {
      const priceTrend = (recentPrices[priceHighIdx] - recentPrices[0]) / recentPrices[0];
      const rsiTrend = (recentRSI[rsiLowIdx] - recentRSI[0]) / 100;
      
      if (priceTrend > 0.02 && rsiTrend < -0.05) {
        const strength = Math.min(Math.abs(priceTrend) + Math.abs(rsiTrend), 1);
        return { detected: true, type: 'bearish', strength };
      }
    }

    return { detected: false, type: 'none', strength: 0 };
  }

  // ============================================================================
  // Trend Analysis
  // ============================================================================

  private analyzeTrend(data: OHLCV[]): TrendAnalysis {
    const prices = data.map(d => d.close);
    const currentPrice = prices[prices.length - 1];
    
    const sma5 = technicalIndicatorService.calculateSMA(prices, TECHNICAL_INDICATORS.SMA_PERIOD_5);
    const sma20 = technicalIndicatorService.calculateSMA(prices, TECHNICAL_INDICATORS.SMA_PERIOD_20);
    const sma50 = technicalIndicatorService.calculateSMA(prices, TECHNICAL_INDICATORS.SMA_PERIOD_MEDIUM);
    const sma200 = data.length >= TECHNICAL_INDICATORS.SMA_PERIOD_LONG
      ? technicalIndicatorService.calculateSMA(prices, TECHNICAL_INDICATORS.SMA_PERIOD_LONG)
      : [];

    const reasons: string[] = [];
    let score = 0;

    // 短期トレンド (5 vs 20)
    const shortTerm = this.compareMAs(
      sma5[sma5.length - 1],
      sma20[sma20.length - 1],
      currentPrice
    );
    
    // 中期トレンド (20 vs 50)
    const mediumTerm = this.compareMAs(
      sma20[sma20.length - 1],
      sma50[sma50.length - 1],
      currentPrice
    );

    // 長期トレンド (50 vs 200)
    const longTerm = sma200.length > 0
      ? this.compareMAs(sma50[sma50.length - 1], sma200[sma200.length - 1], currentPrice)
      : 'neutral' as const;

    // クロスオーバー検知
    const crossover = this.detectCrossover(sma20, sma50);

    // MA配列の一致度
    const maArray = [sma5, sma20, sma50].map(ma => ma[ma.length - 1]).filter(v => !isNaN(v));
    const alignment = this.calculateAlignment(maArray, currentPrice);

    // スコア計算
    if (shortTerm === 'bullish') score += CHART_ANALYSIS.TREND_SHORT_TERM_WEIGHT;
    else if (shortTerm === 'bearish') score -= CHART_ANALYSIS.TREND_SHORT_TERM_WEIGHT;

    if (mediumTerm === 'bullish') score += CHART_ANALYSIS.TREND_MEDIUM_TERM_WEIGHT;
    else if (mediumTerm === 'bearish') score -= CHART_ANALYSIS.TREND_MEDIUM_TERM_WEIGHT;

    if (longTerm === 'bullish') score += CHART_ANALYSIS.TREND_LONG_TERM_WEIGHT;
    else if (longTerm === 'bearish') score -= CHART_ANALYSIS.TREND_LONG_TERM_WEIGHT;

    if (crossover.detected) {
      if (crossover.type === 'golden') {
        score += crossover.strength * CHART_ANALYSIS.CROSSOVER_STRENGTH_MULTIPLIER;
        reasons.push(`ゴールデンクロス検出 (強度: ${(crossover.strength * 100).toFixed(0)}%)`);
      } else {
        score -= crossover.strength * CHART_ANALYSIS.CROSSOVER_STRENGTH_MULTIPLIER;
        reasons.push(`デッドクロス検出 (強度: ${(crossover.strength * 100).toFixed(0)}%)`);
      }
    }

    // 理由を追加
    if (shortTerm === 'bullish' && mediumTerm === 'bullish') {
      reasons.push('短期・中期トレンドともに強気');
    } else if (shortTerm === 'bearish' && mediumTerm === 'bearish') {
      reasons.push('短期・中期トレンドともに弱気');
    }

    if (Math.abs(alignment) > 0.7) {
      reasons.push(
        alignment > 0
          ? '全移動平均線が強気配列'
          : '全移動平均線が弱気配列'
      );
    }

    return {
      shortTerm,
      mediumTerm,
      longTerm,
      crossover,
      alignment,
      score: Math.max(-1, Math.min(1, score)),
      reasons,
    };
  }

  private compareMAs(
    fast: number,
    slow: number,
    currentPrice: number
  ): 'bullish' | 'bearish' | 'neutral' {
    if (isNaN(fast) || isNaN(slow)) return 'neutral';
    
    // 短期MAが長期MAより上にあり、価格も上
    if (fast > slow && currentPrice > fast) return 'bullish';
    if (fast < slow && currentPrice < fast) return 'bearish';
    return 'neutral';
  }

  private detectCrossover(
    fast: number[],
    slow: number[]
  ): { detected: boolean; type: 'golden' | 'dead' | 'none'; strength: number } {
    if (fast.length < 3 || slow.length < 3) {
      return { detected: false, type: 'none', strength: 0 };
    }

    const currentFast = fast[fast.length - 1];
    const prevFast = fast[fast.length - 2];
    const currentSlow = slow[slow.length - 1];
    const prevSlow = slow[slow.length - 2];

    // ゴールデンクロス: 短期が長期を下から上に突破
    if (prevFast < prevSlow && currentFast > currentSlow) {
      const strength = Math.min(
        Math.abs(currentFast - currentSlow) / currentSlow,
        1
      );
      return { detected: true, type: 'golden', strength };
    }

    // デッドクロス: 短期が長期を上から下に突破
    if (prevFast > prevSlow && currentFast < currentSlow) {
      const strength = Math.min(
        Math.abs(currentFast - currentSlow) / currentSlow,
        1
      );
      return { detected: true, type: 'dead', strength };
    }

    return { detected: false, type: 'none', strength: 0 };
  }

  private calculateAlignment(mas: number[], currentPrice: number): number {
    if (mas.length === 0) return 0;

    // 理想的な配列: 価格 > SMA5 > SMA20 > SMA50 (強気)
    // または: 価格 < SMA5 < SMA20 < SMA50 (弱気)
    const sorted = [...mas].sort((a, b) => b - a);
    const bullishAlignment = mas.every((ma, i) => i === 0 || ma > mas[i - 1]);
    const bearishAlignment = mas.every((ma, i) => i === 0 || ma < mas[i - 1]);

    if (bullishAlignment && currentPrice > mas[0]) return 1;
    if (bearishAlignment && currentPrice < mas[0]) return -1;

    // 部分的な配列
    const bullishCount = mas.filter((ma, i) => i === 0 || ma > mas[i - 1]).length;
    const bearishCount = mas.filter((ma, i) => i === 0 || ma < mas[i - 1]).length;

    return (bullishCount - bearishCount) / mas.length;
  }

  // ============================================================================
  // Volatility Analysis
  // ============================================================================

  private analyzeVolatility(data: OHLCV[]): VolatilityAnalysis {
    const prices = data.map(d => d.close);
    const currentPrice = prices[prices.length - 1];
    
    const bollinger = technicalIndicatorService.calculateBollingerBands(prices, TECHNICAL_INDICATORS.BB_PERIOD, TECHNICAL_INDICATORS.BB_STD_DEV);
    const atr = technicalIndicatorService.calculateATR(data, TECHNICAL_INDICATORS.ATR_PERIOD);

    const reasons: string[] = [];
    let score = 0;

    // ATR%
    const currentATR = atr[atr.length - 1];
    const atrPercent = (currentATR / currentPrice) * 100;

    // ボリンジャーバンド位置 (0-100)
    const upperBand = bollinger.upper[bollinger.upper.length - 1];
    const lowerBand = bollinger.lower[bollinger.lower.length - 1];
    const bollingerPosition = ((currentPrice - lowerBand) / (upperBand - lowerBand)) * 100;

    // バンド幅
    const bandwidth = ((upperBand - lowerBand) / currentPrice) * 100;
    const avgBandwidth = this.calculateAverageBandwidth(bollinger, prices, 20);

    // 状態判定
    let state: VolatilityAnalysis['state'] = 'normal';
    if (bandwidth < avgBandwidth * BOLLINGER_BANDS_CONFIG.BANDWIDTH_SQUEEZE_MULTIPLIER) {
      state = 'squeeze';
      reasons.push('ボリンジャーバンドがスクイーズ（ブレイクアウト待ち）');
    } else if (bandwidth > avgBandwidth * BOLLINGER_BANDS_CONFIG.BANDWIDTH_EXPANSION_MULTIPLIER) {
      state = 'expansion';
      reasons.push('ボリンジャーバンドが拡張（高ボラティリティ）');
    }

    // スコア計算
    if (bollingerPosition < BOLLINGER_BANDS_CONFIG.POSITION_LOWER_THRESHOLD) {
      score = BOLLINGER_BANDS_CONFIG.POSITION_LOWER_SCORE; // 下限付近 → 買いシグナル
      reasons.push(`価格がボリンジャーバンド下限付近 (${bollingerPosition.toFixed(1)}%)`);
    } else if (bollingerPosition > BOLLINGER_BANDS_CONFIG.POSITION_UPPER_THRESHOLD) {
      score = BOLLINGER_BANDS_CONFIG.POSITION_UPPER_SCORE; // 上限付近 → 売りシグナル
      reasons.push(`価格がボリンジャーバンド上限付近 (${bollingerPosition.toFixed(1)}%)`);
    } else if (bollingerPosition > BOLLINGER_BANDS_CONFIG.POSITION_EXTREME_UPPER) {
      score = BOLLINGER_BANDS_CONFIG.POSITION_EXTREME_UPPER_SCORE;
      reasons.push(`価格がボリンジャーバンド上部 (${bollingerPosition.toFixed(1)}%)`);
    } else if (bollingerPosition < BOLLINGER_BANDS_CONFIG.POSITION_EXTREME_LOWER) {
      score = BOLLINGER_BANDS_CONFIG.POSITION_EXTREME_LOWER_SCORE;
      reasons.push(`価格がボリンジャーバンド下部 (${bollingerPosition.toFixed(1)}%)`);
    }

    return {
      current: atrPercent,
      state,
      bollingerPosition,
      bandwidth,
      score,
      reasons,
    };
  }

  private calculateAverageBandwidth(
    bollinger: { upper: number[]; lower: number[] },
    prices: number[],
    period: number
  ): number {
    const bandwidths: number[] = [];
    const len = Math.min(bollinger.upper.length, period);

    for (let i = 0; i < len; i++) {
      const idx = bollinger.upper.length - len + i;
      const upper = bollinger.upper[idx];
      const lower = bollinger.lower[idx];
      const price = prices[idx];
      
      if (!isNaN(upper) && !isNaN(lower) && price > 0) {
        bandwidths.push(((upper - lower) / price) * 100);
      }
    }

    return bandwidths.length > 0
      ? bandwidths.reduce((a, b) => a + b, 0) / bandwidths.length
      : 0;
  }

  // ============================================================================
  // Momentum Analysis
  // ============================================================================

  private analyzeMomentum(data: OHLCV[]): MomentumAnalysis {
    const prices = data.map(d => d.close);
    const macd = technicalIndicatorService.calculateMACD(prices, TECHNICAL_INDICATORS.MACD_FAST, TECHNICAL_INDICATORS.MACD_SLOW, TECHNICAL_INDICATORS.MACD_SIGNAL);

    const reasons: string[] = [];
    let score = 0;

    const currentHistogram = macd.histogram[macd.histogram.length - 1];
    const prevHistogram = macd.histogram[macd.histogram.length - 2];
    const histogram5Back = macd.histogram[macd.histogram.length - 6];

    // ヒストグラムトレンド
    const histogramTrend = currentHistogram > prevHistogram
      ? (currentHistogram > histogram5Back ? 'increasing' : 'neutral')
      : (currentHistogram < histogram5Back ? 'decreasing' : 'neutral');

    // MACDクロス検知
    const macdCross = this.detectMACDCross(macd.macd, macd.signal);

    // スコア計算
    if (currentHistogram > 0) {
      score += Math.min(Math.abs(currentHistogram) * CHART_ANALYSIS.MACD_HISTOGRAM_MULTIPLIER, CHART_ANALYSIS.MACD_HISTOGRAM_MAX_SCORE);
      reasons.push(`MACDヒストグラムが正(${currentHistogram.toFixed(3)})`);
    } else if (currentHistogram < 0) {
      score -= Math.min(Math.abs(currentHistogram) * CHART_ANALYSIS.MACD_HISTOGRAM_MULTIPLIER, CHART_ANALYSIS.MACD_HISTOGRAM_MAX_SCORE);
      reasons.push(`MACDヒストグラムが負(${currentHistogram.toFixed(3)})`);
    }

    if (histogramTrend === 'increasing') {
      score += CHART_ANALYSIS.HISTOGRAM_TREND_SCORE;
      reasons.push('MACDヒストグラムが上昇中');
    } else if (histogramTrend === 'decreasing') {
      score -= CHART_ANALYSIS.HISTOGRAM_TREND_SCORE;
      reasons.push('MACDヒストグラムが下降中');
    }

    if (macdCross.detected) {
      if (macdCross.type === 'bullish') {
        score += macdCross.strength * CHART_ANALYSIS.MACD_CROSS_STRENGTH_MULTIPLIER;
        reasons.push(`MACDが強気クロス (強度: ${(macdCross.strength * 100).toFixed(0)}%)`);
      } else {
        score -= macdCross.strength * CHART_ANALYSIS.MACD_CROSS_STRENGTH_MULTIPLIER;
        reasons.push(`MACDが弱気クロス (強度: ${(macdCross.strength * 100).toFixed(0)}%)`);
      }
    }

    return {
      macdHistogram: currentHistogram,
      histogramTrend,
      macdCross,
      score: Math.max(-1, Math.min(1, score)),
      reasons,
    };
  }

  private detectMACDCross(
    macdLine: number[],
    signalLine: number[]
  ): { detected: boolean; type: 'bullish' | 'bearish' | 'none'; strength: number } {
    if (macdLine.length < 2 || signalLine.length < 2) {
      return { detected: false, type: 'none', strength: 0 };
    }

    const currentMACD = macdLine[macdLine.length - 1];
    const prevMACD = macdLine[macdLine.length - 2];
    const currentSignal = signalLine[signalLine.length - 1];
    const prevSignal = signalLine[signalLine.length - 2];

    // 強気クロス: MACDがシグナルを下から上に突破
    if (prevMACD < prevSignal && currentMACD > currentSignal) {
      const strength = Math.min(
        Math.abs(currentMACD - currentSignal) * 20,
        1
      );
      return { detected: true, type: 'bullish', strength };
    }

    // 弱気クロス: MACDがシグナルを上から下に突破
    if (prevMACD > prevSignal && currentMACD < currentSignal) {
      const strength = Math.min(
        Math.abs(currentMACD - currentSignal) * 20,
        1
      );
      return { detected: true, type: 'bearish', strength };
    }

    return { detected: false, type: 'none', strength: 0 };
  }

  // ============================================================================
  // Score Calculation & Direction
  // ============================================================================

  private calculateFinalScore(scores: {
    rsi: number;
    trend: number;
    volatility: number;
    momentum: number;
    consensus: number;
  }): number {
    // 重み付け
    const weights = {
      rsi: CHART_ANALYSIS.AGREEMENT_INDICATOR_WEIGHT,
      trend: CHART_ANALYSIS.AGREEMENT_INDICATOR_WEIGHT + 0.05,
      volatility: CHART_ANALYSIS.AGREEMENT_INDICATOR_WEIGHT - 0.05,
      momentum: CHART_ANALYSIS.AGREEMENT_INDICATOR_WEIGHT,
      consensus: CHART_ANALYSIS.AGREEMENT_INDICATOR_WEIGHT,
    };

    const finalScore =
      scores.rsi * weights.rsi +
      scores.trend * weights.trend +
      scores.volatility * weights.volatility +
      scores.momentum * weights.momentum +
      scores.consensus * weights.consensus;

    return Math.max(-1, Math.min(1, finalScore));
  }

  private consensusToScore(consensus: ConsensusSignal): number {
    const typeScore = {
      'BUY': 0.7,
      'SELL': -0.7,
      'HOLD': 0,
    };
    
    const base = typeScore[consensus.type] || 0;
    const confidenceMultiplier = consensus.confidence / 100;
    
    return base * confidenceMultiplier;
  }

  private determineDirection(score: number): 'BUY' | 'SELL' | 'NEUTRAL' {
    if (score > CHART_ANALYSIS.DIRECTION_THRESHOLD) return 'BUY';
    if (score < -CHART_ANALYSIS.DIRECTION_THRESHOLD) return 'SELL';
    return 'NEUTRAL';
  }

  private calculateConfidence(
    rsi: RSIAnalysis,
    trend: TrendAnalysis,
    volatility: VolatilityAnalysis,
    momentum: MomentumAnalysis,
    consensus: ConsensusSignal
  ): number {
    // 各指標の一致度を評価
    const scores = [rsi.score, trend.score, volatility.score, momentum.score];
    const mean = scores.reduce((a, b) => a + b, 0) / scores.length;
    const variance = scores.reduce((sum, s) => sum + Math.pow(s - mean, 2), 0) / scores.length;
    const agreement = 1 - Math.min(variance * CHART_ANALYSIS.AGREEMENT_VARIANCE_MULTIPLIER, 1);

    // コンセンサス確信度も考慮
    const consensusConfidence = consensus.confidence / 100;

    // 特殊なシグナルがある場合は確信度を上げる
    let specialSignalBonus = 0;
    if (rsi.divergence.detected) specialSignalBonus += CHART_ANALYSIS.SPECIAL_SIGNAL_BONUS;
    if (trend.crossover.detected) specialSignalBonus += CHART_ANALYSIS.SPECIAL_SIGNAL_BONUS;
    if (momentum.macdCross.detected) specialSignalBonus += CHART_ANALYSIS.SPECIAL_SIGNAL_BONUS;

    const confidence = agreement * CHART_ANALYSIS.AGREEMENT_CONSENSUS_WEIGHT + consensusConfidence * CHART_ANALYSIS.AGREEMENT_CONSENSUS_WEIGHT + specialSignalBonus;
    
    return Math.max(0, Math.min(1, confidence));
  }

  private determineStrength(confidence: number, score: number): 'WEAK' | 'MODERATE' | 'STRONG' {
    const magnitude = Math.abs(score);
    
    if (confidence > CHART_ANALYSIS.CONFIDENCE_HIGH_THRESHOLD && magnitude > CHART_ANALYSIS.MAGNITUDE_STRONG_THRESHOLD) return 'STRONG';
    if (confidence > CHART_ANALYSIS.CONFIDENCE_MEDIUM_THRESHOLD && magnitude > CHART_ANALYSIS.MAGNITUDE_MODERATE_THRESHOLD) return 'MODERATE';
    return 'WEAK';
  }

  // ============================================================================
  // Explainability
  // ============================================================================

  private generateExplainability(params: {
    rsiAnalysis: RSIAnalysis;
    trendAnalysis: TrendAnalysis;
    volatilityAnalysis: VolatilityAnalysis;
    momentumAnalysis: MomentumAnalysis;
    consensus: ConsensusSignal;
    direction: 'BUY' | 'SELL' | 'NEUTRAL';
    confidence: number;
  }): {
    primaryReasons: string[];
    supportingReasons: string[];
    warnings: string[];
  } {
    const { rsiAnalysis, trendAnalysis, volatilityAnalysis, momentumAnalysis, consensus, direction } = params;

    // 全ての理由を収集
    const allReasons: Array<{ reason: string; score: number; category: string }> = [];

    // RSI
    rsiAnalysis.reasons.forEach(reason => {
      allReasons.push({
        reason,
        score: Math.abs(rsiAnalysis.score),
        category: 'RSI',
      });
    });

    // Trend
    trendAnalysis.reasons.forEach(reason => {
      allReasons.push({
        reason,
        score: Math.abs(trendAnalysis.score),
        category: 'Trend',
      });
    });

    // Volatility
    volatilityAnalysis.reasons.forEach(reason => {
      allReasons.push({
        reason,
        score: Math.abs(volatilityAnalysis.score),
        category: 'Volatility',
      });
    });

    // Momentum
    momentumAnalysis.reasons.forEach(reason => {
      allReasons.push({
        reason,
        score: Math.abs(momentumAnalysis.score),
        category: 'Momentum',
      });
    });

    // スコアでソート
    allReasons.sort((a, b) => b.score - a.score);

    // 主要な理由（上位3つ）
    const primaryReasons = allReasons.slice(0, 3).map(r => `[${r.category}] ${r.reason}`);

    // 補助的な理由
    const supportingReasons = allReasons.slice(3, 6).map(r => `[${r.category}] ${r.reason}`);

    // 注意事項
    const warnings: string[] = [];
    
    if (direction !== 'NEUTRAL' && params.confidence < 0.5) {
      warnings.push('確信度が低いため、慎重な判断が必要です');
    }

    if (volatilityAnalysis.state === 'squeeze') {
      warnings.push('ボラティリティが低下中。大きな値動きの可能性あり');
    } else if (volatilityAnalysis.state === 'expansion') {
      warnings.push('ボラティリティが高い状態。リスク管理に注意');
    }

    if (rsiAnalysis.signal === 'extreme_oversold' || rsiAnalysis.signal === 'extreme_overbought') {
      warnings.push('RSIが極端な水準。反転の可能性に注意');
    }

    // コンセンサスとの不一致を警告
    const consensusDirection = consensus.type === 'BUY' ? 'BUY' : consensus.type === 'SELL' ? 'SELL' : 'NEUTRAL';
    if (direction !== 'NEUTRAL' && consensusDirection !== 'NEUTRAL' && direction !== consensusDirection) {
      warnings.push('複合分析とコンセンサスシグナルが不一致');
    }

    return {
      primaryReasons,
      supportingReasons,
      warnings,
    };
  }

  // ============================================================================
  // Utility Methods
  // ============================================================================

  private createNeutralAnalysis(reason: string): CompositeAnalysis {
    const neutralRSI: RSIAnalysis = {
      current: 50,
      trend: 'neutral',
      signal: 'neutral',
      divergence: { detected: false, type: 'none', strength: 0 },
      score: 0,
      reasons: [reason],
    };

    const neutralTrend: TrendAnalysis = {
      shortTerm: 'neutral',
      mediumTerm: 'neutral',
      longTerm: 'neutral',
      crossover: { detected: false, type: 'none', strength: 0 },
      alignment: 0,
      score: 0,
      reasons: [reason],
    };

    const neutralVolatility: VolatilityAnalysis = {
      current: 0,
      state: 'normal',
      bollingerPosition: 50,
      bandwidth: 0,
      score: 0,
      reasons: [reason],
    };

    const neutralMomentum: MomentumAnalysis = {
      macdHistogram: 0,
      histogramTrend: 'neutral',
      macdCross: { detected: false, type: 'none', strength: 0 },
      score: 0,
      reasons: [reason],
    };

    const neutralConsensus: ConsensusSignal = {
      type: 'HOLD',
      probability: 0,
      strength: 'WEAK',
      confidence: 0,
      signals: {
        rsi: { type: 'NEUTRAL', strength: 0, reason },
        macd: { type: 'NEUTRAL', strength: 0, reason },
        bollinger: { type: 'NEUTRAL', strength: 0, reason },
      },
      reason,
    };

    return {
      rsi: neutralRSI,
      trend: neutralTrend,
      volatility: neutralVolatility,
      momentum: neutralMomentum,
      consensus: neutralConsensus,
      finalScore: 0,
      direction: 'NEUTRAL',
      confidence: 0,
      strength: 'WEAK',
      explainability: {
        primaryReasons: [reason],
        supportingReasons: [],
        warnings: [],
      },
    };
  }
}
