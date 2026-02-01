/**
 * FeatureEngineering.ts
 * 
 * 機械学習モデル用の特徴量エンジニアリングクラス。
 * テクニカル指標の拡張、特徴量の重要性分析、正規化などを提供します。
 */

import { OHLCV } from '../../types/shared';
import { TechnicalIndicatorCalculator } from './PredictiveAnalyticsEngine';

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
   * @returns 拡張されたテクニカル特徴量
   */
  calculateExtendedFeatures(
    data: OHLCV[],
    currentPrice: number,
    averageVolume: number
  ): ExtendedTechnicalFeatures {
    if (data.length < 50) {
      throw new Error('Insufficient data for feature calculation (minimum 50 data points required)');
    }

    const prices = data.map(d => d.close);
    const volumes = data.map(d => d.volume);
    
    // 基本指標の計算
    const rsi = TechnicalIndicatorCalculator.calculateRSI(prices, 14);
    const sma5 = TechnicalIndicatorCalculator.calculateSMA(prices, 5);
    const sma20 = TechnicalIndicatorCalculator.calculateSMA(prices, 20);
    const sma50 = TechnicalIndicatorCalculator.calculateSMA(prices, 50);
    const macd = TechnicalIndicatorCalculator.calculateMACD(prices);
    const bollingerBands = TechnicalIndicatorCalculator.calculateBollingerBands(prices, 20, 2);
    const atr = TechnicalIndicatorCalculator.calculateATR(data, 14);
    
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
    const volatility = TechnicalIndicatorCalculator.calculateVolatility(prices.slice(-20), 20);
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
    
    return {
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
    };
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
