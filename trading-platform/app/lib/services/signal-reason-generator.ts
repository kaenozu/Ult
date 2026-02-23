import { Signal } from '@/app/types/signal';

export function generateSignalReason(signal: Signal): string {
  // 基本的な理由があればそれを返す
  if (signal.reason) {
    return signal.reason;
  }

  // なければシグナルタイプに基づいたデフォルトメッセージ
  if (signal.type === 'BUY') {
    return '買いシグナルが検出されました。';
  } else if (signal.type === 'SELL') {
    return '売りシグナルが検出されました。';
  }

  return '様子見が推奨されます。';
}
