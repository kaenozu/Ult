'use client';

import { useState, useMemo, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Navigation } from '@/app/components/Navigation';
import { JAPAN_STOCKS, USA_STOCKS, fetchOHLCV } from '@/app/data/stocks';
import { Stock } from '@/app/types';
import { cn, formatCurrency, formatPercent, formatVolume, getChangeColor } from '@/app/lib/utils';
import { marketClient } from '@/app/lib/api/data-aggregator';
import { filterByTechnicals, TechFilters } from '@/app/lib/screener-utils';
import { useTradingStore } from '@/app/store/tradingStore';

type SortField = 'price' | 'change' | 'changePercent' | 'volume' | 'symbol';
type SortDirection = 'asc' | 'desc';

export default function Screener() {
  const router = useRouter();
  const { setSelectedStock } = useTradingStore();
  const [filters, setFilters] = useState({
    priceMin: '',
    priceMax: '',
    changeMin: '',
    changeMax: '',
    volumeMin: '',
    sector: '',
    market: '',
  });

  const [techFilters, setTechFilters] = useState<TechFilters>({
    rsiMax: '',
    rsiMin: '',
    trend: 'all',
  });

  const [sortField, setSortField] = useState<SortField>('changePercent');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [stocks, setStocks] = useState<Stock[]>([...JAPAN_STOCKS, ...USA_STOCKS]);
  const [analyzing, setAnalyzing] = useState(false);
  const [analyzedStocks, setAnalyzedStocks] = useState<string[]>([]);
  const [isTechAnalysisDone, setIsTechAnalysisDone] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  useEffect(() => {
    let mounted = true;
    const fetchAllData = async () => {
      // Use constants directly to avoid dependency on 'stocks' state
      const allStocks = [...JAPAN_STOCKS, ...USA_STOCKS];
      const symbols = allStocks.map(s => s.symbol);
      const quotes = await marketClient.fetchQuotes(symbols);
      
      if (mounted && quotes.length > 0) {
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
    };
    fetchAllData();
    return () => { mounted = false; };
  }, []);

  const handleTechScreening = async () => {
    console.log('Starting screening...', techFilters);
    setIsTechAnalysisDone(false);
    setAnalyzedStocks([]);
    setAnalyzing(true);
    
    // Add artificial delay to ensure UI updates and user perceives the action
    await new Promise(resolve => setTimeout(resolve, 500));
    
    const candidates = stocks.filter(stock => {
      if (filters.priceMin && stock.price < parseFloat(filters.priceMin)) return false;
      if (filters.priceMax && stock.price > parseFloat(filters.priceMax)) return false;
      return true;
    });

    const passedSymbols: string[] = [];

    // Limit concurrency to avoid overloading the browser/API
    const CHUNK_SIZE = 3;
    for (let i = 0; i < candidates.length; i += CHUNK_SIZE) {
        const chunk = candidates.slice(i, i + CHUNK_SIZE);
        await Promise.all(chunk.map(async (stock) => {
            try {
                const ohlcv = await fetchOHLCV(stock.symbol, stock.market, stock.price);
                if (filterByTechnicals(stock, ohlcv, techFilters)) {
                    passedSymbols.push(stock.symbol);
                }
            } catch (e) {
                console.error(`Failed to analyze ${stock.symbol}`, e);
            }
        }));
    }

    setAnalyzedStocks(passedSymbols);
    setIsTechAnalysisDone(true);
    setAnalyzing(false);
  };

  const filteredStocks = useMemo(() => {
    return stocks.filter(stock => {
      if (filters.priceMin && stock.price < parseFloat(filters.priceMin)) return false;
      if (filters.priceMax && stock.price > parseFloat(filters.priceMax)) return false;
      if (filters.changeMin && stock.changePercent < parseFloat(filters.changeMin)) return false;
      if (filters.changeMax && stock.changePercent > parseFloat(filters.changeMax)) return false;
      if (filters.volumeMin && stock.volume < parseFloat(filters.volumeMin)) return false;
      if (filters.sector && stock.sector !== filters.sector) return false;
      if (filters.market && stock.market !== filters.market) return false;
      
      const hasTechFilter = techFilters.rsiMax || techFilters.rsiMin || techFilters.trend !== 'all';
      if (hasTechFilter && isTechAnalysisDone) {
         if (!analyzedStocks.includes(stock.symbol)) return false;
      }
      
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
  }, [filters, sortField, sortDirection, stocks, analyzedStocks, isTechAnalysisDone, techFilters]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  const handleStockClick = (stock: Stock) => {
    setSelectedStock(stock);
    router.push('/');
  };

  const applyPreset = (type: 'oversold' | 'uptrend' | 'dip') => {
    // Reset basic filters
    setFilters({
      priceMin: '', priceMax: '', changeMin: '', changeMax: '',
      volumeMin: '', sector: '', market: '',
    });
    
    // Set technical filters
    if (type === 'oversold') {
      setTechFilters({ rsiMax: '30', rsiMin: '', trend: 'all' });
    } else if (type === 'uptrend') {
      setTechFilters({ rsiMax: '', rsiMin: '', trend: 'uptrend' });
    } else if (type === 'dip') {
      setTechFilters({ rsiMax: '40', rsiMin: '', trend: 'uptrend' });
    }
    setIsTechAnalysisDone(false);
  };

  const sectors = [...new Set(stocks.map(s => s.sector))];

  return (
    <div className="flex flex-col h-screen bg-[#101922] text-white overflow-hidden">
      <header className="flex items-center justify-between whitespace-nowrap border-b border-solid border-[#233648] bg-[#101922] px-6 py-3 shrink-0 z-20">
        <div className="flex items-center gap-4">
          <button
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className="lg:hidden p-2 text-[#92adc9] hover:text-white transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          <div className="flex items-center gap-3 text-white">
            <div className="size-8 bg-primary/20 rounded-lg flex items-center justify-center text-primary">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
              </svg>
            </div>
            <h2 className="text-white text-lg font-bold leading-tight tracking-tight">株式スクリーナー</h2>
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

      <div className="flex flex-1 overflow-hidden relative">
        {/* Mobile Backdrop */}
        {isSidebarOpen && (
          <div 
            className="fixed inset-0 bg-black/50 z-30 lg:hidden"
            onClick={() => setIsSidebarOpen(false)}
          />
        )}

        {/* Sidebar Filters */}
        <aside className={cn(
          "w-72 bg-[#111a22] border-r border-[#233648] flex flex-col overflow-y-auto shrink-0 transition-transform duration-300 ease-in-out",
          "lg:static lg:translate-x-0 z-40", // Desktop: static, always visible
          isSidebarOpen ? "fixed inset-y-0 left-0 translate-x-0" : "fixed inset-y-0 left-0 -translate-x-full lg:translate-x-0" // Mobile: toggle
        )}>
          <div className="p-5 flex flex-col gap-6">
            <div className="flex justify-between items-center">
              <h3 className="text-white text-base font-bold">フィルター</h3>
              <button
                onClick={() => setIsSidebarOpen(false)}
                className="lg:hidden p-1 text-[#92adc9] hover:text-white"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
              <button
                onClick={() => {
                  setFilters({
                    priceMin: '', priceMax: '', changeMin: '', changeMax: '',
                    volumeMin: '', sector: '', market: '',
                  });
                  setTechFilters({ rsiMax: '', rsiMin: '', trend: 'all' });
                  setIsTechAnalysisDone(false);
                }}
                className="text-primary text-xs font-medium hover:text-primary/80 hidden lg:block"
              >
                リセット
              </button>
            </div>
            
            {/* Mobile Reset Button (visible only on mobile) */}
            <button
                onClick={() => {
                  setFilters({
                    priceMin: '', priceMax: '', changeMin: '', changeMax: '',
                    volumeMin: '', sector: '', market: '',
                  });
                  setTechFilters({ rsiMax: '', rsiMin: '', trend: 'all' });
                  setIsTechAnalysisDone(false);
                }}
                className="text-primary text-xs font-medium hover:text-primary/80 lg:hidden text-left"
              >
                条件をリセット
            </button>

            {/* Quick Presets */}
            <div className="flex flex-col gap-2">
              <span className="text-xs font-semibold text-[#92adc9] uppercase tracking-wider">クイック検索</span>
              <div className="grid grid-cols-1 gap-2">
                <button 
                  onClick={() => applyPreset('oversold')}
                  className="bg-[#192633] hover:bg-[#233648] border border-green-500/30 text-green-400 text-xs py-2 px-3 rounded-lg text-left transition-colors flex items-center gap-2"
                >
                  <span className="text-lg">🔥</span> 売られすぎ (RSI &lt; 30)
                </button>
                <button 
                  onClick={() => applyPreset('uptrend')}
                  className="bg-[#192633] hover:bg-[#233648] border border-blue-500/30 text-blue-400 text-xs py-2 px-3 rounded-lg text-left transition-colors flex items-center gap-2"
                >
                  <span className="text-lg">🚀</span> 上昇トレンド
                </button>
                <button 
                  onClick={() => applyPreset('dip')}
                  className="bg-[#192633] hover:bg-[#233648] border border-yellow-500/30 text-yellow-400 text-xs py-2 px-3 rounded-lg text-left transition-colors flex items-center gap-2"
                >
                  <span className="text-lg">📉</span> 押し目買い (トレンド + RSI低)
                </button>
              </div>
            </div>

            <div className="h-px w-full bg-[#233648]" />

            {/* Price Range */}
            <div className="flex flex-col gap-2">
              <span className="text-xs font-semibold text-[#92adc9] uppercase tracking-wider">価格</span>
              <div className="grid grid-cols-2 gap-2">
                <div className="relative">
                  <input
                    type="number"
                    placeholder="最小"
                    value={filters.priceMin}
                    onChange={(e) => setFilters(prev => ({ ...prev, priceMin: e.target.value }))}
                    className="w-full bg-[#192633] border border-[#233648] rounded-lg px-3 py-2 text-xs text-white placeholder-[#92adc9]"
                  />
                </div>
                <div className="relative">
                  <input
                    type="number"
                    placeholder="最大"
                    value={filters.priceMax}
                    onChange={(e) => setFilters(prev => ({ ...prev, priceMax: e.target.value }))}
                    className="w-full bg-[#192633] border border-[#233648] rounded-lg px-3 py-2 text-xs text-white placeholder-[#92adc9]"
                  />
                </div>
              </div>
            </div>

            {/* Change Range */}
            <div className="flex flex-col gap-2">
              <span className="text-xs font-semibold text-[#92adc9] uppercase tracking-wider">騰落率 (%)</span>
              <div className="grid grid-cols-2 gap-2">
                <div className="relative">
                  <input
                    type="number"
                    placeholder="最小 %"
                    value={filters.changeMin}
                    onChange={(e) => setFilters(prev => ({ ...prev, changeMin: e.target.value }))}
                    className="w-full bg-[#192633] border border-[#233648] rounded-lg px-3 py-2 text-xs text-white placeholder-[#92adc9]"
                  />
                </div>
                <div className="relative">
                  <input
                    type="number"
                    placeholder="最大 %"
                    value={filters.changeMax}
                    onChange={(e) => setFilters(prev => ({ ...prev, changeMax: e.target.value }))}
                    className="w-full bg-[#192633] border border-[#233648] rounded-lg px-3 py-2 text-xs text-white placeholder-[#92adc9]"
                  />
                </div>
              </div>
            </div>

            {/* Volume */}
            <div className="flex flex-col gap-2">
              <span className="text-xs font-semibold text-[#92adc9] uppercase tracking-wider">出来高</span>
              <input
                type="number"
                placeholder="最小出来高"
                value={filters.volumeMin}
                onChange={(e) => setFilters(prev => ({ ...prev, volumeMin: e.target.value }))}
                className="w-full bg-[#192633] border border-[#233648] rounded-lg px-3 py-2 text-xs text-white placeholder-[#92adc9]"
              />
            </div>

            {/* Sector */}
            <div className="flex flex-col gap-2">
              <span className="text-xs font-semibold text-[#92adc9] uppercase tracking-wider">セクター</span>
              <select
                value={filters.sector}
                onChange={(e) => setFilters(prev => ({ ...prev, sector: e.target.value }))}
                className="w-full bg-[#192633] border border-[#233648] rounded-lg px-3 py-2 text-xs text-white"
              >
                <option value="">すべて</option>
                {sectors.map(sector => (
                  <option key={sector} value={sector}>{sector}</option>
                ))}
              </select>
            </div>

            {/* Market */}
            <div className="flex flex-col gap-2">
              <span className="text-xs font-semibold text-[#92adc9] uppercase tracking-wider">市場</span>
              <div className="flex gap-2">
                {[
                  { id: '', label: '全て' },
                  { id: 'japan', label: '日本' },
                  { id: 'usa', label: '米国' },
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

            {/* Technical Indicators */}
            <div className="flex flex-col gap-3">
              <span className="text-xs font-semibold text-[#92adc9] uppercase tracking-wider">テクニカル指標</span>
              
              {/* RSI */}
              <div className="flex flex-col gap-2">
                <span className="text-[10px] text-[#92adc9]">RSI (14)</span>
                <div className="grid grid-cols-2 gap-2">
                  <div className="relative">
                    <input
                      type="number"
                      placeholder="最小"
                      value={techFilters.rsiMin}
                      onChange={(e) => {
                        setTechFilters(prev => ({ ...prev, rsiMin: e.target.value }));
                        setIsTechAnalysisDone(false); // Reset analysis state on filter change
                      }}
                      className="w-full bg-[#192633] border border-[#233648] rounded-lg px-3 py-2 text-xs text-white placeholder-[#92adc9]"
                    />
                  </div>
                  <div className="relative">
                    <input
                      type="number"
                      placeholder="最大"
                      value={techFilters.rsiMax}
                      onChange={(e) => {
                        setTechFilters(prev => ({ ...prev, rsiMax: e.target.value }));
                        setIsTechAnalysisDone(false);
                      }}
                      className="w-full bg-[#192633] border border-[#233648] rounded-lg px-3 py-2 text-xs text-white placeholder-[#92adc9]"
                    />
                  </div>
                </div>
              </div>

              {/* Trend */}
              <div className="flex flex-col gap-2">
                <span className="text-[10px] text-[#92adc9]">トレンド (SMA50)</span>
                <select
                  value={techFilters.trend}
                  onChange={(e) => {
                    setTechFilters(prev => ({ ...prev, trend: e.target.value }));
                    setIsTechAnalysisDone(false);
                  }}
                  className="w-full bg-[#192633] border border-[#233648] rounded-lg px-3 py-2 text-xs text-white"
                >
                  <option value="all">指定なし</option>
                  <option value="uptrend">上昇 (価格 &gt; SMA50)</option>
                  <option value="downtrend">下降 (価格 &lt; SMA50)</option>
                </select>
              </div>

              <button
                onClick={handleTechScreening}
                disabled={analyzing}
                className={cn(
                  "w-full py-2 rounded-lg text-xs font-bold transition-all mt-2 flex items-center justify-center gap-2",
                  analyzing 
                    ? "bg-[#233648] text-[#92adc9] cursor-wait" 
                    : isTechAnalysisDone
                      ? "bg-emerald-600 text-white hover:bg-emerald-500 shadow-lg"
                      : "bg-primary text-white hover:bg-primary/80 shadow-lg shadow-primary/20"
                )}
              >
                {analyzing ? (
                  <>
                    <div className="h-3 w-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    分析中...
                  </>
                ) : isTechAnalysisDone ? (
                  <>
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    再分析を実行
                  </>
                ) : (
                  <>
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                    詳細分析を実行
                  </>
                )}
              </button>
            </div>

            <div className="h-px w-full bg-[#233648]" />

            {/* Results Count */}
            <div className="bg-[#192633] rounded-lg p-3">
              <div className="flex justify-between items-center">
                <span className="text-xs text-[#92adc9]">該当件数</span>
                <span className="text-sm font-medium text-white">{filteredStocks.length}</span>
              </div>
            </div>
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 flex flex-col min-w-0 bg-[#101922]">
          <div className="flex flex-col gap-4 px-6 py-5 border-b border-[#233648]/50">
            <div className="flex flex-wrap justify-between items-end gap-3">
              <div className="flex min-w-72 flex-col gap-1">
                <h1 className="text-white tracking-tight text-2xl font-bold leading-tight">株式スクリーナー</h1>
                <div className="flex items-center gap-2 text-[#92adc9] text-sm font-normal">
                  <span>投資機会を見つける</span>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                  <span className="text-white font-medium">{filteredStocks.length} 銘柄が見つかりました</span>
                </div>
              </div>
            </div>
            
            {/* Usage Guide */}
            <div className="bg-[#192633]/50 border border-[#233648] rounded-lg p-3 text-xs text-[#92adc9]">
              <div className="font-bold text-white mb-1 flex items-center gap-2">
                <svg className="w-4 h-4 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                使い方ガイド
              </div>
              <p>
                左側のフィルターを使って条件を設定してください。「価格」や「市場」などの基本条件で絞り込んだ後、
                <span className="text-white font-medium mx-1">「テクニカル指標」</span>を設定して
                <span className="text-primary font-medium mx-1">「詳細分析を実行」</span>ボタンを押すと、
                各銘柄の過去データを取得してRSIやトレンド判定などの詳細なスクリーニングを行います。
              </p>
            </div>
          </div>

          {/* Results Table */}
          <div className="flex-1 overflow-auto">
            <table className="w-full text-left text-xs tabular-nums">
              <thead className="text-[10px] uppercase text-[#92adc9] font-medium sticky top-0 bg-[#141e27] z-10">
                <tr>
                  <th className="px-4 py-3 cursor-pointer hover:text-white" onClick={() => handleSort('symbol')}>
                    <div className="flex items-center gap-1">
                      銘柄コード
                      {sortField === 'symbol' && (
                        <svg className={`w-3 h-3 ${sortDirection === 'asc' ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                        </svg>
                      )}
                    </div>
                  </th>
                  <th className="px-4 py-3">名称</th>
                  <th className="px-4 py-3">市場</th>
                  <th className="px-4 py-3">セクター</th>
                  <th className="px-4 py-3 cursor-pointer hover:text-white text-right" onClick={() => handleSort('price')}>
                    <div className="flex items-center justify-end gap-1">
                      現在値
                      {sortField === 'price' && (
                        <svg className={`w-3 h-3 ${sortDirection === 'asc' ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                        </svg>
                      )}
                    </div>
                  </th>
                  <th className="px-4 py-3 cursor-pointer hover:text-white text-right" onClick={() => handleSort('changePercent')}>
                    <div className="flex items-center justify-end gap-1">
                      騰落率
                      {sortField === 'changePercent' && (
                        <svg className={`w-3 h-3 ${sortDirection === 'asc' ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                        </svg>
                      )}
                    </div>
                  </th>
                  <th className="px-4 py-3 cursor-pointer hover:text-white text-right" onClick={() => handleSort('volume')}>
                    <div className="flex items-center justify-end gap-1">
                      出来高
                      {sortField === 'volume' && (
                        <svg className={`w-3 h-3 ${sortDirection === 'asc' ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                        </svg>
                      )}
                    </div>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#233648]/50">
                {filteredStocks.map((stock) => {
                  return (
                    <tr 
                      key={stock.symbol} 
                      className="hover:bg-[#192633] cursor-pointer transition-colors"
                      onClick={() => handleStockClick(stock)}
                    >
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
      <div className="bg-[#192633]/90 border-t border-[#233648] py-1.5 px-4 text-center text-[10px] text-[#92adc9] shrink-0">
        投資判断は自己責任で行ってください。本サイトの情報は投資助言ではありません。
      </div>
    </div>
  );
}
