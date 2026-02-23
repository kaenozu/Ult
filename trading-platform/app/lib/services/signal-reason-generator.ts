import type { Signal } from '@/app/types/signal';

/**
 * Generates a human-readable reason for a trading signal.
 *
 * @param signal The trading signal to generate a reason for.
 * @returns A string describing the reason for the signal.
 */
export function generateSignalReason(signal: Signal): string {
  if (signal.reason) {
    return signal.reason;
  }

  if (signal.type === 'HOLD') {
    return '市場の方向性が不明確なため、様子見を推奨します。';
  }

  const strength = signal.confidence >= 80 ? '強い' : '中程度の';
  const direction = signal.type === 'BUY' ? '買い' : '売り';

  return `AI分析により${strength}${direction}シグナルが検出されました。`;
}
