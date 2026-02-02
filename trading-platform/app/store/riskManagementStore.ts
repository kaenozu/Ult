/**
 * Risk Management Store
 * 
 * ポジションサイジングと資金管理設定を管理するZustandストア
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface RiskManagementSettings {
  // 口座設定
  accountEquity: number;           // 口座資金（円）
  riskPerTrade: number;            // 1取引あたりのリスク率（%）デフォルト: 2%
  
  // ポジション制限
  maxPositionPercent: number;      // 最大ポジション比率（%）デフォルト: 20%
  minShares: number;               // 最小購入株数 デフォルト: 100
  
  // ATR設定
  atrMultiplier: number;           // ATR倍率（損切り距離）デフォルト: 2.0
  
  // 詳細設定
  useConfidenceAdjustment: boolean; // 信頼度による調整を使用
  enabled: boolean;                 // ポジションサイジング機能の有効/無効
}

interface RiskManagementStore {
  // 設定
  settings: RiskManagementSettings;
  
  // アクション
  updateSettings: (settings: Partial<RiskManagementSettings>) => void;
  updateAccountEquity: (equity: number) => void;
  updateRiskPerTrade: (riskPercent: number) => void;
  resetToDefaults: () => void;
  toggleEnabled: () => void;
}

// デフォルト設定
const DEFAULT_SETTINGS: RiskManagementSettings = {
  accountEquity: 1000000,          // 100万円
  riskPerTrade: 2,                 // 2%
  maxPositionPercent: 20,          // 20%
  minShares: 100,                  // 100株
  atrMultiplier: 2.0,              // 2倍ATR
  useConfidenceAdjustment: true,
  enabled: true,
};

export const useRiskManagementStore = create<RiskManagementStore>()(
  persist(
    (set) => ({
      settings: DEFAULT_SETTINGS,
      
      updateSettings: (newSettings) =>
        set((state) => ({
          settings: { ...state.settings, ...newSettings },
        })),
      
      updateAccountEquity: (equity) =>
        set((state) => ({
          settings: { ...state.settings, accountEquity: equity },
        })),
      
      updateRiskPerTrade: (riskPercent) =>
        set((state) => ({
          settings: { ...state.settings, riskPerTrade: riskPercent },
        })),
      
      resetToDefaults: () =>
        set({ settings: DEFAULT_SETTINGS }),
      
      toggleEnabled: () =>
        set((state) => ({
          settings: { ...state.settings, enabled: !state.settings.enabled },
        })),
    }),
    {
      name: 'risk-management-storage',
      version: 1,
    }
  )
);
