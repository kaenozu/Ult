/**
 * riskMonitoringStore.ts
 * 
 * TRADING-023: リアルタイムリスク監視ストア
 * リアルタイムリスク計算結果と設定を管理します
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import {
  RealTimeRiskCalculator,
  RealTimeRiskMetrics,
  PositionRisk,
  RiskAlert,
  RiskCalculationConfig,
  DEFAULT_RISK_CONFIG,
} from '@/app/lib/risk/RealTimeRiskCalculator';
import { Portfolio, Position } from '@/app/types';

// ============================================================================
// Types
// ============================================================================

interface RiskMonitoringState {
  // リスク計算インスタンス
  calculator: RealTimeRiskCalculator;
  
  // リスクメトリクス
  currentRisk: RealTimeRiskMetrics | null;
  positionRisks: Map<string, PositionRisk>;
  
  // アラート
  alerts: RiskAlert[];
  unreadAlertCount: number;
  
  // 設定
  config: RiskCalculationConfig;
  isMonitoringEnabled: boolean;
  autoReducePositions: boolean;
  blockNewOrders: boolean;
  
  // 履歴
  riskHistory: Array<{
    timestamp: number;
    totalRisk: number;
    drawdown: number;
    var95: number;
  }>;
  
  // Actions
  updateRisk: (portfolio: Portfolio) => void;
  updatePositionRisk: (position: Position, portfolioValue: number) => void;
  updateConfig: (config: Partial<RiskCalculationConfig>) => void;
  addAlert: (alert: RiskAlert) => void;
  clearAlert: (alertId: string) => void;
  clearAllAlerts: () => void;
  markAlertsRead: () => void;
  setMonitoringEnabled: (enabled: boolean) => void;
  setAutoReducePositions: (enabled: boolean) => void;
  setBlockNewOrders: (blocked: boolean) => void;
  updatePriceHistory: (symbol: string, price: number) => void;
  resetDailyMetrics: () => void;
  resetWeeklyMetrics: () => void;
  clearHistory: () => void;
  
  // Getters
  shouldBlockNewOrders: () => boolean;
  shouldReducePositions: () => boolean;
  getActiveAlerts: () => RiskAlert[];
  getCriticalAlerts: () => RiskAlert[];
}

// ============================================================================
// Store
// ============================================================================

export const useRiskMonitoringStore = create<RiskMonitoringState>()(
  persist(
    (set, get) => ({
      // 初期状態
      calculator: new RealTimeRiskCalculator(DEFAULT_RISK_CONFIG),
      currentRisk: null,
      positionRisks: new Map(),
      alerts: [],
      unreadAlertCount: 0,
      config: DEFAULT_RISK_CONFIG,
      isMonitoringEnabled: true,
      autoReducePositions: false,
      blockNewOrders: false,
      riskHistory: [],

      // ポートフォリオリスクを更新
      updateRisk: (portfolio: Portfolio) => {
        const { calculator, isMonitoringEnabled, config } = get();
        
        if (!isMonitoringEnabled) {
          return;
        }
        
        // リスク計算
        const riskMetrics = calculator.calculatePortfolioRisk(portfolio);
        
        // 履歴に追加
        const historyEntry = {
          timestamp: Date.now(),
          totalRisk: riskMetrics.totalRiskPercent,
          drawdown: riskMetrics.currentDrawdown,
          var95: riskMetrics.var95,
        };
        
        set(state => {
          const newHistory = [...state.riskHistory, historyEntry];
          // 最新100件のみ保持
          if (newHistory.length > 100) {
            newHistory.shift();
          }
          
          // 新しいアラートを追加
          const existingAlertIds = new Set(state.alerts.map(a => a.id));
          const newAlerts = riskMetrics.alerts.filter(a => !existingAlertIds.has(a.id));
          const unreadCount = state.unreadAlertCount + newAlerts.length;
          
          return {
            currentRisk: riskMetrics,
            riskHistory: newHistory,
            alerts: [...state.alerts, ...newAlerts],
            unreadAlertCount: unreadCount,
          };
        });
        
        // 自動リスク制御
        const state = get();
        
        // 危険水準でブロック
        if (riskMetrics.riskLevel === 'critical' || riskMetrics.riskLevel === 'danger') {
          if (config.maxDailyLossPercent > 0 && 
              riskMetrics.dailyLossPercent >= config.maxDailyLossPercent) {
            set({ blockNewOrders: true });
          }
          
          if (state.autoReducePositions && 
              riskMetrics.currentDrawdown >= config.maxDrawdownPercent * 0.9) {
            // ポジション縮小シグナル（実際の縮小は外部で処理）
            console.warn('[RiskMonitoring] Position reduction recommended');
          }
        }
        
        // 安全水準でブロック解除
        if (riskMetrics.riskLevel === 'safe' || riskMetrics.riskLevel === 'caution') {
          if (state.blockNewOrders && 
              riskMetrics.dailyLossPercent < config.maxDailyLossPercent * 0.8) {
            set({ blockNewOrders: false });
          }
        }
      },

      // 個別ポジションリスクを更新
      updatePositionRisk: (position: Position, portfolioValue: number) => {
        const { calculator } = get();
        const positionRisk = calculator.calculatePositionRisk(position, portfolioValue);
        
        set(state => {
          const newMap = new Map(state.positionRisks);
          newMap.set(position.symbol, positionRisk);
          return { positionRisks: newMap };
        });
      },

      // 設定を更新
      updateConfig: (newConfig: Partial<RiskCalculationConfig>) => {
        set(state => {
          const updatedConfig = { ...state.config, ...newConfig };
          state.calculator.updateConfig(updatedConfig);
          return { config: updatedConfig };
        });
      },

      // アラートを追加
      addAlert: (alert: RiskAlert) => {
        set(state => ({
          alerts: [...state.alerts, alert],
          unreadAlertCount: state.unreadAlertCount + 1,
        }));
      },

      // アラートをクリア
      clearAlert: (alertId: string) => {
        set(state => ({
          alerts: state.alerts.filter(a => a.id !== alertId),
        }));
      },

      // 全アラートをクリア
      clearAllAlerts: () => {
        set({ alerts: [], unreadAlertCount: 0 });
      },

      // アラートを既読にする
      markAlertsRead: () => {
        set({ unreadAlertCount: 0 });
      },

      // モニタリングの有効/無効
      setMonitoringEnabled: (enabled: boolean) => {
        set({ isMonitoringEnabled: enabled });
      },

      // 自動ポジション縮小の有効/無効
      setAutoReducePositions: (enabled: boolean) => {
        set({ autoReducePositions: enabled });
      },

      // 新規注文ブロックの設定
      setBlockNewOrders: (blocked: boolean) => {
        set({ blockNewOrders: blocked });
      },

      // 価格履歴を更新
      updatePriceHistory: (symbol: string, price: number) => {
        const { calculator } = get();
        calculator.updatePriceHistory(symbol, price);
      },

      // 日次メトリクスをリセット
      resetDailyMetrics: () => {
        const { calculator, currentRisk } = get();
        if (currentRisk) {
          calculator.setDailyStartValue(currentRisk.peakValue);
        }
      },

      // 週次メトリクスをリセット
      resetWeeklyMetrics: () => {
        const { calculator, currentRisk } = get();
        if (currentRisk) {
          calculator.setWeeklyStartValue(currentRisk.peakValue);
        }
      },

      // 履歴をクリア
      clearHistory: () => {
        const { calculator } = get();
        calculator.clearHistory();
        set({
          riskHistory: [],
          alerts: [],
          unreadAlertCount: 0,
          currentRisk: null,
          positionRisks: new Map(),
        });
      },

      // 新規注文をブロックすべきか
      shouldBlockNewOrders: () => {
        const { blockNewOrders, currentRisk, config } = get();
        
        if (blockNewOrders) {
          return true;
        }
        
        if (!currentRisk) {
          return false;
        }
        
        // 自動ブロック条件
        return (
          currentRisk.riskLevel === 'critical' ||
          currentRisk.dailyLossPercent >= config.maxDailyLossPercent ||
          currentRisk.currentDrawdown >= config.maxDrawdownPercent
        );
      },

      // ポジション縮小が必要か
      shouldReducePositions: () => {
        const { autoReducePositions, currentRisk, config } = get();
        
        if (!autoReducePositions || !currentRisk) {
          return false;
        }
        
        // 自動縮小条件
        return (
          currentRisk.riskLevel === 'critical' ||
          currentRisk.currentDrawdown >= config.maxDrawdownPercent * 0.9 ||
          currentRisk.totalRiskPercent >= config.dangerThreshold
        );
      },

      // アクティブなアラートを取得
      getActiveAlerts: () => {
        const { alerts } = get();
        // 過去1時間以内のアラート
        const oneHourAgo = Date.now() - 60 * 60 * 1000;
        return alerts.filter(a => a.timestamp >= oneHourAgo);
      },

      // クリティカルアラートを取得
      getCriticalAlerts: () => {
        const { alerts } = get();
        return alerts.filter(a => a.severity === 'critical');
      },
    }),
    {
      name: 'risk-monitoring-storage',
      // 永続化から除外するフィールド
      partialize: (state) => ({
        config: state.config,
        isMonitoringEnabled: state.isMonitoringEnabled,
        autoReducePositions: state.autoReducePositions,
        // calculator, currentRisk, alerts などは除外
      }),
    }
  )
);

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * リスクレベルに応じた色を取得
 */
export function getRiskLevelColor(level: string): string {
  switch (level) {
    case 'safe':
      return 'text-green-400';
    case 'caution':
      return 'text-yellow-400';
    case 'warning':
      return 'text-orange-400';
    case 'danger':
      return 'text-red-400';
    case 'critical':
      return 'text-red-600';
    default:
      return 'text-gray-400';
  }
}

/**
 * リスクレベルに応じた背景色を取得
 */
export function getRiskLevelBgColor(level: string): string {
  switch (level) {
    case 'safe':
      return 'bg-green-500/20';
    case 'caution':
      return 'bg-yellow-500/20';
    case 'warning':
      return 'bg-orange-500/20';
    case 'danger':
      return 'bg-red-500/20';
    case 'critical':
      return 'bg-red-600/30';
    default:
      return 'bg-gray-500/20';
  }
}

/**
 * アラート重要度に応じた色を取得
 */
export function getAlertSeverityColor(severity: string): string {
  switch (severity) {
    case 'low':
      return 'text-blue-400';
    case 'medium':
      return 'text-yellow-400';
    case 'high':
      return 'text-orange-400';
    case 'critical':
      return 'text-red-400';
    default:
      return 'text-gray-400';
  }
}

export default useRiskMonitoringStore;
