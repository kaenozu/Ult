import React from 'react';
import dynamic from 'next/dynamic';

const AnalyticsDashboard = dynamic(
  () => import('@/components/features/analytics/AnalyticsDashboard').then(mod => mod.AnalyticsDashboard)
);

const TradeReplayWidget = dynamic(
  () => import('@/components/features/analytics/TradeReplayWidget').then(mod => mod.TradeReplayWidget)
);

export const TimeMachinePanel: React.FC = () => {
  return (
    <div className='space-y-8 animate-in fade-in zoom-in-95 duration-300'>
      <div className='flex items-center gap-3 mb-6'>
        <div className='h-8 w-1 bg-cyan-500 rounded-full shadow-[0_0_20px_rgba(6,182,212,0.5)]' />
        <div>
          <h2 className='text-2xl font-bold tracking-tight text-white uppercase'>
            The Time Machine
          </h2>
          <p className='text-sm text-gray-400'>
            Algorithmic Forensics & Performance Analytics
          </p>
        </div>
      </div>

      <section>
        <h3 className='text-lg font-bold text-gray-300 mb-4 uppercase tracking-widest text-xs'>
          Performance Vitals
        </h3>
        <AnalyticsDashboard />
      </section>

      <section>
        <h3 className='text-lg font-bold text-gray-300 mb-4 uppercase tracking-widest text-xs'>
          Algorithmic Replay
        </h3>
        <TradeReplayWidget />
      </section>
    </div>
  );
};
