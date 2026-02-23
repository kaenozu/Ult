/**
 * Signal Reason Generator Service
 *
 * Generates human-readable reasons for trading signals.
 */

import { Signal } from '@/app/types/signal';

/**
 * Generates a descriptive reason string for a given signal.
 *
 * @param signal The trading signal to analyze
 * @returns A string explaining the reason for the signal
 */
export function generateSignalReason(signal: Signal): string {
  if (signal.reason) {
    return signal.reason;
  }

  // Fallback generation logic if reason is missing
  const direction = signal.type === 'BUY' ? '買い' : signal.type === 'SELL' ? '売り' : '様子見';
  const confidenceStr = signal.confidence >= 80 ? '高確度' : signal.confidence >= 50 ? '中確度' : '低確度';

  return `AI分析による${confidenceStr}の${direction}シグナルです。`;
}
