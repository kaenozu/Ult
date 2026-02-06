import { BacktestResult, BacktestTrade } from '@/app/lib/backtest';
import { cn } from '@/app/lib/utils';

interface BacktestViewProps {
  backtestResult: BacktestResult | null;
  loading?: boolean;
}

export function BacktestView({ backtestResult, loading }: BacktestViewProps) {
  return (
    <div className="flex-1 overflow-auto" role="tabpanel" id="panel-backtest" aria-labelledby="tab-backtest">
      {loading || !backtestResult ? (
        <div className="flex flex-col items-center justify-center h-full gap-2 py-8">
            <div className="w-6 h-6 border-2 border-[#233648] border-t-blue-500 rounded-full animate-spin" />
            <span className="text-xs text-[#92adc9]">バックテスト実行中...</span>
        </div>
      ) : (
        <>
            <div className="grid grid-cols-2 gap-2 mb-4">
                <div className="bg-[#192633]/50 p-2 rounded border border-[#233648]">
                <div className="text-[10px] text-[#92adc9]">勝率</div>
                <div className={cn('text-lg font-bold', backtestResult.winRate >= 50 ? 'text-green-500' : 'text-red-500')}>
                    {backtestResult.winRate}%
                </div>
                </div>
                <div className="bg-[#192633]/50 p-2 rounded border border-[#233648]">
                <div className="text-[10px] text-[#92adc9]">合計損益</div>
                <div className={cn('text-lg font-bold', backtestResult.totalReturn >= 0 ? 'text-green-500' : 'text-red-500')}>
                    {backtestResult.totalReturn > 0 ? '+' : ''}{backtestResult.totalReturn}%
                </div>
                </div>
            </div>

            <div className="space-y-2">
                <div className="text-xs font-bold text-[#92adc9] uppercase tracking-wider mb-1">直近のシミュレーション</div>
                {backtestResult.trades.slice(0, 5).map((trade: BacktestTrade, i: number) => (
                <div key={i} className="bg-[#192633]/30 p-2 rounded border border-[#233648]/50 flex justify-between items-center text-xs">
                    <div>
                    <div className="flex items-center gap-2">
                        <span className={cn('font-bold', trade.type === 'BUY' ? 'text-green-500' : 'text-red-500')}>
                        {trade.type === 'BUY' ? '買い' : '売り'}
                        </span>
                        <span className="text-[#92adc9]">{trade.entryDate}</span>
                    </div>
                    </div>
                    <div className={cn('font-bold', trade.profitPercent !== undefined && trade.profitPercent >= 0 ? 'text-green-500' : 'text-red-500')}>
                      {trade.profitPercent !== undefined && trade.profitPercent > 0 ? '+' : ''}{trade.profitPercent !== undefined ? trade.profitPercent.toFixed(1) : 'N/A'}%
                    </div>
                </div>
                ))}
            </div>
        </>
      )}
    </div>
  );
}