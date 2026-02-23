import { Order, Position } from '@/app/types';
import { PsychologyAlert, RiskTradingSession, BiasAnalysis } from '@/app/types/risk';
import { logger } from '@/app/core/logger';
import { IndicatorCalculator } from './indicators';
import { SentimentAnalyzer } from './sentiment';
import { TradingRules, ProposedPosition, RiskCheckResult, RuleViolationResult } from './types';

export class PsychologyMonitor {
  private tradingHistory: Order[] = [];
  private sessions: RiskTradingSession[] = [];
  private currentSession: RiskTradingSession | null = null;
  private alerts: PsychologyAlert[] = [];

  private indicators: IndicatorCalculator;
  private sentiment: SentimentAnalyzer;

  constructor() {
    this.indicators = new IndicatorCalculator(
      () => this.tradingHistory,
      (hours) => this.getRecentTrades(hours),
      () => this.currentSession
    );

    this.sentiment = new SentimentAnalyzer(
      (hours) => this.getRecentTrades(hours),
      () => this.tradingHistory,
      () => this.analyzeTradingBehavior(),
      () => this.getAverageTradeSize(),
      (trades) => this.indicators.calculateTradeResults(trades),
      (position) => this.getPositionHoldTime(position)
    );
  }

  analyzeTradingBehavior() {
    return this.indicators.calculateBehaviorMetrics();
  }

  generatePsychologyAlerts(positions?: Position[]): PsychologyAlert[] {
    const metrics = this.analyzeTradingBehavior();
    const newAlerts: PsychologyAlert[] = [];

    if (metrics.overTradingScore > 70) {
      newAlerts.push({
        type: 'overtrading',
        severity: metrics.overTradingScore > 85 ? 'high' : 'medium',
        message: `過度な取引が検出されました。スコア: ${metrics.overTradingScore.toFixed(0)}`,
        recommendation: '取引頻度を減らし、質の高いセットアップのみに焦点を当ててください。',
        timestamp: new Date()
      });
    }

    if (metrics.consecutiveLosses >= 3) {
      newAlerts.push({
        type: 'revenge_trading',
        severity: metrics.consecutiveLosses >= 5 ? 'high' : 'medium',
        message: `連続損失が${metrics.consecutiveLosses}回続いています。`,
        recommendation: '一時的に取引を停止し、戦略を見直してください。',
        timestamp: new Date()
      });
    }

    if (metrics.emotionalTradingScore > 70) {
      newAlerts.push({
        type: metrics.consecutiveWins >= 3 ? 'greed' : 'fear',
        severity: metrics.emotionalTradingScore > 85 ? 'high' : 'medium',
        message: `感情的な取引パターンが検出されました。スコア: ${metrics.emotionalTradingScore.toFixed(0)}`,
        recommendation: '冷静さを取り戻し、トレーディングプランに従ってください。',
        timestamp: new Date()
      });
    }

    if (this.currentSession && this.indicators.isTraderFatigued()) {
      newAlerts.push({
        type: 'fatigue',
        severity: 'medium',
        message: '長時間の取引により疲労が検出されました。',
        recommendation: '休憩を取り、明日再開してください。',
        timestamp: new Date()
      });
    }

    const recentTrades = this.getRecentTrades(1);
    if (recentTrades.length >= 3) {
      newAlerts.push({
        type: 'fomo',
        severity: 'high',
        message: '短時間に複数の取引が検出されました。FOMO（取り残される恐怖）の可能性があります。',
        recommendation: '一度立ち止まり、取引計画を確認してください。感情ではなく戦略に基づいて取引してください。',
        timestamp: new Date()
      });
    }

    if (positions && positions.length > 0) {
      const longLosingPositions = positions.filter(p =>
        p.currentPrice < p.avgPrice &&
        this.getPositionHoldTime(p) > 7
      );

      if (longLosingPositions.length > 0) {
        newAlerts.push({
          type: 'confirmation_bias',
          severity: 'high',
          message: `${longLosingPositions.length}つの損失ポジションを長期保有しています。確認バイアスの可能性があります。`,
          recommendation: '客観的にポジションを評価し、損切りルールに従ってください。希望的観測ではなくデータに基づいて判断してください。',
          timestamp: new Date()
        });
      }
    }

    if (metrics.consecutiveLosses >= 2) {
      const recentBuys = this.getRecentTrades(24).filter(t => t.side === 'BUY');
      const symbols = new Set(recentBuys.map(t => t.symbol));

      if (symbols.size < recentBuys.length / 2) {
        newAlerts.push({
          type: 'loss_aversion',
          severity: 'high',
          message: '連続損失後に同じシンボルを買い増ししています。損失嫌悪バイアスの可能性があります。',
          recommendation: '損失を取り戻そうとする心理に注意してください。平均化戦略は慎重に行い、リスク管理を優先してください。',
          timestamp: new Date()
        });
      }
    }

    this.alerts.push(...newAlerts);
    return newAlerts;
  }

  startSession(): void {
    this.currentSession = {
      id: `session_${Date.now()}`,
      startTime: new Date().toISOString(),
      tradesCount: 0,
      winCount: 0,
      lossCount: 0,
      totalProfit: 0,
      emotions: [],
      violations: [],
      notes: '',
      emotionalState: 'calm',
      decisionQuality: 100,
      profitLoss: 0
    } as any;
  }

  endSession(): void {
    if (this.currentSession) {
      this.currentSession.endTime = new Date().toISOString();
      this.sessions.push(this.currentSession);
      this.currentSession = null;
    }
  }

  recordTrade(order: Order): void {
    this.tradingHistory.push(order);

    if (this.currentSession) {
      this.currentSession.tradesCount++;
      this.updateEmotionalState();
      this.updateDecisionQuality();
    }

    const alerts = this.generatePsychologyAlerts();
    if (alerts.length > 0) {
      this.notifyAlerts(alerts);
    }
  }

  checkExcessiveRiskTaking(
    proposedPosition: ProposedPosition,
    normalRiskAmount: number
  ): RiskCheckResult {
    const riskMultiplier = proposedPosition.riskAmount / normalRiskAmount;
    const isExcessive = riskMultiplier > 1.5;

    let recommendation = '';
    if (isExcessive) {
      if (riskMultiplier > 2.0) {
        recommendation = '極めて危険：通常の2倍以上のリスクです。ポジションサイズを大幅に縮小してください。';
      } else {
        recommendation = '警告：通常より50%以上高いリスクです。ポジションサイズの見直しを推奨します。';
      }
    }

    return { isExcessive, riskMultiplier, recommendation };
  }

  checkRuleViolation(order: Order, rules: TradingRules): RuleViolationResult {
    const violations: string[] = [];

    if (rules.maxTradesPerDay) {
      const todayTrades = this.indicators.getTodayTrades();
      if (todayTrades.length >= rules.maxTradesPerDay) {
        violations.push(`1日の最大取引回数（${rules.maxTradesPerDay}回）を超えています。`);
      }
    }

    if (rules.maxLossPerDay) {
      const todayLoss = this.indicators.calculateTodayLoss();
      if (todayLoss >= rules.maxLossPerDay) {
        violations.push(`1日の最大損失額（$${rules.maxLossPerDay}）に達しています。`);
      }
    }

    return { hasViolation: violations.length > 0, violations };
  }

  detectBiases(trade: Order, positions?: Position[]): BiasAnalysis {
    return this.sentiment.detectBiases(trade, positions);
  }

  getAlerts(severity?: PsychologyAlert['severity']): PsychologyAlert[] {
    if (severity) {
      return this.alerts.filter(alert => alert.severity === severity);
    }
    return this.alerts;
  }

  clearAlerts(): void {
    this.alerts = [];
  }

  private getRecentTrades(hours: number): Order[] {
    const cutoffTime = Date.now() - hours * 60 * 60 * 1000;
    return this.tradingHistory.filter(trade => (trade.timestamp || 0) >= cutoffTime);
  }

  private getAverageTradeSize(): number {
    if (this.tradingHistory.length === 0) return 100;
    const totalQuantity = this.tradingHistory.reduce((sum, trade) => sum + trade.quantity, 0);
    return totalQuantity / this.tradingHistory.length;
  }

  private getPositionHoldTime(position: Position): number {
    const entryDate = new Date(position.entryDate || Date.now());
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - entryDate.getTime());
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }

  private updateEmotionalState(): void {
    if (!this.currentSession) return;

    const metrics = this.analyzeTradingBehavior();

    if (metrics.consecutiveWins >= 3) {
      this.currentSession.emotionalState = 'excited';
    } else if (metrics.consecutiveLosses >= 3) {
      this.currentSession.emotionalState = 'fearful';
    } else if (this.indicators.isTraderFatigued()) {
      this.currentSession.emotionalState = 'tired';
    } else {
      this.currentSession.emotionalState = 'calm';
    }
  }

  private updateDecisionQuality(): void {
    if (!this.currentSession) return;

    const metrics = this.analyzeTradingBehavior();
    let quality = 100;

    quality -= metrics.overTradingScore * 0.3;
    quality -= metrics.emotionalTradingScore * 0.3;

    if (this.indicators.isTraderFatigued()) {
      quality -= 20;
    }

    this.currentSession.decisionQuality = Math.max(0, quality);
  }

  private notifyAlerts(alerts: PsychologyAlert[]): void {
    alerts.forEach(alert => {
      logger.warn(
        `Psychology Alert [${alert.type}]: ${alert.message}`,
        {
          severity: alert.severity,
          recommendation: alert.recommendation,
          timestamp: alert.timestamp
        },
        'PsychologyMonitor'
      );
    });
  }
}

export const createPsychologyMonitor = (): PsychologyMonitor => {
  return new PsychologyMonitor();
};
