import { Order } from '@/app/types';
import { PsychologyAlert, RiskTradingSession } from '@/app/types/risk';
import { CoolingOffManager } from '../CoolingOffManager';
import {
  EnhancedBehaviorMetrics,
  TiltIndicators,
  PsychologicalState,
} from './types';
import { detectAllTiltIndicators, calculateTiltScore } from './bias-detection';
import {
  calculateEmotionalVolatility,
  calculateImpulsivityScore,
  calculateDisciplineScore,
  calculateRecoveryRate,
  evaluateTradeQualityTrend,
  evaluatePsychologicalState,
  shouldEnforceCoolingOff,
} from './sentiment-analysis';
import {
  calculateOverTradingScore,
  calculateEmotionalTradingScore,
  calculateConsecutiveResultsFromTrades,
  calculateTradeResultsFromHistory,
  calculateMetricsFromResults,
  generateEnhancedAlertsList,
} from './metrics';

export class EnhancedPsychologyMonitor {
  private tradingHistory: Order[] = [];
  private sessions: RiskTradingSession[] = [];
  private currentSession: RiskTradingSession | null = null;
  private alerts: PsychologyAlert[] = [];
  private coolingOffManager: CoolingOffManager;
  private tradeTimestamps: number[] = [];
  private positionSizeHistory: number[] = [];

  constructor(coolingOffManager?: CoolingOffManager) {
    this.coolingOffManager = coolingOffManager || new CoolingOffManager();
  }

  analyzeEnhancedBehavior(): EnhancedBehaviorMetrics {
    const baseMetrics = this.analyzeBasicBehavior();
    const tiltScore = calculateTiltScore(this.detectTiltIndicators());
    const emotionalVolatility = calculateEmotionalVolatility(this.sessions);
    const impulsivityScore = calculateImpulsivityScore(this.tradeTimestamps);
    const disciplineScore = calculateDisciplineScore(
      this.coolingOffManager,
      this.detectTiltIndicators()
    );
    const recoveryRate = calculateRecoveryRate();
    const tradeQualityTrend = evaluateTradeQualityTrend(this.sessions);

    return {
      ...baseMetrics,
      tiltScore,
      emotionalVolatility,
      impulsivityScore,
      disciplineScore,
      recoveryRate,
      tradeQualityTrend,
    };
  }

  detectTiltIndicators(): TiltIndicators {
    const metrics = this.analyzeBasicBehavior();
    return detectAllTiltIndicators(
      {
        tradingHistory: this.tradingHistory,
        sessions: this.sessions,
        currentSession: this.currentSession,
        alerts: this.alerts,
        tradeTimestamps: this.tradeTimestamps,
        positionSizeHistory: this.positionSizeHistory,
      },
      metrics,
      (hours) => this.getRecentTrades(hours)
    );
  }

  evaluatePsychologicalState(): PsychologicalState {
    const metrics = this.analyzeEnhancedBehavior();
    const indicators = this.detectTiltIndicators();
    return evaluatePsychologicalState(metrics, indicators, this.sessions);
  }

  manageAutomaticCoolingOff(): boolean {
    const metrics = this.analyzeEnhancedBehavior();
    const indicators = this.detectTiltIndicators();
    const reason = shouldEnforceCoolingOff(metrics, indicators, (h) =>
      this.getRecentTradeCount(h)
    );

    if (reason) {
      this.coolingOffManager.enforceCoolingOff(reason);
      return true;
    }
    return false;
  }

  recordTrade(order: Order): void {
    this.tradingHistory.push(order);
    this.tradeTimestamps.push(Date.now());

    if (order.quantity) {
      this.positionSizeHistory.push(order.quantity);
    }

    if (this.currentSession) {
      this.currentSession.tradesCount++;
      this.updateSessionState();
    }

    this.manageAutomaticCoolingOff();

    const alerts = this.generateEnhancedAlerts();
    if (alerts.length > 0) {
      this.notifyAlerts(alerts);
    }
  }

  canTrade(): {
    allowed: boolean;
    reason?: string;
    cooldownRemaining?: number;
  } {
    const cooldownCheck = this.coolingOffManager.canTrade();

    if (!cooldownCheck.allowed) {
      return {
        allowed: false,
        reason: cooldownCheck.reason,
        cooldownRemaining: cooldownCheck.remainingTime?.minutes,
      };
    }

    const state = this.evaluatePsychologicalState();

    if (state.overall === 'tilted') {
      return {
        allowed: false,
        reason: 'ティルト状態のため取引を推奨しません。休憩を取ってください。',
      };
    }

    if (state.overall === 'burnout') {
      return {
        allowed: false,
        reason: 'バーンアウトの兆候があります。長期の休憩を取ってください。',
      };
    }

    return { allowed: true };
  }

  startSession(): void {
    this.currentSession = {
      startTime: new Date().toISOString(),
      tradesCount: 0,
      profitLoss: 0,
      emotionalState: 'calm',
      decisionQuality: 100,
    };
  }

  endSession(): void {
    if (this.currentSession) {
      this.currentSession.endTime = new Date().toISOString();
      this.sessions.push(this.currentSession);
      this.currentSession = null;
    }
  }

  getAlerts(): PsychologyAlert[] {
    return this.alerts;
  }

  getCoolingOffManager(): CoolingOffManager {
    return this.coolingOffManager;
  }

  private analyzeBasicBehavior(): EnhancedBehaviorMetrics {
    if (this.tradingHistory.length === 0) {
      return this.getEmptyMetrics();
    }

    const tradeResults = calculateTradeResultsFromHistory(this.tradingHistory);
    const { consecutiveWins, consecutiveLosses } =
      calculateConsecutiveResultsFromTrades(tradeResults);
    const overTradingScore = calculateOverTradingScore(
      this.getRecentTradeCount(24)
    );
    const emotionalTradingScore = calculateEmotionalTradingScore(
      calculateTiltScore(this.detectTiltIndicators())
    );
    const { winRate, lossRate, avgWinSize, avgLossSize, profitFactor } =
      calculateMetricsFromResults(tradeResults);

    return {
      averageHoldTime: 4,
      winRate,
      lossRate,
      avgWinSize,
      avgLossSize,
      profitFactor,
      consecutiveWins,
      consecutiveLosses,
      overTradingScore,
      emotionalTradingScore,
      tiltScore: 0,
      emotionalVolatility: 0,
      impulsivityScore: 0,
      disciplineScore: 100,
      recoveryRate: 50,
      tradeQualityTrend: 'stable',
    };
  }

  private getEmptyMetrics(): EnhancedBehaviorMetrics {
    return {
      averageHoldTime: 0,
      winRate: 0,
      lossRate: 0,
      avgWinSize: 0,
      avgLossSize: 0,
      profitFactor: 0,
      consecutiveWins: 0,
      consecutiveLosses: 0,
      overTradingScore: 0,
      emotionalTradingScore: 0,
      tiltScore: 0,
      emotionalVolatility: 0,
      impulsivityScore: 0,
      disciplineScore: 100,
      recoveryRate: 50,
      tradeQualityTrend: 'stable',
    };
  }

  private generateEnhancedAlerts(): PsychologyAlert[] {
    const metrics = this.analyzeEnhancedBehavior();
    return generateEnhancedAlertsList(
      metrics.tiltScore,
      metrics.disciplineScore
    ) as PsychologyAlert[];
  }

  private getRecentTrades(hours: number): Order[] {
    const cutoff = Date.now() - hours * 60 * 60 * 1000;
    return this.tradingHistory.filter((t) => (t.timestamp || 0) >= cutoff);
  }

  private getRecentTradeCount(hours: number): number {
    return this.getRecentTrades(hours).length;
  }

  private updateSessionState(): void {
    if (!this.currentSession) return;

    const metrics = this.analyzeEnhancedBehavior();
    this.currentSession.decisionQuality = metrics.disciplineScore;

    const state = this.evaluatePsychologicalState();
    this.currentSession.emotionalState = state.emotional;
  }

  private notifyAlerts(alerts: PsychologyAlert[]): void {
    this.alerts.push(...alerts);
  }
}

export const createEnhancedPsychologyMonitor = (
  coolingOffManager?: CoolingOffManager
): EnhancedPsychologyMonitor => {
  return new EnhancedPsychologyMonitor(coolingOffManager);
};
