import { useMemo } from 'react';
import { OHLCV, Portfolio } from '@/app/types';
import { DynamicRiskConfig, calculateRiskMetrics } from '@/app/lib/DynamicRiskManagement';
import { formatCurrency } from '@/app/lib/utils';

interface DynamicRiskMetricsProps {
  portfolio: Portfolio | null;
  marketData: OHLCV[];
  riskConfig: DynamicRiskConfig;
}

export function DynamicRiskMetrics({
  portfolio,
  marketData,
  riskConfig
}: DynamicRiskMetricsProps) {
  const metrics = useMemo(() => {
    if (!portfolio || marketData.length === 0) {
      return null;
    }
    
    const currentPrice = marketData[marketData.length - 1]?.close || 0;
    const side = 'BUY' as const;
    
    return calculateRiskMetrics(
      currentPrice,
      side,
      portfolio.cash,
      marketData,
      riskConfig
    );
  }, [portfolio, marketData, riskConfig]);

  if (!metrics) {
    return null;
  }

  return (
    <div className="grid grid-cols-2 gap-2 text-[10px] bg-[#1a2632] p-2 rounded">
      <div>
        <div className="text-[#92adc9]">推奨数量</div>
        <div className="text-white font-bold">{metrics.recommendedQuantity} 株</div>
      </div>
      <div>
        <div className="text-[#92adc9]">許容リスク</div>
        <div className="text-white font-bold">{formatCurrency(metrics.riskAmount)}</div>
      </div>
      <div>
        <div className="text-[#92adc9]">ストップロス</div>
        <div className="text-red-400 font-bold">{formatCurrency(metrics.stopLossPrice)}</div>
      </div>
      <div>
        <div className="text-[#92adc9]">目標価格 (R:R {metrics.rewardRiskRatio})</div>
        <div className="text-green-400 font-bold">{formatCurrency(metrics.takeProfitPrice)}</div>
      </div>
    </div>
  );
}
