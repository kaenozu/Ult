import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/app/components/ui/Card';
import { BacktestTrade } from '@/app/types';
import { DollarSign } from 'lucide-react';
import { cn } from '@/app/lib/utils';

interface TradesTabProps {
  trades: BacktestTrade[];
}

export function TradesTab({ trades }: TradesTabProps) {
  const [sortField] = useState<keyof BacktestTrade>('exitDate');
  const [sortDirection] = useState<'asc' | 'desc'>('desc');

  const sortedTrades = useMemo(() => {
    return [...trades].sort((a, b) => {
      const aVal = a[sortField] ?? 0;
      const bVal = b[sortField] ?? 0;
      if (sortDirection === 'asc') {
        return aVal > bVal ? 1 : -1;
      }
      return aVal < bVal ? 1 : -1;
    });
  }, [trades, sortField, sortDirection]);

  return (
    <Card className="bg-[#1e293b] border-[#334155]">
      <CardHeader>
        <CardTitle className="text-white flex items-center gap-2">
          <DollarSign className="w-5 h-5 text-green-400" />
          取引履歴
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#334155]">
                <th className="text-left py-2 text-gray-400">日付</th>
                <th className="text-left py-2 text-gray-400">タイプ</th>
                <th className="text-right py-2 text-gray-400">エントリー</th>
                <th className="text-right py-2 text-gray-400">イグジット</th>
                <th className="text-right py-2 text-gray-400">P&L</th>
                <th className="text-left py-2 text-gray-400">理由</th>
              </tr>
            </thead>
            <tbody>
              {sortedTrades.slice(0, 20).map((trade, index) => (
                <tr key={index} className="border-b border-[#334155]/50">
                  <td className="py-2 text-gray-300">{trade.exitDate}</td>
                  <td className="py-2">
                    <span className={cn(
                      "px-2 py-1 rounded text-xs font-medium",
                      trade.type === 'BUY' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
                    )}>
                      {trade.type === 'BUY' ? '買い' : '売り'}
                    </span>
                  </td>
                  <td className="py-2 text-right text-gray-300">\{trade.entryPrice.toLocaleString()}</td>
                  <td className="py-2 text-right text-gray-300">{trade.exitPrice?.toLocaleString()}</td>
                  <td className={cn(
                    "py-2 text-right font-medium",
                    (trade.profitPercent || 0) > 0 ? 'text-green-400' : 'text-red-400'
                  )}>
                    {(trade.profitPercent || 0) > 0 ? '+' : ''}{(trade.profitPercent || 0).toFixed(2)}%
                  </td>
                  <td className="py-2 text-gray-400 text-xs">{trade.exitReason}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {trades.length > 20 && (
          <p className="text-center text-xs text-gray-500 mt-4">
            最新20件を表示 / 全{trades.length}件
          </p>
        )}
      </CardContent>
    </Card>
  );
}
