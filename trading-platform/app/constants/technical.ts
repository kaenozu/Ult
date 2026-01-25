/**
 * テクニカル指標に関連する定数
 */

// RSI（Relative Strength Index）の設定
export const RSI_CONFIG = {
  /** デフォルト期間 */
  DEFAULT_PERIOD: 14,
  /** 期間オプション */
  PERIOD_OPTIONS: [10, 14, 21],
  /** オーバーボート閾値 */
  OVERBOUGHT: 70,
  /** オーバーソルド閾値 */
  OVERSOLD: 30,
  /** 極度の売られすぎ閾値 */
  EXTREME_OVERSOLD: 25,
  /** 極度の買われすぎ閾値 */
  EXTREME_OVERBOUGHT: 75,
};

// SMA（Simple Moving Average）の設定
export const SMA_CONFIG = {
  /** 短期期間 */
  SHORT_PERIOD: 20,
  /** 中期期間 */
  MEDIUM_PERIOD: 50,
  /** 長期期間 */
  LONG_PERIOD: 100,
  /** 期間オプション */
  PERIOD_OPTIONS: [20, 50, 100],
};

// MACDの設定
export const MACD_CONFIG = {
  /** 短期EMA期間 */
  FAST_PERIOD: 12,
  /** 長期EMA期間 */
  SLOW_PERIOD: 26,
  /** シグナル線期間 */
  SIGNAL_PERIOD: 9,
};

// ボラティリティ関連の設定
export const VOLATILITY = {
  /** デフォルトATR期間 */
  DEFAULT_ATR_PERIOD: 14,
  /** ボラティリティ計算期間 */
  CALCULATION_PERIOD: 20,
  /** 低ボラティリティ閾値（%） */
  LOW_THRESHOLD: 1.0,
  /** 高ボラティリティ閾値（%） */
  HIGH_THRESHOLD: 3.0,
};

// 最適化パラメータの設定
export const OPTIMIZATION = {
  /** 最小データ期間 */
  MIN_DATA_PERIOD: 50,
  /** 最適化に必要なデータ期間 */
  REQUIRED_DATA_PERIOD: 120,
  /** ボリュームプロファイルのビン数 */
  VOLUME_PROFILE_BINS: 20,
  /** トレンド分析に必要なデータ期間 */
  TREND_ANALYSIS_MIN_PERIOD: 30,
};

// シグナル生成の閾値
export const SIGNAL_THRESHOLDS = {
  /** 強気シグナルのRSI閾値 */
  BULL_RSI_THRESHOLD: 30,
  /** 弱気シグナルのRSI閾値 */
  BEAR_RSI_THRESHOLD: 70,
  /** 価格モメンタムの強い閾値（%） */
  STRONG_MOMENTUM: 5,
  /** 相関係数の強い閾値 */
  STRONG_CORRELATION: 0.4,
};
