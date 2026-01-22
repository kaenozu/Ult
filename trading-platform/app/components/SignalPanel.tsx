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
      <div className="bg-[#141e27] p-4 flex flex-col gap-3">
        <div className="flex justify-between items-center text-xs">
          <div className="h-4 w-24 bg-[#233648] rounded animate-pulse" />
          <div className="h-4 w-12 bg-[#233648] rounded animate-pulse" />
        </div>
        <div className="h-48 bg-[#192633]/50 rounded-lg border border-[#233648] animate-pulse flex items-center justify-center">
          <span className="text-[#92adc9]/50 text-xs">Analyzing Market Data...</span>
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
        <div className={cn(
          'p-3 rounded-lg border backdrop-blur-sm transition-all',
          signal.type === 'BUY' && 'bg-green-500/10 border-green-500/50',
          signal.type === 'SELL' && 'bg-red-500/10 border-red-500/50',
          signal.type === 'HOLD' && 'bg-gray-500/10 border-gray-500/50'
        )}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className={cn(
                'text-2xl font-bold',
                signal.type === 'BUY' && 'text-green-500',
                signal.type === 'SELL' && 'text-red-500',
                signal.type === 'HOLD' && 'text-gray-400'
              )}>
                {signal.type}
              </span>
              {signal.type !== 'HOLD' && (
                <span className={cn(
                  'text-sm px-2 py-0.5 rounded',
                  signal.type === 'BUY' && 'bg-green-500/20 text-green-400',
                  signal.type === 'SELL' && 'bg-red-500/20 text-red-400'
                )}>
                  {signal.predictedChange > 0 ? '+' : ''}{signal.predictedChange.toFixed(1)}%
                </span>
              )}
            </div>
            <div className="text-right">
              <div className="text-xs text-[#92adc9]">Target</div>
              <div className="text-white font-bold">
                {stock.market === 'japan' ? formatCurrency(signal.targetPrice, 'JPY') : formatCurrency(signal.targetPrice, 'USD')}
              </div>
            </div>
          </div>

          <div className="mt-3 pt-3 border-t border-[#233648]/50">
            <div className="flex justify-between items-center">
              <div>
                <div className="text-xs text-[#92adc9]">Stop Loss</div>
                <div className="text-white font-medium">
                  {stock.market === 'japan' ? formatCurrency(signal.stopLoss, 'JPY') : formatCurrency(signal.stopLoss, 'USD')}
                </div>
              </div>
              <div>
                <div className="text-xs text-[#92adc9]">Current</div>
                <div className="text-white font-medium">
                  {stock.market === 'japan' ? formatCurrency(stock.price, 'JPY') : formatCurrency(stock.price, 'USD')}
                </div>
              </div>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-[#233648]/50">
            <div className="text-xs font-bold text-[#92adc9] mb-2 uppercase tracking-wider">AI分析レポート</div>
            <div className="text-xs text-[#92adc9] leading-relaxed bg-[#101922]/50 p-2 rounded border border-[#233648]/50">
              <span className="font-medium text-white block mb-1">主要因:</span>
              {signal.reason}
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
                        {trade.type}
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
