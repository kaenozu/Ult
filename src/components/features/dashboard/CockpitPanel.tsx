import React from 'react';
import dynamic from 'next/dynamic';

// Lazy loaded components
const MatrixPortfolioSummary = dynamic(
  () => import('@/components/features/dashboard/MatrixPortfolioSummary'),
  {
    loading: () => <div className='h-32 bg-gray-800 animate-pulse rounded' />,
  }
);

const AutoTradeControls = dynamic(
  () => import('@/components/features/dashboard/AutoTradeControls'),
  {
    loading: () => <div className='h-48 bg-gray-800 animate-pulse rounded' />,
  }
);

const MarketStatusCard = dynamic(
  () => import('@/components/features/dashboard/MarketStatusCard')
);

const PriceAlerts = dynamic(
  () => import('@/components/features/dashboard/PriceAlerts')
);

const NewsShockRadar = dynamic(
  () => import('@/components/features/dashboard/NewsShockRadar')
);

const AIAgentAvatar = dynamic(
  () => import('@/components/features/dashboard/AIAgentAvatar')
);

const SystemMonitor = dynamic(
  () => import('@/components/features/dashboard/SystemMonitor')
);

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

const AIAdvisorPanel = dynamic(
  () => import('@/components/features/dashboard/AIAdvisorPanel')
);

const SwipeNotificationDemo = dynamic(() =>
  import('@/components/demo/SwipeNotificationDemo').then(mod => ({
    default: mod.SwipeNotificationDemo,
  }))
);

const ApprovalCardsDemo = dynamic(() =>
  import('@/components/features/approvals/ApprovalCardsDemo').then(mod => ({
    default: mod.ApprovalCardsDemo,
  }))
);

interface CockpitPanelProps {
  isActive: boolean;
  setIsActive: (active: boolean) => void;
}

export const CockpitPanel: React.FC<CockpitPanelProps> = ({
  isActive,
  setIsActive,
}) => {
  return (
    <div className='space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500'>
      {/* Top Section: AI Status & Portfolio HUD */}
      <div className='grid grid-cols-1 lg:grid-cols-3 gap-6'>
        {/* Left Column: VibeCheck & System Monitor */}
        <div className='lg:col-span-1 flex flex-col gap-6'>
          {/* VibeCheck: Market Status with Persona Protocol */}
          <MarketStatusCard />
          {/* Real-time Price Alerts */}
          <PriceAlerts />
          {/* Top Row: News Radar */}
          <div className='mb-8'>
            <NewsShockRadar />
          </div>

          {/* AI Advisor & Neural Monitor & Daemon */}
          <AIAgentAvatar state='IDLE' />
          <div className='grid grid-cols-1 md:grid-cols-2 gap-6 mb-8'>
            <div className='h-80'>
              <SystemMonitor />
            </div>
            <div className='h-80'>
              <NeuralTradingDaemon />
            </div>
          </div>
          {/* AI Advisor Panel (Text Output) */}
          <AIAdvisorPanel />
        </div>

        {/* Portfolio HUD (Takes up 2 columns) */}
        <div className='lg:col-span-2 flex flex-col gap-6'>
          <MatrixPortfolioSummary />
          <AutoTradeControls />
        </div>
      </div>

      {/* In-App Swipe Notification Demo */}
      <section>
        <div className='flex items-center gap-3 mb-4'>
          <div className='h-8 w-1 bg-gradient-to-b from-green-400 via-blue-400 to-purple-400 rounded-full shadow-[0_0_20px_rgba(34,197,94,0.5)]' />
          <h2 className='text-xl font-bold tracking-tight text-balance text-foreground uppercase'>
            In-App Swipe{' '}
            <span className='text-muted-foreground text-sm ml-2 font-normal'>
              No More Context Switching
            </span>
          </h2>
        </div>
        <SwipeNotificationDemo />
      </section>

      {/* Instant Approval Cards Section */}
      <section>
        <div className='flex items-center gap-3 mb-4'>
          <div className='h-8 w-1 bg-gradient-to-b from-red-400 via-orange-400 to-yellow-400 rounded-full shadow-[0_0_20px_rgba(239,68,68,0.5)]' />
          <h2 className='text-xl font-bold tracking-tight text-balance text-foreground uppercase'>
            Instant Approvals{' '}
            <span className='text-muted-foreground text-sm ml-2 font-normal'>
              Ops Technical Design - Ephemeral UI
            </span>
          </h2>
        </div>
        <ApprovalCardsDemo />
      </section>

      {/* Visuals First: AI Thinking Section */}
      <section>
        {/* Phase 6: Neural Trading Daemon */}
        <div className='flex items-center gap-3 mb-4'>
          <div className='h-8 w-1 bg-gradient-to-b from-red-400 via-orange-400 to-yellow-400 rounded-full shadow-[0_0_20px_rgba(255,0,0,0.8)] animate-pulse' />
          <h2 className='text-xl font-bold tracking-tight text-balance text-foreground uppercase'>
            Neural Trading Daemon{' '}
            <span className='text-xs text-red-400 ml-2 border border-red-500/50 px-2 py-0.5 rounded animate-pulse'>
              Phase 6.0 - CHAOS UNLEASHED
            </span>
          </h2>
        </div>
        <div className='w-full mb-8'>
          <NeuralTradingDaemon />
        </div>

        {/* Phase 5: Void Terminal */}
        <div className='flex items-center gap-3 mb-4'>
          <div className='h-8 w-1 bg-gradient-to-b from-purple-400 via-pink-500 to-red-500 rounded-full shadow-[0_0_20px_rgba(168,85,247,0.5)]' />
          <h2 className='text-xl font-bold tracking-tight text-balance text-foreground uppercase'>
            The Void Terminal{' '}
            <span className='text-xs text-purple-400 ml-2 border border-purple-500/30 px-2 py-0.5 rounded'>
              Phase 5.0
            </span>
          </h2>
        </div>
      </section>
    </div>
  );
};
