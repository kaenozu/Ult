'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Navigation } from '@/app/components/Navigation';
import { ALL_STOCKS } from '@/app/data/stocks';
import { Stock } from '@/app/types';
import { cn, formatPercent } from '@/app/lib/utils';
import { useWatchlistStore } from '@/app/store/watchlistStore';
import { useUIStore } from '@/app/store/uiStore';
import { marketClient } from '@/app/lib/api/data-aggregator';
import { ErrorBoundary } from '@/app/components/ErrorBoundary';
import { ScreenLabel } from '@/app/components/ScreenLabel';

const SECTORS = [
  '全て',
  'テクノロジー',
  '半導体',
  '半導体装置',
  '自動車',
  '金融',
  '電機',
  '通信',
  '小売',
  '製薬',
  '食品',
  '飲料',
  'エネルギー',
  '卸売',
  '産業機械',
  '電子部品',
  'サービス',
  'エンターテイメント'
];

const SECTOR_COLORS: Record<string, string> = {
  'テクノロジー': 'bg-blue-500',
  '半導体': 'bg-indigo-500',
  '半導体装置': 'bg-cyan-500',
  '自動車': 'bg-emerald-500',
  '金融': 'bg-yellow-500',
  '電機': 'bg-purple-500',
  '通信': 'bg-sky-500',
  '小売': 'bg-orange-500',
  '製薬': 'bg-rose-500',
};

interface HeatmapBlockProps {
  stock: Stock;
  className?: string;
  onClick: (stock: Stock) => void;
}

function HeatmapBlock({ stock, className, onClick }: HeatmapBlockProps) {
  const isPositive = (stock.changePercent || 0) >= 0;
  const intensity = Math.min(Math.abs(stock.changePercent || 0) / 4, 1);

  const bgColor = isPositive
    ? `rgba(34, 197, 94, ${0.1 + intensity * 0.8})`
    : `rgba(239, 68, 68, ${0.1 + intensity * 0.8})`;

  return (
    <div
      className={cn(
        'relative p-2 flex flex-col justify-between cursor-pointer hover:ring-1 hover:ring-white/30 transition-all border border-white/5 rounded-sm',
        className
      )}
      style={{ backgroundColor: bgColor }}
      onClick={() => onClick(stock)}
    >
      <div className="flex justify-between items-start gap-1">
        <span className="font-black text-white text-[9px] leading-none drop-shadow-md">{stock.symbol}</span>
        <span className={cn('text-[9px] font-black leading-none drop-shadow-md', isPositive ? 'text-green-100' : 'text-red-100')}>
          {formatPercent(stock.changePercent || 0)}
        </span>
      </div>
      <div className="mt-1">
        <div className="text-[8px] text-white/90 truncate leading-tight font-medium">{stock.name}</div>
      </div>
    </div>
  );
}

function HeatmapContent() {
  const router = useRouter();
  const { batchUpdateStockData } = useWatchlistStore();
  const { setSelectedStock } = useUIStore();
  const [displayStocks, setDisplayStocks] = useState<Stock[]>(ALL_STOCKS);
  const [selectedSector, setSelectedSector] = useState('全て');
  const [selectedMarket, setSelectedMarket] = useState<'all' | 'japan' | 'usa'>('all');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    const fetchAllQuotes = async () => {
      setLoading(true);
      try {
        const symbols = ALL_STOCKS.map(s => s.symbol);
        const latestQuotes = await marketClient.fetchQuotes(symbols, undefined, controller.signal);

        const updates = latestQuotes.map(q => ({
          symbol: q.symbol,
          data: {
            price: q.price,
            change: q.change,
            changePercent: q.changePercent,
            volume: q.volume
          }
        }));

        // Heatmap only updates display stocks, not watchlist
        // batchUpdateStockData removed to prevent adding all heatmap stocks to watchlist

        const updatedStocks = ALL_STOCKS.map(s => {
          const quote = latestQuotes.find(q => q.symbol === s.symbol);
          return quote ? { ...s, ...quote } : s;
        });
        setDisplayStocks(updatedStocks);
      } catch {
        // Silently handle quote fetch failures
      } finally {
        setLoading(false);
      }
    };

    fetchAllQuotes();
    return () => controller.abort();
  }, [batchUpdateStockData]);

  const handleStockClick = (stock: Stock) => {
    setSelectedStock(stock);
    router.push('/');
  };

  const filteredStocks = displayStocks.filter(s => {
    const marketMatch = selectedMarket === 'all' || s.market === selectedMarket;
    const sectorMatch = selectedSector === '全て' || s.sector === selectedSector;
    return marketMatch && sectorMatch;
  });

  const sectorGroups = filteredStocks.reduce((acc, stock) => {
    const sector = stock.sector || 'その他';
    if (!acc[sector]) acc[sector] = [];
    acc[sector].push(stock);
    return acc;
  }, {} as Record<string, Stock[]>);

  const sortedSectors = Object.entries(sectorGroups).sort((a, b) => {
    const avgA = a[1].reduce((sum, s) => sum + (s.changePercent || 0), 0) / a[1].length;
    const avgB = b[1].reduce((sum, s) => sum + (s.changePercent || 0), 0) / b[1].length;
    return avgB - avgA;
  });

  return (
    <div className="flex flex-col h-screen bg-[#0a0f14] text-white overflow-hidden font-sans">
      <ScreenLabel label="マーケットヒートマップ / Market Heatmap" />
      <header className="flex items-center justify-between border-b border-[#233648] bg-[#101922] px-6 py-2.5 shrink-0 z-20">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2.5">
            <div className="size-7 bg-primary rounded flex items-center justify-center text-white shadow-lg shadow-primary/20">
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                <path d="M3 13h2v8H3v-8zm4-6h2v14H7V7zm4 3h2v11h-2V10zm4-6h2v17h-2V4zm4 4h2v13h-2V8z" />
              </svg>
            </div>
            <h2 className="text-white text-base font-black tracking-tighter">MARKET UNIVERSE</h2>
          </div>
          <div className="h-4 w-px bg-[#233648]" />
          <div className="flex bg-[#192633] rounded p-0.5 border border-[#233648]">
            {(['all', 'japan', 'usa'] as const).map((m) => (
              <button
                key={m}
                onClick={() => setSelectedMarket(m)}
                className={cn(
                  'px-2 py-0.5 rounded text-[9px] font-black uppercase transition-all',
                  selectedMarket === m ? 'bg-primary text-white' : 'text-[#92adc9] hover:text-white'
                )}
              >
                {m === 'all' ? 'Global' : m}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-3">
          {loading && <div className="flex items-center gap-2 animate-pulse"><div className="size-1.5 rounded-full bg-primary"></div><span className="text-[10px] font-bold text-primary">SYNCING...</span></div>}
          <div className="px-2 py-1 bg-emerald-500/10 border border-emerald-500/20 rounded flex items-center gap-1.5">
            <div className="size-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)]"></div>
            <span className="text-[9px] font-black text-emerald-400 tracking-widest uppercase">Live Data</span>
          </div>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        <aside className="w-64 bg-[#111a22] border-r border-[#233648] flex flex-col overflow-y-auto shrink-0 z-10 max-lg:hidden">
          <div className="p-5 flex flex-col gap-6">
            <div className="flex justify-between items-center">
              <h3 className="text-white text-base font-bold">セクター</h3>
              <button
                onClick={() => { setSelectedSector('全て'); setSelectedMarket('all'); }}
                className="text-primary text-xs font-medium hover:underline"
              >
                リセット
              </button>
            </div>
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
            <div className="mt-auto pt-4 border-t border-[#233648]">
              <div className="bg-[#192633] rounded-lg p-3">
                <div className="flex justify-between text-[11px] mb-2">
                  <span className="text-[#92adc9]">表示銘柄数</span>
                  <span className="text-white font-bold">{filteredStocks.length}</span>
                </div>
                <div className="flex justify-between text-[11px] mb-2">
                  <span className="text-green-400">値上がり</span>
                  <span className="text-green-400 font-bold">{filteredStocks.filter(s => (s.changePercent || 0) > 0).length}</span>
                </div>
                <div className="flex justify-between text-[11px]">
                  <span className="text-red-400">値下がり</span>
                  <span className="text-red-400 font-bold">{filteredStocks.filter(s => (s.changePercent || 0) < 0).length}</span>
                </div>
              </div>
            </div>
          </div>
        </aside>

        <main className="flex-1 overflow-y-auto p-2 bg-[#0a0f14] custom-scrollbar">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-2">
            {sortedSectors.map(([sector, stocks]) => (
              <div key={sector} className="flex flex-col gap-1.5 p-1.5 rounded-lg bg-[#111a22]/50 border border-[#233648]/30">
                <div className="flex items-center justify-between px-1">
                  <div className="flex items-center gap-1.5">
                    <div className={cn('w-1 h-3 rounded-full', SECTOR_COLORS[sector] || 'bg-slate-600')} />
                    <span className="text-[9px] font-black text-[#92adc9] uppercase tracking-wider">{sector}</span>
                  </div>
                  <span className={cn(
                    'text-[9px] font-black',
                    stocks.reduce((sum, s) => sum + (s.changePercent || 0), 0) / stocks.length >= 0 ? 'text-green-400' : 'text-red-400'
                  )}>
                    {formatPercent(stocks.reduce((sum, s) => sum + (s.changePercent || 0), 0) / stocks.length)}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-1">
                  {stocks.map((stock) => (
                    <HeatmapBlock key={stock.symbol} stock={stock} onClick={handleStockClick} />
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

export default function Heatmap() {
  return (
    <ErrorBoundary name="HeatmapPage">
      <HeatmapContent />
    </ErrorBoundary>
  );
}