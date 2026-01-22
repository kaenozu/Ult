'use client';

import { Stock, Position } from '@/app/types';
import { formatCurrency, formatPercent, formatVolume, getChangeColor, cn } from '@/app/lib/utils';
import { useTradingStore } from '@/app/store/tradingStore';
import { marketClient } from '@/app/lib/api/data-aggregator';
import { useEffect } from 'react';

interface StockTableProps {
  stocks: Stock[];
  onSelect?: (stock: Stock) => void;
  selectedSymbol?: string;
  showChange?: boolean;
  showVolume?: boolean;
}

export function StockTable({ stocks, onSelect, selectedSymbol, showChange = true, showVolume = true }: StockTableProps) {
  const { setSelectedStock, updateStockData } = useTradingStore();

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
  }, [stocks.length]); // Refresh if list changes

  const handleSelect = (stock: Stock) => {
    setSelectedStock(stock);
    onSelect?.(stock);
  };

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
            <tr
              key={stock.symbol}
              onClick={() => handleSelect(stock)}
              className={cn(
                'hover:bg-[#192633] cursor-pointer group transition-colors',
                selectedSymbol === stock.symbol && 'bg-[#192633]/50 border-l-2 border-primary'
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
          ))}
        </tbody>
      </table>
    </div>
  );
}

interface PositionTableProps {
  positions: Position[];
  onClose?: (symbol: string) => void;
}

export function PositionTable({ positions, onClose }: PositionTableProps) {
  const totalValue = positions.reduce((sum, p) => sum + p.currentPrice * p.quantity, 0);
  const totalProfit = positions.reduce((sum, p) => sum + (p.currentPrice - p.avgPrice) * p.quantity, 0);

  return (
    <div className="flex-1 overflow-auto">
      <table className="w-full text-left text-xs tabular-nums">
        <thead className="text-[10px] uppercase text-[#92adc9] font-medium sticky top-0 bg-[#141e27] z-10">
          <tr>
            <th className="px-4 py-2">Symbol</th>
            <th className="px-4 py-2">Side</th>
            <th className="px-4 py-2 text-right">Qty</th>
            <th className="px-4 py-2 text-right">Avg Price</th>
            <th className="px-4 py-2 text-right">Mark</th>
            <th className="px-4 py-2 text-right">Mkt Val</th>
            <th className="px-4 py-2 text-right">Unr P&L</th>
            <th className="px-4 py-2"></th>
          </tr>
        </thead>
        <tbody className="divide-y divide-[#233648]/50">
          {positions.map((position) => {
            const marketValue = position.currentPrice * position.quantity;
            const profit = (position.currentPrice - position.avgPrice) * position.quantity;
            const profitPercent = ((position.currentPrice - position.avgPrice) / position.avgPrice) * 100;
            const isProfit = profit >= 0;

            return (
              <tr key={position.symbol} className="hover:bg-[#192633] group transition-colors">
                <td className="px-4 py-2">
                  <div className="flex flex-col">
                    <span className="font-bold text-white">{position.symbol}</span>
                    <span className="text-[10px] text-[#92adc9]">{position.name}</span>
                  </div>
                </td>
                <td className={cn('px-4 py-2 font-medium', isProfit ? 'text-green-500' : 'text-red-500')}>
                  {position.side}
                </td>
                <td className="px-4 py-2 text-right text-white">{position.quantity}</td>
                <td className="px-4 py-2 text-right text-[#92adc9]">
                  {position.market === 'japan' ? formatCurrency(position.avgPrice, 'JPY') : formatCurrency(position.avgPrice, 'USD')}
                </td>
                <td className="px-4 py-2 text-right text-white">
                  {position.market === 'japan' ? formatCurrency(position.currentPrice, 'JPY') : formatCurrency(position.currentPrice, 'USD')}
                </td>
                <td className="px-4 py-2 text-right text-white">
                  {position.market === 'japan' ? formatCurrency(marketValue, 'JPY') : formatCurrency(marketValue, 'USD')}
                </td>
                <td className={cn('px-4 py-2 text-right font-bold', isProfit ? 'text-green-500' : 'text-red-500')}>
                  {isProfit ? '+' : ''}
                  {position.market === 'japan' ? formatCurrency(profit, 'JPY') : formatCurrency(profit, 'USD')}
                  <span className="ml-1 text-[10px] opacity-80">
                    ({isProfit ? '+' : ''}{profitPercent.toFixed(1)}%)
                  </span>
                </td>
                <td className="px-4 py-2 text-right">
                  <button
                    onClick={() => onClose?.(position.symbol)}
                    className="text-[10px] px-2 py-0.5 rounded bg-[#192633] border border-[#233648] hover:bg-[#233648] text-[#92adc9] transition-colors"
                  >
                    CLOSE
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <div className="border-t border-[#233648] p-4 bg-[#141e27]">
        <div className="flex justify-between text-xs">
          <span className="text-[#92adc9]">Total Value</span>
          <span className="text-white font-bold">{formatCurrency(totalValue)}</span>
        </div>
        <div className="flex justify-between text-xs mt-1">
          <span className="text-[#92adc9]">Total Unrealized P&L</span>
          <span className={cn('font-bold', totalProfit >= 0 ? 'text-green-500' : 'text-red-500')}>
            {totalProfit >= 0 ? '+' : ''}{formatCurrency(totalProfit)}
          </span>
        </div>
      </div>
    </div>
  );
}
