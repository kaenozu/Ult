/**
 * イベントハンドラー型定義
 * 
 * イベントエミッターとイベントハンドラーの型安全性を向上させるための型定義
 */

// ============================================================================
// センチメント分析イベント型
// ============================================================================

/**
 * センチメント分析結果
 */
export interface SentimentAnalysisResult {
  symbol: string;
  sentiment: number;
  confidence: number;
  timestamp: Date;
  leadingIndicators: {
    earlySignalStrength: number;
    momentumShift: number;
    volumeDivergence: number;
  };
}

/**
 * ダイバージェンスアラートデータ
 */
export interface DivergenceAlertData {
  symbol: string;
  divergence: {
    type: 'bullish' | 'bearish';
    strength: number;
    priceChange: number;
    volumeChange: number;
  };
}

// ============================================================================
// データコレクターイベント型
// ============================================================================

/**
 * データソース情報
 */
export interface DataSourceInfo {
  name: string;
  type: 'api' | 'websocket' | 'file' | 'database';
  status: 'active' | 'inactive' | 'error';
  lastUpdate?: Date;
}

/**
 * 収集されたデータ
 */
export interface CollectedData {
  source: DataSourceInfo;
  data: unknown;
  timestamp: Date;
  quality: number;
}

/**
 * 品質警告データ
 */
export interface QualityWarningData {
  source: DataSourceInfo;
  quality: number;
  issues: string[];
}

/**
 * コレクションエラーデータ
 */
export interface CollectionErrorData {
  source: DataSourceInfo;
  error: Error;
}

// ============================================================================
// イベントマップ型
// ============================================================================

/**
 * センチメントサービスイベントマップ
 */
export interface SentimentServiceEventMap {
  started: void;
  analysis_completed: SentimentAnalysisResult;
  divergence_alert: DivergenceAlertData;
}

/**
 * データコレクターイベントマップ
 */
export interface DataCollectorEventMap {
  started: void;
  data_collected: CollectedData;
  quality_warning: QualityWarningData;
  collection_error: CollectionErrorData;
}

// ============================================================================
// 型安全なイベントハンドラー型
// ============================================================================

/**
 * 型安全なイベントハンドラー
 */
export type TypedEventHandler<T = void> = T extends void
  ? () => void
  : (data: T) => void;

/**
 * センチメントサービスのイベントハンドラー
 */
export type SentimentServiceEventHandler<K extends keyof SentimentServiceEventMap> =
  TypedEventHandler<SentimentServiceEventMap[K]>;

/**
 * データコレクターのイベントハンドラー
 */
export type DataCollectorEventHandler<K extends keyof DataCollectorEventMap> =
  TypedEventHandler<DataCollectorEventMap[K]>;

// ============================================================================
// 型ガード関数
// ============================================================================

/**
 * 値がSentimentAnalysisResult型かどうかを判定
 */
export function isSentimentAnalysisResult(value: unknown): value is SentimentAnalysisResult {
  if (typeof value !== 'object' || value === null) {
    return false;
  }
  
  const result = value as Record<string, unknown>;
  return (
    typeof result.symbol === 'string' &&
    typeof result.sentiment === 'number' &&
    typeof result.confidence === 'number'
  );
}

/**
 * 値がDivergenceAlertData型かどうかを判定
 */
export function isDivergenceAlertData(value: unknown): value is DivergenceAlertData {
  if (typeof value !== 'object' || value === null) {
    return false;
  }
  
  const data = value as Record<string, unknown>;
  return (
    typeof data.symbol === 'string' &&
    typeof data.divergence === 'object' &&
    data.divergence !== null
  );
}

/**
 * 値がQualityWarningData型かどうかを判定
 */
export function isQualityWarningData(value: unknown): value is QualityWarningData {
  if (typeof value !== 'object' || value === null) {
    return false;
  }
  
  const data = value as Record<string, unknown>;
  return (
    typeof data.source === 'object' &&
    data.source !== null &&
    typeof data.quality === 'number'
  );
}

/**
 * 値がCollectionErrorData型かどうかを判定
 */
export function isCollectionErrorData(value: unknown): value is CollectionErrorData {
  if (typeof value !== 'object' || value === null) {
    return false;
  }
  
  const data = value as Record<string, unknown>;
  return (
    typeof data.source === 'object' &&
    data.source !== null &&
    data.error instanceof Error
  );
}
