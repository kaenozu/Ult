'use client';

/**
 * Performance Screener Dashboard
 * 
 * 全監視銘柄から最適な戦略を持つ銘柄を表示
 * - 直近3ヶ月のパフォーマンスをスキャン
 * - 勝率・利益率・シャープレシオで総合評価
 * - リアルタイム更新対応
 */

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Navigation } from '@/app/components/Navigation';
import { cn, formatPercent } from '@/app/lib/utils';
import { useUIStore } from '@/app/store/uiStore';
import { useWatchlistStore } from '@/app/store/watchlistStore';
import { ErrorBoundary } from '@/app/components/ErrorBoundary';
import { ScreenLabel } from '@/app/components/ScreenLabel';

interface PerformanceScore {
  symbol: string;
  name: string;
  market: 'japan' | 'usa';
  winRate: number;
  totalReturn: number;
  profitFactor: number;
  sharpeRatio: number;
  maxDrawdown: number;
  totalTrades: number;
  performanceScore: number;
  rank?: number;
  startDate: string;
  endDate: string;
}

interface ScreenerResult {
  results: PerformanceScore[];
  totalScanned: number;
  filteredCount: number;
  scanDuration: number;
  lastUpdated: string;
}

type SortField = 'rank' | 'symbol' | 'winRate' | 'totalReturn' | 'profitFactor' | 'sharpeRatio' | 'performanceScore';
type SortDirection = 'asc' | 'desc';

function PerformanceDashboardContent() {
  const router = useRouter();
  const { setSelectedStock } = useUIStore();
  
  const [data, setData] = useState<ScreenerResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // フィルター
  const [market, setMarket] = useState<'all' | 'japan' | 'usa'>('all');
  const [minWinRate, setMinWinRate] = useState(30);
  const [minProfitFactor, setMinProfitFactor] = useState(0.5);
   const [lookbackDays, setLookbackDays] = useState(180);
  const [autoRefresh, setAutoRefresh] = useState(false);
  
  // ソート
  const [sortField, setSortField] = useState<SortField>('rank');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');

  // データ取得
  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      const params = new URLSearchParams({
        market,
        minWinRate: minWinRate.toString(),
        minProfitFactor: minProfitFactor.toString(),
        minTrades: '3',
        maxDrawdown: '100',
        topN: '50',
        lookbackDays: lookbackDays.toString(),
        debug: 'true', // キャッシュ無効化
      });

      const response = await fetch(`/api/performance-screener?${params}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch performance data');
      }
      
      const result = await response.json();
      
      if (result.success) {
        setData(result.data);
      } else {
        throw new Error(result.error || 'Unknown error');
      }
    } catch (err) {
      console.error('Error fetching performance data:', err);
      setError(err instanceof Error ? err.message : 'Failed to load data');
    } finally {
      setLoading(false);
    }
  }, [market, minWinRate, minProfitFactor, lookbackDays]);

  // 初回ロード
  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // 自動更新
  useEffect(() => {
    if (!autoRefresh) return;
    
    const interval = setInterval(() => {
      fetchData();
    }, 5 * 60 * 1000); // 5分ごと
    
    return () => clearInterval(interval);
  }, [autoRefresh, fetchData]);

  // ソート処理
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  // ソート済みデータ
  const sortedResults = data?.results ? [...data.results].sort((a, b) => {
    let aVal = a[sortField];
    let bVal = b[sortField];
    
    if (sortField === 'symbol') {
      aVal = a.symbol;
      bVal = b.symbol;
    }
    
    if (typeof aVal === 'string' && typeof bVal === 'string') {
      return sortDirection === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
    }
    
    return sortDirection === 'asc' 
      ? (aVal as number) - (bVal as number) 
      : (bVal as number) - (aVal as number);
  }) : [];

   // 銘柄クリック処理
   const handleStockClick = (stock: PerformanceScore) => {
     // ウォッチリストに追加
     const { addToWatchlist } = useWatchlistStore.getState();
     addToWatchlist({
       symbol: stock.symbol,
       name: stock.name,
       market: stock.market === 'japan' ? 'japan' : 'usa',
       price: 0,
       change: 0,
       changePercent: 0,
       volume: 0,
       sector: '',
     });
     
     // 銘柄選択
     setSelectedStock({
       symbol: stock.symbol,
       name: stock.name,
       market: stock.market,
       price: 0,
       change: 0,
       changePercent: 0,
       volume: 0,
       sector: '',
     });
     router.push('/');
   };

  // パフォーマンススコアの色
  const getScoreColor = (score: number) => {
    if (score >= 70) return 'text-green-400';
    if (score >= 50) return 'text-yellow-400';
    return 'text-red-400';
  };

  return (
    <div className="flex flex-col h-screen bg-[#101922] text-white overflow-hidden">
      <ScreenLabel label="パフォーマンススクリーナー / Performance Screener" />
      <header className="flex items-center justify-between border-b border-solid border-[#233648] bg-[#101922] px-6 py-3 shrink-0 z-20">
        <div className="flex items-center gap-3 text-white">
          <div className="size-8 bg-primary/20 rounded-lg flex items-center justify-center text-primary">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
            </svg>
          </div>
          <h2 className="text-white text-lg font-bold leading-tight tracking-tight">パフォーマンススクリーナー</h2>
        </div>
        <div className="flex items-center gap-4">
          <button
            onClick={fetchData}
            disabled={loading}
            className={cn(
              "px-4 py-2 rounded-lg text-sm font-medium transition-all",
              loading
                ? "bg-gray-600 text-gray-400 cursor-not-allowed"
                : "bg-primary text-white hover:bg-primary/80"
            )}
          >
            {loading ? '読み込み中...' : '更新'}
          </button>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* サイドバー - フィルター */}
        <aside className="w-72 bg-[#111a22] border-r border-[#233648] flex flex-col overflow-y-auto shrink-0">
          <div className="p-5 flex flex-col gap-6">
            <div>
              <h3 className="text-white text-base font-bold mb-4">フィルター設定</h3>
              
              {/* 市場選択 */}
              <div className="flex flex-col gap-2 mb-4">
                <label className="text-xs text-[#92adc9] font-bold">市場</label>
                <div className="flex bg-[#192633] p-0.5 rounded-md">
                  {(['all', 'japan', 'usa'] as const).map((m) => (
                    <button
                      key={m}
                      onClick={() => setMarket(m)}
                      className={cn(
                        "flex-1 py-1.5 text-xs font-bold rounded transition-all",
                        market === m
                          ? "bg-primary text-white shadow-sm"
                          : "text-[#92adc9] hover:text-white"
                      )}
                    >
                      {m === 'all' ? '全て' : m === 'japan' ? '日本' : '米国'}
                    </button>
                  ))}
                </div>
              </div>

              {/* 最小勝率 */}
              <div className="flex flex-col gap-2 mb-4">
                <div className="flex justify-between items-center">
                  <label className="text-xs text-[#92adc9] font-bold">最小勝率</label>
                  <span className="text-xs text-primary font-black">{minWinRate}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  step="5"
                  value={minWinRate}
                  onChange={(e) => setMinWinRate(parseInt(e.target.value))}
                  className="w-full accent-primary h-1.5 bg-[#192633] rounded-lg appearance-none cursor-pointer"
                />
              </div>

              {/* 最小プロフィットファクター */}
              <div className="flex flex-col gap-2 mb-4">
                <div className="flex justify-between items-center">
                  <label className="text-xs text-[#92adc9] font-bold">最小PF</label>
                  <span className="text-xs text-primary font-black">{minProfitFactor.toFixed(1)}</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="3"
                  step="0.1"
                  value={minProfitFactor}
                  onChange={(e) => setMinProfitFactor(parseFloat(e.target.value))}
                  className="w-full accent-primary h-1.5 bg-[#192633] rounded-lg appearance-none cursor-pointer"
                />
              </div>

              {/* 評価期間 */}
              <div className="flex flex-col gap-2 mb-4">
                <label className="text-xs text-[#92adc9] font-bold">評価期間</label>
                <select
                  value={lookbackDays}
                  onChange={(e) => setLookbackDays(parseInt(e.target.value))}
                  className="w-full bg-[#192633] border border-[#233648] rounded-lg px-3 py-2 text-xs text-white"
                >
                  <option value={30}>1ヶ月</option>
                  <option value={60}>2ヶ月</option>
                  <option value={90}>3ヶ月</option>
                  <option value={180}>6ヶ月</option>
                </select>
              </div>

              {/* 自動更新 */}
              <div className="flex items-center justify-between mb-4">
                <label className="text-xs text-[#92adc9] font-bold">自動更新 (5分)</label>
                <button
                  onClick={() => setAutoRefresh(!autoRefresh)}
                  className={cn(
                    "relative inline-flex h-6 w-11 items-center rounded-full transition-colors",
                    autoRefresh ? "bg-primary" : "bg-gray-600"
                  )}
                >
                  <span
                    className={cn(
                      "inline-block h-4 w-4 transform rounded-full bg-white transition-transform",
                      autoRefresh ? "translate-x-6" : "translate-x-1"
                    )}
                  />
                </button>
              </div>
            </div>

            {/* 統計情報 */}
            {data && (
              <div className="p-3 bg-primary/5 rounded-lg border border-primary/20">
                <h4 className="text-xs font-bold text-primary mb-2">スキャン結果</h4>
                <div className="space-y-1 text-xs text-[#92adc9]">
                  <div className="flex justify-between">
                    <span>スキャン数:</span>
                    <span className="text-white font-bold">{data.totalScanned}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>条件一致:</span>
                    <span className="text-white font-bold">{data.filteredCount}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>処理時間:</span>
                    <span className="text-white font-bold">{(data.scanDuration / 1000).toFixed(1)}秒</span>
                  </div>
                  <div className="flex justify-between">
                    <span>更新:</span>
                    <span className="text-white font-bold text-[10px]">
                      {new Date(data.lastUpdated).toLocaleTimeString('ja-JP')}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </aside>

        {/* メインコンテンツ */}
        <main className="flex-1 flex flex-col min-w-0 bg-[#101922]">
          <div className="flex flex-col gap-4 px-6 py-5 border-b border-[#233648]/50">
            <h1 className="text-white tracking-tight text-2xl font-bold leading-tight">
              現在の相場に最もフィットしている銘柄
            </h1>
            <p className="text-[#92adc9] text-sm">
              直近{lookbackDays}日間のバックテスト結果に基づく総合ランキング
            </p>
          </div>

          <div className="flex-1 overflow-auto">
            {loading && !data && (
              <div className="flex items-center justify-center h-full">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
                  <p className="text-[#92adc9]">スキャン中...</p>
                </div>
              </div>
            )}

            {error && (
              <div className="flex items-center justify-center h-full">
                <div className="text-center">
                  <p className="text-red-400 mb-2">エラーが発生しました</p>
                  <p className="text-sm text-[#92adc9]">{error}</p>
                  <button
                    onClick={fetchData}
                    className="mt-4 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/80"
                  >
                    再試行
                  </button>
                </div>
              </div>
            )}

            {!loading && !error && sortedResults.length === 0 && (
              <div className="flex items-center justify-center h-full">
                <p className="text-[#92adc9]">条件に一致する銘柄が見つかりませんでした</p>
              </div>
            )}

            {!loading && !error && sortedResults.length > 0 && (
              <div className="min-w-[1000px] lg:min-w-0">
                <table className="w-full text-left text-xs tabular-nums">
                  <thead className="text-[10px] uppercase text-[#92adc9] font-medium sticky top-0 bg-[#141e27] z-10 border-b border-[#233648]">
                    <tr>
                      <th className="px-3 py-3 w-12 cursor-pointer hover:text-white" onClick={() => handleSort('rank')}>
                        順位 {sortField === 'rank' && (sortDirection === 'asc' ? '↑' : '↓')}
                      </th>
                      <th className="px-3 py-3 w-20 cursor-pointer hover:text-white" onClick={() => handleSort('symbol')}>
                        銘柄 {sortField === 'symbol' && (sortDirection === 'asc' ? '↑' : '↓')}
                      </th>
                      <th className="px-3 py-3 w-32">名称</th>
                      <th className="px-3 py-3 w-16">市場</th>
                      <th className="px-3 py-3 w-20 text-center cursor-pointer hover:text-white" onClick={() => handleSort('performanceScore')}>
                        スコア {sortField === 'performanceScore' && (sortDirection === 'asc' ? '↑' : '↓')}
                      </th>
                      <th className="px-3 py-3 w-20 text-right cursor-pointer hover:text-white" onClick={() => handleSort('winRate')}>
                        勝率 {sortField === 'winRate' && (sortDirection === 'asc' ? '↑' : '↓')}
                      </th>
                      <th className="px-3 py-3 w-20 text-right cursor-pointer hover:text-white" onClick={() => handleSort('profitFactor')}>
                        PF {sortField === 'profitFactor' && (sortDirection === 'asc' ? '↑' : '↓')}
                      </th>
                      <th className="px-3 py-3 w-20 text-right cursor-pointer hover:text-white" onClick={() => handleSort('totalReturn')}>
                        利益 {sortField === 'totalReturn' && (sortDirection === 'asc' ? '↑' : '↓')}
                      </th>
                      <th className="px-3 py-3 w-20 text-right cursor-pointer hover:text-white" onClick={() => handleSort('sharpeRatio')}>
                        シャープ {sortField === 'sharpeRatio' && (sortDirection === 'asc' ? '↑' : '↓')}
                      </th>
                      <th className="px-3 py-3 w-16 text-center">取引数</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#233648]/50">
                    {sortedResults.map((stock) => (
                      <tr
                        key={stock.symbol}
                        className="hover:bg-[#192633] cursor-pointer transition-colors"
                        onClick={() => handleStockClick(stock)}
                      >
                        <td className="px-3 py-3 text-center">
                          <span className={cn(
                            "font-bold",
                            stock.rank === 1 ? "text-yellow-400" :
                            stock.rank === 2 ? "text-gray-300" :
                            stock.rank === 3 ? "text-orange-400" :
                            "text-white"
                          )}>
                            {stock.rank}
                          </span>
                        </td>
                        <td className="px-3 py-3 font-bold text-white">{stock.symbol}</td>
                        <td className="px-3 py-3 text-[#92adc9] truncate" title={stock.name}>{stock.name}</td>
                        <td className="px-3 py-3">
                          <span className={cn(
                            'text-[10px] px-1.5 py-0.5 rounded font-bold',
                            stock.market === 'japan' ? 'bg-blue-500/20 text-blue-400' : 'bg-red-500/20 text-red-400'
                          )}>
                            {stock.market === 'japan' ? 'JP' : 'US'}
                          </span>
                        </td>
                        <td className="px-3 py-3 text-center">
                          <span className={cn("font-bold text-lg", getScoreColor(stock.performanceScore))}>
                            {stock.performanceScore.toFixed(1)}
                          </span>
                        </td>
                        <td className={cn("px-3 py-3 text-right font-bold", getScoreColor(stock.winRate))}>
                          {stock.winRate.toFixed(1)}%
                        </td>
                        <td className={cn("px-3 py-3 text-right font-bold", getScoreColor(stock.profitFactor * 33.3))}>
                          {stock.profitFactor.toFixed(2)}
                        </td>
                        <td className={cn(
                          "px-3 py-3 text-right font-bold",
                          stock.totalReturn > 0 ? "text-green-400" : "text-red-400"
                        )}>
                          {formatPercent(stock.totalReturn)}
                        </td>
                        <td className={cn("px-3 py-3 text-right font-bold", getScoreColor((stock.sharpeRatio + 1) * 25))}>
                          {stock.sharpeRatio.toFixed(2)}
                        </td>
                        <td className="px-3 py-3 text-center text-[#92adc9]">{stock.totalTrades}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </main>
      </div>
      <Navigation />
    </div>
  );
}

export default function PerformanceDashboard() {
  return (
    <ErrorBoundary name="PerformanceDashboard">
      <PerformanceDashboardContent />
    </ErrorBoundary>
  );
}
