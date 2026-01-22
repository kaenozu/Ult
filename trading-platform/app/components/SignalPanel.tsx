'use client';

import { useEffect, useState } from 'react';
import { Stock, Signal } from '@/app/types';
import { formatCurrency, cn, getConfidenceColor } from '@/app/lib/utils';
import { generateMockSignal } from '@/app/data/stocks';

interface SignalPanelProps {
  stock: Stock;
}

export function SignalPanel({ stock }: SignalPanelProps) {
  const [signal, setSignal] = useState<Signal | null>(() => generateMockSignal(stock));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dataSource, setDataSource] = useState<'api' | 'cache' | 'mock'>('mock');

  useEffect(() => {
    // When stock changes, immediately show new mock data
    // Then try to fetch real data in background (if we had a real fetch function here)
    const newSignal = generateMockSignal(stock);
    setSignal(newSignal);
    setLoading(false);
  }, [stock.symbol]);

  if (loading) {
    return (
      <div className="bg-[#141e27] p-4 flex flex-col gap-3">
        <div className="flex justify-between items-center text-xs">
          <span className="font-bold text-white text-sm">AI Signal</span>
          <span className="text-yellow-500 animate-pulse">読み込み中...</span>
        </div>
        <div className="h-32 bg-[#192633]/50 rounded-lg animate-pulse flex items-center justify-center text-[#92adc9] text-xs">
          データを取得中...
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-[#141e27] p-4 flex flex-col gap-3">
        <div className="flex justify-between items-center text-xs">
          <div className="flex items-center gap-2">
            <span className="font-bold text-white text-sm">AI Signal</span>
            <span className="text-red-500">エラー</span>
          </div>
        </div>
        <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3">
          <p className="text-red-400 text-xs">{error}</p>
        </div>
      </div>
    );
  }

  if (!signal) {
    return null;
  }

  const dataSourceLabel = {
    api: 'リアルタイム',
    cache: 'キャッシュ',
    mock: 'モックデータ',
  };

  return (
    <div className="bg-[#141e27] p-4 flex flex-col gap-3">
      <div className="flex justify-between items-center text-xs">
        <div className="flex items-center gap-2">
          <span className="font-bold text-white text-sm">AI Signal</span>
          <span className={`px-1.5 py-0.5 text-[10px] rounded ${
            dataSource === 'api' ? 'bg-green-500/20 text-green-400' :
            dataSource === 'cache' ? 'bg-blue-500/20 text-blue-400' :
            'bg-yellow-500/20 text-yellow-500'
          }`}>
            {dataSourceLabel[dataSource]}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[#92adc9]">信頼度:</span>
          <span className={cn('font-bold', getConfidenceColor(signal.confidence))}>
            {signal.confidence}%
          </span>
        </div>
      </div>

      <div className={cn(
        'p-3 rounded-lg border backdrop-blur-sm',
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
            <span className={cn(
              'text-sm px-2 py-0.5 rounded',
              signal.type === 'BUY' && 'bg-green-500/20 text-green-400',
              signal.type === 'SELL' && 'bg-red-500/20 text-red-400',
              signal.type === 'HOLD' && 'bg-gray-500/20 text-gray-400'
            )}>
              {signal.predictedChange > 0 ? '+' : ''}{signal.predictedChange}%
            </span>
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

        <div className="mt-3 text-xs text-[#92adc9]">
          <span className="font-medium text-white">理由:</span> {signal.reason}
        </div>

        <div className="mt-3 pt-2 border-t border-[#233648]/30">
          <div className="flex items-center gap-1 text-[10px] text-yellow-500/60">
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>予測はシミュレーションです。投資判断の参考程度にしてください。</span>
          </div>
        </div>
      </div>
    </div>
  );
}
