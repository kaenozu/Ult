'use client'

import { useQuery } from '@tanstack/react-query'
import { getPositions, getMarketData, getSignal } from '@/lib/api'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Coins,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  ArrowRight,
} from 'lucide-react'
import TradingModal from './TradingModal'
import Link from 'next/link'
import { Position, SignalResponse, MarketDataResponse } from '@/types'

// Component for a single row in the position list
function PositionRow({ position }: { position: Position }) {
  const { ticker, quantity, avg_price } = position

  // Fetch live market data for PnL
  const { data: market } = useQuery({
    queryKey: ['market', ticker],
    queryFn: () => getMarketData(ticker),
    refetchInterval: 10000,
  })

  // Fetch signal for "Sell Alert"
  const { data: signal } = useQuery({
    queryKey: ['signal', ticker],
    queryFn: () => getSignal(ticker),
    refetchInterval: 60000,
  })

  if (!market) return null // Loading state skeleton could be here

  const currentPrice = market.price
  const pnl = (currentPrice - avg_price) * quantity
  const pnlPercent = ((currentPrice - avg_price) / avg_price) * 100
  const isProfit = pnl >= 0

  // Alert logic: High profit (>5%) or AI Sell Signal (-1)
  const isSellSignal = signal?.signal === -1
  const isHighProfit = pnlPercent >= 5.0
  const showAlert = isSellSignal || isHighProfit

  return (
    <div className="flex items-center justify-between p-4 bg-muted/20 rounded-lg mb-3">
      <div>
        <div className="flex items-center gap-2">
          <Link
            href={`/stocks/${ticker}`}
            className="font-bold text-lg hover:underline decoration-primary"
          >
            {ticker}
          </Link>
          {showAlert && (
            <Badge
              variant="destructive"
              className="flex items-center gap-1 animate-pulse"
            >
              <AlertTriangle className="h-3 w-3" />
              売り時!
            </Badge>
          )}
        </div>
        <div className="text-sm text-muted-foreground">
          {quantity}株 | 取得単価 ¥{avg_price.toLocaleString()}
        </div>
      </div>

      <div className="text-right">
        <div className="font-mono font-medium">
          ¥{currentPrice.toLocaleString()}
        </div>
        <div
          className={`text-sm font-bold flex items-center justify-end ${isProfit ? 'text-green-500' : 'text-red-500'}`}
        >
          {isProfit ? (
            <TrendingUp className="h-3 w-3 mr-1" />
          ) : (
            <TrendingDown className="h-3 w-3 mr-1" />
          )}
          {pnl > 0 ? '+' : ''}
          {pnl.toLocaleString()} ({pnlPercent.toFixed(1)}%)
        </div>
      </div>

      <div className="ml-4">
        <TradingModal
          ticker={ticker}
          name={ticker} // Ideally name fetches too
          price={currentPrice}
          action="SELL"
          maxQuantity={quantity}
          trigger={
            <Button
              size="sm"
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
  )
}

export default function PositionList() {
  const { data: positions, isLoading } = useQuery({
    queryKey: ['positions'],
    queryFn: getPositions,
  })

  if (isLoading)
    return <div className="h-20 animate-pulse bg-muted rounded-lg" />

  if (!positions || positions.length === 0) {
    // Empty state is handled gracefully, maybe show nothing or "No positions"
    return null
  }

  return (
    <Card className="border-none shadow-none bg-transparent">
      <CardHeader className="px-0 pt-0 pb-4">
        <CardTitle className="text-lg font-bold flex items-center gap-2">
          <Coins className="h-5 w-5 text-amber-500" />
          保有銘柄 (Portfolio)
        </CardTitle>
      </CardHeader>
      <CardContent className="px-0 space-y-2">
        {positions.map((pos) => (
          <PositionRow key={pos.ticker} position={pos} />
        ))}
      </CardContent>
    </Card>
  )
}
