/**
 * RiskManagementService.ts
 * 
 * CRITICAL: 自動リスク管理システムの統合サービス
 * 
 * このサービスは以下の機能を提供します：
 * 1. Kelly基準ベースのポジションサイジング
 * 2. 最大ドローダウン制限と自動停止 (Circuit Breaker)
 * 3. ポートフォリオレベルのリスク管理
 * 4. トレードごとのリスク検証
 */

import { Portfolio, OHLCV } from '@/app/types';
import { OrderRequest } from '@/app/types/order';
import { AutomaticRiskController } from '../risk/AutomaticRiskController';
import { RealTimeRiskCalculator, RealTimeRiskMetrics } from '../risk/RealTimeRiskCalculator';
import { 
  calculateStopLossPrice,
  getLatestATR
} from '../riskManagement';
import { RISK_MANAGEMENT } from '../constants/risk-management';
import { logger } from '@/app/core/logger';

// ============================================================================
// Types
// ============================================================================

export interface RiskValidationResult {
  allowed: boolean;
  reasons: string[];
  adjustedQuantity?: number;
  stopLossPrice?: number;
  takeProfitPrice?: number;
  riskPercent?: number;
  violations: Array<{
    type: string;
    severity: 'low' | 'medium' | 'high' | 'critical';
    message: string;
  }>;
}

export interface RiskManagementConfig {
  maxPositionPercent: number;
  minRiskRewardRatio: number;
  maxRiskPerTrade: number;
  maxDrawdownPercent: number;
  dailyLossLimitPercent: number;
  maxPositions: number;
  maxCorrelatedPositions: number;
  useKellyCriterion: boolean;
  kellyFraction: number;
  enableAutoStopLoss: boolean;
  enableCircuitBreaker: boolean;
  enablePositionSizing: boolean;
}

export const DEFAULT_RISK_CONFIG: RiskManagementConfig = {
  maxPositionPercent: 5,
  minRiskRewardRatio: 1.5,
  maxRiskPerTrade: 2,
  maxDrawdownPercent: 20,
  dailyLossLimitPercent: 5,
  maxPositions: 10,
  maxCorrelatedPositions: 3,
  useKellyCriterion: true,
  kellyFraction: 0.25,
  enableAutoStopLoss: true,
  enableCircuitBreaker: true,
  enablePositionSizing: true,
};

// ============================================================================
// RiskManagementService Class
// ============================================================================

export class RiskManagementService {
  private config: RiskManagementConfig;
  private riskController: AutomaticRiskController;
  private riskCalculator: RealTimeRiskCalculator;
  private peakBalance: number = 0;
  private dailyStartBalance: number = 0;
  private dailyStartTime: number = 0;

  constructor(config: Partial<RiskManagementConfig> = {}) {
    this.config = { ...DEFAULT_RISK_CONFIG, ...config };
    
    this.riskController = new AutomaticRiskController({
      enableAutoControl: this.config.enableCircuitBreaker,
      enableAutoOrderBlock: this.config.enableCircuitBreaker,
      maxDailyLossPercent: this.config.dailyLossLimitPercent,
      maxDrawdownPercent: this.config.maxDrawdownPercent,
    });
    
    this.riskCalculator = new RealTimeRiskCalculator();
    this.resetDailyTracking();
  }

  /**
   * 注文リクエストを検証し、リスク管理を適用
   */
  validateOrder(
    order: OrderRequest,
    portfolio: Portfolio,
    marketData?: OHLCV[]
  ): RiskValidationResult {
    const violations: RiskValidationResult['violations'] = [];
    const reasons: string[] = [];

    // 1. Dynamic Risk Configuration Merging
    const effectiveConfig = { ...this.config };
    if (order.riskConfig) {
      if (order.riskConfig.maxRiskPerTrade !== undefined) effectiveConfig.maxRiskPerTrade = order.riskConfig.maxRiskPerTrade;
      if (order.riskConfig.minRiskRewardRatio !== undefined) effectiveConfig.minRiskRewardRatio = order.riskConfig.minRiskRewardRatio;
      if (order.riskConfig.maxPositionPercent !== undefined) effectiveConfig.maxPositionPercent = order.riskConfig.maxPositionPercent;
      if (order.riskConfig.enableDynamicPositionSizing !== undefined) effectiveConfig.enablePositionSizing = order.riskConfig.enableDynamicPositionSizing;
      if (order.riskConfig.enableTrailingStop !== undefined) effectiveConfig.enableAutoStopLoss = order.riskConfig.enableTrailingStop;
    }

    // 2. Circuit Breaker Check (CRITICAL)
    if (this.riskController.isTradingHaltActive() || this.riskController.shouldBlockNewOrders()) {
      return {
        allowed: false,
        reasons: ['取引制限中'],
        violations: [{
          type: 'emergency_halt',
          severity: 'critical',
          message: 'リスク管理システムにより取引が制限されています',
        }],
      };
    }

    const totalValue = portfolio.totalValue + portfolio.cash;
    
    // 3. Drawdown Check
    if (this.peakBalance === 0) this.peakBalance = totalValue;
    else this.peakBalance = Math.max(this.peakBalance, totalValue);
    
    const currentDrawdown = ((this.peakBalance - totalValue) / this.peakBalance) * 100;
    if (currentDrawdown >= effectiveConfig.maxDrawdownPercent) {
      return {
        allowed: false,
        reasons: [`最大ドローダウン制限超過: ${currentDrawdown.toFixed(2)}%`],
        violations: [{ type: 'max_drawdown', severity: 'critical', message: 'ドローダウン超過' }],
      };
    }

    // 4. Daily Loss Limit Check
    this.checkAndResetDailyTracking(totalValue);
    const dailyLossPercent = ((this.dailyStartBalance - totalValue) / this.dailyStartBalance) * 100;
    if (dailyLossPercent >= effectiveConfig.dailyLossLimitPercent) {
      return {
        allowed: false,
        reasons: [`日次損失制限超過: ${dailyLossPercent.toFixed(2)}%`],
        violations: [{ type: 'daily_loss_limit', severity: 'critical', message: '日次損失制限超過' }],
      };
    }

    let finalQuantity = order.quantity;
    let finalStopLoss = order.stopLoss;
    let finalTakeProfit = order.takeProfit;

    // 5. Stop Loss Calculation
    if (!finalStopLoss && effectiveConfig.enableAutoStopLoss) {
      const atr = marketData ? getLatestATR(marketData) : undefined;
      finalStopLoss = calculateStopLossPrice(
        order.price,
        order.side,
        {
          enabled: true,
          type: 'percentage',
          value: RISK_MANAGEMENT.DEFAULT_STOP_LOSS_PCT,
          trailing: order.riskConfig?.enableTrailingStop ?? false
        },
        atr
      );
      reasons.push(`自動SL: ${finalStopLoss.toFixed(2)}`);
    }

    // 6. Position Sizing (Kelly / Volatility)
    if (effectiveConfig.enablePositionSizing && finalStopLoss) {
      const sizing = this.calculateOptimalPositionSize(
        { ...order, stopLoss: finalStopLoss, takeProfit: finalTakeProfit },
        portfolio,
        marketData,
        effectiveConfig
      );
      if (sizing.adjustedQuantity < finalQuantity) {
        finalQuantity = sizing.adjustedQuantity;
        reasons.push(...sizing.reasons);
      }
    }

    // 7. Take Profit Adjustment
    if (finalStopLoss) {
      const risk = Math.abs(order.price - finalStopLoss);
      if (risk > 0) {
        const currentRR = Math.abs((finalTakeProfit || 0) - order.price) / risk;
        if (!finalTakeProfit || currentRR < effectiveConfig.minRiskRewardRatio) {
          const targetReward = risk * effectiveConfig.minRiskRewardRatio;
          finalTakeProfit = order.side === 'LONG' ? order.price + targetReward : order.price - targetReward;
          reasons.push(`TP調整: ${finalTakeProfit.toFixed(2)} (R:R ${effectiveConfig.minRiskRewardRatio}:1)`);
        }
      }
    }

    // 8. Per-Trade Risk Check
    if (finalStopLoss) {
      const riskPerShare = Math.abs(order.price - finalStopLoss);
      if (riskPerShare > 0) {
        const maxRiskAmount = totalValue * (effectiveConfig.maxRiskPerTrade / 100);
        const maxAllowedQty = Math.floor(maxRiskAmount / riskPerShare);
        if (finalQuantity > maxAllowedQty) {
          finalQuantity = Math.max(1, maxAllowedQty);
          reasons.push(`リスク制限(最大${effectiveConfig.maxRiskPerTrade}%): ${finalQuantity}に縮小`);
          violations.push({ type: 'trade_risk_limit', severity: 'high', message: 'トレードリスク過大' });
        }
      }
    }

    // 9. Max Position Size Check
    const maxPosValue = totalValue * (effectiveConfig.maxPositionPercent / 100);
    const maxPosQty = Math.floor(maxPosValue / order.price);
    if (finalQuantity > maxPosQty) {
      finalQuantity = Math.max(1, maxPosQty);
      reasons.push(`サイズ制限(最大${effectiveConfig.maxPositionPercent}%): ${finalQuantity}`);
    }

    // 10. Max Positions Count Check
    if (portfolio.positions.length >= effectiveConfig.maxPositions) {
      const isExisting = portfolio.positions.some(p => p.symbol === order.symbol && p.side === order.side);
      if (!isExisting) {
        return {
          allowed: false,
          reasons: [`最大ポジション数超過: ${effectiveConfig.maxPositions}`],
          violations: [{ type: 'max_positions', severity: 'medium', message: 'ポジション数制限' }],
        };
      }
    }

    // Do not sync back to order object to avoid side effects
    // order.quantity = finalQuantity;
    // order.stopLoss = finalStopLoss;
    // order.takeProfit = finalTakeProfit;

    return {
      allowed: true,
      reasons,
      adjustedQuantity: finalQuantity,
      stopLossPrice: finalStopLoss,
      takeProfitPrice: finalTakeProfit,
      violations,
    };
  }

  private calculateOptimalPositionSize(
    order: OrderRequest,
    portfolio: Portfolio,
    marketData?: OHLCV[],
    configOverride?: RiskManagementConfig
  ): { adjustedQuantity: number; reasons: string[] } {
    const config = configOverride || this.config;
    const totalValue = portfolio.totalValue + portfolio.cash;
    
    if (!config.useKellyCriterion || !order.stopLoss) return { adjustedQuantity: order.quantity, reasons: [] };

    const riskPerShare = Math.abs(order.price - order.stopLoss);
    if (riskPerShare <= 0) return { adjustedQuantity: order.quantity, reasons: [] };

    const avgWin = order.takeProfit ? Math.abs(order.takeProfit - order.price) : riskPerShare * config.minRiskRewardRatio;
    const b = avgWin / riskPerShare;
    const winRate = 0.5; // TODO: Use actual win rate from history
    const kellyFraction = ((winRate * b) - (1 - winRate)) / b;
    const safeKelly = Math.max(0, kellyFraction * config.kellyFraction);
    
    let kellyQty = Math.floor((totalValue * safeKelly) / order.price);
    const reasons = [`Kelly: ${(safeKelly * 100).toFixed(2)}%`];

    // Volatility Adjustment based on riskConfig
    if (marketData && order.riskConfig?.enableVolatilityAdjustment !== false) {
      const atr = getLatestATR(marketData);
      if (atr) {
        const volatility = atr / order.price;
        const multiplier = order.riskConfig?.volatilityMultiplier ?? 1.0;
        // Adjust size inversely proportional to volatility relative to 2% benchmark
        const adjustment = Math.min(1.0, (0.02 * multiplier) / volatility);
        kellyQty = Math.floor(kellyQty * adjustment);
        reasons.push(`Vol調整: ${(adjustment * 100).toFixed(0)}% (Mult: ${multiplier})`);
      }
    }

    return { adjustedQuantity: Math.max(1, Math.min(order.quantity, kellyQty)), reasons };
  }

  /**
   * ポートフォリオのリスクメトリクスを更新し、自動制御を実行
   */
  updateRiskMetrics(portfolio: Portfolio): RealTimeRiskMetrics {
    const riskMetrics = this.riskCalculator.calculatePortfolioRisk(portfolio);
    
    // Run automatic risk controller
    const actions = this.riskController.evaluateAndAct(riskMetrics, portfolio);
    
    // Log any actions taken
    if (actions.length > 0) {
      logger.warn('[RiskManagement] Automatic actions triggered:', actions);
    }
    
    return riskMetrics;
  }

  private checkAndResetDailyTracking(currentBalance: number): void {
    const now = Date.now();
    if (this.dailyStartBalance === 0 || now - this.dailyStartTime > 86400000) {
      this.dailyStartBalance = currentBalance;
      this.dailyStartTime = now;
    }
  }

  resetDailyTracking(bal?: number): void {
    this.dailyStartTime = Date.now();
    if (bal !== undefined) this.dailyStartBalance = bal;
  }

  getStatus() {
    return {
      isTradingHalted: this.riskController.isTradingHaltActive(),
      peakBalance: this.peakBalance,
      dailyStartBalance: this.dailyStartBalance
    };
  }
}

// Singleton Instance
let instance: RiskManagementService | null = null;

export function getRiskManagementService(config?: Partial<RiskManagementConfig>): RiskManagementService {
  if (!instance) {
    instance = new RiskManagementService(config);
  }
  return instance;
}

export function resetRiskManagementService(): void {
  instance = null;
}
