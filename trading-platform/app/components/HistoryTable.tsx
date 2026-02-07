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
        <thead className="text-[10px] uppercase text-[#92adc9] font-semibold sticky top-0 bg-[#141e27] z-10 border-b-2 border-[#233648]">
          <tr>
            <th className="px-4 py-2.5 font-medium tracking-wider">銘柄</th>
            <th className="px-4 py-2.5 font-medium tracking-wider">日付</th>
            <th className="px-4 py-2.5 font-medium tracking-wider">種別</th>
            <th className="px-4 py-2.5 text-right font-medium tracking-wider">数量</th>
            <th className="px-4 py-2.5 text-right font-medium tracking-wider">価格</th>
            <th className="px-4 py-2.5 text-right font-medium tracking-wider">確定損益</th>
            <th className="px-4 py-2.5 font-medium tracking-wider">状態</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-[#233648]/40">
          {entries.length === 0 ? (
            <tr>
              <td colSpan={7} className="px-4 py-12 text-center text-[#92adc9]">
                <div className="flex flex-col items-center gap-3 animate-fade-in">
                  <svg className="w-16 h-16 opacity-30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <div>
                    <p className="text-sm font-medium">取引履歴はありません</p>
                    <p className="text-xs mt-1 opacity-60">取引を実行すると、ここに履歴が表示されます</p>
                  </div>
                </div>
              </td>
            </tr>
          ) : (
            entries.map((entry) => (
              <tr 
                key={entry.id} 
                className="group hover:bg-[#1a2633]/60 transition-all duration-200"
              >
                <td className="px-4 py-2.5">
                  <div className="flex flex-col">
                    <span className="font-bold text-white">{entry.symbol}</span>
                  </div>
                </td>
                <td className="px-4 py-2.5 text-[#92adc9] text-sm">
                  {new Date(entry.date).toLocaleDateString('ja-JP')}
                </td>
                <td className={cn(
                  'px-4 py-2.5 font-medium',
                  entry.signalType === 'BUY' ? 'text-green-400' : 'text-red-400'
                )}>
                  <div className="flex items-center gap-1">
                    {entry.signalType === 'BUY' ? (
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                      </svg>
                    ) : (
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 17h8m0 0V9m0 8l-8-8-4 4-6-6" />
                      </svg>
                    )}
                    {entry.signalType === 'BUY' ? '買い' : '売り'}
                  </div>
                </td>
                <td className="px-4 py-2.5 text-right text-white tabular-nums font-medium">
                  {entry.quantity}
                </td>
                <td className="px-4 py-2.5 text-right text-[#92adc9] tabular-nums">
                  {formatCurrency(entry.entryPrice)}
                </td>
                <td className={cn(
                  'px-4 py-2.5 text-right font-bold tabular-nums',
                  (entry.profit || 0) >= 0 ? 'text-green-400' : 'text-red-400'
                )}>
                  {entry.status === 'CLOSED' ? (
                    <div className="flex items-center justify-end gap-1">
                      {(entry.profit || 0) >= 0 ? (
                        <svg className="w-3 h-3 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                        </svg>
                      ) : (
                        <svg className="w-3 h-3 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 17h8m0 0V9m0 8l-8-8-4 4-6-6" />
                        </svg>
                      )}
                      <span>
                        {(entry.profit || 0) >= 0 ? '+' : ''}
                        {formatCurrency(entry.profit || 0)}
                      </span>
                    </div>
                  ) : '-'}
                </td>
                <td className="px-4 py-2.5">
                  <span className={cn(
                    'px-2 py-1 rounded text-[10px] font-bold inline-flex items-center gap-1',
                    entry.status === 'CLOSED' 
                      ? 'bg-[#233648] text-[#92adc9]' 
                      : 'bg-primary/20 text-primary border border-primary/30'
                  )}>
                    {entry.status === 'CLOSED' ? (
                      <>
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        決済済
                      </>
                    ) : (
                      <>
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        保有中
                      </>
                    )}
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
