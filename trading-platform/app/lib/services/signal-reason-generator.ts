import { Signal } from '@/app/types/signal';

/**
 * Generate a user-friendly reason for the signal
 * 用于初学者模式的简化理由生成
 */
export function generateSignalReason(signal: Signal): string {
  // Use existing reason if available and detailed enough
  if (signal.reason && signal.reason.length > 10) {
    return signal.reason;
  }

  // Generate fallback reason based on signal type and confidence
  if (signal.type === 'BUY') {
    if (signal.confidence >= 80) {
        return '強い上昇シグナルを検知しました。';
    }
    return '上昇トレンドの兆候が見られます。';
  } else if (signal.type === 'SELL') {
    if (signal.confidence >= 80) {
        return '強い下落シグナルを検知しました。';
    }
    return '下落トレンドの兆候が見られます。';
  }

  return '方向性が不明確なため、様子見を推奨します。';
}
