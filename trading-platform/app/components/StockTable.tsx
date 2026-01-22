'use client';

import { Stock } from '@/app/types';
import { formatCurrency, formatPercent, formatVolume, getChangeColor, cn } from '@/app/lib/utils';
import { useTradingStore } from '@/app/store/tradingStore';
import { marketClient } from '@/app/lib/api/data-aggregator';
import { useEffect, memo, useCallback } from 'react';

// Memoized Stock Row
const StockRow = memo(({
  stock,
  isSelected,
  onSelect,
  showChange,
  showVolume
}: {
  stock: Stock;
  isSelected: boolean;
  onSelect: (stock: Stock) => void;
  showChange: boolean;
  showVolume: boolean;
}) => (
  <tr
    onClick={() => onSelect(stock)}
    className={cn(
      'hover:bg-[#192633] cursor-pointer group transition-colors',
      isSelected && 'bg-[#192633]/50 border-l-2 border-primary'
    )}
  >
    <td className="px-3 py-2">
      <div className="flex flex-col">
        <span className="font-bold text-white">{stock.symbol}</span>
        <span className="text-[10px] text-[#92adc9] truncate max-w-[80px]">{stock.name}</span>
      </div>
    </td>
    <td className="px-2 py-2 text-right text-white">
      {stock.market === 'japan' ? formatCurrency(stock.price, 'JPY') : formatCurrency(stock.price, 'USD')}
    </td>
    {showChange && (
      <td className={cn('px-2 py-2 text-right font-medium', getChangeColor(stock.change))}>
        {formatPercent(stock.changePercent)}
      </td>
    )}
    {showVolume && (
      <td className="px-2 py-2 text-right text-[#92adc9]">
        {formatVolume(stock.volume)}
      </td>
    )}
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
  const { setSelectedStock, updateStockData } = useTradingStore();

  // Create a stable key for the list of symbols to prevent re-fetching when prices change
  const symbolKey = stocks.map(s => s.symbol).join(',');

  useEffect(() => {
    let mounted = true;
    const fetchQuotes = async () => {
      const symbols = stocks.map(s => s.symbol);
      if (symbols.length === 0) return;

      const quotes = await marketClient.fetchQuotes(symbols);
      
      if (mounted && quotes.length > 0) {
        quotes.forEach(q => {
          if (q && q.symbol) {
            updateStockData(q.symbol, {
              price: q.price,
              change: q.change,
              changePercent: q.changePercent * 100, // Yahoo often returns 0.01 for 1%
              volume: q.volume,
            });
          }
        });
      }
    };

    fetchQuotes();
    const interval = setInterval(fetchQuotes, 60000); // 1 min refresh
    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, [symbolKey, updateStockData]);

  const handleSelect = useCallback((stock: Stock) => {
    setSelectedStock(stock);
    onSelect?.(stock);
  }, [setSelectedStock, onSelect]);

  return (
    <div className="overflow-y-auto flex-1">
      <table className="w-full text-left text-xs tabular-nums">
        <thead className="text-[10px] uppercase text-[#92adc9] font-medium sticky top-0 bg-[#141e27] z-10">
          <tr>
            <th className="px-3 py-2">Sym</th>
            <th className="px-2 py-2 text-right">Last</th>
            {showChange && <th className="px-2 py-2 text-right">% Chg</th>}
            {showVolume && <th className="px-2 py-2 text-right">Vol</th>}
          </tr>
        </thead>
        <tbody className="divide-y divide-[#233648]/50">
          {stocks.map((stock) => (
            <StockRow
              key={stock.symbol}
              stock={stock}
              isSelected={selectedSymbol === stock.symbol}
              onSelect={handleSelect}
              showChange={showChange}
              showVolume={showVolume}
            />
          ))}
        </tbody>
      </table>
    </div>
  );
});

StockTable.displayName = 'StockTable';
