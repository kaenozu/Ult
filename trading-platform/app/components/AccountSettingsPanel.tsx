/**
 * Account Settings Panel
 * 
 * 口座資金とリスク管理設定を入力するUIコンポーネント
 */

'use client';

import { useState, useEffect } from 'react';
import { useRiskManagementStore } from '@/app/store/riskManagementStore';
import { cn } from '@/app/lib/utils';

export function AccountSettingsPanel() {
  const { settings, updateSettings, resetToDefaults, toggleEnabled } = useRiskManagementStore();
  
  // Local state for form inputs
  const [accountEquity, setAccountEquity] = useState(settings.accountEquity);
  const [riskPerTrade, setRiskPerTrade] = useState(settings.riskPerTrade);
  const [maxPositionPercent, setMaxPositionPercent] = useState(settings.maxPositionPercent);
  const [minShares, setMinShares] = useState(settings.minShares);
  const [maxStopLossPercent, setMaxStopLossPercent] = useState(settings.maxStopLossPercent || 5);
  const [atrMultiplier, setAtrMultiplier] = useState(settings.atrMultiplier);
  
  // Sync local state with store when settings change externally
  useEffect(() => {
    setAccountEquity(settings.accountEquity);
    setRiskPerTrade(settings.riskPerTrade);
    setMaxPositionPercent(settings.maxPositionPercent);
    setMinShares(settings.minShares);
    setMaxStopLossPercent(settings.maxStopLossPercent || 5);
    setAtrMultiplier(settings.atrMultiplier);
  }, [settings]);
  
  const handleSave = () => {
    updateSettings({
      accountEquity,
      riskPerTrade,
      maxPositionPercent,
      minShares,
      maxStopLossPercent,
      atrMultiplier,
    });
  };
  
  const handleReset = () => {
    resetToDefaults();
  };
  
  const formatCurrency = (value: number): string => {
    return new Intl.NumberFormat('ja-JP', {
      style: 'currency',
      currency: 'JPY',
      maximumFractionDigits: 0,
    }).format(value);
  };
  
  const calculatedRiskAmount = (accountEquity * riskPerTrade) / 100;
  const maxPositionValue = (accountEquity * maxPositionPercent) / 100;
  
  return (
    <div className="p-4 bg-[#141e27] rounded-lg border border-[#233648]">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-bold text-white">資金管理設定</h3>
        <button
          onClick={toggleEnabled}
          className={cn(
            'px-3 py-1 rounded text-sm font-medium transition-colors',
            settings.enabled
              ? 'bg-green-600 hover:bg-green-700 text-white'
              : 'bg-gray-600 hover:bg-gray-700 text-white'
          )}
        >
          {settings.enabled ? '有効' : '無効'}
        </button>
      </div>
      
      {settings.enabled && (
        <div className="space-y-4">
          {/* 口座資金 */}
          <div>
            <label className="block text-sm font-medium text-[#92adc9] mb-1">
              口座資金
            </label>
            <input
              type="number"
              value={accountEquity}
              onChange={(e) => setAccountEquity(Number(e.target.value))}
              className="w-full px-3 py-2 bg-[#192633] border border-[#233648] rounded text-white focus:outline-none focus:border-primary"
              min="0"
              step="10000"
            />
            <p className="text-xs text-[#92adc9] mt-1">
              現在の設定: {formatCurrency(accountEquity)}
            </p>
          </div>
          
          {/* 1取引あたりのリスク率 */}
          <div>
            <label className="block text-sm font-medium text-[#92adc9] mb-1">
              1取引あたりのリスク率 (%)
            </label>
            <div className="flex items-center gap-2">
              <input
                type="range"
                min="0.5"
                max="5"
                step="0.5"
                value={riskPerTrade}
                onChange={(e) => setRiskPerTrade(Number(e.target.value))}
                className="flex-1"
              />
              <input
                type="number"
                value={riskPerTrade}
                onChange={(e) => setRiskPerTrade(Number(e.target.value))}
                className="w-20 px-2 py-1 bg-[#192633] border border-[#233648] rounded text-white text-sm focus:outline-none focus:border-primary"
                min="0.5"
                max="5"
                step="0.5"
              />
            </div>
            <p className="text-xs text-[#92adc9] mt-1">
              リスク金額: {formatCurrency(calculatedRiskAmount)} (推奨: 1-2%)
            </p>
          </div>
          
          {/* 最大ポジション比率 */}
          <div>
            <label className="block text-sm font-medium text-[#92adc9] mb-1">
              最大ポジション比率 (%)
            </label>
            <div className="flex items-center gap-2">
              <input
                type="range"
                min="5"
                max="50"
                step="5"
                value={maxPositionPercent}
                onChange={(e) => setMaxPositionPercent(Number(e.target.value))}
                className="flex-1"
              />
              <input
                type="number"
                value={maxPositionPercent}
                onChange={(e) => setMaxPositionPercent(Number(e.target.value))}
                className="w-20 px-2 py-1 bg-[#192633] border border-[#233648] rounded text-white text-sm focus:outline-none focus:border-primary"
                min="5"
                max="50"
                step="5"
              />
            </div>
            <p className="text-xs text-[#92adc9] mt-1">
              最大ポジション: {formatCurrency(maxPositionValue)} (推奨: 10-20%)
            </p>
          </div>
          
          {/* 最小単位株数 */}
          <div>
            <label className="block text-sm font-medium text-[#92adc9] mb-1">
              最小単位株数
            </label>
            <input
              type="number"
              value={minShares}
              onChange={(e) => setMinShares(Number(e.target.value))}
              className="w-full px-3 py-2 bg-[#192633] border border-[#233648] rounded text-white focus:outline-none focus:border-primary"
              min="1"
              step="1"
            />
            <p className="text-xs text-[#92adc9] mt-1">
              日本株の多くは100株単位です
            </p>
          </div>

          {/* 最大許容損切り率 */}
          <div>
            <label className="block text-sm font-medium text-[#92adc9] mb-1">
              最大許容損切り率 (%)
            </label>
            <div className="flex items-center gap-2">
              <input
                type="range"
                min="1"
                max="20"
                step="1"
                value={maxStopLossPercent}
                onChange={(e) => setMaxStopLossPercent(Number(e.target.value))}
                className="flex-1"
              />
              <input
                type="number"
                value={maxStopLossPercent}
                onChange={(e) => setMaxStopLossPercent(Number(e.target.value))}
                className="w-20 px-2 py-1 bg-[#192633] border border-[#233648] rounded text-white text-sm focus:outline-none focus:border-primary"
                min="1"
                max="20"
                step="1"
              />
            </div>
            <p className="text-xs text-[#92adc9] mt-1">
              これを超える損切り距離は警告されます (推奨: 5-10%)
            </p>
          </div>
          
          {/* ATR倍率 */}
          <div>
            <label className="block text-sm font-medium text-[#92adc9] mb-1">
              ATR倍率（損切り距離）
            </label>
            <div className="flex items-center gap-2">
              <input
                type="range"
                min="1"
                max="4"
                step="0.5"
                value={atrMultiplier}
                onChange={(e) => setAtrMultiplier(Number(e.target.value))}
                className="flex-1"
              />
              <input
                type="number"
                value={atrMultiplier}
                onChange={(e) => setAtrMultiplier(Number(e.target.value))}
                className="w-20 px-2 py-1 bg-[#192633] border border-[#233648] rounded text-white text-sm focus:outline-none focus:border-primary"
                min="1"
                max="4"
                step="0.5"
              />
            </div>
            <p className="text-xs text-[#92adc9] mt-1">
              損切り距離: ATR × {atrMultiplier} (推奨: 2.0-2.5)
            </p>
          </div>
          
          {/* 信頼度調整 */}
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium text-[#92adc9]">
              信頼度による調整
            </label>
            <button
              onClick={() => updateSettings({ useConfidenceAdjustment: !settings.useConfidenceAdjustment })}
              className={cn(
                'px-3 py-1 rounded text-xs font-medium transition-colors',
                settings.useConfidenceAdjustment
                  ? 'bg-blue-600 hover:bg-blue-700 text-white'
                  : 'bg-gray-600 hover:bg-gray-700 text-white'
              )}
            >
              {settings.useConfidenceAdjustment ? 'ON' : 'OFF'}
            </button>
          </div>
          
          {/* アクションボタン */}
          <div className="flex gap-2 pt-2">
            <button
              onClick={handleSave}
              className="flex-1 px-4 py-2 bg-primary hover:bg-primary/90 text-white rounded font-medium transition-colors"
            >
              保存
            </button>
            <button
              onClick={handleReset}
              className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded font-medium transition-colors"
            >
              リセット
            </button>
          </div>
          
          {/* 警告メッセージ */}
          <div className="p-3 bg-yellow-900/20 border border-yellow-700/50 rounded">
            <p className="text-xs text-yellow-400">
              ⚠️ 資金管理は取引成功の鍵です。推奨設定を守り、リスクを抑えた取引を心がけてください。
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
