import type { Signal } from '@/app/types/signal';

/**
 * Generate simplified signal reason for beginner mode
 */
export function generateSignalReason(signal: Signal): string {
  if (signal.reason) {
    // If reason already exists, simplify it or return as is
    // Assuming existing reason might be technical
    return signal.reason;
  }

  const direction = signal.type === 'BUY' ? '上昇' : signal.type === 'SELL' ? '下落' : '横ばい';

  if (signal.confidence >= 80) {
    return `AIが${direction}を強く予測しています。複数の指標が一致しており、信頼度が高い状態です。`;
  }

  if (signal.confidence >= 60) {
    return `AIが${direction}を予測しています。トレンドに乗るチャンスです。`;
  }

  return `市場の方向性が定まっていません。様子見を推奨します。`;
}
