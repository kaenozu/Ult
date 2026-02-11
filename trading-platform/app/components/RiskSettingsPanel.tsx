'use client';

import { Dispatch, SetStateAction } from 'react';
import { OHLCV, Portfolio } from '@/app/types';
import { DynamicRiskConfig } from '@/app/lib/DynamicRiskManagement';
import { cn } from '@/app/lib/utils';
import { DynamicRiskMetrics } from './DynamicRiskMetrics';

interface RiskSettingsPanelProps {
  id: string;
  riskConfig: DynamicRiskConfig;
  setRiskConfig: Dispatch<SetStateAction<DynamicRiskConfig>>;
  ohlcv: OHLCV[];
  portfolio: Portfolio;
  ids: {
    trailingStop: string;
    volAdjust: string;
    kelly: string;
  };
}

export function RiskSettingsPanel({
  id,
  riskConfig,
  setRiskConfig,
  ohlcv,
  portfolio,
  ids
}: RiskSettingsPanelProps) {
  return (
    <div id={id} className="bg-[#192633] rounded-lg p-3 border border-[#233648] space-y-3">
      {/* Trailing Stop Toggle */}
      <div className="flex items-center justify-between">
        <span id={ids.trailingStop} className="text-[10px] text-[#92adc9]">トレイリングストップ</span>
        <button
          onClick={() => setRiskConfig(prev => ({ ...prev, enableTrailingStop: !prev.enableTrailingStop }))}
          className={cn(
            "relative inline-flex h-5 w-9 items-center rounded-full transition-colors",
            riskConfig.enableTrailingStop ? "bg-green-500" : "bg-[#233648]"
          )}
          role="switch"
          aria-checked={riskConfig.enableTrailingStop}
          aria-labelledby={ids.trailingStop}
        >
          <span
            className={cn(
              "inline-block h-3 w-3 transform rounded-full bg-white transition-transform",
              riskConfig.enableTrailingStop ? "translate-x-5" : "translate-x-1"
            )}
          />
        </button>
      </div>

      {/* Volatility Adjustment Toggle */}
      <div className="flex items-center justify-between">
        <span id={ids.volAdjust} className="text-[10px] text-[#92adc9]">ボラティリティ調整</span>
        <button
          onClick={() => setRiskConfig(prev => ({ ...prev, enableVolatilityAdjustment: !prev.enableVolatilityAdjustment }))}
          className={cn(
            "relative inline-flex h-5 w-9 items-center rounded-full transition-colors",
            riskConfig.enableVolatilityAdjustment ? "bg-green-500" : "bg-[#233648]"
          )}
          role="switch"
          aria-checked={riskConfig.enableVolatilityAdjustment}
          aria-labelledby={ids.volAdjust}
        >
          <span
            className={cn(
              "inline-block h-3 w-3 transform rounded-full bg-white transition-transform",
              riskConfig.enableVolatilityAdjustment ? "translate-x-5" : "translate-x-1"
            )}
          />
        </button>
      </div>

      {/* Kelly-based Position Sizing Toggle */}
      <div className="flex items-center justify-between">
        <span id={ids.kelly} className="text-[10px] text-[#92adc9]">ケリー基準ポジションサイジング</span>
        <button
          onClick={() => setRiskConfig(prev => ({ ...prev, enableDynamicPositionSizing: !prev.enableDynamicPositionSizing }))}
          className={cn(
            "relative inline-flex h-5 w-9 items-center rounded-full transition-colors",
            riskConfig.enableDynamicPositionSizing ? "bg-green-500" : "bg-[#233648]"
          )}
          role="switch"
          aria-checked={riskConfig.enableDynamicPositionSizing}
          aria-labelledby={ids.kelly}
        >
          <span
            className={cn(
              "inline-block h-3 w-3 transform rounded-full bg-white transition-transform",
              riskConfig.enableDynamicPositionSizing ? "translate-x-5" : "translate-x-1"
            )}
          />
        </button>
      </div>

      {/* Volatility Level Selector */}
      <div className="pt-2 border-t border-[#233648]/50" role="group" aria-label="ボラティリティ係数">
        <span className="text-[10px] text-[#92adc9] block mb-2">ボラティリティ係数</span>
        <div className="grid grid-cols-4 gap-1">
          {[
            { value: 1.3, label: '低', color: 'bg-blue-500' },
            { value: 1.0, label: '中', color: 'bg-yellow-500' },
            { value: 0.7, label: '高', color: 'bg-orange-500' },
            { value: 0.4, label: '極端', color: 'bg-red-500' },
          ].map(({ value, label, color }) => (
            <button
              key={value}
              onClick={() => setRiskConfig(prev => ({ ...prev, volatilityMultiplier: value }))}
              aria-pressed={riskConfig.volatilityMultiplier === value}
              className={cn(
                "px-2 py-1 text-[10px] font-bold rounded transition-all",
                riskConfig.volatilityMultiplier === value
                  ? `${color} text-white`
                  : "bg-[#233648] text-[#92adc9] hover:text-white"
              )}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Risk Metrics Display */}
      {ohlcv.length > 0 && (
        <div className="pt-2 border-t border-[#233648]/50 space-y-2">
          <span className="text-[10px] text-[#92adc9] block">計算されたリスク指標</span>
          <DynamicRiskMetrics
            portfolio={portfolio}
            marketData={ohlcv}
            riskConfig={riskConfig}
          />
        </div>
      )}
    </div>
  );
}
