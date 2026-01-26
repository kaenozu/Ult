import { useState, useMemo, useEffect } from 'react';
import { Stock, Signal, OHLCV } from '@/app/types';
import { formatCurrency, cn, getConfidenceColor } from '@/app/lib/utils';
import { runBacktest, BacktestResult } from '@/app/lib/backtest';
import { useTradingStore } from '@/app/store/tradingStore';
import { calculateAIHitRate } from '@/app/lib/analysis';

interface SignalPanelProps {
  stock: Stock;
  signal: Signal | null;
  ohlcv?: OHLCV[];
  loading?: boolean;
}

export function SignalPanel({ stock, signal, ohlcv = [], loading = false }: SignalPanelProps) {
  const [activeTab, setActiveTab] = useState<'signal' | 'backtest' | 'ai'>('signal');
  const [calculatingHitRate, setCalculatingHitRate] = useState(false);
  const [preciseHitRate, setPreciseHitRate] = useState<{ hitRate: number, trades: number }>({ hitRate: 0, trades: 0 });
  const [error, setError] = useState<string | null>(null);
  const { aiStatus, processAITrades } = useTradingStore();

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

  // 自動売買プロセスをトリガー
  useEffect(() => {
    if (signal && stock.price) {
      processAITrades(stock.symbol, stock.price, signal);
    }
  }, [stock.symbol, stock.price, signal, processAITrades]);

  const backtestResult: BacktestResult = useMemo(() => {
    if (!ohlcv || ohlcv.length === 0) {
      return { totalTrades: 0, winningTrades: 0, losingTrades: 0, winRate: 0, totalProfitPercent: 0, maxDrawdown: 0, profitFactor: 0, trades: [] };
    }
    return runBacktest(stock.symbol, ohlcv, stock.market);
  }, [stock.symbol, ohlcv, stock.market]);

  const aiTrades = useMemo(() => {
    return aiStatus.trades.filter(t => t.symbol === stock.symbol);
  }, [aiStatus.trades, stock.symbol]);

  if (loading || !signal) {
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
        <div className="flex bg-[#192633] rounded-lg p-0.5 gap-0.5">
          <button
            onClick={() => setActiveTab('signal')}
            className={cn(
              'px-3 py-1 text-xs font-medium rounded transition-colors',
              activeTab === 'signal' ? 'bg-[#233648] text-white' : 'text-[#92adc9] hover:text-white'
            )}
          >
            シグナル
          </button>
          <button
            onClick={() => setActiveTab('backtest')}
            className={cn(
              'px-3 py-1 text-xs font-medium rounded transition-colors',
              activeTab === 'backtest' ? 'bg-[#233648] text-white' : 'text-[#92adc9] hover:text-white'
            )}
          >
            バックテスト
          </button>
          <button
            onClick={() => setActiveTab('ai')}
            className={cn(
              'px-3 py-1 text-xs font-medium rounded transition-colors',
              activeTab === 'ai' ? 'bg-[#233648] text-white' : 'text-[#92adc9] hover:text-white'
            )}
          >
            AI戦績
          </button>
        </div>
        {activeTab === 'signal' && (
          <div className="flex items-center gap-2 text-xs">
            <span className="text-[#92adc9]">信頼度:</span>
            <span className={cn('font-bold', getConfidenceColor(signal.confidence))}>
              {signal.confidence}%
            </span>
          </div>
        )}
      </div>

      {activeTab === 'signal' ? (
        <div className="flex flex-col gap-3">
          {/* ... existing signal display code ... */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className={cn(
                'px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-tighter shadow-sm',
                signal.confidence >= 80 ? 'bg-white text-black' : 'bg-black/20 text-white/70'
              )}>
                {signal.confidence >= 80 ? '🔥 強気シグナル' : '通常シグナル'}
              </div>
              {aiPerformance.hitRate >= 60 && (
                <div className="px-2 py-1 rounded-full text-[10px] font-bold bg-yellow-500/20 text-yellow-500 border border-yellow-500/30 flex items-center gap-1">
                  🌟 高的中率 ({aiPerformance.hitRate}%)
                </div>
              )}
            </div>
            <div className="text-right">
              <div className="text-[10px] text-[#92adc9] uppercase font-bold tracking-widest">予測信頼度</div>
              <div className={cn('text-xl font-black tabular-nums', getConfidenceColor(signal.confidence))}>
                {signal.confidence}%
              </div>
            </div>
          </div>

          <div className="mt-4 flex items-end justify-between">
            <div className="flex flex-col">
              <span className={cn(
                'text-5xl font-black leading-none tracking-tighter',
                signal.type === 'BUY' && 'text-green-500 drop-shadow-[0_0_15px_rgba(34,197,94,0.3)]',
                signal.type === 'SELL' && 'text-red-500 drop-shadow-[0_0_15px_rgba(239,68,68,0.3)]',
                signal.type === 'HOLD' && 'text-gray-400'
              )}>
                {signal.type === 'BUY' ? '買い' : signal.type === 'SELL' ? '売り' : '維持'}
              </span>
              <span className="text-[10px] font-bold text-[#92adc9] mt-1 ml-1 uppercase">推奨アクション</span>
            </div>
            <div className="text-right">
              <div className="text-[10px] text-[#92adc9] uppercase font-bold tracking-widest mb-1">過去の的中率</div>
              <div className={cn('text-lg font-black tabular-nums', aiPerformance.hitRate >= 50 ? 'text-white' : 'text-red-400')}>
                {calculatingHitRate ? (
                  <span className="text-xs text-[#92adc9] animate-pulse">計算中...</span>
                ) : error ? (
                   <span className="text-xs text-red-400" title={error}>エラー</span>
                ) : (
                  `${aiPerformance.hitRate}%`
                )}
              </div>
              {!calculatingHitRate && !error && (
                <div className="text-[8px] text-[#92adc9]/60">過去{aiPerformance.trades}回の試行</div>
              )}
            </div>
          </div>

          <div className="mt-6 space-y-3">
            {/* 予測誤差表示 (AI予測の深化) */}
            {signal.predictionError !== undefined && (
              <div className="bg-black/20 p-2 rounded-lg border border-[#233648]/50">
                <div className="flex items-center justify-between">
                  <div className="text-[10px] font-bold text-[#92adc9] uppercase tracking-wider">予測誤差</div>
                  <div className={cn(
                    'text-xs font-bold tabular-nums',
                    signal.predictionError <= 1.0 ? 'text-green-400' :  // 標準以下
                    signal.predictionError <= 1.5 ? 'text-yellow-400' :  // 中程度
                    'text-red-400'  // 高い誤差
                  )}>
                    {signal.predictionError.toFixed(2)}x
                  </div>
                </div>
                <div className="text-[8px] text-[#92adc9]/60 mt-1">
                  {signal.predictionError <= 1.0 ? '精度良好' :
                   signal.predictionError <= 1.5 ? 'やや不確実' : '不確実性が高い'}
                </div>
              </div>
            )}

            <div className="relative pt-4">
              <div className="absolute top-0 left-0 text-[10px] font-bold text-[#92adc9] uppercase tracking-widest">目標価格・リスク管理</div>
              <div className="flex items-center gap-2">
                <div className="flex-1">
                  <div className="text-[10px] text-[#92adc9] mb-1">利確ターゲット</div>
                  <div className="text-sm font-black text-white bg-white/5 p-2 rounded border border-white/10 text-center">
                    {stock.market === 'japan' ? formatCurrency(signal.targetPrice, 'JPY') : formatCurrency(signal.targetPrice, 'USD')}
                  </div>
                </div>
                <div className="flex-1">
                  <div className="text-[10px] text-red-400/70 mb-1 text-right">損切りライン</div>
                  <div className="text-sm font-black text-red-400 bg-red-400/5 p-2 rounded border border-red-400/20 text-center">
                    {stock.market === 'japan' ? formatCurrency(signal.stopLoss, 'JPY') : formatCurrency(signal.stopLoss, 'USD')}
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-black/30 p-3 rounded-lg border border-[#233648] relative overflow-hidden group">
              <div className="absolute top-0 left-0 w-1 h-full bg-primary/50"></div>
              <div className="text-[10px] font-bold text-[#92adc9] mb-1 uppercase tracking-widest flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse"></span>
                AI分析エンジン
              </div>
              <p className="text-xs text-white/90 leading-relaxed font-medium">
                {signal.reason}
              </p>
            </div>
          </div>
        </div>
      ) : activeTab === 'backtest' ? (
        <div className="flex-1 overflow-auto">
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
      ) : (
        <div className="flex-1 overflow-auto space-y-4">
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
      )}
    </div>
  );
}