import type { PerformanceMetrics } from '@/app/types/performance';
import {
  BacktestTrade,
  PerformanceReport,
  MarketRegime,
} from './types';
import {
  calculateDrawdownCurve,
} from './calculations';

export function generateRecommendations(trades: BacktestTrade[], metrics: PerformanceMetrics): string[] {
  const recommendations: string[] = [];

  if (metrics.winRate < 40) {
    recommendations.push('勝率が低いです。エントリー条件を厳しくするか、戦略の見直しを検討してください。');
  }

  if (metrics.profitFactor < 1.5) {
    recommendations.push('プロフィットファクターが低いです。損切りを早めるか、利確を伸ばすことを検討してください。');
  }

  if (metrics.maxDrawdown > 20) {
    recommendations.push('最大ドローダウンが大きいです。ポジションサイズを小さくするか、リスク管理を強化してください。');
  }

  if (metrics.sharpeRatio < 1) {
    recommendations.push('シャープレシオが低いです。リスク調整後リターンを改善するため、ボラティリティを考慮した戦略を検討してください。');
  }

  if (recommendations.length === 0) {
    recommendations.push('全体的に良好なパフォーマンスです。現在の戦略を継続してください。');
  }

  return recommendations;
}

export function assessRisk(trades: BacktestTrade[], equityCurve: number[]): PerformanceReport['riskAssessment'] {
  const returns = equityCurve.slice(1).map((eq, i) => (eq - equityCurve[i]) / equityCurve[i]);

  const sortedReturns = [...returns].sort((a, b) => a - b);
  const var95 = Math.abs(sortedReturns[Math.floor(sortedReturns.length * 0.05)] || 0) * 100;
  const var99 = Math.abs(sortedReturns[Math.floor(sortedReturns.length * 0.01)] || 0) * 100;

  let maxConsecutiveLosses = 0;
  let currentConsecutive = 0;
  for (const trade of trades) {
    if (trade.pnl <= 0) {
      currentConsecutive++;
      maxConsecutiveLosses = Math.max(maxConsecutiveLosses, currentConsecutive);
    } else {
      currentConsecutive = 0;
    }
  }

  const winRate = trades.filter(t => t.pnl > 0).length / trades.length;
  const avgWin = trades.filter(t => t.pnl > 0).reduce((sum, t) => sum + t.pnl, 0) / trades.filter(t => t.pnl > 0).length || 1;
  const avgLoss = Math.abs(trades.filter(t => t.pnl <= 0).reduce((sum, t) => sum + t.pnl, 0)) / trades.filter(t => t.pnl <= 0).length || 1;
  const riskOfRuin = Math.pow((1 - winRate) / winRate, Math.log(0.5) / Math.log(avgLoss / avgWin)) * 100;

  let riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' = 'MEDIUM';
  if (var95 < 2 && maxConsecutiveLosses < 5) {
    riskLevel = 'LOW';
  } else if (var95 > 5 || maxConsecutiveLosses > 10) {
    riskLevel = 'HIGH';
  }

  return {
    riskLevel,
    var95,
    var99,
    maxConsecutiveLosses,
    riskOfRuin: Math.min(100, riskOfRuin),
  };
}

export function detectMarketRegimes(equityCurve: number[]): MarketRegime[] {
  const regimes: MarketRegime[] = [];
  const windowSize = 20;

  if (equityCurve.length < windowSize * 2) {
    return [{
      regime: 'UNKNOWN',
      startDate: '',
      endDate: '',
      duration: equityCurve.length,
      performance: { return: 0, volatility: 0, maxDrawdown: 0 },
      optimalStrategy: 'UNKNOWN',
    }];
  }

  let currentRegime: MarketRegime['regime'] = 'UNKNOWN';
  let regimeStart = 0;

  for (let i = windowSize; i < equityCurve.length; i++) {
    const window = equityCurve.slice(i - windowSize, i);
    const returns = window.slice(1).map((eq, idx) => (eq - window[idx]) / window[idx]);

    const avgReturn = returns.reduce((a, b) => a + b, 0) / returns.length;
    const volatility = Math.sqrt(returns.reduce((sum, r) => sum + Math.pow(r - avgReturn, 2), 0) / returns.length);

    let detectedRegime: MarketRegime['regime'];
    if (volatility > 0.03) {
      detectedRegime = 'VOLATILE';
    } else if (avgReturn > 0.001) {
      detectedRegime = 'TRENDING_UP';
    } else if (avgReturn < -0.001) {
      detectedRegime = 'TRENDING_DOWN';
    } else {
      detectedRegime = 'RANGING';
    }

    if (detectedRegime !== currentRegime) {
      if (currentRegime !== 'UNKNOWN') {
        regimes.push(createRegimeFromWindow(currentRegime, regimeStart, i, equityCurve));
      }
      currentRegime = detectedRegime;
      regimeStart = i - windowSize;
    }
  }

  if (currentRegime !== 'UNKNOWN') {
    regimes.push(createRegimeFromWindow(currentRegime, regimeStart, equityCurve.length, equityCurve));
  }

  return regimes;
}

function createRegimeFromWindow(
  regime: MarketRegime['regime'],
  start: number,
  end: number,
  equityCurve: number[]
): MarketRegime {
  const window = equityCurve.slice(start, end);
  const returns = window.slice(1).map((eq, i) => (eq - window[i]) / window[i]);

  const totalReturn = ((window[window.length - 1] - window[0]) / window[0]) * 100;
  const avgRet = returns.reduce((a, b) => a + b, 0) / returns.length;
  const volatility = Math.sqrt(returns.reduce((sum, r) => sum + Math.pow(r - avgRet, 2), 0) / returns.length) * 100;
  const maxDrawdown = Math.max(...calculateDrawdownCurve(window));

  const optimalStrategy = getOptimalStrategy(regime);

  return {
    regime,
    startDate: '',
    endDate: '',
    duration: end - start,
    performance: {
      return: totalReturn,
      volatility,
      maxDrawdown,
    },
    optimalStrategy,
  };
}

function getOptimalStrategy(regime: MarketRegime['regime']): string {
  switch (regime) {
    case 'TRENDING_UP':
      return 'TREND_FOLLOWING';
    case 'TRENDING_DOWN':
      return 'MEAN_REVERSION';
    case 'RANGING':
      return 'MEAN_REVERSION';
    case 'VOLATILE':
      return 'BREAKOUT';
    default:
      return 'COMPOSITE';
  }
}
