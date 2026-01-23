'use client';

import { Stock, Position } from '@/app/types';
import { formatCurrency, formatPercent, formatVolume, getChangeColor, cn } from '@/app/lib/utils';
import { useTradingStore } from '@/app/store/tradingStore';
import { marketClient } from '@/app/lib/api/data-aggregator';
import { useEffect, memo, useCallback, useMemo } from 'react';

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
    className={cn(
      'hover:bg-[#192633] cursor-pointer group transition-colors relative',
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
            className="p-1 text-[#92adc9] hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
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
  const { setSelectedStock, updateStockData, removeFromWatchlist } = useTradingStore();

  const symbolKey = useMemo(() => stocks.map(s => s.symbol).join(','), [stocks]);

  useEffect(() => {
    let mounted = true;
    const fetchQuotes = async () => {
      const symbols = symbolKey.split(',').filter(Boolean);
      if (symbols.length === 0) return;

      const quotes = await marketClient.fetchQuotes(symbols);
      
      if (mounted && quotes.length > 0) {
        quotes.forEach(q => {
          if (q && q.symbol) {
            updateStockData(q.symbol, {
              price: q.price,
              change: q.change,
              changePercent: q.changePercent,
              volume: q.volume,
            });
          }
        });
      }
    };

    fetchQuotes();
    const interval = setInterval(fetchQuotes, 60000);
    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, [symbolKey, updateStockData]);

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
          {stocks.map((stock) => (
            <StockRow
              key={stock.symbol}
              stock={stock}
              isSelected={selectedSymbol === stock.symbol}
              onSelect={handleSelect}
              onRemove={handleRemove}
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

// --- Position Row & Table ---

const PositionRow = memo(({
  position,
  onClose
}: {
  position: Position;
  onClose?: (symbol: string, currentPrice: number) => void;
}) => {
  const marketValue = position.currentPrice * position.quantity;
  const profit = position.side === 'LONG' 
    ? (position.currentPrice - position.avgPrice) * position.quantity
    : (position.avgPrice - position.currentPrice) * position.quantity;
    
  const profitPercent = position.side === 'LONG'
    ? ((position.currentPrice - position.avgPrice) / (position.avgPrice || 1)) * 100
    : ((position.avgPrice - position.currentPrice) / (position.avgPrice || 1)) * 100;
    
  const isProfit = profit >= 0;

  return (
    <tr className="hover:bg-[#192633] group transition-colors">
      <td className="px-4 py-2">
        <div className="flex flex-col">
          <span className="font-bold text-white">{position.symbol}</span>
          <span className="text-[10px] text-[#92adc9]">{position.name}</span>
        </div>
      </td>
      <td className={cn('px-4 py-2 font-medium', position.side === 'LONG' ? 'text-green-500' : 'text-red-500')}>
        {position.side === 'LONG' ? '買い' : '空売り'}
      </td>
      <td className="px-4 py-2 text-right text-white tabular-nums">{position.quantity}</td>
      <td className="px-4 py-2 text-right text-[#92adc9] tabular-nums">
        {position.market === 'japan' ? formatCurrency(position.avgPrice, 'JPY') : formatCurrency(position.avgPrice, 'USD')}
      </td>
      <td className="px-4 py-2 text-right text-white tabular-nums">
        {position.market === 'japan' ? formatCurrency(position.currentPrice, 'JPY') : formatCurrency(position.currentPrice, 'USD')}
      </td>
      <td className="px-4 py-2 text-right text-white tabular-nums">
        {position.market === 'japan' ? formatCurrency(marketValue, 'JPY') : formatCurrency(marketValue, 'USD')}
      </td>
      <td className={cn('px-4 py-2 text-right font-bold tabular-nums', isProfit ? 'text-green-500' : 'text-red-500')}>
        {isProfit ? '+' : ''}
        {position.market === 'japan' ? formatCurrency(profit, 'JPY') : formatCurrency(profit, 'USD')}
        <span className="ml-1 text-[10px] opacity-80">
          ({isProfit ? '+' : ''}{profitPercent.toFixed(1)}%)
        </span>
      </td>
      <td className="px-4 py-2 text-right">
        <button
          onClick={() => onClose?.(position.symbol, position.currentPrice)}
          className="text-[10px] px-2 py-0.5 rounded bg-[#192633] border border-[#233648] hover:bg-[#233648] text-[#92adc9] transition-colors"
        >
          決済
        </button>
      </td>
    </tr>
  );
});

PositionRow.displayName = 'PositionRow';

interface PositionTableProps {
  positions: Position[];
  onClose?: (symbol: string, currentPrice: number) => void;
}

export const PositionTable = memo(({ positions, onClose }: PositionTableProps) => {
  const totalValue = positions.reduce((sum, p) => sum + p.currentPrice * p.quantity, 0);
  const totalProfit = positions.reduce((sum, p) => {
    const pnl = p.side === 'LONG' 
      ? (p.currentPrice - p.avgPrice) * p.quantity
      : (p.avgPrice - p.currentPrice) * p.quantity;
    return sum + pnl;
  }, 0);

  return (
    <div className="flex-1 overflow-auto">
      <table className="w-full text-left text-xs tabular-nums">
        <thead className="text-[10px] uppercase text-[#92adc9] font-medium sticky top-0 bg-[#141e27] z-10 border-b border-[#233648]">
          <tr>
            <th className="px-4 py-2">銘柄</th>
            <th className="px-4 py-2">種別</th>
            <th className="px-4 py-2 text-right">数量</th>
            <th className="px-4 py-2 text-right">平均単価</th>
            <th className="px-4 py-2 text-right">現在値</th>
            <th className="px-4 py-2 text-right">評価額</th>
            <th className="px-4 py-2 text-right">評価損益</th>
            <th className="px-4 py-2"></th>
          </tr>
        </thead>
        <tbody className="divide-y divide-[#233648]/50">
          {positions.map((position) => (
            <PositionRow
              key={position.symbol}
              position={position}
              onClose={onClose}
            />
          ))}
        </tbody>
      </table>
      <div className="border-t border-[#233648] p-4 bg-[#141e27]">
        <div className="flex justify-between text-xs">
          <span className="text-[#92adc9]">資産合計</span>
          <span className="text-white font-bold">{formatCurrency(totalValue)}</span>
        </div>
        <div className="flex justify-between text-xs mt-1">
          <span className="text-[#92adc9]">評価損益合計</span>
          <span className={cn('font-bold', totalProfit >= 0 ? 'text-green-500' : 'text-red-500')}>
            {totalProfit >= 0 ? '+' : ''}{formatCurrency(totalProfit)}
          </span>
        </div>
      </div>
    </div>
  );
});

PositionTable.displayName = 'PositionTable';

// --- History Table ---

interface HistoryTableProps {
  entries: import('@/app/types').JournalEntry[];
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
                  {entry.signalType === 'BUY' ? '買い' : '売り'}
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