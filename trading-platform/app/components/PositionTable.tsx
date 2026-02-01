'use client';

import { Position } from '@/app/types';
import { formatCurrency, cn } from '@/app/lib/utils';
import { memo, useMemo } from 'react';

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
    ? ((position.currentPrice - position.avgPrice) / position.avgPrice) * 100
    : ((position.avgPrice - position.currentPrice) / position.avgPrice) * 100;
    
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
  // Memoize calculations for performance
  const totalValue = useMemo(() => 
    positions.reduce((sum, p) => sum + p.currentPrice * p.quantity, 0), 
    [positions]
  );

  const totalProfit = useMemo(() => 
    positions.reduce((sum, p) => {
      const pnl = p.side === 'LONG' 
        ? (p.currentPrice - p.avgPrice) * p.quantity
        : (p.avgPrice - p.currentPrice) * p.quantity;
      return sum + pnl;
    }, 0),
    [positions]
  );

  return (
    <div className="flex-1 overflow-auto">
      <table className="w-full text-left text-xs tabular-nums">
        <thead className="text-[10px] uppercase text-[#92adc9] font-medium sticky top-0 bg-[#141e27] z-10">
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
