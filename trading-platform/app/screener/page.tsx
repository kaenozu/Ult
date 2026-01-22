'use client';

import { useState, useMemo, useEffect } from 'react';
import Link from 'next/link';
import { Navigation } from '@/app/components/Navigation';
import { JAPAN_STOCKS, USA_STOCKS, generateMockSignal } from '@/app/data/stocks';
import { Stock, Signal } from '@/app/types';
import { cn, formatCurrency, formatPercent, formatVolume, getChangeColor } from '@/app/lib/utils';

type FilterField = 'price' | 'change' | 'volume' | 'sector' | 'market';
type SortField = 'price' | 'change' | 'changePercent' | 'volume' | 'symbol';
type SortDirection = 'asc' | 'desc';

export default function Screener() {
  const [filters, setFilters] = useState({
    priceMin: '',
    priceMax: '',
    changeMin: '',
    changeMax: '',
    volumeMin: '',
    sector: '',
    market: '',
  });

  const [sortField, setSortField] = useState<SortField>('changePercent');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

  const allStocks = [...JAPAN_STOCKS, ...USA_STOCKS];

  const filteredStocks = useMemo(() => {
    return allStocks.filter(stock => {
      if (filters.priceMin && stock.price < parseFloat(filters.priceMin)) return false;
      if (filters.priceMax && stock.price > parseFloat(filters.priceMax)) return false;
      if (filters.changeMin && stock.changePercent < parseFloat(filters.changeMin)) return false;
      if (filters.changeMax && stock.changePercent > parseFloat(filters.changeMax)) return false;
      if (filters.volumeMin && stock.volume < parseFloat(filters.volumeMin)) return false;
      if (filters.sector && stock.sector !== filters.sector) return false;
      if (filters.market && stock.market !== filters.market) return false;
      return true;
    }).sort((a, b) => {
      let aVal = a[sortField];
      let bVal = b[sortField];

      if (sortField === 'symbol') {
        aVal = a.symbol;
        bVal = b.symbol;
      }

      if (typeof aVal === 'string' && typeof bVal === 'string') {
        return sortDirection === 'asc'
          ? aVal.localeCompare(bVal)
          : bVal.localeCompare(aVal);
      }

      return sortDirection === 'asc'
        ? (aVal as number) - (bVal as number)
        : (bVal as number) - (aVal as number);
    });
  }, [filters, sortField, sortDirection]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  const sectors = [...new Set(allStocks.map(s => s.sector))];

  const [signals, setSignals] = useState<Map<string, Signal>>(new Map());

  useEffect(() => {
    const generateSignals = () => {
      const newSignals = new Map<string, Signal>();
      allStocks.forEach(stock => {
        newSignals.set(stock.symbol, generateMockSignal(stock));
      });
      setSignals(newSignals);
    };
    generateSignals();
  }, [allStocks]);

  const getSignalForStock = (stock: Stock): Signal => {
    return signals.get(stock.symbol) || generateMockSignal(stock);
  };

  return (
    <div className="flex flex-col h-screen bg-[#101922] text-white overflow-hidden">
      {/* Mock Data Banner */}
      <div className="bg-yellow-500/10 border-b border-yellow-500/30 px-4 py-2 flex items-center justify-center gap-2 text-yellow-400 text-xs">
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
        <span className="font-medium">注意:  表示データはモック（模擬データ）です。実際の市場データではありません。</span>
        <span className="text-yellow-500/60">Mock Data Only</span>
      </div>

      {/* Header */}
      <header className="flex items-center justify-between whitespace-nowrap border-b border-solid border-[#233648] bg-[#101922] px-6 py-3 shrink-0 z-20">
        <div className="flex items-center gap-8">
          <div className="flex items-center gap-3 text-white">
            <div className="size-8 bg-primary/20 rounded-lg flex items-center justify-center text-primary">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
              </svg>
            </div>
            <h2 className="text-white text-lg font-bold leading-tight tracking-[-0.015em]">TradePro</h2>
          </div>
        </div>
        <div className="flex flex-1 justify-end gap-6 items-center">
          <nav className="hidden lg:flex items-center gap-6">
            <Link href="/" className="text-[#92adc9] hover:text-white transition-colors text-sm font-medium leading-normal">
              Dashboard
            </Link>
            <Link href="/heatmap" className="text-[#92adc9] hover:text-white transition-colors text-sm font-medium leading-normal">
              Heatmap
            </Link>
            <Link href="/journal" className="text-[#92adc9] hover:text-white transition-colors text-sm font-medium leading-normal">
              Journal
            </Link>
            <span className="text-white text-sm font-medium leading-normal border-b-2 border-primary py-1">
              Screener
            </span>
          </nav>
          <div className="h-6 w-px bg-[#233648] mx-2 hidden lg:block" />
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
        <aside className="w-72 bg-[#111a22] border-r border-[#233648] flex flex-col overflow-y-auto shrink-0 z-10">
          <div className="p-5 flex flex-col gap-6">
            <div className="flex justify-between items-center">
              <h3 className="text-white text-base font-bold">Filters</h3>
              <button
                onClick={() => setFilters({
                  priceMin: '', priceMax: '', changeMin: '', changeMax: '',
                  volumeMin: '', sector: '', market: '',
                })}
                className="text-primary text-xs font-medium hover:text-primary/80"
              >
                Reset All
              </button>
            </div>

            {/* Price Range */}
            <div className="flex flex-col gap-2">
              <span className="text-xs font-semibold text-[#92adc9] uppercase tracking-wider">Price</span>
              <div className="grid grid-cols-2 gap-2">
                <div className="relative">
                  <input
                    type="number"
                    placeholder="Min"
                    value={filters.priceMin}
                    onChange={(e) => setFilters(prev => ({ ...prev, priceMin: e.target.value }))}
                    className="w-full bg-[#192633] border border-[#233648] rounded-lg px-3 py-2 text-xs text-white placeholder-[#92adc9]"
                  />
                </div>
                <div className="relative">
                  <input
                    type="number"
                    placeholder="Max"
                    value={filters.priceMax}
                    onChange={(e) => setFilters(prev => ({ ...prev, priceMax: e.target.value }))}
                    className="w-full bg-[#192633] border border-[#233648] rounded-lg px-3 py-2 text-xs text-white placeholder-[#92adc9]"
                  />
                </div>
              </div>
            </div>

            {/* Change Range */}
            <div className="flex flex-col gap-2">
              <span className="text-xs font-semibold text-[#92adc9] uppercase tracking-wider">% Change</span>
              <div className="grid grid-cols-2 gap-2">
                <div className="relative">
                  <input
                    type="number"
                    placeholder="Min %"
                    value={filters.changeMin}
                    onChange={(e) => setFilters(prev => ({ ...prev, changeMin: e.target.value }))}
                    className="w-full bg-[#192633] border border-[#233648] rounded-lg px-3 py-2 text-xs text-white placeholder-[#92adc9]"
                  />
                </div>
                <div className="relative">
                  <input
                    type="number"
                    placeholder="Max %"
                    value={filters.changeMax}
                    onChange={(e) => setFilters(prev => ({ ...prev, changeMax: e.target.value }))}
                    className="w-full bg-[#192633] border border-[#233648] rounded-lg px-3 py-2 text-xs text-white placeholder-[#92adc9]"
                  />
                </div>
              </div>
            </div>

            {/* Volume */}
            <div className="flex flex-col gap-2">
              <span className="text-xs font-semibold text-[#92adc9] uppercase tracking-wider">Volume</span>
              <input
                type="number"
                placeholder="Min Volume"
                value={filters.volumeMin}
                onChange={(e) => setFilters(prev => ({ ...prev, volumeMin: e.target.value }))}
                className="w-full bg-[#192633] border border-[#233648] rounded-lg px-3 py-2 text-xs text-white placeholder-[#92adc9]"
              />
            </div>

            {/* Sector */}
            <div className="flex flex-col gap-2">
              <span className="text-xs font-semibold text-[#92adc9] uppercase tracking-wider">Sector</span>
              <select
                value={filters.sector}
                onChange={(e) => setFilters(prev => ({ ...prev, sector: e.target.value }))}
                className="w-full bg-[#192633] border border-[#233648] rounded-lg px-3 py-2 text-xs text-white"
              >
                <option value="">All Sectors</option>
                {sectors.map(sector => (
                  <option key={sector} value={sector}>{sector}</option>
                ))}
              </select>
            </div>

            {/* Market */}
            <div className="flex flex-col gap-2">
              <span className="text-xs font-semibold text-[#92adc9] uppercase tracking-wider">Market</span>
              <div className="flex gap-2">
                {[
                  { id: '', label: 'All' },
                  { id: 'japan', label: 'Japan' },
                  { id: 'usa', label: 'US' },
                ].map((market) => (
                  <button
                    key={market.id}
                    onClick={() => setFilters(prev => ({ ...prev, market: market.id }))}
                    className={cn(
                      'flex-1 py-2 rounded-lg text-xs font-medium transition-colors',
                      filters.market === market.id
                        ? 'bg-primary text-white'
                        : 'bg-[#192633] text-[#92adc9] hover:text-white'
                    )}
                  >
                    {market.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="h-px w-full bg-[#233648]" />

            {/* Results Count */}
            <div className="bg-[#192633] rounded-lg p-3">
              <div className="flex justify-between items-center">
                <span className="text-xs text-[#92adc9]">Results</span>
                <span className="text-sm font-medium text-white">{filteredStocks.length}</span>
              </div>
            </div>
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 flex flex-col min-w-0 bg-[#101922]">
          <div className="flex flex-wrap justify-between items-end gap-3 px-6 py-5 border-b border-[#233648]/50">
            <div className="flex min-w-72 flex-col gap-1">
              <h1 className="text-white tracking-tight text-2xl font-bold leading-tight">Stock Screener</h1>
              <div className="flex items-center gap-2 text-[#92adc9] text-sm font-normal">
                <span>Find opportunities</span>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
                <span className="text-white font-medium">{filteredStocks.length} stocks found</span>
              </div>
            </div>
          </div>

          {/* Results Table */}
          <div className="flex-1 overflow-auto">
            <table className="w-full text-left text-xs tabular-nums">
              <thead className="text-[10px] uppercase text-[#92adc9] font-medium sticky top-0 bg-[#141e27] z-10">
                <tr>
                  <th className="px-4 py-3 cursor-pointer hover:text-white" onClick={() => handleSort('symbol')}>
                    <div className="flex items-center gap-1">
                      Symbol
                      {sortField === 'symbol' && (
                        <svg className={`w-3 h-3 ${sortDirection === 'asc' ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                        </svg>
                      )}
                    </div>
                  </th>
                  <th className="px-4 py-3">Name</th>
                  <th className="px-4 py-3">Market</th>
                  <th className="px-4 py-3">Sector</th>
                  <th className="px-4 py-3 cursor-pointer hover:text-white text-right" onClick={() => handleSort('price')}>
                    <div className="flex items-center justify-end gap-1">
                      Price
                      {sortField === 'price' && (
                        <svg className={`w-3 h-3 ${sortDirection === 'asc' ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                        </svg>
                      )}
                    </div>
                  </th>
                  <th className="px-4 py-3 cursor-pointer hover:text-white text-right" onClick={() => handleSort('changePercent')}>
                    <div className="flex items-center justify-end gap-1">
                      % Change
                      {sortField === 'changePercent' && (
                        <svg className={`w-3 h-3 ${sortDirection === 'asc' ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                        </svg>
                      )}
                    </div>
                  </th>
                  <th className="px-4 py-3 cursor-pointer hover:text-white text-right" onClick={() => handleSort('volume')}>
                    <div className="flex items-center justify-end gap-1">
                      Volume
                      {sortField === 'volume' && (
                        <svg className={`w-3 h-3 ${sortDirection === 'asc' ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                        </svg>
                      )}
                    </div>
                  </th>
                  <th className="px-4 py-3 text-center">Signal</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#233648]/50">
                {filteredStocks.map((stock) => {
                  const signal = getSignalForStock(stock);
                  return (
                    <tr key={stock.symbol} className="hover:bg-[#192633] cursor-pointer transition-colors">
                      <td className="px-4 py-3 font-bold text-white">{stock.symbol}</td>
                      <td className="px-4 py-3 text-[#92adc9]">{stock.name}</td>
                      <td className="px-4 py-3">
                        <span className={cn(
                          'text-xs px-2 py-0.5 rounded',
                          stock.market === 'japan'
                            ? 'bg-blue-500/20 text-blue-400'
                            : 'bg-red-500/20 text-red-400'
                        )}>
                          {stock.market === 'japan' ? 'JP' : 'US'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-[#92adc9]">{stock.sector}</td>
                      <td className="px-4 py-3 text-right text-white">
                        {stock.market === 'japan' ? formatCurrency(stock.price, 'JPY') : formatCurrency(stock.price, 'USD')}
                      </td>
                      <td className={cn('px-4 py-3 text-right font-medium', getChangeColor(stock.change))}>
                        {formatPercent(stock.changePercent)}
                      </td>
                      <td className="px-4 py-3 text-right text-[#92adc9]">
                        {formatVolume(stock.volume)}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={cn(
                          'inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium',
                          signal.type === 'BUY' && 'bg-green-500/20 text-green-500',
                          signal.type === 'SELL' && 'bg-red-500/20 text-red-500',
                          signal.type === 'HOLD' && 'bg-gray-500/20 text-gray-400'
                        )}>
                          {signal.type}
                          <span className="text-[10px] opacity-70">{signal.confidence}%</span>
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {filteredStocks.length === 0 && (
              <div className="flex flex-col items-center justify-center py-12 text-[#92adc9]">
                <svg className="w-16 h-16 mb-4 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <p>No stocks match your criteria</p>
                <p className="text-xs mt-2">Try adjusting your filters</p>
              </div>
            )}
          </div>
        </main>
      </div>

      <Navigation />

      {/* Disclaimer */}
      <div className="fixed bottom-0 left-0 right-0 bg-[#192633]/90 border-t border-[#233648] py-2 px-4 text-center text-[10px] text-[#92adc9] z-40">
        投資判断は自己責任で行ってください。本サイトの情報は投資助言ではありません。
      </div>
    </div>
  );
}
