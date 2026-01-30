'use client';

import { useMemo } from 'react';
import { Stock, OHLCV, Position } from '@/app/types';
import { formatCurrency, cn } from '@/app/lib/utils';
import { dynamicRiskManagement, DynamicRiskConfig } from '@/app/lib/DynamicRiskManagement';
import { usePortfolioStore } from '@/app/store/portfolioStore';

interface RiskDashboardProps {
  stock: Stock;
  currentPrice: number;
  ohlcv: OHLCV[];
  config?: DynamicRiskConfig;
}

export function RiskDashboard({ stock, currentPrice, ohlcv, config }: RiskDashboardProps) {
  const portfolio = usePortfolioStore(s => s.portfolio);
  const position = portfolio.positions.find(p => p.symbol === stock.symbol);

  const riskMetrics = useMemo(() => {
    const defaultConfig: DynamicRiskConfig = {
      enableTrailingStop: true,
      trailingStopATRMultiple: 2.0,
      trailingStopMinPercent: 1.0,
      enableVolatilityAdjustment: true,
      volatilityMultiplier: 1.5,
      enableDynamicPositionSizing: true,
      maxRiskPerTrade: 2.0,
      minRiskRewardRatio: 2.0,
    };

    const effectiveConfig = config || defaultConfig;

    const riskResult = dynamicRiskManagement.calculateDynamicRisk(
      portfolio.cash,
      currentPrice,
      'LONG',
      ohlcv,
      {
        sizingMethod: effectiveConfig.enableDynamicPositionSizing ? 'kelly_criterion' : 'fixed_ratio',
        fixedRatio: 0.1,
        maxRiskPercent: effectiveConfig.maxRiskPerTrade,
        maxPositionPercent: 20,
        stopLoss: {
          enabled: true,
          type: 'atr',
          value: 2.0,
          trailing: effectiveConfig.enableTrailingStop,
        },
        takeProfit: {
          enabled: true,
          type: 'risk_reward_ratio',
          value: effectiveConfig.minRiskRewardRatio,
        },
      },
      effectiveConfig
    );

    const volatilityLevel = dynamicRiskManagement.getVolatilityRiskLevel(ohlcv);
    const adjustmentFactor = dynamicRiskManagement.getVolatilityAdjustmentFactor(ohlcv);

    return {
      ...riskResult,
      volatilityLevel,
      adjustmentFactor,
    };
  }, [portfolio.cash, currentPrice, ohlcv, config]);

  const trailingStopState = useMemo(() => {
    if (!position) return null;
    return dynamicRiskManagement.getTrailingStopState(stock.symbol);
  }, [position, stock.symbol]);

  const getVolatilityColor = (level: string) => {
    switch (level) {
      case 'LOW': return 'bg-blue-500';
      case 'MEDIUM': return 'bg-yellow-500';
      case 'HIGH': return 'bg-orange-500';
      case 'EXTREME': return 'bg-red-500';
      default: return 'bg-gray-500';
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
    <div className="bg-[#1a2632] rounded-lg border border-[#233648] p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-bold text-white">リスクダッシュボード</h3>
        <div className={cn(
          "px-2 py-1 rounded text-[10px] font-bold text-white",
          getVolatilityColor(riskMetrics.volatilityLevel)
        )}>
          ボラティリティ: {getVolatilityLabel(riskMetrics.volatilityLevel)}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {/* Position Size */}
        <div className="bg-[#192633] rounded p-3">
          <div className="text-[10px] text-[#92adc9] mb-1">推奨ポジションサイズ</div>
          <div className="text-lg font-bold text-white">
            {riskMetrics.positionSize.toLocaleString()}
          </div>
          <div className="text-[10px] text-[#92adc9]/60">株</div>
        </div>

        {/* Risk Amount */}
        <div className="bg-[#192633] rounded p-3">
          <div className="text-[10px] text-[#92adc9] mb-1">リスク額</div>
          <div className="text-lg font-bold text-red-400">
            {stock.market === 'japan'
              ? formatCurrency(riskMetrics.riskAmount || 0, 'JPY')
              : formatCurrency(riskMetrics.riskAmount || 0, 'USD')}
          </div>
          <div className="text-[10px] text-[#92adc9]/60">
            {(riskMetrics.riskPercent || 0).toFixed(2)}% of capital
          </div>
        </div>

        {/* Stop Loss */}
        <div className="bg-[#192633] rounded p-3">
          <div className="text-[10px] text-[#92adc9] mb-1">ストップロス</div>
          <div className="text-lg font-bold text-red-400">
            {stock.market === 'japan'
              ? formatCurrency(riskMetrics.stopLossPrice || 0, 'JPY')
              : formatCurrency(riskMetrics.stopLossPrice || 0, 'USD')}
          </div>
          <div className="text-[10px] text-[#92adc9]/60">
            -{riskMetrics.positionRiskPercent?.toFixed(2)}%
          </div>
        </div>

        {/* Take Profit */}
        <div className="bg-[#192633] rounded p-3">
          <div className="text-[10px] text-[#92adc9] mb-1">利確価格</div>
          <div className="text-lg font-bold text-green-400">
            {stock.market === 'japan'
              ? formatCurrency(riskMetrics.takeProfitPrice || 0, 'JPY')
              : formatCurrency(riskMetrics.takeProfitPrice || 0, 'USD')}
          </div>
          <div className="text-[10px] text-[#92adc9]/60">
            R:R = 1:{riskMetrics.riskRewardRatio.toFixed(1)}
          </div>
        </div>
      </div>

      {/* Position Sizing Method */}
      <div className="mt-3 p-3 bg-[#192633] rounded">
        <div className="flex items-center justify-between">
          <span className="text-[10px] text-[#92adc9]">サイジング方法</span>
          <span className="text-xs font-bold text-blue-400">
            {riskMetrics.positionSizingMethod}
          </span>
        </div>
      </div>

      {/* Adjustment Factor */}
      <div className="mt-3 p-3 bg-[#192633] rounded">
        <div className="flex items-center justify-between">
          <span className="text-[10px] text-[#92adc9]">ボラティリティ調整係数</span>
          <span className={cn(
            "text-xs font-bold",
            riskMetrics.adjustmentFactor >= 1 ? "text-green-400" : "text-orange-400"
          )}>
            {riskMetrics.adjustmentFactor.toFixed(1)}x
          </span>
        </div>
        <div className="mt-2 h-2 bg-[#233648] rounded-full overflow-hidden">
          <div
            className={cn(
              "h-full transition-all duration-300",
              riskMetrics.adjustmentFactor >= 1 ? "bg-green-500" : "bg-orange-500"
            )}
            style={{ width: `${Math.min(riskMetrics.adjustmentFactor * 100, 100)}%` }}
          />
        </div>
      </div>

      {/* Trailing Stop Status */}
      {trailingStopState && (
        <div className="mt-3 p-3 bg-[#192633] rounded">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] text-[#92adc9]">トレイリングストップ</span>
            <span className={cn(
              "text-xs font-bold",
              trailingStopState.enabled ? "text-green-400" : "text-gray-400"
            )}>
              {trailingStopState.enabled ? '有効' : '無効'}
            </span>
          </div>
          {trailingStopState.enabled && (
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-[#92adc9]">現在のストップ価格</span>
                <span className="text-xs font-bold text-white">
                  {stock.market === 'japan'
                    ? formatCurrency(trailingStopState.currentStop, 'JPY')
                    : formatCurrency(trailingStopState.currentStop, 'USD')}
                </span>
              </div>
              {position?.side === 'LONG' && (
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-[#92adc9]">最高値</span>
                  <span className="text-xs font-bold text-green-400">
                    {stock.market === 'japan'
                      ? formatCurrency(trailingStopState.highestHigh, 'JPY')
                      : formatCurrency(trailingStopState.highestHigh, 'USD')}
                  </span>
                </div>
              )}
              {position?.side === 'SHORT' && (
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-[#92adc9]">最安値</span>
                  <span className="text-xs font-bold text-red-400">
                    {stock.market === 'japan'
                      ? formatCurrency(trailingStopState.lowestLow, 'JPY')
                      : formatCurrency(trailingStopState.lowestLow, 'USD')}
                  </span>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Recommended Risk Percentage */}
      <div className="mt-3 p-3 bg-[#192633] rounded">
        <div className="flex items-center justify-between">
          <span className="text-[10px] text-[#92adc9]">推奨リスク率</span>
          <span className="text-xs font-bold text-white">
            {Math.min(riskMetrics.riskPercent || 0, 2).toFixed(2)}%
          </span>
        </div>
        <div className="mt-2 h-2 bg-[#233648] rounded-full overflow-hidden">
          <div
            className={cn(
              "h-full transition-all duration-300",
              (riskMetrics.riskPercent || 0) <= 2 ? "bg-green-500" : "bg-yellow-500"
            )}
            style={{ width: `${Math.min((riskMetrics.riskPercent || 0) * 50, 100)}%` }}
          />
        </div>
        <div className="mt-1 text-[10px] text-[#92adc9]/60">
          最大2%を推奨
        </div>
      </div>
    </div>
  );
}
