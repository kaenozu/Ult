import { Order, Position } from '@/app/types';
import { BiasAnalysis, ConsecutiveLossInfo, TradingBehaviorMetrics } from '@/app/types/risk';
import { TradeResult } from './types';

export class SentimentAnalyzer {
  constructor(
    private getRecentTrades: (hours: number) => Order[],
    private getTradingHistory: () => Order[],
    private getMetrics: () => TradingBehaviorMetrics,
    private getAverageTradeSize: () => number,
    private calculateTradeResults: (trades: Order[]) => TradeResult[],
    private getPositionHoldTime: (position: Position) => number
  ) {}

  detectBiases(trade: Order, positions?: Position[]): BiasAnalysis {
    const detectedBiases: string[] = [];
    let maxSeverity: 'low' | 'medium' | 'high' = 'low';

    const fomo = this.detectFOMO(trade);
    if (fomo) {
      detectedBiases.push('FOMO (恐れによる取引)');
      maxSeverity = this.escalateSeverity(maxSeverity, 'medium');
    }

    const fear = this.detectFearBias(trade);
    if (fear) {
      detectedBiases.push('恐怖バイアス (早すぎた利益確定)');
      maxSeverity = this.escalateSeverity(maxSeverity, 'medium');
    }

    const confirmationBias = this.detectConfirmationBias(trade, positions);
    if (confirmationBias) {
      detectedBiases.push('確認バイアス (損失ポジションの長期保有)');
      maxSeverity = this.escalateSeverity(maxSeverity, 'high');
    }

    const lossAversion = this.detectLossAversion(trade);
    if (lossAversion) {
      detectedBiases.push('損失嫌悪 (損失ポジションへの追加投資)');
      maxSeverity = this.escalateSeverity(maxSeverity, 'high');
    }

    const recommendations = this.generateBiasRecommendations(detectedBiases);

    return {
      detectedBiases,
      severity: maxSeverity,
      recommendations
    };
  }

  detectConsecutiveLosses(history: Order[]): ConsecutiveLossInfo {
    let count = 0;
    let totalLoss = 0;
    let startedAt = new Date();
    let lastLossAt = new Date();

    const tradeResults = this.calculateTradeResults(history.filter(o => o.status === 'FILLED'));

    for (let i = tradeResults.length - 1; i >= 0; i--) {
      const result = tradeResults[i];
      if (result.pnl < 0) {
        if (count === 0) lastLossAt = new Date(result.trade.timestamp || Date.now());
        count++;
        totalLoss += Math.abs(result.pnl);
        startedAt = new Date(result.trade.timestamp || Date.now());
      } else if (count > 0) {
        break;
      }
    }

    return {
      count,
      totalLoss,
      startedAt,
      lastLossAt
    };
  }

  private detectFOMO(trade: Order): boolean {
    const recentTrades = this.getRecentTrades(1);

    if (recentTrades.length >= 3) {
      return true;
    }

    const metrics = this.getMetrics();
    if (metrics.consecutiveWins >= 3 && trade.quantity > this.getAverageTradeSize() * 1.5) {
      return true;
    }

    return false;
  }

  private detectFearBias(trade: Order): boolean {
    if (trade.side === 'SELL') {
      const metrics = this.getMetrics();
      return metrics.consecutiveLosses >= 2;
    }
    return false;
  }

  private detectConfirmationBias(trade: Order, positions?: Position[]): boolean {
    if (!positions || positions.length === 0) return false;

    const losingPositions = positions.filter(p =>
      p.currentPrice < p.avgPrice &&
      this.getPositionHoldTime(p) > 7
    );

    return losingPositions.length > 0;
  }

  private detectLossAversion(trade: Order): boolean {
    const metrics = this.getMetrics();

    if (metrics.consecutiveLosses >= 2 && trade.side === 'BUY') {
      const recentLosses = this.getRecentTrades(24).filter(t =>
        t.side === 'BUY' && t.symbol === trade.symbol
      );
      return recentLosses.length >= 2;
    }

    return false;
  }

  private generateBiasRecommendations(biases: string[]): string[] {
    if (biases.length === 0) {
      return ['心理的バイアスは検出されませんでした。良好な取引判断を継続してください。'];
    }

    return [
      `以下のバイアスが検出されました: ${biases.join(', ')}`,
      '取引計画を見直し、客観的な判断を行ってください',
      '必要に応じてクーリングオフ期間を設けてください',
      '感情日記をつけて、バイアスのパターンを認識してください'
    ];
  }

  private escalateSeverity(
    current: 'low' | 'medium' | 'high',
    newSeverity: 'low' | 'medium' | 'high'
  ): 'low' | 'medium' | 'high' {
    const levels = { low: 1, medium: 2, high: 3 };
    return levels[newSeverity] > levels[current] ? newSeverity : current;
  }
}
