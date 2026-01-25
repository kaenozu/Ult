/**
 * バックテストに関連する定数
 */

// バックテスト実行の設定
export const BACKTEST_CONFIG = {
  /** 最小データ期間 */
  MIN_DATA_PERIOD: 50,
  /** 最小シグナル信頼度 */
  MIN_SIGNAL_CONFIDENCE: 60,
  /** 利確閾値（%） */
  TAKE_PROFIT_THRESHOLD: 0.05, // 5%
  /** 損切り閾値（%） */
  STOP_LOSS_THRESHOLD: 0.03, // 3%
  /** 強気ポジションの損切り閾値（%） */
  BULL_STOP_LOSS: 0.03,
  /** 強気ポジションの利確閾値（%） */
  BULL_TAKE_PROFIT: 0.05,
  /** 弱気ポジションの損切り閾値（%） */
  BEAR_STOP_LOSS: 0.05,
  /** 弱気ポジションの利確閾値（%） */
  BEAR_TAKE_PROFIT: 0.03,
} as const;

// バックテスト結果の評価基準
export const BACKTEST_METRICS = {
  /** 的中率の優秀閾値（%） */
  GOOD_HIT_RATE: 60,
  /** 的中率の優秀閾値（%） */
  EXCELLENT_HIT_RATE: 70,
  /** 最小取引回数 */
  MIN_TRADES: 2,
} as const;
