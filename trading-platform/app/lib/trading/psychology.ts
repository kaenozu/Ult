/**
 * Psychology Monitor for AI Trade Advisor
 * 
 * Monitors trading behavior for psychological biases and provides
 * warnings and recommendations to improve trading discipline.
 */

import { JournalEntry } from '@/app/types';
import { TIME_INTERVALS } from '@/app/constants/common';

/**
 * Psychology state tracking
 */
export interface PsychologyState {
  consecutiveLosses: number;
  consecutiveWins: number;
  totalLosses: number;
  totalWins: number;
  currentStreak: 'winning' | 'losing' | 'neutral';
  riskTolerance: number;
  lastTradeDate: Date | null;
  tradesToday: number;
  totalTrades: number;
}

/**
 * Psychology warning with severity and recommendations
 */
export interface PsychologyWarning {
  id: string;
  type: 'consecutive_losses' | 'over_trading' | 'revenge_trading' | 'risk_management' | 'emotional_state';
  severity: 'low' | 'medium' | 'high';
  message: string;
  recommendation: string;
  timestamp: Date;
  actionable: boolean;
}

/**
 * Trading metrics for psychology analysis
 */
export interface TradingMetrics {
  accountBalance: number;
  dailyLossLimit: number;
  maxRiskPerTrade: number;
  maxTradesPerDay: number;
}

/**
 * Constants for psychology monitoring
 */
const CONSECUTIVE_LOSSES_WARNING_THRESHOLD = 3;
const CONSECUTIVE_LOSSES_CRITICAL_THRESHOLD = 5;
const OVER_TRADING_THRESHOLD = 20;
const REVENGE_TRADING_TIME_WINDOW = TIME_INTERVALS.UPDATE_30_MIN;
const RISK_TOLERANCE_MIN = 0.3;
const RISK_TOLERANCE_MAX = 1.5;
const RISK_TOLERANCE_DEFAULT = 1.0;

/**
 * Psychology monitor class
 */
export class PsychologyMonitor {
  private state: PsychologyState;
  private warnings: PsychologyWarning[] = [];
  private metrics: TradingMetrics;
  private lossHistory: Array<{ timestamp: Date; profit: number }> = [];

  constructor(metrics?: Partial<TradingMetrics>) {
    this.state = {
      consecutiveLosses: 0,
      consecutiveWins: 0,
      totalLosses: 0,
      totalWins: 0,
      currentStreak: 'neutral',
      riskTolerance: RISK_TOLERANCE_DEFAULT,
      lastTradeDate: null,
      tradesToday: 0,
      totalTrades: 0,
    };

    this.metrics = {
      accountBalance: metrics?.accountBalance || 100000,
      dailyLossLimit: metrics?.dailyLossLimit || 2000,
      maxRiskPerTrade: metrics?.maxRiskPerTrade || 2000,
      maxTradesPerDay: metrics?.maxTradesPerDay || 20,
    };
  }

  /**
   * Record a trade result and update psychology state
   */
  recordTrade(trade: JournalEntry, currentBalance?: number): PsychologyWarning[] {
    const newWarnings: PsychologyWarning[] = [];
    const now = new Date();

    // Update account balance if provided
    if (currentBalance !== undefined) {
      this.metrics.accountBalance = currentBalance;
    }

    // Update trade counts
    this.state.totalTrades++;
    
    // Check if it's a new day
    if (this.isNewDay(now)) {
      this.state.tradesToday = 0;
    }
    this.state.tradesToday++;
    this.state.lastTradeDate = now;

    // Determine if trade is profitable
    const isProfitable = (trade.profit || 0) > 0;
    const profit = trade.profit || 0;

    // Update win/loss counts and streaks
    if (isProfitable) {
      this.state.consecutiveWins++;
      this.state.consecutiveLosses = 0;
      this.state.totalWins++;
      this.state.currentStreak = 'winning';
    } else {
      this.state.consecutiveLosses++;
      this.state.consecutiveWins = 0;
      this.state.totalLosses++;
      this.state.currentStreak = 'losing';
      
      // Record loss for revenge trading detection
      this.lossHistory.push({
        timestamp: now,
        profit: profit,
      });
    }

    // Clean up old loss history (older than 1 hour)
    this.cleanupLossHistory(now);

    // Check for consecutive losses
    const consecutiveLossWarning = this.checkConsecutiveLosses();
    if (consecutiveLossWarning) {
      newWarnings.push(consecutiveLossWarning);
    }

    // Check for over-trading
    const overTradingWarning = this.checkOverTrading();
    if (overTradingWarning) {
      newWarnings.push(overTradingWarning);
    }

    // Check for revenge trading
    const revengeTradingWarning = this.checkRevengeTrading(now);
    if (revengeTradingWarning) {
      newWarnings.push(revengeTradingWarning);
    }

    // Check risk management
    const riskWarning = this.checkRiskManagement(trade);
    if (riskWarning) {
      newWarnings.push(riskWarning);
    }

    // Check emotional state
    const emotionalWarning = this.checkEmotionalState();
    if (emotionalWarning) {
      newWarnings.push(emotionalWarning);
    }

    // Adjust risk tolerance based on performance
    this.adjustRiskTolerance();

    // Store warnings
    this.warnings.push(...newWarnings);

    return newWarnings;
  }

  /**
   * Get current psychology state
   */
  getState(): PsychologyState {
    return { ...this.state };
  }

  /**
   * Get all warnings
   */
  getWarnings(): PsychologyWarning[] {
    return [...this.warnings];
  }

  /**
   * Get active warnings (last 24 hours)
   */
  getActiveWarnings(): PsychologyWarning[] {
    const now = new Date();
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    return this.warnings.filter(w => w.timestamp >= oneDayAgo);
  }

  /**
   * Clear all warnings
   */
  clearWarnings(): void {
    this.warnings = [];
  }

  /**
   * Get current risk tolerance
   */
  getRiskTolerance(): number {
    return this.state.riskTolerance;
  }

  /**
   * Calculate recommended position size based on risk tolerance
   */
  calculateRecommendedPositionSize(entryPrice: number, stopLossPrice: number): number {
    const riskPerShare = Math.abs(entryPrice - stopLossPrice);
    const maxRiskAmount = this.metrics.maxRiskPerTrade * this.state.riskTolerance;
    
    if (riskPerShare === 0) {
      return 0;
    }
    
    return Math.floor(maxRiskAmount / riskPerShare);
  }

  /**
   * Check if trading should be paused
   */
  shouldPauseTrading(): boolean {
    const activeWarnings = this.getActiveWarnings();
    const highSeverityWarnings = activeWarnings.filter(w => w.severity === 'high');
    
    // Pause if multiple high severity warnings
    if (highSeverityWarnings.length >= 2) {
      return true;
    }
    
    // Pause if consecutive losses exceed critical threshold
    if (this.state.consecutiveLosses >= CONSECUTIVE_LOSSES_CRITICAL_THRESHOLD) {
      return true;
    }
    
    return false;
  }

  /**
   * Reset state (useful for starting a new trading session)
   */
  resetState(): void {
    this.state = {
      consecutiveLosses: 0,
      consecutiveWins: 0,
      totalLosses: 0,
      totalWins: 0,
      currentStreak: 'neutral',
      riskTolerance: RISK_TOLERANCE_DEFAULT,
      lastTradeDate: null,
      tradesToday: 0,
      totalTrades: 0,
    };
    this.lossHistory = [];
    this.clearWarnings();
  }

  /**
   * Update trading metrics
   */
  updateMetrics(metrics: Partial<TradingMetrics>): void {
    this.metrics = { ...this.metrics, ...metrics };
  }

  /**
   * Check for consecutive losses
   */
  private checkConsecutiveLosses(): PsychologyWarning | null {
    if (this.state.consecutiveLosses >= CONSECUTIVE_LOSSES_CRITICAL_THRESHOLD) {
      return {
        id: `consecutive_losses_${Date.now()}`,
        type: 'consecutive_losses',
        severity: 'high',
        message: `${this.state.consecutiveLosses}連敗中です。取引を一時停止することを強く推奨します。`,
        recommendation: '取引を一時停止し、感情を落ち着かせてください。明日まで休憩することを検討してください。',
        timestamp: new Date(),
        actionable: true,
      };
    } else if (this.state.consecutiveLosses >= CONSECUTIVE_LOSSES_WARNING_THRESHOLD) {
      return {
        id: `consecutive_losses_${Date.now()}`,
        type: 'consecutive_losses',
        severity: 'medium',
        message: `${this.state.consecutiveLosses}連敗中です。注意が必要です。`,
        recommendation: 'ポジションサイズを減らし、慎重に取引してください。',
        timestamp: new Date(),
        actionable: true,
      };
    }
    return null;
  }

  /**
   * Check for over-trading
   */
  private checkOverTrading(): PsychologyWarning | null {
    if (this.state.tradesToday >= OVER_TRADING_THRESHOLD) {
      return {
        id: `over_trading_${Date.now()}`,
        type: 'over_trading',
        severity: 'high',
        message: `本日${this.state.tradesToday}回の取引を行っています。過度な取引です。`,
        recommendation: '今日の取引を終了し、明日まで休憩してください。',
        timestamp: new Date(),
        actionable: true,
      };
    } else if (this.state.tradesToday >= this.metrics.maxTradesPerDay) {
      return {
        id: `over_trading_${Date.now()}`,
        type: 'over_trading',
        severity: 'medium',
        message: `本日${this.state.tradesToday}回の取引を行っています。1日の最大取引回数に達しました。`,
        recommendation: '追加の取引は慎重に行ってください。',
        timestamp: new Date(),
        actionable: true,
      };
    }
    return null;
  }

  /**
   * Check for revenge trading
   */
  private checkRevengeTrading(now: Date): PsychologyWarning | null {
    // Find recent losses within the time window
    const recentLosses = this.lossHistory.filter(
      loss => now.getTime() - loss.timestamp.getTime() <= REVENGE_TRADING_TIME_WINDOW
    );

    if (recentLosses.length >= 2) {
      return {
        id: `revenge_trading_${Date.now()}`,
        type: 'revenge_trading',
        severity: 'high',
        message: `過去30分間で${recentLosses.length}回の損失が発生しています。復讐トレードの可能性があります。`,
        recommendation: '損失を取り戻そうとせず、取引を一時停止してください。',
        timestamp: now,
        actionable: true,
      };
    }
    return null;
  }

  /**
   * Check risk management
   */
  private checkRiskManagement(trade: JournalEntry): PsychologyWarning | null {
    const tradeRisk = Math.abs(trade.profit || 0);
    const maxAllowedRisk = this.metrics.maxRiskPerTrade;

    if (tradeRisk > maxAllowedRisk * 2) {
      return {
        id: `risk_management_${Date.now()}`,
        type: 'risk_management',
        severity: 'high',
        message: `リスクが許容範囲を大幅に超えています（${tradeRisk.toFixed(2)} > ${maxAllowedRisk * 2}）`,
        recommendation: 'ポジションサイズを大幅に減らしてください。',
        timestamp: new Date(),
        actionable: true,
      };
    } else if (tradeRisk > maxAllowedRisk) {
      return {
        id: `risk_management_${Date.now()}`,
        type: 'risk_management',
        severity: 'medium',
        message: `リスクが許容範囲を超えています（${tradeRisk.toFixed(2)} > ${maxAllowedRisk}）`,
        recommendation: 'ポジションサイズを減らしてください。',
        timestamp: new Date(),
        actionable: true,
      };
    }
    return null;
  }

  /**
   * Check emotional state
   */
  private checkEmotionalState(): PsychologyWarning | null {
    // Check for extreme risk tolerance adjustments
    if (this.state.riskTolerance < RISK_TOLERANCE_MIN) {
      return {
        id: `emotional_state_${Date.now()}`,
        type: 'emotional_state',
        severity: 'high',
        message: 'リスク許容度が極端に低くなっています。恐怖心が支配している可能性があります。',
        recommendation: '感情が落ち着くまで取引を控えてください。',
        timestamp: new Date(),
        actionable: true,
      };
    } else if (this.state.riskTolerance > RISK_TOLERANCE_MAX) {
      return {
        id: `emotional_state_${Date.now()}`,
        type: 'emotional_state',
        severity: 'medium',
        message: 'リスク許容度が高くなっています。過度な自信がある可能性があります。',
        recommendation: '慎重になり、ポジションサイズを適切に管理してください。',
        timestamp: new Date(),
        actionable: true,
      };
    }
    return null;
  }

  /**
   * Adjust risk tolerance based on performance
   */
  private adjustRiskTolerance(): void {
    if (this.state.consecutiveLosses >= 3) {
      // Reduce risk tolerance after losses
      this.state.riskTolerance = Math.max(
        RISK_TOLERANCE_MIN,
        this.state.riskTolerance * 0.8
      );
    } else if (this.state.consecutiveWins >= 3) {
      // Slightly increase risk tolerance after wins (but cap it)
      this.state.riskTolerance = Math.min(
        RISK_TOLERANCE_MAX,
        this.state.riskTolerance * 1.1
      );
    } else {
      // Gradually return to default
      const diff = RISK_TOLERANCE_DEFAULT - this.state.riskTolerance;
      this.state.riskTolerance += diff * 0.1;
    }
  }

  /**
   * Check if it's a new day
   */
  private isNewDay(now: Date): boolean {
    if (!this.state.lastTradeDate) {
      return true;
    }
    
    const lastDate = this.state.lastTradeDate;
    return (
      now.getDate() !== lastDate.getDate() ||
      now.getMonth() !== lastDate.getMonth() ||
      now.getFullYear() !== lastDate.getFullYear()
    );
  }

  /**
   * Clean up old loss history
   */
  private cleanupLossHistory(now: Date): void {
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
    this.lossHistory = this.lossHistory.filter(
      loss => loss.timestamp >= oneHourAgo
    );
  }
}

// Singleton instance
let psychologyMonitorInstance: PsychologyMonitor | null = null;

/**
 * Get or create psychology monitor instance
 */
export function getPsychologyMonitor(metrics?: Partial<TradingMetrics>): PsychologyMonitor {
  if (!psychologyMonitorInstance) {
    psychologyMonitorInstance = new PsychologyMonitor(metrics);
  } else if (metrics) {
    psychologyMonitorInstance.updateMetrics(metrics);
  }
  return psychologyMonitorInstance;
}
