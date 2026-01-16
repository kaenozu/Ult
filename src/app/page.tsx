'use client'

import React from 'react'
import PortfolioSummary from '@/components/dashboard/PortfolioSummary'
import SignalCard from '@/components/dashboard/SignalCard'
import AutoTradeControls from '@/components/dashboard/AutoTradeControls'
import PositionList from '@/components/dashboard/PositionList'
import EcosystemGraph from '@/components/visualizations/EcosystemGraph'
import MacroStrip from '@/components/dashboard/MacroStrip'
import AIAdvisorPanel from '@/components/dashboard/AIAdvisorPanel'

// Phase 11 New Components
import SystemMonitor from '@/components/dashboard/SystemMonitor'
import AIAgentAvatar from '@/components/dashboard/AIAgentAvatar'
// Phase 13 New Components
import DashboardOnboarding from '@/components/dashboard/DashboardOnboarding'
import { useQuery } from '@tanstack/react-query'

// Curated AI/Semiconductor focused stocks to watch
const WATCHLIST = [
  { ticker: '6857.T', name: 'アドバンテスト' },
  { ticker: '8035.T', name: '東京エレクトロン' },
  { ticker: '6920.T', name: 'レーザーテック' },
  { ticker: '4062.T', name: 'イビデン' },
  { ticker: '6758.T', name: 'ソニーG' },
  { ticker: '9984.T', name: 'ソフトバンクG' },
]

export default function Home() {
  const { data: portfolio, isLoading } = useQuery({
    queryKey: ['portfolio'],
    queryFn: async () => {
      try {
        const res = await fetch('/api/v1/portfolio')
        if (!res.ok) return null // Handle failure gracefully
        return res.json()
      } catch (e) {
        return null
      }
    },
    refetchInterval: 5000
  })

  // Show loading state or skeleton if needed
  if (isLoading) {
    return <div className="min-h-screen flex items-center justify-center text-primary animate-pulse">SYSTEM SYNCHRONIZING...</div>
  }

  // Check for Zero State (Void)
  // If portfolio is null (API down) or total_equity is 0 (No funds)
  const isZeroState = !portfolio || portfolio.total_equity === 0

  // NOTE: For development/testing, if API is down, we might want to show Onboarding or Error.
  // Currently defaulting to Onboarding if no data.

  if (isZeroState) {
    return (
      <div className="flex flex-col min-h-screen items-center justify-center p-4">
        <AIAgentAvatar state="IDLE" />
        <DashboardOnboarding />
      </div>
    )
  }

  return (
    <div className="flex flex-col min-h-screen">
      <MacroStrip />
      <div className="p-6 md:p-8 space-y-8 max-w-[1600px] mx-auto pb-32 flex-1 w-full">
        {/* Top Section: AI Status & Portfolio HUD */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column: Ghost & System Monitor */}
          <div className="lg:col-span-1 flex flex-col gap-6">
            <AIAgentAvatar state="IDLE" />
            <div className="h-80">
              <SystemMonitor />
            </div>
            {/* AI Advisor Panel (Text Output) */}
            <AIAdvisorPanel />
          </div>

          {/* Portfolio HUD (Takes up 2 columns) */}
          <div className="lg:col-span-2 flex flex-col gap-6">
            <PortfolioSummary />
            <AutoTradeControls />
          </div>
        </div>

        {/* Neural Nexus Visualization */}
        <section>
          <EcosystemGraph />
        </section>

        {/* Middle Section: Profit Navigator (Signals) */}
        <section>
          <div className="flex items-center gap-3 mb-4">
            <div className="h-8 w-1 bg-primary rounded-full shadow-[0_0_10px_rgba(0,240,255,0.5)]" />
            <h2 className="text-xl font-bold tracking-tight text-foreground uppercase">
              Profit Navigator <span className="text-muted-foreground text-sm ml-2 font-normal">AI Analysis Feed</span>
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {WATCHLIST.map((stock) => (
              <SignalCard key={stock.ticker} ticker={stock.ticker} name={stock.name} />
            ))}
          </div>
        </section>

        {/* Bottom Section: Active Positions */}
        <section>
          <div className="flex items-center gap-3 mb-4">
            <div className="h-8 w-1 bg-emerald-500 rounded-full shadow-[0_0_10px_rgba(16,185,129,0.5)]" />
            <h2 className="text-xl font-bold tracking-tight text-foreground uppercase">
              Active Assets
            </h2>
          </div>
          <div className="glass-panel rounded-xl p-1">
            <PositionList />
          </div>
        </section>
      </div>
    </div>
  )
}
