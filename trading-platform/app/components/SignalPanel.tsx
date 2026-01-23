import { useState, useMemo } from 'react';
import { Stock, Signal, OHLCV } from '@/app/types';
import { formatCurrency, cn, getConfidenceColor } from '@/app/lib/utils';
import { runBacktest, BacktestResult } from '@/app/lib/backtest';

interface SignalPanelProps {
  stock: Stock;
  signal: Signal | null;
  ohlcv?: OHLCV[];
  loading?: boolean;
}

export function SignalPanel({ stock, signal, ohlcv = [], loading = false }: SignalPanelProps) {
  const [activeTab, setActiveTab] = useState<'signal' | 'backtest'>('signal');

  const backtestResult: BacktestResult = useMemo(() => {
    if (!ohlcv || ohlcv.length === 0) {
      return { totalTrades: 0, winningTrades: 0, losingTrades: 0, winRate: 0, totalProfitPercent: 0, maxDrawdown: 0, profitFactor: 0, trades: [] };
    }
    return runBacktest(stock.symbol, ohlcv, stock.market);
  }, [stock.symbol, ohlcv, stock.market]);

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
            検証結果
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
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className={cn(
                'px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-tighter shadow-sm',
                signal.confidence >= 80 ? 'bg-white text-black' : 'bg-black/20 text-white/70'
              )}>
                {signal.confidence >= 80 ? '🔥 強気シグナル' : '通常シグナル'}
              </div>
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
              <div className={cn(
                'text-lg font-bold px-2 py-0.5 rounded-md inline-block',
                signal.predictedChange > 0 ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
              )}>
                {signal.predictedChange > 0 ? '▲' : '▼'} {Math.abs(signal.predictedChange).toFixed(1)}%
              </div>
              <div className="text-[10px] text-[#92adc9] mt-1 font-medium">予測騰落率</div>
            </div>
          </div>

          <div className="mt-6 space-y-3">
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
      ) : (
        <div className="flex-1 overflow-auto">
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
            <div className="bg-[#192633]/50 p-2 rounded border border-[#233648]">
              <div className="text-[10px] text-[#92adc9]">PF</div>
              <div className="text-white font-bold">{backtestResult.profitFactor}</div>
            </div>
            <div className="bg-[#192633]/50 p-2 rounded border border-[#233648]">
              <div className="text-[10px] text-[#92adc9]">Max DD</div>
              <div className="text-red-400 font-bold">-{backtestResult.maxDrawdown}%</div>
            </div>
          </div>

          <div className="space-y-2">
            <div className="text-xs font-bold text-[#92adc9] uppercase tracking-wider mb-1">直近のトレード</div>
            {backtestResult.trades.length === 0 ? (
              <div className="text-xs text-[#92adc9] text-center py-4">データ不足のため検証不可</div>
            ) : (
              backtestResult.trades.slice(0, 5).map((trade, i) => (
                <div key={i} className="bg-[#192633]/30 p-2 rounded border border-[#233648]/50 flex justify-between items-center text-xs">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className={cn('font-bold', trade.type === 'BUY' ? 'text-green-500' : 'text-red-500')}>
                        {trade.type === 'BUY' ? '買い' : '売り'}
                      </span>
                      <span className="text-[#92adc9]">{trade.entryDate}</span>
                    </div>
                    <div className="text-[10px] text-[#92adc9] mt-0.5">{trade.reason}</div>
                  </div>
                  <div className={cn('font-bold', trade.profitPercent >= 0 ? 'text-green-500' : 'text-red-500')}>
                    {trade.profitPercent > 0 ? '+' : ''}{trade.profitPercent.toFixed(1)}%
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