import { Signal } from '@/app/types/signal';

/**
 * Generate a human-readable reason for a trading signal
 * Used primarily for beginner mode
 */
export function generateSignalReason(signal: Signal): string {
  // Use the existing reason if available and detailed enough
  if (signal.reason && signal.reason.length > 20) {
    return signal.reason;
  }

  const direction = signal.type === 'BUY' ? '上昇' : signal.type === 'SELL' ? '下落' : '横ばい';
  const strength = signal.confidence >= 80 ? '強い' : '中程度の';

  let reason = `AI分析により${strength}${direction}トレンドが予測されています。`;

  if (signal.marketContext) {
    if (Math.abs(signal.marketContext.correlation) > 0.7) {
      reason += ` 市場全体(${signal.marketContext.indexSymbol})との強い連動が見られます。`;
    }
  }

  if (signal.predictionError && signal.predictionError < 1.0) {
    reason += ' 過去の予測精度は良好です。';
  }

  return reason;
}
