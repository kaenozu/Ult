/**
 * トレード実行に関連する定数
 */

// ポジションサイジングの設定
export const POSITION_SIZING = {
  /** デフォルトポジションサイズ（ポートフォリオに対する比率） */
  DEFAULT_RATIO: 0.1, // 10%
  /** 最小ポジションサイズ */
  MIN_SIZE: 100,
  /** スリッページ（%） */
  SLIPPAGE_PERCENTAGE: 0.001, // 0.1%
} as const;

// AIトレードの設定
export const AI_TRADING = {
  /** 初期バーチャル残高 */
  INITIAL_VIRTUAL_BALANCE: 1000000,
  /** 最小取引金額 */
  MIN_TRADE_AMOUNT: 1000,
} as const;

// 損切りの設定
export const RISK_MANAGEMENT = {
  /** デフォルトATR倍率 */
  DEFAULT_ATR_MULTIPLIER: 0.02,
  /** 強気シグナルのターゲット倍率 */
  BULL_TARGET_MULTIPLIER: 0.8,
  /** 弱気シグナルのターゲット倍率 */
  BEAR_TARGET_MULTIPLIER: 0.8,
} as const;

// 市場相関の設定
export const MARKET_CORRELATION = {
  /** 強い相関閾値 */
  STRONG_THRESHOLD: 0.5,
  /** 中程度の相関閾値 */
  MODERATE_THRESHOLD: 0.4,
  /** 市場トレンド判定の乖離率（%） */
  TREND_DEVIATION: 0.01, // 1%
} as const;

// エンサンブルモデルの重み付け
export const ENSEMBLE_WEIGHTS = {
  /** Random Forest の重み */
  RF: 0.35,
  /** XGBoost の重み */
  XGB: 0.35,
  /** LSTM の重み */
  LSTM: 0.30,
} as const;

// 価格計算のデフォルト値
export const PRICE_CALCULATION = {
  /** ATRのデフォルト倍率（価格変動の代替値） */
  DEFAULT_ATR_RATIO: 0.02,
  /** 予測誤差のデフォルト倍率 */
  DEFAULT_ERROR_MULTIPLIER: 2.5,
  /** 信頼度の最小値 */
  MIN_CONFIDENCE: 30,
  /** 信頼度の最大値 */
  MAX_CONFIDENCE: 98,
} as const;

// 注文関連の設定
export const ORDER = {
  /** 注文の有効期限（ミリ秒） */
  EXPIRY_MS: 24 * 60 * 60 * 1000, // 24時間
} as const;
