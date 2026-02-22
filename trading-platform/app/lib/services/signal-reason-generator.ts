import { Signal } from '@/app/types/signal';

/**
 * 初心者向けに分かりやすい売買理由を生成する
 */
export function generateSignalReason(signal: Signal): string {
  if (signal.type === 'HOLD') {
    return '現在は明確なトレンドが出ていません。次のチャンスを待ちましょう。';
  }

  const indicators = [];
  if (signal.agreeingIndicators?.includes('RSI')) indicators.push('売られすぎからの回復');
  if (signal.agreeingIndicators?.includes('MACD')) indicators.push('上昇トレンドの開始');
  if (signal.agreeingIndicators?.includes('BB')) indicators.push('安値圏での反発');

  const indicatorText = indicators.length > 0 
    ? `（${indicators.join('、')}を確認）` 
    : '';

  if (signal.type === 'BUY') {
    if (signal.confidence >= 85) {
      return `複数の強力な上昇シグナルが一致しています${indicatorText}。高い確率で利益が期待できるタイミングです。`;
    }
    return `上昇の兆候が見られます${indicatorText}。リスクを抑えつつエントリーを検討できる水準です。`;
  }

  if (signal.type === 'SELL') {
    if (signal.confidence >= 85) {
      return `強い下落圧力を検知しました。リスク回避のため、早めの利益確定または損切りを推奨します。`;
    }
    return `調整局面に入る可能性があります。慎重な対応が必要です。`;
  }

  return signal.reason || 'AIの分析に基づき、現在のポジションを推奨します。';
}
