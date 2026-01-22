'use client';

import { Position } from '@/app/types';
import { formatCurrency, cn } from '@/app/lib/utils';
import { memo } from 'react';

// Memoized Position Row
const PositionRow = memo(({
  position,
  onClose
}: {
  position: Position;
  onClose?: (symbol: string) => void;
}) => {
  const marketValue = position.currentPrice * position.quantity;
  const profit = (position.currentPrice - position.avgPrice) * position.quantity;
  const profitPercent = ((position.currentPrice - position.avgPrice) / position.avgPrice) * 100;
  const isProfit = profit >= 0;

  return (
    <tr className="hover:bg-[#192633] group transition-colors">
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
});

PositionRow.displayName = 'PositionRow';

interface PositionTableProps {
  positions: Position[];
  onClose?: (symbol: string) => void;
}

export const PositionTable = memo(({ positions, onClose }: PositionTableProps) => {
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
});

PositionTable.displayName = 'PositionTable';
