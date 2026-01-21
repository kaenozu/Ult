'use client';

import React from 'react';
import MatrixRain from '@/components/ui/matrix-rain';
import { useQuery } from '@tanstack/react-query';
import dynamic from 'next/dynamic';

// Refactored components
import { CockpitPanel } from '@/components/features/dashboard/CockpitPanel';
import { TimeMachinePanel } from '@/components/features/dashboard/TimeMachinePanel';

// Heavy components - lazy load (none currently)

const SignalCard = dynamic(
  () => import('@/components/features/dashboard/SignalCard'),
  {
    loading: () => <div className='h-24 bg-gray-800 animate-pulse rounded' />,
  }
);

const AutoTradeControls = dynamic(
  () => import('@/components/features/dashboard/AutoTradeControls'),
  {
    loading: () => <div className='h-48 bg-gray-800 animate-pulse rounded' />,
  }
);

const MatrixPositionList = dynamic(
  () => import('@/components/features/dashboard/MatrixPositionList'),
  {
    loading: () => <div className='h-64 bg-gray-800 animate-pulse rounded' />,
  }
);

const EcosystemGraph = dynamic(
  () => import('@/components/visualizations/EcosystemGraph'),
  {
    ssr: false,
    loading: () => (
      <div className='h-96 bg-gray-800 animate-pulse rounded flex items-center justify-center text-cyan-500'>
        Loading Neural Network...
      </div>
    ),
  }
);

const MacroStrip = dynamic(
  () => import('@/components/features/dashboard/MacroStrip')
);
const AIAdvisorPanel = dynamic(
  () => import('@/components/features/dashboard/AIAdvisorPanel')
);
const SystemMonitor = dynamic(
  () => import('@/components/features/dashboard/SystemMonitor')
);
const AIAgentAvatar = dynamic(
  () => import('@/components/features/dashboard/AIAgentAvatar')
);
const DashboardOnboarding = dynamic(
  () => import('@/components/features/dashboard/DashboardOnboarding')
);
const MarketStatusCard = dynamic(
  () => import('@/components/features/dashboard/MarketStatusCard')
);
const PriceAlerts = dynamic(
  () => import('@/components/features/dashboard/PriceAlerts')
);
const NeuralMonitor = dynamic(
  () =>
    import('@/components/features/NeuralMonitor').then(
      mod => mod.NeuralMonitor
    ),
  {
    ssr: false,
    loading: () => <div className='h-32 bg-gray-800 animate-pulse rounded' />,
  }
);

const ApprovalCardsDemo = dynamic(() =>
  import('@/components/features/approvals/ApprovalCardsDemo').then(mod => ({
    default: mod.ApprovalCardsDemo,
  }))
);
const VoidScene = dynamic(() => import('@/components/features/xr/VoidScene'), {
  ssr: false,
});
const NeuralTradingDaemon = dynamic(
  () => import('@/components/features/dashboard/NeuralTradingDaemon'),
  {
    ssr: false,
    loading: () => (
      <div className='h-96 bg-gray-800 animate-pulse rounded flex items-center justify-center text-purple-500'>
        Summoning Neural Daemon...
      </div>
    ),
  }
);

const NewsShockRadar = dynamic(
  () => import('@/components/features/dashboard/NewsShockRadar')
);

// Curated AI/Semiconductor focused stocks to watch
const WATCHLIST = [
  { ticker: '6857.T', name: 'アドバンテスト' },
  { ticker: '8035.T', name: '東京エレクトロン' },
  { ticker: '6920.T', name: 'レーザーテック' },
  { ticker: '4062.T', name: 'イビデン' },
  { ticker: '6758.T', name: 'ソニーG' },
  { ticker: '9984.T', name: 'ソフトバンクG' },
];

const EarningsHunterPanel = dynamic(
  () => import('@/components/features/dashboard/EarningsHunterPanel'),
  {
    loading: () => <div className='h-48 bg-gray-800 animate-pulse rounded' />,
  }
);

import { useNeuralStore } from '@/lib/store/neuralStore';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AnalyticsDashboard } from '@/components/features/analytics/AnalyticsDashboard';
import { TradeReplayWidget } from '@/components/features/analytics/TradeReplayWidget';

export default function Home() {
  const { isActive, setIsActive } = useNeuralStore();
  const {
    data: portfolio,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['portfolio'],
    queryFn: async () => {
      const res = await fetch('/api/v1/portfolio');
      if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`);
      return res.json();
    },
    retry: 3,
    staleTime: 5 * 60 * 1000, // 5分
    refetchInterval: 30000, // 30秒ごとの更新
  });

  // Show loading state
  if (isLoading) {
    return (
      <div className='min-h-dvh flex items-center justify-center text-primary animate-pulse'>
        SYSTEM SYNCHRONIZING...
      </div>
    );
  }

  // Show error state
  if (error) {
    return (
      <div className='min-h-dvh flex items-center justify-center'>
        <div className='text-center space-y-4'>
          <div className='text-red-500 text-xl font-bold'>CONNECTION ERROR</div>
          <div className='text-gray-400 text-sm'>
            Unable to load portfolio data
          </div>
          <button
            onClick={() => window.location.reload()}
            className='px-4 py-2 bg-primary text-primary-foreground rounded hover:bg-primary/80'
          >
            Retry
          </button>
        </div>
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
      <div className='flex flex-col min-h-dvh items-center justify-center p-4'>
        <AIAgentAvatar state='IDLE' />
        <DashboardOnboarding />
      </div>
    );
  }

  return (
    <MatrixRain intensity={0.3}>
      <div className='flex flex-col min-h-dvh'>
        <MacroStrip />
        <div className='p-6 md:p-8 space-y-8 max-w-[1600px] mx-auto pb-32 flex-1 w-full'>
          <div className='flex justify-between items-center mb-4'>
            <Tabs defaultValue='live' className='w-full'>
              <div className='flex justify-between items-center mb-6'>
                <TabsList className='grid w-[400px] grid-cols-2'>
                  <TabsTrigger
                    value='live'
                    className='uppercase font-bold tracking-wider'
                  >
                    Cockpit (Live)
                  </TabsTrigger>
                  <TabsTrigger
                    value='replay'
                    className='uppercase font-bold tracking-wider text-cyan-400'
                  >
                    Time Machine
                  </TabsTrigger>
                </TabsList>

                <button
                  onClick={() => setIsActive(!isActive)}
                  className={`px-4 py-2 rounded font-bold uppercase transition-all duration-300 ${isActive ? 'bg-cyan-500 text-black shadow-[0_0_20px_#00ffcc]' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'}`}
                >
                  {isActive ? 'Divine Mode: ON' : 'Divine Mode: OFF'}
                </button>
              </div>

<<<<<<< HEAD
              <TabsContent value="live" className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                {/* Top Section: AI Status & Portfolio HUD */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  {/* Left Column: VibeCheck & System Monitor */}
                  <div className="lg:col-span-1 flex flex-col gap-6">
                    {/* VibeCheck: Market Status with Persona Protocol */}
                    <MarketStatusCard />
                    {/* Real-time Price Alerts */}
                    <PriceAlerts />
                    {/* Top Row: News Radar */}
                    <div className="mb-8">
                      <NewsShockRadar />
                    </div>

                    {/* AI Advisor & Neural Monitor & Daemon */}
                    <AIAgentAvatar state="IDLE" />
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                      <div className="h-80">
                        <SystemMonitor />
                      </div>
                      <div className="h-80">
                        <NeuralTradingDaemon />
                      </div>
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
                {/* 
                <section>
                  <div className="flex items-center gap-3 mb-4">
                    <div className="h-8 w-1 bg-gradient-to-b from-green-400 via-blue-400 to-purple-400 rounded-full shadow-[0_0_20px_rgba(34,197,94,0.5)]" />
                    <h2 className="text-xl font-bold tracking-tight text-balance text-foreground uppercase">
                      In-App Swipe{" "}
                      <span className="text-muted-foreground text-sm ml-2 font-normal">
                        No More Context Switching
                      </span>
                    </h2>
                  </div>
                  <SwipeNotificationDemo />
                </section>

                <section>
                  <div className="flex items-center gap-3 mb-4">
                    <div className="h-8 w-1 bg-gradient-to-b from-red-400 via-orange-400 to-yellow-400 rounded-full shadow-[0_0_20px_rgba(239,68,68,0.5)]" />
                    <h2 className="text-xl font-bold tracking-tight text-balance text-foreground uppercase">
                      Instant Approvals{" "}
                      <span className="text-muted-foreground text-sm ml-2 font-normal">
                        Ops Technical Design - Ephemeral UI
                      </span>
                    </h2>
                  </div>
                  <ApprovalCardsDemo />
                </section>
                */}

                {/* Visuals First: AI Thinking Section */}
                <section>
                  {/* Phase 6: Neural Trading Daemon */}
                  <div className="flex items-center gap-3 mb-4">
                    <div className="h-8 w-1 bg-gradient-to-b from-red-400 via-orange-400 to-yellow-400 rounded-full shadow-[0_0_20px_rgba(255,0,0,0.8)] animate-pulse" />
                    <h2 className="text-xl font-bold tracking-tight text-balance text-foreground uppercase">
                      Neural Trading Daemon{" "}
                      <span className="text-xs text-red-400 ml-2 border border-red-500/50 px-2 py-0.5 rounded animate-pulse">
                        Phase 6.0 - CHAOS UNLEASHED
                      </span>
                    </h2>
                  </div>
                  <div className="w-full mb-8">
                    <NeuralTradingDaemon />
                  </div>

                  {/* Phase 5: Void Terminal */}
                  <div className="flex items-center gap-3 mb-4">
                    <div className="h-8 w-1 bg-gradient-to-b from-purple-400 via-pink-500 to-red-500 rounded-full shadow-[0_0_20px_rgba(168,85,247,0.5)]" />
                    <h2 className="text-xl font-bold tracking-tight text-balance text-foreground uppercase">
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
                    <h2 className="text-xl font-bold tracking-tight text-balance text-foreground uppercase">
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
                    <h2 className="text-xl font-bold tracking-tight text-balance text-foreground uppercase">
                      Profit Navigator{" "}
                      <span className="text-muted-foreground text-sm ml-2 font-normal">
                        AI Analysis Feed
                      </span>
                    </h2>
                  </div>

                  {/* Phase 6: Alpha Generation (Earnings Hunter) */}
                  <div className="mb-6">
                    <EarningsHunterPanel />
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
                    <h2 className="text-xl font-bold tracking-tight text-balance text-foreground uppercase">
                      Active Assets
                    </h2>
                  </div>
                  <div className="glass-panel rounded-xl p-1">
                    <MatrixPositionList />
                  </div>
                </section>
=======
              <TabsContent
                value='live'
                className='space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500'
              >
                <CockpitPanel isActive={isActive} setIsActive={setIsActive} />
>>>>>>> main
              </TabsContent>

              <TabsContent
                value='replay'
                className='space-y-8 animate-in fade-in zoom-in-95 duration-300'
              >
                <TimeMachinePanel />
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </div>
    </MatrixRain>
  );
}
