'use client';

import { memo } from 'react';
import { Signal } from '@/app/types';
import { cn } from '@/app/lib/utils';

interface SignalHistoryPanelProps {
  signals: Signal[];
  currentSymbol?: string;
}

export const SignalHistoryPanel = memo(function SignalHistoryPanel({ 
  signals, 
  currentSymbol 
}: SignalHistoryPanelProps) {
  const filteredSignals = currentSymbol 
    ? signals.filter(s => s.symbol === currentSymbol).slice(0, 10)
    : signals.slice(0, 10);

  if (filteredSignals.length === 0) {
    return (
      <div className="h-full flex items-center justify-center text-[#92adc9] text-sm">
        <div className="text-center">
          <svg className="w-8 h-8 mx-auto mb-2 opacity-30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
          </svg>
          <p>シグナル履歴がありません</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full overflow-auto">
      <div className="flex items-center gap-2 px-3 py-2 border-b border-[#233648] bg-[#192633]/40">
        <svg className="w-4 h-4 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
        </svg>
        <span className="text-xs font-medium text-white">シグナル履歴</span>
        <span className="text-[10px] text-[#92adc9] ml-auto">{filteredSignals.length}件</span>
      </div>
      
      <div className="p-2 space-y-1">
        {filteredSignals.map((signal, index) => (
          <div 
            key={`${signal.symbol}-${signal.generatedAt || index}`}
            className="flex items-center gap-2 px-2 py-1.5 rounded bg-[#1a2633]/50 hover:bg-[#1a2633] transition-colors"
          >
            <div className={cn(
              "w-2 h-2 rounded-full shrink-0",
              signal.type === 'BUY' && "bg-green-500",
              signal.type === 'SELL' && "bg-red-500",
              signal.type === 'HOLD' && "bg-yellow-500"
            )} />
            
            <span className="text-xs font-medium text-white">{signal.symbol}</span>
            
            <span className={cn(
              "text-[10px] font-bold px-1 py-0.5 rounded",
              signal.type === 'BUY' && "bg-green-500/20 text-green-400",
              signal.type === 'SELL' && "bg-red-500/20 text-red-400",
              signal.type === 'HOLD' && "bg-yellow-500/20 text-yellow-400"
            )}>
              {signal.type}
            </span>
            
            <div className="flex items-center gap-1 ml-auto">
              <span className="text-[10px] text-[#92adc9]">
                信頼度 {Math.round(signal.confidence * 100)}%
              </span>
            </div>
            
            {signal.result && (
              <span className={cn(
                "text-[10px] px-1 py-0.5 rounded",
                signal.result === 'HIT' && "bg-green-500/20 text-green-400",
                signal.result === 'MISS' && "bg-red-500/20 text-red-400",
                signal.result === 'PENDING' && "bg-gray-500/20 text-gray-400"
              )}>
                {signal.result === 'HIT' ? '的中' : signal.result === 'MISS' ? '不的中' : '待機中'}
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
});
