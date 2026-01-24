'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Navigation } from '@/app/components/Navigation';
import { Stock } from '@/app/types';
import { cn, formatPercent } from '@/app/lib/utils';
import { useTradingStore } from '@/app/store/tradingStore';
import { marketClient } from '@/app/lib/api/data-aggregator';

const SECTORS = [
  '全て',
  'テクノロジー',
  '自動車',
  '金融',
  '製薬',
  '小売',
  '半導体',
  '消費財',
  'エネルギー',
  '産業機械',
  '通信',
  'サービス',
  '飲料',
  '食品',
  'エンターテイメント',
  'ソフトウェア'
];

const SECTOR_COLORS: Record<string, string> = {
  'テクノロジー': 'bg-blue-500',
  '自動車': 'bg-green-500',
  '金融': 'bg-yellow-500',
  '製薬': 'bg-red-500',
  '小売': 'bg-purple-500',
  '半導体': 'bg-cyan-500',
  '消費財': 'bg-pink-500',
  'エネルギー': 'bg-orange-500',
};

interface HeatmapBlockProps {
  stock: Stock;
  className?: string;
  onClick: (stock: Stock) => void;
}

function HeatmapBlock({ stock, className, onClick }: HeatmapBlockProps) {
  const isPositive = stock.changePercent >= 0;
  const intensity = Math.min(Math.abs(stock.changePercent) / 5, 1);

  const bgColor = isPositive
    ? `rgba(16, 185, 129, ${0.2 + intensity * 0.6})`
    : `rgba(239, 68, 68, ${0.2 + intensity * 0.6})`;

  return (
    <div
      className={cn(
        'relative p-3 flex flex-col justify-between cursor-pointer hover:opacity-80 transition-opacity border border-white/5',
        className
      )}
      style={{ backgroundColor: bgColor }}
      onClick={() => onClick(stock)}
    >
      <div className="flex justify-between items-start">
        <span className="font-bold text-white text-[10px] leading-none">{stock.symbol}</span>
        <span className={cn('text-[10px] font-black', isPositive ? 'text-green-200' : 'text-red-200')}>
          {formatPercent(stock.changePercent)}
        </span>
      </div>
      <div className="mt-1.5">
        <div className="text-[9px] text-white/70 truncate mb-0.5">{stock.name}</div>
        <div className="text-[11px] font-bold text-white">
          {stock.market === 'japan' ? `¥${Math.round(stock.price).toLocaleString()}` : `$${stock.price.toFixed(2)}`}
        </div>
      </div>
    </div>
  );
}

export default function Heatmap() {
  const router = useRouter();
  const { watchlist, batchUpdateStockData, setSelectedStock } = useTradingStore();
  const [selectedSector, setSelectedSector] = useState('全て');
  const [selectedMarket, setSelectedMarket] = useState<'all' | 'japan' | 'usa'>('all');
  const [loading, setLoading] = useState(false);

  // 初回表示時に最新価格を一括取得
  useEffect(() => {
    const fetchLatestQuotes = async () => {
      if (watchlist.length === 0) return;
      setLoading(true);
      try {
        const symbols = watchlist.map(s => s.symbol);
        const latestQuotes = await marketClient.fetchQuotes(symbols);
        
        const updates = latestQuotes.map(q => ({
          symbol: q.symbol,
          data: {
            price: q.price,
            change: q.change,
            changePercent: q.changePercent,
            volume: q.volume
          }
        }));
        
        batchUpdateStockData(updates);
      } catch (error) {
        console.error('Heatmap sync failed:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchLatestQuotes();
  }, []); // エウント時のみ1回

  const handleStockClick = (stock: Stock) => {
    setSelectedStock(stock);
    router.push('/');
  };

  const filteredStocks = watchlist.filter(s => {
    const marketMatch = selectedMarket === 'all' || s.market === selectedMarket;
    const sectorMatch = selectedSector === '全て' || s.sector === selectedSector;
    return marketMatch && sectorMatch;
  });

  const sectorGroups = filteredStocks.reduce((acc, stock) => {
    const sector = stock.sector || 'その他';
    if (!acc[sector]) {
      acc[sector] = [];
    }
    acc[sector].push(stock);
    return acc;
  }, {} as Record<string, Stock[]>);

  const sortedSectors = Object.entries(sectorGroups).sort((a, b) => {
    const avgA = a[1].reduce((sum, s) => sum + s.changePercent, 0) / a[1].length;
    const avgB = b[1].reduce((sum, s) => sum + s.changePercent, 0) / b[1].length;
    return avgB - avgA;
  });

  return (
    <div className="flex flex-col h-screen bg-[#101922] text-white overflow-hidden">
      {/* Header */}
      <header className="flex items-center justify-between whitespace-nowrap border-b border-[#233648] bg-[#101922] px-6 py-3 shrink-0 z-20">
        <div className="flex items-center gap-8">
          <div className="flex items-center gap-3 text-white">
            <div className="size-8 bg-primary/20 rounded-lg flex items-center justify-center text-primary">
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M3 13h2v8H3v-8zm4-6h2v14H7V7zm4 3h2v11h-2V10zm4-6h2v17h-2V4zm4 4h2v13h-2V8z" />
              </svg>
            </div>
            <h2 className="text-white text-lg font-bold leading-tight tracking-tight">マーケット・ヒートマップ</h2>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {loading && <span className="text-[10px] text-[#92adc9] animate-pulse">同期中...</span>}
          <div className="size-2 rounded-full bg-emerald-500"></div>
          <span className="text-[10px] font-bold text-emerald-400">リアルタイム同期中</span>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar Filters */}
        <aside className="w-64 bg-[#111a22] border-r border-[#233648] flex flex-col overflow-y-auto shrink-0 z-10 max-lg:hidden">
          <div className="p-5 flex flex-col gap-6">
            <div className="flex justify-between items-center">
              <h3 className="text-white text-base font-bold">フィルター</h3>
              <button 
                onClick={() => { setSelectedSector('全て'); setSelectedMarket('all'); }}
                className="text-primary text-xs font-medium hover:underline"
              >
                リセット
              </button>
            </div>

            {/* Market Filter */}
            <div className="flex flex-col gap-2">
              <span className="text-[10px] font-bold text-[#92adc9] uppercase tracking-widest">市場</span>
              <div className="flex h-9 w-full items-center justify-center rounded-lg bg-[#192633] p-1">
                {[
                  { id: 'all', label: 'All' },
                  { id: 'japan', label: 'Japan' },
                  { id: 'usa', label: 'US' },
                ].map((market) => (
                  <button
                    key={market.id}
                    onClick={() => setSelectedMarket(market.id as any)}
                    className={cn(
                      'flex h-full grow items-center justify-center rounded-md px-2 text-xs font-bold transition-all',
                      selectedMarket === market.id ? 'bg-[#111a22] text-white shadow-lg' : 'text-[#92adc9] hover:text-white'
                    )}
                  >
                    {market.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Sector Filter */}
            <div className="flex flex-col gap-2">
              <span className="text-[10px] font-bold text-[#92adc9] uppercase tracking-widest">セクター</span>
              <div className="flex flex-wrap gap-1.5">
                {SECTORS.map((sector) => (
                  <button
                    key={sector}
                    onClick={() => setSelectedSector(sector)}
                    className={cn(
                      'px-2 py-1.5 rounded text-[10px] font-bold transition-all border',
                      selectedSector === sector
                        ? 'bg-primary border-primary text-white'
                        : 'bg-[#192633] border-[#233648] text-[#92adc9] hover:border-[#3b82f6]'
                    )}
                  >
                    {sector}
                  </button>
                ))}
              </div>
            </div>

            <div className="mt-auto pt-4 border-t border-[#233648]">
              <div className="bg-[#192633] rounded-lg p-3">
                <div className="flex justify-between text-[11px] mb-2">
                  <span className="text-[#92adc9]">表示銘柄数</span>
                  <span className="text-white font-bold">{filteredStocks.length}</span>
                </div>
                <div className="flex justify-between text-[11px] mb-2">
                  <span className="text-green-400">値上がり</span>
                  <span className="text-green-400 font-bold">{filteredStocks.filter(s => s.changePercent > 0).length}</span>
                </div>
                <div className="flex justify-between text-[11px]">
                  <span className="text-red-400">値下がり</span>
                  <span className="text-red-400 font-bold">{filteredStocks.filter(s => s.changePercent < 0).length}</span>
                </div>
              </div>
            </div>
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 flex flex-col min-w-0 bg-[#101922] p-4 overflow-y-auto custom-scrollbar">
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4">
            {sortedSectors.map(([sector, stocks]) => (
              <div key={sector} className="bg-[#141e27] border border-[#233648] rounded-xl overflow-hidden flex flex-col shadow-2xl">
                <div className="px-4 py-2 bg-[#192633]/50 flex items-center justify-between border-b border-[#233648]">
                  <div className="flex items-center gap-2">
                    <div className={cn('w-1.5 h-3 rounded-full', SECTOR_COLORS[sector] || 'bg-slate-500')} />
                    <span className="text-[11px] font-black uppercase tracking-wider text-white">{sector}</span>
                  </div>
                  <span className={cn(
                    'text-[10px] font-black',
                    stocks.reduce((sum, s) => sum + s.changePercent, 0) / stocks.length >= 0 ? 'text-green-400' : 'text-red-400'
                  )}>
                    {formatPercent(stocks.reduce((sum, s) => sum + s.changePercent, 0) / stocks.length)}
                  </span>
                </div>
                <div className="p-1 grid grid-cols-2 gap-1">
                  {stocks.map((stock) => (
                    <HeatmapBlock 
                      key={stock.symbol} 
                      stock={stock} 
                      onClick={handleStockClick}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </main>
      </div>

      <Navigation />
    </div>
  );
}
