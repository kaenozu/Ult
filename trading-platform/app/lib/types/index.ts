/**
 * 型定義エクスポート
 * 
 * 型安全性を向上させるための型定義を一元管理
 */

// Chart.js 型定義
export type {
  LineTooltipContext,
  BarTooltipContext,
  DoughnutTooltipContext,
  PieTooltipContext,
  TooltipContext,
  BaseChartDataset,
  LineChartDataset,
  BarChartDataset,
  DrawdownChartDataset,
  ChartData,
  LineChartData,
  DrawdownChartData,
  ChartScaleOptions,
  BaseChartOptions,
  DrawdownChartOptions,
} from './chart';

export {
  isTooltipContext,
  isLineTooltipContext,
  getTooltipYValue,
  getTooltipLabel,
} from './chart';

// API レスポンス型定義
export type {
  APISuccessResponse,
  APIErrorResponse,
  APIResponse,
  OHLCVData,
  MarketHistoryResponse,
  MarketDataAPIResponse,
  TradingSignal,
  SignalValidationResult,
} from './api';

export {
  isSuccessResponse,
  isErrorResponse,
  isOHLCVData,
  isOHLCVDataArray,
  isTradingSignal,
  safeGetResponseData,
  safeGetClose,
  safeGetDate,
} from './api';

// イベントハンドラー型定義
export type {
  SentimentAnalysisResult,
  DivergenceAlertData,
  DataSourceInfo,
  CollectedData,
  QualityWarningData,
  CollectionErrorData,
  SentimentServiceEventMap,
  DataCollectorEventMap,
  TypedEventHandler,
  SentimentServiceEventHandler,
  DataCollectorEventHandler,
} from './events';

export {
  isSentimentAnalysisResult,
  isDivergenceAlertData,
  isQualityWarningData,
  isCollectionErrorData,
} from './events';
