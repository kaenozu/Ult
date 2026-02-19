'use client';

const isDev = process.env.NODE_ENV !== 'production';
const devLog = (...args: unknown[]) => { if (isDev) devLog(...args); };
const devWarn = (...args: unknown[]) => { if (isDev) devWarn(...args); };
const devError = (...args: unknown[]) => { if (isDev) devError(...args); };

/**
 * Performance Screener Dashboard
 * 
 * 全監視銘柄から最適な戦略を持つ銘柄を表示
 * - 直近3ヶ月のパフォーマンスをスキャン
 * - 勝率・利益率・シャープレシオで総合評価
 * - AIシグナルスクリーニングもサポート
 */

import { useState, useEffect, useCallback, useRef, useMemo, memo } from 'react';
import { useRouter } from 'next/navigation';

import { cn, formatPercent } from '@/app/lib/utils';
import { useUIStore } from '@/app/store/uiStore';
import { useWatchlistStore } from '@/app/store/watchlistStore';
import { usePerformanceStore } from '@/app/store/performanceStore';
import { ErrorBoundary } from '@/app/components/ErrorBoundary';
import { ScreenLabel } from '@/app/components/ScreenLabel';
import { AISignalResult, DualMatchEntry } from '@/app/lib/PerformanceScreenerService';
import { Signal } from '@/app/types';

import { fetchOHLCV } from '@/app/data/stocks';
import { TableVirtuoso } from 'react-virtuoso';
import { TIMEOUT } from '@/app/constants/timing';

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
interface DualMatchResult extends PerformanceScore {
  confidence: number;
  aiSignalType: string;
  dualScore: number;
}



// Generic result wrapper
interface ScreenerResult<T> {
  results: T[];
  totalScanned: number;
  filteredCount: number;
  scanDuration: number;
  lastUpdated: string;
}

type SortField = 'rank' | 'symbol' | 'winRate' | 'totalReturn' | 'profitFactor' | 'sharpeRatio' | 'performanceScore' | 'confidence' | 'targetPrice';
type SortDirection = 'asc' | 'desc';

// ヘルパー関数をコンポーネント外に移動（再定義を防ぐため）
const getScoreColor = (score: number) => {
  if (score >= 70) return 'text-green-400';
  if (score >= 50) return 'text-yellow-400';
  return 'text-red-400';
};

/**
 * パフォーマンス/デュアルマッチ用の行コンポーネント (メモ化)
 */
const PerformanceTableRow = memo(({
  stock,
  isDualMatch,
  activeTab,
  onClick
}: {
  stock: PerformanceScore,
  isDualMatch: boolean,
  activeTab: string,
  onClick: (s: PerformanceScore) => void
}) => {
  return (
    <>
      <td className="px-3 py-3 text-center relative">
        {isDualMatch && (
          <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-gradient-to-b from-orange-400 to-yellow-400" />
        )}
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
      <td className="px-3 py-3 font-bold text-white flex items-center gap-2">
        {stock.symbol}
        {isDualMatch && <span className="text-[10px]" title="デュアルマッチ銘柄">🔥</span>}
      </td>
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
        <span className={cn(
          "font-bold text-lg",
          activeTab === 'dual-match'
            ? getScoreColor((stock as any).dualScore || 0)
            : getScoreColor(stock.performanceScore || 0)
        )}>
          {activeTab === 'dual-match'
            ? ((stock as any).dualScore || 0).toFixed(1)
            : (stock.performanceScore || 0).toFixed(1)}
        </span>
      </td>
      <td className={cn("px-3 py-3 text-right font-bold", getScoreColor(stock.winRate ?? 0))}>
        {(stock.winRate ?? 0).toFixed(1)}%
      </td>
      <td className={cn("px-3 py-3 text-right font-bold", getScoreColor((stock.profitFactor ?? 1.5) * 33.3))}>
        {stock.profitFactor === null || stock.profitFactor === undefined || !isFinite(stock.profitFactor)
          ? 'Inf'
          : stock.profitFactor.toFixed(2)}
      </td>
      <td className={cn(
        "px-3 py-3 text-right font-bold",
        (stock.totalReturn ?? 0) > 0 ? "text-green-400" : "text-red-400"
      )}>
        {formatPercent(stock.totalReturn ?? 0)}
      </td>
      <td className={cn("px-3 py-3 text-right font-bold", getScoreColor(((stock.sharpeRatio ?? 0) + 1) * 25))}>
        {(stock.sharpeRatio ?? 0).toFixed(2)}
      </td>
      <td className="px-3 py-3 text-center text-[#92adc9]">
        {stock.totalTrades || 0}
      </td>
      {activeTab === 'dual-match' && (
        <>
          <td className="px-3 py-3 text-center">
            <span className={cn(
              "px-2 py-0.5 rounded text-[10px] font-bold",
              (stock as DualMatchResult).aiSignalType === 'BUY' ? "bg-green-500/20 text-green-400" :
                (stock as DualMatchResult).aiSignalType === 'SELL' ? "bg-red-500/20 text-red-400" :
                  "bg-gray-500/20 text-gray-400"
            )}>
              {(stock as DualMatchResult).aiSignalType === 'BUY' ? '買い' : (stock as DualMatchResult).aiSignalType === 'SELL' ? '売り' : '保留'}
            </span>
          </td>
          <td className="px-3 py-3 text-center">
            <div className="flex items-center justify-center gap-1.5">
              <div className="w-8 h-1 bg-[#233648] rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-primary to-blue-400"
                  style={{ width: `${(stock as DualMatchResult).confidence}%` }}
                />
              </div>
              <span className="text-white font-medium text-[10px]">{(stock as DualMatchResult).confidence?.toFixed(0)}%</span>
            </div>
          </td>
        </>
      )}
    </>
  );
});

PerformanceTableRow.displayName = 'PerformanceTableRow';

/**
 * AIシグナル用の行コンポーネント (メモ化)
 */
const AISignalTableRow = memo(({
  stock,
  isDualMatch,
  onClick
}: {
  stock: AISignalResult,
  isDualMatch: boolean,
  onClick: (s: AISignalResult) => void
}) => {
  return (
    <>
      <td className="px-3 py-3 text-center relative">
        {isDualMatch && (
          <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-gradient-to-b from-orange-400 to-yellow-400" />
        )}
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
      <td className="px-3 py-3 font-bold text-white flex items-center gap-1">
        {stock.symbol}
        {isDualMatch && <span className="text-[10px]">🔥</span>}
      </td>
      <td className="px-3 py-3 text-[#92adc9] truncate max-w-[200px]" title={stock.name}>{stock.name}</td>
      <td className="px-3 py-3">
        <span className={cn(
          'text-[10px] px-1.5 py-0.5 rounded font-bold',
          stock.market === 'japan' ? 'bg-blue-500/20 text-blue-400' : 'bg-red-500/20 text-red-400'
        )}>
          {stock.market === 'japan' ? 'JP' : 'US'}
        </span>
      </td>
      <td className="px-3 py-3">
        <span className={cn(
          'text-[10px] px-1.5 py-0.5 rounded font-bold',
          stock.signalType === 'BUY' ? 'bg-green-500/20 text-green-400' :
            stock.signalType === 'SELL' ? 'bg-red-500/20 text-red-400' :
              'bg-gray-500/20 text-gray-400'
        )}>
          {stock.signalType}
        </span>
      </td>
      <td className={cn("px-3 py-3 text-right font-bold text-base", (stock.predictedChange ?? 0) > 0 ? "text-green-400" : "text-red-400")}>
        {stock.predictedChange !== undefined ? (stock.predictedChange > 0 ? `+${stock.predictedChange}%` : `${stock.predictedChange}%`) : '-'}
      </td>
      <td className="px-3 py-3 text-center">
        <span className={cn(
          "font-bold",
          (stock.mlConfidence ?? 0) >= 80 ? "text-green-400" :
            (stock.mlConfidence ?? 0) >= 60 ? "text-yellow-400" : "text-gray-400"
        )}>
          {stock.mlConfidence ? `${stock.mlConfidence}%` : '-'}
        </span>
      </td>
      <td className="px-3 py-3 text-center">
        <div className="flex flex-col items-center">
          <span className={cn(
            "font-bold text-lg leading-tight",
            stock.confidence >= 80 ? "text-green-400" :
              stock.confidence >= 60 ? "text-yellow-400" : "text-orange-400"
          )}>
            {(stock.confidence ?? 0).toFixed(1)}%
          </span>
          <div className="w-full h-1 bg-gray-700 rounded-full mt-1 overflow-hidden">
            <div
              className={cn(
                "h-full rounded-full transition-all duration-500",
                stock.confidence >= 80 ? "bg-green-400" :
                  stock.confidence >= 60 ? "bg-yellow-400" : "bg-orange-400"
              )}
              style={{ width: `${stock.confidence}%` }}
            />
          </div>
        </div>
      </td>
      <td className={cn("px-3 py-3 text-right font-bold", stock.targetPrice > 0 ? "text-green-400" : "text-gray-400")}>
        {stock.targetPrice > 0 ? (stock.market === 'japan' ? `¥${Math.round(stock.targetPrice).toLocaleString()}` : `$${stock.targetPrice.toFixed(2)}`) : '-'}
      </td>
      <td className="px-3 py-3">
        <div className="flex flex-col gap-1">
          <div className="flex items-start gap-2">
            <span className="mt-0.5 text-xs">
              {stock.reason?.includes('🚀') ? '🤖' : '📊'}
            </span>
            <span className="text-[#92adc9] text-[11px] leading-relaxed line-clamp-2" title={stock.reason}>
              {stock.reason || '理由を分析中...'}
            </span>
          </div>
        </div>
      </td>
    </>
  );
});

AISignalTableRow.displayName = 'AISignalTableRow';

function PerformanceDashboardContent() {
  const router = useRouter();
  const { setSelectedStock } = useUIStore();

  const {
    dualData, setDualData,
    activeTab, setActiveTab,
    market, setMarket,
    minWinRate, setMinWinRate,
    minProfitFactor, setMinProfitFactor,
    minConfidence, setMinConfidence,
    lookbackDays, setLookbackDays
  } = usePerformanceStore();

  const [data, setData] = useState<ScreenerResult<PerformanceScore> | ScreenerResult<AISignalResult> | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [autoRefresh, setAutoRefresh] = useState(false);

  // ソート
  const [sortField, setSortField] = useState<SortField>('rank');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');

  // 進捗状況
  const [progress, setProgress] = useState(0);

  // データ取得
  const fetchData = useCallback(async (forceRefresh: boolean = false) => {
    setLoading(true);
    setError(null);

    try {
      // 進捗シミュレーション開始
      setProgress(0);
      const progressInterval = setInterval(() => {
        setProgress(prev => Math.min(prev + (100 / (lookbackDays / 10)), 95));
      }, 1000);

      const params = new URLSearchParams({
        market,
        topN: '50',
        lookbackDays: lookbackDays.toString(),
        mode: 'dual-scan', // 常にデュアルスキャンして背景でデータを揃える
        debug: 'true',
        forceRefresh: forceRefresh.toString(),
      });

      params.append('minWinRate', minWinRate.toString());
      params.append('minProfitFactor', minProfitFactor.toString());
      params.append('minTrades', '3');
      params.append('minConfidence', minConfidence.toString());

      const response = await fetch(`/api/performance-screener?${params}`);

      clearInterval(progressInterval);
      setProgress(100);

      if (!response.ok) {
        throw new Error('Failed to fetch performance data');
      }

      const result = await response.json();

      if (result.success) {
        const dualResult = result.data as {
          performance: ScreenerResult<PerformanceScore>;
          aiSignals: ScreenerResult<AISignalResult>;
          dualMatches: DualMatchEntry[];
          dualMatchSymbols: string[];
        };
        setDualData(dualResult);

        // 互換性のために data も更新
        if (activeTab === 'performance') {
          setData(dualResult.performance);
        } else if (activeTab === 'ai-signals') {
          setData(dualResult.aiSignals);
        }
      } else {
        throw new Error(result.error || 'Unknown error');
      }
    } catch (err) {
      devError('Error fetching performance data:', err);
      setError(err instanceof Error ? err.message : 'Failed to load data');
    } finally {
      setLoading(false);
      // しばらくしてから進捗バーを消す
      setTimeout(() => setProgress(0), TIMEOUT.SHORT);
    }
  }, [market, minWinRate, minProfitFactor, lookbackDays, activeTab, minConfidence]);

  // 初回ロード（データがない場合のみ）
  useEffect(() => {
    // ユーザーの要望により、ページを開いたときは常に「デュアルマッチ」をデフォルトにする
    setActiveTab('dual-match');

    if (!dualData) {
      fetchData();
    }
  }, [fetchData, dualData, setActiveTab]);

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
  const sortedResults = useMemo(() => {
    const rawResults = activeTab === 'dual-match'
      ? dualData?.dualMatches.map(m => ({
        ...m.performance,
        confidence: m.aiSignal.confidence,
        aiSignalType: m.aiSignal.signalType,
        dualScore: m.dualScore
      }))
      : activeTab === 'performance' ? dualData?.performance.results : dualData?.aiSignals.results;

    if (!rawResults) return [];

    return [...rawResults].sort((a, b) => {
      // データの型判定
      const isPerfA = 'performanceScore' in a;
      const isPerfB = 'performanceScore' in b;

      if ((activeTab === 'performance' || activeTab === 'dual-match') && isPerfA && isPerfB) {
        const aScore = a as PerformanceScore;
        const bScore = b as PerformanceScore;
        let aVal: number | string = aScore[sortField as keyof PerformanceScore] as number | string;
        let bVal: number | string = bScore[sortField as keyof PerformanceScore] as number | string;

        if (sortField === 'symbol') {
          aVal = aScore.symbol;
          bVal = bScore.symbol;
        }

        if (typeof aVal === 'string' && typeof bVal === 'string') {
          return sortDirection === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
        }

        const nA = Number(aVal || 0);
        const nB = Number(bVal || 0);
        return sortDirection === 'asc' ? nA - nB : nB - nA;
      }

      if (activeTab === 'ai-signals' && !isPerfA && !isPerfB) {
        const aSig = a as AISignalResult;
        const bSig = b as AISignalResult;

        let aVal: number | string | undefined;
        let bVal: number | string | undefined;

        if (sortField === 'symbol') {
          aVal = aSig.symbol;
          bVal = bSig.symbol;
        } else if (sortField === 'confidence') {
          aVal = aSig.confidence;
          bVal = bSig.confidence;
        } else if (sortField === 'targetPrice') {
          aVal = aSig.targetPrice;
          bVal = bSig.targetPrice;
        } else if (sortField === 'totalReturn') {
          aVal = aSig.predictedChange ?? 0;
          bVal = bSig.predictedChange ?? 0;
        } else {
          aVal = aSig.confidence;
          bVal = bSig.confidence;
        }

        if (typeof aVal === 'string' && typeof bVal === 'string') {
          return sortDirection === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
        }

        const nA = Number(aVal || 0);
        const nB = Number(bVal || 0);
        return sortDirection === 'asc' ? nA - nB : nB - nA;
      }

      return 0;
    });
  }, [dualData, activeTab, sortField, sortDirection]);

  // 銘柄クリック処理
  const handleStockClick = useCallback((stock: PerformanceScore | AISignalResult) => {
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
  }, [router, setSelectedStock]);


  // ... (previous interfaces)

  // Progress component to isolate re-renders
  const LoadingProgress = ({ progress }: { progress: number }) => {
    if (progress <= 0 || progress >= 100) return null;
    return (
      <div className="w-full h-1 bg-[#101922] relative overflow-hidden shrink-0">
        <div
          className="absolute top-0 left-0 h-full bg-primary transition-all duration-300 ease-out shadow-[0_0_8px_rgba(var(--primary-rgb),0.6)]"
          style={{ width: `${progress}%` }}
        />
      </div>
    );
  };

  // ... (Dashboard component start)

  return (
    <div className="flex flex-col h-full bg-[#101922] text-white overflow-hidden">
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
            onClick={() => fetchData(true)}
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

      {/* Progress Bar (Isolated) */}
      <LoadingProgress progress={progress} />

      <div className="flex flex-1 overflow-hidden">
        {/* サイドバー - フィルター (unchanged) */}
        <aside className="w-72 bg-[#111a22] border-r border-[#233648] flex flex-col overflow-y-auto shrink-0">
          <div className="p-5 flex flex-col gap-6">
            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-white text-base font-bold">フィルター設定</h3>
                <button
                  onClick={() => usePerformanceStore.getState().resetSettings()}
                  className="text-[10px] text-[#92adc9] hover:text-white underline transition-colors"
                >
                  リセット
                </button>
              </div>

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

              {/* モード別フィルター */}
              {/* モード別フィルター */}
              {(activeTab === 'performance' || activeTab === 'dual-match') && (
                <>
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
                </>
              )}

              {(activeTab === 'ai-signals' || activeTab === 'dual-match') && (
                // AIシグナルモード・デュアルマッチ: 最小信頼度
                <div className="flex flex-col gap-2 mb-4">
                  <div className="flex justify-between items-center">
                    <label className="text-xs text-[#92adc9] font-bold">最小信頼度</label>
                    <span className="text-xs text-primary font-black">{minConfidence}%</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    step="5"
                    value={minConfidence}
                    onChange={(e) => setMinConfidence(parseInt(e.target.value))}
                    className="w-full accent-primary h-1.5 bg-[#192633] rounded-lg appearance-none cursor-pointer"
                  />
                </div>
              )}

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
                  <option value={365}>1年</option>
                  <option value={730}>2年</option>
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

        {/* メインコンテンツ - テーブル (Virtualized) */}
        <main className="flex-1 overflow-hidden flex flex-col bg-[#0b1219] relative">
          {/* ... (tabs) ... */}
          <div className="flex items-center gap-1 border-b border-[#233648] bg-[#101922] px-4 pt-2">
            <button
              onClick={() => setActiveTab('dual-match')}
              className={cn(
                "px-6 py-3 text-sm font-bold border-b-2 transition-all relative overflow-hidden group",
                activeTab === 'dual-match'
                  ? "border-orange-500 text-orange-400 bg-orange-500/5"
                  : "border-transparent text-[#92adc9] hover:text-white hover:bg-[#192633]"
              )}
            >
              <span className="relative z-10 flex items-center gap-2">
                <span>🔥</span>
                デュアルマッチ
                {dualData?.dualMatches && (
                  <span className="bg-orange-500/20 text-orange-400 px-1.5 py-0.5 rounded text-[10px]">
                    {dualData.dualMatches.length}
                  </span>
                )}
              </span>
              {activeTab === 'dual-match' && (
                <div className="absolute inset-x-0 bottom-0 h-full bg-gradient-to-t from-orange-500/10 to-transparent opacity-50" />
              )}
            </button>

            <button
              onClick={() => setActiveTab('performance')}
              className={cn(
                "px-6 py-3 text-sm font-bold border-b-2 transition-all",
                activeTab === 'performance'
                  ? "border-primary text-primary bg-primary/5"
                  : "border-transparent text-[#92adc9] hover:text-white hover:bg-[#192633]"
              )}
            >
              パフォーマンス
            </button>

            <button
              onClick={() => setActiveTab('ai-signals')}
              className={cn(
                "px-6 py-3 text-sm font-bold border-b-2 transition-all",
                activeTab === 'ai-signals'
                  ? "border-purple-500 text-purple-400 bg-purple-500/5"
                  : "border-transparent text-[#92adc9] hover:text-white hover:bg-[#192633]"
              )}
            >
              AIシグナル
            </button>
          </div>

          {/* テーブルエリア */}
          <div className="flex-1 relative">
            {error ? (
              <div className="absolute inset-0 flex items-center justify-center text-red-400">
                <div className="text-center">
                  <p className="text-lg font-bold mb-2">エラーが発生しました</p>
                  <p className="text-sm opacity-80">{error}</p>
                  <button
                    onClick={() => fetchData(true)}
                    className="mt-4 px-4 py-2 bg-red-500/20 text-red-400 rounded hover:bg-red-500/30 transition-colors"
                  >
                    再試行
                  </button>
                </div>
              </div>
            ) : !sortedResults || sortedResults.length === 0 ? (
              <div className="absolute inset-0 flex items-center justify-center text-[#55697f]">
                <div className="text-center">
                  <div className="text-4xl mb-4 opacity-50">📊</div>
                  <p className="text-lg font-bold">データがありません</p>
                  <p className="text-sm opacity-70 mt-2">条件を変更して更新してください</p>
                </div>
              </div>
            ) : (
              <TableVirtuoso
                style={{ height: '100%', width: '100%' }}
                data={sortedResults}
                components={{
                  TableRow: ({ children, ...props }: any) => {
                    const index = props['data-item-index'];
                    const stock = sortedResults[index];
                    if (!stock) return <tr {...props}>{children}</tr>;

                    // 行スタイルとクリックハンドラをここに集約
                    const isDualMatch = activeTab === 'dual-match';

                    return (
                      <tr
                        {...props}
                        className={cn(
                          "hover:bg-[#192633] cursor-pointer transition-colors relative",
                          isDualMatch && "bg-orange-500/5 hover:bg-orange-500/10"
                        )}
                        onClick={() => handleStockClick(stock)}
                      >
                        {children}
                      </tr>
                    );
                  }
                }}
                fixedHeaderContent={() => (
                  <tr className="bg-[#101922] text-[#92adc9] text-xs font-bold sticky top-0 z-10 shadow-sm border-b border-[#233648]">
                    <th className="px-3 py-3 w-12 text-center cursor-pointer hover:text-white hover:bg-[#192633] transition-colors" onClick={() => handleSort('rank')}>
                      # {sortField === 'rank' && (sortDirection === 'asc' ? '▲' : '▼')}
                    </th>
                    <th className="px-3 py-3 text-left cursor-pointer hover:text-white hover:bg-[#192633] transition-colors" onClick={() => handleSort('symbol')}>
                      銘柄 {sortField === 'symbol' && (sortDirection === 'asc' ? '▲' : '▼')}
                    </th>
                    <th className="px-3 py-3 text-left w-48">名称</th>
                    <th className="px-3 py-3 text-left w-20">市場</th>
                    {activeTab === 'ai-signals' ? (
                      <>
                        <th className="px-3 py-3 text-left w-24">シグナル</th>
                        <th className="px-3 py-3 text-right cursor-pointer hover:text-white hover:bg-[#192633] transition-colors" onClick={() => handleSort('totalReturn')}>
                          予測変動 {sortField === 'totalReturn' && (sortDirection === 'asc' ? '▲' : '▼')}
                        </th>
                        <th className="px-3 py-3 text-center cursor-pointer hover:text-white hover:bg-[#192633] transition-colors" onClick={() => handleSort('confidence')}>
                          AI確信度 {sortField === 'confidence' && (sortDirection === 'asc' ? '▲' : '▼')}
                        </th>
                        <th className="px-3 py-3 text-center cursor-pointer hover:text-white hover:bg-[#192633] transition-colors" onClick={() => handleSort('confidence')}>
                          信頼性
                        </th>
                        <th className="px-3 py-3 text-right cursor-pointer hover:text-white hover:bg-[#192633] transition-colors" onClick={() => handleSort('targetPrice')}>
                          目標株価 {sortField === 'targetPrice' && (sortDirection === 'asc' ? '▲' : '▼')}
                        </th>
                        <th className="px-3 py-3 text-left max-w-xs">AI分析理由</th>
                      </>
                    ) : (
                      <>
                        <th className="px-3 py-3 text-center cursor-pointer hover:text-white hover:bg-[#192633] transition-colors" onClick={() => handleSort('performanceScore')}>
                          {activeTab === 'dual-match' ? 'Dual Score' : 'スコア'} {sortField === 'performanceScore' && (sortDirection === 'asc' ? '▲' : '▼')}
                        </th>
                        <th className="px-3 py-3 text-right cursor-pointer hover:text-white hover:bg-[#192633] transition-colors" onClick={() => handleSort('winRate')}>
                          勝率 {sortField === 'winRate' && (sortDirection === 'asc' ? '▲' : '▼')}
                        </th>
                        <th className="px-3 py-3 text-right cursor-pointer hover:text-white hover:bg-[#192633] transition-colors" onClick={() => handleSort('profitFactor')}>
                          PF {sortField === 'profitFactor' && (sortDirection === 'asc' ? '▲' : '▼')}
                        </th>
                        <th className="px-3 py-3 text-right cursor-pointer hover:text-white hover:bg-[#192633] transition-colors" onClick={() => handleSort('totalReturn')}>
                          収益率 {sortField === 'totalReturn' && (sortDirection === 'asc' ? '▲' : '▼')}
                        </th>
                        <th className="px-3 py-3 text-right cursor-pointer hover:text-white hover:bg-[#192633] transition-colors" onClick={() => handleSort('sharpeRatio')}>
                          SR {sortField === 'sharpeRatio' && (sortDirection === 'asc' ? '▲' : '▼')}
                        </th>
                        <th className="px-3 py-3 text-center w-20">取引数</th>
                        {activeTab === 'dual-match' && (
                          <>
                            <th className="px-3 py-3 text-center w-20">AI判定</th>
                            <th className="px-3 py-3 text-center w-24">信頼度</th>
                          </>
                        )}
                      </>
                    )}
                  </tr>
                )}
                itemContent={(index: number, stock: any) => {
                  if (activeTab === 'ai-signals') {
                    return (
                      <AISignalTableRow
                        stock={stock as AISignalResult}
                        isDualMatch={false}
                        onClick={handleStockClick}
                      />
                    );
                  }
                  return (
                    <PerformanceTableRow
                      stock={stock as PerformanceScore}
                      isDualMatch={activeTab === 'dual-match'}
                      activeTab={activeTab}
                      onClick={handleStockClick}
                    />
                  );
                }}
              />
            )}
          </div>
        </main>
      </div>
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
