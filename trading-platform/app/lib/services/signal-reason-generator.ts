
import { BeginnerSignal, BeginnerAction, RiskLevel } from '@/app/types/beginner-signal';

export function generateSignalReason(
  signal: BeginnerSignal,
  action: BeginnerAction,
  riskLevel: RiskLevel
): string {
  // Simplified logic stub
  if (action === 'BUY_NOW') {
    return '上昇トレンドが強く、AIも上昇を予測しています。';
  } else if (action === 'WAIT') {
    return '様子見が推奨されます。';
  } else if (action === 'SELL_NOW') {
    return '下落の可能性が高いため、売却を検討してください。';
  }
  return '特になし';
}
