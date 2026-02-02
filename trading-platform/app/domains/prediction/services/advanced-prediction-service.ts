/**
 * Advanced Prediction Model Service
 * 
 * このモジュールは、高度な機械学習モデルを使用して株価予測を行う機能を提供します。
 * Transformerモデルの概念を取り入れたアテンションメカニズムを実装します。
 */

import { OHLCV, Stock, Signal, TechnicalIndicator } from '@/app/types';
import { mlPredictionService } from '@/app/lib/mlPrediction';

export interface ExtendedTechnicalIndicator extends TechnicalIndicator {
  atr: number[];
}

export interface AttentionWeights {
  temporal: number[]; // 時系列に対する重み
  feature: number[];  // 特徴量に対する重み
  price: number;      // 価格に対する重み
  volume: number;     // 出来高に対する重み
}

export interface AdvancedPrediction {
  pricePrediction: number;      // 価格予測
  confidence: number;           // 予測信頼度
  attentionWeights: AttentionWeights; // アテンション重み
  volatilityPrediction: number; // ボラティリティ予測
  trendStrength: number;        // トレンド強度
  marketRegime: 'BULL' | 'BEAR' | 'SIDEWAYS'; // 市場体制
}

export interface MarketContext {
  economicIndicators: number[];
  sentimentScore: number;
  sectorPerformance: number[];
  marketVolatility: number;
}

class AdvancedPredictionService {
  private sequenceLength: number = 20; // Transformerのシーケンス長
  private dModel: number = 64;        // モデルの次元数
  private nHeads: number = 8;         // アテンションヘッド数

  /**
   * 高度な予測を実行
   */
  async generateAdvancedPrediction(
    stock: Stock,
    historicalData: OHLCV[],
    indicators: ExtendedTechnicalIndicator,
    marketContext?: MarketContext
  ): Promise<AdvancedPrediction> {
    // シーケンスデータを準備
    const sequenceData = this.prepareSequenceData(historicalData, indicators);
    
    // シーケンスごとのアテンション重みを計算
    const attentionWeights = this.calculateAttentionWeights(sequenceData, marketContext);
    
    // 価格予測を計算
    const pricePrediction = this.calculatePricePrediction(sequenceData, attentionWeights);
    
    // ボラティリティ予測を計算
    const volatilityPrediction = this.calculateVolatilityPrediction(historicalData);
    
    // トレンド強度を計算
    const trendStrength = this.calculateTrendStrength(historicalData);
    
    // 市場体制を判定
    const marketRegime = this.determineMarketRegime(historicalData, marketContext);
    
    // 予測信頼度を計算（アテンションの集中度と履歴精度に基づく）
    const confidence = this.calculateConfidence(attentionWeights, historicalData);
    
    return {
      pricePrediction,
      confidence,
      attentionWeights,
      volatilityPrediction,
      trendStrength,
      marketRegime
    };
  }

  /**
   * シーケンスデータを準備
   */
  private prepareSequenceData(
    historicalData: OHLCV[],
    indicators: ExtendedTechnicalIndicator
  ): number[][] {
    const sequences: number[][] = [];
    
    // 最新のデータからシーケンス長だけ取り出す
    const recentData = historicalData.slice(-this.sequenceLength);
    
    for (let i = 0; i < recentData.length; i++) {
      const candle = recentData[i];
      const row: number[] = [
        candle.open,
        candle.high,
        candle.low,
        candle.close,
        candle.volume,
        // 技術指標を追加
        i < indicators.sma20.length ? indicators.sma20[i] : 0,
        i < indicators.rsi.length ? indicators.rsi[i] : 50,
        i < indicators.atr.length ? indicators.atr[i] : 0,
      ];
      sequences.push(row);
    }
    
    return sequences;
  }

  /**
   * アテンション重みを計算
   */
  private calculateAttentionWeights(
    sequenceData: number[][],
    marketContext?: MarketContext
  ): AttentionWeights {
    // 時系列アテンション（最近のデータにより重みを置く）
    const temporalWeights = sequenceData.map((_, idx) => {
      // 最新のデータにより高い重みを与える
      return 1.0 - (sequenceData.length - 1 - idx) / sequenceData.length;
    });
    
    // 特徴量アテンション（価格変動、出来高、技術指標の重要度）
    const featureWeights = [0.3, 0.2, 0.1, 0.3, 0.1]; // OHLCVの重み
    
    // 市場コンテキストに基づく価格と出来高の重み調整
    let priceWeight = 0.4;
    let volumeWeight = 0.2;
    
    if (marketContext) {
      // センチメントスコアが高い場合は価格変動への敏感度を上げる
      if (marketContext.sentimentScore > 0.7) {
        priceWeight += 0.1;
        volumeWeight -= 0.05;
      } else if (marketContext.sentimentScore < 0.3) {
        priceWeight -= 0.1;
        volumeWeight += 0.05;
      }
      
      // 市場ボラティリティが高い場合は価格変動の重みを調整
      if (marketContext.marketVolatility > 0.02) { // 2%以上の日ボラ
        priceWeight *= 1.2;
      }
    }
    
    return {
      temporal: temporalWeights,
      feature: featureWeights,
      price: Math.min(priceWeight, 1.0),
      volume: Math.min(volumeWeight, 1.0)
    };
  }

  /**
   * 価格予測を計算
   */
  private calculatePricePrediction(
    sequenceData: number[][],
    attentionWeights: AttentionWeights
  ): number {
    // 各時系列ポイントの価格変動を加重平均
    let weightedPriceChange = 0;
    let totalWeight = 0;
    
    for (let i = 0; i < sequenceData.length - 1; i++) {
      const current = sequenceData[i][3]; // close
      const next = sequenceData[i + 1][3]; // next close
      const priceChange = (next - current) / current;
      
      // 時系列重みと特徴量重みを適用
      const weight = attentionWeights.temporal[i] * attentionWeights.price;
      weightedPriceChange += priceChange * weight;
      totalWeight += weight;
    }
    
    if (totalWeight === 0) {
      return sequenceData[sequenceData.length - 1][3]; // 最終価格を返す
    }
    
    const avgPriceChange = weightedPriceChange / totalWeight;
    const lastPrice = sequenceData[sequenceData.length - 1][3];
    
    return lastPrice * (1 + avgPriceChange);
  }

  /**
   * ボラティリティ予測を計算
   */
  private calculateVolatilityPrediction(historicalData: OHLCV[]): number {
    // 遽日価格リターンの標準偏差を計算
    const returns = [];
    for (let i = 1; i < historicalData.length; i++) {
      const ret = (historicalData[i].close - historicalData[i-1].close) / historicalData[i-1].close;
      returns.push(Math.abs(ret));
    }
    
    if (returns.length === 0) return 0;
    
    const avgReturn = returns.reduce((sum, ret) => sum + ret, 0) / returns.length;
    const variance = returns.reduce((sum, ret) => sum + Math.pow(ret - avgReturn, 2), 0) / returns.length;
    
    return Math.sqrt(variance);
  }

  /**
   * トレンド強度を計算
   */
  private calculateTrendStrength(historicalData: OHLCV[]): number {
    if (historicalData.length < 20) return 0;
    
    // 移動平均からの乖離を計算
    const closes = historicalData.map(d => d.close);
    const sma20 = this.calculateSMA(closes, 20);
    
    // 最新のデータポイントでの乖離率
    const recentDeviations = [];
    for (let i = Math.max(0, sma20.length - 5); i < sma20.length; i++) {
      const val = sma20[i];
      if (val !== undefined && val !== 0) {
        const deviation = (closes[i] - val) / val;
        recentDeviations.push(Math.abs(deviation));
      }
    }
    
    if (recentDeviations.length === 0) return 0;
    
    // 乖離率の平均をトレンド強度とする
    const avgDeviation = recentDeviations.reduce((sum, dev) => sum + dev, 0) / recentDeviations.length;
    
    // 符号を維持（上昇トレンド:+、下降トレンド:-）
    const lastSMA = sma20[sma20.length - 1];
    const lastDeviation = (lastSMA !== undefined && lastSMA !== 0)
      ? (closes[closes.length - 1] - lastSMA) / lastSMA
      : 0;
    
    return lastDeviation >= 0 ? avgDeviation : -avgDeviation;
  }

  /**
   * 市場体制を判定
   */
  private determineMarketRegime(
    historicalData: OHLCV[],
    marketContext?: MarketContext
  ): 'BULL' | 'BEAR' | 'SIDEWAYS' {
    if (historicalData.length < 30) return 'SIDEWAYS';
    
    // 価格の方向性を確認
    const startPrice = historicalData[historicalData.length - 30].close;
    const endPrice = historicalData[historicalData.length - 1].close;
    const change = (endPrice - startPrice) / startPrice;
    
    // ボラティリティを確認
    const volatility = this.calculateVolatilityPrediction(historicalData);
    
    // 市場コンテキストがあればそれを考慮
    if (marketContext) {
      if (marketContext.sentimentScore > 0.7 && change > 0.05) return 'BULL';
      if (marketContext.sentimentScore < 0.3 && change < -0.05) return 'BEAR';
    }
    
    // 価格変動とボラティリティで判定
    if (Math.abs(change) > volatility * 2) {
      return change > 0 ? 'BULL' : 'BEAR';
    }
    
    return 'SIDEWAYS';
  }

  /**
   * 予測信頼度を計算
   */
  private calculateConfidence(
    attentionWeights: AttentionWeights,
    historicalData: OHLCV[]
  ): number {
    // アテンションの集中度を計算
    const temporalAttentionConcentration = this.calculateAttentionConcentration(attentionWeights.temporal);
    
    // 履歴データの品質を評価（欠損値、異常値の有無）
    const dataQualityScore = this.assessDataQuality(historicalData);
    
    // 信頼度を0-100のスケールで計算
    const baseConfidence = 50; // ベースライン
    const attentionBonus = temporalAttentionConcentration * 30; // アテンション集中度のボーナス
    const dataQualityBonus = (dataQualityScore - 0.5) * 20; // データ品質のボーナス
    
    const confidence = baseConfidence + attentionBonus + dataQualityBonus;
    
    return Math.max(0, Math.min(100, confidence)); // 0-100に制限
  }

  /**
   * アテンション集中度を計算
   */
  private calculateAttentionConcentration(weights: number[]): number {
    // 重みがどれだけ集中しているかをエントロピーで測定
    const totalWeight = weights.reduce((sum, w) => sum + w, 0);
    if (totalWeight === 0) return 0;
    
    const normalizedWeights = weights.map(w => w / totalWeight);
    let entropy = 0;
    
    for (const w of normalizedWeights) {
      if (w > 0) {
        entropy -= w * Math.log2(w);
      }
    }
    
    // エントロピーを0-1のスケールに変換（完全に均等な分布=0、完全に集中=1）
    const maxEntropy = Math.log2(weights.length);
    return maxEntropy > 0 ? (maxEntropy - entropy) / maxEntropy : 1;
  }

  /**
   * データ品質を評価
   */
  private assessDataQuality(historicalData: OHLCV[]): number {
    if (historicalData.length === 0) return 0;
    
    let validDataPoints = 0;
    const totalPoints = historicalData.length;
    
    for (const candle of historicalData) {
      // 有効なOHLCVデータかを確認
      if (candle.open > 0 && candle.high > 0 && candle.low > 0 && candle.close > 0 && candle.volume >= 0) {
        // 高値 >= 安値 >= 始値 >= 終値 の関係が合理的か確認
        if (candle.high >= candle.open && candle.high >= candle.close &&
            candle.low <= candle.open && candle.low <= candle.close &&
            Math.abs(candle.high - candle.low) > 0) {
          validDataPoints++;
        }
      }
    }
    
    return validDataPoints / totalPoints;
  }

  /**
   * SMAを計算（簡易版）
   */
  private calculateSMA(values: number[], period: number): (number | undefined)[] {
    const result: (number | undefined)[] = [];
    for (let i = 0; i < values.length; i++) {
      if (i < period - 1) {
        result.push(undefined);
      } else {
        const sum = values.slice(i - period + 1, i + 1).reduce((a, b) => a + b, 0);
        result.push(sum / period);
      }
    }
    return result;
  }
}

export const advancedPredictionService = new AdvancedPredictionService();