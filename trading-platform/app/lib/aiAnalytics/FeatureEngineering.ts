/**
 * FeatureEngineering.ts
 * 
 * 機械学習モデル用の特徴量エンジニアリングクラス。
 * テクニカル指標の拡張、特徴量の重要性分析、正規化などを提供します。
 */

import { OHLCV } from '../../types/shared';
import {
  calculateSMA,
  calculateRSI,
  calculateMACD,
  calculateBollingerBands,
  calculateATR,
} from '../utils';

/**
 * マクロ経済指標
 */
export interface MacroIndicators {
  vix?: number;              // VIX指数（恐怖指数）
  interestRate?: number;      // 金利
  dollarIndex?: number;       // ドル指数
  bondYield?: number;         // 国債利回り
  sectorPerformance?: {       // セクターパフォーマンス
    [sector: string]: number;
  };
}

/**
 * ニュース感情スコア
 */
export interface NewsSentiment {
  positive: number;   // ポジティブスコア (0-1)
  negative: number;   // ネガティブスコア (0-1)
  neutral: number;    // ニュートラルスコア (0-1)
  overall: number;    // 総合スコア (-1 to 1)
  confidence: number; // 信頼度 (0-1)
}

/**
 * 時系列特徴量
 */
export interface TimeSeriesFeatures {
  rollingMean5: number;
  rollingMean20: number;
  rollingStd5: number;
  rollingStd20: number;
  exponentialMA: number;
  momentumChange: number;
  priceAcceleration: number;
  volumeAcceleration: number;
  autocorrelation: number;
  fourierDominantFreq?: number;
  fourierAmplitude?: number;
}

/**
 * 拡張テクニカル特徴量
 */
export interface ExtendedTechnicalFeatures {
  // 既存の基本指標
  rsi: number;
  rsiChange: number;
  sma5: number;
  sma20: number;
  sma50: number;
  priceMomentum: number;
  volumeRatio: number;
  volatility: number;
  macdSignal: number;
  bollingerPosition: number;
  atrPercent: number;
  
  // 新しい拡張指標
  momentum: number;
  rateOfChange: number;
  stochasticRSI: number;
  williamsR: number;
  cci: number;
  atrRatio: number;
  volumeProfile: number;
  pricePosition: number;
  
  // モメンタム系
  momentumTrend: 'STRONG_UP' | 'UP' | 'NEUTRAL' | 'DOWN' | 'STRONG_DOWN';
  
  // ボラティリティ系
  volatilityRegime: 'LOW' | 'NORMAL' | 'HIGH';
  
  // マクロ指標 (オプショナル)
  macroIndicators?: MacroIndicators;
  
  // ニュース感情 (オプショナル)
  sentiment?: NewsSentiment;
  
  // 時系列特徴量 (オプショナル)
  timeSeriesFeatures?: TimeSeriesFeatures;
}

/**
 * 特徴量の重要性スコア
 */
export interface FeatureImportance {
  name: string;
  score: number;
  rank: number;
  category: 'trend' | 'momentum' | 'volatility' | 'volume';
}

/**
 * 特徴量エンジニアリングクラス
 */
export class FeatureEngineering {
  /**
   * 拡張テクニカル特徴量を計算
   * 
   * @param data - OHLCVデータ配列
   * @param currentPrice - 現在価格
   * @param averageVolume - 平均出来高
   * @param macroIndicators - マクロ経済指標 (オプション)
   * @param newsTexts - ニュースデータ (オプション)
   * @returns 拡張されたテクニカル特徴量
   */
  calculateExtendedFeatures(
    data: OHLCV[],
    currentPrice: number,
    averageVolume: number,
    macroIndicators?: MacroIndicators,
    newsTexts?: string[]
  ): ExtendedTechnicalFeatures {
    if (data.length < 50) {
      throw new Error('Insufficient data for feature calculation (minimum 50 data points required)');
    }

    const prices = data.map(d => d.close);
    const volumes = data.map(d => d.volume);
    const highs = data.map(d => d.high);
    const lows = data.map(d => d.low);
    
    // 基本指標の計算
    const rsi = calculateRSI(prices, 14);
    const sma5 = calculateSMA(prices, 5);
    const sma20 = calculateSMA(prices, 20);
    const sma50 = calculateSMA(prices, 50);
    const macd = calculateMACD(prices);
    const bollingerBands = calculateBollingerBands(prices, 20, 2);
    const atr = calculateATR(highs, lows, prices, 14);
    
    // 現在値の取得
    const currentRSI = this.last(rsi, 50);
    const prevRSI = this.at(rsi, rsi.length - 2, 50);
    const currentVolume = this.last(volumes, 0);
    
    // 基本特徴量
    const rsiChange = currentRSI - prevRSI;
    const sma5Dev = (currentPrice - this.last(sma5, currentPrice)) / currentPrice * 100;
    const sma20Dev = (currentPrice - this.last(sma20, currentPrice)) / currentPrice * 100;
    const sma50Dev = (currentPrice - this.last(sma50, currentPrice)) / currentPrice * 100;
    const priceMomentum = this.calculateMomentum(prices, 10);
    const volumeRatio = currentVolume / (averageVolume || 1);
    const volatility = this.calculateVolatility(prices.slice(-20), 20);
    const macdSignal = this.last(macd.macd, 0) - this.last(macd.signal, 0);
    const bollingerPosition = this.calculateBollingerPosition(
      currentPrice,
      this.last(bollingerBands.lower, 0),
      this.last(bollingerBands.upper, 1)
    );
    const currentATR = this.last(atr, 0);
    const atrPercent = (currentATR / currentPrice) * 100;
    
    // 拡張特徴量の計算
    const momentum = this.calculateMomentum(prices, 10);
    const rateOfChange = this.calculateRateOfChange(prices, 12);
    const stochasticRSI = this.calculateStochasticRSI(rsi, 14);
    const williamsR = this.calculateWilliamsRValue(data.slice(-14));
    const cci = this.calculateCCI(data.slice(-20));
    const atrRatio = this.calculateATRRatio(atr, currentPrice);
    const volumeProfile = this.calculateVolumeProfile(volumes);
    const pricePosition = this.calculatePricePosition(prices.slice(-20));
    
    // モメンタムトレンドの判定
    const momentumTrend = this.classifyMomentumTrend(momentum, rateOfChange);
    
    // ボラティリティレジームの判定
    const volatilityRegime = this.classifyVolatilityRegime(volatility);
    
    // 時系列特徴量の生成
    const timeSeriesFeatures = this.generateTimeSeriesFeatures(data);
    
    // マクロ指標の統合 (提供されている場合)
    // 一時的な特徴量オブジェクトを使用
    const tempFeatures: Partial<ExtendedTechnicalFeatures> = {
      volatility,
      momentum,
      rateOfChange,
    };
    const integratedMacro = macroIndicators 
      ? this.integrateMacroIndicators(macroIndicators, tempFeatures)
      : undefined;
    
    // ニュース感情の定量化 (提供されている場合)
    const sentiment = newsTexts && newsTexts.length > 0
      ? this.quantifyTextData(newsTexts)
      : undefined;
    
    const features: ExtendedTechnicalFeatures = {
      rsi: currentRSI,
      rsiChange,
      sma5: sma5Dev,
      sma20: sma20Dev,
      sma50: sma50Dev,
      priceMomentum,
      volumeRatio,
      volatility,
      macdSignal,
      bollingerPosition,
      atrPercent,
      momentum,
      rateOfChange,
      stochasticRSI,
      williamsR,
      cci,
      atrRatio,
      volumeProfile,
      pricePosition,
      momentumTrend,
      volatilityRegime,
      macroIndicators: integratedMacro,
      sentiment,
      timeSeriesFeatures,
    };
    
    return features;
  }

  /**
   * モメンタムを計算
   * 
   * @param prices - 価格配列
   * @param period - 計算期間
   * @returns モメンタム値（%）
   */
  private calculateMomentum(prices: number[], period: number): number {
    if (prices.length < period + 1) return 0;
    const current = prices[prices.length - 1];
    const past = prices[prices.length - 1 - period];
    return ((current - past) / past) * 100;
  }

  /**
   * 変化率（Rate of Change）を計算
   * 
   * @param prices - 価格配列
   * @param period - 計算期間
   * @returns ROC値（%）
   */
  private calculateRateOfChange(prices: number[], period: number): number {
    if (prices.length < period + 1) return 0;
    const current = prices[prices.length - 1];
    const past = prices[prices.length - 1 - period];
    return ((current - past) / past) * 100;
  }

  /**
   * Stochastic RSIを計算
   * 
   * @param rsi - RSI値の配列
   * @param period - 計算期間
   * @returns Stochastic RSI値（0-100）
   */
  private calculateStochasticRSI(rsi: number[], period: number): number {
    const validRSI = rsi.filter(v => !isNaN(v));
    if (validRSI.length < period) return 50;
    
    const recentRSI = validRSI.slice(-period);
    const currentRSI = recentRSI[recentRSI.length - 1];
    const minRSI = Math.min(...recentRSI);
    const maxRSI = Math.max(...recentRSI);
    
    if (maxRSI === minRSI) return 50;
    return ((currentRSI - minRSI) / (maxRSI - minRSI)) * 100;
  }

  /**
   * Williams %Rの値を計算
   * 
   * @param data - OHLCVデータ
   * @returns Williams %R値（-100 to 0）
   */
  private calculateWilliamsRValue(data: OHLCV[]): number {
    if (data.length === 0) return -50;
    
    const highestHigh = Math.max(...data.map(d => d.high));
    const lowestLow = Math.min(...data.map(d => d.low));
    const currentClose = data[data.length - 1].close;
    
    if (highestHigh === lowestLow) return -50;
    return ((highestHigh - currentClose) / (highestHigh - lowestLow)) * -100;
  }

  /**
   * Commodity Channel Index (CCI)を計算
   * 
   * @param data - OHLCVデータ
   * @returns CCI値
   */
  private calculateCCI(data: OHLCV[]): number {
    if (data.length === 0) return 0;
    
    const typicalPrices = data.map(d => (d.high + d.low + d.close) / 3);
    const sma = typicalPrices.reduce((sum, tp) => sum + tp, 0) / typicalPrices.length;
    const meanDeviation = typicalPrices.reduce((sum, tp) => sum + Math.abs(tp - sma), 0) / typicalPrices.length;
    
    const currentTP = typicalPrices[typicalPrices.length - 1];
    return (currentTP - sma) / (0.015 * meanDeviation);
  }

  /**
   * ATR比率を計算
   * 
   * @param atr - ATR配列
   * @param currentPrice - 現在価格
   * @returns ATR比率
   */
  private calculateATRRatio(atr: number[], currentPrice: number): number {
    const validATR = atr.filter(v => !isNaN(v));
    if (validATR.length < 2) return 1;
    
    const currentATR = validATR[validATR.length - 1];
    const avgATR = validATR.reduce((sum, v) => sum + v, 0) / validATR.length;
    
    return currentATR / (avgATR || 1);
  }

  /**
   * 出来高プロファイルを計算
   * 
   * @param volumes - 出来高配列
   * @returns 出来高プロファイルスコア
   */
  private calculateVolumeProfile(volumes: number[]): number {
    if (volumes.length < 20) return 1;
    
    const recentVolume = volumes.slice(-5).reduce((sum, v) => sum + v, 0) / 5;
    const historicalVolume = volumes.slice(-20).reduce((sum, v) => sum + v, 0) / 20;
    
    return recentVolume / (historicalVolume || 1);
  }

  /**
   * 価格ポジションを計算（直近レンジ内の位置）
   * 
   * @param prices - 価格配列
   * @returns 価格ポジション（0-100）
   */
  private calculatePricePosition(prices: number[]): number {
    if (prices.length === 0) return 50;
    
    const currentPrice = prices[prices.length - 1];
    const highestPrice = Math.max(...prices);
    const lowestPrice = Math.min(...prices);
    
    if (highestPrice === lowestPrice) return 50;
    return ((currentPrice - lowestPrice) / (highestPrice - lowestPrice)) * 100;
  }

  /**
   * ボリンジャーバンド内の位置を計算
   */
  private calculateBollingerPosition(price: number, lower: number, upper: number): number {
    if (upper === lower) return 50;
    return ((price - lower) / (upper - lower)) * 100;
  }

  /**
   * モメンタムトレンドを分類
   */
  private classifyMomentumTrend(
    momentum: number,
    roc: number
  ): 'STRONG_UP' | 'UP' | 'NEUTRAL' | 'DOWN' | 'STRONG_DOWN' {
    const avgMomentum = (momentum + roc) / 2;
    
    if (avgMomentum > 5) return 'STRONG_UP';
    if (avgMomentum > 2) return 'UP';
    if (avgMomentum < -5) return 'STRONG_DOWN';
    if (avgMomentum < -2) return 'DOWN';
    return 'NEUTRAL';
  }

  /**
   * ボラティリティレジームを分類
   */
  private classifyVolatilityRegime(volatility: number): 'LOW' | 'NORMAL' | 'HIGH' {
    if (volatility < 15) return 'LOW';
    if (volatility > 30) return 'HIGH';
    return 'NORMAL';
  }

  /**
   * ボラティリティを計算（年率換算）
   */
  private calculateVolatility(prices: number[], period: number): number {
    if (prices.length < 2) return 0;

    const returns: number[] = [];
    for (let i = 1; i < prices.length; i++) {
      returns.push(Math.log(prices[i] / prices[i - 1]));
    }

    const mean = returns.reduce((sum, r) => sum + r, 0) / returns.length;
    const variance = returns.reduce((sum, r) => sum + Math.pow(r - mean, 2), 0) / returns.length;

    return Math.sqrt(variance) * Math.sqrt(252) * 100; // Annualized volatility
  }

  /**
   * マクロ指標を統合
   * 
   * @param macro - マクロ経済指標
   * @param microFeatures - ミクロな特徴量
   * @returns 統合されたマクロ指標
   */
  integrateMacroIndicators(
    macro: MacroIndicators,
    microFeatures: Partial<ExtendedTechnicalFeatures>
  ): MacroIndicators {
    // マクロ指標をそのまま返すが、必要に応じて正規化や調整を行う
    const integrated: MacroIndicators = { ...macro };
    
    // VIXが高い場合、ボラティリティ情報と組み合わせる
    if (macro.vix && microFeatures.volatility) {
      // VIXとミクロボラティリティの相関を考慮
      const vixNormalized = Math.min(macro.vix / 40, 2); // 40を基準に正規化
      integrated.vix = vixNormalized;
    }
    
    return integrated;
  }

  /**
   * テキストデータを特徴量化（ニュース感情分析）
   * 
   * @param newsTexts - ニューステキストの配列
   * @returns 数値化された感情特徴量
   */
  quantifyTextData(newsTexts: string[]): NewsSentiment {
    if (newsTexts.length === 0) {
      return {
        positive: 0.5,
        negative: 0.5,
        neutral: 1,
        overall: 0,
        confidence: 0,
      };
    }

    // 簡易的なキーワードベースの感情分析
    const positiveKeywords = ['上昇', '好調', '成長', '利益', '増加', 'bull', 'rally', 'gain', 'profit', 'growth'];
    const negativeKeywords = ['下落', '不調', '減少', '損失', '危機', 'bear', 'decline', 'loss', 'risk', 'crisis'];

    let positiveScore = 0;
    let negativeScore = 0;
    let totalWords = 0;

    for (const text of newsTexts) {
      const lowerText = text.toLowerCase();
      
      // ポジティブキーワードのカウント
      for (const keyword of positiveKeywords) {
        const matches = (lowerText.match(new RegExp(keyword, 'g')) || []).length;
        positiveScore += matches;
        totalWords += lowerText.split(/\s+/).length;
      }
      
      // ネガティブキーワードのカウント
      for (const keyword of negativeKeywords) {
        const matches = (lowerText.match(new RegExp(keyword, 'g')) || []).length;
        negativeScore += matches;
      }
    }

    // スコアの正規化
    const totalKeywords = positiveScore + negativeScore;
    const positive = totalKeywords > 0 ? positiveScore / totalKeywords : 0.5;
    const negative = totalKeywords > 0 ? negativeScore / totalKeywords : 0.5;
    const neutral = 1 - (positive + negative);
    
    // 総合スコア: -1（完全ネガティブ）から +1（完全ポジティブ）
    const overall = positive - negative;
    
    // 信頼度: キーワードの数に基づく
    const confidence = Math.min(totalKeywords / (newsTexts.length * 3), 1);

    return {
      positive,
      negative,
      neutral: Math.max(neutral, 0),
      overall,
      confidence,
    };
  }

  /**
   * 時系列特徴量を生成
   * 
   * @param data - OHLCVデータ
   * @returns 時系列特徴量
   */
  generateTimeSeriesFeatures(data: OHLCV[]): TimeSeriesFeatures {
    const prices = data.map(d => d.close);
    const volumes = data.map(d => d.volume);

    // ローリング統計
    const rollingMean5 = this.calculateRollingMean(prices, 5);
    const rollingMean20 = this.calculateRollingMean(prices, 20);
    const rollingStd5 = this.calculateRollingStd(prices, 5);
    const rollingStd20 = this.calculateRollingStd(prices, 20);

    // 指数移動平均
    const exponentialMA = this.calculateEMA(prices, 12);

    // モメンタムの変化率
    const momentum10 = this.calculateMomentum(prices, 10);
    const momentum5 = this.calculateMomentum(prices, 5);
    const momentumChange = momentum10 - momentum5;

    // 価格の加速度（2階微分）
    const priceAcceleration = this.calculateAcceleration(prices);
    
    // 出来高の加速度
    const volumeAcceleration = this.calculateAcceleration(volumes);

    // 自己相関
    const autocorrelation = this.calculateAutocorrelation(prices, 1);

    // フーリエ変換（周期性検出）
    const fourierFeatures = this.applyFourierTransform(prices.slice(-50));

    return {
      rollingMean5,
      rollingMean20,
      rollingStd5,
      rollingStd20,
      exponentialMA,
      momentumChange,
      priceAcceleration,
      volumeAcceleration,
      autocorrelation,
      fourierDominantFreq: fourierFeatures.dominantFreq,
      fourierAmplitude: fourierFeatures.amplitude,
    };
  }

  /**
   * ローリング平均を計算
   */
  private calculateRollingMean(values: number[], window: number): number {
    if (values.length < window) return values[values.length - 1] || 0;
    
    const slice = values.slice(-window);
    return slice.reduce((sum, v) => sum + v, 0) / slice.length;
  }

  /**
   * ローリング標準偏差を計算
   */
  private calculateRollingStd(values: number[], window: number): number {
    if (values.length < window) return 0;
    
    const slice = values.slice(-window);
    const mean = slice.reduce((sum, v) => sum + v, 0) / slice.length;
    const variance = slice.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / slice.length;
    
    return Math.sqrt(variance);
  }

  /**
   * 指数移動平均（EMA）を計算
   */
  private calculateEMA(values: number[], period: number): number {
    if (values.length === 0) return 0;
    if (values.length < period) return values[values.length - 1];

    const multiplier = 2 / (period + 1);
    let ema = values[0];

    for (let i = 1; i < values.length; i++) {
      ema = (values[i] - ema) * multiplier + ema;
    }

    return ema;
  }

  /**
   * 加速度を計算（2階微分の近似）
   */
  private calculateAcceleration(values: number[]): number {
    if (values.length < 3) return 0;

    const len = values.length;
    const velocity1 = values[len - 1] - values[len - 2];
    const velocity2 = values[len - 2] - values[len - 3];
    
    return velocity1 - velocity2;
  }

  /**
   * 自己相関を計算
   */
  private calculateAutocorrelation(values: number[], lag: number): number {
    if (values.length < lag + 10) return 0;

    const n = values.length - lag;
    const mean = values.reduce((sum, v) => sum + v, 0) / values.length;

    let numerator = 0;
    let denominator = 0;

    for (let i = 0; i < n; i++) {
      numerator += (values[i] - mean) * (values[i + lag] - mean);
    }

    for (let i = 0; i < values.length; i++) {
      denominator += Math.pow(values[i] - mean, 2);
    }

    return denominator !== 0 ? numerator / denominator : 0;
  }

  /**
   * フーリエ変換を適用して周期性を検出
   */
  private applyFourierTransform(values: number[]): { dominantFreq: number; amplitude: number } {
    if (values.length < 8) {
      return { dominantFreq: 0, amplitude: 0 };
    }

    // 簡易的なDFT（離散フーリエ変換）の実装
    const N = Math.min(values.length, 50);
    const frequencies: { freq: number; amplitude: number }[] = [];

    for (let k = 1; k < N / 2; k++) {
      let real = 0;
      let imag = 0;

      for (let n = 0; n < N; n++) {
        const angle = (2 * Math.PI * k * n) / N;
        real += values[n] * Math.cos(angle);
        imag += values[n] * Math.sin(angle);
      }

      const amplitude = Math.sqrt(real * real + imag * imag) / N;
      frequencies.push({ freq: k / N, amplitude });
    }

    // 最も強い周波数成分を見つける
    frequencies.sort((a, b) => b.amplitude - a.amplitude);
    
    return {
      dominantFreq: frequencies[0]?.freq || 0,
      amplitude: frequencies[0]?.amplitude || 0,
    };
  }

  /**
   * 特徴量の重要性を分析
   * 
   * @param features - 特徴量オブジェクト
   * @returns 特徴量の重要性リスト
   */
  analyzeFeatureImportance(features: ExtendedTechnicalFeatures): FeatureImportance[] {
    const importance: FeatureImportance[] = [
      // トレンド系
      { name: 'sma20', score: this.scoreFeature(Math.abs(features.sma20), 0, 10), rank: 0, category: 'trend' },
      { name: 'sma50', score: this.scoreFeature(Math.abs(features.sma50), 0, 15), rank: 0, category: 'trend' },
      { name: 'pricePosition', score: this.scoreFeature(Math.abs(features.pricePosition - 50), 0, 50), rank: 0, category: 'trend' },
      
      // モメンタム系
      { name: 'rsi', score: this.scoreFeature(Math.abs(features.rsi - 50), 0, 50), rank: 0, category: 'momentum' },
      { name: 'momentum', score: this.scoreFeature(Math.abs(features.momentum), 0, 10), rank: 0, category: 'momentum' },
      { name: 'rateOfChange', score: this.scoreFeature(Math.abs(features.rateOfChange), 0, 10), rank: 0, category: 'momentum' },
      { name: 'macdSignal', score: this.scoreFeature(Math.abs(features.macdSignal), 0, 5), rank: 0, category: 'momentum' },
      
      // ボラティリティ系
      { name: 'volatility', score: this.scoreFeature(features.volatility, 0, 50), rank: 0, category: 'volatility' },
      { name: 'atrPercent', score: this.scoreFeature(features.atrPercent, 0, 5), rank: 0, category: 'volatility' },
      { name: 'atrRatio', score: this.scoreFeature(Math.abs(features.atrRatio - 1), 0, 1), rank: 0, category: 'volatility' },
      
      // 出来高系
      { name: 'volumeRatio', score: this.scoreFeature(Math.abs(features.volumeRatio - 1), 0, 2), rank: 0, category: 'volume' },
      { name: 'volumeProfile', score: this.scoreFeature(Math.abs(features.volumeProfile - 1), 0, 2), rank: 0, category: 'volume' },
    ];

    // スコアでソートしてランク付け
    importance.sort((a, b) => b.score - a.score);
    importance.forEach((item, index) => {
      item.rank = index + 1;
    });

    return importance;
  }

  /**
   * 特徴量をスコア化（0-1の範囲に正規化）
   */
  private scoreFeature(value: number, min: number, max: number): number {
    const normalized = (value - min) / (max - min);
    return Math.min(Math.max(normalized, 0), 1);
  }

  /**
   * 配列の最後の要素を取得
   */
  private last(arr: number[], fallback: number): number {
    return arr.length > 0 ? arr[arr.length - 1] : fallback;
  }

  /**
   * 配列の指定位置の要素を取得
   */
  private at(arr: number[], idx: number, fallback: number): number {
    return idx >= 0 && idx < arr.length ? arr[idx] : fallback;
  }
}

export const featureEngineering = new FeatureEngineering();
