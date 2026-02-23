import { Signal } from '@/app/types/signal';

/**
 * Generates a beginner-friendly reason for the trading signal
 */
export function generateSignalReason(signal: Signal): string {
  if (!signal.reason) {
    return '分析データに基づき、市場の動向を予測しました。';
  }

  // Remove technical jargon or simplify existing reason
  // This is a basic implementation to satisfy the type requirement
  // and provide a meaningful string.
  return signal.reason.replace(/【強気】/g, '【買いチャンス】')
                      .replace(/【弱気】/g, '【売りチャンス】')
                      .replace(/RSI/g, '相対力指数')
                      .replace(/SMA/g, '移動平均線')
                      .replace(/MACD/g, 'トレンド指標');
}
