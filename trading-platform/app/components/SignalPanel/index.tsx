import { useState, useMemo, useEffect, useCallback } from 'react';
import { Stock, Signal, OHLCV, PaperTrade, BacktestResult } from '@/app/types';
import { cn, getConfidenceColor, getWebSocketUrl, calculateSMA } from '@/app/lib/utils';
import { AdvancedBacktestEngine, BacktestConfig, Strategy } from '@/app/lib/backtest/AdvancedBacktestEngine';
import { RealisticBacktestEngine } from '@/app/lib/backtest/RealisticBacktestEngine';
import { useAIStore } from '@/app/store/aiStore';
import { useWebSocket } from '@/app/hooks/useWebSocket';
import { SignalCard } from '../SignalCard';
import { useSignalAlerts } from '@/app/hooks/useSignalAlerts';
import { useAIPerformance } from '@/app/hooks/useAIPerformance';
import { BacktestView } from './BacktestView';
import { ForecastView } from './ForecastView';
import { AIPerformanceView } from './AIPerformanceView';
import { LowAccuracyWarning } from '@/app/components/LowAccuracyWarning';
import { usePerformanceMonitor } from '@/app/lib/performance';
import { KellyPositionSizingDisplay } from '@/app/components/KellyPositionSizingDisplay';
import { useTradingStore } from '@/app/store/tradingStore';

/**
 * SignalPanelコンポーネントのプロパティ
 * @property stock - 分析対象の銘柄情報
 * @property signal - AIが生成した売買シグナル
 * @property ohlcv - 価格履歴データ（バックテストと分析に使用）
 * @property loading - データ読み込み中フラグ
 */
interface SignalPanelProps {
  stock: Stock;
  signal: Signal | null;
  ohlcv?: OHLCV[];
  loading?: boolean;
}

const FAST_SMA_PERIOD = 10;
const SLOW_SMA_PERIOD = 30;

function createSignalPanelStrategy(data: OHLCV[]): Strategy {
  const closes = data.map((entry) => entry.close);
  const fastSma = calculateSMA(closes, FAST_SMA_PERIOD);
  const slowSma = calculateSMA(closes, SLOW_SMA_PERIOD);

  return {
    name: 'SignalPanel SMA Strategy',
    description: 'Simple SMA crossover strategy for panel backtests',
    onData: (_data, index, context) => {
      const fastValue = fastSma[index];
      const slowValue = slowSma[index];

      if (Number.isNaN(fastValue) || Number.isNaN(slowValue)) {
        return { action: 'HOLD' };
      }

      if (!context.currentPosition && fastValue > slowValue) {
        return { action: 'BUY' };
      }

      if (context.currentPosition && fastValue < slowValue) {
        return { action: 'CLOSE' };
      }

      return { action: 'HOLD' };
    },
  };
}

function buildBacktestConfig(data: OHLCV[], market: Stock['market']): Partial<BacktestConfig> {
  const avgVolume = data.length > 0
    ? data.reduce((sum, entry) => sum + (entry.volume || 0), 0) / data.length
    : 1000000;

  return {
    initialCapital: 1000000,
    commission: 0,
    slippage: 0,
    spread: 0.01,
    maxPositionSize: 20,
    maxDrawdown: 50,
    allowShort: false,
    useStopLoss: true,
    useTakeProfit: true,
    riskPerTrade: 2,
    realisticMode: true,
    market,
    averageDailyVolume: avgVolume,
    slippageEnabled: true,
    commissionEnabled: true,
    partialFillEnabled: false,
    latencyEnabled: false,
    transactionCostsEnabled: true,
    transactionCostBroker: market === 'japan' ? 'SBI' : 'Rakuten',
    transactionCostMarketCondition: 'normal',
    transactionCostSettlementType: 'same-day',
    transactionCostDailyVolume: avgVolume,
  };
}

function mapEngineResultToBacktestResult(symbol: string, result: Awaited<ReturnType<AdvancedBacktestEngine['runBacktest']>>): BacktestResult {
  const trades = result.trades.map((trade) => ({
    symbol,
    type: trade.side === 'LONG' ? 'BUY' : 'SELL',
    entryPrice: trade.entryPrice,
    exitPrice: trade.exitPrice,
    entryDate: trade.entryDate,
    exitDate: trade.exitDate,
    profitPercent: trade.pnlPercent,
    status: trade.exitDate ? 'CLOSED' : 'OPEN',
    exitReason: trade.exitReason,
  }));

  return {
    symbol,
    totalTrades: result.metrics.totalTrades,
    winningTrades: result.metrics.winningTrades,
    losingTrades: result.metrics.losingTrades,
    winRate: result.metrics.winRate,
    totalReturn: result.metrics.totalReturn,
    avgProfit: result.metrics.averageWin,
    avgLoss: result.metrics.averageLoss,
    profitFactor: result.metrics.profitFactor,
    maxDrawdown: result.metrics.maxDrawdown,
    sharpeRatio: result.metrics.sharpeRatio,
    sortinoRatio: result.metrics.sortinoRatio,
    calmarRatio: result.metrics.calmarRatio,
    trades,
    startDate: result.startDate,
    endDate: result.endDate,
  };
}

/**
 * シグナルパネルコンポーネント
 * 
 * AIが生成した売買シグナル、バックテスト結果、AI性能、価格予測を
 * タブ形式で表示する統合分析パネル。
 * 
 * 主な機能:
 * - リアルタイムシグナル表示（WebSocket対応）
 * - バックテスト実行と結果可視化
 * - AI予測精度の追跡
 * - 価格予測チャート
 * - 自動アラート通知
 * 
 * @component
 * @example
 * ```tsx
 * <SignalPanel 
 *   stock={{ symbol: 'AAPL', name: 'Apple Inc.', market: 'usa' }}
 *   signal={aiGeneratedSignal}
 *   ohlcv={historicalPriceData}
 *   loading={false}
 * />
 * ```
 * 
 * @param {SignalPanelProps} props - コンポーネントのプロパティ
 * @returns {JSX.Element} シグナルパネルUI
 */
export function SignalPanel({ stock, signal, ohlcv = [], loading = false }: SignalPanelProps) {
  // Performance monitoring
  const { measureAsync } = usePerformanceMonitor('SignalPanel');
  
  const [activeTab, setActiveTab] = useState<'signal' | 'backtest' | 'ai' | 'forecast'>('signal');
  const { aiStatus: aiStateString, processAITrades, trades } = useAIStore();

  // Kelly position sizing
  const calculatePositionSize = useTradingStore((state) => state.calculatePositionSize);
  const getPortfolioStats = useTradingStore((state) => state.getPortfolioStats);

  // Custom Hooks
  const { preciseHitRate, calculatingHitRate, error } = useAIPerformance(stock, ohlcv);

  // Use dynamic WebSocket URL for better security and flexibility
  const { status: wsStatus, lastMessage, connect, disconnect, reconnect } = useWebSocket(getWebSocketUrl('/ws/signals'));
  const [liveSignal, setLiveSignal] = useState<Signal | null>(null);

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
    if (displaySignal && stock.price && processAITrades) {
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
        void (async () => {
          try {
            const result = await measureAsync('runBacktest', async () => {
              const config = buildBacktestConfig(ohlcv, stock.market);
              const strategy = createSignalPanelStrategy(ohlcv);
              const engine = config.realisticMode
                ? new RealisticBacktestEngine(config)
                : new AdvancedBacktestEngine(config);
              engine.loadData(stock.symbol, ohlcv);
              const engineResult = await engine.runBacktest(strategy, stock.symbol);
              return mapEngineResultToBacktestResult(stock.symbol, engineResult);
            });
            setBacktestResult(result);
          } catch (e) {
            console.error("Backtest failed", e);
          } finally {
            setIsBacktesting(false);
          }
        })();
      }, 50);
    }
  }, [activeTab, backtestResult, isBacktesting, ohlcv, stock.symbol, stock.market, loading, measureAsync]);

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

  // Kelly position sizing recommendation
  const kellyRecommendation = useMemo(() => {
    if (!displaySignal || displaySignal.type === 'HOLD') {
      return null;
    }
    
    try {
      const stats = getPortfolioStats();
      // 最低10トレード以上必要
      if (stats.totalTrades < 10) {
        return null;
      }
      
      return calculatePositionSize(stock.symbol, displaySignal);
    } catch (error) {
      console.error('Kelly calculation error:', error);
      return null;
    }
  }, [displaySignal, stock.symbol, calculatePositionSize, getPortfolioStats]);

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
        <div role="tabpanel" id="panel-signal" aria-labelledby="tab-signal" className="flex-1 flex flex-col gap-3 overflow-y-auto">
          {/* Low Accuracy Warning */}
          {displaySignal && displaySignal.type !== 'HOLD' && (
            <LowAccuracyWarning
              hitRate={preciseHitRate.hitRate}
              symbolName={stock.name}
              signalType={displaySignal.type}
              threshold={50}
            />
          )}
          
          <SignalCard
            signal={displaySignal}
            stock={stock}
            isLive={!!liveSignal}
            aiHitRate={preciseHitRate.hitRate}
            aiTradesCount={preciseHitRate.trades}
            calculatingHitRate={calculatingHitRate}
            error={error}
          />

          {/* Kelly Position Sizing Display */}
          {displaySignal.type !== 'HOLD' && (
            <KellyPositionSizingDisplay
              recommendation={kellyRecommendation}
              loading={false}
            />
          )}
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
