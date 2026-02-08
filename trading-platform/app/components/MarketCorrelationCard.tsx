'use client';

import { useState, useEffect } from 'react';
import { Stock } from '@/app/types';
import { marketDataService } from '@/app/lib/MarketDataService';
import { cn } from '@/app/lib/utils';
import { Link2, Activity, Info } from 'lucide-react';

interface MarketCorrelationCardProps {
  stock: Stock;
}

/**
 * 市場相関分析カード
 * 個別銘柄と市場全体（日経225/S&P500）の相関関係を表示します。
 */
export function MarketCorrelationCard({ stock }: MarketCorrelationCardProps) {
  const [correlation, setCorrelation] = useState<number | null>(null);
  const [beta, setBeta] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    
    async function analyzeCorrelation() {
      setIsLoading(true);
      try {
        // 銘柄データの取得
        const stockDataResult = await marketDataService.fetchMarketData(stock.symbol);
        if (!mounted) return;
        
        // 市場インデックスデータの取得
        const indexSymbol = stock.market === 'japan' ? '^N225' : '^GSPC';
        const indexDataResult = await marketDataService.fetchMarketData(indexSymbol);
        if (!mounted) return;

        if (stockDataResult.success && indexDataResult.success) {
          const corr = marketDataService.calculateCorrelation(stockDataResult.data, indexDataResult.data);
          const b = marketDataService.calculateBeta(stockDataResult.data, indexDataResult.data);
          if (mounted) {
            setCorrelation(corr);
            setBeta(b);
          }
        }
      } catch (error) {
        if (mounted) {
          console.error('Correlation analysis failed:', error);
        }
      } finally {
        if (mounted) {
          setIsLoading(false);
        }
      }
    }

    analyzeCorrelation();
    
    return () => {
      mounted = false;
    };
  }, [stock.symbol, stock.market]);

  if (isLoading) {
    return (
      <div className="p-4 bg-[#192633] rounded-xl border border-[#233648] animate-pulse">
        <div className="h-4 w-32 bg-[#233648] rounded mb-4" />
        <div className="h-8 w-full bg-[#233648] rounded" />
      </div>
    );
  }

  const getCorrelationColor = (val: number) => {
    if (val > 0.7) return 'text-green-400';
    if (val < 0.3) return 'text-blue-400';
    return 'text-yellow-400';
  };

  const getBetaDescription = (b: number) => {
    if (b > 1.2) return 'ハイリスク・ハイリターン (市場より変動大)';
    if (b < 0.8) return 'ディフェンシブ (市場より変動小)';
    return 'ニュートラル (市場並みの変動)';
  };

  return (
    <div className="p-4 bg-[#192633] rounded-xl border border-[#233648] hover:border-primary/30 transition-all">
      <div className="flex items-center gap-2 mb-3">
        <Link2 className="w-4 h-4 text-primary" />
        <h3 className="text-xs font-bold text-white uppercase tracking-wider">市場相関分析</h3>
        <div className="ml-auto group relative">
          <Info className="w-3 h-3 text-[#92adc9] cursor-help" />
          <div className="absolute bottom-full right-0 mb-2 w-48 p-2 bg-black text-[10px] text-white rounded opacity-0 group-hover:opacity-100 transition-opacity z-50 pointer-events-none border border-white/10 shadow-xl">
            市場（{stock.market === 'japan' ? '日経平均' : 'S&P 500'}）との連動性を分析します。
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {/* Correlation Coefficient */}
        <div className="space-y-1">
          <span className="text-[10px] text-[#92adc9] block">相関係数</span>
          <div className="flex items-baseline gap-1">
            <span className={cn("text-xl font-black", correlation !== null ? getCorrelationColor(correlation) : "text-white")}>
              {correlation !== null ? correlation.toFixed(2) : '--'}
            </span>
            <span className="text-[10px] text-[#92adc9]">r</span>
          </div>
          <div className="text-[9px] text-[#92adc9] leading-tight">
            {correlation !== null && correlation > 0.7 ? '強い正の相関' : '独自の動き'}
          </div>
        </div>

        {/* Beta Value */}
        <div className="space-y-1">
          <span className="text-[10px] text-[#92adc9] block">ベータ (β)</span>
          <div className="flex items-baseline gap-1">
            <span className="text-xl font-black text-white">
              {beta !== null ? beta.toFixed(2) : '--'}
            </span>
            <Activity className="w-3 h-3 text-primary animate-pulse" />
          </div>
          <div className="text-[9px] text-[#92adc9] leading-tight">
            {beta !== null ? getBetaDescription(beta) : '--'}
          </div>
        </div>
      </div>

      {/* Visual Indicator */}
      {correlation !== null && (
        <div className="mt-4 h-1 w-full bg-[#141e27] rounded-full overflow-hidden">
          <div
            className={cn("h-full transition-all duration-1000", getCorrelationColor(correlation).replace('text-', 'bg-'))}
            style={{ width: `${Math.abs(correlation) * 100}%`, marginLeft: correlation < 0 ? 'auto' : '0' }}
          />
        </div>
      )}
    </div>
  );
}