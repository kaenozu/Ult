'use client';

import { Stock } from '@/app/types';
import { formatCurrency, formatPercent, getChangeColor, cn } from '@/app/lib/utils';
import { useWatchlistStore } from '@/app/store/watchlistStore';
import { useUIStore } from '@/app/store/uiStore';
import { marketClient } from '@/app/lib/api/data-aggregator';
import { useEffect, memo, useCallback, useMemo, useState, useRef } from 'react';
import { usePerformanceMonitor } from '@/app/lib/performance';

// Memoized Stock Row
const StockRow = memo(({
  stock,
  isSelected,
  onSelect,
  onRemove,
  showChange,
  showVolume
}: {
  stock: Stock;
  isSelected: boolean;
  onSelect: (stock: Stock) => void;
  onRemove: (symbol: string) => void;
  showChange: boolean;
  showVolume: boolean;
}) => (
  <tr
    onClick={() => onSelect(stock)}
    tabIndex={0}
    onKeyDown={(e) => {
      // Ignore events bubbling from interactive children (e.g. delete button)
      if (e.target !== e.currentTarget) return;

      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        onSelect(stock);
      }
    }}
    className={cn(
      'hover:bg-[#192633] cursor-pointer group transition-colors relative focus:outline-none focus:bg-[#192633]',
      isSelected && 'bg-[#192633]/50 border-l-2 border-primary'
    )}
  >
    <td className="px-3 py-2">
      <div className="flex flex-col">
        <span className="font-bold text-white leading-tight">{stock.symbol}</span>
        <span className="text-[10px] text-[#92adc9] truncate max-w-[90px]">{stock.name}</span>
      </div>
    </td>
    <td className="px-1 py-2 text-right text-white font-medium tabular-nums">
      {stock.market === 'japan' ? formatCurrency(stock.price, 'JPY') : formatCurrency(stock.price, 'USD')}
    </td>
    {showChange && (
      <td className={cn('px-1 py-2 text-right font-bold tabular-nums', getChangeColor(stock.change))}>
        {formatPercent(stock.changePercent)}
      </td>
    )}
    <td className="w-8 px-1">
      <button
        onClick={(e) => {
          e.stopPropagation();
          onRemove(stock.symbol);
        }}
        aria-label={`${stock.name}をウォッチリストから削除`}
        className="p-1 text-[#92adc9] hover:text-red-400 opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity"
      >
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
        </svg>
      </button>
    </td>
  </tr>
));

StockRow.displayName = 'StockRow';

interface StockTableProps {
  stocks: Stock[];
  onSelect?: (stock: Stock) => void;
  selectedSymbol?: string;
  showChange?: boolean;
  showVolume?: boolean;
}

export const StockTable = memo(({ stocks, onSelect, selectedSymbol, showChange = true, showVolume = true }: StockTableProps) => {
  const { measureAsync } = usePerformanceMonitor('StockTable');
  const { setSelectedStock } = useUIStore();
  const { batchUpdateStockData, removeFromWatchlist } = useWatchlistStore();
  const [pollingInterval, setPollingInterval] = useState(60000);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const symbolKey = useMemo(() => stocks.map(s => s.symbol).join(','), [stocks]);

  // 市場の変動性に基づいてポーリング間隔を動的に調整
  useEffect(() => {
    if (stocks.length === 0) return;

    const avgVolatility = stocks.reduce((sum, s) => 
      sum + Math.abs(s.changePercent || 0), 0) / stocks.length;
    
    // 高ボラティリティ時は短い間隔、低ボラティリティ時は長い間隔
    const newInterval = avgVolatility > 2 ? 30000 : 
                        avgVolatility > 1 ? 45000 : 60000;
    
    if (newInterval !== pollingInterval) {
      setPollingInterval(newInterval);
    }
  }, [stocks, pollingInterval]);

  useEffect(() => {
    let mounted = true;
    const fetchQuotes = async () => {
      await measureAsync('fetchQuotes', async () => {
        const symbols = symbolKey.split(',').filter(Boolean);
        if (symbols.length === 0) return;

        const quotes = await marketClient.fetchQuotes(symbols);

        if (mounted && quotes.length > 0) {
          const updates = quotes
            .filter(q => q && q.symbol)
            .map(q => ({
              symbol: q.symbol,
              data: {
                price: q.price,
                change: q.change,
                changePercent: q.changePercent,
                volume: q.volume,
              }
            }));

          if (updates.length > 0) {
            batchUpdateStockData(updates);
          }
        }
      });
    };

    fetchQuotes();
    intervalRef.current = setInterval(fetchQuotes, pollingInterval);
    
    return () => {
      mounted = false;
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [symbolKey, batchUpdateStockData, pollingInterval, measureAsync]);

  const handleSelect = useCallback((stock: Stock) => {
    setSelectedStock(stock);
    onSelect?.(stock);
  }, [setSelectedStock, onSelect]);

  const handleRemove = useCallback((symbol: string) => {
    removeFromWatchlist(symbol);
  }, [removeFromWatchlist]);

  return (
    <div className="overflow-y-auto flex-1">
      <table className="w-full text-left text-xs tabular-nums">
        <thead className="text-[10px] uppercase text-[#92adc9] font-bold sticky top-0 bg-[#141e27] z-10 border-b border-[#233648]">
          <tr>
            <th className="px-3 py-2">銘柄</th>
            <th className="px-1 py-2 text-right">現在値</th>
            {showChange && <th className="px-1 py-2 text-right">前日比</th>}
            <th className="w-8 px-1"></th>
          </tr>
        </thead>
        <tbody className="divide-y divide-[#233648]/50">
          {stocks.length === 0 ? (
            <tr>
              <td colSpan={showChange ? 4 : 3} className="px-3 py-8 text-center text-[#92adc9]">
                <div className="flex flex-col items-center gap-2">
                  <span className="text-sm font-medium">ウォッチリストは空です</span>
                  <span className="text-xs opacity-70">銘柄を検索して追加してください</span>
                </div>
              </td>
            </tr>
          ) : (
            stocks.map((stock) => (
              <StockRow
                key={stock.symbol}
                stock={stock}
                isSelected={selectedSymbol === stock.symbol}
                onSelect={handleSelect}
                onRemove={handleRemove}
                showChange={showChange}
                showVolume={showVolume}
              />
            ))
          )}
        </tbody>
      </table>
    </div>
  );
});

StockTable.displayName = 'StockTable';
