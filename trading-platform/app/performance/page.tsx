'use client';

/**
 * Performance Screener Dashboard
 * 
 * 全監視銘柄から最適な戦略を持つ銘柄を表示
 * - 直近3ヶ月のパフォーマンスをスキャン
 * - 勝率・利益率・シャープレシオで総合評価
 * - AIシグナルスクリーニングもサポート
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Navigation } from '@/app/components/Navigation';
import { cn, formatPercent } from '@/app/lib/utils';
import { useUIStore } from '@/app/store/uiStore';
import { useWatchlistStore } from '@/app/store/watchlistStore';
import { ErrorBoundary } from '@/app/components/ErrorBoundary';
import { ScreenLabel } from '@/app/components/ScreenLabel';
import { AISignalResult, DualMatchEntry } from '@/app/lib/PerformanceScreenerService';
import { Signal } from '../types';
import { mlTrainingService, type TrainingMetrics, type ModelState } from '@/app/lib/services/MLTrainingService';
import { fetchOHLCV } from '@/app/data/stocks';

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

function PerformanceDashboardContent() {
  const router = useRouter();
  const { setSelectedStock } = useUIStore();

  const [data, setData] = useState<ScreenerResult<PerformanceScore> | ScreenerResult<AISignalResult> | null>(null);
  const [dualData, setDualData] = useState<{
    performance: ScreenerResult<PerformanceScore>;
    aiSignals: ScreenerResult<AISignalResult>;
    dualMatches: DualMatchEntry[];
    dualMatchSymbols: string[];
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // タブ
  const [activeTab, setActiveTab] = useState<'performance' | 'ai-signals' | 'dual-match'>('dual-match');

  // フィルター
  const [market, setMarket] = useState<'all' | 'japan' | 'usa'>('all');
  const [minWinRate, setMinWinRate] = useState(30);
  const [minProfitFactor, setMinProfitFactor] = useState(0.5);
  const [lookbackDays, setLookbackDays] = useState(180);
  const [autoRefresh, setAutoRefresh] = useState(false);

  // AIシグナル用フィルター
  const [minConfidence, setMinConfidence] = useState(60);

  // ソート
  const [sortField, setSortField] = useState<SortField>('rank');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');

  // 進捗状況
  const [progress, setProgress] = useState(0);

  // ML訓練状態
  const [mlModelState, setMlModelState] = useState<ModelState>({
    isTrained: false,
    metrics: null,
    modelVersion: '0.0.0',
  });
  const [trainingProgress, setTrainingProgress] = useState(0);
  const [isTraining, setIsTraining] = useState(false);
  const [trainingError, setTrainingError] = useState<string | null>(null);
  const trainingRef = useRef(false);

  // 保存済みモデルの自動読み込み
  useEffect(() => {
    mlTrainingService.loadModel('trader-pro-main').then((loaded) => {
      if (loaded) {
        setMlModelState(mlTrainingService.getState());
      }
    }).catch(() => { /* IndexedDB未対応環境ではスキップ */ });
  }, []);

  // モデル訓練ハンドラー
  const handleTrainModel = useCallback(async () => {
    if (trainingRef.current) return;
    trainingRef.current = true;
    setIsTraining(true);
    setTrainingProgress(0);
    setTrainingError(null);

    try {
      // 訓練用データを取得（トヨタ: 代表的な銘柄で訓練）
      const trainingSymbols = ['7203.T', 'AAPL', '9984.T', 'MSFT', '6758.T'];
      let allData: import('@/app/types').OHLCV[] = [];

      for (let i = 0; i < trainingSymbols.length; i++) {
        setTrainingProgress(Math.round((i / trainingSymbols.length) * 10));
        try {
          const sym = trainingSymbols[i];
          const market = sym.endsWith('.T') ? 'japan' as const : 'usa' as const;
          const data = await fetchOHLCV(sym, market, 100);
          if (data.length > 50) {
            allData = [...allData, ...data];
          }
        } catch {
          // 個別銘柄の取得失敗はスキップ
        }
      }

      if (allData.length < 200) {
        throw new Error(`訓練データ不足: ${allData.length}件（最低200件必要）`);
      }

      // 訓練実行
      await mlTrainingService.train(allData, (p) => {
        setTrainingProgress(10 + Math.round(p * 0.9));
      });

      // モデル保存
      await mlTrainingService.saveModel('trader-pro-main');
      setMlModelState(mlTrainingService.getState());
      setTrainingProgress(100);
    } catch (err) {
      setTrainingError(err instanceof Error ? err.message : '訓練に失敗しました');
    } finally {
      setIsTraining(false);
      trainingRef.current = false;
    }
  }, []);

  // データ取得
  const fetchData = useCallback(async () => {
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
      console.error('Error fetching performance data:', err);
      setError(err instanceof Error ? err.message : 'Failed to load data');
    } finally {
      setLoading(false);
      // しばらくしてから進捗バーを消す
      setTimeout(() => setProgress(0), 1000);
    }
  }, [market, minWinRate, minProfitFactor, lookbackDays, activeTab, minConfidence]);

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
  const sortedResults = (() => {
    const rawResults = activeTab === 'dual-match'
      ? dualData?.dualMatches.map(m => ({
        ...m.performance,
        confidence: m.aiSignal.confidence,
        aiSignalType: m.aiSignal.signalType
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
        let aVal: any = aScore[sortField as keyof PerformanceScore];
        let bVal: any = bScore[sortField as keyof PerformanceScore];

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

        let aVal: any;
        let bVal: any;

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
  })();

  // 銘柄クリック処理
  const handleStockClick = (stock: PerformanceScore | AISignalResult) => {
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

      {/* Progress Bar */}
      {progress > 0 && (
        <div className="w-full h-1 bg-[#101922] relative overflow-hidden shrink-0">
          <div
            className="absolute top-0 left-0 h-full bg-primary transition-all duration-300 ease-out shadow-[0_0_8px_rgba(var(--primary-rgb),0.6)]"
            style={{ width: `${progress}%` }}
          />
        </div>
      )}

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

              {/* モード別フィルター */}
              {activeTab === 'performance' ? (
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
              ) : (
                // AIシグナルモード: 最小信頼度
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

            {/* AI訓練セクション */}
            <div className="p-3 bg-[#0d2137] rounded-lg border border-[#1a3a5c]">
              <h4 className="text-xs font-bold text-primary mb-3 flex items-center gap-1.5">
                <span>🧠</span> AIモデル訓練
              </h4>

              {/* モデル状態表示 */}
              {mlModelState.isTrained ? (
                <div className="space-y-2 mb-3">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                    <span className="text-[11px] text-green-400 font-bold">訓練済みモデル稼働中</span>
                  </div>
                  {mlModelState.metrics && (
                    <div className="space-y-1 text-[11px] text-[#92adc9]">
                      <div className="flex justify-between">
                        <span>検証精度:</span>
                        <span className={cn(
                          "font-bold",
                          (mlModelState.metrics.valAccuracy * 100) >= 55 ? "text-green-400" : "text-yellow-400"
                        )}>
                          {(mlModelState.metrics.valAccuracy * 100).toFixed(1)}%
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>訓練サンプル:</span>
                        <span className="text-white font-bold">{mlModelState.metrics.trainSamples}件</span>
                      </div>
                      <div className="flex justify-between">
                        <span>最終訓練:</span>
                        <span className="text-white font-bold text-[10px]">
                          {new Date(mlModelState.metrics.trainedAt).toLocaleDateString('ja-JP')}
                        </span>
                      </div>
                      {mlModelState.metrics.walkForwardAccuracy !== undefined && (
                        <div className="flex justify-between">
                          <span>Walk-Forward:</span>
                          <span className={cn(
                            "font-bold",
                            (mlModelState.metrics.walkForwardAccuracy * 100) >= 55 ? "text-green-400" : "text-yellow-400"
                          )}>
                            {(mlModelState.metrics.walkForwardAccuracy * 100).toFixed(1)}%
                          </span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex items-center gap-1.5 mb-3">
                  <span className="w-2 h-2 rounded-full bg-gray-500" />
                  <span className="text-[11px] text-gray-400">モデル未訓練（ルールベース稼働）</span>
                </div>
              )}

              {/* 訓練進捗バー */}
              {isTraining && (
                <div className="mb-3">
                  <div className="w-full h-1.5 bg-[#101922] rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-blue-500 to-purple-500 transition-all duration-500 ease-out"
                      style={{ width: `${trainingProgress}%` }}
                    />
                  </div>
                  <p className="text-[10px] text-[#92adc9] mt-1 text-center">
                    訓練中... {trainingProgress}%
                  </p>
                </div>
              )}

              {/* エラー表示 */}
              {trainingError && (
                <p className="text-[10px] text-red-400 mb-2">{trainingError}</p>
              )}

              {/* 訓練ボタン */}
              <button
                onClick={handleTrainModel}
                disabled={isTraining}
                className={cn(
                  "w-full py-2 rounded-lg text-xs font-bold transition-all",
                  isTraining
                    ? "bg-gray-700 text-gray-400 cursor-not-allowed"
                    : "bg-gradient-to-r from-blue-600 to-purple-600 text-white hover:from-blue-500 hover:to-purple-500 shadow-lg shadow-blue-900/30"
                )}
              >
                {isTraining ? '🔄 訓練中...' : mlModelState.isTrained ? '🔄 再訓練' : '🚀 AIモデルを訓練'}
              </button>
            </div>
          </div>
        </aside>

        {/* メインコンテンツ */}
        <main className="flex-1 flex flex-col min-w-0 bg-[#101922]">
          <div className="flex flex-col gap-4 px-6 py-5 border-b border-[#233648]/50">
            <h1 className="text-white tracking-tight text-2xl font-bold leading-tight">
              現在の相場に最もフィットしている銘柄
            </h1>
            <p className="text-[#92adc9] text-sm">
              {activeTab === 'dual-match'
                ? '過去の実績も良く、AI予測でも高信頼度な最強候補銘柄'
                : activeTab === 'performance'
                  ? `直近${lookbackDays}日間のバックテスト結果に基づく総合ランキング`
                  : 'AI-derived buy signals with confidence scoring'
              }
            </p>

            {/* Tabs */}
            <div className="flex gap-2">
              <button
                onClick={() => setActiveTab('dual-match')}
                className={cn(
                  "px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2",
                  activeTab === 'dual-match'
                    ? "bg-gradient-to-r from-orange-500 to-yellow-500 text-white shadow-lg shadow-orange-900/20"
                    : "bg-[#192633] text-[#92adc9] hover:text-white"
                )}
              >
                <span>🔥</span> デュアルマッチ
              </button>
              <button
                onClick={() => setActiveTab('performance')}
                className={cn(
                  "px-4 py-2 rounded-lg text-sm font-medium transition-all",
                  activeTab === 'performance'
                    ? "bg-primary text-white"
                    : "bg-[#192633] text-[#92adc9] hover:text-white"
                )}
              >
                パフォーマンス
              </button>
              <button
                onClick={() => setActiveTab('ai-signals')}
                className={cn(
                  "px-4 py-2 rounded-lg text-sm font-medium transition-all",
                  activeTab === 'ai-signals'
                    ? "bg-primary text-white"
                    : "bg-[#192633] text-[#92adc9] hover:text-white"
                )}
              >
                AIシグナル
              </button>
            </div>
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
                <p className="text-[#92adc9]">
                  {activeTab === 'dual-match'
                    ? 'パフォーマンス・AIの両方で高評価な銘柄は現在ありません'
                    : activeTab === 'performance'
                      ? '条件に一致する銘柄が見つかりませんでした'
                      : '信頼度60%以上のBUYシグナルが見つかりませんでした'
                  }
                </p>
              </div>
            )}

            {!loading && !error && sortedResults.length > 0 && (
              <div className="min-w-[1000px] lg:min-w-0">
                {/* Performance or Dual Match Table */}
                {(activeTab === 'performance' || activeTab === 'dual-match') && (
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
                        {activeTab === 'dual-match' && (
                          <>
                            <th className="px-3 py-3 w-20 text-center">AI信号</th>
                            <th className="px-3 py-3 w-20 text-center cursor-pointer hover:text-white" onClick={() => handleSort('confidence')}>
                              信頼度 {sortField === 'confidence' && (sortDirection === 'asc' ? '↑' : '↓')}
                            </th>
                          </>
                        )}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#233648]/50">
                      {(sortedResults as PerformanceScore[]).map((stock) => {
                        const isDualMatch = dualData?.dualMatchSymbols.includes(stock.symbol);
                        return (
                          <tr
                            key={stock.symbol}
                            className={cn(
                              "hover:bg-[#192633] cursor-pointer transition-colors relative",
                              isDualMatch && "bg-orange-500/5 hover:bg-orange-500/10"
                            )}
                            onClick={() => handleStockClick(stock)}
                          >
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
                              <span className={cn("font-bold text-lg", getScoreColor(stock.performanceScore || 0))}>
                                {(stock.performanceScore || 0).toFixed(1)}
                              </span>
                            </td>
                            <td className={cn("px-3 py-3 text-right font-bold", getScoreColor(stock.winRate ?? 0))}>
                              {(stock.winRate ?? 0).toFixed(1)}%
                            </td>
                            <td className={cn("px-3 py-3 text-right font-bold", getScoreColor((stock.profitFactor ?? 0) * 33.3))}>
                              {(stock.profitFactor ?? 0).toFixed(2)}
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
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                )}

                {/* AI Signals Table */}
                {activeTab === 'ai-signals' && (
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
                        <th className="px-3 py-3 w-16">信号</th>
                        <th className="px-3 py-3 w-24 text-right cursor-pointer hover:text-white" onClick={() => handleSort('totalReturn')}>
                          AI予測 {sortField === 'totalReturn' && (sortDirection === 'asc' ? '↑' : '↓')}
                        </th>
                        <th className="px-3 py-3 w-20 text-center cursor-pointer hover:text-white" onClick={() => handleSort('sharpeRatio')}>
                          ML信頼度 {sortField === 'sharpeRatio' && (sortDirection === 'asc' ? '↑' : '↓')}
                        </th>
                        <th className="px-3 py-3 w-20 text-center cursor-pointer hover:text-white" onClick={() => handleSort('confidence')}>
                          総合信頼度 {sortField === 'confidence' && (sortDirection === 'asc' ? '↑' : '↓')}
                        </th>
                        <th className="px-3 py-3 w-24 text-right cursor-pointer hover:text-white" onClick={() => handleSort('targetPrice')}>
                          目標価格 {sortField === 'targetPrice' && (sortDirection === 'asc' ? '↑' : '↓')}
                        </th>
                        <th className="px-3 py-3">シグナル説明 / AI考察</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#233648]/50">
                      {(sortedResults as AISignalResult[]).map((stock) => {
                        const isDualMatch = dualData?.dualMatchSymbols.includes(stock.symbol);
                        return (
                          <tr
                            key={stock.symbol}
                            className={cn(
                              "hover:bg-[#192633] cursor-pointer transition-colors relative",
                              isDualMatch && "bg-orange-500/5 hover:bg-orange-500/10"
                            )}
                            onClick={() => handleStockClick(stock)}
                          >
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
                              {stock.predictedChange ? (stock.predictedChange > 0 ? `+${stock.predictedChange}%` : `${stock.predictedChange}%`) : '-'}
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
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                )}
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
