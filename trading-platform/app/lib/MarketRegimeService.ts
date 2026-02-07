import { OHLCV } from '@/app/types';
import { technicalIndicatorService } from './TechnicalIndicatorService';

export type MarketRegime = 'BULL' | 'BEAR' | 'RANGING' | 'CRASH' | 'VOLATILE';

/**
 * 相場環境判定コア (Market Regime Classifier)
 * 市場のボラティリティとトレンドの強さから、現在の取引モードを決定します。
 */
export class MarketRegimeService {
  /**
   * 現在の相場環境を分類する
   */
  classify(history: OHLCV[]): MarketRegime {
    if (history.length < 20) return 'RANGING';

    const closes = history.map(d => d.close);
    const lastPrice = closes[closes.length - 1];
    
    // 1. ボラティリティの算出 (直近5日間の値幅平均)
    const recentChanges = history.slice(-5).map(d => Math.abs(d.high - d.low) / d.close);
    const avgVolatility = recentChanges.reduce((a, b) => a + b, 0) / recentChanges.length;

    // 2. トレンドの算出 (20日移動平均との乖離)
    const sma20 = technicalIndicatorService.calculateSMA(closes, 20);
    const lastSMA = sma20[sma20.length - 1];
    const trendSlope = (lastPrice - closes[closes.length - 10]) / closes[closes.length - 10];

    // --- 分類ロジック ---
    
    // 急激なボラティリティ上昇と価格下落 = CRASH
    if (avgVolatility > 0.05 && lastPrice < lastSMA) {
      return 'CRASH';
    }

    // 高ボラティリティだが方向性がない = VOLATILE
    if (avgVolatility > 0.03) {
      return 'VOLATILE';
    }

    // 安定した上昇トレンド
    if (lastPrice > lastSMA && trendSlope > 0.01) {
      return 'BULL';
    }

    // 安定した下落トレンド
    if (lastPrice < lastSMA && trendSlope < -0.01) {
      return 'BEAR';
    }

    // 方向感のないレンジ
    return 'RANGING';
  }
}

export const marketRegimeService = new MarketRegimeService();
