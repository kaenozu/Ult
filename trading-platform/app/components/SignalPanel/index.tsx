import { useState, useMemo, useEffect, useCallback } from 'react';
import { Stock, Signal, OHLCV, PaperTrade } from '@/app/types';
import { cn, getConfidenceColor, getWebSocketUrl } from '@/app/lib/utils';
import { runBacktest, BacktestResult } from '@/app/lib/backtest';
import { useAIStore } from '@/app/store/aiStore';
import { useWebSocket } from '@/app/hooks/useWebSocket';
import { SignalCard } from '../SignalCard';
import { useSignalAlerts } from '@/app/hooks/useSignalAlerts';
import { useAIPerformance } from '@/app/hooks/useAIPerformance';
import { BacktestView } from './BacktestView';
import { ForecastView } from './ForecastView';
import { AIPerformanceView } from './AIPerformanceView';
import { usePerformanceMonitor } from '@/app/lib/performance';

interface SignalPanelProps {
  stock: Stock;
  signal: Signal | null;
  ohlcv?: OHLCV[];
  loading?: boolean;
}

export function SignalPanel({ stock, signal, ohlcv = [], loading = false }: SignalPanelProps) {
  // Performance monitoring
  const { measure, measureAsync } = usePerformanceMonitor('SignalPanel');
  
  const [activeTab, setActiveTab] = useState<'signal' | 'backtest' | 'ai' | 'forecast'>('signal');
  const { aiStatus: aiStateString, processAITrades, trades } = useAIStore();


  // Custom Hooks
  const { preciseHitRate, calculatingHitRate, error } = useAIPerformance(stock, ohlcv);

  // Use dynamic WebSocket URL for better security and flexibility
  const { status: wsStatus, lastMessage, connect, disconnect, reconnect } = useWebSocket(getWebSocketUrl('/ws/signals'));
  const [liveSignal, setLiveSignal] = useState<Signal | null>(null);

  // Show WebSocket status in console for debugging
  useEffect(() => {
    // console.log('WebSocket status:', wsStatus);
  }, [wsStatus]);

  // Memoized WebSocket message handler
  const handleWebSocketMessage = useCallback(() => {
    if (lastMessage && lastMessage.type === 'SIGNAL_UPDATE') {
      const data = lastMessage.data as { symbol: string } | undefined;
      if (data && data.symbol === stock.symbol) {
        setLiveSignal(lastMessage.data as Signal);
      }
    }
  }, [lastMessage, stock.symbol]);

  useEffect(() => {
    handleWebSocketMessage();
  }, [handleWebSocketMessage]);

  // Reset live signal when stock changes
  useEffect(() => {
    setLiveSignal(null);
  }, [stock.symbol]);

  const displaySignal = liveSignal || signal;

  // Alert Logic Hook
  useSignalAlerts({
    stock,
    displaySignal,
    preciseHitRate: { hitRate: preciseHitRate?.hitRate || 0, trades: preciseHitRate?.trades || 0 },
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
  const [isBacktesting, setIsBacktesting] = useState(false);

  // Reset backtest when stock changes
  useEffect(() => {
    setBacktestResult(null);
  }, [stock.symbol]);

  // Lazy load backtest result
  useEffect(() => {
    if (loading) return;

    if (activeTab === 'backtest' && !backtestResult && !isBacktesting) {
      if (!ohlcv || ohlcv.length === 0) {
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

      setIsBacktesting(true);
      // Use setTimeout to unblock the main thread for UI updates (e.g. tab switch)
      setTimeout(() => {
        try {
          const result = measure('runBacktest', () => 
            runBacktest(stock.symbol, ohlcv, stock.market)
          );
          setBacktestResult(result);
        } catch (e) {
          console.error("Backtest failed", e);
        } finally {
          setIsBacktesting(false);
        }
      }, 50);
    }
  }, [activeTab, backtestResult, isBacktesting, ohlcv, stock.symbol, stock.market, loading, measure]);

  const aiTrades: PaperTrade[] = useMemo(() => {
    return trades
      .filter(t => t.symbol === stock.symbol)
      .map(o => ({
        id: o.id,
        symbol: o.symbol,
        type: (o.side === 'BUY' || o.side === 'LONG' as any) ? 'BUY' : 'SELL',
        entryPrice: o.price || 0,
        quantity: o.quantity,
        status: o.status === 'FILLED' ? 'CLOSED' : 'OPEN',
        entryDate: o.date,
        profitPercent: 0,
      }));
  }, [trades, stock.symbol]);

  const aiStatusData: import('@/app/types').AIStatus = useMemo(() => ({
    virtualBalance: 10000000,
    totalProfit: 0,
    trades: aiTrades
  }), [aiTrades]);

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
    <div className="bg-[#141e27] p-4 flex flex-col gap-3 h-full flex-col">
      <div className="flex justify-between items-center mb-2">
        {/* Tab List */}
        <div className="flex bg-[#192633] rounded-lg p-0.5 gap-0.5" role="tablist" aria-label="分析パネル">
          <button {...getTabProps('signal', 'シグナル')} />
          <button {...getTabProps('backtest', 'バックテスト')} />
          <button {...getTabProps('forecast', '予測コーン')} />
          <button {...getTabProps('ai', 'AI戦績')} />
        </div>

        <div className="flex items-center gap-3">
          {activeTab === 'signal' && (
            <div className="flex items-center gap-2 text-xs">
              <span className="text-[#92adc9]">信頼度:</span>
              <span className={cn('font-bold', getConfidenceColor(displaySignal.confidence))}>
                {displaySignal.confidence}%
              </span>
            </div>
          )}
          <div className="flex items-center gap-1.5">
            <div className={cn(
              'w-2 h-2 rounded-full',
              wsStatus === 'OPEN' ? 'bg-green-500' :
                wsStatus === 'CONNECTING' ? 'bg-yellow-500' :
                  wsStatus === 'ERROR' ? 'bg-red-500' :
                    'bg-gray-500'
            )} />
            <span className="text-[10px] text-[#92adc9]">
              {wsStatus === 'OPEN' ? '接続済' :
                wsStatus === 'CONNECTING' ? '接続中...' :
                  wsStatus === 'ERROR' ? 'エラー' :
                    '未接続'}
            </span>
            {wsStatus === 'ERROR' || wsStatus === 'CLOSED' ? (
              <button
                onClick={reconnect}
                className="text-[10px] text-blue-400 hover:text-blue-300 underline"
                title="WebSocketを再接続"
              >
                再接続
              </button>
            ) : null}
          </div>
        </div>
      </div>

      {activeTab === 'signal' ? (
        <div role="tabpanel" id="panel-signal" aria-labelledby="tab-signal" className="h-full">
          <SignalCard
            signal={displaySignal}
            stock={stock}
            isLive={!!liveSignal}
            aiHitRate={preciseHitRate.hitRate}
            aiTradesCount={preciseHitRate.trades}
            calculatingHitRate={calculatingHitRate}
            error={error}
          />
        </div>
      ) : activeTab === 'backtest' ? (
        <BacktestView backtestResult={backtestResult} loading={isBacktesting} />
      ) : activeTab === 'forecast' ? (
        <ForecastView signal={displaySignal} stock={stock} />
      ) : activeTab === 'ai' ? (
        <AIPerformanceView aiStatus={aiStatusData} stock={stock} aiTrades={aiTrades} />
      ) : null}
    </div>
  );
}
