'use client';

import { Stock, Signal } from '@/app/types';
import { formatCurrency, cn, getConfidenceColor } from '@/app/lib/utils';

interface SignalPanelProps {
  stock: Stock;
  signal: Signal | null;
  loading?: boolean;
}

export function SignalPanel({ stock, signal, loading = false }: SignalPanelProps) {
  if (loading || !signal) {
    return (
      <div className="bg-[#141e27] p-4 flex flex-col gap-3">
        <div className="flex justify-between items-center text-xs">
          <div className="h-4 w-24 bg-[#233648] rounded animate-pulse" />
          <div className="h-4 w-12 bg-[#233648] rounded animate-pulse" />
        </div>
        <div className="h-48 bg-[#192633]/50 rounded-lg border border-[#233648] animate-pulse flex items-center justify-center">
          <span className="text-[#92adc9]/50 text-xs">Analyzing Market Data...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-[#141e27] p-4 flex flex-col gap-3">
      <div className="flex justify-between items-center text-xs">
        <div className="flex items-center gap-2">
          <span className="font-bold text-white text-sm">AI Signal</span>
          <span className="px-1.5 py-0.5 bg-blue-500/20 text-blue-400 text-[10px] rounded">
            Technical
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[#92adc9]">信頼度:</span>
          <span className={cn('font-bold', getConfidenceColor(signal.confidence))}>
            {signal.confidence}%
          </span>
        </div>
      </div>

      <div className={cn(
        'p-3 rounded-lg border backdrop-blur-sm transition-all',
        signal.type === 'BUY' && 'bg-green-500/10 border-green-500/50',
        signal.type === 'SELL' && 'bg-red-500/10 border-red-500/50',
        signal.type === 'HOLD' && 'bg-gray-500/10 border-gray-500/50'
      )}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className={cn(
              'text-2xl font-bold',
              signal.type === 'BUY' && 'text-green-500',
              signal.type === 'SELL' && 'text-red-500',
              signal.type === 'HOLD' && 'text-gray-400'
            )}>
              {signal.type}
            </span>
            {signal.type !== 'HOLD' && (
              <span className={cn(
                'text-sm px-2 py-0.5 rounded',
                signal.type === 'BUY' && 'bg-green-500/20 text-green-400',
                signal.type === 'SELL' && 'bg-red-500/20 text-red-400'
              )}>
                {signal.predictedChange > 0 ? '+' : ''}{signal.predictedChange.toFixed(1)}%
              </span>
            )}
          </div>
          <div className="text-right">
            <div className="text-xs text-[#92adc9]">Target</div>
            <div className="text-white font-bold">
              {stock.market === 'japan' ? formatCurrency(signal.targetPrice, 'JPY') : formatCurrency(signal.targetPrice, 'USD')}
            </div>
          </div>
        </div>

        <div className="mt-3 pt-3 border-t border-[#233648]/50">
          <div className="flex justify-between items-center">
            <div>
              <div className="text-xs text-[#92adc9]">Stop Loss</div>
              <div className="text-white font-medium">
                {stock.market === 'japan' ? formatCurrency(signal.stopLoss, 'JPY') : formatCurrency(signal.stopLoss, 'USD')}
              </div>
            </div>
            <div>
              <div className="text-xs text-[#92adc9]">Current</div>
              <div className="text-white font-medium">
                {stock.market === 'japan' ? formatCurrency(stock.price, 'JPY') : formatCurrency(stock.price, 'USD')}
              </div>
            </div>
          </div>
        </div>

        <div className="mt-4 pt-3 border-t border-[#233648]/50">
          <div className="text-xs font-bold text-[#92adc9] mb-2 uppercase tracking-wider">AI分析レポート</div>
          <div className="text-xs text-[#92adc9] leading-relaxed bg-[#101922]/50 p-2 rounded border border-[#233648]/50">
            <span className="font-medium text-white block mb-1">主要因:</span>
            {signal.reason}
          </div>
        </div>
      </div>
    </div>
  );
}
