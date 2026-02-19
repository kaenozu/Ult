/**
 * データ品質パネルの型定義
 *
 * @module DataQualityPanel/types
 */

/**
 * DataQualityPanelコンポーネントのプロパティ
 */
export interface DataQualityPanelProps {
  /** コンパクトモード（簡易表示） */
  compact?: boolean;
  /** 更新間隔（ミリ秒） */
  updateInterval?: number;
}

/**
 * データソースの健全性情報
 */
export interface DataSourceHealth {
  /** データソース名（例: "Yahoo Finance"） */
  source: string;
  /** ステータス */
  status: 'healthy' | 'degraded' | 'offline';
  /** レイテンシ（ミリ秒） */
  latency: number;
  /** 最終更新時刻（UNIX timestamp） */
  lastUpdate: number;
  /** 品質スコア（0-100） */
  qualityScore: number;
}

/**
 * データ品質メトリクス
 */
export interface QualityMetrics {
  /** 全体品質スコア（0-100） */
  overallScore: number;
  /** データ鮮度 */
  dataFreshness: 'excellent' | 'good' | 'fair' | 'poor';
  /** キャッシュパフォーマンス */
  cachePerformance: 'excellent' | 'good' | 'fair' | 'poor';
  /** 異常検知数 */
  anomalyCount: number;
  /** 検証通過率（0-100） */
  validationPassRate: number;
}
