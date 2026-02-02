/**
 * Enhanced Prediction Types
 * 
 * このモジュールは、高度な特徴量エンジニアリングのための型定義を提供します。
 */

import { TechnicalIndicator } from '@/app/types';

/**
 * 拡張テクニカル指標
 * 基本のTechnicalIndicatorにATRを追加
 */
export interface ExtendedTechnicalIndicator extends TechnicalIndicator {
  atr: number[];
}

/**
 * ローソク足パターン特徴量
 */
export interface CandlestickPatternFeatures {
  // 基本パターン
  isDoji: number;           // Doji（寄引同値線）: 0 or 1
  isHammer: number;         // Hammer（金槌）: 0 or 1
  isShootingStar: number;   // Shooting Star（流れ星）: 0 or 1
  isEngulfing: number;      // Engulfing（包み線）: -1, 0, 1 (bearish, none, bullish)
  isPiercing: number;       // Piercing Pattern（切込線）: 0 or 1
  isDarkCloud: number;      // Dark Cloud Cover（被り線）: 0 or 1
  isMorningStar: number;    // Morning Star（明けの明星）: 0 or 1
  isEveningStar: number;    // Evening Star（宵の明星）: 0 or 1
  
  // 形状特徴量
  bodyRatio: number;        // 実体部分の割合（0-1）
  upperShadowRatio: number; // 上髭の割合（0-1）
  lowerShadowRatio: number; // 下髭の割合（0-1）
  candleStrength: number;   // ローソク足の強度（-1 to 1）
}

/**
 * 価格軌道特徴量
 */
export interface PriceTrajectoryFeatures {
  // ZigZag分析
  zigzagTrend: number;           // 現在のZigZagトレンド方向（-1, 0, 1）
  zigzagStrength: number;        // トレンドの強度（0-1）
  zigzagReversalProb: number;    // 反転確率（0-1）
  
  // トレンド特徴
  trendConsistency: number;      // トレンドの一貫性（0-1）
  trendAcceleration: number;     // トレンドの加速度（-1 to 1）
  supportResistanceLevel: number;// 直近のサポート/レジスタンスレベル
  distanceToSupport: number;     // サポートまでの距離（%）
  distanceToResistance: number;  // レジスタンスまでの距離（%）
  
  // パターン認識
  isConsolidation: number;       // レンジ相場か（0 or 1）
  breakoutPotential: number;     // ブレイクアウト可能性（0-1）
}

/**
 * 出来高プロファイル特徴量
 */
export interface VolumeProfileFeatures {
  // 時間帯別出来高パターン
  morningVolumeRatio: number;    // 午前の出来高比率
  afternoonVolumeRatio: number;  // 午後の出来高比率
  closingVolumeRatio: number;    // 引け際の出来高比率
  
  // 出来高トレンド
  volumeTrend: number;           // 出来高トレンド（-1 to 1）
  volumeAcceleration: number;    // 出来高の加速度
  volumeSurge: number;           // 出来高急増検出（0 or 1）
  
  // 価格と出来高の関係
  priceVolumeCorrelation: number;// 価格と出来高の相関
  volumeAtHighPrice: number;     // 高値での出来高比率
  volumeAtLowPrice: number;      // 安値での出来高比率
}

/**
 * ボラティリティレジーム特徴量
 */
export interface VolatilityRegimeFeatures {
  // レジーム分類
  volatilityRegime: 'LOW' | 'NORMAL' | 'HIGH' | 'EXTREME'; // ボラティリティレジーム
  regimeChangeProb: number;      // レジーム変化確率（0-1）
  
  // ボラティリティ指標
  historicalVolatility: number;  // 過去ボラティリティ（年率%）
  realizedVolatility: number;    // 実現ボラティリティ
  volatilitySkew: number;        // ボラティリティの歪度
  volatilityKurtosis: number;    // ボラティリティの尖度
  
  // 変動パターン
  garchVolatility: number;       // GARCH推定ボラティリティ
  volatilityMomentum: number;    // ボラティリティモメンタム
  volatilityClustering: number;  // ボラティリティクラスタリング度
}

/**
 * マルチタイムフレーム特徴量
 */
export interface MultiTimeframeFeatures {
  // 日足指標
  dailyTrend: number;            // 日足トレンド（-1 to 1）
  dailyMomentum: number;         // 日足モメンタム
  dailyRSI: number;              // 日足RSI
  
  // 週足指標
  weeklyTrend: number;           // 週足トレンド（-1 to 1）
  weeklyMomentum: number;        // 週足モメンタム
  weeklyRSI: number;             // 週足RSI
  
  // 月足指標
  monthlyTrend: number;          // 月足トレンド（-1 to 1）
  monthlyMomentum: number;       // 月足モメンタム
  monthlyRSI: number;            // 月足RSI
  
  // タイムフレーム間の関係
  trendAlignment: number;        // トレンドの整合性（0-1）
  timeframeDivergence: number;   // タイムフレーム間のダイバージェンス
}

/**
 * 市場コンテキスト特徴量
 */
export interface MarketContextFeatures {
  // セクター相対強度
  sectorRelativeStrength: number; // セクター相対強度
  sectorMomentum: number;         // セクターモメンタム
  
  // 季節性
  monthOfYear: number;            // 月（1-12）
  quarterOfYear: number;          // 四半期（1-4）
  dayOfWeek: number;              // 曜日（0-6）
  seasonalityScore: number;       // 季節性スコア
  
  // マクロ経済指標（将来の拡張用）
  interestRateTrend: number;      // 金利トレンド
  currencyStrength: number;       // 通貨強度
  commodityTrend: number;         // 商品相場トレンド
  
  // 市場センチメント
  marketSentiment: number;        // 市場センチメント（-1 to 1）
  fearGreedIndex: number;         // Fear & Greed Index
  volatilityIndex: number;        // VIX様ボラティリティ指数
}

/**
 * 特徴量重要度
 */
export interface FeatureImportance {
  featureName: string;
  importance: number;
  rank: number;
}

/**
 * 拡張予測特徴量（Phase 1完了版）
 * 11次元 → 50+次元に拡張
 */
export interface EnhancedPredictionFeatures {
  // 既存の基本特徴量（11次元）
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
  
  // 新規: ローソク足パターン特徴量（12次元）
  candlestickPatterns: CandlestickPatternFeatures;
  
  // 新規: 価格軌道特徴量（10次元）
  priceTrajectory: PriceTrajectoryFeatures;
  
  // 新規: 出来高プロファイル特徴量（9次元）
  volumeProfile: VolumeProfileFeatures;
  
  // 新規: ボラティリティレジーム特徴量（9次元）
  volatilityRegime: VolatilityRegimeFeatures;
  
  // Phase 2以降で追加予定
  // multiTimeframe?: MultiTimeframeFeatures;      // 12次元
  // marketContext?: MarketContextFeatures;        // 12次元
}
