/**
 * Behavioral Bias Guard
 * 
 * Validates orders against psychological biases and trading discipline rules
 * to prevent emotional and revenge trading.
 */

import { OrderRequest } from '@/app/types/order';
import { Position } from '@/app/types';
import { getPsychologyMonitor, PsychologyWarning } from './psychology';
import { JournalEntry } from '@/app/types';

/**
 * Order validation result
 */
export interface OrderValidationResult {
  /** Whether the order is allowed to proceed */
  allowed: boolean;
  /** Warnings associated with this order */
  warnings: PsychologyWarning[];
  /** Blocking reason if order is not allowed */
  blockReason?: string;
  /** Whether the user should be prompted with a confirmation */
  requiresConfirmation: boolean;
}

/**
 * Position size comparison result
 */
interface PositionSizeAnalysis {
  isIncreasingSize: boolean;
  currentSize: number;
  newSize: number;
  increasePercentage: number;
}

/**
 * Behavioral Bias Guard Configuration
 */
export interface BehavioralBiasGuardConfig {
  /** Enable blocking of trades during consecutive losses */
  blockOnConsecutiveLosses: boolean;
  /** Threshold for consecutive losses before blocking */
  consecutiveLossesThreshold: number;
  /** Enable blocking of revenge trading (size increases during drawdown) */
  blockRevengeTrading: boolean;
  /** Percentage increase in position size considered revenge trading */
  revengeTradingSizeIncreaseThreshold: number;
  /** Enable warnings for over-trading */
  warnOnOverTrading: boolean;
  /** Maximum trades per day */
  maxTradesPerDay: number;
}

const DEFAULT_CONFIG: BehavioralBiasGuardConfig = {
  blockOnConsecutiveLosses: true,
  consecutiveLossesThreshold: 5,
  blockRevengeTrading: true,
  revengeTradingSizeIncreaseThreshold: 50, // 50% increase
  warnOnOverTrading: true,
  maxTradesPerDay: 20,
};

/**
 * Behavioral Bias Guard Class
 */
export class BehavioralBiasGuard {
  private config: BehavioralBiasGuardConfig;

  constructor(config?: Partial<BehavioralBiasGuardConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Validate an order before execution
   */
  validateOrder(
    order: OrderRequest,
    currentPositions: Position[],
    recentTrades: JournalEntry[],
    currentBalance: number
  ): OrderValidationResult {
    const psychologyMonitor = getPsychologyMonitor();
    const psychologyState = psychologyMonitor.getState();
    const activeWarnings = psychologyMonitor.getActiveWarnings();

    const result: OrderValidationResult = {
      allowed: true,
      warnings: [],
      requiresConfirmation: false,
    };

    // 1. Check for consecutive losses (CRITICAL)
    if (
      this.config.blockOnConsecutiveLosses &&
      psychologyState.consecutiveLosses >= this.config.consecutiveLossesThreshold
    ) {
      result.allowed = false;
      result.blockReason = `${psychologyState.consecutiveLosses}連敗中のため、取引が一時的にブロックされています。感情が落ち着くまでお待ちください。`;
      result.warnings.push({
        id: `consecutive_losses_block_${Date.now()}`,
        type: 'consecutive_losses',
        severity: 'high',
        message: `${psychologyState.consecutiveLosses}連敗中です。取引を一時停止してください。`,
        recommendation: '少なくとも1日は取引を休み、感情をリセットしてください。',
        timestamp: new Date(),
        actionable: true,
      });
      return result;
    }

    // 2. Check for revenge trading (size increase during drawdown)
    if (this.config.blockRevengeTrading) {
      const sizeAnalysis = this.analyzePositionSize(order, currentPositions);
      const isInDrawdown = psychologyState.consecutiveLosses >= 2;

      if (
        isInDrawdown &&
        sizeAnalysis.isIncreasingSize &&
        sizeAnalysis.increasePercentage > this.config.revengeTradingSizeIncreaseThreshold
      ) {
        result.allowed = false;
        result.blockReason = `連敗中のポジションサイズ拡大（${sizeAnalysis.increasePercentage.toFixed(1)}%増加）は、復讐トレードの可能性があるためブロックされました。`;
        result.warnings.push({
          id: `revenge_trading_block_${Date.now()}`,
          type: 'revenge_trading',
          severity: 'high',
          message: `ドローダウン中のポジションサイズ拡大を検知しました。`,
          recommendation: 'ポジションサイズを通常レベルに戻すか、取引を休んでください。',
          timestamp: new Date(),
          actionable: true,
        });
        return result;
      }

      // Warn but don't block for smaller increases
      if (
        isInDrawdown &&
        sizeAnalysis.isIncreasingSize &&
        sizeAnalysis.increasePercentage > 20
      ) {
        result.requiresConfirmation = true;
        result.warnings.push({
          id: `revenge_trading_warning_${Date.now()}`,
          type: 'revenge_trading',
          severity: 'medium',
          message: `連敗中にポジションサイズを増やしています（${sizeAnalysis.increasePercentage.toFixed(1)}%増加）。`,
          recommendation: '冷静さを保ち、通常のポジションサイズで取引してください。',
          timestamp: new Date(),
          actionable: true,
        });
      }
    }

    // 3. Check for over-trading
    if (
      this.config.warnOnOverTrading &&
      psychologyState.tradesToday >= this.config.maxTradesPerDay
    ) {
      result.requiresConfirmation = true;
      result.warnings.push({
        id: `over_trading_warning_${Date.now()}`,
        type: 'over_trading',
        severity: 'medium',
        message: `本日${psychologyState.tradesToday}回の取引を行っています。過度な取引の可能性があります。`,
        recommendation: '今日の取引を終了し、明日まで休憩することを検討してください。',
        timestamp: new Date(),
        actionable: true,
      });
    }

    // 4. Check risk management based on active warnings
    const highSeverityWarnings = activeWarnings.filter(w => w.severity === 'high');
    if (highSeverityWarnings.length > 0) {
      result.requiresConfirmation = true;
      result.warnings.push(...highSeverityWarnings);
    }

    // 5. Check position size against risk tolerance
    const recommendedSize = this.calculateRecommendedPositionSize(
      order,
      currentBalance,
      psychologyState.riskTolerance
    );

    if (order.quantity > recommendedSize * 2) {
      result.requiresConfirmation = true;
      result.warnings.push({
        id: `position_size_warning_${Date.now()}`,
        type: 'risk_management',
        severity: 'medium',
        message: `ポジションサイズが推奨値（${recommendedSize}）を大きく超えています（${order.quantity}）。`,
        recommendation: 'ポジションサイズを推奨値まで減らすことを検討してください。',
        timestamp: new Date(),
        actionable: true,
      });
    }

    return result;
  }

  /**
   * Analyze position size changes
   */
  private analyzePositionSize(
    order: OrderRequest,
    currentPositions: Position[]
  ): PositionSizeAnalysis {
    const existingPosition = currentPositions.find(
      p => p.symbol === order.symbol && p.side === order.side
    );

    if (!existingPosition) {
      return {
        isIncreasingSize: false,
        currentSize: 0,
        newSize: order.quantity,
        increasePercentage: 0,
      };
    }

    const currentSize = existingPosition.quantity;
    const newSize = currentSize + order.quantity;
    const increasePercentage = ((newSize - currentSize) / currentSize) * 100;

    return {
      isIncreasingSize: order.quantity > 0,
      currentSize,
      newSize,
      increasePercentage,
    };
  }

  /**
   * Calculate recommended position size based on risk tolerance
   */
  private calculateRecommendedPositionSize(
    order: OrderRequest,
    currentBalance: number,
    riskTolerance: number
  ): number {
    // Use 2% risk per trade as baseline
    const baseRiskPercentage = 0.02;
    const adjustedRisk = baseRiskPercentage * riskTolerance;
    const maxRiskAmount = currentBalance * adjustedRisk;

    // Assume 5% stop loss for simplicity
    const assumedStopLossPercentage = 0.05;
    const riskPerShare = order.price * assumedStopLossPercentage;

    if (riskPerShare === 0) {
      return 0;
    }

    return Math.floor(maxRiskAmount / riskPerShare);
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<BehavioralBiasGuardConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Get current configuration
   */
  getConfig(): BehavioralBiasGuardConfig {
    return { ...this.config };
  }
}

// Singleton instance
let behavioralBiasGuardInstance: BehavioralBiasGuard | null = null;

/**
 * Get or create behavioral bias guard instance
 */
export function getBehavioralBiasGuard(
  config?: Partial<BehavioralBiasGuardConfig>
): BehavioralBiasGuard {
  if (!behavioralBiasGuardInstance) {
    behavioralBiasGuardInstance = new BehavioralBiasGuard(config);
  } else if (config) {
    behavioralBiasGuardInstance.updateConfig(config);
  }
  return behavioralBiasGuardInstance;
}
