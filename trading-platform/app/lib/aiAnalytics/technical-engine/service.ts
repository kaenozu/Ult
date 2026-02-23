import { OHLCV } from '../../../types/shared';
import { ConsensusSignalService } from '../../ConsensusSignalService';
import type { ConsensusSignal } from '../../ConsensusSignalService';
import {
  CompositeAnalysis,
  RSIAnalysis,
  TrendAnalysis,
  VolatilityAnalysis,
  MomentumAnalysis,
  Direction,
  Strength,
} from './types';
import { analyzeRSI, analyzeTrend, analyzeVolatility, analyzeMomentum } from './indicators';

export class CompositeTechnicalAnalysisEngine {
  private consensusService: ConsensusSignalService;

  constructor() {
    this.consensusService = new ConsensusSignalService();
  }

  analyze(data: OHLCV[]): CompositeAnalysis {
    if (data.length < 60) {
      return this.createNeutralAnalysis('データ不足: 最低60期間必要です');
    }

    const rsiAnalysis = analyzeRSI(data);
    const trendAnalysis = analyzeTrend(data);
    const volatilityAnalysis = analyzeVolatility(data);
    const momentumAnalysis = analyzeMomentum(data);
    
    const consensus = this.consensusService.generateConsensus(data);

    const finalScore = this.calculateFinalScore({
      rsi: rsiAnalysis.score,
      trend: trendAnalysis.score,
      volatility: volatilityAnalysis.score,
      momentum: momentumAnalysis.score,
      consensus: this.consensusToScore(consensus),
    });

    const direction = this.determineDirection(finalScore);
    const confidence = this.calculateConfidence(
      rsiAnalysis,
      trendAnalysis,
      volatilityAnalysis,
      momentumAnalysis,
      consensus
    );
    const strength = this.determineStrength(confidence, finalScore);

    const explainability = this.generateExplainability({
      rsiAnalysis,
      trendAnalysis,
      volatilityAnalysis,
      momentumAnalysis,
      consensus,
      direction,
      confidence,
    });

    return {
      rsi: rsiAnalysis,
      trend: trendAnalysis,
      volatility: volatilityAnalysis,
      momentum: momentumAnalysis,
      consensus,
      finalScore,
      direction,
      confidence,
      strength,
      explainability,
    };
  }

  private calculateFinalScore(scores: {
    rsi: number;
    trend: number;
    volatility: number;
    momentum: number;
    consensus: number;
  }): number {
    const weights = {
      rsi: 0.20,
      trend: 0.25,
      volatility: 0.15,
      momentum: 0.20,
      consensus: 0.20,
    };

    const finalScore =
      scores.rsi * weights.rsi +
      scores.trend * weights.trend +
      scores.volatility * weights.volatility +
      scores.momentum * weights.momentum +
      scores.consensus * weights.consensus;

    return Math.max(-1, Math.min(1, finalScore));
  }

  private consensusToScore(consensus: ConsensusSignal): number {
    const typeScore: Record<string, number> = {
      'BUY': 0.7,
      'SELL': -0.7,
      'HOLD': 0,
    };
    
    const base = typeScore[consensus.type] || 0;
    const confidenceMultiplier = consensus.confidence / 100;
    
    return base * confidenceMultiplier;
  }

  private determineDirection(score: number): Direction {
    if (score > 0.2) return 'BUY';
    if (score < -0.2) return 'SELL';
    return 'NEUTRAL';
  }

  private calculateConfidence(
    rsi: RSIAnalysis,
    trend: TrendAnalysis,
    volatility: VolatilityAnalysis,
    momentum: MomentumAnalysis,
    consensus: ConsensusSignal
  ): number {
    const scores = [rsi.score, trend.score, volatility.score, momentum.score];
    const mean = scores.reduce((a, b) => a + b, 0) / scores.length;
    const variance = scores.reduce((sum, s) => sum + Math.pow(s - mean, 2), 0) / scores.length;
    const agreement = 1 - Math.min(variance * 2, 1);

    const consensusConfidence = consensus.confidence / 100;

    let specialSignalBonus = 0;
    if (rsi.divergence.detected) specialSignalBonus += 0.1;
    if (trend.crossover.detected) specialSignalBonus += 0.1;
    if (momentum.macdCross.detected) specialSignalBonus += 0.1;

    const confidence = agreement * 0.5 + consensusConfidence * 0.5 + specialSignalBonus;
    
    return Math.max(0, Math.min(1, confidence));
  }

  private determineStrength(confidence: number, score: number): Strength {
    const magnitude = Math.abs(score);
    
    if (confidence > 0.75 && magnitude > 0.6) return 'STRONG';
    if (confidence > 0.5 && magnitude > 0.4) return 'MODERATE';
    return 'WEAK';
  }

  private generateExplainability(params: {
    rsiAnalysis: RSIAnalysis;
    trendAnalysis: TrendAnalysis;
    volatilityAnalysis: VolatilityAnalysis;
    momentumAnalysis: MomentumAnalysis;
    consensus: ConsensusSignal;
    direction: Direction;
    confidence: number;
  }): {
    primaryReasons: string[];
    supportingReasons: string[];
    warnings: string[];
  } {
    const { rsiAnalysis, trendAnalysis, volatilityAnalysis, momentumAnalysis, consensus, direction } = params;

    const allReasons: Array<{ reason: string; score: number; category: string }> = [];

    rsiAnalysis.reasons.forEach(reason => {
      allReasons.push({ reason, score: Math.abs(rsiAnalysis.score), category: 'RSI' });
    });

    trendAnalysis.reasons.forEach(reason => {
      allReasons.push({ reason, score: Math.abs(trendAnalysis.score), category: 'Trend' });
    });

    volatilityAnalysis.reasons.forEach(reason => {
      allReasons.push({ reason, score: Math.abs(volatilityAnalysis.score), category: 'Volatility' });
    });

    momentumAnalysis.reasons.forEach(reason => {
      allReasons.push({ reason, score: Math.abs(momentumAnalysis.score), category: 'Momentum' });
    });

    allReasons.sort((a, b) => b.score - a.score);

    const primaryReasons = allReasons.slice(0, 3).map(r => `[${r.category}] ${r.reason}`);
    const supportingReasons = allReasons.slice(3, 6).map(r => `[${r.category}] ${r.reason}`);

    const warnings: string[] = [];
    
    if (direction !== 'NEUTRAL' && params.confidence < 0.5) {
      warnings.push('確信度が低いため、慎重な判断が必要です');
    }

    if (volatilityAnalysis.state === 'squeeze') {
      warnings.push('ボラティリティが低下中。大きな値動きの可能性あり');
    } else if (volatilityAnalysis.state === 'expansion') {
      warnings.push('ボラティリティが高い状態。リスク管理に注意');
    }

    if (rsiAnalysis.signal === 'extreme_oversold' || rsiAnalysis.signal === 'extreme_overbought') {
      warnings.push('RSIが極端な水準。反転の可能性に注意');
    }

    const consensusDirection = consensus.type === 'BUY' ? 'BUY' : consensus.type === 'SELL' ? 'SELL' : 'NEUTRAL';
    if (direction !== 'NEUTRAL' && consensusDirection !== 'NEUTRAL' && direction !== consensusDirection) {
      warnings.push('複合分析とコンセンサスシグナルが不一致');
    }

    return { primaryReasons, supportingReasons, warnings };
  }

  private createNeutralAnalysis(reason: string): CompositeAnalysis {
    const neutralRSI: RSIAnalysis = {
      current: 50,
      trend: 'neutral',
      signal: 'neutral',
      divergence: { detected: false, type: 'none', strength: 0 },
      score: 0,
      reasons: [reason],
    };

    const neutralTrend: TrendAnalysis = {
      shortTerm: 'neutral',
      mediumTerm: 'neutral',
      longTerm: 'neutral',
      crossover: { detected: false, type: 'none', strength: 0 },
      alignment: 0,
      score: 0,
      reasons: [reason],
    };

    const neutralVolatility: VolatilityAnalysis = {
      current: 0,
      state: 'normal',
      bollingerPosition: 50,
      bandwidth: 0,
      score: 0,
      reasons: [reason],
    };

    const neutralMomentum: MomentumAnalysis = {
      macdHistogram: 0,
      histogramTrend: 'neutral',
      macdCross: { detected: false, type: 'none', strength: 0 },
      score: 0,
      reasons: [reason],
    };

    const neutralConsensus: ConsensusSignal = {
      type: 'HOLD',
      probability: 0,
      strength: 'WEAK',
      confidence: 0,
      signals: {
        rsi: { type: 'NEUTRAL', strength: 0, reason },
        macd: { type: 'NEUTRAL', strength: 0, reason },
        bollinger: { type: 'NEUTRAL', strength: 0, reason },
      },
      reason,
    };

    return {
      rsi: neutralRSI,
      trend: neutralTrend,
      volatility: neutralVolatility,
      momentum: neutralMomentum,
      consensus: neutralConsensus,
      finalScore: 0,
      direction: 'NEUTRAL',
      confidence: 0,
      strength: 'WEAK',
      explainability: {
        primaryReasons: [reason],
        supportingReasons: [],
        warnings: [],
      },
    };
  }
}
