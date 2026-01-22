'use client';

import { JournalEntry } from '@/app/types';
import { formatCurrency, cn } from '@/app/lib/utils';
import { memo } from 'react';

interface HistoryTableProps {
  entries: JournalEntry[];
}

export const HistoryTable = memo(({ entries }: HistoryTableProps) => {
  return (
    <div className="flex-1 overflow-auto">
      <table className="w-full text-left text-xs tabular-nums">
        <thead className="text-[10px] uppercase text-[#92adc9] font-bold sticky top-0 bg-[#141e27] z-10 border-b border-[#233648]">
          <tr>
            <th className="px-4 py-2">銘柄</th>
            <th className="px-4 py-2">日付</th>
            <th className="px-1 py-2">種別</th>
            <th className="px-4 py-2 text-right">数量</th>
            <th className="px-4 py-2 text-right">価格</th>
            <th className="px-4 py-2 text-right">確定損益</th>
            <th className="px-4 py-2">状態</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-[#233648]/50">
          {entries.length === 0 ? (
            <tr>
              <td colSpan={7} className="px-4 py-8 text-center text-[#92adc9]">
                取引履歴はありません
              </td>
            </tr>
          ) : (
            entries.map((entry) => (
              <tr key={entry.id} className="hover:bg-[#192633] transition-colors">
                <td className="px-4 py-2 font-bold text-white">{entry.symbol}</td>
                <td className="px-4 py-2 text-[#92adc9]">{entry.date}</td>
                <td className={cn(
                  'px-1 py-2 font-medium',
                  entry.signalType === 'BUY' ? 'text-green-500' : 'text-red-500'
                )}>
                  {entry.signalType}
                </td>
                <td className="px-4 py-2 text-right text-white">{entry.quantity}</td>
                <td className="px-4 py-2 text-right text-[#92adc9]">
                  {formatCurrency(entry.entryPrice)}
                </td>
                <td className={cn(
                  'px-4 py-2 text-right font-bold',
                  (entry.profit || 0) >= 0 ? 'text-green-500' : 'text-red-500'
                )}>
                  {entry.status === 'CLOSED' ? (
                    <>
                      {(entry.profit || 0) >= 0 ? '+' : ''}{formatCurrency(entry.profit || 0)}
                    </>
                  ) : '-'}
                </td>
                <td className="px-4 py-2">
                  <span className={cn(
                    'px-1.5 py-0.5 rounded-[4px] text-[10px] font-bold',
                    entry.status === 'CLOSED' ? 'bg-[#233648] text-[#92adc9]' : 'bg-primary/20 text-primary'
                  )}>
                    {entry.status === 'CLOSED' ? '決済済' : '保有中'}
                  </span>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
});

HistoryTable.displayName = 'HistoryTable';
