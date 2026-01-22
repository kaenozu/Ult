'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Navigation } from '@/app/components/Navigation';
import { JAPAN_STOCKS, USA_STOCKS } from '@/app/data/stocks';
import { Stock } from '@/app/types';
import { cn, formatPercent } from '@/app/lib/utils';
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
}

function HeatmapBlock({ stock, className }: HeatmapBlockProps) {
  const isPositive = stock.changePercent >= 0;
  const intensity = Math.min(Math.abs(stock.changePercent) / 5, 1);

  const bgColor = isPositive
    ? `rgba(16, 185, 129, ${0.2 + intensity * 0.6})`
    : `rgba(239, 68, 68, ${0.2 + intensity * 0.6})`;

  return (
    <div
      className={cn(
        'relative p-3 flex flex-col justify-between cursor-pointer hover:opacity-80 transition-opacity',
        className
      )}
      style={{ backgroundColor: bgColor }}
    >
      <div className="flex justify-between items-start">
        <span className="font-bold text-white text-sm">{stock.symbol}</span>
        <span className={cn('text-xs font-medium', isPositive ? 'text-green-200' : 'text-red-200')}>
          {formatPercent(stock.changePercent)}
        </span>
      </div>
      <div className="mt-2">
        <div className="text-[10px] text-white/80 truncate">{stock.name}</div>
        <div className="text-sm font-bold text-white">
          {stock.market === 'japan' ? `¥${stock.price.toLocaleString()}` : `$${stock.price.toFixed(2)}`}
        </div>
      </div>
    </div>
  );
}

export default function Heatmap() {
  const [selectedSector, setSelectedSector] = useState('全て');
  const [selectedMarket, setSelectedMarket] = useState<'all' | 'japan' | 'usa'>('all');
  const [stocks, setStocks] = useState<Stock[]>([...JAPAN_STOCKS, ...USA_STOCKS]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAllData = async () => {
      setLoading(true);
      const symbols = [...JAPAN_STOCKS, ...USA_STOCKS].map(s => s.symbol);
      const quotes = await marketClient.fetchQuotes(symbols);
      
      if (quotes.length > 0) {
        setStocks(prev => prev.map(s => {
          const q = quotes.find(q => q.symbol === s.symbol);
          if (q) {
            return {
              ...s,
              price: q.price,
              change: q.change,
              changePercent: q.changePercent * 100,
              volume: q.volume,
            };
          }
          return s;
        }));
      }
      setLoading(false);
    };
    fetchAllData();
  }, []);

  const allStocks = selectedMarket === 'all'
    ? stocks
    : selectedMarket === 'japan'
      ? stocks.filter(s => s.market === 'japan')
      : stocks.filter(s => s.market === 'usa');

  const filteredStocks = selectedSector === '全て'
    ? allStocks
    : allStocks.filter(s => s.sector === selectedSector);

  const sectorGroups = filteredStocks.reduce((acc, stock) => {
    if (!acc[stock.sector]) {
      acc[stock.sector] = [];
    }
    acc[stock.sector].push(stock);
    return acc;
  }, {} as Record<string, Stock[]>);

  const sortedSectors = Object.entries(sectorGroups).sort((a, b) => {
    const avgA = a[1].reduce((sum, s) => sum + s.changePercent, 0) / a[1].length;
    const avgB = b[1].reduce((sum, s) => sum + s.changePercent, 0) / b[1].length;
    return avgB - avgA;
  });

  return (
    <div className="flex flex-col h-screen bg-[#101922] text-white overflow-hidden">
      {/* Real-time Status Banner */}
      <div className="bg-emerald-500/10 border-b border-emerald-500/30 px-4 py-2 flex items-center justify-center gap-2 text-emerald-400 text-xs">
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
        </span>
        <span className="font-medium">Market Live: リアルタイムデータ同期中</span>
        <span className="text-emerald-500/60 ml-2">Connected to Yahoo Finance</span>
      </div>

      {/* Header */}
      <header className="flex items-center justify-between whitespace-nowrap border-b border-solid border-[#233648] bg-[#101922] px-6 py-3 shrink-0 z-20">
        <div className="flex items-center gap-8">
          <div className="flex items-center gap-3 text-white">
            <div className="size-8 bg-primary/20 rounded-lg flex items-center justify-center text-primary">
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M3 13h2v8H3v-8zm4-6h2v14H7V7zm4 3h2v11h-2V10zm4-6h2v17h-2V4zm4 4h2v13h-2V8z" />
              </svg>
            </div>
            <h2 className="text-white text-lg font-bold leading-tight tracking-tight">ヒートマップ</h2>
          </div>
        </div>
        <div className="flex flex-1 justify-end gap-6 items-center">
          <div className="flex items-center gap-3 pl-2">
            <div className="hidden xl:flex flex-col">
              <span className="text-xs font-bold text-white leading-none mb-1">K. Tanaka</span>
              <span className="text-[10px] font-medium text-emerald-400 leading-none">● Market Open</span>
            </div>
          </div>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar Filters */}
        <aside className="w-64 bg-[#111a22] border-r border-[#233648] flex flex-col overflow-y-auto shrink-0 z-10 max-lg:hidden">
          <div className="p-5 flex flex-col gap-6">
            <div className="flex justify-between items-center">
              <h3 className="text-white text-base font-bold">Filters</h3>
              <button className="text-primary text-xs font-medium hover:text-primary/80">
                Reset All
              </button>
            </div>

            {/* Market Filter */}
            <div className="flex flex-col gap-2">
              <span className="text-xs font-semibold text-[#92adc9] uppercase tracking-wider">Market</span>
              <div className="flex h-9 w-full items-center justify-center rounded-lg bg-[#192633] p-1">
                {[
                  { id: 'all', label: 'All' },
                  { id: 'japan', label: 'Japan' },
                  { id: 'usa', label: 'US' },
                ].map((market) => (
                  <button
                    key={market.id}
                    onClick={() => setSelectedMarket(market.id as 'all' | 'japan' | 'usa')}
                    className={cn(
                      'flex h-full grow items-center justify-center overflow-hidden rounded-md px-2 text-xs font-medium transition-all',
                      selectedMarket === market.id
                        ? 'bg-[#111a22] shadow-sm text-white'
                        : 'text-[#92adc9] hover:text-white'
                    )}
                  >
                    {market.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Sector Filter */}
            <div className="flex flex-col gap-2">
              <span className="text-xs font-semibold text-[#92adc9] uppercase tracking-wider">Sector</span>
              <div className="flex flex-wrap gap-2">
                {SECTORS.map((sector) => (
                  <button
                    key={sector}
                    onClick={() => setSelectedSector(sector)}
                    className={cn(
                      'h-8 flex items-center justify-center rounded-lg text-xs font-bold transition-all hover:opacity-80 cursor-pointer px-3',
                      selectedSector === sector
                        ? 'bg-primary text-white'
                        : 'bg-[#192633] text-[#92adc9]'
                    )}
                  >
                    {sector}
                  </button>
                ))}
              </div>
            </div>

            <div className="h-px w-full bg-[#233648]" />

            {/* Summary Stats */}
            <div className="flex flex-col gap-3">
              <span className="text-xs font-semibold text-[#92adc9] uppercase">Summary</span>
              <div className="bg-[#192633] rounded-lg p-3">
                <div className="flex justify-between text-sm">
                  <span className="text-[#92adc9]">Total Stocks</span>
                  <span className="text-white font-medium">{filteredStocks.length}</span>
                </div>
                <div className="flex justify-between text-sm mt-2">
                  <span className="text-[#92adc9]">Gainers</span>
                  <span className="text-green-500 font-medium">
                    {filteredStocks.filter(s => s.changePercent > 0).length}
                  </span>
                </div>
                <div className="flex justify-between text-sm mt-2">
                  <span className="text-[#92adc9]">Losers</span>
                  <span className="text-red-500 font-medium">
                    {filteredStocks.filter(s => s.changePercent < 0).length}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 flex flex-col min-w-0 bg-[#101922]">
          <div className="flex flex-wrap justify-between items-end gap-3 px-6 py-5 border-b border-[#233648]/50">
            <div className="flex min-w-72 flex-col gap-1">
              <h1 className="text-white tracking-tight text-2xl font-bold leading-tight">Market Heatmap</h1>
              <div className="flex items-center gap-2 text-[#92adc9] text-sm font-normal">
                <span>{selectedMarket === 'all' ? 'Global' : selectedMarket === 'japan' ? 'Japan' : 'US'}</span>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
                <span className="text-white font-medium">
                  {selectedSector === '全て' ? 'All Sectors' : selectedSector}
                </span>
              </div>
            </div>
            <div className="flex gap-3">
              <div className="hidden sm:flex items-center gap-2 px-3 h-8 bg-[#192633] rounded-lg text-[#92adc9] text-xs">
                <span className="size-2 rounded-full bg-emerald-500 animate-pulse"></span>
                Live Updates
              </div>
            </div>
          </div>

          {/* Heatmap Grid */}
          <div className="flex-1 p-4 overflow-auto">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-1">
              {sortedSectors.map(([sector, stocks]) => (
                <div key={sector} className="flex flex-col gap-1">
                  <div className="flex items-center gap-2 px-2 py-1">
                    <div className={cn('w-2 h-2 rounded-full', SECTOR_COLORS[sector] || 'bg-gray-500')} />
                    <span className="text-xs font-medium text-[#92adc9]">{sector}</span>
                    <span className={cn(
                      'text-xs font-medium ml-auto',
                      stocks.reduce((sum, s) => sum + s.changePercent, 0) / stocks.length >= 0
                        ? 'text-green-500'
                        : 'text-red-500'
                    )}>
                      {formatPercent(stocks.reduce((sum, s) => sum + s.changePercent, 0) / stocks.length)}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-1">
                    {stocks.map((stock) => (
                      <HeatmapBlock key={stock.symbol} stock={stock} />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </main>
      </div>

      <Navigation />

      {/* Disclaimer */}
      <div className="bg-[#192633]/90 border-t border-[#233648] py-1.5 px-4 text-center text-[10px] text-[#92adc9] shrink-0">
        投資判断は自己責任で行ってください。本サイトの情報は投資助言ではありません。
      </div>
    </div>
  );
}
