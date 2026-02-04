'use client';

import { useState } from 'react';
import { SignalPanel } from '@/app/components/SignalPanel';
import { OrderPanel } from '@/app/components/OrderPanel';
import { AlertPanel } from '@/app/components/AlertPanel';
import { DataQualityPanel } from '@/app/components/DataQualityPanel';
import { cn } from '@/app/lib/utils';
import { Stock, Signal, OHLCV } from '@/app/types';
import { useResilientWebSocket } from '@/app/hooks/useResilientWebSocket';

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
  const [rightPanelMode, setRightPanelMode] = useState<'signal' | 'order' | 'alert' | 'quality'>('signal');

  // Get WebSocket metrics for DataQualityPanel
  const { status: wsStatus, metrics: wsMetrics } = useResilientWebSocket({
    enabled: true,
  });    

  const panelContent = {
    signal: displayStock ? (
      <SignalPanel
        stock={displayStock}
        signal={chartSignal}
        ohlcv={ohlcv}
        loading={loading}
      />
    ) : null,
    alert: displayStock ? (
      <AlertPanel
        symbol={displayStock.symbol}
        stockPrice={displayStock.price}
      />
    ) : null,
    order: displayStock ? (
      <OrderPanel
        stock={displayStock}
        currentPrice={displayStock.price}
      />
    ) : null,
    quality: (
      <DataQualityPanel
        connectionMetrics={wsMetrics}
        connectionStatus={wsStatus}
        compact={false}
        updateInterval={1000}
      />
    )
  };

  const tabs = [
    { 
      id: 'signal' as const, 
      label: '分析 & シグナル', 
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
      )
    },
    { 
      id: 'alert' as const, 
      label: 'アラート', 
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
        </svg>
      )
    },
    { 
      id: 'order' as const, 
      label: '注文', 
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
        </svg>
      )
    },
    { 
      id: 'quality' as const, 
      label: 'データ品質', 
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      )
    },
  ];

  return (
    <aside className={cn(
      "w-80 flex flex-col border-l border-[#233648] bg-[#141e27] shrink-0 transition-transform duration-300 ease-in-out z-40",
      "lg:static lg:translate-x-0",
      isOpen ? "fixed inset-y-0 right-0 translate-x-0 shadow-2xl" : "fixed inset-y-0 right-0 translate-x-full lg:translate-x-0"
    )}>
      {/* Header with Tabs */}
      <div className="flex border-b border-[#233648] bg-[#192633]">
        <button
          onClick={() => onClose?.()}
          className="lg:hidden px-3 py-2 text-[#92adc9] hover:text-white border-r border-[#233648] transition-colors"
          aria-label="サイドバーを閉じる"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setRightPanelMode(tab.id)}
            className={cn(
              'flex-1 py-2.5 text-xs font-bold transition-all duration-200 flex items-center justify-center gap-1.5',
              rightPanelMode === tab.id
                ? 'text-white border-b-2 border-primary bg-[#192633]/70'
                : 'text-[#92adc9] hover:text-white hover:bg-[#192633]/30'
            )}
            title={tab.icon ? undefined : ''}
          >
            {tab.icon}
            <span className="hidden sm:inline">{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-y-auto bg-[#141e27]">
        {panelContent[rightPanelMode] || (
          <div className="p-6 text-center text-[#92adc9] animate-fade-in">
            <svg className="w-16 h-16 mx-auto mb-4 opacity-30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <p className="text-sm font-medium">銘柄を選択してください</p>
            <p className="text-xs mt-1 opacity-60">左サイドバーから銘柄を選択すると、ここに詳細情報が表示されます</p>
          </div>
        )}
      </div>
    </aside>
  );
};
