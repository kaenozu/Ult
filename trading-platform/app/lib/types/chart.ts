/**
 * Chart.js 型定義
 * 
 * chart.js および react-chartjs-2 の型安全性を向上させるための型定義
 */

import type {
  Chart as ChartType,
  ChartTypeRegistry,
  DefaultDataPoint,
  TooltipItem,
} from 'chart.js';

// ============================================================================
// Chart.js Tooltip 型定義
// ============================================================================

/**
 * ツールチップコンテキスト型（Line チャート用）
 */
export type LineTooltipContext = TooltipItem<'line'>;

/**
 * ツールチップコンテキスト型（Bar チャート用）
 */
export type BarTooltipContext = TooltipItem<'bar'>;

/**
 * ツールチップコンテキスト型（Doughnut チャート用）
 */
export type DoughnutTooltipContext = TooltipItem<'doughnut'>;

/**
 * ツールチップコンテキスト型（Pie チャート用）
 */
export type PieTooltipContext = TooltipItem<'pie'>;

/**
 * 汎用ツールチップコンテキスト型
 */
export type TooltipContext<TType extends keyof ChartTypeRegistry = keyof ChartTypeRegistry> = 
  TooltipItem<TType>;

// ============================================================================
// Chart.js Dataset 型定義
// ============================================================================

/**
 * 基本データセット型
 */
export interface BaseChartDataset {
  label: string;
  data: number[];
  backgroundColor?: string | string[];
  borderColor?: string | string[];
  borderWidth?: number;
  fill?: boolean;
  tension?: number;
  pointRadius?: number;
  pointHoverRadius?: number;
}

/**
 * Line チャート用データセット型
 */
export interface LineChartDataset extends BaseChartDataset {
  type?: 'line';
  yAxisID?: string;
  pointBackgroundColor?: string | string[];
  pointBorderColor?: string | string[];
  pointBorderWidth?: number;
}

/**
 * Bar チャート用データセット型
 */
export interface BarChartDataset extends BaseChartDataset {
  type?: 'bar';
  borderRadius?: number;
  barPercentage?: number;
  categoryPercentage?: number;
}

/**
 * ドローダウンチャート用データセット型
 */
export interface DrawdownChartDataset extends LineChartDataset {
  fill?: boolean;
  backgroundColor?: string;
  borderColor?: string;
}

// ============================================================================
// Chart.js Data 型定義
// ============================================================================

/**
 * 基本チャートデータ型
 */
export interface ChartData<
  TType extends keyof ChartTypeRegistry = keyof ChartTypeRegistry,
  TData = DefaultDataPoint<TType>,
  TLabel = string
> {
  labels: TLabel[];
  datasets: BaseChartDataset[];
}

/**
 * Line チャート用データ型
 */
export interface LineChartData<
  TData = DefaultDataPoint<'line'>,
  TLabel = string
> {
  labels: TLabel[];
  datasets: LineChartDataset[];
}

/**
 * ドローダウンチャート用データ型
 */
export interface DrawdownChartData {
  labels: string[];
  datasets: DrawdownChartDataset[];
}

// ============================================================================
// Chart.js Options 型定義
// ============================================================================

/**
 * 基本スケール設定
 */
export interface ChartScaleOptions {
  beginAtZero?: boolean;
  max?: number;
  min?: number;
  grid?: {
    color?: string;
    drawBorder?: boolean;
  };
  ticks?: {
    color?: string;
    callback?: (value: number | string, index: number, values: (number | string)[]) => string | number;
  };
  title?: {
    display?: boolean;
    text?: string;
    color?: string;
  };
}

/**
 * 基本チャートオプション
 */
export interface BaseChartOptions {
  responsive?: boolean;
  maintainAspectRatio?: boolean;
  interaction?: {
    mode?: 'index' | 'point' | 'nearest' | 'x' | 'y';
    intersect?: boolean;
  };
  plugins?: {
    legend?: {
      display?: boolean;
      position?: 'top' | 'bottom' | 'left' | 'right';
      labels?: {
        color?: string;
        usePointStyle?: boolean;
      };
    };
    tooltip?: {
      enabled?: boolean;
      mode?: 'index' | 'point' | 'nearest' | 'x' | 'y';
      intersect?: boolean;
      callbacks?: {
        label?: (context: TooltipContext) => string;
        title?: (context: TooltipContext[]) => string;
      };
    };
  };
  scales?: Record<string, ChartScaleOptions>;
}

/**
 * ドローダウンチャート用オプション
 */
export interface DrawdownChartOptions extends BaseChartOptions {
  scales: {
    x: ChartScaleOptions;
    y: ChartScaleOptions;
  };
}

// ============================================================================
// 型ガード関数
// ============================================================================

/**
 * 値が有効なツールチップコンテキストかどうかを判定
 */
export function isTooltipContext(value: unknown): value is TooltipContext {
  if (typeof value !== 'object' || value === null) {
    return false;
  }
  
  const ctx = value as Record<string, unknown>;
  return (
    'dataset' in ctx &&
    'parsed' in ctx &&
    typeof ctx.parsed === 'object' &&
    ctx.parsed !== null &&
    'y' in (ctx.parsed as Record<string, unknown>)
  );
}

/**
 * 値がLine チャート用ツールチップコンテキストかどうかを判定
 */
export function isLineTooltipContext(value: unknown): value is LineTooltipContext {
  return isTooltipContext(value);
}

/**
 * ツールチップコンテキストから安全にY値を取得
 */
export function getTooltipYValue(context: TooltipContext, defaultValue = 0): number {
  const parsed = context.parsed;
  if (parsed === null || parsed === undefined) {
    return defaultValue;
  }
  if (typeof parsed === 'object') {
    const parsedObj = parsed as unknown as Record<string, unknown>;
    if ('y' in parsedObj) {
      const y = parsedObj.y;
      return typeof y === 'number' ? y : defaultValue;
    }
  }
  return defaultValue;
}

/**
 * ツールチップコンテキストから安全にラベルを取得
 */
export function getTooltipLabel(context: TooltipContext): string {
  if (context.dataset && typeof context.dataset === 'object' && 'label' in context.dataset) {
    const label = (context.dataset as { label: unknown }).label;
    return typeof label === 'string' ? label : '';
  }
  return '';
}
