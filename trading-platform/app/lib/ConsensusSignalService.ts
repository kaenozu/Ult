/**
 * ConsensusSignalService - 複数のテクニカル指標を組み合わせたコンセンサスシグナル生成
 *
 * 【機能】
 * - 複数のテクニカル指標（RSI + MACD + ボリンジャーバンド）を組み合わせ
 * - 各指標に重みを付け、コンセンサスを取る方式
 * - 売買の強さを0-1の確率として表現
 */


import { OHLCV, Signal, TimeFrame } from '../types';
import { devLog } from '@/app/lib/utils/dev-logger';

import { technicalIndicatorService } from './TechnicalIndicatorService';
import { RSI_CONFIG, BOLLINGER_BANDS, CONSENSUS_SIGNAL_CONFIG } from '@/app/constants';
import { MarketRegimeDetector, MarketRegime } from './services/market-regime-detector';
import { AdaptiveWeightCalculator } from './services/adaptive-weight-calculator';
import { useSignalHistoryStore } from '@/app/store/signalHistoryStore';

/**
 * 各指標からのシグナル
 */
import { logger } from '@/app/core/logger';
interface IndicatorSignal {
  type: 'BUY' | 'SELL' | 'NEUTRAL';
  strength: number; // 0-1の確率
  reason: string;
}

/**
 * コンセンサスシグナル結果
 */
export interface ConsensusSignal {
  type: 'BUY' | 'SELL' | 'HOLD';
  probability: number; // 0-1の確率
  strength: 'WEAK' | 'MODERATE' | 'STRONG';
  confidence: number; // 0-100
  signals: {
    rsi: IndicatorSignal;
    macd: IndicatorSignal;
    bollinger: IndicatorSignal;
  };
  reason: string;
}

/**
 * コンセンサスシグナルの重み付け設定
 * Optimized weights for better signal accuracy
 */
interface ConsensusWeights {
  rsi: number;
  macd: number;
  bollinger: number;
}

const DEFAULT_WEIGHTS: ConsensusWeights = {
  rsi: 0.30,      // トレンド性の強いデータではRSIの信頼性が低い
  macd: 0.50,     // MACDを重視（トレンド追従）
  bollinger: 0.20, // ボリンジャーバンドの重みを減らす
};

class ConsensusSignalService {
  private regimeDetector: MarketRegimeDetector;
  private weightCalculator: AdaptiveWeightCalculator;

  constructor(regimeDetector?: MarketRegimeDetector) {
    this.regimeDetector = regimeDetector || new MarketRegimeDetector();
    this.weightCalculator = new AdaptiveWeightCalculator();
  }

  /**
   * メインメソッド：コンセンサスシグナルを生成
   */
  generateConsensus(data: OHLCV[], customWeights?: Partial<ConsensusWeights>): ConsensusSignal {
    if (data.length < 50) {
      return this.createHoldSignal('データ不足のためシグナルを生成できません');
    }

    const closes = data.map(d => d.close);

    // 各指標を計算
    const rsi = technicalIndicatorService.calculateRSI(closes, RSI_CONFIG.DEFAULT_PERIOD);
    const macd = technicalIndicatorService.calculateMACD(closes);
    const bollinger = technicalIndicatorService.calculateBollingerBands(
      closes,
      BOLLINGER_BANDS.PERIOD,
      BOLLINGER_BANDS.STD_DEVIATION
    );
    const sma20 = technicalIndicatorService.calculateSMA(closes, 20);

    // 市場レジームを判定
    let regime: MarketRegime;
    try {
      regime = this.regimeDetector.detect(data);
    } catch (e) {
      logger.error('MarketRegimeDetector failed to detect regime:', e as Error);
      regime = { type: 'RANGING', volatilityLevel: 'NORMAL', trendStrength: 0, momentumQuality: 0 };
    }

    // 各指標からシグナルを生成
    const currentPrice = closes[closes.length - 1];
    const currentRSI = rsi[rsi.length - 1];
    const currentSMA = sma20[sma20.length - 1];

    const rsiSignal = this.generateRSISignal(rsi, currentPrice);
    const macdSignal = this.generateMACDSignal(macd, currentPrice);
    const bollingerSignal = this.generateBollingerSignal(bollinger, currentPrice);

    // Optimized: In modern flow, ML results are handled by IntegratedPredictionService via Web Worker
    // This service now focuses on pure technical consensus as a component of that pipeline.
    const weights = { ...DEFAULT_WEIGHTS, ...customWeights };

    // コンセンサスを計算
    const consensus = this.calculateConsensus(
      rsiSignal, 
      macdSignal, 
      bollingerSignal, 
      weights,
      regime,
      currentPrice,
      currentSMA,
      currentRSI
    );

    return consensus;
  }

  /**
   * Enhanced Consensus Generation (Async wrapper for compatibility)
   */
  async generateEnhancedConsensus(data: OHLCV[]): Promise<ConsensusSignal> {
    return this.generateConsensus(data);
  }

  /**
   * RSIからのシグナル生成
   */
  private generateRSISignal(rsi: number[], currentPrice: number): IndicatorSignal {
    const len = rsi.length;
    const currentRSI = rsi[len - 1];
    const prevRSI = rsi[len - 2];

    if (isNaN(currentRSI)) {
      return { type: 'NEUTRAL', strength: 0, reason: 'RSIデータ不足' };
    }

    if (prevRSI < RSI_CONFIG.OVERSOLD && currentRSI > prevRSI + 5) {
      const recoveryStrength = Math.min((currentRSI - prevRSI) / 10, 1.0);
      return {
        type: 'BUY',
        strength: Math.max(recoveryStrength, 0.7),
        reason: `RSIの底打ち反転を検知（${prevRSI.toFixed(1)} -> ${currentRSI.toFixed(1)}）`
      };
    }

    if (currentRSI < RSI_CONFIG.EXTREME_OVERSOLD) {
      return {
        type: 'BUY',
        strength: this.mapRange(currentRSI, 0, RSI_CONFIG.EXTREME_OVERSOLD, 0.8, 1.0),
        reason: `RSI(${currentRSI.toFixed(1)})が売られすぎ水準`
      };
    }

    if (currentRSI > RSI_CONFIG.EXTREME_OVERBOUGHT) {
      return {
        type: 'SELL',
        strength: this.mapRange(currentRSI, RSI_CONFIG.EXTREME_OVERBOUGHT, 100, 0.8, 1.0),
        reason: `RSI(${currentRSI.toFixed(1)})が買われすぎ水準`
      };
    }

    return { type: 'NEUTRAL', strength: 0, reason: `RSI(${currentRSI.toFixed(1)})は中立圏内` };
  }

  /**
   * MACDからのシグナル生成
   */
  private generateMACDSignal(macd: { macd: number[]; signal: number[]; histogram: number[] }, currentPrice: number): IndicatorSignal {
    const len = macd.histogram.length;
    const currentHist = macd.histogram[len - 1];
    const prevHist = macd.histogram[len - 2];

    if (isNaN(currentHist) || isNaN(prevHist)) {
      return { type: 'NEUTRAL', strength: 0, reason: 'MACDデータ不足' };
    }

    if (currentHist > 0) {
      const isExpanding = currentHist > prevHist;
      return {
        type: 'BUY',
        strength: isExpanding ? 0.6 : 0.3,
        reason: `MACD強気圏（ヒストグラム: ${currentHist.toFixed(4)}）`
      };
    }

    if (currentHist < 0) {
      const isShrinking = currentHist > prevHist;
      return {
        type: isShrinking ? 'BUY' : 'SELL',
        strength: isShrinking ? 0.3 : 0.6,
        reason: `MACD弱気圏（ヒストグラム: ${currentHist.toFixed(4)}）`
      };
    }

    return { type: 'NEUTRAL', strength: 0, reason: 'MACD方向感なし' };
  }

  /**
   * ボリンジャーバンドからのシグナル生成
   */
  private generateBollingerSignal(
    bollinger: { upper: number[]; middle: number[]; lower: number[] },
    currentPrice: number
  ): IndicatorSignal {
    const upper = bollinger.upper[bollinger.upper.length - 1];
    const lower = bollinger.lower[bollinger.lower.length - 1];

    if (isNaN(upper) || isNaN(lower)) {
      return { type: 'NEUTRAL', strength: 0, reason: 'ボリンジャーバンドデータ不足' };
    }

    const bandWidth = upper - lower;
    const positionInBand = (currentPrice - lower) / (bandWidth || 1);

    if (positionInBand < 0.2) {
      return { type: 'BUY', strength: 0.8, reason: 'ボリンジャーバンド下部付近' };
    }

    if (positionInBand > 0.8) {
      return { type: 'SELL', strength: 0.8, reason: 'ボリンジャーバンド上部付近' };
    }

    return { type: 'NEUTRAL', strength: 0, reason: 'ボリンジャーバンド中央付近' };
  }

  /**
   * コンセンサスを計算（加重平均）
   */
  private calculateConsensus(
    rsiSignal: IndicatorSignal,
    macdSignal: IndicatorSignal,
    bollingerSignal: IndicatorSignal,
    weights: ConsensusWeights,
    regime: MarketRegime,
    currentPrice: number,
    currentSMA: number,
    currentRSI: number
  ): ConsensusSignal {
    const rsiScore = rsiSignal.type === 'BUY' ? rsiSignal.strength : rsiSignal.type === 'SELL' ? -rsiSignal.strength : 0;
    const macdScore = macdSignal.type === 'BUY' ? macdSignal.strength : macdSignal.type === 'SELL' ? -macdSignal.strength : 0;
    const bollingerScore = bollingerSignal.type === 'BUY' ? bollingerSignal.strength : bollingerSignal.type === 'SELL' ? -bollingerSignal.strength : 0;

    let weightedScore = (rsiScore * weights.rsi) + (macdScore * weights.macd) + (bollingerScore * weights.bollinger);

    const baseThreshold = CONSENSUS_SIGNAL_CONFIG.THRESHOLDS.SIGNAL_MIN;
    
    let type: 'BUY' | 'SELL' | 'HOLD';
    if (weightedScore > baseThreshold) type = 'BUY';
    else if (weightedScore < -baseThreshold) type = 'SELL';
    else type = 'HOLD';

    const probability = Math.min(Math.abs(weightedScore), 1.0);
    const confidence = Math.min(probability * 100 + 50, 95);

    const signals = { rsi: rsiSignal, macd: macdSignal, bollinger: bollingerSignal };
    const reason = `${type === 'BUY' ? '買い' : type === 'SELL' ? '売り' : '様子見'}判定。複合指標によるコンセンサス分析。`;

    return {
      type,
      probability,
      strength: probability > 0.7 ? 'STRONG' : probability > 0.4 ? 'MODERATE' : 'WEAK',
      confidence,
      signals,
      reason
    };
  }

  /**
   * HOLDシグナルを生成
   */
  private createHoldSignal(reason: string): ConsensusSignal {
    return {
      type: 'HOLD',
      probability: 0,
      strength: 'WEAK',
      confidence: 0,
      signals: {
        rsi: { type: 'NEUTRAL', strength: 0, reason: '' },
        macd: { type: 'NEUTRAL', strength: 0, reason: '' },
        bollinger: { type: 'NEUTRAL', strength: 0, reason: '' }
      },
      reason
    };
  }

  private mapRange(value: number, inMin: number, inMax: number, outMin: number, outMax: number): number {
    if (inMin === inMax) return outMin;
    const clamped = Math.max(inMin, Math.min(value, inMax));
    return ((clamped - inMin) / (inMax - inMin)) * (outMax - outMin) + outMin;
  }

  /**
   * ConsensusSignal を Signal に変換する
   */
  convertToSignal(consensus: ConsensusSignal, symbol: string, data: OHLCV[]): Signal {
    const currentPrice = data[data.length - 1].close;
    const adjustment = consensus.confidence / 100 * 0.05; 
    
    let targetPrice = consensus.type === 'BUY' ? currentPrice * (1 + adjustment) : currentPrice * (1 - adjustment);
    let stopLoss = consensus.type === 'BUY' ? currentPrice * (1 - adjustment * 1.5) : currentPrice * (1 + adjustment * 1.5);
    
    return {
      symbol,
      type: consensus.type,
      confidence: consensus.confidence,
      targetPrice,
      stopLoss,
      reason: consensus.reason,
      predictedChange: ((targetPrice - currentPrice) / currentPrice) * 100,
      predictionDate: new Date().toISOString().split('T')[0],
    };
  }
}

export { ConsensusSignalService };
export const consensusSignalService = new ConsensusSignalService();
