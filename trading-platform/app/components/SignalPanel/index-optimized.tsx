/**
 * SignalPanel/index-optimized.tsx
 * 
 * 最適化版 SignalPanel コンポーネント
 * - Web Worker を使用したバックテスト計算
 * - メモ化パターンによるパラメータキャッシュ
 * - 進捗表示付き非同期処理
 */

import { useState, useMemo, useEffect, useCallback } from 'react';
import { Stock, Signal, OHLCV } from '@/app/types';
import { cn, getConfidenceColor, getWebSocketUrl } from '@/app/lib/utils';
import { BacktestResult } from '@/app/types';
import { useAIStore } from '@/app/store/aiStore';
import { useWebSocket } from '@/app/hooks/useWebSocket';
import { useBacktestWorker } from '@/app/hooks/useBacktestWorker';
import { SignalCard } from '../SignalCard';
import { useSignalAlerts } from '@/app/hooks/useSignalAlerts';
import { useAIPerformance } from '@/app/hooks/useAIPerformance';
import { BacktestView } from './BacktestView';
import { ForecastView } from './ForecastView';
import { AIPerformanceView } from './AIPerformanceView';

interface SignalPanelProps {
  stock: Stock;
  signal: Signal | null;
  ohlcv?: OHLCV[];
  loading?: boolean;
}

export function SignalPanel({ stock, signal, ohlcv = [], loading = false }: SignalPanelProps) {
  const [activeTab, setActiveTab] = useState<'signal' | 'backtest' | 'ai' | 'forecast'>('signal');
  const { aiStatus, processAITrades } = useAIStore();

  // Custom Hooks
  const { preciseHitRate, calculatingHitRate, error } = useAIPerformance(stock, ohlcv);

  // Web Worker hook for backtest
  const {
    runBacktest: runBacktestAsync,
    cancelBacktest,
    isRunning: isBacktesting,
    progress: backtestProgress,
    currentStep: backtestStep,
    error: backtestError
  } = useBacktestWorker();

  // Use dynamic WebSocket URL for better security and flexibility
  const { status: wsStatus, lastMessage, connect, disconnect, reconnect } = useWebSocket(getWebSocketUrl('/ws/signals'));
  const [liveSignal, setLiveSignal] = useState<Signal | null>(null);

  // Show WebSocket status in console for debugging
  useEffect(() => {
    // console.log('WebSocket status:', wsStatus);
  }, [wsStatus]);

  useEffect(() => {
    if (lastMessage && lastMessage.type === 'SIGNAL_UPDATE') {
      const data = lastMessage.data as { symbol: string } | undefined;
      if (data && data.symbol === stock.symbol) {
        setLiveSignal(lastMessage.data as Signal);
      }
    }
  }, [lastMessage, stock.symbol]);

  // Reset live signal when stock changes
  useEffect(() => {
    setLiveSignal(null);
  }, [stock.symbol]);

  const displaySignal = liveSignal || signal;

  // Alert Logic Hook
  useSignalAlerts({
      stock,
      displaySignal,
      preciseHitRate: preciseHitRate || { hitRate: 0, trades: 0 },
      calculatingHitRate
  });

  // 自動売買プロセスをトリガー
  useEffect(() => {
    if (displaySignal && stock.price) {
      processAITrades(stock.symbol, stock.price, displaySignal);
    }
  }, [stock.symbol, stock.price, displaySignal, processAITrades]);

  // Backtest state
  const [backtestResult, setBacktestResult] = useState<BacktestResult | null>(null);

  // Reset backtest when stock changes
  useEffect(() => {
    setBacktestResult(null);
    // Cancel any running backtest
    cancelBacktest();
  }, [stock.symbol, cancelBacktest]);

  // Run backtest using Web Worker when tab is selected
  useEffect(() => {
    if (loading) return;
    if (activeTab !== 'backtest') return;
    if (backtestResult) return; // Already have results
    if (isBacktesting) return; // Already running

    if (!ohlcv || ohlcv.length === 0) {
      // Empty result for no data
      setBacktestResult({
        symbol: stock.symbol,
        totalTrades: 0,
        winningTrades: 0,
        losingTrades: 0,
        winRate: 0,
        totalReturn: 0,
        avgProfit: 0,
        avgLoss: 0,
        profitFactor: 0,
        maxDrawdown: 0,
        sharpeRatio: 0,
        trades: [],
        startDate: new Date().toISOString(),
        endDate: new Date().toISOString()
      });
      return;
    }

    // Run backtest asynchronously using Web Worker
    const executeBacktest = async () => {
      try {
        const result = await runBacktestAsync(stock.symbol, ohlcv, stock.market);
        setBacktestResult(result);
      } catch (e) {
        console.error("Backtest failed:", e);
        // Set empty result on error
        setBacktestResult({
          symbol: stock.symbol,
          totalTrades: 0,
          winningTrades: 0,
          losingTrades: 0,
          winRate: 0,
          totalReturn: 0,
          avgProfit: 0,
          avgLoss: 0,
          profitFactor: 0,
          maxDrawdown: 0,
          sharpeRatio: 0,
          trades: [],
          startDate: new Date().toISOString(),
          endDate: new Date().toISOString()
        });
      }
    };

    executeBacktest();

    // Cleanup: cancel backtest on unmount or tab change
    return () => {
      cancelBacktest();
    };
  }, [activeTab, backtestResult, isBacktesting, ohlcv, stock.symbol, stock.market, loading, runBacktestAsync, cancelBacktest]);

  const aiTrades = useMemo(() => {
    return aiStatus.trades.filter(t => t.symbol === stock.symbol);
  }, [aiStatus.trades, stock.symbol]);

  if (loading || !displaySignal) {
    return (
      <div className="bg-[#141e27] p-4 flex flex-col gap-3 h-full">
        <div className="flex justify-between items-center text-xs">
          <div className="h-4 w-24 bg-[#233648] rounded animate-pulse" />
          <div className="h-4 w-12 bg-[#233648] rounded animate-pulse" />
        </div>
        <div className="flex-1 bg-[#192633]/50 rounded-lg border border-[#233648] animate-pulse flex items-center justify-center">
          <span className="text-[#92adc9]/50 text-xs">市場データを分析中...</span>
        </div>
      </div>
    );
  }

  // Helper for tab props to ensure accessibility and DRY
  const getTabProps = (tabName: 'signal' | 'backtest' | 'ai' | 'forecast', label: string) => ({
    role: 'tab',
    id: `tab-${tabName}`,
    'aria-selected': activeTab === tabName,
    'aria-controls': `panel-${tabName}`,
    tabIndex: activeTab === tabName ? 0 : -1,
    onClick: () => setActiveTab(tabName),
    className: cn(
      'px-3 py-1 text-xs font-medium rounded transition-colors focus:outline-none focus:ring-2 focus:ring-[#233648]',
      activeTab === tabName ? 'bg-[#233648] text-white' : 'text-[#92adc9] hover:text-white'
    ),
    children: label
  });

  return (
    <div className="bg-[#141e27] p-4 flex flex-col gap-3 h-full">
      {/* Tabs */}
      <div className="flex gap-1 border-b border-[#233648] pb-2" role="tablist">
        <button {...getTabProps('signal', 'シグナル')} />
        <button {...getTabProps('backtest', 'バックテスト')} />
        <button {...getTabProps('ai', 'AIパフォーマンス')} />
        <button {...getTabProps('forecast', '予測')} />
      </div>

      {/* Signal Tab */}
      {activeTab === 'signal' && (
        <div className="flex-1 flex flex-col gap-3">
          <SignalCard signal={displaySignal} stock={stock} />
          
          {preciseHitRate && (
            <div className="bg-[#192633] rounded-lg p-3 border border-[#233648]">
              <div className="flex justify-between items-center mb-2">
                <span className="text-xs text-[#92adc9]">AI予測精度</span>
                <span className={cn(
                  'text-sm font-bold',
                  getConfidenceColor(preciseHitRate.hitRate)
                )}>
                  {preciseHitRate.hitRate.toFixed(1)}%
                </span>
              </div>
              <div className="text-xs text-[#92adc9]">
                検証済みトレード: {preciseHitRate.trades}件
              </div>
            </div>
          )}
        </div>
      )}

      {/* Backtest Tab with Progress */}
      {activeTab === 'backtest' && (
        <div className="flex-1 flex flex-col">
          {isBacktesting ? (
            <div className="flex-1 flex flex-col items-center justify-center gap-4">
              <div className="w-full max-w-xs">
                <div className="flex justify-between text-xs text-[#92adc9] mb-2">
                  <span>{backtestStep}</span>
                  <span>{backtestProgress}%</span>
                </div>
                <div className="h-2 bg-[#233648] rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-blue-500 transition-all duration-300"
                    style={{ width: `${backtestProgress}%` }}
                  />
                </div>
              </div>
              <p className="text-xs text-[#92adc9]">バックテスト実行中...</p>
            </div>
          ) : backtestResult ? (
            <BacktestView backtestResult={backtestResult} />
          ) : (
            <div className="flex-1 flex items-center justify-center text-[#92adc9]">
              データがありません
            </div>
          )}
          
          {backtestError && (
            <div className="mt-2 p-2 bg-red-500/20 border border-red-500/50 rounded text-xs text-red-400">
              エラー: {backtestError}
            </div>
          )}
        </div>
      )}

      {/* AI Performance Tab */}
      {activeTab === 'ai' && (
        <div className="flex-1">
          <AIPerformanceView
            aiStatus={aiStatus}
            stock={stock}
            aiTrades={aiTrades}
          />
        </div>
      )}

      {/* Forecast Tab */}
      {activeTab === 'forecast' && (
        <div className="flex-1">
          <ForecastView signal={displaySignal} stock={stock} />
        </div>
      )}
    </div>
  );
}

export default SignalPanel;
