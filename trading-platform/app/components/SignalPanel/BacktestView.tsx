import { BacktestResult } from '@/app/lib/backtest';
import { cn } from '@/app/lib/utils';

interface BacktestViewProps {
  backtestResult: BacktestResult;
}

export function BacktestView({ backtestResult }: BacktestViewProps) {
  return (
    <div className="flex-1 overflow-auto" role="tabpanel" id="panel-backtest" aria-labelledby="tab-backtest">
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
        {backtestResult.trades.slice(0, 5).map((trade: any, i: number) => (
          <div key={i} className="bg-[#192633]/30 p-2 rounded border border-[#233648]/50 flex justify-between items-center text-xs">
            <div>
              <div className="flex items-center gap-2">
                <span className={cn('font-bold', trade.type === 'BUY' ? 'text-green-500' : 'text-red-500')}>
                  {trade.type === 'BUY' ? '買い' : '売り'}
                </span>
                <span className="text-[#92adc9]">{trade.entryDate}</span>
              </div>
            </div>
            <div className={cn('font-bold', trade.profitPercent >= 0 ? 'text-green-500' : 'text-red-500')}>
              {trade.profitPercent > 0 ? '+' : ''}{trade.profitPercent.toFixed(1)}%
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
