import { Stock, OHLCV } from '@/app/types';
import { DynamicRiskConfig, calculateRiskMetrics } from '@/app/lib/DynamicRiskManagement';
import { formatCurrency, formatNumber } from '@/app/lib/utils';
import { useMemo } from 'react';

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
    config
}: DynamicRiskMetricsProps) {
    const metrics = useMemo(() => {
        return calculateRiskMetrics(currentPrice, side, cash, ohlcv, config);
    }, [currentPrice, side, cash, ohlcv, config]);

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
