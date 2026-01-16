'use client'

import React from 'react'
import { Card } from '@/components/ui/card'
import { Wallet, TrendingUp, PieChart, ArrowUpRight, DollarSign } from 'lucide-react'
import { api, getPortfolio } from '@/lib/api'
import { useQuery } from '@tanstack/react-query'

import AssetAllocation from './AssetAllocation'

export default function PortfolioSummary() {
  const { data: portfolio, isLoading } = useQuery({
    queryKey: ['portfolio'],
    queryFn: async () => {
      // Use proxy path for CORS avoidance
      const res = await fetch('/api/v1/portfolio')
      if (!res.ok) throw new Error('Failed to fetch portfolio')
      return res.json()
    },
    refetchInterval: 5000 // Realtime updates 5s
  })

  // Skeleton / Loading state could be added here
  const display = portfolio || {
    total_equity: 0,
    cash: 0,
    unrealized_pnl: 0,
    invested_amount: 0
  }

  const pnlIsPositive = display.unrealized_pnl >= 0

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* Total Equity */}
        <Card className="glass-panel p-4 border-l-4 border-l-primary flex flex-col justify-between relative overflow-hidden group">
          <div className="absolute inset-0 bg-primary/5 opacity-0 group-hover:opacity-100 transition-opacity" />
          <div className="flex items-center justify-between z-10">
            <span className="text-xs text-muted-foreground uppercase tracking-wider">総資産 (Equity)</span>
            <Wallet className="w-4 h-4 text-primary" />
          </div>
          <div className="mt-2 z-10">
            <h2 className="text-2xl font-bold font-mono tracking-tight text-foreground">
              ¥{display.total_equity.toLocaleString()}
            </h2>
          </div>
        </Card>

        {/* Unrealized PnL */}
        <Card className={`glass-panel p-4 border-l-4 ${pnlIsPositive ? 'border-l-emerald-500' : 'border-l-destructive'} flex flex-col justify-between relative overflow-hidden`}>
          <div className={`absolute inset-0 opacity-0 hover:opacity-10 transition-opacity ${pnlIsPositive ? 'bg-emerald-500' : 'bg-destructive'}`} />
          <div className="flex items-center justify-between z-10">
            <span className="text-xs text-muted-foreground uppercase tracking-wider">評価損益 (PnL)</span>
            <TrendingUp className={`w-4 h-4 ${pnlIsPositive ? 'text-emerald-500' : 'text-destructive'}`} />
          </div>
          <div className="mt-2 z-10">
            <h2 className={`text-2xl font-bold font-mono tracking-tight ${pnlIsPositive ? 'text-emerald-400' : 'text-destructive'}`}>
              {pnlIsPositive ? '+' : ''}¥{display.unrealized_pnl.toLocaleString()}
            </h2>
          </div>
        </Card>

        {/* Cash */}
        <Card className="glass-panel p-4 border-l-4 border-l-white/20 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground uppercase tracking-wider">余力 (Cash)</span>
            <DollarSign className="w-4 h-4 text-muted-foreground" />
          </div>
          <div className="mt-2">
            <h2 className="text-2xl font-bold font-mono tracking-tight text-foreground/80">
              ¥{display.cash.toLocaleString()}
            </h2>
          </div>
        </Card>

        {/* Invested */}
        <Card className="glass-panel p-4 border-l-4 border-l-blue-500 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground uppercase tracking-wider">投資額 (Invested)</span>
            <PieChart className="w-4 h-4 text-blue-500" />
          </div>
          <div className="mt-2">
            <h2 className="text-2xl font-bold font-mono tracking-tight text-foreground/80">
              ¥{display.invested_amount.toLocaleString()}
            </h2>
          </div>
        </Card>
      </div>

      {/* Sci-Fi Asset Allocation Vis */}
      <div className="glass-map p-4 rounded-xl border border-white/10 relative overflow-hidden min-h-[300px]">
        <div className="absolute top-2 left-4 text-[10px] text-muted-foreground/60 uppercase tracking-[0.3em] z-10">
          Orbital Asset View (資産配分)
        </div>
        <div className="w-full h-full flex items-center justify-center">
          <AssetAllocation />
        </div>
      </div>
    </div>
  )
}
