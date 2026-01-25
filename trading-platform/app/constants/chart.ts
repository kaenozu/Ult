/**
 * チャート表示に関連する定数
 */

// ボリュームプロファイル（需給の壁）の表示設定
export const VOLUME_PROFILE = {
  /** バーの最大幅（画面幅に対する比率） */
  MAX_BAR_WIDTH_RATIO: 0.15,
  /** プロファイルの高さを計算するための除数 */
  HEIGHT_DIVISOR: 25,
  /** 透明度の基本値 */
  BASE_ALPHA: 0.4,
  /** 強度に応じた透明度の増分 */
  STRENGTH_ALPHA_ADD: 0.2,
} as const;

// ボリンジャーバンドの設定
export const BOLLINGER_BANDS = {
  /** 標準偏差の倍率 */
  STD_DEVIATION: 2,
  /** 期間（デフォルト） */
  PERIOD: 20,
  /** 上部バンドの色と透明度 */
  UPPER_COLOR: 'rgba(59, 130, 246, 0.5)',
  UPPER_BACKGROUND: 'rgba(59, 130, 246, 0.1)',
  /** 下部バンドの色と透明度 */
  LOWER_COLOR: 'rgba(59, 130, 246, 0.5)',
} as const;

// 予測コーン（未来予測の表示範囲）の設定
export const FORECAST_CONE = {
  /** 予測ステップ数 */
  STEPS: 5,
  /** 過去データの参照日数 */
  LOOKBACK_DAYS: 250,
  /** 不確実性の計算に使用するATRの倍率 */
  ATR_MULTIPLIER: 0.5,
  /** 信頼度による不確実性の調整係数 */
  CONFIDENCE_FACTOR_BASE: 0.8,
} as const;

// ゴースト予測（過去の予測を表示）の設定
export const GHOST_FORECAST = {
  /** ATRのデフォルト倍率（価格変動） */
  DEFAULT_ATR_RATIO: 0.02,
  /** 予測線の透明度（上） */
  TARGET_ALPHA: 0.3,
  /** 予測線の透明度（下） */
  STOP_ALPHA: 0.1,
  /** 予測線の背景透明度 */
  TARGET_FILL_ALPHA: 0.08,
  /** 破線パターン */
  DASH_PATTERN: [3, 3],
} as const;

// ローソク足チャートの設定
export const CANDLESTICK = {
  /** 陽線の色 */
  BULL_COLOR: 'rgba(16, 185, 129, 0.5)',
  /** 陰線の色 */
  BEAR_COLOR: 'rgba(239, 68, 68, 0.5)',
  /** 線の太さ */
  LINE_WIDTH: 1,
  /** ホバー時のポイントサイズ */
  HOVER_RADIUS: 4,
} as const;

// 移動平均線の設定
export const SMA = {
  /** 期間（短期） */
  SHORT_PERIOD: 20,
  /** 色 */
  COLOR: '#fbbf24',
  /** 線の太さ */
  LINE_WIDTH: 1.5,
} as const;

// RSIサブチャートの設定
export const RSI = {
  /** オーバーボートライン */
  OVERBOUGHT: 70,
  /** オーバーソルドライン */
  OVERSOLD: 30,
  /** RSIの色 */
  COLOR: '#a855f7',
} as const;

// グリッドと軸の設定
export const CHART_GRID = {
  /** メイングリッドの色 */
  MAIN_COLOR: 'rgba(35, 54, 72, 0.3)',
  /** ホバー時のグリッド色 */
  HOVER_COLOR: 'rgba(59, 130, 246, 0.8)',
  /** 未来予測エリアのグリッド色 */
  FUTURE_AREA_COLOR: 'rgba(59, 130, 246, 0.2)',
  /** 現在価格線の太さ */
  CURRENT_PRICE_LINE_WIDTH: 3,
  /** ホバー線の太さ */
  HOVER_LINE_WIDTH: 2,
} as const;

// チャート全般の設定
export const CHART_CONFIG = {
  /** テンション（滑らかさ） */
  TENSION: 0.1,
  /** データポイントの最小数（分析に必要） */
  MIN_DATA_POINTS: 20,
} as const;
