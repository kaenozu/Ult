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

  return (
    <div className="h-52 border-t border-[#233648] bg-[#141e27] flex flex-col shrink-0">
      <div className="flex items-center gap-1 px-2 border-b border-[#233648] bg-[#192633]/50" role="tablist" aria-label="取引情報パネル">
        {[
          { id: 'positions', label: `保有ポジション (${portfolio.positions.length})` },
          { id: 'orders', label: `注文一覧 (${portfolio.orders?.length || 0})` },
          { id: 'history', label: `取引履歴 (${journal.length})` },
        ].map((tab) => (
          <button
            key={tab.id}
            role="tab"
            id={`tab-${tab.id}`}
            aria-selected={activeTab === tab.id}
            aria-controls={`panel-${tab.id}`}
            onClick={() => setActiveTab(tab.id as 'positions' | 'orders' | 'history')}
            className={cn(
              'px-4 py-2 text-xs font-medium transition-colors focus:outline-none focus:bg-[#233648]',
              activeTab === tab.id
                ? 'text-white border-b-2 border-primary bg-[#192633]/50'
                : 'text-[#92adc9] hover:text-white hover:bg-[#192633]/50'
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>
      {activeTab === 'positions' && (
        <div role="tabpanel" id="panel-positions" aria-labelledby="tab-positions" className="flex-1 flex flex-col min-h-0">
          <PositionTable positions={portfolio.positions} onClose={onClosePosition} />
        </div>
      )}
      {activeTab === 'orders' && (
        <div role="tabpanel" id="panel-orders" aria-labelledby="tab-orders" className="flex-1 flex items-center justify-center text-[#92adc9] text-sm italic">
          有効な注文はありません
        </div>
      )}
      {activeTab === 'history' && (
        <div role="tabpanel" id="panel-history" aria-labelledby="tab-history" className="flex-1 flex flex-col min-h-0">
          <HistoryTable entries={journal} />
        </div>
      )}
    </div>
  );
};
