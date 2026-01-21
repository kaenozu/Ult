'use client';

import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { getPositions } from '@/components/shared/utils/api';
import { usePositionRow } from '@/components/shared/hooks/business/usePositionRow';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Coins, AlertTriangle, TrendingUp, TrendingDown } from 'lucide-react';
import { FixedSizeList as List } from 'react-window';
import TradingModal from './TradingModal';
import Link from 'next/link';
import { Position } from '@/types';
import { logger } from '@/lib/logger';

// Component for a single row in the position list
function PositionRow({ position }: { position: Position }) {
  const { ticker, quantity, avg_price } = position;

  const { market, currentPrice, pnl, pnlPercent, isProfit, showAlert } =
    usePositionRow(position);

  if (!market) return null; // Loading state skeleton could be here

  return (
    <div className='flex items-center justify-between p-4 bg-muted/20 rounded-lg mb-3'>
      <div>
        <div className='flex items-center gap-2'>
          <Link
            href={`/stocks/${ticker}`}
            className='font-bold text-lg hover:underline decoration-primary'
          >
            {ticker}
          </Link>
          {showAlert && (
            <Badge
              variant='destructive'
              className='flex items-center gap-1 animate-pulse'
            >
              <AlertTriangle className='h-3 w-3' />
              売り時!
            </Badge>
          )}
        </div>
        <div className='text-sm text-muted-foreground'>
          {quantity}株 | 取得単価 ¥{avg_price.toLocaleString()}
        </div>
      </div>

      <div className='text-right'>
        <div className='font-mono font-medium'>
          ¥{currentPrice.toLocaleString()}
        </div>
        <div
          className={`text-sm font-bold flex items-center justify-end ${isProfit ? 'text-green-500' : 'text-red-500'}`}
        >
          {isProfit ? (
            <TrendingUp className='h-3 w-3 mr-1' />
          ) : (
            <TrendingDown className='h-3 w-3 mr-1' />
          )}
          {pnl > 0 ? '+' : ''}
          {pnl.toLocaleString()} ({pnlPercent.toFixed(1)}%)
        </div>
      </div>

      <div className='ml-4'>
        <TradingModal
          ticker={ticker}
          name={ticker} // Ideally name fetches too
          price={currentPrice}
          action='SELL'
          maxQuantity={quantity}
          trigger={
            <Button
              size='sm'
              variant={showAlert ? 'default' : 'outline'}
              className={
                showAlert
                  ? 'bg-rose-500 hover:bg-rose-600 border-none text-white shadow-md'
                  : ''
              }
            >
              売却
            </Button>
          }
        />
      </div>
    </div>
  );
}

PositionRow.displayName = 'PositionRow';

export default function PositionList() {
  const {
    data: positions,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['positions'],
    queryFn: getPositions,
  });

  // Debug log
  logger.debug('PositionList state', {
    positionsCount: positions?.length,
    isLoading,
    hasError: !!error,
  });

  if (isLoading)
    return <div className='h-20 animate-pulse bg-muted rounded-lg' />;

  if (!positions || positions.length === 0) {
    // Empty state is handled gracefully, maybe show nothing or "No positions"
    return null;
  }

  // Virtualization for performance with long lists
  const ITEM_HEIGHT = 120; // Approximate height of each position row
  const MAX_VISIBLE_ITEMS = 10; // Show max 10 items without scrolling

  const renderRow = ({
    index,
    style,
  }: {
    index: number;
    style: React.CSSProperties;
  }) => {
    const position = positions[index];
    if (!position) return null;
    return (
      <div style={style} key={position.ticker}>
        <PositionRow position={position} />
      </div>
    );
  };

  const shouldVirtualize = positions.length > MAX_VISIBLE_ITEMS;

  return (
    <Card className='border-none shadow-none bg-transparent'>
      <CardHeader className='px-0 pt-0 pb-4'>
        <CardTitle className='text-lg font-bold flex items-center gap-2'>
          <Coins className='h-5 w-5 text-amber-500' />
          保有銘柄 (Portfolio)
        </CardTitle>
      </CardHeader>
      <CardContent className='px-0'>
        {shouldVirtualize ? (
          <List
            height={ITEM_HEIGHT * MAX_VISIBLE_ITEMS}
            width="100%"
            itemCount={positions.length}
            itemSize={ITEM_HEIGHT}
            className='space-y-2'
          >
            {renderRow}
          </List>
        ) : (
          <div className='space-y-2'>
            {positions.map(pos => (
              <PositionRow key={pos.ticker} position={pos} />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
