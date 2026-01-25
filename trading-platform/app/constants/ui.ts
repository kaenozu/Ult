/**
 * UI表示に関連する定数
 */

// シグナル表示の色設定
export const SIGNAL_COLORS = {
  /** 買いシグナルの背景色 */
  BUY_BACKGROUND: 'bg-green-500/20',
  /** 買いシグナルのテキスト色 */
  BUY_TEXT: 'text-green-400',
  /** 買いシグナルのボーダー色 */
  BUY_BORDER: 'border-green-500',
  /** 売りシグナルの背景色 */
  SELL_BACKGROUND: 'bg-red-500/20',
  /** 売りシグナルのテキスト色 */
  SELL_TEXT: 'text-red-400',
  /** 売りシグナルのボーダー色 */
  SELL_BORDER: 'border-red-500',
  /** ホールドシグナルの背景色 */
  HOLD_BACKGROUND: 'bg-gray-500/20',
  /** ホールドシグナルのテキスト色 */
  HOLD_TEXT: 'text-gray-400',
} as const;

// 信頼度の色設定
export const CONFIDENCE_COLORS = {
  /** 高信頼度の閾値 */
  HIGH_THRESHOLD: 60,
  /** 高信頼度の色 */
  HIGH: 'text-yellow-500',
  /** 中信頼度の閾値 */
  MEDIUM_THRESHOLD: 40,
  /** 中信頼度の色 */
  MEDIUM: 'text-blue-400',
  /** 低信頼度の色 */
  LOW: 'text-gray-400',
} as const;

// 市場区分の色設定
export const MARKET_COLORS = {
  /** 日本市場の背景色 */
  JAPAN_BACKGROUND: 'bg-blue-500/20',
  /** 日本市場のテキスト色 */
  JAPAN_TEXT: 'text-blue-400',
  /** 日本市場のボーダー色 */
  JAPAN_BORDER: 'border-blue-500',
  /** 米国市場の背景色 */
  US_BACKGROUND: 'bg-red-500/20',
  /** 米国市場のテキスト色 */
  US_TEXT: 'text-red-400',
  /** 米国市場のボーダー色 */
  US_BORDER: 'border-red-500',
} as const;

// ヒートマップの色設定
export const HEATMAP_COLORS = {
  /** 強気の基本色 */
  BULL_BASE: [34, 197, 94] as const, // green-500
  /** 弱気の基本色 */
  BEAR_BASE: [239, 68, 68] as const, // red-500
  /** 最低透明度 */
  MIN_ALPHA: 0.1,
  /** 最高透明度 */
  MAX_ALPHA: 0.9,
} as const;

// ボタンのスタイル設定
export const BUTTON_STYLES = {
  /** 小さなパディング */
  SMALL_PADDING: 'px-1.5 py-0.5',
  /** 小さなフォントサイズ */
  SMALL_TEXT: 'text-[10px]',
  /** 角丸 */
  ROUNDED: 'rounded',
  /** 角丸（中） */
  ROUNDED_MD: 'rounded-md',
  /** 角丸（大） */
  ROUNDED_LG: 'rounded-lg',
} as const;

// テキストサイズの設定
export const TEXT_SIZES = {
  /** 極小 */
  XS: 'text-[9px]',
  /** 小 */
  SMALL: 'text-[10px]',
  /** 基準 */
  BASE: 'text-xs',
} as const;

// グリッドパディングの設定
export const GRID_PADDING = {
  /** 小 */
  SMALL: 'p-0.5',
  /** 中 */
  MEDIUM: 'p-1',
} as const;

// アニメーション設定
export const ANIMATION = {
  /** スピナーのボーダー幅 */
  SPINNER_BORDER_WIDTH: 'border-t-2 border-b-2',
  /** スピナーのサイズ */
  SPINNER_SIZE: 'h-12 w-12',
} as const;
