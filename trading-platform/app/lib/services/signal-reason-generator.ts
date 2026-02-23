import type { Signal } from '@/app/types/signal';

/**
 * Generate a beginner-friendly reason for the signal
 */
export function generateSignalReason(signal: Signal): string {
  if (signal.reason) {
    return signal.reason;
  }

  const { type, confidence, accuracy } = signal;

  if (type === 'BUY') {
    if (confidence >= 80) {
      return `AIが${confidence}%の自信を持って上昇を予測しています。過去の的中率も${accuracy}%と高水準です。`;
    }
    return `上昇の兆候が見られます。AIの自信度は${confidence}%です。`;
  }

  if (type === 'SELL') {
    if (confidence >= 80) {
      return `AIが${confidence}%の自信を持って下落を予測しています。利益確定や損切りを検討してください。`;
    }
    return `下落の兆候が見られます。AIの自信度は${confidence}%です。`;
  }

  return '現在は明確な売買サインが出ていません。次のチャンスを待ちましょう。';
}
