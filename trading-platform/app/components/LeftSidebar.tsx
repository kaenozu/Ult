'use client';

import { memo } from 'react';
import { StockTable } from '@/app/components/StockTable';
import { cn } from '@/app/lib/utils';
import { Stock } from '@/app/types';
import { useWatchlistStore } from '@/app/store/watchlistStore';

interface LeftSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  watchlist: Stock[]; // Kept for prop compatibility, but StockTable uses store now
  onSelect: (stock: Stock) => void;
  selectedSymbol?: string;
}

export const LeftSidebar = memo(function LeftSidebar({
  isOpen,
  onClose,
  watchlist,
  onSelect,
  selectedSymbol
}: LeftSidebarProps) {
  // We can use the store directly or props. StockTable uses store internally now too.
  // But LeftSidebar receives watchlist as prop in page.tsx likely.
  // Let's stick to props if they are passed, but StockTable inside uses store actions.

  const { clearWatchlist } = useWatchlistStore();

  const handleClearWatchlist = () => {
    if (window.confirm('ウォッチリストの全銘柄を削除しますか？この操作は元に戻せません。')) {
      clearWatchlist();
    }
  };

  return (
    <aside className={cn(
      "w-80 min-w-[300px] flex flex-col border-r border-[#233648] bg-[#141e27] shrink-0 transition-transform duration-300 ease-in-out z-40",
      "lg:static lg:translate-x-0",
      isOpen ? "fixed inset-y-0 left-0 translate-x-0" : "fixed inset-y-0 left-0 -translate-x-full lg:translate-x-0"
    )}>
      <div className="flex items-center justify-between px-4 py-3 border-b border-[#233648] bg-[#192633]/50">
        <span className="text-xs font-bold text-[#92adc9] uppercase tracking-wider whitespace-nowrap">ウォッチリスト</span>
        <div className="flex gap-1">
          <button
            onClick={onClose}
            className="lg:hidden p-1 text-[#92adc9] hover:text-white mr-2"
            aria-label="サイドバーを閉じる"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
          <button
            className="p-1 hover:bg-[#233648] rounded text-[#92adc9] transition-colors"
            aria-label="新しい銘柄を追加"
            title="新しい銘柄を追加"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
          </button>
          <button
            onClick={handleClearWatchlist}
            className="p-1 hover:bg-red-900/50 rounded text-[#92adc9] hover:text-red-400 transition-colors"
            aria-label="ウォッチリストをクリア"
            title="ウォッチリストをクリア"
            disabled={watchlist.length === 0}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
          <button
            className="p-1 hover:bg-[#233648] rounded text-[#92adc9] transition-colors"
            aria-label="オプションメニュー"
            title="オプションメニュー"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h.01M12 12h.01M19 12h.01M6 12a1 1 0 11-2 0 1 1 0 012 0zm7 0a1 1 0 11-2 0 1 1 0 012 0zm7 0a1 1 0 11-2 0 1 1 0 012 0z" />
            </svg>
          </button>
        </div>
      </div>
      <StockTable
        stocks={watchlist}
        onSelect={onSelect}
        selectedSymbol={selectedSymbol}
      />
    </aside>
  );
});
