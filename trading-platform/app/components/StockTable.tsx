'use client';

import { Stock } from '@/app/types';
import { formatCurrency, formatPercent, getChangeColor, cn } from '@/app/lib/utils';
import { useWatchlistStore } from '@/app/store/watchlistStore';
import { useUIStore } from '@/app/store/uiStore';
import { marketClient } from '@/app/lib/api/data-aggregator';
import { useEffect, memo, useCallback, useMemo, useState, useRef } from 'react';
import { usePerformanceMonitor } from '@/app/lib/performance';

// Memoized Stock Row
const StockRow = memo((
  {
    stock,
    isSelected,
    onSelect,
    onRemove,
    showChange,
    showVolume: _showVolume
  }: {
    stock: Stock;
    isSelected: boolean;
    onSelect: (stock: Stock) => void;
    onRemove: (symbol: string) => void;
    showChange: boolean;
    showVolume: boolean;
  }
) => {
  return (
    <tr
      onClick={() => onSelect(stock)}
      role="button"
      aria-pressed={isSelected}
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.target !== e.currentTarget) return;

        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onSelect(stock);
        }
      }}
      className={cn(
        'transition-all duration-200 group relative focus:outline-none',
        isSelected 
          ? 'bg-primary/10 border-l-2 border-primary' 
          : 'hover:bg-[#1a2633]/60 border-l-2 border-transparent'
      )}
    >
      <td className="px-3 py-2.5">
        <div className="flex flex-col">
          <span className="font-bold text-white leading-tight text-sm">{stock.symbol}</span>
          <span className="text-[10px] text-[#92adc9] truncate max-w-[90px] opacity-80">{stock.name}</span>
        </div>
      </td>
      <td className="px-2 py-2.5 text-right text-white font-medium tabular-nums">
        {stock.market === 'japan' ? formatCurrency(stock.price, 'JPY') : formatCurrency(stock.price, 'USD')}
      </td>
      {showChange && (
        <td className={cn('px-2 py-2.5 text-right font-bold tabular-nums', getChangeColor(stock.change))}>
          <div className="flex items-center justify-end gap-1">
            {stock.change >= 0 ? (
              <svg className="w-3 h-3 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
              </svg>
            ) : (
              <svg className="w-3 h-3 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            )}
            <span>{formatPercent(stock.changePercent)}</span>
          </div>
        </td>
      )}
      <td className="w-10 px-1">
        <button
          onClick={(e) => {
            e.stopPropagation();
            onRemove(stock.symbol);
          }}
          aria-label={`${stock.name}をウォッチリストから削除`}
          className={cn(
            "p-1.5 rounded transition-all duration-200",
            "text-[#92adc9] opacity-0 group-hover:opacity-100 focus:opacity-100",
            "group-hover:text-red-400 group-hover:bg-red-500/10"
          )}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
        </button>
      </td>
    </tr>
  );
});

StockRow.displayName = 'StockRow';

const stockRowPropsAreEqual = (
  prev: { stock: Stock; isSelected: boolean; onSelect: (stock: Stock) => void; onRemove: (symbol: string) => void; showChange: boolean; showVolume: boolean },
  next: { stock: Stock; isSelected: boolean; onSelect: (stock: Stock) => void; onRemove: (symbol: string) => void; showChange: boolean; showVolume: boolean }
) => {
  return (
    prev.stock.symbol === next.stock.symbol &&
    prev.stock.price === next.stock.price &&
    prev.stock.change === next.stock.change &&
    prev.stock.changePercent === next.stock.changePercent &&
    prev.isSelected === next.isSelected &&
    prev.showChange === next.showChange &&
    prev.showVolume === next.showVolume
  );
};

const StockRowMemoized = memo(StockRow, stockRowPropsAreEqual);
StockRowMemoized.displayName = 'StockRow';

type SortField = 'symbol' | 'price' | 'changePercent' | 'change' | 'volume';
type SortDirection = 'asc' | 'desc';

interface StockTableProps {
  stocks: Stock[];
  onSelect?: (stock: Stock) => void;
  selectedSymbol?: string;
  showChange?: boolean;
  showVolume?: boolean;
}

// Initialize collator outside component for performance
const symbolCollator = new Intl.Collator(undefined, { numeric: true, sensitivity: 'base' });

// SortIcon component defined outside the main component to avoid re-creation
interface SortIconProps {
  field: SortField;
  sortField: SortField;
  sortDirection: SortDirection;
}

const SortIcon = memo(({ field, sortField, sortDirection }: SortIconProps) => {
  const isActive = sortField === field;
  
  if (!isActive) {
    return (
      <svg className="w-3 h-3 text-[#92adc9] ml-1 opacity-30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
      </svg>
    );
  }
  
  return (
    <svg 
      className={cn(
        "w-3 h-3 ml-1 transition-transform",
        sortDirection === 'asc' ? "text-green-400" : "text-red-400 rotate-180"
      )} 
      fill="none" 
      stroke="currentColor" 
      viewBox="0 0 24 24"
    >
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
    </svg>
  );
});

SortIcon.displayName = 'SortIcon';

export const StockTable = memo(({ 
  stocks, 
  onSelect, 
  selectedSymbol, 
  showChange = true, 
  showVolume = true 
}: StockTableProps) => {
  const { measureAsync } = usePerformanceMonitor('StockTable');
  const setSelectedStock = useUIStore(state => state.setSelectedStock);
  const batchUpdateStockData = useWatchlistStore(state => state.batchUpdateStockData);
  const removeFromWatchlist = useWatchlistStore(state => state.removeFromWatchlist);

  // Keep track of latest stocks for polling logic without re-triggering effect
  const stocksRef = useRef(stocks);
  useEffect(() => {
    stocksRef.current = stocks;
  }, [stocks]);
  
  // Sorting state
  const [sortField, setSortField] = useState<SortField>('symbol');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');

  // Sort stocks
  const sortedStocks = useMemo(() => {
    const sorted = [...stocks].sort((a, b) => {
      // Handle symbol sorting with optimized collator
      if (sortField === 'symbol') {
        const result = symbolCollator.compare(a.symbol, b.symbol);
        return sortDirection === 'asc' ? result : -result;
      }

      const aVal: number | string = a[sortField];
      const bVal: number | string = b[sortField];

      // Handle numeric comparison
      if (typeof aVal === 'number' && typeof bVal === 'number') {
        return sortDirection === 'asc' ? aVal - bVal : bVal - aVal;
      }

      // String comparison (fallback for non-symbol string fields)
      if (typeof aVal === 'string' && typeof bVal === 'string') {
        // Use the optimized collator for any string comparison
        const result = symbolCollator.compare(aVal as string, bVal as string);
        return sortDirection === 'asc' ? result : -result;
      }

      return 0;
    });

    return sorted;
  }, [stocks, sortField, sortDirection]);

  const handleSort = useCallback((field: SortField) => {
    if (sortField === field) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  }, [sortField]);

  const symbolKey = useMemo(() => stocks.map(s => s.symbol).join(','), [stocks]);

  useEffect(() => {
    let mounted = true;
    const controller = new AbortController();
    let timeoutId: NodeJS.Timeout;

    const fetchQuotes = async () => {
      // Don't fetch if document is hidden to save resources
      if (typeof document !== 'undefined' && document.hidden) {
        // Check again in 5s if hidden
        timeoutId = setTimeout(fetchQuotes, 5000);
        return;
      }

      await measureAsync('fetchQuotes', async () => {
        const symbols = symbolKey.split(',').filter(Boolean);
        if (symbols.length === 0) return;

        try {
          const quotes = await marketClient.fetchQuotes(symbols, controller.signal);

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
        } catch {
          // Silent error handling for polling
        }
      });
      
      // Schedule next poll adaptively using current stocks
      if (mounted) {
        const currentStocks = stocksRef.current;
        let interval = 60000;

        if (currentStocks.length > 0) {
            // Calculate average volatility
            let totalVol = 0;
            for (let i = 0; i < currentStocks.length; i++) {
              totalVol += Math.abs(currentStocks[i].changePercent || 0);
            }
            const avgVol = totalVol / currentStocks.length;

            // Higher volatility -> Faster polling
            // > 2% avg move -> 15s
            // > 1% avg move -> 30s
            // < 1% avg move -> 60s
            if (avgVol > 2) interval = 15000;
            else if (avgVol > 1) interval = 30000;
        }

        timeoutId = setTimeout(fetchQuotes, interval);
      }
    };

    // Initial fetch
    fetchQuotes();

    return () => {
      mounted = false;
      controller.abort();
      clearTimeout(timeoutId);
    };
  }, [symbolKey, batchUpdateStockData, measureAsync]);

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
        <thead className="text-[10px] uppercase text-[#92adc9] font-bold sticky top-0 bg-[#141e27] z-10 border-b-2 border-[#233648]">
          <tr>
            <th 
              className="p-0"
              aria-sort={sortField === 'symbol' ? (sortDirection === 'asc' ? 'ascending' : 'descending') : 'none'}
            >
              <button
                className="w-full h-full px-3 py-2.5 flex items-center hover:bg-[#192633]/50 transition-colors focus:outline-none focus:bg-[#192633]"
                onClick={() => handleSort('symbol')}
              >
                銘柄
                <SortIcon field="symbol" sortField={sortField} sortDirection={sortDirection} />
              </button>
            </th>
            <th 
              className="p-0"
              aria-sort={sortField === 'price' ? (sortDirection === 'asc' ? 'ascending' : 'descending') : 'none'}
            >
              <button
                className="w-full h-full px-2 py-2.5 flex items-center justify-end hover:bg-[#192633]/50 transition-colors focus:outline-none focus:bg-[#192633]"
                onClick={() => handleSort('price')}
              >
                現在値
                <SortIcon field="price" sortField={sortField} sortDirection={sortDirection} />
              </button>
            </th>
            {showChange && (
              <th 
                className="p-0"
                aria-sort={sortField === 'changePercent' ? (sortDirection === 'asc' ? 'ascending' : 'descending') : 'none'}
              >
                <button
                  className="w-full h-full px-2 py-2.5 flex items-center justify-end hover:bg-[#192633]/50 transition-colors focus:outline-none focus:bg-[#192633]"
                  onClick={() => handleSort('changePercent')}
                >
                  前日比
                  <SortIcon field="changePercent" sortField={sortField} sortDirection={sortDirection} />
                </button>
              </th>
            )}
            <th className="w-10 px-1"></th>
          </tr>
        </thead>
        <tbody className="divide-y divide-[#233648]/40">
          {sortedStocks.length === 0 ? (
            <tr>
              <td colSpan={showChange ? 4 : 3} className="px-3 py-12 text-center text-[#92adc9]">
                <div className="flex flex-col items-center gap-3 animate-fade-in">
                  <svg className="w-16 h-16 opacity-30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                  </svg>
                  <div>
                    <span className="text-sm font-medium block">ウォッチリストは空です</span>
                    <span className="text-xs opacity-60 mt-1 block">銘柄を検索して追加してください</span>
                    <button
                      onClick={() => document.getElementById('stockSearch')?.focus()}
                      className="mt-3 text-xs bg-[#233648] hover:bg-[#233648]/80 text-[#92adc9] hover:text-white px-4 py-2 rounded transition-all font-bold border border-[#233648] hover:border-[#92adc9]/30"
                    >
                      銘柄を検索
                    </button>
                  </div>
                </div>
              </td>
            </tr>
          ) : (
            sortedStocks.map((stock) => (
              <StockRowMemoized
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

export const StockTableFinal = memo(StockTable, (prev, next) => (
  prev.selectedSymbol === next.selectedSymbol &&
  prev.showChange === next.showChange &&
  prev.showVolume === next.showVolume &&
  prev.stocks.length === next.stocks.length &&
  prev.stocks.every((s, i) => {
    const n = next.stocks[i];
    return n &&
      s.symbol === n.symbol &&
      s.price === n.price &&
      s.change === n.change &&
      s.changePercent === n.changePercent &&
      s.volume === n.volume;
  })
));
StockTableFinal.displayName = 'StockTable';
