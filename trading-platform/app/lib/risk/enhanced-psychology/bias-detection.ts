import { Order } from '@/app/types';
import { TiltIndicators, PsychologyMonitorState, EnhancedBehaviorMetrics } from './types';

export function detectRapidFireTrading(
  tradeTimestamps: number[],
  getRecentTrades: (hours: number) => Order[]
): boolean {
  const recentTrades = getRecentTrades(1);
  return recentTrades.length > 5;
}

export function detectPositionSizeEscalation(
  positionSizeHistory: number[]
): boolean {
  if (positionSizeHistory.length < 3) return false;

  const recent = positionSizeHistory.slice(-3);
  const average =
    positionSizeHistory.slice(0, -3).reduce((sum, s) => sum + s, 0) /
    Math.max(1, positionSizeHistory.length - 3);

  return recent.some((size) => size > average * 2);
}

export function detectStopLossIgnorance(): boolean {
  return false;
}

export function detectRevengeTrading(
  tradingHistory: Order[]
): boolean {
  if (tradingHistory.length < 2) return false;
  return false;
}

export function detectOverconfidence(consecutiveWins: number): boolean {
  return consecutiveWins >= 5;
}

export function detectPanicSelling(
  getRecentTrades: (hours: number) => Order[]
): boolean {
  const recentTrades = getRecentTrades(0.5);
  const sellOrders = recentTrades.filter((t) => t.side === 'SELL');
  return sellOrders.length >= 3;
}

export function detectAllTiltIndicators(
  state: PsychologyMonitorState,
  metrics: EnhancedBehaviorMetrics,
  getRecentTrades: (hours: number) => Order[]
): TiltIndicators {
  return {
    rapidFireTrading: detectRapidFireTrading(state.tradeTimestamps, getRecentTrades),
    positionSizeEscalation: detectPositionSizeEscalation(state.positionSizeHistory),
    stopLossIgnorance: detectStopLossIgnorance(),
    revengeTrading: detectRevengeTrading(state.tradingHistory),
    overconfidence: detectOverconfidence(metrics.consecutiveWins),
    panicSelling: detectPanicSelling(getRecentTrades),
  };
}

export function calculateTiltScore(indicators: TiltIndicators): number {
  let score = 0;
  const weights = {
    rapidFireTrading: 20,
    positionSizeEscalation: 25,
    stopLossIgnorance: 30,
    revengeTrading: 35,
    overconfidence: 15,
    panicSelling: 25,
  };

  for (const [key, weight] of Object.entries(weights)) {
    if (indicators[key as keyof TiltIndicators]) {
      score += weight;
    }
  }

  return Math.min(100, score);
}
