import { Stock, AIStatus, PaperTrade } from '@/app/types';
import { formatCurrency, cn } from '@/app/lib/utils';

interface AIPerformanceViewProps {
  aiStatus: AIStatus;
  stock: Stock;
  aiTrades: PaperTrade[];
}

export function AIPerformanceView({ aiStatus, stock, aiTrades }: AIPerformanceViewProps) {
  return (
    <div className="flex-1 overflow-auto space-y-4" role="tabpanel" id="panel-ai" aria-labelledby="tab-ai">
      <div className="bg-[#1a2632] p-3 rounded-lg border border-[#233648] flex justify-between items-center">
        <div>
          <div className="text-[10px] text-[#92adc9] uppercase font-bold">AI仮想口座合計損益</div>
          <div className={cn('text-xl font-black', aiStatus.totalProfit >= 0 ? 'text-green-400' : 'text-red-400')}>
            {aiStatus.totalProfit >= 0 ? '+' : ''}{formatCurrency(aiStatus.totalProfit, stock.market === 'japan' ? 'JPY' : 'USD')}
          </div>
        </div>
        <div className="text-right">
          <div className="text-[10px] text-[#92adc9] uppercase font-bold">仮想残高</div>
          <div className="text-sm font-bold text-white">{formatCurrency(aiStatus.virtualBalance, stock.market === 'japan' ? 'JPY' : 'USD')}</div>
        </div>
      </div>

      <div className="space-y-3">
        <div className="text-xs font-bold text-[#92adc9] uppercase tracking-wider">AI売買履歴と自己反省</div>
        {aiTrades.length === 0 ? (
          <div className="text-xs text-[#92adc9] text-center py-8 bg-[#192633]/20 rounded-lg border border-dashed border-[#233648]">
            この銘柄での売買履歴はまだありません。
          </div>
        ) : (
          aiTrades.map((trade: PaperTrade, i: number) => (
            <div key={i} className="bg-[#192633]/50 rounded-lg border border-[#233648] overflow-hidden">
              <div className="p-2 flex justify-between items-center border-b border-[#233648]/50 bg-black/20">
                <div className="flex items-center gap-2">
                  <span className={cn('text-[10px] font-black px-1.5 py-0.5 rounded', trade.type === 'BUY' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400')}>
                    {trade.type === 'BUY' ? '買い' : '売り'}
                  </span>
                  <span className="text-[10px] text-[#92adc9]">{trade.entryDate.split('T')[0]}</span>
                </div>
                {trade.status === 'CLOSED' && (
                  <span className={cn('text-[10px] font-bold', (trade.profitPercent || 0) >= 0 ? 'text-green-400' : 'text-red-400')}>
                    {(trade.profitPercent || 0) >= 0 ? '+' : ''}{(trade.profitPercent || 0).toFixed(2)}%
                  </span>
                )}
              </div>
              <div className="p-2">
                <div className="text-[10px] text-[#92adc9] mb-1 flex justify-between">
                  <span>Entry: {formatCurrency(trade.entryPrice, stock.market === 'japan' ? 'JPY' : 'USD')}</span>
                  {trade.status === 'CLOSED' && <span>Exit: {formatCurrency(trade.exitPrice || 0, stock.market === 'japan' ? 'JPY' : 'USD')}</span>}
                </div>
                {trade.reflection && (
                  <div className="mt-2 text-[11px] text-white/80 leading-relaxed bg-black/40 p-2 rounded italic border-l-2 border-primary/50">
                    「{trade.reflection}」
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
