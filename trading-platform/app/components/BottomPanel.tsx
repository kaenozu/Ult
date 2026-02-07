'use client';

import { useState } from 'react';
import { PositionTable } from '@/app/components/PositionTable';
import { HistoryTable } from '@/app/components/HistoryTable';
import { cn } from '@/app/lib/utils';
import { Portfolio, JournalEntry } from '@/app/types';

interface BottomPanelProps {
  portfolio: Portfolio;
  journal: JournalEntry[];
  onClosePosition: (symbol: string, currentPrice: number) => void;
}

export const BottomPanel = ({ portfolio, journal, onClosePosition }: BottomPanelProps) => {
  const [activeTab, setActiveTab] = useState<'positions' | 'orders' | 'history'>('positions');

  const tabs = [
    { 
      id: 'positions', 
      label: `保有ポジション`,
      count: portfolio.positions.length,
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
        </svg>
      )
    },
    { 
      id: 'orders', 
      label: `注文一覧`,
      count: portfolio.orders?.length || 0,
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
        </svg>
      )
    },
    { 
      id: 'history', 
      label: `取引履歴`,
      count: journal.length,
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      )
    },
  ];

  return (
    <div className={cn(
      "h-56 border-t border-[#233648] bg-[#141e27] flex flex-col shrink-0",
      "animate-slide-in-bottom"
    )}>
      {/* Tab Headers */}
      <div className="flex items-center gap-1 px-3 py-2 border-b border-[#233648] bg-[#192633]/40" role="tablist" aria-label="取引情報パネル">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            role="tab"
            id={`tab-${tab.id}`}
            aria-selected={activeTab === tab.id}
            aria-controls={`panel-${tab.id}`}
            onClick={() => setActiveTab(tab.id as 'positions' | 'orders' | 'history')}
            className={cn(
              'flex items-center gap-2 px-3 py-1.5 text-xs font-medium rounded-t-lg transition-all focus:outline-none focus:ring-2 focus:ring-primary/50',
              'border-b-2 border-transparent',
              activeTab === tab.id
                ? 'text-white bg-[#192633]/60 border-primary'
                : 'text-[#92adc9] hover:text-white hover:bg-[#192633]/30'
            )}
          >
            {tab.icon}
            <span>{tab.label}</span>
            <span className={cn(
              "px-1.5 py-0.5 text-[10px] rounded-full",
              activeTab === tab.id ? 'bg-primary/20 text-primary' : 'bg-[#233648] text-[#92adc9]'
            )}>
              {tab.count}
            </span>
          </button>
        ))}
      </div>
      
      {/* Tab Panels */}
      <div className="flex-1 overflow-hidden">
        {activeTab === 'positions' && (
          <div 
            role="tabpanel" 
            id="panel-positions" 
            aria-labelledby="tab-positions"
            className="h-full flex flex-col animate-fade-in"
          >
            <PositionTable positions={portfolio.positions} onClose={onClosePosition} />
          </div>
        )}
        {activeTab === 'orders' && (
          <div 
            role="tabpanel" 
            id="panel-orders" 
            aria-labelledby="tab-orders"
            className="h-full flex items-center justify-center text-[#92adc9] text-sm animate-fade-in"
          >
            <div className="text-center">
              <svg className="w-12 h-12 mx-auto mb-3 opacity-30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <p>有効な注文はありません</p>
              <p className="text-xs mt-1 opacity-60">新しい注文は右サイドバーから作成できます</p>
            </div>
          </div>
        )}
        {activeTab === 'history' && (
          <div 
            role="tabpanel" 
            id="panel-history" 
            aria-labelledby="tab-history"
            className="h-full flex flex-col animate-fade-in"
          >
            <HistoryTable entries={journal} />
          </div>
        )}
      </div>
    </div>
  );
};
