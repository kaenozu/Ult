'use client';

import { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Navigation } from '@/app/components/Navigation';
import { JAPAN_STOCKS, USA_STOCKS, fetchOHLCV } from '@/app/data/stocks';
import { Stock, Signal } from '@/app/types';
import { cn, formatCurrency, formatPercent, getChangeColor } from '@/app/lib/utils';
import { marketClient } from '@/app/lib/api/data-aggregator';
import { filterByTechnicals, TechFilters } from '@/app/lib/screener-utils';
import { useUIStore } from '@/app/store/uiStore';
import { useWatchlistStore } from '@/app/store/watchlistStore';
import { ErrorBoundary } from '@/app/components/ErrorBoundary';
import { ScreenLabel } from '@/app/components/ScreenLabel';

type SortField = 'price' | 'change' | 'changePercent' | 'volume' | 'symbol';
type SortDirection = 'asc' | 'desc';
type PresetType = 'oversold' | 'uptrend' | 'overbought' | 'downtrend';

function ScreenerContent() {
  const router = useRouter();
  const { setSelectedStock } = useUIStore();
  const { addToWatchlist } = useWatchlistStore();
  const [filters, setFilters] = useState({
    priceMin: '',
    priceMax: '',
    changeMin: '',
    changeMax: '',
    volumeMin: '',
    sector: '',
    market: '',
    signal: 'ANY',  // 'BUY'から'ANY'に変更して売買両方を表示
    minConfidence: '60',  // 80%から60%に変更して現実的な基準に
  });

  const [techFilters, setTechFilters] = useState<TechFilters>({
    rsiMax: '',
    rsiMin: '',
    trend: 'all',
  });

  const [sortField, setSortField] = useState<SortField>('changePercent');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };
  const [stocks, setStocks] = useState<Stock[]>([...JAPAN_STOCKS, ...USA_STOCKS]);
  const [analyzing, setAnalyzing] = useState(false);
  const [analyzedStocks, setAnalyzedStocks] = useState<{ symbol: string, signal?: Signal }[]>([]);
  const [isTechAnalysisDone, setIsTechAnalysisDone] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // Debounce timeout and active preset tracking
  const debounceTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [activePreset, setActivePreset] = useState<PresetType | null>(null);

  useEffect(() => {
    return () => {
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    let mounted = true;
    const controller = new AbortController();

    const fetchAllData = async () => {
      const allStocks = [...JAPAN_STOCKS, ...USA_STOCKS];
      const symbols = allStocks.map(s => s.symbol);
      const quotes = await marketClient.fetchQuotes(symbols, controller.signal);

      if (mounted && quotes.length > 0) {
        setStocks(prev => prev.map(s => {
          const q = quotes.find(q => q.symbol === s.symbol);
          if (q) {
            return {
              ...s,
              price: q.price,
              change: q.change,
              changePercent: q.changePercent,
              volume: q.volume,
            };
          }
          return s;
        }));
      }
    };
    fetchAllData();
    return () => {
      mounted = false;
      controller.abort();
    };
  }, []);

  const handleTechScreening = async () => {
    setIsTechAnalysisDone(false);
    setAnalyzedStocks([]);
    setAnalyzing(true);

    const candidates = stocks.filter(stock => {
      if (filters.priceMin && stock.price < parseFloat(filters.priceMin)) return false;
      if (filters.priceMax && stock.price > parseFloat(filters.priceMax)) return false;
      if (filters.market && stock.market !== filters.market) return false;
      return true;
    });

    // Pre-warm cache for market indices to avoid redundant fetches per stock
    const marketsToFetch = new Set(candidates.map(s => s.market));
    await Promise.all(
      Array.from(marketsToFetch).map(market => 
        marketClient.fetchMarketIndex(market).catch(() => {
          console.warn(`Failed to pre-fetch ${market} index`);
        })
      )
    );

    const results: { symbol: string, signal?: Signal }[] = [];
    // Increased chunk size from 5 to 10 for faster parallel processing
    const CHUNK_SIZE = 10;

    for (let i = 0; i < candidates.length; i += CHUNK_SIZE) {
      const chunk = candidates.slice(i, i + CHUNK_SIZE);

      await Promise.all(chunk.map(async (stock) => {
        try {
          const ohlcv = await fetchOHLCV(stock.symbol, stock.market, stock.price);
          
          if (ohlcv.length < 20) {
            return;
          }

          // Check technical filters first to avoid expensive signal calculation if not needed
          const techMatch = filterByTechnicals(stock, ohlcv, techFilters);
          if (!techMatch) return;

          // Only generate AI signal for stocks that pass technical filters
          const signalResult = await marketClient.fetchSignal(stock);
          if (signalResult.success && signalResult.data) {
            results.push({ symbol: stock.symbol, signal: signalResult.data });
          }
        } catch (error) {
          // Log error for debugging/monitoring but don't stop the whole process
          console.error('Failed to analyze', error);
        }
      }));
    }

    setAnalyzedStocks(results);
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

      if (isTechAnalysisDone) {
        const analysisResult = analyzedStocks.find(as => as.symbol === stock.symbol);
        if (!analysisResult) return false;
        if (filters.signal !== 'ANY' && analysisResult.signal?.type !== filters.signal) return false;
        if (filters.minConfidence && (analysisResult.signal?.confidence || 0) < parseFloat(filters.minConfidence)) return false;
      }

      return true;
    }).sort((a, b) => {
      let aVal = a[sortField];
      let bVal = b[sortField];
      if (sortField === 'symbol') { aVal = a.symbol; bVal = b.symbol; }
      if (typeof aVal === 'string' && typeof bVal === 'string') {
        return sortDirection === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
      }
      return sortDirection === 'asc' ? (aVal as number) - (bVal as number) : (bVal as number) - (aVal as number);
    });
  }, [filters, sortField, sortDirection, stocks, analyzedStocks, isTechAnalysisDone]);

  const handleStockClick = (stock: Stock) => {
    addToWatchlist(stock);
    setSelectedStock(stock);
    router.push('/');
  };

  const applyPreset = useCallback((type: PresetType) => {
    // Clear previous debounce
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
    }

    // Immediate visual feedback
    setActivePreset(type);

    // Debounce the actual filter application
    debounceTimeoutRef.current = setTimeout(() => {
      // Determine signal type based on preset
      let signalType: string;
      switch (type) {
        case 'oversold':
        case 'uptrend':
          signalType = 'BUY';
          break;
        case 'overbought':
        case 'downtrend':
          signalType = 'SELL';
          break;
        default:
          signalType = 'ANY';
      }

      setFilters({
        priceMin: '', priceMax: '', changeMin: '', changeMax: '',
        volumeMin: '', sector: '', market: '',
        signal: signalType, 
        minConfidence: '60',
      });

      if (type === 'oversold') {
        setTechFilters({ rsiMax: '30', rsiMin: '', trend: 'all' });
      } else if (type === 'uptrend') {
        setTechFilters({ rsiMax: '', rsiMin: '', trend: 'uptrend' });
      } else if (type === 'overbought') {
        setTechFilters({ rsiMax: '', rsiMin: '70', trend: 'all' });
      } else if (type === 'downtrend') {
        setTechFilters({ rsiMax: '', rsiMin: '', trend: 'downtrend' });
      }
      setIsTechAnalysisDone(false);
      setActivePreset(null);
    }, 300); // 300ms debounce
  }, []);

  return (
    <div className="flex flex-col h-screen bg-[#101922] text-white overflow-hidden">
      <ScreenLabel label="株式スクリーナー / Stock Screener" />
      <header className="flex items-center justify-between whitespace-nowrap border-b border-solid border-[#233648] bg-[#101922] px-6 py-3 shrink-0 z-20">
        <div className="flex items-center gap-4">
          <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="lg:hidden p-2 text-[#92adc9] hover:text-white transition-colors">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg>
          </button>
          <div className="flex items-center gap-3 text-white">
            <div className="size-8 bg-primary/20 rounded-lg flex items-center justify-center text-primary">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" /></svg>
            </div>
            <h2 className="text-white text-lg font-bold leading-tight tracking-tight">株式スクリーナー</h2>
          </div>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden relative">
        {isSidebarOpen && <div className="fixed inset-0 bg-black/50 z-30 lg:hidden" onClick={() => setIsSidebarOpen(false)} />}
        <aside className={cn(
          "w-72 bg-[#111a22] border-r border-[#233648] flex flex-col overflow-y-auto shrink-0 transition-transform duration-300 ease-in-out",
          "lg:static lg:translate-x-0 z-40",
          isSidebarOpen ? "fixed inset-y-0 left-0 translate-x-0" : "fixed inset-y-0 left-0 -translate-x-full lg:translate-x-0"
        )}>
          <div className="p-5 flex flex-col gap-6">
            <div className="flex justify-between items-center">
              <h3 className="text-white text-base font-bold">フィルター</h3>
              <button onClick={() => {
                setFilters({ priceMin: '', priceMax: '', changeMin: '', changeMax: '', volumeMin: '', sector: '', market: '', signal: 'ANY', minConfidence: '60' });
                setTechFilters({ rsiMax: '', rsiMin: '', trend: 'all' });
                setIsTechAnalysisDone(false);
              }} className="text-primary text-xs font-medium hover:text-primary/80">リセット</button>
            </div>

            {/* AI Signal Panel */}
            <div className="flex flex-col gap-3 p-3 bg-primary/5 rounded-lg border border-primary/20">
              <span className="text-[10px] font-black text-primary uppercase tracking-widest flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse"></span>AIシグナル設定
              </span>
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] text-[#92adc9] font-bold">推奨シグナル</label>
                <div className="flex bg-[#192633] p-0.5 rounded-md">
                  {['BUY', 'SELL', 'ANY'].map((s) => (
                    <button key={s} onClick={() => { setFilters(prev => ({ ...prev, signal: s })); }}
                      className={cn("flex-1 py-1.5 text-[10px] font-bold rounded transition-all", filters.signal === s ? "bg-primary text-white shadow-sm" : "text-[#92adc9] hover:text-white")}>
                      {s === 'BUY' ? '買い' : s === 'SELL' ? '売り' : '全て'}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex flex-col gap-1.5">
                <div className="flex justify-between items-center"><label className="text-[10px] text-[#92adc9] font-bold">最小信頼度 (%)</label><span className="text-[10px] text-primary font-black">{filters.minConfidence}%</span></div>
                <input id="minConfidence" name="minConfidence" type="range" min="0" max="100" step="5" value={filters.minConfidence} onChange={(e) => { setFilters(prev => ({ ...prev, minConfidence: e.target.value })); }} className="w-full accent-primary h-1.5 bg-[#192633] rounded-lg appearance-none cursor-pointer" />
              </div>
            </div>

            {/* Basic Filters (Restored) */}
            <div className="flex flex-col gap-3">
              <span className="text-xs font-semibold text-[#92adc9] uppercase tracking-wider">基本フィルター</span>

              {/* Market */}
              <div className="flex flex-col gap-1.5">
                <label htmlFor="marketFilter" className="text-[10px] text-[#92adc9] font-bold">市場</label>
                <select id="marketFilter" name="marketFilter" aria-label="市場フィルター" value={filters.market} onChange={(e) => setFilters(prev => ({ ...prev, market: e.target.value }))} className="w-full bg-[#192633] border border-[#233648] rounded-lg px-3 py-2 text-xs text-white">
                  <option value="">全て</option>
                  <option value="japan">日本 (JP)</option>
                  <option value="usa">米国 (US)</option>
                </select>
              </div>

              {/* Price */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] text-[#92adc9] font-bold">価格</label>
                <div className="flex gap-2">
                  <input id="priceMin" name="priceMin" aria-label="最低価格" placeholder="Min" type="number" value={filters.priceMin} onChange={(e) => setFilters(prev => ({ ...prev, priceMin: e.target.value }))} className="w-full bg-[#192633] border border-[#233648] rounded-lg px-3 py-2 text-xs text-white placeholder-gray-600" />
                  <input id="priceMax" name="priceMax" aria-label="最高価格" placeholder="Max" type="number" value={filters.priceMax} onChange={(e) => setFilters(prev => ({ ...prev, priceMax: e.target.value }))} className="w-full bg-[#192633] border border-[#233648] rounded-lg px-3 py-2 text-xs text-white placeholder-gray-600" />
                </div>
              </div>

              {/* Change % */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] text-[#92adc9] font-bold">騰落率 (%)</label>
                <div className="flex gap-2">
                  <input id="changeMin" name="changeMin" aria-label="最小騰落率" placeholder="Min %" type="number" value={filters.changeMin} onChange={(e) => setFilters(prev => ({ ...prev, changeMin: e.target.value }))} className="w-full bg-[#192633] border border-[#233648] rounded-lg px-3 py-2 text-xs text-white placeholder-gray-600" />
                  <input id="changeMax" name="changeMax" aria-label="最大騰落率" placeholder="Max %" type="number" value={filters.changeMax} onChange={(e) => setFilters(prev => ({ ...prev, changeMax: e.target.value }))} className="w-full bg-[#192633] border border-[#233648] rounded-lg px-3 py-2 text-xs text-white placeholder-gray-600" />
                </div>
              </div>

              {/* Volume */}
              <div className="flex flex-col gap-1.5">
                <label htmlFor="volumeMin" className="text-[10px] text-[#92adc9] font-bold">出来高</label>
                <input id="volumeMin" name="volumeMin" aria-label="最小出来高" placeholder="Min Volume" type="number" value={filters.volumeMin} onChange={(e) => setFilters(prev => ({ ...prev, volumeMin: e.target.value }))} className="w-full bg-[#192633] border border-[#233648] rounded-lg px-3 py-2 text-xs text-white placeholder-gray-600" />
              </div>

              {/* Sector */}
              <div className="flex flex-col gap-1.5">
                <label htmlFor="sectorFilter" className="text-[10px] text-[#92adc9] font-bold">セクター</label>
                <input id="sectorFilter" name="sectorFilter" aria-label="セクターフィルター" placeholder="Sector" value={filters.sector} onChange={(e) => setFilters(prev => ({ ...prev, sector: e.target.value }))} className="w-full bg-[#192633] border border-[#233648] rounded-lg px-3 py-2 text-xs text-white placeholder-gray-600" />
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <span className="text-xs font-semibold text-[#92adc9] uppercase tracking-wider">クイック検索</span>
              <div className="grid grid-cols-1 gap-2">
                <button
                  onClick={() => applyPreset('oversold')}
                  disabled={activePreset !== null}
                  className={cn(
                    "relative text-xs py-2 px-3 rounded-lg text-left transition-all duration-200",
                    "bg-[#192633] hover:bg-[#233648] border border-green-500/30 text-green-400",
                    activePreset === 'oversold' && "opacity-60 cursor-not-allowed",
                    activePreset !== null && activePreset !== 'oversold' && "opacity-50"
                  )}
                >
                  <span className="flex items-center gap-2">
                    {activePreset === 'oversold' && <span className="animate-spin">⏳</span>}
                    🔥 売られすぎ（買い）
                  </span>
                </button>
                <button
                  onClick={() => applyPreset('uptrend')}
                  disabled={activePreset !== null}
                  className={cn(
                    "relative text-xs py-2 px-3 rounded-lg text-left transition-all duration-200",
                    "bg-[#192633] hover:bg-[#233648] border border-blue-500/30 text-blue-400",
                    activePreset === 'uptrend' && "opacity-60 cursor-not-allowed",
                    activePreset !== null && activePreset !== 'uptrend' && "opacity-50"
                  )}
                >
                  <span className="flex items-center gap-2">
                    {activePreset === 'uptrend' && <span className="animate-spin">⏳</span>}
                    🚀 上昇トレンド（買い）
                  </span>
                </button>
                <button
                  onClick={() => applyPreset('overbought')}
                  disabled={activePreset !== null}
                  className={cn(
                    "relative text-xs py-2 px-3 rounded-lg text-left transition-all duration-200",
                    "bg-[#192633] hover:bg-[#233648] border border-red-500/30 text-red-400",
                    activePreset === 'overbought' && "opacity-60 cursor-not-allowed",
                    activePreset !== null && activePreset !== 'overbought' && "opacity-50"
                  )}
                >
                  <span className="flex items-center gap-2">
                    {activePreset === 'overbought' && <span className="animate-spin">⏳</span>}
                    ⚠️ 買われすぎ（売り）
                  </span>
                </button>
                <button
                  onClick={() => applyPreset('downtrend')}
                  disabled={activePreset !== null}
                  className={cn(
                    "relative text-xs py-2 px-3 rounded-lg text-left transition-all duration-200",
                    "bg-[#192633] hover:bg-[#233648] border border-orange-500/30 text-orange-400",
                    activePreset === 'downtrend' && "opacity-60 cursor-not-allowed",
                    activePreset !== null && activePreset !== 'downtrend' && "opacity-50"
                  )}
                >
                  <span className="flex items-center gap-2">
                    {activePreset === 'downtrend' && <span className="animate-spin">⏳</span>}
                    📉 下降トレンド（売り）
                  </span>
                </button>
              </div>
            </div>

            <div className="flex flex-col gap-3">
              <span className="text-xs font-semibold text-[#92adc9] uppercase tracking-wider">テクニカル指標</span>
              <div className="flex flex-col gap-2">
                <label htmlFor="trendFilter" className="text-[10px] text-[#92adc9]">トレンド (SMA50)</label>
                <select id="trendFilter" name="trendFilter" aria-label="トレンドフィルター" value={techFilters.trend} onChange={(e) => { setTechFilters(prev => ({ ...prev, trend: e.target.value })); setIsTechAnalysisDone(false); }} className="w-full bg-[#192633] border border-[#233648] rounded-lg px-3 py-2 text-xs text-white">
                  <option value="all">指定なし</option>
                  <option value="uptrend">上昇</option>
                  <option value="downtrend">下降</option>
                </select>
              </div>
              <button onClick={handleTechScreening} disabled={analyzing} className={cn("w-full py-2 rounded-lg text-xs font-bold transition-all mt-2 flex items-center justify-center gap-2", analyzing ? "bg-[#233648] text-[#92adc9] cursor-wait" : "bg-primary text-white hover:bg-primary/80 shadow-lg shadow-primary/20")}>
                {analyzing ? "AI分析実行中..." : isTechAnalysisDone ? "再分析を実行" : "AIシグナル分析を開始"}
              </button>
            </div>
          </div>
        </aside>

        <main className="flex-1 flex flex-col min-w-0 bg-[#101922]">
          <div className="flex flex-col gap-4 px-6 py-5 border-b border-[#233648]/50">
            <h1 className="text-white tracking-tight text-2xl font-bold leading-tight">株式スクリーナー</h1>
            <span className="text-white font-medium">{filteredStocks.length} 銘柄が見つかりました</span>
          </div>

          <div className="flex-1 overflow-auto">
            <div className="min-w-[800px] lg:min-w-0">
              <table className="w-full text-left text-xs tabular-nums">
                <thead className="text-[10px] uppercase text-[#92adc9] font-medium sticky top-0 bg-[#141e27] z-10 border-b border-[#233648]">
                  <tr>
                    <th className="px-3 py-3 w-20 cursor-pointer hover:text-white transition-colors" onClick={() => handleSort('symbol')}>
                      銘柄コード {sortField === 'symbol' && (sortDirection === 'asc' ? '↑' : '↓')}
                    </th>
                    <th className="px-3 py-3 w-32 cursor-pointer hover:text-white transition-colors" onClick={() => handleSort('symbol')}>
                      名称 {sortField === 'symbol' && (sortDirection === 'asc' ? '↑' : '↓')}
                    </th>
                    {isTechAnalysisDone && (
                      <>
                        <th className="px-3 py-3 w-20 text-center">AIシグナル</th>
                        <th className="px-3 py-3 w-16 text-right">信頼度</th>
                      </>
                    )}
                    <th className="px-3 py-3 w-16">市場</th>
                    <th className="px-3 py-3 w-24 text-right cursor-pointer hover:text-white transition-colors" onClick={() => handleSort('price')}>
                      現在値 {sortField === 'price' && (sortDirection === 'asc' ? '↑' : '↓')}
                    </th>
                    <th className="px-3 py-3 w-24 text-right cursor-pointer hover:text-white transition-colors" onClick={() => handleSort('changePercent')}>
                      騰落率 {sortField === 'changePercent' && (sortDirection === 'asc' ? '↑' : '↓')}
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#233648]/50">
                  {filteredStocks.map((stock) => {
                    const analysis = analyzedStocks.find(as => as.symbol === stock.symbol);
                    return (
                      <tr key={stock.symbol} className="hover:bg-[#192633] cursor-pointer transition-colors" onClick={() => handleStockClick(stock)}>
                        <td className="px-3 py-3 font-bold text-white truncate">{stock.symbol}</td>
                        <td className="px-3 py-3 text-[#92adc9] truncate" title={stock.name}>{stock.name}</td>
                        {isTechAnalysisDone && (
                          <>
                            <td className="px-3 py-3 text-center">
                              {analysis?.signal ? <span className={cn("px-2 py-0.5 rounded text-[10px] font-bold", analysis.signal.type === 'BUY' ? "bg-green-500/20 text-green-400" : analysis.signal.type === 'SELL' ? "bg-red-500/20 text-red-400" : "bg-gray-500/20 text-gray-400")}>{analysis.signal.type === 'BUY' ? '買い' : analysis.signal.type === 'SELL' ? '売り' : '維持'}</span> : '-'}
                            </td>
                            <td className="px-3 py-3 text-right">
                              {analysis?.signal ? <span className={cn("font-bold", analysis.signal.confidence >= 80 ? "text-green-500" : analysis.signal.confidence >= 60 ? "text-yellow-500" : "text-red-500")}>{analysis.signal.confidence}%</span> : '-'}
                            </td>
                          </>
                        )}
                        <td className="px-3 py-3">
                          <span className={cn('text-[10px] px-1.5 py-0.5 rounded font-bold', stock.market === 'japan' ? 'bg-blue-500/20 text-blue-400' : 'bg-red-500/20 text-red-400')}>{stock.market === 'japan' ? 'JP' : 'US'}</span>
                        </td>
                        <td className="px-3 py-3 text-right text-white font-medium">{stock.market === 'japan' ? formatCurrency(stock.price, 'JPY') : formatCurrency(stock.price, 'USD')}</td>
                        <td className={cn('px-3 py-3 text-right font-bold', getChangeColor(stock.change))}>{formatPercent(stock.changePercent)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </main>
      </div>
      <Navigation />
    </div>
  );
}

export default function Screener() {
  return (
    <ErrorBoundary name="ScreenerPage">
      <ScreenerContent />
    </ErrorBoundary>
  );
}
