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
}) => {
  const [isLocalHovered, setIsLocalHovered] = useState(false);

  return (
    <tr
      onClick={() => onSelect(stock)}
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.target !== e.currentTarget) return;

        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onSelect(stock);
        }
      }}
      onMouseEnter={() => setIsLocalHovered(true)}
      onMouseLeave={() => setIsLocalHovered(false)}
      className={cn(
        'transition-all duration-200 group relative focus:outline-none',
        isSelected 
          ? 'bg-primary/10 border-l-2 border-primary' 
          : 'hover:bg-[#1a2633]/60 border-l-2 border-transparent',
        isLocalHovered && !isSelected && 'bg-[#1a2633]/40'
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
            isLocalHovered 
              ? "text-red-400 bg-red-500/10 opacity-100" 
              : "text-[#92adc9] opacity-0 group-hover:opacity-100 focus:opacity-100"
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

type SortField = 'symbol' | 'price' | 'changePercent' | 'change' | 'volume';
type SortDirection = 'asc' | 'desc';

interface StockTableProps {
  stocks: Stock[];
  onSelect?: (stock: Stock) => void;
  selectedSymbol?: string;
  showChange?: boolean;
  showVolume?: boolean;
}

// SortIcon component defined outside the main component to avoid re-creation
interface SortIconProps {
  field: SortField;
  sortField: SortField;
  sortDirection: SortDirection;
}

const SortIcon = ({ field, sortField, sortDirection }: SortIconProps) => {
  const isActive = sortField === field;
  const direction = sortDirection === 'asc' ? 'up' : 'down';
  
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
        direction === 'asc' ? "text-green-400" : "text-red-400 rotate-180"
      )} 
      fill="none" 
      stroke="currentColor" 
      viewBox="0 0 24 24"
    >
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
    </svg>
  );
};

export const StockTable = memo(({ 
  stocks, 
  onSelect, 
  selectedSymbol, 
  showChange = true, 
  showVolume = true 
}: StockTableProps) => {
  const { measureAsync } = usePerformanceMonitor('StockTable');
  const { setSelectedStock } = useUIStore();
  const { batchUpdateStockData, removeFromWatchlist } = useWatchlistStore();
  const [pollingInterval, setPollingInterval] = useState(60000);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  
  // Sorting state
  const [sortField, setSortField] = useState<SortField>('symbol');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');

  // Sort stocks
  const sortedStocks = useMemo(() => {
    const sorted = [...stocks].sort((a, b) => {
      let aVal: number | string = a[sortField];
      let bVal: number | string = b[sortField];

      // Handle string fields
      if (sortField === 'symbol') {
        aVal = a.symbol.toLowerCase();
        bVal = b.symbol.toLowerCase();
      }

      // Handle numeric comparison
      if (typeof aVal === 'number' && typeof bVal === 'number') {
        return sortDirection === 'asc' ? aVal - bVal : bVal - aVal;
      }

      // String comparison
      if (typeof aVal === 'string' && typeof bVal === 'string') {
        return sortDirection === 'asc' 
          ? aVal.localeCompare(bVal)
          : bVal.localeCompare(aVal);
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

  // Calculate polling interval based on market volatility
  const calculatedInterval = useMemo(() => {
    if (stocks.length === 0) return 60000;

    const avgVolatility = stocks.reduce((sum, s) => 
      sum + Math.abs(s.changePercent || 0), 0) / stocks.length;
    
    // 高ボラティリティ時は短い間隔、低ボラティリティ時は長い間隔
    return avgVolatility > 2 ? 30000 : 
           avgVolatility > 1 ? 45000 : 60000;
  }, [stocks]);

  // Update polling interval when calculated value changes
  const prevIntervalRef = useRef(pollingInterval);
  useEffect(() => {
    if (calculatedInterval !== prevIntervalRef.current) {
      // Use setTimeout to defer state update
      const timeoutId = setTimeout(() => {
        setPollingInterval(calculatedInterval);
        prevIntervalRef.current = calculatedInterval;
      }, 0);
      return () => clearTimeout(timeoutId);
    }
  }, [calculatedInterval]);

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
        <thead className="text-[10px] uppercase text-[#92adc9] font-bold sticky top-0 bg-[#141e27] z-10 border-b-2 border-[#233648]">
          <tr>
            <th 
              className="px-3 py-2.5 cursor-pointer hover:bg-[#192633]/50 transition-colors"
              onClick={() => handleSort('symbol')}
            >
              <div className="flex items-center">
                銘柄
                <SortIcon field="symbol" sortField={sortField} sortDirection={sortDirection} />
              </div>
            </th>
            <th 
              className="px-2 py-2.5 text-right cursor-pointer hover:bg-[#192633]/50 transition-colors"
              onClick={() => handleSort('price')}
            >
              <div className="flex items-center justify-end">
                現在値
                <SortIcon field="price" sortField={sortField} sortDirection={sortDirection} />
              </div>
            </th>
            {showChange && (
              <th 
                className="px-2 py-2.5 text-right cursor-pointer hover:bg-[#192633]/50 transition-colors"
                onClick={() => handleSort('changePercent')}
              >
                <div className="flex items-center justify-end">
                  前日比
                  <SortIcon field="changePercent" sortField={sortField} sortDirection={sortDirection} />
                </div>
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
                  </div>
                </div>
              </td>
            </tr>
          ) : (
            sortedStocks.map((stock) => (
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
