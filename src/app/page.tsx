'use client'

import React from 'react'
import OracleWidget from '@/components/dashboard/OracleWidget'
import PortfolioSummary from '@/components/dashboard/PortfolioSummary'
import SignalCard from '@/components/dashboard/SignalCard'
import AutoTradeControls from '@/components/dashboard/AutoTradeControls'
import PositionList from '@/components/dashboard/PositionList'

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
  return (
    <div className="p-6 md:p-8 space-y-8 max-w-[1600px] mx-auto pb-32">
      {/* Top Section: AI Status & Portfolio HUD */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Oracle Widget (Takes up 1 column on large screens) */}
        <div className="lg:col-span-1">
          <OracleWidget />
        </div>

        {/* Portfolio HUD (Takes up 2 columns) */}
        <div className="lg:col-span-2 flex flex-col gap-6">
          <PortfolioSummary />
          <AutoTradeControls />
        </div>
      </div>

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
  )
}
