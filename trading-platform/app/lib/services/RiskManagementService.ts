/**
 * RiskManagementService.ts
 * 
 * CRITICAL: 自動リスク管理システムの統合サービス
 * 
 * このサービスは以下の機能を提供します：
 * 1. Kelly基準ベースのポジションサイジング
 * 2. 最大ドローダウン制限と自動停止
 * 3. ポートフォリオレベルのリスク管理
 * 4. トレードごとのリスク検証
 */

import { Portfolio, Position, OHLCV } from '@/app/types';
import { OrderRequest } from '@/app/types/order';
import { AutomaticRiskController, DEFAULT_CONTROL_CONFIG, RiskControlConfig } from '../risk/AutomaticRiskController';
import { DynamicPositionSizing } from '../risk/DynamicPositionSizing';
import { PositionSizingConfig } from '@/app/types/risk';
import { RealTimeRiskCalculator, RealTimeRiskMetrics } from '../risk/RealTimeRiskCalculator';
import { 
  calculatePositionSize, 
  calculateStopLossPrice,
  calculateTakeProfitPrice,
  getLatestATR,
  DEFAULT_RISK_SETTINGS,
  checkDailyLossLimit,
  canAddPosition
} from '../riskManagement';
import { RISK_PARAMS } from '../constants/risk-management';

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
  // Position Sizing
  maxPositionPercent: number; // 5% default
  minRiskRewardRatio: number; // 1.5:1 default
  maxRiskPerTrade: number; // 2% default
  
  // Drawdown Limits
  maxDrawdownPercent: number; // 20% default
  dailyLossLimitPercent: number; // 5% default
  
  // Position Limits
  maxPositions: number; // 10 default
  maxCorrelatedPositions: number; // 3 default
  
  // Kelly Criterion
  useKellyCriterion: boolean; // true default
  kellyFraction: number; // 0.25 default (conservative)
  
  // Auto Controls
  enableAutoStopLoss: boolean; // true default
  enableCircuitBreaker: boolean; // true default
  enablePositionSizing: boolean; // true default
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
  private dynamicSizer: DynamicPositionSizing | null = null;
  private peakBalance: number = 0;
  private dailyStartBalance: number = 0;
  private dailyStartTime: number = 0;

  constructor(config: Partial<RiskManagementConfig> = {}) {
    this.config = { ...DEFAULT_RISK_CONFIG, ...config };
    
    // Initialize risk controller with matching config
    const controlConfig: Partial<RiskControlConfig> = {
      enableAutoControl: this.config.enableCircuitBreaker,
      enableAutoOrderBlock: this.config.enableCircuitBreaker,
      maxDailyLossPercent: this.config.dailyLossLimitPercent,
      maxDrawdownPercent: this.config.maxDrawdownPercent,
    };
    this.riskController = new AutomaticRiskController(controlConfig);
    
    // Initialize risk calculator
    this.riskCalculator = new RealTimeRiskCalculator();
    
    // Reset daily tracking at midnight
    this.resetDailyTracking();
  }

  /**
   * メイン関数: 注文リクエストを検証し、リスク管理を適用
   */
  validateOrder(
    order: OrderRequest,
    portfolio: Portfolio,
    marketData?: OHLCV[]
  ): RiskValidationResult {
    const violations: RiskValidationResult['violations'] = [];
    const reasons: string[] = [];

    // 1. Circuit Breaker Check - 取引停止チェック
    if (this.riskController.isTradingHaltActive()) {
      return {
        allowed: false,
        reasons: ['取引が緊急停止中です'],
        violations: [{
          type: 'emergency_halt',
          severity: 'critical',
          message: '緊急取引停止中 - リスク管理システムにより取引が制限されています',
        }],
      };
    }

    // 2. Order Block Check - 注文ブロックチェック
    if (this.riskController.shouldBlockNewOrders()) {
      return {
        allowed: false,
        reasons: ['新規注文がブロックされています'],
        violations: [{
          type: 'orders_blocked',
          severity: 'critical',
          message: '新規注文ブロック中 - 日次損失制限または連続損失制限に達しています',
        }],
      };
    }

    // 3. Drawdown Circuit Breaker - ドローダウン制限
    const totalValue = portfolio.totalValue + portfolio.cash;
    if (this.peakBalance === 0) {
      this.peakBalance = totalValue;
    } else {
      this.peakBalance = Math.max(this.peakBalance, totalValue);
    }
    
    const currentDrawdown = ((this.peakBalance - totalValue) / this.peakBalance) * 100;
    
    if (currentDrawdown >= this.config.maxDrawdownPercent) {
      violations.push({
        type: 'max_drawdown',
        severity: 'critical',
        message: `最大ドローダウン${this.config.maxDrawdownPercent}%を超過 (現在: ${currentDrawdown.toFixed(2)}%)`,
      });
      
      return {
        allowed: false,
        reasons: [`最大ドローダウン制限を超過: ${currentDrawdown.toFixed(2)}%`],
        violations,
      };
    }

    // 4. Daily Loss Limit - 日次損失制限
    this.checkAndResetDailyTracking(totalValue);
    const dailyLoss = this.dailyStartBalance - totalValue;
    const dailyLossPercent = (dailyLoss / this.dailyStartBalance) * 100;
    
    if (dailyLossPercent >= this.config.dailyLossLimitPercent) {
      violations.push({
        type: 'daily_loss_limit',
        severity: 'critical',
        message: `日次損失制限${this.config.dailyLossLimitPercent}%を超過 (現在: ${dailyLossPercent.toFixed(2)}%)`,
      });
      
      return {
        allowed: false,
        reasons: [`日次損失制限を超過: ${dailyLossPercent.toFixed(2)}%`],
        violations,
      };
    }

    // 5. Stop Loss Required - ストップロス必須チェック
    if (this.config.enableAutoStopLoss && !order.stopLoss) {
      // Calculate automatic stop loss if not provided
      const atr = marketData ? getLatestATR(marketData) : undefined;
      const stopLossConfig = {
        enabled: true,
        type: 'percentage' as const,
        value: RISK_PARAMS.DEFAULT_STOP_LOSS_PCT,
        trailing: false,
      };
      const stopLossPrice = calculateStopLossPrice(
        order.price,
        order.side === 'BUY' ? 'LONG' : 'SHORT',
        stopLossConfig,
        atr
      );
      
      order.stopLoss = stopLossPrice;
      reasons.push(`自動ストップロス設定: ${stopLossPrice.toFixed(2)}`);
    }

    // 6. Position Sizing with Kelly Criterion - ポジションサイジング
    if (this.config.enablePositionSizing) {
      const sizingResult = this.calculateOptimalPositionSize(
        order,
        portfolio,
        marketData
      );
      
      if (sizingResult.adjustedQuantity !== order.quantity) {
        order.quantity = sizingResult.adjustedQuantity;
        reasons.push(`ポジションサイズ調整: ${sizingResult.adjustedQuantity} (リスク管理)`);
        reasons.push(...sizingResult.reasons);
      }
    }

    // 7. Risk/Reward Ratio Check - リスクリワード比率チェック
    if (order.stopLoss) {
      const risk = Math.abs(order.price - order.stopLoss);
      
      // If no take profit is set, calculate one
      if (!order.takeProfit) {
        order.takeProfit = order.side === 'BUY'
          ? order.price + (risk * this.config.minRiskRewardRatio)
          : order.price - (risk * this.config.minRiskRewardRatio);
        reasons.push(`利確価格自動設定: ${order.takeProfit.toFixed(2)} (R:R ${this.config.minRiskRewardRatio}:1)`);
      } else {
        // Check if existing take profit meets minimum R:R
        const reward = Math.abs(order.takeProfit - order.price);
        const rrRatio = reward / risk;
        
        if (rrRatio < this.config.minRiskRewardRatio) {
          violations.push({
            type: 'risk_reward_ratio',
            severity: 'high',
            message: `リスクリワード比率が低い: ${rrRatio.toFixed(2)} (最低: ${this.config.minRiskRewardRatio})`,
          });
          
          // Adjust take profit to meet minimum R:R
          order.takeProfit = order.side === 'BUY'
            ? order.price + (risk * this.config.minRiskRewardRatio)
            : order.price - (risk * this.config.minRiskRewardRatio);
          reasons.push(`利確価格調整: ${order.takeProfit.toFixed(2)} (R:R ${this.config.minRiskRewardRatio}:1)`);
        }
      }
    }

    // 8. Position Size Limit - ポジションサイズ制限
    let positionValue = order.quantity * order.price;
    let positionPercent = (positionValue / totalValue) * 100;
    
    if (positionPercent > this.config.maxPositionPercent) {
      violations.push({
        type: 'position_size_limit',
        severity: 'high',
        message: `ポジションサイズが大きすぎます: ${positionPercent.toFixed(2)}% (最大: ${this.config.maxPositionPercent}%)`,
      });
      
      // Adjust quantity to max allowed
      const maxPositionValue = totalValue * (this.config.maxPositionPercent / 100);
      const newQuantity = Math.floor(maxPositionValue / order.price);
      if (newQuantity < order.quantity) {
        order.quantity = Math.max(1, newQuantity);
        reasons.push(`ポジションサイズを制限: ${order.quantity}`);
        // Recalculate for next checks
        positionValue = order.quantity * order.price;
        positionPercent = (positionValue / totalValue) * 100;
      }
    }

    // 9. Max Positions Check - 最大ポジション数チェック
    if (portfolio.positions.length >= this.config.maxPositions) {
      const existingPosition = portfolio.positions.find(
        p => p.symbol === order.symbol && 
        ((order.side === 'BUY' && p.side === 'LONG') || (order.side === 'SELL' && p.side === 'SHORT'))
      );
      
      if (!existingPosition) {
        violations.push({
          type: 'max_positions',
          severity: 'high',
          message: `最大ポジション数${this.config.maxPositions}に達しています`,
        });
        
        return {
          allowed: false,
          reasons: ['最大ポジション数に達しています'],
          violations,
        };
      }
    }

    // 10. Per-Trade Risk Check - トレードあたりリスクチェック
    if (order.stopLoss) {
      const riskPerShare = Math.abs(order.price - order.stopLoss);
      let riskAmount = riskPerShare * order.quantity;
      let riskPercent = (riskAmount / totalValue) * 100;
      
      if (riskPercent > this.config.maxRiskPerTrade) {
        violations.push({
          type: 'trade_risk_limit',
          severity: 'critical',
          message: `トレードリスクが高すぎます: ${riskPercent.toFixed(2)}% (最大: ${this.config.maxRiskPerTrade}%)`,
        });
        
        // Reduce quantity to meet risk limit
        const maxRiskAmount = totalValue * (this.config.maxRiskPerTrade / 100);
        const adjustedQuantity = Math.floor(maxRiskAmount / riskPerShare);
        if (adjustedQuantity < order.quantity) {
          order.quantity = Math.max(1, adjustedQuantity);
          reasons.push(`リスク制限によりポジション縮小: ${order.quantity}`);
          // Recalculate
          riskAmount = riskPerShare * order.quantity;
          riskPercent = (riskAmount / totalValue) * 100;
        }
      }
    }

    // Determine if order is allowed
    const criticalViolations = violations.filter(v => v.severity === 'critical');
    const allowed = criticalViolations.length === 0;

    return {
      allowed,
      reasons,
      adjustedQuantity: order.quantity,
      stopLossPrice: order.stopLoss,
      takeProfitPrice: order.takeProfit,
      violations,
    };
  }

  /**
   * Kelly基準に基づく最適ポジションサイズ計算
   */
  private calculateOptimalPositionSize(
    order: OrderRequest,
    portfolio: Portfolio,
    marketData?: OHLCV[]
  ): { adjustedQuantity: number; reasons: string[] } {
    const reasons: string[] = [];
    const totalValue = portfolio.totalValue + portfolio.cash;
    
    if (!this.config.useKellyCriterion || !order.stopLoss) {
      return { adjustedQuantity: order.quantity, reasons: [] };
    }

    // Calculate risk per share
    const riskPerShare = Math.abs(order.price - order.stopLoss);
    
    // Calculate Kelly fraction
    // For conservative approach, we use a fixed win rate of 50% 
    // and adjust by confidence if available
    const winRate = 0.5; // Conservative estimate
    const avgWin = order.takeProfit 
      ? Math.abs(order.takeProfit - order.price)
      : riskPerShare * this.config.minRiskRewardRatio;
    const avgLoss = riskPerShare;
    
    // Kelly formula: f* = (p*b - q) / b where b = avgWin/avgLoss
    const b = avgWin / avgLoss;
    const p = winRate;
    const q = 1 - winRate;
    const kellyFraction = (p * b - q) / b;
    
    // Apply conservative fraction (default 25% of Kelly)
    const safeKelly = Math.max(0, kellyFraction * this.config.kellyFraction);
    
    // Calculate position size
    const kellyPositionValue = totalValue * safeKelly;
    let kellyQuantity = Math.floor(kellyPositionValue / order.price);
    
    reasons.push(`Kelly基準: ${(safeKelly * 100).toFixed(2)}% (勝率${(winRate * 100).toFixed(0)}%, R:R ${b.toFixed(2)})`);
    
    // Apply ATR-based volatility adjustment if available
    if (marketData) {
      const atr = getLatestATR(marketData);
      if (atr) {
        const volatility = atr / order.price;
        const volatilityAdjustment = Math.min(1.0, 0.02 / volatility);
        kellyQuantity = Math.floor(kellyQuantity * volatilityAdjustment);
        reasons.push(`ボラティリティ調整: ${(volatilityAdjustment * 100).toFixed(0)}%`);
      }
    }

    // Ensure minimum viable position
    kellyQuantity = Math.max(1, kellyQuantity);
    
    // Don't increase position size, only decrease for safety
    const adjustedQuantity = Math.min(order.quantity, kellyQuantity);
    
    if (adjustedQuantity < order.quantity) {
      reasons.push(`Kelly基準により${order.quantity}から${adjustedQuantity}に縮小`);
    }

    return { adjustedQuantity, reasons };
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
      console.warn('[RiskManagement] Automatic actions triggered:', actions);
    }
    
    return riskMetrics;
  }

  /**
   * 日次トラッキングのリセット（新しい日の開始時）
   */
  private checkAndResetDailyTracking(currentBalance: number): void {
    const now = Date.now();
    const oneDayMs = 24 * 60 * 60 * 1000;
    
    // Initialize on first call
    if (this.dailyStartBalance === 0) {
      this.dailyStartBalance = currentBalance;
      this.dailyStartTime = now;
      return;
    }
    
    // Reset after 24 hours
    if (now - this.dailyStartTime > oneDayMs) {
      this.resetDailyTracking(currentBalance);
    }
  }

  private resetDailyTracking(currentBalance?: number): void {
    this.dailyStartTime = Date.now();
    if (currentBalance !== undefined) {
      this.dailyStartBalance = currentBalance;
    }
  }

  /**
   * ピークバランスをリセット（新しい高値更新時）
   */
  resetPeakBalance(newPeak: number): void {
    this.peakBalance = newPeak;
  }

  /**
   * サービス状態の取得
   */
  getStatus(): {
    isTradingHalted: boolean;
    isOrdersBlocked: boolean;
    currentDrawdown: number;
    dailyLoss: number;
    peakBalance: number;
  } {
    const totalValue = this.peakBalance; // Fallback
    const currentDrawdown = this.peakBalance > 0 
      ? ((this.peakBalance - totalValue) / this.peakBalance) * 100
      : 0;
    const dailyLoss = this.dailyStartBalance > 0
      ? ((this.dailyStartBalance - totalValue) / this.dailyStartBalance) * 100
      : 0;

    return {
      isTradingHalted: this.riskController.isTradingHaltActive(),
      isOrdersBlocked: this.riskController.shouldBlockNewOrders(),
      currentDrawdown,
      dailyLoss,
      peakBalance: this.peakBalance,
    };
  }

  /**
   * 手動での取引再開
   */
  resumeTrading(): void {
    this.riskController.resumeTrading();
    this.riskController.unblockOrders();
  }

  /**
   * 設定の更新
   */
  updateConfig(config: Partial<RiskManagementConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * リスクコントローラーの取得（高度な操作用）
   */
  getRiskController(): AutomaticRiskController {
    return this.riskController;
  }
}

// ============================================================================
// Singleton Instance
// ============================================================================

let instance: RiskManagementService | null = null;

export function getRiskManagementService(
  config?: Partial<RiskManagementConfig>
): RiskManagementService {
  if (!instance) {
    instance = new RiskManagementService(config);
  }
  return instance;
}

export function resetRiskManagementService(): void {
  instance = null;
}
