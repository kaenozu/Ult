'use client';

import { useState } from 'react';
import { SignalPanel } from '@/app/components/SignalPanel';
import { OrderPanel } from '@/app/components/OrderPanel';
import { AlertPanel } from '@/app/components/AlertPanel';
import { cn } from '@/app/lib/utils';
import { Stock, Signal, OHLCV } from '@/app/types';

interface RightSidebarProps {
  isOpen: boolean;
  onClose?: () => void;
  displayStock: Stock | null;
  chartSignal: Signal | null;
  ohlcv: OHLCV[];
  loading: boolean;
}

export const RightSidebar = ({
  isOpen,
  onClose,
  displayStock,
  chartSignal,
  ohlcv,
  loading
}: RightSidebarProps) => {
  const [rightPanelMode, setRightPanelMode] = useState<'signal' | 'order' | 'alert'>('signal');    

  return (
    <aside className={cn(
      "w-80 flex flex-col border-l border-[#233648] bg-[#141e27] shrink-0 transition-transform duration-300 ease-in-out z-40",
      "lg:static lg:translate-x-0",
      isOpen ? "fixed inset-y-0 right-0 translate-x-0" : "fixed inset-y-0 right-0 translate-x-full lg:translate-x-0"
    )}>
      <div className="flex border-b border-[#233648] bg-[#192633]">
        <button
          onClick={() => onClose?.()}
          className="lg:hidden px-3 py-2 text-[#92adc9] hover:text-white border-r border-[#233648] transition-colors"
          aria-label="サイドバーを閉じる"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
        <button
          onClick={() => setRightPanelMode('signal')}
          className={cn(
            'flex-1 py-2 text-xs font-bold transition-colors',
            rightPanelMode === 'signal' ? 'text-white border-b-2 border-primary' : 'text-[#92adc9] hover:text-white'
          )}
        >
          分析 & シグナル
        </button>
        <button
          onClick={() => setRightPanelMode('alert')}
          className={cn(
            'flex-1 py-2 text-xs font-bold transition-colors',
            rightPanelMode === 'alert' ? 'text-white border-b-2 border-primary' : 'text-[#92adc9] hover:text-white'
          )}
        >
          アラート
        </button>
        <button
          onClick={() => setRightPanelMode('order')}
          className={cn(
            'flex-1 py-2 text-xs font-bold transition-colors',
            rightPanelMode === 'order' ? 'text-white border-b-2 border-primary' : 'text-[#92adc9] hover:text-white'
          )}
        >
          注文パネル
        </button>
      </div>

      <div className="flex-1 overflow-y-auto">
        {displayStock && (
          rightPanelMode === 'signal' ? (
            <SignalPanel
              stock={displayStock}
              signal={chartSignal}
              ohlcv={ohlcv}
              loading={loading}
            />
          ) : rightPanelMode === 'alert' ? (
            <AlertPanel
              symbol={displayStock.symbol}
              stockPrice={displayStock.price}
            />
          ) : (
            <OrderPanel
              stock={displayStock}
              currentPrice={displayStock.price}
            />
          )
        )}
      </div>
    </aside>
  );
};
