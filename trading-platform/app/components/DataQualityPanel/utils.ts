/**
 * データ品質パネルのユーティリティ関数
 *
 * @module DataQualityPanel/utils
 */

/**
 * スコアに基づいてテキストカラーのクラス名を取得
 *
 * @param score - 品質スコア（0-100）
 * @returns TailwindCSSのテキストカラークラス名
 *
 * @example
 * getQualityColor(95) // 'text-green-400'
 * getQualityColor(70) // 'text-yellow-400'
 */
export const getQualityColor = (score: number): string => {
  if (score >= 90) return 'text-green-400';
  if (score >= 75) return 'text-blue-400';
  if (score >= 60) return 'text-yellow-400';
  return 'text-red-400';
};

/**
 * スコアに基づいて背景カラーのクラス名を取得
 *
 * @param score - 品質スコア（0-100）
 * @returns TailwindCSSの背景カラークラス名
 *
 * @example
 * getQualityBg(95) // 'bg-green-500/10 border-green-500/30'
 */
export const getQualityBg = (score: number): string => {
  if (score >= 90) return 'bg-green-500/10 border-green-500/30';
  if (score >= 75) return 'bg-blue-500/10 border-blue-500/30';
  if (score >= 60) return 'bg-yellow-500/10 border-yellow-500/30';
  return 'bg-red-500/10 border-red-500/30';
};

/**
 * レイテンシをフォーマット
 *
 * @param ms - ミリ秒単位のレイテンシ
 * @returns フォーマットされた文字列（例: "150ms", "2.5s", "-"）
 *
 * @example
 * formatLatency(150) // "150ms"
 * formatLatency(2500) // "2.5s"
 * formatLatency(0) // "-"
 */
export const formatLatency = (ms: number): string => {
  if (!isFinite(ms) || ms === 0) return '-';
  if (ms < 1000) return `${Math.round(ms)}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
};
