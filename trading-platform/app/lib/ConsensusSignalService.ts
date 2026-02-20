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
import { MLModelService } from '@/app/domains/prediction/services/ml-model-service';
import { PredictionFeatures } from '@/app/domains/prediction/types';
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
  private mlService: MLModelService;
  private weightCalculator: AdaptiveWeightCalculator;

  constructor(regimeDetector?: MarketRegimeDetector, mlService?: MLModelService) {
    this.regimeDetector = regimeDetector || new MarketRegimeDetector();
    this.mlService = mlService || new MLModelService();
    this.weightCalculator = new AdaptiveWeightCalculator();
  }

  /**
   * メインメソッド：コンセンサスシグナルを生成（Phase 2: ML統合）
   */
  generateConsensus(data: OHLCV[], customWeights?: Partial<ConsensusWeights>): ConsensusSignal {
    if (data.length < 50) {
      return this.createHoldSignal('データ不足のためシグナルを生成できません');
    }

    const closes = data.map(d => d.close);
    const volumes = data.map(d => d.volume);

    // 各指標を計算
    const rsi = technicalIndicatorService.calculateRSI(closes, RSI_CONFIG.DEFAULT_PERIOD);
    const macd = technicalIndicatorService.calculateMACD(closes);
    const bollinger = technicalIndicatorService.calculateBollingerBands(
      closes,
      BOLLINGER_BANDS.PERIOD,
      BOLLINGER_BANDS.STD_DEVIATION
    );
    const sma20 = technicalIndicatorService.calculateSMA(closes, 20);
    const sma5 = technicalIndicatorService.calculateSMA(closes, 5);
    const sma50 = technicalIndicatorService.calculateSMA(closes, 50);

    // 市場レジームを判定
    let regime: MarketRegime;
    try {
      regime = this.regimeDetector.detect(data);
    } catch (e) {
      // エラーログ出力
      logger.error('MarketRegimeDetector failed to detect regime:', e instanceof Error ? e : new Error(String(e)));
      // フォールバック
      regime = { type: 'RANGING', volatilityLevel: 'NORMAL', trendStrength: 0, momentumQuality: 0 };
    }

    // 各指標からシグナルを生成
    const currentPrice = closes[closes.length - 1];
    const currentRSI = rsi[rsi.length - 1];
    const currentSMA = sma20[sma20.length - 1];

    const rsiSignal = this.generateRSISignal(rsi, currentPrice);
    const macdSignal = this.generateMACDSignal(macd, currentPrice);
    const bollingerSignal = this.generateBollingerSignal(bollinger, currentPrice);

    // Phase 2: ML予測を実行
    const mlFeatures = this.extractMLFeatures(data, rsi, macd, bollinger, sma5, sma20, sma50);
    const mlPrediction = this.mlService.predict(mlFeatures);
    const mlSignal = this.convertMLPredictionToSignal(mlPrediction);

    // 重みを取得（AdaptiveWeightCalculatorで動的調整）
    const adaptiveWeights = this.weightCalculator.calculate(regime);
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

    // Phase 2: ML予測とテクニカル予測の一致判定（改善版）
    const technicalSignal = consensus.type;
    const mlConsensusSignal = mlSignal.type;
    
    
    // 両方が一致する場合: 信頼度をブースト
    if (technicalSignal !== 'HOLD' && mlConsensusSignal !== 'HOLD' && technicalSignal === mlConsensusSignal) {
      const boostedConfidence = Math.min(consensus.confidence + 10, 95);
      return {
        ...consensus,
        confidence: boostedConfidence,
        reason: consensus.reason + ` [ML: モデル一致(${mlSignal.confidence.toFixed(0)}%)]`
      };
    } else if (technicalSignal !== 'HOLD' && mlConsensusSignal !== 'HOLD' && technicalSignal !== mlConsensusSignal) {
      // 不一致の場合: テクニカルシグナルを優先（MLを無視）
      logger.info(`ML/Technical mismatch detected: Technical=${technicalSignal}, ML=${mlConsensusSignal}, using technical signal`);
      return {
        ...consensus,
        reason: consensus.reason + ` [ML: 無視(${mlSignal.type})]`
      };
    }

    return consensus;
  }

  /**
   * ML用の特徴量を抽出
   */
  private extractMLFeatures(
    data: OHLCV[],
    rsi: number[],
    macd: { macd: number[]; signal: number[]; histogram: number[] },
    bollinger: { upper: number[]; middle: number[]; lower: number[] },
    sma5: number[],
    sma20: number[],
    sma50: number[]
  ): PredictionFeatures {
    const len = data.length;
    const currentPrice = data[len - 1].close;
    const prevPrice = data[len - 2].close;
    const priceMomentum = ((currentPrice - prevPrice) / prevPrice) * 100;
    
    // ボリューム比率（直近5日平均 / 直近20日平均）
    const recentVolume = data.slice(-5).reduce((sum, d) => sum + d.volume, 0) / 5;
    const longVolume = data.slice(-20).reduce((sum, d) => sum + d.volume, 0) / 20;
    const volumeRatio = longVolume > 0 ? recentVolume / longVolume : 1;
    
    // ATR計算（簡易版）
    const atr = data.slice(-14).reduce((sum, d) => sum + (d.high - d.low), 0) / 14;
    const atrPercent = (atr / currentPrice) * 100;
    
    // MACDシグナル
    const macdSignal = macd.histogram[macd.histogram.length - 1];
    
    // ボリンジャーバンド位置
    const bbUpper = bollinger.upper[bollinger.upper.length - 1];
    const bbLower = bollinger.lower[bollinger.lower.length - 1];
    const bbPosition = bbUpper !== bbLower ? 
      (currentPrice - bbLower) / (bbUpper - bbLower) : 0.5;

    return {
      rsi: rsi[rsi.length - 1],
      rsiChange: rsi[rsi.length - 1] - rsi[rsi.length - 2],
      sma5: sma5[len - 1] > 0 ? ((currentPrice - sma5[len - 1]) / sma5[len - 1]) * 100 : 0,
      sma20: sma20[len - 1] > 0 ? ((currentPrice - sma20[len - 1]) / sma20[len - 1]) * 100 : 0,
      sma50: sma50[len - 1] > 0 ? ((currentPrice - sma50[len - 1]) / sma50[len - 1]) * 100 : 0,
      priceMomentum,
      volumeRatio,
      volatility: atrPercent,
      macdSignal,
      bollingerPosition: bbPosition,
      atrPercent
    };
  }

  /**
   * ML予測結果をシグナルに変換
   */
  private convertMLPredictionToSignal(mlPrediction: { ensemblePrediction: number; confidence: number }): { type: 'BUY' | 'SELL' | 'HOLD'; confidence: number } {
    const threshold = 0.5;
    
    if (mlPrediction.ensemblePrediction > threshold) {
      return { type: 'BUY', confidence: mlPrediction.confidence };
    } else if (mlPrediction.ensemblePrediction < -threshold) {
      return { type: 'SELL', confidence: mlPrediction.confidence };
    }
    
    return { type: 'HOLD', confidence: mlPrediction.confidence };
  }

  // ... (generateRSISignal, generateMACDSignal, generateBollingerSignal methods remain unchanged) ...
  /**
   * RSIからのシグナル生成
   * 単一の値だけでなく、ボトムアウト（反転上昇）も評価する
   */
  private generateRSISignal(rsi: number[], currentPrice: number): IndicatorSignal {
    const len = rsi.length;
    const currentRSI = rsi[len - 1];
    const prevRSI = rsi[len - 2];

    if (isNaN(currentRSI)) {
      return { type: 'NEUTRAL', strength: 0, reason: 'RSIデータ不足' };
    }

    // RSIのボトムアウト（底打ち反転）判定
    // 前日に売られすぎ水準(<30)にあり、本日急上昇している場合
    if (prevRSI < RSI_CONFIG.OVERSOLD && currentRSI > prevRSI + 5) {
      const recoveryStrength = Math.min((currentRSI - prevRSI) / 10, 1.0);
      return {
        type: 'BUY',
        strength: Math.max(recoveryStrength, 0.7), // 強い反発シグナル
        reason: `RSIの底打ち反転を検知（${prevRSI.toFixed(1)} -> ${currentRSI.toFixed(1)}）`
      };
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
   * ヒストグラムの絶対値だけでなく、変化（縮小・拡大）も評価に含める
   */
  private generateMACDSignal(macd: { macd: number[]; signal: number[]; histogram: number[] }, currentPrice: number): IndicatorSignal {
    const len = macd.histogram.length;
    const currentHist = macd.histogram[len - 1];
    const prevHist = macd.histogram[len - 2];

    if (isNaN(currentHist) || isNaN(prevHist)) {
      return { type: 'NEUTRAL', strength: 0, reason: 'MACDデータ不足' };
    }

    // ヒストグラムが正（強気圏）
    if (currentHist > 0) {
      const isExpanding = currentHist > prevHist;
      const strength = Math.min(Math.abs(currentHist) / currentPrice * 100 * (isExpanding ? 1.5 : 1.0), 1.0);
      return {
        type: 'BUY',
        strength: Math.max(strength, isExpanding ? 0.4 : 0.2),
        reason: `MACD強気圏（ヒストグラム: ${currentHist.toFixed(4)}${isExpanding ? '・拡大中' : '・縮小中'}）`
      };
    }

    // ヒストグラムが負（弱気圏）
    if (currentHist < 0) {
      const isShrinking = currentHist > prevHist; // 負の値が大きくなる（0に近づく）＝縮小
      
      if (isShrinking) {
        // 弱気圏だが底打ちの兆候
        const strength = Math.min(Math.abs(currentHist) / currentPrice * 50, 0.5);
        return {
          type: 'BUY',
          strength: Math.max(strength, 0.3), // 逆張り的な買い予兆
          reason: `MACD弱気圏だが底打ち兆候（ヒストグラム縮小: ${currentHist.toFixed(4)}）`
        };
      }

      const strength = Math.min(Math.abs(currentHist) / currentPrice * 100, 1.0);
      return {
        type: 'SELL',
        strength: Math.max(strength, 0.4),
        reason: `MACD弱気圏（ヒストグラム拡大: ${currentHist.toFixed(4)}）`
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
   * 動的閾値を計算（Phase 3: 市場状況に応じた調整）
   */
  private calculateDynamicThreshold(regime: MarketRegime, baseThreshold: number): number {
    // ボラティリティに応じた調整
    if (regime.volatilityLevel === 'HIGH' || regime.volatilityLevel === 'EXTREME') {
      return baseThreshold * 1.3; // 高ボラティリティ時は閾値を上げて厳格化
    } else if (regime.volatilityLevel === 'LOW') {
      return baseThreshold * 0.9; // 低ボラティリティ時は閾値を下げて緩和
    }
    return baseThreshold;
  }

  /**
   * 過去実績に基づく信頼度調整（Phase 3: フィードバックループ）
   */
  private adjustConfidenceByHistory(baseConfidence: number, signalType: 'BUY' | 'SELL' | 'HOLD'): number {
    try {
      const stats = useSignalHistoryStore.getState().getStatsByConfidence();
      
      if (stats.totalSignals < 20) {
        // データが不足している場合は調整なし
        return baseConfidence;
      }

      const historicalHitRate = stats.hitRate / 100;
      
      // 過去の的中率に基づいて信頼度を調整
      if (historicalHitRate > 0.65) {
        // 高い的中率の場合、信頼度をブースト
        return Math.min(baseConfidence * 1.1, 95);
      } else if (historicalHitRate < 0.45) {
        // 低い的中率の場合、信頼度を下げる
        return baseConfidence * 0.85;
      }
      
      return baseConfidence;
    } catch (e) {
      // ストアが利用できない場合は調整なし
      return baseConfidence;
    }
  }

  /**
   * ATRベース動的ストップロスを計算（Phase 3）
   */
  calculateDynamicStopLoss(
    entryPrice: number,
    signalType: 'BUY' | 'SELL',
    atr: number,
    multiplier: number = 2.0
  ): number {
    const stopDistance = atr * multiplier;
    
    if (signalType === 'BUY') {
      return entryPrice - stopDistance;
    } else if (signalType === 'SELL') {
      return entryPrice + stopDistance;
    }
    
    return entryPrice;
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
    // 買いシグナルのスコアを計算（BUY=+1, SELL=-1, NEUTRAL=0）
    const rsiScore = rsiSignal.type === 'BUY' ? rsiSignal.strength : rsiSignal.type === 'SELL' ? -rsiSignal.strength : 0;
    const macdScore = macdSignal.type === 'BUY' ? macdSignal.strength : macdSignal.type === 'SELL' ? -macdSignal.strength : 0;
    const bollingerScore = bollingerSignal.type === 'BUY' ? bollingerSignal.strength : bollingerSignal.type === 'SELL' ? -bollingerSignal.strength : 0;

    // 加重平均を計算
    let weightedScore = (rsiScore * weights.rsi) + (macdScore * weights.macd) + (bollingerScore * weights.bollinger);

    // 【アンサンブル・ロジック】指標間の相関による確信度ブースト
    let ensembleBonus = 0;
    let strategyReason = '';
    
    // Phase 1: トレンド重視戦略の適用
    // レンジ相場またはボラティリティが高い場合はシグナルを抑制（強制HOLD）
    if (regime.type === 'RANGING' || regime.type === 'VOLATILE') {
      weightedScore = 0;
      strategyReason = ` [Filter: ${regime.type}相場のため除外]`;
    } else if (regime.type === 'TRENDING_UP') {
      // 上昇トレンド条件: 価格 > SMA20 かつ RSI中立(40-60)
      if (currentPrice > currentSMA && currentRSI >= CONSENSUS_SIGNAL_CONFIG.TREND_FOLLOWING.RSI_LOWER_BOUND && currentRSI <= CONSENSUS_SIGNAL_CONFIG.TREND_FOLLOWING.RSI_UPPER_BOUND) {
        weightedScore += CONSENSUS_SIGNAL_CONFIG.TREND_FOLLOWING.BOOST_AMOUNT; // 強力なブースト
        strategyReason = ` [Trend: 上昇トレンド順張り (Price>SMA, RSI=${currentRSI.toFixed(1)})]`;
      }
    } else if (regime.type === 'TRENDING_DOWN') {
      // 下降トレンド条件: 価格 < SMA20 かつ RSI中立(40-60)
      if (currentPrice < currentSMA && currentRSI >= CONSENSUS_SIGNAL_CONFIG.TREND_FOLLOWING.RSI_LOWER_BOUND && currentRSI <= CONSENSUS_SIGNAL_CONFIG.TREND_FOLLOWING.RSI_UPPER_BOUND) {
        weightedScore -= CONSENSUS_SIGNAL_CONFIG.TREND_FOLLOWING.PENALTY_AMOUNT; // 強力なペナルティ（売り方向）
        strategyReason = ` [Trend: 下降トレンド順張り (Price<SMA, RSI=${currentRSI.toFixed(1)})]`;
      }
    }

    // 従来のボーナス（トレンド条件が合致しない場合などの補助）
    if (!strategyReason) {
      // 1. 逆張り反転コンボ (RSI底打ち + MACDヒストグラム縮小)
      if (rsiSignal.type === 'BUY' && rsiSignal.reason.includes('反転') && 
          macdSignal.type === 'BUY' && macdSignal.reason.includes('底打ち')) {
        ensembleBonus += CONSENSUS_SIGNAL_CONFIG.ENSEMBLE.REVERSAL_COMBO_BONUS; // 強い反転の兆候
      }
      
      // 2. 乖離からの復帰 (BB下部 + RSI上昇)
      if (bollingerSignal.type === 'BUY' && rsiSignal.type === 'BUY') {
        ensembleBonus += CONSENSUS_SIGNAL_CONFIG.ENSEMBLE.BB_RSI_ALIGNMENT_BONUS;
      }

      // スコアにボーナスを適用
      if (weightedScore > 0) weightedScore += ensembleBonus;
      else if (weightedScore < 0) weightedScore -= ensembleBonus;
    }

    // Phase 3: 動的閾値を適用（市場状況に応じた調整）
    const baseThreshold = CONSENSUS_SIGNAL_CONFIG.THRESHOLDS.SIGNAL_MIN;
    const dynamicThreshold = this.calculateDynamicThreshold(regime, baseThreshold);
    
    // シグナルタイプを決定
    let type: 'BUY' | 'SELL' | 'HOLD';
    
    if (weightedScore > dynamicThreshold) {
      type = 'BUY';
    } else if (weightedScore < -dynamicThreshold) {
      type = 'SELL';
    } else {
      type = 'HOLD';
    }

    // 確率（0-1）と強さを決定
    const probability = Math.min(Math.abs(weightedScore), 1.0);
    const strength = probability < CONSENSUS_SIGNAL_CONFIG.THRESHOLDS.PROBABILITY_WEAK ? 'WEAK' : 
                     probability < CONSENSUS_SIGNAL_CONFIG.THRESHOLDS.PROBABILITY_MODERATE ? 'MODERATE' : 'STRONG';

    // コンフィデンス（0-100）を計算 - 改善版: 動的範囲マッピング
    let confidence: number;
    
    if (type === 'HOLD') {
      confidence = this.mapRange(
        Math.abs(weightedScore),
        0, CONSENSUS_SIGNAL_CONFIG.THRESHOLDS.SIGNAL_MIN,
        CONSENSUS_SIGNAL_CONFIG.THRESHOLDS.HOLD_CONFIDENCE_MIN, 50
      );
    } else {
      const absScore = Math.abs(weightedScore);
      if (absScore < 0.3) {
        confidence = this.mapRange(absScore, CONSENSUS_SIGNAL_CONFIG.THRESHOLDS.SIGNAL_MIN, 0.3, 65, 75);
      } else if (absScore < 0.6) {
        confidence = this.mapRange(absScore, 0.3, 0.6, 75, 85);
      } else {
        confidence = this.mapRange(absScore, 0.6, 1.0, 85, CONSENSUS_SIGNAL_CONFIG.THRESHOLDS.CONFIDENCE_MAX);
      }
    }
    
    if (strategyReason.includes('Trend:')) {
      confidence = Math.max(confidence, CONSENSUS_SIGNAL_CONFIG.TREND_FOLLOWING.MIN_CONFIDENCE_BOOST);
    }

    confidence = this.adjustConfidenceByHistory(confidence, type);

    const finalConfidence = Math.min(Math.max(confidence, 
      type === 'HOLD' ? CONSENSUS_SIGNAL_CONFIG.THRESHOLDS.HOLD_CONFIDENCE_MIN : CONSENSUS_SIGNAL_CONFIG.THRESHOLDS.TRADE_CONFIDENCE_MIN
    ), CONSENSUS_SIGNAL_CONFIG.THRESHOLDS.CONFIDENCE_MAX);

    // デバッグログ: 各指標の寄与度を詳細に出力 (開発環境のみ)
    if (process.env.NODE_ENV !== 'production' && Math.abs(weightedScore) > 0.1) {
      const bonusStr = ensembleBonus > 0 ? ` (+Bonus: ${ensembleBonus.toFixed(2)})` : '';
      devLog(`[Consensus] ${type} (Score: ${weightedScore.toFixed(3)}${bonusStr}, Conf: ${finalConfidence.toFixed(1)}%) | Regime: ${regime.type} | RSI: ${rsiSignal.type}(${rsiSignal.strength.toFixed(2)}) MACD: ${macdSignal.type}(${macdSignal.strength.toFixed(2)}) BB: ${bollingerSignal.type}(${bollingerSignal.strength.toFixed(2)})`);
    }

    // 理由を生成
    const signals = { rsi: rsiSignal, macd: macdSignal, bollinger: bollingerSignal };
    let reason = this.generateConsensusReason(type, signals, weightedScore);
    
    if (strategyReason) {
      reason += strategyReason;
    }

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

    const prefix = type === 'BUY' ? '【買い】' : type === 'SELL' ? '【売り】' : '【様子見】';

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

  /**
   * ConsensusSignal を Signal に変換する
   * フォールバック用の簡易実装
   */
  convertToSignal(consensus: ConsensusSignal, symbol: string, data: OHLCV[]): Signal {
    const currentPrice = data[data.length - 1].close;
    const adjustment = consensus.confidence / 100 * 0.05; // 5% adjustment based on confidence
    
    let targetPrice: number;
    let stopLoss: number;
    if (consensus.type === 'BUY') {
      targetPrice = currentPrice * (1 + adjustment);
      stopLoss = currentPrice * (1 - adjustment * 1.5);
    } else if (consensus.type === 'SELL') {
      targetPrice = currentPrice * (1 - adjustment);
      stopLoss = currentPrice * (1 + adjustment * 1.5);
    } else {
      // HOLDの場合でも、完全に水平になるのを防ぐ
      // 1. 加重スコアに基づくバイアス
      let bias = consensus.probability * (consensus.signals.rsi.type === 'BUY' ? 1 : -1) * 0.01;
      
      // 2. スコアが0の場合、直近5日間のモメンタムを微弱に反映
      if (bias === 0 && data.length >= 5) {
        const last5 = data.slice(-5);
        const fiveDayReturn = (last5[last5.length - 1].close - last5[0].close) / last5[0].close;
        bias = fiveDayReturn * 0.1; // モメンタムの10%を予測に反映
      }
      
      // 3. それでも0（あるいは極小）なら、視覚的な傾き（0.2%）をランダムに付与
      if (Math.abs(bias) < 0.002) {
        const seed = symbol.charCodeAt(0) + symbol.length;
        bias = (seed % 2 === 0 ? 0.002 : -0.002);
      }

      targetPrice = currentPrice * (1 + bias);
      stopLoss = currentPrice;
    }
    
    const predictedChange = ((targetPrice - currentPrice) / currentPrice) * 100;
    const now = new Date();
    const predictionDate = now.toISOString().split('T')[0];
    
    const lastData = data[data.length - 1];
    const atr = lastData.high - lastData.low;
    
    return {
      symbol,
      type: consensus.type,
      confidence: consensus.confidence,
      targetPrice,
      stopLoss,
      reason: consensus.reason,
      predictedChange,
      predictionDate,
      atr
    };
  }

  /**
   * マルチ時間枠分析を使用した強化コンセンサスシグナル生成
   * 
   * 複数の時間枠から整合性を確認し、より信頼性の高いシグナルを生成します。
   */
  async generateEnhancedConsensus(
    data: OHLCV[],
    dataByTimeFrame?: Map<TimeFrame, OHLCV[]>,
    customWeights?: Partial<ConsensusWeights>
  ): Promise<ConsensusSignal> {
    // まず基本コンセンサスを生成
    const baseConsensus = this.generateConsensus(data, customWeights);

    // マルチ時間枠データがない場合は基本コンセンサスを返す
    if (!dataByTimeFrame || dataByTimeFrame.size === 0) {
      return baseConsensus;
    }

    try {
      // MultiTimeFrameStrategyを動的にインポート
      const { multiTimeFrameStrategy } = await import('./strategies/MultiTimeFrameStrategy');

      // シンボルはデータから推定（実際の使用では引数で渡すべき）
      const symbol = 'UNKNOWN';
      
      // マルチ時間枠分析を実行
      const mtfAnalysis = await multiTimeFrameStrategy.analyzeMultipleTimeFrames(
        symbol,
        dataByTimeFrame
      );

      // 時間枠間の整合性に基づいて信頼度を調整
      let enhancedConfidence = baseConsensus.confidence;
      let finalType = baseConsensus.type;
      let additionalReason = '';

      if (mtfAnalysis.alignment >= 0.7) {
        // 高い整合性の場合、信頼度を上げる
        enhancedConfidence = Math.min(baseConsensus.confidence + 15, 95);
        additionalReason = ` [MTF: 複数時間枠で高い整合性 ${(mtfAnalysis.alignment * 100).toFixed(0)}%]`;
      } else if (mtfAnalysis.divergenceDetected) {
        // 乖離が検出された場合、信頼度を下げる
        enhancedConfidence = Math.floor(baseConsensus.confidence * 0.7);
        additionalReason = ` [MTF: 時間枠間で乖離を検出]`;
        
        // 乖離が大きい場合はHOLDに変更
        if (mtfAnalysis.alignment < 0.4) {
          finalType = 'HOLD';
          additionalReason += ' 様子見を推奨';
        }
      }

      // マルチ時間枠のトレンド方向も考慮
      if (mtfAnalysis.trendDirection === 'bullish' && baseConsensus.type === 'BUY') {
        enhancedConfidence = Math.min(enhancedConfidence + 5, 95);
      } else if (mtfAnalysis.trendDirection === 'bearish' && baseConsensus.type === 'SELL') {
        enhancedConfidence = Math.min(enhancedConfidence + 5, 95);
      }

      return {
        ...baseConsensus,
        type: finalType,
        confidence: enhancedConfidence,
        reason: baseConsensus.reason + additionalReason,
      };
    } catch (error) {
      // エラーが発生した場合は基本コンセンサスを返す
      logger.error('Multi-timeframe consensus analysis failed:', error instanceof Error ? error : new Error(String(error)));
      return baseConsensus;
    }
  }

}

// Export both the class and a singleton instance
export { ConsensusSignalService };
export const consensusSignalService = new ConsensusSignalService();
