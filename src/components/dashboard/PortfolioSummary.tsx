'use client'

import React from 'react'
import { Card } from '@/components/ui/card'
import { Wallet, TrendingUp, PieChart, ArrowUpRight, DollarSign } from 'lucide-react'
import { api, getPortfolio } from '@/lib/api'
import { useQuery } from '@tanstack/react-query'

export default function PortfolioSummary() {
  const { data: portfolio, isLoading } = useQuery({
    queryKey: ['portfolio'],
    queryFn: getPortfolio,
    refetchInterval: 10000
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
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {/* Total Equity */}
      <Card className="glass-panel p-4 border-l-4 border-l-primary flex flex-col justify-between">
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground uppercase tracking-wider">Total Equity</span>
          <Wallet className="w-4 h-4 text-primary" />
        </div>
        <div className="mt-2">
          <h2 className="text-2xl font-bold font-mono tracking-tight text-foreground">
            ¥{display.total_equity.toLocaleString()}
          </h2>
        </div>
      </Card>

      {/* Unrealized PnL */}
      <Card className={`glass-panel p-4 border-l-4 ${pnlIsPositive ? 'border-l-emerald-500' : 'border-l-destructive'} flex flex-col justify-between`}>
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground uppercase tracking-wider">Unrealized PnL</span>
          <TrendingUp className={`w-4 h-4 ${pnlIsPositive ? 'text-emerald-500' : 'text-destructive'}`} />
        </div>
        <div className="mt-2">
          <h2 className={`text-2xl font-bold font-mono tracking-tight ${pnlIsPositive ? 'text-emerald-400' : 'text-destructive'}`}>
            {pnlIsPositive ? '+' : ''}¥{display.unrealized_pnl.toLocaleString()}
          </h2>
        </div>
      </Card>

      {/* Cash */}
      <Card className="glass-panel p-4 border-l-4 border-l-white/20 flex flex-col justify-between">
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground uppercase tracking-wider">Available Cash</span>
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
          <span className="text-xs text-muted-foreground uppercase tracking-wider">Invested</span>
          <PieChart className="w-4 h-4 text-blue-500" />
        </div>
        <div className="mt-2">
          <h2 className="text-2xl font-bold font-mono tracking-tight text-foreground/80">
            ¥{display.invested_amount.toLocaleString()}
          </h2>
        </div>
      </Card>
    </div>
  )
}
