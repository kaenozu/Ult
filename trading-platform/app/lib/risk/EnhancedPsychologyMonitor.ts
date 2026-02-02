/**
 * Enhanced Psychology Monitor
 * 
 * TRADING-003: 心理状態監視とティルト検出の強化
 * より高度な心理状態検出アルゴリズムと自動冷却期間管理
 */

import { Order, Position } from '@/app/types';
import {
  TradingBehaviorMetrics,
  PsychologyAlert,
  TradingSession,
  CoolingReason
} from '@/app/types/risk';
import { CoolingOffManager } from './CoolingOffManager';

// ============================================================================
// Types
// ============================================================================

export interface EnhancedBehaviorMetrics extends TradingBehaviorMetrics {
  tiltScore: number; // 0-100, ティルト状態の深刻度
  emotionalVolatility: number; // 感情の揺れ幅
  impulsivityScore: number; // 衝動的取引スコア
  disciplineScore: number; // 規律遵守スコア
  recoveryRate: number; // 損失からの回復率
  tradeQualityTrend: 'improving' | 'stable' | 'declining';
}

export interface TiltIndicators {
  rapidFireTrading: boolean; // 連続的な素早い取引
  positionSizeEscalation: boolean; // ポジションサイズの急激な増加
  stopLossIgnorance: boolean; // ストップロス無視
  revengeTrading: boolean; // リベンジトレード
  overconfidence: boolean; // 過信
  panicSelling: boolean; // パニック売り
}

export interface PsychologicalState {
  overall: 'healthy' | 'stressed' | 'tilted' | 'burnout';
  confidence: number; // 0-100
  emotional: 'calm' | 'excited' | 'fearful' | 'angry' | 'tired';
  focus: number; // 0-100
  stress: number; // 0-100
  recommendation: string;
}

// ============================================================================
// Enhanced Psychology Monitor
// ============================================================================

export class EnhancedPsychologyMonitor {
  private tradingHistory: Order[] = [];
  private sessions: TradingSession[] = [];
  private currentSession: TradingSession | null = null;
  private alerts: PsychologyAlert[] = [];
  private coolingOffManager: CoolingOffManager;
  private tradeTimestamps: number[] = [];
  private positionSizeHistory: number[] = [];

  constructor(coolingOffManager?: CoolingOffManager) {
    this.coolingOffManager = coolingOffManager || new CoolingOffManager();
  }

  /**
   * 拡張行動メトリクスを分析
   */
  analyzeEnhancedBehavior(): EnhancedBehaviorMetrics {
    const baseMetrics = this.analyzeBasicBehavior();
    
    // ティルトスコアを計算
    const tiltScore = this.calculateTiltScore();
    
    // 感情的ボラティリティを計算
    const emotionalVolatility = this.calculateEmotionalVolatility();
    
    // 衝動性スコアを計算
    const impulsivityScore = this.calculateImpulsivityScore();
    
    // 規律スコアを計算
    const disciplineScore = this.calculateDisciplineScore();
    
    // 回復率を計算
    const recoveryRate = this.calculateRecoveryRate();
    
    // トレード品質のトレンドを評価
    const tradeQualityTrend = this.evaluateTradeQualityTrend();
    
    return {
      ...baseMetrics,
      tiltScore,
      emotionalVolatility,
      impulsivityScore,
      disciplineScore,
      recoveryRate,
      tradeQualityTrend
    };
  }

  /**
   * ティルト指標を検出
   */
  detectTiltIndicators(): TiltIndicators {
    return {
      rapidFireTrading: this.detectRapidFireTrading(),
      positionSizeEscalation: this.detectPositionSizeEscalation(),
      stopLossIgnorance: this.detectStopLossIgnorance(),
      revengeTrading: this.detectRevengeTrading(),
      overconfidence: this.detectOverconfidence(),
      panicSelling: this.detectPanicSelling()
    };
  }

  /**
   * 心理状態を評価
   */
  evaluatePsychologicalState(): PsychologicalState {
    const metrics = this.analyzeEnhancedBehavior();
    const indicators = this.detectTiltIndicators();
    
    // 総合的な状態を判定
    let overall: PsychologicalState['overall'] = 'healthy';
    let stress = 0;
    let focus = 100;
    
    // ストレスレベルを計算
    stress = Math.min(100, 
      metrics.tiltScore * 0.4 +
      metrics.emotionalVolatility * 0.3 +
      metrics.impulsivityScore * 0.3
    );
    
    // フォーカスを計算
    focus = Math.max(0, 100 - stress);
    
    // 状態分類
    if (metrics.tiltScore > 70) {
      overall = 'tilted';
    } else if (metrics.tiltScore > 50 || stress > 60) {
      overall = 'stressed';
    } else if (this.isBurnout()) {
      overall = 'burnout';
    }
    
    // 信頼レベル
    const confidence = metrics.disciplineScore * 0.7 + metrics.winRate * 0.3;
    
    // 感情状態
    let emotional: PsychologicalState['emotional'] = 'calm';
    if (indicators.overconfidence) {
      emotional = 'excited';
    } else if (indicators.panicSelling || indicators.revengeTrading) {
      emotional = 'fearful';
    } else if (indicators.rapidFireTrading) {
      emotional = 'angry';
    } else if (this.isBurnout()) {
      emotional = 'tired';
    }
    
    // 推奨事項
    const recommendation = this.generateRecommendation(overall, metrics, indicators);
    
    return {
      overall,
      confidence,
      emotional,
      focus,
      stress,
      recommendation
    };
  }

  /**
   * 自動冷却期間を管理
   */
  manageAutomaticCoolingOff(): boolean {
    const metrics = this.analyzeEnhancedBehavior();
    const indicators = this.detectTiltIndicators();
    
    // ティルトスコアが高い場合
    if (metrics.tiltScore > 75) {
      const reason: CoolingReason = {
        type: 'consecutive_losses',
        severity: 8,
        triggerValue: metrics.consecutiveLosses,
        description: `ティルトスコア ${metrics.tiltScore.toFixed(0)} により強制冷却期間を開始`
      };
      this.coolingOffManager.enforceCoolingOff(reason);
      return true;
    }
    
    // 連続損失
    if (metrics.consecutiveLosses >= 5) {
      const reason: CoolingReason = {
        type: 'consecutive_losses',
        severity: Math.min(10, metrics.consecutiveLosses),
        triggerValue: metrics.consecutiveLosses,
        description: `${metrics.consecutiveLosses}回の連続損失`
      };
      this.coolingOffManager.enforceCoolingOff(reason);
      return true;
    }
    
    // 過度な取引
    if (metrics.overTradingScore > 80) {
      const reason: CoolingReason = {
        type: 'overtrading',
        severity: 7,
        triggerValue: this.getRecentTradeCount(24),
        description: `過度な取引（スコア: ${metrics.overTradingScore.toFixed(0)}）`
      };
      this.coolingOffManager.enforceCoolingOff(reason);
      return true;
    }
    
    // リベンジトレード検出
    if (indicators.revengeTrading) {
      const reason: CoolingReason = {
        type: 'consecutive_losses',
        severity: 9,
        triggerValue: metrics.consecutiveLosses,
        description: 'リベンジトレードの兆候を検出'
      };
      this.coolingOffManager.enforceCoolingOff(reason);
      return true;
    }
    
    return false;
  }

  /**
   * 取引を記録
   */
  recordTrade(order: Order): void {
    this.tradingHistory.push(order);
    this.tradeTimestamps.push(Date.now());
    
    // ポジションサイズを記録
    if (order.quantity) {
      this.positionSizeHistory.push(order.quantity);
    }
    
    // セッション更新
    if (this.currentSession) {
      this.currentSession.tradesCount++;
      this.updateSessionState();
    }
    
    // 自動冷却期間チェック
    this.manageAutomaticCoolingOff();
    
    // アラート生成
    const alerts = this.generateEnhancedAlerts();
    if (alerts.length > 0) {
      this.notifyAlerts(alerts);
    }
  }

  /**
   * 取引を許可するかチェック（冷却期間考慮）
   */
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
        cooldownRemaining: cooldownCheck.remainingTime?.minutes
      };
    }
    
    // 心理状態による追加チェック
    const state = this.evaluatePsychologicalState();
    
    if (state.overall === 'tilted') {
      return {
        allowed: false,
        reason: 'ティルト状態のため取引を推奨しません。休憩を取ってください。'
      };
    }
    
    if (state.overall === 'burnout') {
      return {
        allowed: false,
        reason: 'バーンアウトの兆候があります。長期の休憩を取ってください。'
      };
    }
    
    return { allowed: true };
  }

  /**
   * セッションを開始
   */
  startSession(): void {
    this.currentSession = {
      startTime: new Date(),
      tradesCount: 0,
      profitLoss: 0,
      emotionalState: 'calm',
      decisionQuality: 100
    };
  }

  /**
   * セッションを終了
   */
  endSession(): void {
    if (this.currentSession) {
      this.currentSession.endTime = new Date();
      this.sessions.push(this.currentSession);
      this.currentSession = null;
    }
  }

  /**
   * アラートを取得
   */
  getAlerts(): PsychologyAlert[] {
    return this.alerts;
  }

  /**
   * 冷却期間マネージャーを取得
   */
  getCoolingOffManager(): CoolingOffManager {
    return this.coolingOffManager;
  }

  // ============================================================================
  // Private Helper Methods
  // ============================================================================

  /**
   * 基本行動メトリクスを分析
   * 
   * NOTE: This returns simplified metrics. In production, winRate, lossRate, 
   * avgWinSize, avgLossSize, and profitFactor should be calculated from actual
   * order execution data with realized P&L.
   */
  private analyzeBasicBehavior(): TradingBehaviorMetrics {
    if (this.tradingHistory.length === 0) {
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
        emotionalTradingScore: 0
      };
    }
    
    const { consecutiveWins, consecutiveLosses } = this.calculateConsecutiveResults();
    const overTradingScore = this.calculateOverTradingScore();
    const emotionalTradingScore = this.calculateEmotionalTradingScore();
    
    // TODO: Calculate actual win/loss metrics from order P&L data
    return {
      averageHoldTime: 4, // Placeholder
      winRate: 0.5,       // Placeholder - should be calculated from actual trades
      lossRate: 0.5,      // Placeholder - should be calculated from actual trades
      avgWinSize: 0,      // Placeholder - requires P&L data
      avgLossSize: 0,     // Placeholder - requires P&L data
      profitFactor: 1,    // Placeholder - requires P&L data
      consecutiveWins,
      consecutiveLosses,
      overTradingScore,
      emotionalTradingScore
    };
  }

  /**
   * ティルトスコアを計算
   */
  private calculateTiltScore(): number {
    const indicators = this.detectTiltIndicators();
    
    let score = 0;
    const weights = {
      rapidFireTrading: 20,
      positionSizeEscalation: 25,
      stopLossIgnorance: 30,
      revengeTrading: 35,
      overconfidence: 15,
      panicSelling: 25
    };
    
    for (const [key, weight] of Object.entries(weights)) {
      if (indicators[key as keyof TiltIndicators]) {
        score += weight;
      }
    }
    
    return Math.min(100, score);
  }

  /**
   * 感情的ボラティリティを計算
   */
  private calculateEmotionalVolatility(): number {
    if (this.sessions.length < 2) return 0;
    
    // 最近のセッションでの感情状態の変動を測定
    const recentSessions = this.sessions.slice(-10);
    const emotionalScores = recentSessions.map(s => {
      switch (s.emotionalState) {
        case 'calm': return 0;
        case 'excited': return 50;
        case 'fearful': return 75;
        case 'angry': return 90;
        case 'tired': return 60;
        default: return 0;
      }
    });
    
    // 標準偏差を計算
    const mean = emotionalScores.reduce((sum, s) => sum + s, 0) / emotionalScores.length;
    const variance = emotionalScores.reduce((sum, s) => sum + Math.pow(s - mean, 2), 0) / emotionalScores.length;
    
    return Math.min(100, Math.sqrt(variance));
  }

  /**
   * 衝動性スコアを計算
   */
  private calculateImpulsivityScore(): number {
    if (this.tradeTimestamps.length < 2) return 0;
    
    // 取引間隔の短さを測定
    const intervals: number[] = [];
    for (let i = 1; i < this.tradeTimestamps.length; i++) {
      intervals.push(this.tradeTimestamps[i] - this.tradeTimestamps[i - 1]);
    }
    
    // 非常に短い間隔（5分以内）の取引の割合
    const quickTrades = intervals.filter(i => i < 5 * 60 * 1000).length;
    const ratio = quickTrades / intervals.length;
    
    return Math.min(100, ratio * 150);
  }

  /**
   * 規律スコアを計算
   */
  private calculateDisciplineScore(): number {
    let score = 100;
    
    // 冷却期間違反
    const cooldownStats = this.coolingOffManager.getCooldownStats();
    if (cooldownStats.totalCooldowns > 0) {
      const violationRate = cooldownStats.totalViolations / cooldownStats.totalCooldowns;
      score -= violationRate * 30;
    }
    
    // ティルト指標
    const indicators = this.detectTiltIndicators();
    const violationCount = Object.values(indicators).filter(v => v).length;
    score -= violationCount * 10;
    
    return Math.max(0, score);
  }

  /**
   * 回復率を計算
   */
  private calculateRecoveryRate(): number {
    // 損失後の勝ちトレードまでの時間を測定
    // 簡略化：50%をデフォルトとする
    return 50;
  }

  /**
   * トレード品質トレンドを評価
   */
  private evaluateTradeQualityTrend(): 'improving' | 'stable' | 'declining' {
    if (this.sessions.length < 3) return 'stable';
    
    const recentSessions = this.sessions.slice(-5);
    const qualityScores = recentSessions.map(s => s.decisionQuality);
    
    // トレンドを計算
    const firstHalf = qualityScores.slice(0, Math.floor(qualityScores.length / 2));
    const secondHalf = qualityScores.slice(Math.floor(qualityScores.length / 2));
    
    const firstAvg = firstHalf.reduce((sum, q) => sum + q, 0) / firstHalf.length;
    const secondAvg = secondHalf.reduce((sum, q) => sum + q, 0) / secondHalf.length;
    
    if (secondAvg > firstAvg + 5) return 'improving';
    if (secondAvg < firstAvg - 5) return 'declining';
    return 'stable';
  }

  /**
   * 連射取引を検出
   */
  private detectRapidFireTrading(): boolean {
    const recentTrades = this.getRecentTrades(1); // 過去1時間
    return recentTrades.length > 5;
  }

  /**
   * ポジションサイズのエスカレーションを検出
   */
  private detectPositionSizeEscalation(): boolean {
    if (this.positionSizeHistory.length < 3) return false;
    
    const recent = this.positionSizeHistory.slice(-3);
    const average = this.positionSizeHistory.slice(0, -3).reduce((sum, s) => sum + s, 0) / 
                   Math.max(1, this.positionSizeHistory.length - 3);
    
    return recent.some(size => size > average * 2);
  }

  /**
   * ストップロス無視を検出
   * 
   * NOTE: This is a placeholder. In production, this should compare actual exit prices
   * with predefined stop-loss levels to detect violations.
   */
  private detectStopLossIgnorance(): boolean {
    // TODO: Requires Order type to include stopLoss field and actual exit price
    return false;
  }

  /**
   * リベンジトレードを検出
   * 
   * NOTE: This is a placeholder. In production, this should detect patterns of
   * increased trading activity immediately following losses, often with larger position sizes.
   */
  private detectRevengeTrading(): boolean {
    if (this.tradingHistory.length < 2) return false;
    
    // TODO: Implement actual revenge trading detection
    // Requires P&L data to identify losses followed by rapid increased trading
    return false;
  }

  /**
   * 過信を検出
   */
  private detectOverconfidence(): boolean {
    const metrics = this.analyzeBasicBehavior();
    return metrics.consecutiveWins >= 5;
  }

  /**
   * パニック売りを検出
   */
  private detectPanicSelling(): boolean {
    const recentTrades = this.getRecentTrades(0.5); // 過去30分
    const sellOrders = recentTrades.filter(t => t.side === 'SELL');
    return sellOrders.length >= 3;
  }

  /**
   * バーンアウトを検出
   */
  private isBurnout(): boolean {
    if (this.sessions.length < 5) return false;
    
    const recentSessions = this.sessions.slice(-5);
    const tiredSessions = recentSessions.filter(s => s.emotionalState === 'tired').length;
    
    return tiredSessions >= 3;
  }

  /**
   * 推奨事項を生成
   */
  private generateRecommendation(
    overall: PsychologicalState['overall'],
    metrics: EnhancedBehaviorMetrics,
    indicators: TiltIndicators
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

  /**
   * 拡張アラートを生成
   */
  private generateEnhancedAlerts(): PsychologyAlert[] {
    const alerts: PsychologyAlert[] = [];
    const metrics = this.analyzeEnhancedBehavior();
    const indicators = this.detectTiltIndicators();
    
    // ティルトアラート
    if (metrics.tiltScore > 60) {
      alerts.push({
        type: 'revenge_trading',
        severity: metrics.tiltScore > 80 ? 'high' : 'medium',
        message: `ティルト状態（スコア: ${metrics.tiltScore.toFixed(0)}）`,
        recommendation: '即座に取引を停止し、冷却期間を設けてください',
        timestamp: new Date()
      });
    }
    
    // 規律違反アラート
    if (metrics.disciplineScore < 50) {
      alerts.push({
        type: 'overtrading',
        severity: 'high',
        message: `規律スコアが低下（${metrics.disciplineScore.toFixed(0)}）`,
        recommendation: 'トレーディングプランを見直し、厳格に従ってください',
        timestamp: new Date()
      });
    }
    
    return alerts;
  }

  /**
   * 連続結果を計算
   * 
   * NOTE: This is a simplified placeholder. In production, this should analyze
   * actual trade outcomes (wins/losses) from executed orders with realized P&L.
   * Currently returns zeros as we don't have P&L data in the Order type.
   */
  private calculateConsecutiveResults(): {
    consecutiveWins: number;
    consecutiveLosses: number;
  } {
    // TODO: Implement actual consecutive wins/losses calculation
    // Requires Order type to include realized P&L or outcome field
    return { consecutiveWins: 0, consecutiveLosses: 0 };
  }

  /**
   * オーバートレーディングスコアを計算
   */
  private calculateOverTradingScore(): number {
    const recentTrades = this.getRecentTrades(24);
    const normalRate = 3; // 1日3取引が正常
    const ratio = recentTrades.length / normalRate;
    return Math.min(100, ratio * 50);
  }

  /**
   * 感情的トレーディングスコアを計算
   */
  private calculateEmotionalTradingScore(): number {
    return Math.min(100, this.calculateTiltScore() * 0.8);
  }

  /**
   * 最近の取引を取得
   */
  private getRecentTrades(hours: number): Order[] {
    const cutoff = Date.now() - hours * 60 * 60 * 1000;
    return this.tradingHistory.filter(t => (t.timestamp || 0) >= cutoff);
  }

  /**
   * 最近の取引数を取得
   */
  private getRecentTradeCount(hours: number): number {
    return this.getRecentTrades(hours).length;
  }

  /**
   * セッション状態を更新
   */
  private updateSessionState(): void {
    if (!this.currentSession) return;
    
    const metrics = this.analyzeEnhancedBehavior();
    this.currentSession.decisionQuality = metrics.disciplineScore;
    
    const state = this.evaluatePsychologicalState();
    this.currentSession.emotionalState = state.emotional;
  }

  /**
   * アラートを通知
   */
  private notifyAlerts(alerts: PsychologyAlert[]): void {
    this.alerts.push(...alerts);
    // 実際にはUI通知システムと連携
  }
}

export const createEnhancedPsychologyMonitor = (
  coolingOffManager?: CoolingOffManager
): EnhancedPsychologyMonitor => {
  return new EnhancedPsychologyMonitor(coolingOffManager);
};
