/**
 * AutomaticRiskController.ts
 * 
 * TRADING-023: 自動リスク制御システム
 * Phase 3: 自動リスク制御
 * 
 * 最大損失制限の自動監視、ポジション縮小、緊急対応を提供します。
 */

import { EventEmitter } from 'events';
import { Portfolio, Position } from '@/app/types';
import { RealTimeRiskMetrics, RiskAlert } from './RealTimeRiskCalculator';

// ============================================================================
// Types
// ============================================================================

/**
 * リスク制御アクション
 */
export interface RiskControlAction {
  type: 'block_orders' | 'reduce_position' | 'close_position' | 'emergency_halt' | 'warning';
  severity: 'low' | 'medium' | 'high' | 'critical';
  reason: string;
  affectedSymbols?: string[];
  recommendedActions: string[];
  timestamp: number;
  executed: boolean;
}

/**
 * ポジション縮小提案
 */
export interface PositionReductionProposal {
  symbol: string;
  currentSize: number;
  recommendedSize: number;
  reductionPercent: number;
  reason: string;
  urgency: 'low' | 'medium' | 'high' | 'critical';
}

/**
 * リスク制御設定
 */
export interface RiskControlConfig {
  // 自動制御の有効化
  enableAutoControl: boolean;
  enableAutoPositionReduction: boolean;
  enableAutoOrderBlock: boolean;
  enableEmergencyHalt: boolean;
  
  // 閾値
  maxDailyLossPercent: number; // 5%
  maxWeeklyLossPercent: number; // 10%
  maxDrawdownPercent: number; // 20%
  maxConsecutiveLosses: number; // 3回
  
  // 緊急対応閾値
  emergencyDrawdownPercent: number; // 25%
  emergencyRiskPercent: number; // 50%
  marketCrashThreshold: number; // -5% in 15 min
  
  // ポジション縮小設定
  positionReductionPercent: number; // 50% reduction
  minPositionSize: number; // 最小保持サイズ
  
  // 連続損失カウント
  consecutiveLossesWindow: number; // ms (24 hours)
}

/**
 * デフォルトリスク制御設定
 */
export const DEFAULT_CONTROL_CONFIG: RiskControlConfig = {
  enableAutoControl: true,
  enableAutoPositionReduction: false, // 手動確認が推奨
  enableAutoOrderBlock: true,
  enableEmergencyHalt: false, // 慎重に使用
  
  maxDailyLossPercent: 5,
  maxWeeklyLossPercent: 10,
  maxDrawdownPercent: 20,
  maxConsecutiveLosses: 3,
  
  emergencyDrawdownPercent: 25,
  emergencyRiskPercent: 50,
  marketCrashThreshold: -5,
  
  positionReductionPercent: 50,
  minPositionSize: 1,
  
  consecutiveLossesWindow: 24 * 60 * 60 * 1000, // 24 hours
};

/**
 * 市場クラッシュ検出データ
 */
export interface MarketCrashData {
  symbol: string;
  priceChange: number;
  timeWindow: number; // ms
  isMarketCrash: boolean;
}

// ============================================================================
// AutomaticRiskController Class
// ============================================================================

export class AutomaticRiskController extends EventEmitter {
  private config: RiskControlConfig;
  private actions: RiskControlAction[] = [];
  private consecutiveLosses: Array<{ timestamp: number; amount: number }> = [];
  private isOrdersBlocked: boolean = false;
  private isTradingHalted: boolean = false;
  private lastPrices: Map<string, { price: number; timestamp: number }> = new Map();

  constructor(config: Partial<RiskControlConfig> = {}) {
    super();
    this.config = { ...DEFAULT_CONTROL_CONFIG, ...config };
  }

  /**
   * リスクメトリクスを評価し、必要なアクションを実行
   */
  evaluateAndAct(
    riskMetrics: RealTimeRiskMetrics,
    portfolio: Portfolio
  ): RiskControlAction[] {
    if (!this.config.enableAutoControl) {
      return [];
    }

    const newActions: RiskControlAction[] = [];

    // 1. 日次損失制限チェック
    if (this.config.enableAutoOrderBlock) {
      const dailyLossAction = this.checkDailyLossLimit(riskMetrics);
      if (dailyLossAction) {
        newActions.push(dailyLossAction);
      }
    }

    // 2. ドローダウン制限チェック
    const drawdownAction = this.checkDrawdownLimit(riskMetrics);
    if (drawdownAction) {
      newActions.push(drawdownAction);
    }

    // 3. 連続損失チェック
    const consecutiveLossAction = this.checkConsecutiveLosses(portfolio);
    if (consecutiveLossAction) {
      newActions.push(consecutiveLossAction);
    }

    // 4. 緊急対応チェック
    if (this.config.enableEmergencyHalt) {
      const emergencyAction = this.checkEmergencyConditions(riskMetrics);
      if (emergencyAction) {
        newActions.push(emergencyAction);
      }
    }

    // 5. ポジション縮小チェック
    if (this.config.enableAutoPositionReduction) {
      const reductionAction = this.checkPositionReduction(riskMetrics, portfolio);
      if (reductionAction) {
        newActions.push(reductionAction);
      }
    }

    // アクションを記録
    this.actions.push(...newActions);

    // イベントを発行
    newActions.forEach(action => {
      this.emit('action', action);
      
      if (action.type === 'block_orders') {
        this.isOrdersBlocked = true;
        this.emit('orders_blocked', action);
      } else if (action.type === 'emergency_halt') {
        this.isTradingHalted = true;
        this.emit('trading_halted', action);
      }
    });

    return newActions;
  }

  /**
   * 日次損失制限チェック
   */
  private checkDailyLossLimit(riskMetrics: RealTimeRiskMetrics): RiskControlAction | null {
    if (riskMetrics.dailyLossPercent >= this.config.maxDailyLossPercent) {
      return {
        type: 'block_orders',
        severity: 'critical',
        reason: `日次損失制限を超過しました (${riskMetrics.dailyLossPercent.toFixed(2)}% / ${this.config.maxDailyLossPercent}%)`,
        recommendedActions: [
          '本日の新規注文を停止',
          '既存ポジションの見直し',
          '翌日まで取引を控える',
        ],
        timestamp: Date.now(),
        executed: false,
      };
    }

    return null;
  }

  /**
   * ドローダウン制限チェック
   */
  private checkDrawdownLimit(riskMetrics: RealTimeRiskMetrics): RiskControlAction | null {
    if (riskMetrics.currentDrawdown >= this.config.maxDrawdownPercent) {
      return {
        type: 'reduce_position',
        severity: 'critical',
        reason: `最大ドローダウン制限を超過しました (${riskMetrics.currentDrawdown.toFixed(2)}% / ${this.config.maxDrawdownPercent}%)`,
        recommendedActions: [
          'ポジションの50%を縮小',
          '損失ポジションを優先的にクローズ',
          '新規注文を停止',
        ],
        timestamp: Date.now(),
        executed: false,
      };
    } else if (riskMetrics.currentDrawdown >= this.config.maxDrawdownPercent * 0.8) {
      return {
        type: 'warning',
        severity: 'high',
        reason: `ドローダウンが制限に近づいています (${riskMetrics.currentDrawdown.toFixed(2)}% / ${this.config.maxDrawdownPercent}%)`,
        recommendedActions: [
          'リスク管理を強化',
          'ポジションサイズを縮小',
          '新規エントリーを慎重に',
        ],
        timestamp: Date.now(),
        executed: false,
      };
    }

    return null;
  }

  /**
   * 連続損失チェック
   */
  private checkConsecutiveLosses(portfolio: Portfolio): RiskControlAction | null {
    // 損失をカウント
    if (portfolio.dailyPnL < 0) {
      this.consecutiveLosses.push({
        timestamp: Date.now(),
        amount: portfolio.dailyPnL,
      });
    } else if (portfolio.dailyPnL > 0) {
      // 利益が出たらリセット
      this.consecutiveLosses = [];
      return null;
    }

    // 古いエントリーを削除
    const cutoff = Date.now() - this.config.consecutiveLossesWindow;
    this.consecutiveLosses = this.consecutiveLosses.filter(l => l.timestamp >= cutoff);

    if (this.consecutiveLosses.length >= this.config.maxConsecutiveLosses) {
      return {
        type: 'block_orders',
        severity: 'high',
        reason: `連続損失回数が制限を超えました (${this.consecutiveLosses.length}回 / ${this.config.maxConsecutiveLosses}回)`,
        recommendedActions: [
          '取引を一時停止',
          '取引戦略を見直す',
          '心理状態を確認',
          '翌日まで休息',
        ],
        timestamp: Date.now(),
        executed: false,
      };
    }

    return null;
  }

  /**
   * 緊急条件チェック
   */
  private checkEmergencyConditions(riskMetrics: RealTimeRiskMetrics): RiskControlAction | null {
    // 緊急ドローダウン
    if (riskMetrics.currentDrawdown >= this.config.emergencyDrawdownPercent) {
      return {
        type: 'emergency_halt',
        severity: 'critical',
        reason: `緊急ドローダウン発生 (${riskMetrics.currentDrawdown.toFixed(2)}%)`,
        recommendedActions: [
          '全取引を即座に停止',
          '全ポジションを確認',
          '損失を確定するか判断',
          'リスク管理ルールを再評価',
        ],
        timestamp: Date.now(),
        executed: false,
      };
    }

    // 緊急リスク水準
    if (riskMetrics.totalRiskPercent >= this.config.emergencyRiskPercent) {
      return {
        type: 'emergency_halt',
        severity: 'critical',
        reason: `総合リスクが危険水準に達しました (${riskMetrics.totalRiskPercent.toFixed(2)}%)`,
        recommendedActions: [
          '全取引を停止',
          'ポジションを緊急縮小',
          'リスク管理システムを確認',
        ],
        timestamp: Date.now(),
        executed: false,
      };
    }

    return null;
  }

  /**
   * ポジション縮小チェック
   */
  private checkPositionReduction(
    riskMetrics: RealTimeRiskMetrics,
    portfolio: Portfolio
  ): RiskControlAction | null {
    if (riskMetrics.riskLevel === 'critical' || riskMetrics.riskLevel === 'danger') {
      const affectedSymbols = this.identifyHighRiskPositions(portfolio);
      
      return {
        type: 'reduce_position',
        severity: 'high',
        reason: `リスク水準が高いためポジション縮小を推奨 (${riskMetrics.riskLevel})`,
        affectedSymbols,
        recommendedActions: [
          `高リスクポジションを${this.config.positionReductionPercent}%縮小`,
          '損失ポジションを優先的にクローズ',
          'ストップロスを厳格化',
        ],
        timestamp: Date.now(),
        executed: false,
      };
    }

    return null;
  }

  /**
   * 高リスクポジションを特定
   */
  private identifyHighRiskPositions(portfolio: Portfolio): string[] {
    return portfolio.positions
      .filter(p => {
        const positionValue = p.currentPrice * p.quantity;
        const totalValue = portfolio.totalValue + portfolio.cash;
        const positionPercent = (positionValue / totalValue) * 100;
        
        // 20%以上のポジション、または損失が大きいポジション
        const pnl = p.side === 'LONG' 
          ? (p.currentPrice - p.avgPrice) * p.quantity
          : (p.avgPrice - p.currentPrice) * p.quantity;
        const pnlPercent = (pnl / (p.avgPrice * p.quantity)) * 100;
        
        return positionPercent > 20 || pnlPercent < -10;
      })
      .map(p => p.symbol);
  }

  /**
   * マーケットクラッシュを検出
   */
  detectMarketCrash(symbol: string, currentPrice: number): MarketCrashData {
    const now = Date.now();
    const lastData = this.lastPrices.get(symbol);
    
    if (!lastData) {
      this.lastPrices.set(symbol, { price: currentPrice, timestamp: now });
      return {
        symbol,
        priceChange: 0,
        timeWindow: 0,
        isMarketCrash: false,
      };
    }

    const timeWindow = now - lastData.timestamp;
    const priceChange = ((currentPrice - lastData.price) / lastData.price) * 100;
    
    // 15分以内に5%以上の下落
    const fifteenMinutes = 15 * 60 * 1000;
    const isMarketCrash = timeWindow <= fifteenMinutes && priceChange <= this.config.marketCrashThreshold;
    
    // 価格履歴を更新
    this.lastPrices.set(symbol, { price: currentPrice, timestamp: now });

    return {
      symbol,
      priceChange,
      timeWindow,
      isMarketCrash,
    };
  }

  /**
   * ポジション縮小提案を生成
   */
  generatePositionReductionProposals(
    portfolio: Portfolio,
    riskMetrics: RealTimeRiskMetrics
  ): PositionReductionProposal[] {
    const proposals: PositionReductionProposal[] = [];
    const totalValue = portfolio.totalValue + portfolio.cash;

    for (const position of portfolio.positions) {
      const positionValue = position.currentPrice * position.quantity;
      const positionPercent = (positionValue / totalValue) * 100;
      
      const pnl = position.side === 'LONG' 
        ? (position.currentPrice - position.avgPrice) * position.quantity
        : (position.avgPrice - position.currentPrice) * position.quantity;
      const pnlPercent = (pnl / (position.avgPrice * position.quantity)) * 100;

      // 縮小が必要な条件
      let needsReduction = false;
      let urgency: 'low' | 'medium' | 'high' | 'critical' = 'low';
      let reason = '';

      if (positionPercent > 25) {
        needsReduction = true;
        urgency = 'high';
        reason = `ポジション比率が高すぎます (${positionPercent.toFixed(1)}%)`;
      } else if (pnlPercent < -15) {
        needsReduction = true;
        urgency = 'critical';
        reason = `損失が大きすぎます (${pnlPercent.toFixed(1)}%)`;
      } else if (pnlPercent < -10) {
        needsReduction = true;
        urgency = 'high';
        reason = `損失が拡大しています (${pnlPercent.toFixed(1)}%)`;
      } else if (riskMetrics.riskLevel === 'critical' && positionPercent > 15) {
        needsReduction = true;
        urgency = 'medium';
        reason = 'リスク水準がクリティカルです';
      }

      if (needsReduction) {
        const reductionPercent = urgency === 'critical' ? 75 : 50;
        const recommendedSize = Math.max(
          this.config.minPositionSize,
          Math.floor(position.quantity * (1 - reductionPercent / 100))
        );

        proposals.push({
          symbol: position.symbol,
          currentSize: position.quantity,
          recommendedSize,
          reductionPercent,
          reason,
          urgency,
        });
      }
    }

    return proposals;
  }

  /**
   * 新規注文ブロック状態をチェック
   */
  shouldBlockNewOrders(): boolean {
    return this.isOrdersBlocked;
  }

  /**
   * 取引停止状態をチェック
   */
  isTradingHaltActive(): boolean {
    return this.isTradingHalted;
  }

  /**
   * 注文ブロックを解除
   */
  unblockOrders(): void {
    this.isOrdersBlocked = false;
    this.emit('orders_unblocked');
  }

  /**
   * 取引停止を解除
   */
  resumeTrading(): void {
    this.isTradingHalted = false;
    this.emit('trading_resumed');
  }

  /**
   * 連続損失をリセット
   */
  resetConsecutiveLosses(): void {
    this.consecutiveLosses = [];
  }

  /**
   * アクション履歴を取得
   */
  getActionHistory(limit: number = 50): RiskControlAction[] {
    return this.actions.slice(-limit);
  }

  /**
   * 最新のアクティブなアクションを取得
   */
  getActiveActions(): RiskControlAction[] {
    const oneHourAgo = Date.now() - 60 * 60 * 1000;
    return this.actions.filter(a => a.timestamp >= oneHourAgo && !a.executed);
  }

  /**
   * アクションを実行済みとしてマーク
   */
  markActionExecuted(timestamp: number): void {
    const action = this.actions.find(a => a.timestamp === timestamp);
    if (action) {
      action.executed = true;
    }
  }

  /**
   * 設定を更新
   */
  updateConfig(config: Partial<RiskControlConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * 設定を取得
   */
  getConfig(): RiskControlConfig {
    return { ...this.config };
  }

  /**
   * 状態をリセット
   */
  reset(): void {
    this.actions = [];
    this.consecutiveLosses = [];
    this.isOrdersBlocked = false;
    this.isTradingHalted = false;
    this.lastPrices.clear();
  }
}

/**
 * AutomaticRiskControllerのシングルトンインスタンスを作成
 */
export function createAutomaticRiskController(
  config?: Partial<RiskControlConfig>
): AutomaticRiskController {
  return new AutomaticRiskController(config);
}

export default AutomaticRiskController;
