'use client';

import PortfolioSummary from '@/components/dashboard/PortfolioSummary';
import PositionList from '@/components/dashboard/PositionList';
import SignalCard from '@/components/dashboard/SignalCard';
import AutoTradeControls from '@/components/dashboard/AutoTradeControls';
import { Button } from '@/components/ui/button';
import { RefreshCw, Settings } from 'lucide-react';
import Link from 'next/link';

// Curated AI/Semiconductor focused stocks for 2026
const STOCKS = [
  { ticker: "6857.T", name: "アドバンテスト" },    // 半導体検査装置
  { ticker: "8035.T", name: "東京エレクトロン" },  // 半導体製造装置
  { ticker: "6920.T", name: "レーザーテック" },    // 最先端半導体検査
  { ticker: "4062.T", name: "イビデン" },          // ICパッケージ基板
  { ticker: "6758.T", name: "ソニーG" },           // イメージセンサー
  { ticker: "7203.T", name: "トヨタ自動車" },      // EV/自動運転
  { ticker: "9984.T", name: "ソフトバンクG" },     // AI投資
  { ticker: "6501.T", name: "日立製作所" },        // デジタル/インフラ
  { ticker: "6954.T", name: "ファナック" },        // 産業用ロボット
  { ticker: "6471.T", name: "日本精工" },          // ロボティクス部品
];

export default function Home() {
  return (
    <main className="min-h-screen bg-background pb-20">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-background/80 backdrop-blur-md border-b px-4 py-3 flex justify-between items-center">
        <h1 className="text-xl font-bold font-sans tracking-tight">AGStock <span className="text-primary">Ult</span></h1>
        <div className="flex gap-1">
          <Button size="icon" variant="ghost">
            <RefreshCw className="w-5 h-5 text-muted-foreground" />
          </Button>
          <Link href="/settings">
            <Button size="icon" variant="ghost">
              <Settings className="w-5 h-5 text-muted-foreground" />
            </Button>
          </Link>
        </div>
      </header>

      <div className="p-4 space-y-8 max-w-md mx-auto md:max-w-2xl lg:max-w-4xl">

        {/* Portfolio Section */}
        <section className="space-y-4">
          <PortfolioSummary />
          <AutoTradeControls />
          <PositionList />
        </section>

        {/* AI Navigator Section */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold flex items-center gap-2">
              <span className="bg-primary/10 text-primary p-1.5 rounded-md">AI</span>
              Profit Navigator
            </h2>
            <span className="text-xs text-muted-foreground">Updated: Just now</span>
          </div>

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {STOCKS.map((stock) => (
              <SignalCard key={stock.ticker} ticker={stock.ticker} name={stock.name} />
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
