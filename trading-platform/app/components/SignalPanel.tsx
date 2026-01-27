import { useState, useMemo, useEffect, useRef } from 'react';
import { Stock, Signal, OHLCV } from '@/app/types';
import { formatCurrency, cn, getConfidenceColor } from '@/app/lib/utils';
import { runBacktest, BacktestResult } from '@/app/lib/backtest';
import { useTradingStore } from '@/app/store/tradingStore';
import { calculateAIHitRate } from '@/app/lib/analysis';
import { useWebSocket } from '@/app/hooks/useWebSocket';
import { SignalCard } from './SignalCard';
import { useAlertStore } from '@/app/store/alertStore';

const FORECAST_CONE = {
  STEPS: 5,
  LOOKBACK_DAYS: 60,
};

interface SignalPanelProps {
  stock: Stock;
  signal: Signal | null;
  ohlcv?: OHLCV[];
  loading?: boolean;
}

export function SignalPanel({ stock, signal, ohlcv = [], loading = false }: SignalPanelProps) {
  const [activeTab, setActiveTab] = useState<'signal' | 'backtest' | 'ai' | 'forecast'>('signal');
  const [calculatingHitRate, setCalculatingHitRate] = useState(false);
  const [preciseHitRate, setPreciseHitRate] = useState<{ hitRate: number, trades: number }>({ hitRate: 0, trades: 0 });
  const [previousSignal, setPreviousSignal] = useState<Signal | null>(null);
  const [previousForecastConfidence, setPreviousForecastConfidence] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { aiStatus, processAITrades } = useTradingStore();
  const { createStockAlert, createCompositeAlert } = useAlertStore();

  // 詳細な的中率を非同期で計算（長期データを使用）
  useEffect(() => {
    const calculateFullPerformance = async () => {
      if (!stock.symbol) return;
      setCalculatingHitRate(true);
      setError(null);
      try {
        // APIを直接叩いて、過去2年分のデータを的中率計算用に取得
        const twoYearsAgo = new Date();
        twoYearsAgo.setFullYear(twoYearsAgo.getFullYear() - 2);
        const startDate = twoYearsAgo.toISOString().split('T')[0];

        const response = await fetch(`/api/market?type=history&symbol=${stock.symbol}&market=${stock.market}&startDate=${startDate}`);
        if (!response.ok) {
          throw new Error(`Failed to fetch history: ${response.statusText}`);
        }
        const resultData = await response.json();

        if (resultData.data && resultData.data.length > 100) {
          const result = calculateAIHitRate(stock.symbol, resultData.data, stock.market);
          setPreciseHitRate({ hitRate: result.hitRate, trades: result.totalTrades });
        } else {
          // データが不十分な場合は表示用データで代用試行
          const result = calculateAIHitRate(stock.symbol, ohlcv, stock.market);
          setPreciseHitRate({ hitRate: result.hitRate, trades: result.totalTrades });
        }
      } catch (e) {
        console.error('Precise hit rate fetch failed:', e);
        setError('的中率の計算に失敗しました');
      } finally {
        setCalculatingHitRate(false);
      }
    };
    calculateFullPerformance();
  }, [stock.symbol, stock.market]); // ohlcvへの依存を外し、銘柄変更時のみ実行

  const aiPerformance = useMemo(() => {
    return preciseHitRate;
  }, [preciseHitRate]);

  // 的中率変化を監視
  useEffect(() => {
    if (!calculatingHitRate && preciseHitRate.trades > 0) {
      const currentHitRate = preciseHitRate.hitRate;

      // 前回の的中率を保存（簡易的にlocalStorageで）
      const previousHitRate = parseInt(localStorage.getItem(`hitrate-${stock.symbol}`) || '0');

      if (previousHitRate > 0) {
        const dropPercent = (previousHitRate - currentHitRate) / previousHitRate;

        if (dropPercent >= 0.2) {
          createStockAlert({
            symbol: stock.symbol,
            alertType: 'ACCURACY_DROP',
            details: {
              hitRate: currentHitRate,
            },
          });
        }
      }

      localStorage.setItem(`hitrate-${stock.symbol}`, currentHitRate.toString());
    }
  }, [calculatingHitRate, preciseHitRate, stock.symbol, createStockAlert]);

  const { status: wsStatus, lastMessage, connect, disconnect, reconnect } = useWebSocket('ws://localhost:8000/ws/signals');
  const [liveSignal, setLiveSignal] = useState<Signal | null>(null);

  // Show WebSocket status in console for debugging
  useEffect(() => {
    console.log('WebSocket status:', wsStatus);
  }, [wsStatus]);

  useEffect(() => {
    if (lastMessage && lastMessage.type === 'SIGNAL_UPDATE' && lastMessage.data.symbol === stock.symbol) {
      setLiveSignal(lastMessage.data);
    } else if (lastMessage && lastMessage.type === 'SIGNAL_UPDATE' && lastMessage.data.symbol !== stock.symbol) {
      // Different symbol, ignore or maybe clear if we switched?
      // Actually, if we switched stock, we should clear liveSignal until we get a new one
    }
  }, [lastMessage, stock.symbol]);

  // Reset live signal when stock changes
  useEffect(() => {
    setLiveSignal(null);
  }, [stock.symbol]);

  const displaySignal = liveSignal || signal;

  // 自動売買プロセスをトリガー
  useEffect(() => {
    if (displaySignal && stock.price) {
      processAITrades(stock.symbol, stock.price, displaySignal);
    }
  }, [stock.symbol, stock.price, displaySignal, processAITrades]);

  // シグナル変化を監視してアラートを生成
  useEffect(() => {
    if (!displaySignal || !previousSignal) return;

    if (displaySignal.type !== previousSignal.type) {
      createStockAlert({
        symbol: stock.symbol,
        alertType: 'TREND_REVERSAL',
        details: {},
      });
    }
    setPreviousSignal(displaySignal);
  }, [displaySignal, previousSignal, stock.symbol, createStockAlert]);

  // 予測コーン信頼度変化を監視
  useEffect(() => {
    if (!displaySignal?.forecastCone) return;

    const currentConfidence = displaySignal.forecastCone.confidence;

    if (previousForecastConfidence !== null) {
      const confidenceChange = Math.abs(currentConfidence - previousForecastConfidence);
      const changePercent = confidenceChange / previousForecastConfidence;

      if (changePercent >= 0.15) {
        createStockAlert({
          symbol: stock.symbol,
          alertType: 'FORECAST_CHANGE',
          details: {
            confidence: currentConfidence,
            previousConfidence: previousForecastConfidence,
          },
        });
      }
    }

    setPreviousForecastConfidence(currentConfidence);
  }, [displaySignal?.forecastCone?.confidence, previousForecastConfidence, stock.symbol, createStockAlert]);

  // ブレイクアウトを監視
  useEffect(() => {
    if (!displaySignal?.supplyDemand?.breakoutDetected) return;

    createStockAlert({
      symbol: stock.symbol,
      alertType: 'BREAKOUT',
      details: {
        price: displaySignal.supplyDemand.currentPrice,
        level: displaySignal.supplyDemand.brokenLevel?.level,
        levelType: displaySignal.supplyDemand.brokenLevel?.type,
        confidence: displaySignal.supplyDemand.breakoutConfidence === 'high' ? 85 :
                   displaySignal.supplyDemand.breakoutConfidence === 'medium' ? 65 : 45,
      },
    });
  }, [displaySignal?.supplyDemand?.breakoutDetected, displaySignal?.supplyDemand, stock.symbol, createStockAlert]);

  // 複合アラート（市場相関+シグナル）
  useEffect(() => {
    if (!displaySignal?.marketContext || !displaySignal) return;

    createCompositeAlert({
      symbol: stock.symbol,
      marketTrend: displaySignal.marketContext.indexTrend,
      stockSignal: displaySignal.type,
      correlation: displaySignal.marketContext.correlation || 0,
    });
  }, [displaySignal?.marketContext, displaySignal?.type, stock.symbol, createCompositeAlert]);

  const backtestResult: BacktestResult = useMemo(() => {
    if (!ohlcv || ohlcv.length === 0) {
      return { totalTrades: 0, winningTrades: 0, losingTrades: 0, winRate: 0, totalProfitPercent: 0, maxDrawdown: 0, profitFactor: 0, trades: [] };
    }
    return runBacktest(stock.symbol, ohlcv, stock.market);
  }, [stock.symbol, ohlcv, stock.market]);

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

  return (
    <div className="bg-[#141e27] p-4 flex flex-col gap-3 h-full flex-col">
      <div className="flex justify-between items-center mb-2">
        <div
          className="flex bg-[#192633] rounded-lg p-0.5 gap-0.5"
          role="tablist"
          aria-label="分析パネル"
        >
          <button
            role="tab"
            id="tab-signal"
            aria-selected={activeTab === 'signal'}
            aria-controls="panel-signal"
            onClick={() => setActiveTab('signal')}
            className={cn(
              'px-3 py-1 text-xs font-medium rounded transition-colors focus-visible:ring-2 focus-visible:ring-primary focus:outline-none',
              activeTab === 'signal' ? 'bg-[#233648] text-white' : 'text-[#92adc9] hover:text-white'
            )}
          >
            シグナル
          </button>
          <button
            role="tab"
            id="tab-backtest"
            aria-selected={activeTab === 'backtest'}
            aria-controls="panel-backtest"
            onClick={() => setActiveTab('backtest')}
            className={cn(
              'px-3 py-1 text-xs font-medium rounded transition-colors focus-visible:ring-2 focus-visible:ring-primary focus:outline-none',
              activeTab === 'backtest' ? 'bg-[#233648] text-white' : 'text-[#92adc9] hover:text-white'
            )}
          >
            バックテスト
          </button>
          <button
            role="tab"
            id="tab-forecast"
            aria-selected={activeTab === 'forecast'}
            aria-controls="panel-forecast"
            onClick={() => setActiveTab('forecast')}
            className={cn(
              'px-3 py-1 text-xs font-medium rounded transition-colors focus-visible:ring-2 focus-visible:ring-primary focus:outline-none',
              activeTab === 'forecast' ? 'bg-[#233648] text-white' : 'text-[#92adc9] hover:text-white'
            )}
          >
            予測コーン
          </button>
          <button
            role="tab"
            id="tab-ai"
            aria-selected={activeTab === 'ai'}
            aria-controls="panel-ai"
            onClick={() => setActiveTab('ai')}
            className={cn(
              'px-3 py-1 text-xs font-medium rounded transition-colors focus-visible:ring-2 focus-visible:ring-primary focus:outline-none',
              activeTab === 'ai' ? 'bg-[#233648] text-white' : 'text-[#92adc9] hover:text-white'
            )}
          >
            AI戦績
          </button>
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
        <div
          role="tabpanel"
          id="panel-signal"
          aria-labelledby="tab-signal"
          className="h-full"
        >
          <SignalCard
            signal={displaySignal}
            stock={stock}
            isLive={!!liveSignal}
            aiHitRate={aiPerformance.hitRate}
            aiTradesCount={aiPerformance.trades}
            calculatingHitRate={calculatingHitRate}
            error={error}
          />
        </div>
      ) : activeTab === 'backtest' ? (
        <div
          role="tabpanel"
          id="panel-backtest"
          aria-labelledby="tab-backtest"
          className="flex-1 overflow-auto"
        >
          {/* ... existing backtest code ... */}
         <div className="grid grid-cols-2 gap-2 mb-4">
           <div className="bg-[#192633]/50 p-2 rounded border border-[#233648]">
             <div className="text-[10px] text-[#92adc9]">勝率</div>
             <div className={cn('text-lg font-bold', backtestResult.winRate >= 50 ? 'text-green-500' : 'text-red-500')}>
               {backtestResult.winRate}%
             </div>
           </div>
           <div className="bg-[#192633]/50 p-2 rounded border border-[#233648]">
             <div className="text-[10px] text-[#92adc9]">合計損益</div>
             <div className={cn('text-lg font-bold', backtestResult.totalProfitPercent >= 0 ? 'text-green-500' : 'text-red-500')}>
               {backtestResult.totalProfitPercent > 0 ? '+' : ''}{backtestResult.totalProfitPercent}%
             </div>
           </div>
         </div>

         <div className="space-y-2">
           <div className="text-xs font-bold text-[#92adc9] uppercase tracking-wider mb-1">直近のシミュレーション</div>
           {backtestResult.trades.slice(0, 5).map((trade, i) => (
             <div key={i} className="bg-[#192633]/30 p-2 rounded border border-[#233648]/50 flex justify-between items-center text-xs">
               <div>
                 <div className="flex items-center gap-2">
                   <span className={cn('font-bold', trade.type === 'BUY' ? 'text-green-500' : 'text-red-500')}>
                     {trade.type === 'BUY' ? '買い' : '売り'}
                   </span>
                   <span className="text-[#92adc9]">{trade.entryDate}</span>
                 </div>
               </div>
               <div className={cn('font-bold', trade.profitPercent >= 0 ? 'text-green-500' : 'text-red-500')}>
                 {trade.profitPercent > 0 ? '+' : ''}{trade.profitPercent.toFixed(1)}%
               </div>
             </div>
           ))}
         </div>
       </div>
      ) : activeTab === 'forecast' ? (
        <div
          role="tabpanel"
          id="panel-forecast"
          aria-labelledby="tab-forecast"
          className="flex-1 overflow-auto space-y-4"
        >
          {signal?.forecastCone ? (
            <>
              <div className="text-xs font-bold text-[#92adc9] uppercase tracking-wider mb-2">
                予測コーン（{FORECAST_CONE.STEPS}日先まで）
              </div>
              <div className="bg-[#1a2632] p-3 rounded-lg border border-[#233648]">
                <div className="flex justify-between items-center mb-3">
                  <span className="text-[10px] text-[#92adc9]">コーン信頼度</span>
                  <span className={cn('text-sm font-bold', getConfidenceColor(signal.forecastCone.confidence))}>
                    {signal.forecastCone.confidence}%
                  </span>
                </div>
                <div className="space-y-1 text-[10px]">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded bg-red-500/50 border border-red-500/30" />
                    <span className="text-red-400">悲観的下限: {formatCurrency(signal.forecastCone.bearish.lower[signal.forecastCone.bearish.lower.length - 1], stock.market === 'japan' ? 'JPY' : 'USD')}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded bg-red-500/20 border border-red-500/20" />
                    <span className="text-red-300">悲観的上限: {formatCurrency(signal.forecastCone.bearish.upper[signal.forecastCone.bearish.upper.length - 1], stock.market === 'japan' ? 'JPY' : 'USD')}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded bg-blue-500/50 border border-blue-500/30" />
                    <span className="text-blue-400">楽観的下限: {formatCurrency(signal.forecastCone.bullish.lower[signal.forecastCone.bullish.lower.length - 1], stock.market === 'japan' ? 'JPY' : 'USD')}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded bg-blue-500/20 border border-blue-500/20" />
                    <span className="text-blue-300">楽観的上限: {formatCurrency(signal.forecastCone.bullish.upper[signal.forecastCone.bullish.upper.length - 1], stock.market === 'japan' ? 'JPY' : 'USD')}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded bg-gray-500/50 border border-gray-500/30" />
                    <span className="text-gray-400">ベースライン: {formatCurrency(signal.forecastCone.base[signal.forecastCone.base.length - 1], stock.market === 'japan' ? 'JPY' : 'USD')}</span>
                  </div>
                </div>
              </div>
              <div className="bg-[#1a2632]/50 p-3 rounded-lg border border-dashed border-[#233648]">
                <div className="text-[10px] text-[#92adc9] mb-1">シナリオ説明</div>
                <div className="space-y-1 text-[11px] text-white/80">
                  <div className="text-red-300">• 悲観: ボラティリティ拡大、マーケット下落</div>
                  <div className="text-blue-300">• 楽観: トレンド継続、サポートライン反発</div>
                  <div className="text-[#92adc9] mt-2 pt-2 border-t border-[#233648]/30">
                    コーンが狭いほど予測信頼度が高いです
                  </div>
                </div>
              </div>
            </>
          ) : (
            <div className="text-xs text-[#92adc9] text-center py-8 bg-[#192633]/20 rounded-lg border border-dashed border-[#233648]">
              予測コーンデータはまだ生成されていません
            </div>
          )}
        </div>
      ) : activeTab === 'ai' ? (
        <div
          role="tabpanel"
          id="panel-ai"
          aria-labelledby="tab-ai"
          className="flex-1 overflow-auto space-y-4"
        >
          <div className="bg-[#1a2632] p-3 rounded-lg border border-[#233648] flex justify-between items-center">
            <div>
              <div className="text-[10px] text-[#92adc9] uppercase font-bold">AI仮想口座合計損益</div>
              <div className={cn('text-xl font-black', aiStatus.totalProfit >= 0 ? 'text-green-400' : 'text-red-400')}>
                {aiStatus.totalProfit >= 0 ? '+' : ''}{formatCurrency(aiStatus.totalProfit, stock.market === 'japan' ? 'JPY' : 'USD')}
              </div>
            </div>
            <div className="text-right">
              <div className="text-[10px] text-[#92adc9] uppercase font-bold">仮想残高</div>
              <div className="text-sm font-bold text-white">{formatCurrency(aiStatus.virtualBalance, stock.market === 'japan' ? 'JPY' : 'USD')}</div>
            </div>
         </div>

         <div className="space-y-3">
           <div className="text-xs font-bold text-[#92adc9] uppercase tracking-wider">AI売買履歴と自己反省</div>
           {aiTrades.length === 0 ? (
             <div className="text-xs text-[#92adc9] text-center py-8 bg-[#192633]/20 rounded-lg border border-dashed border-[#233648]">
               この銘柄での売買履歴はまだありません。
             </div>
           ) : (
             aiTrades.map((trade, i) => (
               <div key={i} className="bg-[#192633]/50 rounded-lg border border-[#233648] overflow-hidden">
                 <div className="p-2 flex justify-between items-center border-b border-[#233648]/50 bg-black/20">
                   <div className="flex items-center gap-2">
                     <span className={cn('text-[10px] font-black px-1.5 py-0.5 rounded', trade.type === 'BUY' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400')}>
                       {trade.type === 'BUY' ? '買い' : '売り'}
                     </span>
                     <span className="text-[10px] text-[#92adc9]">{trade.entryDate.split('T')[0]}</span>
                   </div>
                   {trade.status === 'CLOSED' && (
                     <span className={cn('text-[10px] font-bold', (trade.profitPercent || 0) >= 0 ? 'text-green-400' : 'text-red-400')}>
                       {(trade.profitPercent || 0) >= 0 ? '+' : ''}{(trade.profitPercent || 0).toFixed(2)}%
                     </span>
                   )}
                 </div>
                 <div className="p-2">
                   <div className="text-[10px] text-[#92adc9] mb-1 flex justify-between">
                     <span>Entry: {formatCurrency(trade.entryPrice, stock.market === 'japan' ? 'JPY' : 'USD')}</span>
                     {trade.status === 'CLOSED' && <span>Exit: {formatCurrency(trade.exitPrice || 0, stock.market === 'japan' ? 'JPY' : 'USD')}</span>}
                   </div>
                   {trade.reflection && (
                     <div className="mt-2 text-[11px] text-white/80 leading-relaxed bg-black/40 p-2 rounded italic border-l-2 border-primary/50">
                       「{trade.reflection}」
                     </div>
                   )}
                 </div>
               </div>
             ))
           )}
         </div>
       </div>
      ) : null}
    </div>
  );
}
