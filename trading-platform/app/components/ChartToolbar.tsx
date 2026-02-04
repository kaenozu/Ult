'use client';

import { memo } from 'react';
import { Stock, OHLCV } from '@/app/types';
import { formatCurrency, cn } from '@/app/lib/utils';
import { DataDelayBadge } from './DataDelayBadge';
import { isIntradayInterval } from '@/app/lib/constants/intervals';

interface ChartToolbarProps {
  stock: Stock | null;
  latestData: OHLCV | undefined;
  showSMA: boolean;
  setShowSMA: (show: boolean) => void;
  showBollinger: boolean;
  setShowBollinger: (show: boolean) => void;
  interval: string;
  setInterval: (interval: string) => void;
  fallbackApplied?: boolean;
  dataDelayMinutes?: number;
}

export const ChartToolbar = memo(function ChartToolbar({
  stock,
  latestData,
  showSMA,
  setShowSMA,
  showBollinger,
  setShowBollinger,
  interval,
  setInterval,
  fallbackApplied = false,
  dataDelayMinutes
}: ChartToolbarProps) {
  const isJapaneseStock = stock?.market === 'japan';
  const isIntraday = isIntradayInterval(interval);
  
  const intervals = [
    { value: '1m', label: '1分', disabled: isJapaneseStock },
    { value: '5m', label: '5分', disabled: isJapaneseStock },
    { value: '15m', label: '15分', disabled: isJapaneseStock },
    { value: '1H', label: '1時間', disabled: isJapaneseStock },
    { value: '4H', label: '4時間', disabled: false },
    { value: 'D', label: '日足', disabled: false },
  ];

  return (
    <div className="min-h-10 border-b border-[#233648] flex flex-wrap items-center justify-between px-4 py-2 gap-3 bg-[#192633]/30 shrink-0">
      {/* Left Section - Stock Info & Timeframe */}
      <div className="flex flex-wrap items-center gap-4">
        <div className="flex items-center gap-2">
          <div className="flex flex-col">
            <span className="font-bold text-lg text-white">{stock?.symbol}</span>
            <span className="text-xs text-[#92adc9] truncate max-w-[150px]">{stock?.name}</span>
          </div>
          {/* Add data delay badge for Japanese stocks */}
          {stock && (
            <DataDelayBadge
              market={stock.market}
              fallbackApplied={fallbackApplied}
              delayMinutes={dataDelayMinutes}
              size="sm"
            />
          )}
        </div>
        
        <div className="h-6 w-px bg-[#233648] hidden sm:block" />
        
        {/* Timeframe Selector */}
        <div className="flex bg-[#0d131a] rounded-lg p-0.5 gap-0.5 border border-[#233648]">
          {intervals.map((tf) => {
            const isDisabled = tf.disabled;
            
            return (
              <button
                key={tf.value}
                type="button"
                aria-pressed={tf.value === interval}
                disabled={isDisabled}
                onClick={() => !isDisabled && setInterval(tf.value)}
                title={isDisabled ? '日本株では日足データのみ利用可能です' : `${tf.label}チャート`}
                className={cn(
                  'px-3 py-1 text-xs font-medium rounded transition-all duration-200',
                  'focus:outline-none focus:ring-2 focus:ring-primary/50',
                  tf.value === interval
                    ? 'bg-primary text-white shadow-sm'
                    : tf.disabled
                    ? 'text-[#92adc9]/30 cursor-not-allowed'
                    : 'text-[#92adc9] hover:text-white hover:bg-[#233648]'
                )}
              >
                {tf.label}
              </button>
            ))}
          </div>

          <div className="h-6 w-px bg-[#233648] hidden sm:block" />

          {/* Indicator Toggles */}
          <div className="flex bg-[#0d131a] rounded-lg p-0.5 gap-0.5 border border-[#233648]">
            <button
              type="button"
              aria-pressed={showSMA}
              onClick={() => setShowSMA(!showSMA)}
              className={cn(
                'px-3 py-1 text-xs font-bold rounded transition-all duration-200 flex items-center gap-1.5',
                'focus:outline-none focus:ring-2 focus:ring-yellow-500/50',
                showSMA 
                  ? 'bg-yellow-500/20 text-yellow-500 border border-yellow-500/30' 
                  : 'text-[#92adc9] hover:text-yellow-500 hover:bg-[#233648]'
            )}
          </div>

          <div className="h-6 w-px bg-[#233648] hidden sm:block" />

          {/* Quick Actions */}
          <div className="flex items-center gap-2 text-xs text-[#92adc9]">
            <button 
              type="button" 
              className="flex items-center gap-1.5 cursor-pointer hover:text-white transition-colors px-2 py-1 rounded hover:bg-[#233648]"
              title="インジケーターを追加"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" />
              </svg>
              <span className="hidden lg:inline">インジケーター</span>
            </button>
            <button 
              type="button" 
              className="flex items-center gap-1.5 cursor-pointer hover:text-white transition-colors px-2 py-1 rounded hover:bg-[#233648]"
              title="描画ツール"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
              </svg>
              <span className="hidden lg:inline">ツール</span>
            </button>
          </div>

          <div className="h-6 w-px bg-[#233648] hidden sm:block" />

          {/* Quick Actions */}
          <div className="flex items-center gap-2 text-xs text-[#92adc9]">
            <button 
              type="button" 
              className="flex items-center gap-1.5 cursor-pointer hover:text-white transition-colors px-2 py-1 rounded hover:bg-[#233648]"
              title="インジケーターを追加"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" />
              </svg>
              <span className="hidden lg:inline">インジケーター</span>
            </button>
            <button 
              type="button" 
              className="flex items-center gap-1.5 cursor-pointer hover:text-white transition-colors px-2 py-1 rounded hover:bg-[#233648]"
              title="描画ツール"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
              </svg>
              <span className="hidden lg:inline">ツール</span>
            </button>
          </div>
        </div>



        <div className="h-6 w-px bg-[#233648] hidden sm:block" />

        {/* Quick Actions */}
        <div className="flex items-center gap-2 text-xs text-[#92adc9]">
          <button 
            type="button" 
            className="flex items-center gap-1.5 cursor-pointer hover:text-white transition-colors px-2 py-1 rounded hover:bg-[#233648]"
            title="インジケーターを追加"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" />
            </svg>
            <span className="hidden lg:inline">インジケーター</span>
          </button>
          <button 
            type="button" 
            className="flex items-center gap-1.5 cursor-pointer hover:text-white transition-colors px-2 py-1 rounded hover:bg-[#233648]"
            title="描画ツール"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
            </svg>
            <span className="hidden lg:inline">ツール</span>
          </button>
        </div>
      </div>

      {/* Right Section - Price Info */}
      {latestData && (
        <div className="flex items-center gap-4 text-sm tabular-nums flex-wrap">
          <div className="flex items-center gap-1 text-[#92adc9]">
            <span className="text-xs">始:</span>
            <span className="font-medium text-white">{formatCurrency(latestData.open || 0, stock?.market === 'japan' ? 'JPY' : 'USD')}</span>
          </div>
          <div className="flex items-center gap-1 text-[#92adc9]">
            <span className="text-xs">高:</span>
            <span className="font-medium text-green-400">{formatCurrency(latestData.high || 0, stock?.market === 'japan' ? 'JPY' : 'USD')}</span>
          </div>
          <div className="flex items-center gap-1 text-[#92adc9]">
            <span className="text-xs">安:</span>
            <span className="font-medium text-red-400">{formatCurrency(latestData.low || 0, stock?.market === 'japan' ? 'JPY' : 'USD')}</span>
          </div>
          <div className="flex items-center gap-1 text-[#92adc9]">
            <span className="text-xs">終:</span>
            <span className="font-bold text-white">{formatCurrency(latestData.close || 0, stock?.market === 'japan' ? 'JPY' : 'USD')}</span>
          </div>
          {latestData.change !== undefined && (
            <div className={cn(
              "flex items-center gap-1 px-2 py-0.5 rounded text-xs font-bold",
              latestData.change >= 0 ? "bg-green-500/10 text-green-400" : "bg-red-500/10 text-red-400"
            )}>
              {latestData.change >= 0 ? '+' : ''}{formatCurrency(latestData.change)}
              <span className="opacity-80">({latestData.change >= 0 ? '+' : ''}{((latestData.change / (latestData.close - latestData.change)) * 100).toFixed(1)}%)</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
});
