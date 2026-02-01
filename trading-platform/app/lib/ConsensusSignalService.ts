/**
 * ConsensusSignalService - 複数のテクニカル指標を組み合わせたコンセンサスシグナル生成
 *
 * 【機能】
 * - 複数のテクニカル指標（RSI + MACD + ボリンジャーバンド）を組み合わせ
 * - 各指標に重みを付け、コンセンサスを取る方式
 * - 売買の強さを0-1の確率として表現
 */

import { OHLCV } from '../types';
import { technicalIndicatorService } from './TechnicalIndicatorService';
import { ALERT_SEVERITY_THRESHOLDS } from './constants';

/**
 * 各指標からのシグナル
 */
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
 */
interface ConsensusWeights {
  rsi: number;
  macd: number;
  bollinger: number;
}

const DEFAULT_WEIGHTS: ConsensusWeights = {
  rsi: 0.35,
  macd: 0.35,
  bollinger: 0.30,
};

class ConsensusSignalService {
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

    // 各指標からシグナルを生成
    const currentPrice = closes[closes.length - 1];
    const rsiSignal = this.generateRSISignal(rsi, currentPrice);
    const macdSignal = this.generateMACDSignal(macd, currentPrice);
    const bollingerSignal = this.generateBollingerSignal(bollinger, currentPrice);

    // 重みを取得
    const weights = { ...DEFAULT_WEIGHTS, ...customWeights };

    // コンセンサスを計算
    const consensus = this.calculateConsensus(rsiSignal, macdSignal, bollingerSignal, weights);

    return consensus;
  }

  /**
   * RSIからのシグナル生成
   */
  private generateRSISignal(rsi: number[], currentPrice: number): IndicatorSignal {
    const currentRSI = rsi[rsi.length - 1];

    if (isNaN(currentRSI)) {
      return { type: 'NEUTRAL', strength: 0, reason: 'RSIデータ不足' };
    }

    // RSIが極端な場合、強いシグナル
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

    // RSIが中程度の場合、中程度のシグナル
    if (currentRSI < RSI_CONFIG.OVERSOLD) {
      return {
        type: 'BUY',
        strength: this.mapRange(currentRSI, RSI_CONFIG.OVERSOLD, RSI_CONFIG.EXTREME_OVERSOLD, 0.4, 0.7),
        reason: `RSI(${currentRSI.toFixed(1)})が売られ傾向`
      };
    }

    if (currentRSI > RSI_CONFIG.OVERBOUGHT) {
      return {
        type: 'SELL',
        strength: this.mapRange(currentRSI, RSI_CONFIG.OVERBOUGHT, RSI_CONFIG.EXTREME_OVERBOUGHT, 0.4, 0.7),
        reason: `RSI(${currentRSI.toFixed(1)})が買われ傾向`
      };
    }

    // 中立圏内
    return {
      type: 'NEUTRAL',
      strength: 0,
      reason: `RSI(${currentRSI.toFixed(1)})は中立圏内`
    };
  }

  /**
   * MACDからのシグナル生成
   */
  private generateMACDSignal(macd: { macd: number[]; signal: number[]; histogram: number[] }, currentPrice: number): IndicatorSignal {
    const currentMACD = macd.macd[macd.macd.length - 1];
    const currentSignal = macd.signal[macd.signal.length - 1];
    const currentHistogram = macd.histogram[macd.histogram.length - 1];

    if (isNaN(currentMACD) || isNaN(currentSignal) || isNaN(currentHistogram)) {
      return { type: 'NEUTRAL', strength: 0, reason: 'MACDデータ不足' };
    }

    // ヒストグラムが正で大きい＝強気
    if (currentHistogram > 0) {
      const strength = Math.min(Math.abs(currentHistogram) / currentPrice * 100, 1.0);
      return {
        type: 'BUY',
        strength: Math.max(strength, 0.3), // 最低0.3
        reason: `MACDが上向き（ヒストグラム: ${currentHistogram.toFixed(4)}）`
      };
    }

    // ヒストグラムが負で大きい＝弱気
    if (currentHistogram < 0) {
      const strength = Math.min(Math.abs(currentHistogram) / currentPrice * 100, 1.0);
      return {
        type: 'SELL',
        strength: Math.max(strength, 0.3), // 最低0.3
        reason: `MACDが下向き（ヒストグラム: ${currentHistogram.toFixed(4)}）`
      };
    }

    // クロス付近
    return {
      type: 'NEUTRAL',
      strength: 0,
      reason: 'MACDがクロス付近で方向感なし'
    };
  }

  /**
   * ボリンジャーバンドからのシグナル生成
   */
  private generateBollingerSignal(
    bollinger: { upper: number[]; middle: number[]; lower: number[] },
    currentPrice: number
  ): IndicatorSignal {
    const upper = bollinger.upper[bollinger.upper.length - 1];
    const middle = bollinger.middle[bollinger.middle.length - 1];
    const lower = bollinger.lower[bollinger.lower.length - 1];

    if (isNaN(upper) || isNaN(middle) || isNaN(lower)) {
      return { type: 'NEUTRAL', strength: 0, reason: 'ボリンジャーバンドデータ不足' };
    }

    // バンド幅を計算
    const bandWidth = upper - lower;
    const positionInBand = (currentPrice - lower) / bandWidth; // 0-1の位置

    // 下部バンドに近い＝売られすぎ
    if (positionInBand < 0.2) {
      return {
        type: 'BUY',
        strength: this.mapRange(positionInBand, 0, 0.2, 0.9, 0.6),
        reason: `価格がボリンジャーバンド下部付近（位置: ${(positionInBand * 100).toFixed(1)}%）`
      };
    }

    // 上部バンドに近い＝買われすぎ
    if (positionInBand > 0.8) {
      return {
        type: 'SELL',
        strength: this.mapRange(positionInBand, 0.8, 1.0, 0.6, 0.9),
        reason: `価格がボリンジャーバンド上部付近（位置: ${(positionInBand * 100).toFixed(1)}%）`
      };
    }

    // 中間付近
    if (positionInBand < 0.4) {
      return {
        type: 'BUY',
        strength: 0.3,
        reason: `価格がボリンジャーバンド下半分（位置: ${(positionInBand * 100).toFixed(1)}%）`
      };
    }

    if (positionInBand > 0.6) {
      return {
        type: 'SELL',
        strength: 0.3,
        reason: `価格がボリンジャーバンド上半分（位置: ${(positionInBand * 100).toFixed(1)}%）`
      };
    }

    return {
      type: 'NEUTRAL',
      strength: 0,
      reason: `価格がボリンジャーバンド中央付近（位置: ${(positionInBand * 100).toFixed(1)}%）`
    };
  }

  /**
   * コンセンサスを計算（加重平均）
   */
  private calculateConsensus(
    rsiSignal: IndicatorSignal,
    macdSignal: IndicatorSignal,
    bollingerSignal: IndicatorSignal,
    weights: ConsensusWeights
  ): ConsensusSignal {
    // 買いシグナルのスコアを計算（BUY=+1, SELL=-1, NEUTRAL=0）
    const rsiScore = rsiSignal.type === 'BUY' ? rsiSignal.strength : rsiSignal.type === 'SELL' ? -rsiSignal.strength : 0;
    const macdScore = macdSignal.type === 'BUY' ? macdSignal.strength : macdSignal.type === 'SELL' ? -macdSignal.strength : 0;
    const bollingerScore = bollingerSignal.type === 'BUY' ? bollingerSignal.strength : bollingerSignal.type === 'SELL' ? -bollingerSignal.strength : 0;

    // 加重平均を計算
    const weightedScore = (rsiScore * weights.rsi) + (macdScore * weights.macd) + (bollingerScore * weights.bollinger);

    // シグナルタイプを決定
    let type: 'BUY' | 'SELL' | 'HOLD';
    if (weightedScore > 0.2) {
      type = 'BUY';
    } else if (weightedScore < -0.2) {
      type = 'SELL';
    } else {
      type = 'HOLD';
    }

    // 確率（0-1）と強さを決定
    const probability = Math.min(Math.abs(weightedScore), 1.0);
    const strength = probability < 0.4 ? 'WEAK' : probability < 0.7 ? 'MODERATE' : 'STRONG';

    // コンフィデンス（0-100）を計算
    const confidence = Math.min(Math.abs(weightedScore) * 100, 95);
    const finalConfidence = type === 'HOLD' ? Math.max(confidence, ALERT_SEVERITY_THRESHOLDS.MIN_HOLD_CONFIDENCE) : Math.max(confidence, ALERT_SEVERITY_THRESHOLDS.MIN_STANDARD_CONFIDENCE);

    // 理由を生成
    const signals = { rsi: rsiSignal, macd: macdSignal, bollinger: bollingerSignal };
    const reason = this.generateConsensusReason(type, signals, weightedScore);

    return {
      type,
      probability,
      strength,
      confidence: finalConfidence,
      signals,
      reason
    };
  }

  /**
   * コンセンサス理由を生成
   */
  private generateConsensusReason(
    type: 'BUY' | 'SELL' | 'HOLD',
    signals: { rsi: IndicatorSignal; macd: IndicatorSignal; bollinger: IndicatorSignal },
    weightedScore: number
  ): string {
    const agreements = [
      signals.rsi.type === type ? 'RSI' : null,
      signals.macd.type === type ? 'MACD' : null,
      signals.bollinger.type === type ? 'ボリンジャーバンド' : null
    ].filter(Boolean);

    const prefix = type === 'BUY' ? '【買い】' : type === 'SELL' ? '【売り】' : '【观望】';

    if (agreements.length >= 2) {
      return `${prefix}${agreements.join('・')}が一致する強いシグナル（確率: ${(Math.abs(weightedScore) * 100).toFixed(0)}%）`;
    }

    if (agreements.length === 1) {
      return `${prefix}${agreements[0]}ベースのシグナル（確率: ${(Math.abs(weightedScore) * 100).toFixed(0)}%）`;
    }

    return `${prefix}指標が分散しており、混合シグナル（確率: ${(Math.abs(weightedScore) * 100).toFixed(0)}%）`;
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

  /**
   * 値を範囲内にマッピング
   */
  private mapRange(value: number, inMin: number, inMax: number, outMin: number, outMax: number): number {
    if (inMin === inMax) return outMin;
    const clamped = Math.max(inMin, Math.min(value, inMax));
    return ((clamped - inMin) / (inMax - inMin)) * (outMax - outMin) + outMin;
  }

}

export const consensusSignalService = new ConsensusSignalService();
