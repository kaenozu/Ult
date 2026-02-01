'use client';

import dynamic from 'next/dynamic';
import React from 'react';

// Loading placeholder
const LoadingFallback = () => (
  <div className="flex items-center justify-center p-4">
    <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500" />
  </div>
);

// Lazy-loaded Backtest Panel
export const LazyBacktestPanel = dynamic(
  () => import('../BacktestPanel').then(mod => ({ default: mod.BacktestPanel })),
  {
    loading: () => <LoadingFallback />,
    ssr: false,
  }
);

// Lazy-loaded Performance Dashboard
export const LazyPerformanceDashboard = dynamic(
  () => import('../PerformanceDashboard'),
  {
    loading: () => <LoadingFallback />,
    ssr: false,
  }
);
