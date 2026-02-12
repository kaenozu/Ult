/**
 * Prediction Clouds Types
 * 
 * ATR（平均真波幅）に基づく株価予測の不確実性を視覚化するための型定義
 */

import { OHLCV } from '../types';

/**
 * 予測雲（Prediction Cloud）のデータポイント
 * 特定の時点における予測範囲を表現
 */
export interface PredictionCloudPoint {
  /** 時点 */
  date: string;
  timestamp: number;
  
  /** 予測中心値（現在価格または予測価格） */
  center: number;
  
  /** 予測上限（中心値 + ATR × 倍率） */
  upper: number;
  
  /** 予測下限（中心値 - ATR × 倍率） */
  lower: number;
  
  /** 予測範囲の幅（upper - lower） */
  range: number;
  
  /** 予測信頼度（0-100%） */
  confidence: number;
  
  /** 使用したATR値 */
  atr: number;
  
  /** ATR倍率 */
  atrMultiplier: number;
}

/**
 * 予測雲の設定オプション
 */
export interface PredictionCloudConfig {
  /** ATR期間（デフォルト: 14） */
  atrPeriod: number;
  
  /** ATR倍率 - 保守的予測（デフォルト: 1.0 = 68%信頼区間相当） */
  conservativeMultiplier: number;
  
  /** ATR倍率 - 標準予測（デフォルト: 1.5 = 87%信頼区間相当） */
  standardMultiplier: number;
  
  /** ATR倍率 - 楽観的予測（デフォルト: 2.0 = 95%信頼区間相当） */
  aggressiveMultiplier: number;
  
  /** 予測期間（未来何日分を予測するか、デフォルト: 5） */
  forecastDays: number;
  
  /** 最小予測範囲（価格の%で指定、デフォルト: 1%） */
  minRangePercent: number;
  
  /** 最大予測範囲（価格の%で指定、デフォルト: 20%） */
  maxRangePercent: number;
}

/**
 * 予測雲の結果
 */
export interface PredictionCloudResult {
  /** 銘柄シンボル */
  symbol: string;
  
  /** 現在の市場データ */
  currentPrice: number;
  
  /** 現在のATR値 */
  currentATR: number;
  
  /** 予測雲のデータポイント配列（過去 + 未来） */
  clouds: PredictionCloudPoint[];
  
  /** 過去の雲（実績との比較用） */
  historicalClouds: PredictionCloudPoint[];
  
  /** 未来の雲（予測） */
  forecastClouds: PredictionCloudPoint[];
  
  /** 予測サマリー */
  summary: {
    /** 予測された変動範囲（%） */
    expectedRangePercent: number;
    
    /** トレンド方向（upper > lowerで上昇トレンド） */
    trendDirection: 'UP' | 'DOWN' | 'SIDEWAYS';
    
    /** ボラティリティ評価 */
    volatilityAssessment: 'LOW' | 'MODERATE' | 'HIGH' | 'EXTREME';
    
    /** リスクスコア（0-100） */
    riskScore: number;
  };
}

/**
 * 予測雲の表示スタイル
 */
export interface PredictionCloudStyle {
  /** 雲の塗りつぶし色（上限〜下限） */
  fillColor: string;
  
  /** 雲の境界線色 */
  strokeColor: string;
  
  /** 中心線の色 */
  centerLineColor: string;
  
  /** 塗りつぶしの透明度（0-1） */
  fillOpacity: number;
  
  /** 線の太さ */
  strokeWidth: number;
}

/**
 * デフォルト設定
 */
export const DEFAULT_PREDICTION_CLOUD_CONFIG: PredictionCloudConfig = {
  atrPeriod: 14,
  conservativeMultiplier: 1.0,
  standardMultiplier: 1.5,
  aggressiveMultiplier: 2.0,
  forecastDays: 5,
  minRangePercent: 1.0,
  maxRangePercent: 20.0,
};

/**
 * デフォルト表示スタイル
 */
export const DEFAULT_PREDICTION_CLOUD_STYLE: PredictionCloudStyle = {
  fillColor: '#3b82f6', // blue-500
  strokeColor: '#2563eb', // blue-600
  centerLineColor: '#1d4ed8', // blue-700
  fillOpacity: 0.2,
  strokeWidth: 1,
};

/**
 * リスクレベル別のスタイル
 */
export const RISK_BASED_STYLES: Record<string, PredictionCloudStyle> = {
  LOW: {
    fillColor: '#10b981', // emerald-500
    strokeColor: '#059669', // emerald-600
    centerLineColor: '#047857', // emerald-700
    fillOpacity: 0.2,
    strokeWidth: 1,
  },
  MODERATE: {
    fillColor: '#3b82f6', // blue-500
    strokeColor: '#2563eb', // blue-600
    centerLineColor: '#1d4ed8', // blue-700
    fillOpacity: 0.25,
    strokeWidth: 1,
  },
  HIGH: {
    fillColor: '#f59e0b', // amber-500
    strokeColor: '#d97706', // amber-600
    centerLineColor: '#b45309', // amber-700
    fillOpacity: 0.3,
    strokeWidth: 1.5,
  },
  EXTREME: {
    fillColor: '#ef4444', // red-500
    strokeColor: '#dc2626', // red-600
    centerLineColor: '#b91c1c', // red-700
    fillOpacity: 0.35,
    strokeWidth: 2,
  },
};
