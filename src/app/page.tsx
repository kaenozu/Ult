'use client';

import React from 'react';
import MatrixRain from '@/components/ui/matrix-rain';
import { useQuery } from '@tanstack/react-query';
import {
  createFeatureLazyComponent,
  createDashboardLazyComponent,
} from '@/components/shared/Loading';

// Core components - immediate load
import { SwipeNotificationDemo } from '@/components/demo/SwipeNotificationDemo';

// Heavy components - lazy load with unified loading
const MatrixPortfolioSummary = createDashboardLazyComponent(
  'MatrixPortfolioSummary',
  () => import('@/components/features/dashboard/MatrixPortfolioSummary')
);

const SignalCard = createDashboardLazyComponent(
  'SignalCard',
  () => import('@/components/features/dashboard/SignalCard')
);

const AutoTradeControls = createDashboardLazyComponent(
  'AutoTradeControls',
  () => import('@/components/features/dashboard/AutoTradeControls')
);

const MatrixPositionList = createDashboardLazyComponent(
  'MatrixPositionList',
  () => import('@/components/features/dashboard/MatrixPositionList')
);

const EcosystemGraph = createFeatureLazyComponent(
  'Neural',
  'Network',
  () => import('@/components/visualizations/EcosystemGraph')
);

import { useNeuralStore } from '@/lib/store/neuralStore';

const MacroStrip = createDashboardLazyComponent(
  'MacroStrip',
  () => import('@/components/features/dashboard/MacroStrip')
);

const MarketSummary = createDashboardLazyComponent(
  'MarketSummary',
  () => import('@/components/features/dashboard/MarketSummary')
);

const NewsShockRadar = createDashboardLazyComponent(
  'NewsShockRadar',
  () => import('@/components/features/dashboard/NewsShockRadar')
);

const EarningsHunterPanel = createDashboardLazyComponent(
  'EarningsHunterPanel',
  () => import('@/components/features/dashboard/EarningsHunterPanel')
);

const NeuralTradingDaemon = createFeatureLazyComponent(
  'Neural',
  'Daemon',
  () => import('@/components/features/dashboard/NeuralTradingDaemon')
);

// Additional lazy-loaded components
const AIAdvisorPanel = createDashboardLazyComponent(
  'AIAdvisorPanel',
  () => import('@/components/features/dashboard/AIAdvisorPanel')
);

const SystemMonitor = createDashboardLazyComponent(
  'SystemMonitor',
  () => import('@/components/features/dashboard/SystemMonitor')
);

const AIAgentAvatar = createDashboardLazyComponent(
  'AIAgentAvatar',
  () => import('@/components/features/dashboard/AIAgentAvatar')
);

const DashboardOnboarding = createDashboardLazyComponent(
  'DashboardOnboarding',
  () => import('@/components/features/dashboard/DashboardOnboarding')
);

const MarketStatusCard = createDashboardLazyComponent(
  'MarketStatusCard',
  () => import('@/components/features/dashboard/MarketStatusCard')
);

const PriceAlerts = createDashboardLazyComponent(
  'PriceAlerts',
  () => import('@/components/features/dashboard/PriceAlerts')
);

const NeuralMonitor = createFeatureLazyComponent(
  'Neural',
  'Monitor',
  () => import('@/components/NeuralMonitorAdvanced')
);

const ApprovalCardsDemo = createFeatureLazyComponent(
  'Approval',
  'Cards Demo',
  () =>
    import('@/components/features/approvals/ApprovalCardsDemo').then(mod => ({
      default: mod.ApprovalCardsDemo,
    }))
);

const VoidScene = createFeatureLazyComponent(
  'VR',
  'Scene',
  () => import('@/components/features/xr/VoidScene')
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

// No extra definitions needed here as they were moved to top or converted to lazy components

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
      <div className='min-h-screen flex items-center justify-center text-primary animate-pulse'>
        SYSTEM SYNCHRONIZING...
      </div>
    );
  }

  // Show error state
  if (error) {
    return (
      <div className='min-h-screen flex items-center justify-center'>
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
  const isZeroState = !portfolio || (portfolio && portfolio.total_equity === 0);

  // NOTE: For development/testing, if API is down, we might want to show Onboarding or Error.
  // Currently defaulting to Onboarding if no data.

  if (isZeroState) {
    return (
      <div className='flex flex-col min-h-screen items-center justify-center p-4'>
        <AIAgentAvatar state='IDLE' />
        <DashboardOnboarding />
      </div>
    );
  }

  return (
    <MatrixRain intensity={0.3}>
      <div className='flex flex-col min-h-screen'>
        <MacroStrip />
        <div className='p-6 md:p-8 space-y-8 max-w-[1600px] mx-auto pb-32 flex-1 w-full'>
          <div className='flex justify-end mb-4'>
            <button
              onClick={() => setIsActive(!isActive)}
              className={`px-4 py-2 rounded font-bold uppercase transition-all duration-300 ${
                isActive
                  ? 'bg-cyan-500 text-black shadow-[0_0_20px_#00ffcc]'
                  : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
              }`}
            >
              {isActive ? 'Divine Mode: ON' : 'Divine Mode: OFF'}
            </button>
          </div>

          {/* Top Section: AI Status & Portfolio HUD */}
          <div className='grid grid-cols-1 lg:grid-cols-3 gap-6'>
            {/* Left Column: VibeCheck & System Monitor */}
            <div className='lg:col-span-1 flex flex-col gap-6'>
              <MarketStatusCard />
              <PriceAlerts />
              <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
                <MarketSummary />
                <NewsShockRadar />
              </div>
              <AIAgentAvatar state='IDLE' />
              <div className='h-80'>
                <SystemMonitor />
              </div>
              <AIAdvisorPanel />
            </div>

            {/* Portfolio HUD (Takes up 2 columns) */}
            <div className='lg:col-span-2 flex flex-col gap-6'>
              <MatrixPortfolioSummary />
              <AutoTradeControls />
              <NeuralTradingDaemon />
            </div>
          </div>

          {/* New Feature: Earnings Hunter */}
          <section>
            <div className='flex items-center gap-3 mb-4'>
              <div className='h-8 w-1 bg-gradient-to-b from-yellow-400 to-orange-500 rounded-full shadow-[0_0_20px_rgba(251,191,36,0.5)]' />
              <h2 className='text-xl font-bold tracking-tight text-foreground uppercase'>
                Alpha Generation{' '}
                <span className='text-muted-foreground text-sm ml-2 font-normal'>
                  Earnings Hunter Protocol
                </span>
              </h2>
            </div>
            <EarningsHunterPanel />
          </section>

          {/* Standard Sections */}
          <section>
            <div className='flex items-center gap-3 mb-4'>
              <div className='h-8 w-1 bg-gradient-to-b from-green-400 via-blue-400 to-purple-400 rounded-full shadow-[0_0_20px_rgba(34,197,94,0.5)]' />
              <h2 className='text-xl font-bold tracking-tight text-foreground uppercase'>
                In-App Swipe{' '}
                <span className='text-muted-foreground text-sm ml-2 font-normal'>
                  No More Context Switching
                </span>
              </h2>
            </div>
            <SwipeNotificationDemo />
          </section>

          <section>
            <div className='flex items-center gap-3 mb-4'>
              <div className='h-8 w-1 bg-gradient-to-b from-red-400 via-orange-400 to-yellow-400 rounded-full shadow-[0_0_20px_rgba(239,68,68,0.5)]' />
              <h2 className='text-xl font-bold tracking-tight text-foreground uppercase'>
                Instant Approvals{' '}
                <span className='text-muted-foreground text-sm ml-2 font-normal'>
                  Ops Technical Design - Ephemeral UI
                </span>
              </h2>
            </div>
            <ApprovalCardsDemo />
          </section>

          <section>
            <div className='flex items-center gap-3 mb-4'>
              <div className='h-8 w-1 bg-gradient-to-b from-purple-400 via-pink-500 to-red-500 rounded-full shadow-[0_0_20px_rgba(168,85,247,0.5)]' />
              <h2 className='text-xl font-bold tracking-tight text-foreground uppercase'>
                The Void Terminal{' '}
                <span className='text-xs text-purple-400 ml-2 border border-purple-500/30 px-2 py-0.5 rounded'>
                  Phase 5.0
                </span>
              </h2>
            </div>
            <div className='w-full mb-8'>
              <VoidScene />
            </div>

            <div className='flex items-center gap-3 mb-4'>
              <div className='h-8 w-1 bg-gradient-to-b from-cyan-400 via-purple-400 to-emerald-400 rounded-full shadow-[0_0_20px_rgba(0,255,255,0.5)]' />
              <h2 className='text-xl font-bold tracking-tight text-foreground uppercase'>
                Neural Cortex{' '}
                <span className='text-xs text-cyan-400 ml-2 border border-cyan-500/30 px-2 py-0.5 rounded'>
                  Phase 4.2
                </span>
              </h2>
            </div>
            <div className='w-full'>
              <NeuralMonitor />
            </div>
          </section>

          <section>
            <EcosystemGraph />
          </section>

          <section>
            <div className='flex items-center gap-3 mb-4'>
              <div className='h-8 w-1 bg-primary rounded-full shadow-[0_0_10px_rgba(0,240,255,0.5)]' />
              <h2 className='text-xl font-bold tracking-tight text-foreground uppercase'>
                Profit Navigator{' '}
                <span className='text-muted-foreground text-sm ml-2 font-normal'>
                  AI Analysis Feed
                </span>
              </h2>
            </div>

            <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6'>
              {WATCHLIST.map(stock => (
                <SignalCard
                  key={stock.ticker}
                  ticker={stock.ticker}
                  name={stock.name}
                />
              ))}
            </div>
          </section>

          <section>
            <div className='flex items-center gap-3 mb-4'>
              <div className='h-8 w-1 bg-emerald-500 rounded-full shadow-[0_0_10px_rgba(16,185,129,0.5)]' />
              <h2 className='text-xl font-bold tracking-tight text-foreground uppercase'>
                Active Assets
              </h2>
            </div>
            <div className='glass-panel rounded-xl p-1'>
              <MatrixPositionList />
            </div>
          </section>
        </div>
      </div>
    </MatrixRain>
  );
}
