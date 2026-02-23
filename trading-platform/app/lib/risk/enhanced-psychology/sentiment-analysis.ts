import { RiskTradingSession, CoolingReason } from '@/app/types/risk';
import {
  EnhancedBehaviorMetrics,
  TiltIndicators,
  PsychologicalState,
} from './types';
import { CoolingOffManager } from '../CoolingOffManager';

export function calculateEmotionalVolatility(
  sessions: RiskTradingSession[]
): number {
  if (sessions.length < 2) return 0;

  const recentSessions = sessions.slice(-10);
  const emotionalScores: number[] = recentSessions.map((s) => {
    switch (s.emotionalState) {
      case 'calm':
        return 0;
      case 'excited':
        return 50;
      case 'fearful':
        return 75;
      case 'angry':
        return 90;
      case 'tired':
        return 60;
      default:
        return 0;
    }
  });

  const mean =
    emotionalScores.reduce((sum, s) => sum + s, 0) / emotionalScores.length;
  const variance =
    emotionalScores.reduce((sum, s) => sum + Math.pow(s - mean, 2), 0) /
    emotionalScores.length;

  return Math.min(100, Math.sqrt(variance));
}

export function calculateImpulsivityScore(tradeTimestamps: number[]): number {
  if (tradeTimestamps.length < 2) return 0;

  const intervals: number[] = [];
  for (let i = 1; i < tradeTimestamps.length; i++) {
    intervals.push(tradeTimestamps[i] - tradeTimestamps[i - 1]);
  }

  const quickTrades = intervals.filter((i) => i < 5 * 60 * 1000).length;
  const ratio = quickTrades / intervals.length;

  return Math.min(100, ratio * 150);
}

export function calculateDisciplineScore(
  coolingOffManager: CoolingOffManager,
  indicators: TiltIndicators
): number {
  let score = 100;

  const cooldownStats = coolingOffManager.getCooldownStats();
  if (cooldownStats.totalCooldowns > 0) {
    const violationRate =
      cooldownStats.totalViolations / cooldownStats.totalCooldowns;
    score -= violationRate * 30;
  }

  const violationCount = Object.values(indicators).filter((v) => v).length;
  score -= violationCount * 10;

  return Math.max(0, score);
}

export function calculateRecoveryRate(): number {
  return 50;
}

export function evaluateTradeQualityTrend(
  sessions: RiskTradingSession[]
): 'improving' | 'stable' | 'declining' {
  if (sessions.length < 3) return 'stable';

  const recentSessions = sessions.slice(-5);
  const qualityScores = recentSessions.map((s) => s.decisionQuality);

  const firstHalf = qualityScores.slice(
    0,
    Math.floor(qualityScores.length / 2)
  );
  const secondHalf = qualityScores.slice(
    Math.floor(qualityScores.length / 2)
  );

  const firstAvg =
    firstHalf.reduce((sum, q) => sum + q, 0) / firstHalf.length;
  const secondAvg =
    secondHalf.reduce((sum, q) => sum + q, 0) / secondHalf.length;

  if (secondAvg > firstAvg + 5) return 'improving';
  if (secondAvg < firstAvg - 5) return 'declining';
  return 'stable';
}

export function isBurnout(sessions: RiskTradingSession[]): boolean {
  if (sessions.length < 5) return false;

  const recentSessions = sessions.slice(-5);
  const tiredSessions = recentSessions.filter(
    (s) => s.emotionalState === 'tired'
  ).length;

  return tiredSessions >= 3;
}

export function generateRecommendation(
  overall: PsychologicalState['overall'],
  metrics: EnhancedBehaviorMetrics
): string {
  if (overall === 'tilted') {
    return '強制的に休憩を取ってください。少なくとも1時間は取引を控えることを推奨します。';
  }

  if (overall === 'burnout') {
    return '深刻なバーンアウトの兆候があります。数日間の完全な休息を取ってください。';
  }

  if (overall === 'stressed') {
    return '取引頻度を減らし、確実性の高いセットアップのみに集中してください。';
  }

  if (metrics.tradeQualityTrend === 'declining') {
    return '取引品質が低下しています。戦略を見直し、小さなポジションから再開してください。';
  }

  return '心理状態は良好です。計画に従って取引を続けてください。';
}

export function evaluatePsychologicalState(
  metrics: EnhancedBehaviorMetrics,
  indicators: TiltIndicators,
  sessions: RiskTradingSession[]
): PsychologicalState {
  let overall: PsychologicalState['overall'] = 'healthy';
  let stress = 0;
  let focus = 100;

  stress = Math.min(
    100,
    metrics.tiltScore * 0.4 +
      metrics.emotionalVolatility * 0.3 +
      metrics.impulsivityScore * 0.3
  );

  focus = Math.max(0, 100 - stress);

  if (metrics.tiltScore > 70) {
    overall = 'tilted';
  } else if (metrics.tiltScore > 50 || stress > 60) {
    overall = 'stressed';
  } else if (isBurnout(sessions)) {
    overall = 'burnout';
  }

  const confidence = metrics.disciplineScore * 0.7 + metrics.winRate * 0.3;

  let emotional: PsychologicalState['emotional'] = 'calm';
  if (indicators.overconfidence) {
    emotional = 'excited';
  } else if (indicators.panicSelling || indicators.revengeTrading) {
    emotional = 'fearful';
  } else if (indicators.rapidFireTrading) {
    emotional = 'angry';
  } else if (isBurnout(sessions)) {
    emotional = 'tired';
  }

  const recommendation = generateRecommendation(overall, metrics);

  return {
    overall,
    confidence,
    emotional,
    focus,
    stress,
    recommendation,
  };
}

export function shouldEnforceCoolingOff(
  metrics: EnhancedBehaviorMetrics,
  indicators: TiltIndicators,
  getRecentTradeCount: (hours: number) => number
): CoolingReason | null {
  if (metrics.tiltScore > 75) {
    return {
      type: 'consecutive_losses',
      severity: 8,
      triggerValue: metrics.consecutiveLosses,
      description: `ティルトスコア ${metrics.tiltScore.toFixed(0)} により強制冷却期間を開始`,
    };
  }

  if (metrics.consecutiveLosses >= 5) {
    return {
      type: 'consecutive_losses',
      severity: Math.min(10, metrics.consecutiveLosses),
      triggerValue: metrics.consecutiveLosses,
      description: `${metrics.consecutiveLosses}回の連続損失`,
    };
  }

  if (metrics.overTradingScore > 80) {
    return {
      type: 'overtrading',
      severity: 7,
      triggerValue: getRecentTradeCount(24),
      description: `過度な取引（スコア: ${metrics.overTradingScore.toFixed(0)}）`,
    };
  }

  if (indicators.revengeTrading) {
    return {
      type: 'consecutive_losses',
      severity: 9,
      triggerValue: metrics.consecutiveLosses,
      description: 'リベンジトレードの兆候を検出',
    };
  }

  return null;
}
