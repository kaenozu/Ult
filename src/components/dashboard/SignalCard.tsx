import Link from 'next/link'
import { useQuery } from '@tanstack/react-query'
import { getSignal, getMarketData } from '@/lib/api'
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ArrowRight, Sparkles, Timer, TrendingUp } from 'lucide-react'
import React from 'react'
import TradingModal from './TradingModal'

interface SignalCardProps {
  ticker: string
  name: string
}

export default function SignalCard({ ticker, name }: SignalCardProps) {
  // LightGBM (AI) Signal
  const { data: aiSignal, isLoading: isAILoading } = useQuery({
    queryKey: ['signal', ticker, 'LightGBM'],
    queryFn: () => getSignal(ticker, 'LightGBM'),
  })

  // RSI (Technical) Signal
  const { data: rsiSignal, isLoading: isRSILoading } = useQuery({
    queryKey: ['signal', ticker, 'RSI'],
    queryFn: () => getSignal(ticker, 'RSI'),
  })

  // Bollinger Bands (Volatility) Signal
  const { data: bbSignal, isLoading: isBBLoading } = useQuery({
    queryKey: ['signal', ticker, 'BOLLINGER'],
    queryFn: () => getSignal(ticker, 'BOLLINGER'),
  })

  const { data: market, isLoading: isMarketLoading } = useQuery({
    queryKey: ['market', ticker],
    queryFn: () => getMarketData(ticker),
  })

  const isLoading =
    isAILoading || isRSILoading || isBBLoading || isMarketLoading

  if (isLoading) {
    return (
      <div className="h-[250px] w-full rounded-xl bg-muted/20 animate-pulse" />
    )
  }

  if (!aiSignal || !market) return null

  // Mixed Strategy Priority: BOLLINGER > RSI > AI
  const getPrimarySignal = () => {
    if (bbSignal && bbSignal.signal !== 0) return bbSignal
    if (rsiSignal && rsiSignal.signal !== 0) return rsiSignal
    return aiSignal
  }

  const signal = getPrimarySignal()
  const isBuy = signal.signal === 1
  const isSell = signal.signal === -1

  // Helper to get badge text
  const getSignalText = (s: number) =>
    s === 1 ? '買い' : s === -1 ? '売り' : '様子見'
  const getSignalVariant = (s: number) =>
    s === 1 ? 'default' : s === -1 ? 'destructive' : 'secondary'

  return (
    <Card className="border-none shadow-lg bg-card relative overflow-hidden group hover:shadow-xl transition-all cursor-pointer">
      <Link
        href={`/stocks/${encodeURIComponent(ticker)}`}
        className="absolute inset-0 z-10"
        aria-label={`View details for ${name}`}
      />
      <div
        className={`absolute top-0 left-0 w-1 h-full ${isBuy ? 'bg-emerald-500' : isSell ? 'bg-rose-500' : 'bg-gray-400'}`}
      />

      <CardHeader className="pb-2">
        <div className="flex justify-between items-start">
          <div>
            <CardTitle className="text-xl font-bold flex items-center gap-2">
              {name}{' '}
              <span className="text-sm font-normal text-muted-foreground">
                ({ticker})
              </span>
            </CardTitle>
            <div className="text-2xl font-bold mt-1">
              ¥{market.price.toLocaleString()}
              <span
                className={`text-sm ml-2 ${market.change >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}
              >
                {market.change >= 0 ? '+' : ''}
                {market.change_percent.toFixed(2)}%
              </span>
            </div>
          </div>
          {/* Triple Signal Badges */}
          <div className="flex flex-col gap-1 items-end">
            <Badge
              variant={getSignalVariant(bbSignal?.signal || 0)}
              className="text-[10px] px-1.5 py-0"
            >
              BB: {getSignalText(bbSignal?.signal || 0)}
            </Badge>
            <Badge
              variant={getSignalVariant(rsiSignal?.signal || 0)}
              className="text-[10px] px-1.5 py-0"
            >
              RSI: {getSignalText(rsiSignal?.signal || 0)}
            </Badge>
            <Badge
              variant={getSignalVariant(aiSignal?.signal || 0)}
              className="text-[10px] px-1.5 py-0 opacity-70"
            >
              AI: {getSignalText(aiSignal?.signal || 0)}
            </Badge>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        <div className="space-y-4">
          <div className="bg-muted/30 p-3 rounded-lg flex gap-3 items-start">
            <Sparkles className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
            <div>
              <div className="font-semibold text-sm mb-1">AI解説</div>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {signal.explanation ||
                  '現在の市場動向とテクニカル指標に基づき、上昇トレンドが継続する可能性が高いと判断しました。'}
              </p>
            </div>
          </div>

          {isBuy && (
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-4 text-sm">
                <div className="flex items-center gap-1.5 text-muted-foreground">
                  <TrendingUp className="w-4 h-4" />
                  <span>
                    期待収益率:{' '}
                    <span className="font-semibold text-foreground">+5.2%</span>
                  </span>
                </div>
                <div className="flex items-center gap-1.5 text-muted-foreground">
                  <Timer className="w-4 h-4" />
                  <span>
                    保有期間:{' '}
                    <span className="font-semibold text-foreground">1-3日</span>
                  </span>
                </div>
              </div>
              {signal.target_price && (
                <div className="text-sm bg-accent/20 p-2 rounded text-accent-foreground font-medium text-center">
                  🎯 利確目標: ¥{signal.target_price.toLocaleString()}
                </div>
              )}
            </div>
          )}
        </div>
      </CardContent>

      <CardFooter className="relative z-20">
        {' '}
        {/* Button should be clickable on top of link if needed, but here simple navigation is fine */}
        {isBuy ? (
          <TradingModal
            ticker={ticker}
            name={name}
            price={market.price}
            action="BUY"
            trigger={
              <Button
                className="w-full font-semibold h-11 shadow-md hover:shadow-lg transition-all"
                variant="default"
                onClick={(e) => e.stopPropagation()}
              >
                このチャンスに乗る (注文){' '}
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            }
          />
        ) : (
          <Button
            className="w-full font-semibold h-11 pointer-events-none"
            variant="secondary"
          >
            詳細を見る <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        )}
      </CardFooter>
    </Card>
  )
}
