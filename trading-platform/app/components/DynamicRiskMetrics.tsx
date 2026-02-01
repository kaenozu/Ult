'use client';

import { Stock, OHLCV } from '@/app/types';
import { DynamicRiskConfig } from '@/app/lib/DynamicRiskManagement';
import { formatCurrency, formatPercent } from '@/app/lib/utils';

interface DynamicRiskMetricsProps {
  stock: Stock;
  currentPrice: number;
  side: 'BUY' | 'SELL';
  ohlcv: OHLCV[];
  cash: number;
  config: DynamicRiskConfig;
}

/**
 * Calculate ATR (Average True Range) for volatility
 */
function calculateATR(ohlcv: OHLCV[], period: number = 14): number {
  if (ohlcv.length < period + 1) return 0;

  const trueRanges: number[] = [];
  for (let i = 1; i < ohlcv.length; i++) {
    const high = ohlcv[i].high;
    const low = ohlcv[i].low;
    const prevClose = ohlcv[i - 1].close;
    const tr = Math.max(high - low, Math.abs(high - prevClose), Math.abs(low - prevClose));
    trueRanges.push(tr);
  }

  const recentTRs = trueRanges.slice(-period);
  return recentTRs.reduce((a, b) => a + b, 0) / recentTRs.length;
}

export function DynamicRiskMetrics({
  stock,
  currentPrice,
  side,
  ohlcv,
  cash,
  config,
}: DynamicRiskMetricsProps) {
  const atr = calculateATR(ohlcv);
  const atrPercent = currentPrice > 0 ? (atr / currentPrice) * 100 : 0;

  // Calculate position size based on risk
  const riskAmount = cash * (config.maxRiskPerTrade / 100);
  const stopLossDistance = atr * config.trailingStopATRMultiple;
  const suggestedShares = stopLossDistance > 0 ? Math.floor(riskAmount / stopLossDistance) : 0;

  // Calculate stop loss and take profit prices
  const stopLossPrice = side === 'BUY'
    ? currentPrice - stopLossDistance
    : currentPrice + stopLossDistance;

  const takeProfitDistance = stopLossDistance * config.minRiskRewardRatio;
  const takeProfitPrice = side === 'BUY'
    ? currentPrice + takeProfitDistance
    : currentPrice - takeProfitDistance;

  return (
    <div className="space-y-2 text-[10px]">
      <div className="flex justify-between">
        <span className="text-[#92adc9]">ATR (14)</span>
        <span className="text-white">
          {formatCurrency(atr, stock.market === 'japan' ? 'JPY' : 'USD')} ({atrPercent.toFixed(2)}%)
        </span>
      </div>

      {config.enableTrailingStop && (
        <div className="flex justify-between">
          <span className="text-[#92adc9]">推奨ストップロス</span>
          <span className="text-red-400">
            {formatCurrency(stopLossPrice, stock.market === 'japan' ? 'JPY' : 'USD')}
          </span>
        </div>
      )}

      <div className="flex justify-between">
        <span className="text-[#92adc9]">推奨利確</span>
        <span className="text-green-400">
          {formatCurrency(takeProfitPrice, stock.market === 'japan' ? 'JPY' : 'USD')}
        </span>
      </div>

      {config.enableDynamicPositionSizing && (
        <div className="flex justify-between">
          <span className="text-[#92adc9]">推奨株数 (リスク{config.maxRiskPerTrade}%)</span>
          <span className="text-white">{suggestedShares.toLocaleString()} 株</span>
        </div>
      )}

      <div className="flex justify-between">
        <span className="text-[#92adc9]">リスク/リワード比</span>
        <span className="text-white">1:{config.minRiskRewardRatio.toFixed(1)}</span>
      </div>
    </div>
  );
}
