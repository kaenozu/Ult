'use client';

import { Stock, OHLCV } from '@/app/types';
import { formatCurrency, cn } from '@/app/lib/utils';

interface ChartToolbarProps {
  stock: Stock | null;
  latestData: OHLCV | undefined;
  showSMA: boolean;
  setShowSMA: (show: boolean) => void;
  showBollinger: boolean;
  setShowBollinger: (show: boolean) => void;
}

export function ChartToolbar({
  stock,
  latestData,
  showSMA,
  setShowSMA,
  showBollinger,
  setShowBollinger
}: ChartToolbarProps) {
  return (
    <div className="min-h-10 border-b border-[#233648] flex flex-wrap items-center justify-between px-4 py-1 gap-2 bg-[#192633]/30 shrink-0">
      <div className="flex flex-wrap items-center gap-4">
        <div className="flex items-center gap-2">
          <span className="font-bold text-lg">{stock?.symbol}</span>
          <span className="text-xs text-[#92adc9]">{stock?.name}</span>
        </div>
        <div className="h-4 w-px bg-[#233648]" />
        <div className="flex bg-[#192633] rounded-md p-0.5 gap-0.5">
          {['1m', '5m', '15m', '1H', '4H', 'D'].map((tf) => (
            <button
              key={tf}
              type="button"
              aria-pressed={tf === '5m'}
              className={cn(
                'px-2 py-0.5 text-xs font-medium rounded transition-colors',
                tf === '5m'
                  ? 'bg-primary text-white shadow-sm'
                  : 'text-[#92adc9] hover:text-white hover:bg-[#233648]'
              )}
            >
              {tf}
            </button>
          ))}
        </div>
        <div className="h-4 w-px bg-[#233648]" />
        <div className="flex bg-[#192633] rounded-md p-0.5 gap-0.5">
          <button
            type="button"
            aria-pressed={showSMA}
            onClick={() => setShowSMA(!showSMA)}
            className={cn(
              'px-2 py-0.5 text-[10px] font-bold rounded transition-colors',
              showSMA ? 'bg-yellow-500/20 text-yellow-500' : 'text-[#92adc9] hover:text-white'
            )}
          >
            SMA
          </button>
          <button
            type="button"
            aria-pressed={showBollinger}
            onClick={() => setShowBollinger(!showBollinger)}
            className={cn(
              'px-2 py-0.5 text-[10px] font-bold rounded transition-colors',
              showBollinger ? 'bg-blue-500/20 text-blue-400' : 'text-[#92adc9] hover:text-white'
            )}
          >
            BB
          </button>
        </div>
        <div className="h-4 w-px bg-[#233648]" />
        <div className="flex items-center gap-3 text-xs text-[#92adc9]">
          <button type="button" className="flex items-center gap-1 cursor-pointer hover:text-white transition-colors">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" />
            </svg>
            インジケーター
          </button>
          <button type="button" className="flex items-center gap-1 cursor-pointer hover:text-white transition-colors">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
            </svg>
            ツール
          </button>
        </div>
      </div>
      {latestData && (
        <div className="flex items-center gap-4 text-sm tabular-nums">
          <span className="text-[#92adc9]">始: <span className="text-white">{formatCurrency(latestData.open || 0, stock?.market === 'japan' ? 'JPY' : 'USD')}</span></span>
          <span className="text-[#92adc9]">高: <span className="text-white">{formatCurrency(latestData.high || 0, stock?.market === 'japan' ? 'JPY' : 'USD')}</span></span>
          <span className="text-[#92adc9]">安: <span className="text-white">{formatCurrency(latestData.low || 0, stock?.market === 'japan' ? 'JPY' : 'USD')}</span></span>
          <span className="text-[#92adc9]">終: <span className="text-white">{formatCurrency(latestData.close || 0, stock?.market === 'japan' ? 'JPY' : 'USD')}</span></span>
        </div>
      )}
    </div>
  );
}
