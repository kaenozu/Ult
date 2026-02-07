'use client';

import { Position } from '@/app/types';
import { formatCurrency, cn } from '@/app/lib/utils';
import { memo, useMemo, useState } from 'react';

const PositionRow = memo(({
  position,
  onClose
}: {
  position: Position;
  onClose?: (symbol: string, currentPrice: number) => void;
}) => {
  const [isHovered, setIsHovered] = useState(false);
  
  const marketValue = position.currentPrice * position.quantity;
  const profit = position.side === 'LONG' 
    ? (position.currentPrice - position.avgPrice) * position.quantity
    : (position.avgPrice - position.currentPrice) * position.quantity;
    
  const profitPercent = position.side === 'LONG'
    ? ((position.currentPrice - position.avgPrice) / position.avgPrice) * 100
    : ((position.avgPrice - position.currentPrice) / position.avgPrice) * 100;
    
  const isProfit = profit >= 0;

  const sideConfig = {
    LONG: { 
      bg: 'bg-green-500/10',
      border: 'border-green-500/30',
      text: 'text-green-400',
      label: '買い',
      icon: (
        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
        </svg>
      )
    },
    SHORT: { 
      bg: 'bg-red-500/10',
      border: 'border-red-500/30',
      text: 'text-red-400',
      label: '空売り',
      icon: (
        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 17h8m0 0V9m0 8l-8-8-4 4-6-6" />
        </svg>
      )
    }
  };

  const config = sideConfig[position.side];

  return (
    <tr 
      className={cn(
        "group transition-all duration-200 hover:bg-[#1a2633]/60",
        isHovered && "bg-[#1a2633]/80"
      )}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <td className="px-4 py-2.5">
        <div className="flex flex-col">
          <span className="font-bold text-white leading-tight text-sm">{position.symbol}</span>
          <span className="text-[10px] text-[#92adc9] truncate max-w-[90px]">{position.name}</span>
        </div>
      </td>
      <td className="px-4 py-2.5">
        <span className={cn(
          "inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold border",
          config.bg, config.border, config.text
        )}>
          {config.icon}
          {config.label}
        </span>
      </td>
      <td className="px-4 py-2.5 text-right text-white tabular-nums font-medium">
        {position.quantity}
      </td>
      <td className="px-4 py-2.5 text-right text-[#92adc9] tabular-nums">
        {position.market === 'japan' ? formatCurrency(position.avgPrice, 'JPY') : formatCurrency(position.avgPrice, 'USD')}
      </td>
      <td className="px-4 py-2.5 text-right text-white tabular-nums font-medium">
        {position.market === 'japan' ? formatCurrency(position.currentPrice, 'JPY') : formatCurrency(position.currentPrice, 'USD')}
      </td>
      <td className="px-4 py-2.5 text-right text-white tabular-nums font-medium">
        {position.market === 'japan' ? formatCurrency(marketValue, 'JPY') : formatCurrency(marketValue, 'USD')}
      </td>
      <td className={cn('px-4 py-2.5 text-right font-bold tabular-nums', isProfit ? 'text-green-400' : 'text-red-400')}>
        <div className="flex flex-col items-end">
          <span className={cn(isProfit ? '' : '')}>
            {isProfit ? '+' : ''}
            {position.market === 'japan' ? formatCurrency(profit, 'JPY') : formatCurrency(profit, 'USD')}
          </span>
          <span className="text-[10px] opacity-70">
            ({isProfit ? '+' : ''}{profitPercent.toFixed(1)}%)
          </span>
        </div>
      </td>
      <td className="px-4 py-2.5 text-right">
        <button
          onClick={() => onClose?.(position.symbol, position.currentPrice)}
          className={cn(
            "text-[10px] px-3 py-1 rounded transition-all duration-200 font-medium",
            "border",
            isHovered 
              ? "bg-red-500/20 border-red-500/50 text-red-400 hover:bg-red-500/30" 
              : "bg-[#192633] border-[#233648] text-[#92adc9] hover:border-red-500/30 hover:text-red-400"
          )}
          aria-label={`${position.symbol}を決済`}
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

  if (positions.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-[#92adc9] p-8">
        <svg className="w-16 h-16 mb-4 opacity-30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
        </svg>
        <p className="text-sm font-medium">保有ポジションはありません</p>
        <p className="text-xs mt-1 opacity-60">銘柄を選択して取引を開始してください</p>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-auto">
      <table className="w-full text-left text-xs tabular-nums">
        <thead className="text-[10px] uppercase text-[#92adc9] font-semibold sticky top-0 bg-[#141e27] z-10 border-b-2 border-[#233648]">
          <tr>
            <th className="px-4 py-2.5 font-medium tracking-wider">銘柄</th>
            <th className="px-4 py-2.5 font-medium tracking-wider">種別</th>
            <th className="px-4 py-2.5 text-right font-medium tracking-wider">数量</th>
            <th className="px-4 py-2.5 text-right font-medium tracking-wider">平均単価</th>
            <th className="px-4 py-2.5 text-right font-medium tracking-wider">現在値</th>
            <th className="px-4 py-2.5 text-right font-medium tracking-wider">評価額</th>
            <th className="px-4 py-2.5 text-right font-medium tracking-wider">評価損益</th>
            <th className="px-4 py-2.5 text-right font-medium tracking-wider w-20">操作</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-[#233648]/40">
          {positions.map((position) => (
            <PositionRow
              key={position.symbol}
              position={position}
              onClose={onClose}
            />
          ))}
        </tbody>
      </table>
      <div className="border-t-2 border-[#233648] p-4 bg-[#141e27] shadow-[0_2px_8px_rgba(0,0,0,0.3)]">
        <div className="flex justify-between items-center text-sm">
          <span className="text-[#92adc9] font-medium">資産合計</span>
          <span className="text-white font-bold tabular-nums text-base">
            {formatCurrency(totalValue)}
          </span>
        </div>
        <div className="flex justify-between items-center mt-2 text-sm">
          <span className="text-[#92adc9] font-medium">評価損益合計</span>
          <span className={cn(
            "font-bold tabular-nums text-base flex items-center gap-1",
            totalProfit >= 0 ? 'text-green-400' : 'text-red-400'
          )}>
            {totalProfit >= 0 ? (
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
              </svg>
            ) : (
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 17h8m0 0V9m0 8l-8-8-4 4-6-6" />
              </svg>
            )}
            {totalProfit >= 0 ? '+' : ''}{formatCurrency(totalProfit)}
          </span>
        </div>
      </div>
    </div>
  );
});

PositionTable.displayName = 'PositionTable';
