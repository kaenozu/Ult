'use client';

import { useQuery } from '@tanstack/react-query';
import { getPositions } from '@/components/shared/utils/api';
import { usePositionRow } from '@/components/shared/hooks/business/usePositionRow';
import TradingModal from './TradingModal';
import Link from 'next/link';
import { Position } from '@/types';
import {
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  Activity,
} from 'lucide-react';
import { GlitchText } from '@/components/ui/glitch-text';

interface MatrixPositionRow {
  position: Position;
  index: number;
}

function MatrixPositionRow({ position, index }: MatrixPositionRow) {
  const { ticker, quantity, avg_price } = position;
  const { market, currentPrice, pnl, pnlPercent, isProfit, showAlert } =
    usePositionRow(position);

  if (!market) return null;

  return (
    <div
      className={`
      relative border ${showAlert ? 'border-red-500/60' : 'border-green-500/40'} bg-slate-900/40 backdrop-blur-md p-4
      hover:border-green-400/60 transition-all duration-300 group
      ${showAlert ? 'animate-pulse' : ''}
    `}
    >
      {/* Scan line effect */}
      <div className='absolute inset-0 bg-gradient-to-b from-transparent via-green-500/3 to-transparent opacity-30 pointer-events-none' />

      {/* Row Header */}
      <div className='flex items-center justify-between mb-3 relative z-10'>
        <div className='flex items-center gap-3'>
          {/* Line number */}
          <div className='text-xs font-mono text-green-500/60 w-8'>
            [{String(index + 1).padStart(3, '0')}]
          </div>

          {/* Ticker */}
          <Link
            href={`/stocks/${ticker}`}
            className='font-mono text-lg text-green-400 hover:text-green-300
              transition-colors duration-200 tracking-wider'
          >
            <GlitchText
              text={ticker}
              intensity={showAlert ? 'high' : 'low'}
              color='cyan'
              className='!text-green-400'
            />
          </Link>

          {/* Status indicators */}
          <div className='flex items-center gap-2'>
            {showAlert && (
              <div className='flex items-center gap-1 text-xs text-red-400 font-mono animate-pulse'>
                <AlertTriangle className='h-3 w-3' />
                ALERT
              </div>
            )}
            <div className='text-xs font-mono text-green-500/40'>
              <Activity className='h-3 w-3 inline animate-pulse' />
            </div>
          </div>
        </div>

        {/* Action button */}
        <div className='opacity-0 group-hover:opacity-100 transition-opacity duration-300'>
          <TradingModal
            ticker={ticker}
            name={ticker}
            price={currentPrice}
            action='SELL'
            maxQuantity={quantity}
            trigger={
              <button
                className={`
                px-3 py-1 text-xs font-mono border transition-all duration-200
                ${showAlert
                    ? "bg-red-500/20 border-red-500/60 text-red-400 hover:bg-red-500/30"
                    : "bg-green-500/20 border-green-500/60 text-green-400 hover:bg-green-500/30"
                  }
              `}
              >
                [EXECUTE_SELL]
              </button>
            }
          />
        </div>
      </div>

      {/* Data Grid */}
      <div className='grid grid-cols-2 md:grid-cols-4 gap-4 text-xs font-mono relative z-10'>
        <div>
          <div className='text-green-500/60 mb-1'>QUANTITY</div>
          <div className='text-white drop-shadow-md'>
            {quantity.toLocaleString()}
          </div>
        </div>

        <div>
          <div className='text-green-500/60 mb-1'>AVG_PRICE</div>
          <div className='text-white drop-shadow-md'>
            ¥{avg_price.toLocaleString()}
          </div>
        </div>

        <div>
          <div className='text-green-500/60 mb-1'>CURRENT</div>
          <div className='text-white drop-shadow-md'>
            ¥{currentPrice.toLocaleString()}
          </div>
        </div>

        <div>
          <div className='text-green-500/60 mb-1'>PnL</div>
          <div
            className={`flex items-center gap-1 drop-shadow-md ${isProfit ? 'text-emerald-400' : 'text-red-400'}`}
          >
            {isProfit ? (
              <TrendingUp className='h-3 w-3' />
            ) : (
              <TrendingDown className='h-3 w-3' />
            )}
            <GlitchText
              text={`${pnl > 0 ? '+' : ''}${pnl.toLocaleString()} (${pnlPercent.toFixed(1)}%)`}
              intensity={!isProfit ? 'medium' : 'low'}
              color={!isProfit ? 'red' : 'green'}
              className={isProfit ? '!text-emerald-400' : '!text-red-400'}
            />
          </div>
        </div>
      </div>

      {/* Random data stream effect */}
      <div className='absolute bottom-1 right-2 text-[8px] font-mono text-green-500/20'>
        {Math.random().toString(36).substr(2, 9).toUpperCase()}
      </div>
    </div>
  );
}

export default function MatrixPositionList() {
  const {
    data: positions,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['positions'],
    queryFn: getPositions,
  });

  if (isLoading) {
    return (
      <div className='space-y-3'>
        {Array.from({ length: 3 }, (_, i) => (
          <div
            key={i}
            className='border border-green-500/40 bg-slate-900/40 p-4 animate-pulse'
          >
            <div className='h-4 bg-green-500/20 w-1/3 mb-2'></div>
            <div className='h-3 bg-green-500/10 w-2/3'></div>
          </div>
        ))}
      </div>
    );
  }

  if (!positions || !Array.isArray(positions) || positions.length === 0) {
    return (
      <div className='border border-green-500/40 bg-slate-900/40 p-8 text-center'>
        <div className='text-green-400 font-mono mb-2'>
          <GlitchText
            text='[NO_POSITIONS_FOUND]'
            intensity='low'
            color='green'
            className='!text-green-400'
          />
        </div>
        <div className='text-xs text-green-500/60 font-mono'>
          &gt; System scan complete. No active positions detected.
        </div>
      </div>
    );
  }

  return (
    <div className='space-y-4 p-6'>
      {/* Matrix Grid Header */}
      <div className='text-center mb-8'>
        <h1 className='text-3xl font-mono text-green-400 mb-2 tracking-wider'>
          &gt; POSITION MATRIX ONLINE
        </h1>
        <div className='text-xs font-mono text-green-500/60 animate-pulse'>
          TRACKING {positions.length} ACTIVE POSITIONS
        </div>
      </div>

      {/* Position Rows */}
      <div className="space-y-3">
        {Array.isArray(positions) && positions.map((pos, index) => (
          <div key={pos.ticker} className="relative">
            <MatrixPositionRow position={pos} index={index} />
          </div>
        ))}
      </div>

      {/* Footer */}
      <div className='mt-8 text-center text-xs font-mono text-green-500/40'>
        &gt; End of position matrix // Data stream continuous
      </div>
    </div>
  );
}
