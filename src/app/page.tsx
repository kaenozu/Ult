"use client";

import React from "react";
import MatrixRain from "@/components/ui/matrix-rain";
import MatrixPortfolioSummary from "@/components/features/dashboard/MatrixPortfolioSummary";
import SignalCard from "@/components/features/dashboard/SignalCard";
import AutoTradeControls from "@/components/features/dashboard/AutoTradeControls";
import MatrixPositionList from "@/components/features/dashboard/MatrixPositionList";
import EcosystemGraph from "@/components/visualizations/EcosystemGraph";
import MacroStrip from "@/components/features/dashboard/MacroStrip";
import AIAdvisorPanel from "@/components/features/dashboard/AIAdvisorPanel";

// Phase 11 New Components
import SystemMonitor from "@/components/features/dashboard/SystemMonitor";
import AIAgentAvatar from "@/components/features/dashboard/AIAgentAvatar";
// Phase 13 New Components
import DashboardOnboarding from "@/components/features/dashboard/DashboardOnboarding";
// Phase 4 Autonomy: VibeCheck Components
import MarketStatusCard from "@/components/features/dashboard/MarketStatusCard";
import PriceAlerts from "@/components/features/dashboard/PriceAlerts";
// Visuals First: AI Thinking Components
import NeuralMonitor from "@/components/NeuralMonitorAdvanced";
// Swipe Notification Demo
import { SwipeNotificationDemo } from "@/components/demo/SwipeNotificationDemo";
import { ApprovalCardsDemo } from "@/components/features/approvals/ApprovalCardsDemo";
import { useQuery } from "@tanstack/react-query";
import dynamic from "next/dynamic";

const VoidScene = dynamic(() => import("@/components/features/xr/VoidScene"), {
  ssr: false,
});

// Curated AI/Semiconductor focused stocks to watch
const WATCHLIST = [
  { ticker: "6857.T", name: "アドバンテスト" },
  { ticker: "8035.T", name: "東京エレクトロン" },
  { ticker: "6920.T", name: "レーザーテック" },
  { ticker: "4062.T", name: "イビデン" },
  { ticker: "6758.T", name: "ソニーG" },
  { ticker: "9984.T", name: "ソフトバンクG" },
];

export default function Home() {
  const { data: portfolio, isLoading } = useQuery({
    queryKey: ["portfolio"],
    queryFn: async () => {
      try {
        const res = await fetch("/api/v1/portfolio");
        if (!res.ok) return null; // Handle failure gracefully
        return res.json();
      } catch (e) {
        return null;
      }
    },
    refetchInterval: 5000,
  });

  // Show loading state or skeleton if needed
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-primary animate-pulse">
        SYSTEM SYNCHRONIZING...
      </div>
    );
  }

  // Check for Zero State (Void)
  // If portfolio is null (API down) or total_equity is 0 (No funds)
  const isZeroState = !portfolio || portfolio.total_equity === 0;

  // NOTE: For development/testing, if API is down, we might want to show Onboarding or Error.
  // Currently defaulting to Onboarding if no data.

  if (isZeroState) {
    return (
      <div className="flex flex-col min-h-screen items-center justify-center p-4">
        <AIAgentAvatar state="IDLE" />
        <DashboardOnboarding />
      </div>
    );
  }

  return (
    <MatrixRain intensity={0.3}>
      <div className="flex flex-col min-h-screen">
        <MacroStrip />
        <div className="p-6 md:p-8 space-y-8 max-w-[1600px] mx-auto pb-32 flex-1 w-full">
          {/* Top Section: AI Status & Portfolio HUD */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left Column: VibeCheck & System Monitor */}
            <div className="lg:col-span-1 flex flex-col gap-6">
              {/* VibeCheck: Market Status with Persona Protocol */}
              <MarketStatusCard />
              {/* Real-time Price Alerts */}
              <PriceAlerts />
              <AIAgentAvatar state="IDLE" />
              <div className="h-80">
                <SystemMonitor />
              </div>
              {/* AI Advisor Panel (Text Output) */}
              <AIAdvisorPanel />
            </div>

            {/* Portfolio HUD (Takes up 2 columns) */}
            <div className="lg:col-span-2 flex flex-col gap-6">
              <MatrixPortfolioSummary />
              <AutoTradeControls />
            </div>
          </div>

          {/* In-App Swipe Notification Demo */}
          <section>
            <div className="flex items-center gap-3 mb-4">
              <div className="h-8 w-1 bg-gradient-to-b from-green-400 via-blue-400 to-purple-400 rounded-full shadow-[0_0_20px_rgba(34,197,94,0.5)]" />
              <h2 className="text-xl font-bold tracking-tight text-foreground uppercase">
                In-App Swipe{" "}
                <span className="text-muted-foreground text-sm ml-2 font-normal">
                  No More Context Switching
                </span>
              </h2>
            </div>
            <SwipeNotificationDemo />
          </section>

          {/* Instant Approval Cards Section */}
          <section>
            <div className="flex items-center gap-3 mb-4">
              <div className="h-8 w-1 bg-gradient-to-b from-red-400 via-orange-400 to-yellow-400 rounded-full shadow-[0_0_20px_rgba(239,68,68,0.5)]" />
              <h2 className="text-xl font-bold tracking-tight text-foreground uppercase">
                Instant Approvals{" "}
                <span className="text-muted-foreground text-sm ml-2 font-normal">
                  Ops Technical Design - Ephemeral UI
                </span>
              </h2>
            </div>
            <ApprovalCardsDemo />
          </section>

          {/* Visuals First: AI Thinking Section */}
          <section>
            {/* Phase 5: Void Terminal */}
            <div className="flex items-center gap-3 mb-4">
              <div className="h-8 w-1 bg-gradient-to-b from-purple-400 via-pink-500 to-red-500 rounded-full shadow-[0_0_20px_rgba(168,85,247,0.5)]" />
              <h2 className="text-xl font-bold tracking-tight text-foreground uppercase">
                The Void Terminal{" "}
                <span className="text-xs text-purple-400 ml-2 border border-purple-500/30 px-2 py-0.5 rounded">
                  Phase 5.0
                </span>
              </h2>
            </div>
            <div className="w-full mb-8">
              <VoidScene />
            </div>

            <div className="flex items-center gap-3 mb-4">
              <div className="h-8 w-1 bg-gradient-to-b from-cyan-400 via-purple-400 to-emerald-400 rounded-full shadow-[0_0_20px_rgba(0,255,255,0.5)]" />
              <h2 className="text-xl font-bold tracking-tight text-foreground uppercase">
                Neural Cortex{" "}
                <span className="text-xs text-cyan-400 ml-2 border border-cyan-500/30 px-2 py-0.5 rounded">
                  Phase 4.2
                </span>
              </h2>
            </div>

            <div className="w-full">
              <NeuralMonitor />
            </div>
          </section>

          {/* Neural Nexus Visualization */}
          <section>
            <EcosystemGraph />
          </section>

          {/* Middle Section: Profit Navigator (Signals) */}
          <section>
            <div className="flex items-center gap-3 mb-4">
              <div className="h-8 w-1 bg-primary rounded-full shadow-[0_0_10px_rgba(0,240,255,0.5)]" />
              <h2 className="text-xl font-bold tracking-tight text-foreground uppercase">
                Profit Navigator{" "}
                <span className="text-muted-foreground text-sm ml-2 font-normal">
                  AI Analysis Feed
                </span>
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {WATCHLIST.map((stock) => (
                <SignalCard
                  key={stock.ticker}
                  ticker={stock.ticker}
                  name={stock.name}
                />
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
              <MatrixPositionList />
            </div>
          </section>
        </div>
      </div>
    </MatrixRain>
  );
}
