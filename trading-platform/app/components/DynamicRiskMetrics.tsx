'use client';

import { useMemo } from 'react';
import { Stock, OHLCV } from '@/app/types';
import { formatCurrency, cn } from '@/app/lib/utils';
import { dynamicRiskManagement, DynamicRiskConfig } from '@/app/lib/DynamicRiskManagement';

interface DynamicRiskMetricsProps {
  stock: Stock;
  currentPrice: number;
  side: 'BUY' | 'SELL';
  ohlcv: OHLCV[];
  cash: number;
  config: DynamicRiskConfig;
}

export function DynamicRiskMetrics({
  stock,
  currentPrice,
  side,
  ohlcv,
  cash,
  config,
}: DynamicRiskMetricsProps) {
  const riskMetrics = useMemo(() => {
    const riskResult = dynamicRiskManagement.calculateDynamicRisk(
      cash,
      currentPrice,
      side === 'BUY' ? 'LONG' : 'SHORT',
      ohlcv,
      {
        sizingMethod: config.enableDynamicPositionSizing ? 'kelly_criterion' : 'fixed_ratio',
        fixedRatio: 0.1,
        maxRiskPercent: config.maxRiskPerTrade,
        maxPositionPercent: 20,
        stopLoss: {
          enabled: true,
          type: 'atr',
          value: 2.0,
          trailing: config.enableTrailingStop,
        },
        takeProfit: {
          enabled: true,
          type: 'risk_reward_ratio',
          value: config.minRiskRewardRatio,
        },
      },
      config
    );

    const volatilityLevel = dynamicRiskManagement.getVolatilityRiskLevel(ohlcv);
    const adjustmentFactor = dynamicRiskManagement.getVolatilityAdjustmentFactor(ohlcv);

    return {
      ...riskResult,
      volatilityLevel,
      adjustmentFactor,
    };
  }, [cash, currentPrice, side, ohlcv, config]);

  const getVolatilityColor = (level: string) => {
    switch (level) {
      case 'LOW': return 'text-blue-400';
      case 'MEDIUM': return 'text-yellow-400';
      case 'HIGH': return 'text-orange-400';
      case 'EXTREME': return 'text-red-400';
      default: return 'text-gray-400';
    }
  };

  const getVolatilityLabel = (level: string) => {
    switch (level) {
      case 'LOW': return '低';
      case 'MEDIUM': return '中';
      case 'HIGH': return '高';
      case 'EXTREME': return '極端';
      default: return '不明';
    }
  };

  return (
    <div className="space-y-2">
      {/* Volatility Level */}
      <div className="flex items-center justify-between">
        <span className="text-[10px] text-[#92adc9]">ボラティリティ</span>
        <span className={cn("text-[10px] font-bold", getVolatilityColor(riskMetrics.volatilityLevel))}>
          {getVolatilityLabel(riskMetrics.volatilityLevel)}
        </span>
      </div>

      {/* Position Size */}
      <div className="flex items-center justify-between">
        <span className="text-[10px] text-[#92adc9]">推奨ポジションサイズ</span>
        <span className="text-[10px] font-bold text-white">
          {riskMetrics.positionSize.toLocaleString()} 株
        </span>
      </div>

      {/* Stop Loss */}
      <div className="flex items-center justify-between">
        <span className="text-[10px] text-[#92adc9]">ストップロス</span>
        <span className="text-[10px] font-bold text-red-400">
          {stock.market === 'japan'
            ? formatCurrency(riskMetrics.stopLossPrice || 0, 'JPY')
            : formatCurrency(riskMetrics.stopLossPrice || 0, 'USD')}
        </span>
      </div>

      {/* Take Profit */}
      <div className="flex items-center justify-between">
        <span className="text-[10px] text-[#92adc9]">利確価格</span>
        <span className="text-[10px] font-bold text-green-400">
          {stock.market === 'japan'
            ? formatCurrency(riskMetrics.takeProfitPrice || 0, 'JPY')
            : formatCurrency(riskMetrics.takeProfitPrice || 0, 'USD')}
        </span>
      </div>

      {/* Risk/Reward Ratio */}
      <div className="flex items-center justify-between">
        <span className="text-[10px] text-[#92adc9]">リスクリワード比</span>
        <span className={cn(
          "text-[10px] font-bold",
          riskMetrics.riskRewardRatio >= 2 ? "text-green-400" : "text-yellow-400"
        )}>
          1:{riskMetrics.riskRewardRatio.toFixed(1)}
        </span>
      </div>

      {/* Risk Amount */}
      <div className="flex items-center justify-between">
        <span className="text-[10px] text-[#92adc9]">リスク額</span>
        <span className="text-[10px] font-bold text-white">
          {stock.market === 'japan'
            ? formatCurrency(riskMetrics.riskAmount || 0, 'JPY')
            : formatCurrency(riskMetrics.riskAmount || 0, 'USD')}
        </span>
      </div>

      {/* Risk Percentage */}
      <div className="flex items-center justify-between">
        <span className="text-[10px] text-[#92adc9]">リスク率</span>
        <span className={cn(
          "text-[10px] font-bold",
          (riskMetrics.riskPercent || 0) <= 2 ? "text-green-400" : "text-yellow-400"
        )}>
          {(riskMetrics.riskPercent || 0).toFixed(2)}%
        </span>
      </div>

      {/* Position Sizing Method */}
      <div className="flex items-center justify-between">
        <span className="text-[10px] text-[#92adc9]">サイジング方法</span>
        <span className="text-[10px] font-bold text-blue-400">
          {riskMetrics.positionSizingMethod}
        </span>
      </div>

      {/* Adjustment Factor */}
      <div className="flex items-center justify-between">
        <span className="text-[10px] text-[#92adc9]">調整係数</span>
        <span className={cn(
          "text-[10px] font-bold",
          riskMetrics.adjustmentFactor >= 1 ? "text-green-400" : "text-orange-400"
        )}>
          {riskMetrics.adjustmentFactor.toFixed(1)}x
        </span>
      </div>

      {/* Trailing Stop Status */}
      {config.enableTrailingStop && (
        <div className="flex items-center justify-between">
          <span className="text-[10px] text-[#92adc9]">トレイリングストップ</span>
          <span className="text-[10px] font-bold text-green-400">有効</span>
        </div>
      )}
    </div>
  );
}
