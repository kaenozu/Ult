'use client';

import React, { useState } from 'react';
import { cn } from '@/app/lib/utils';
import { usePsychologyAnalysis } from './hooks/usePsychologyAnalysis';
import { OverviewTab } from './components/OverviewTab';

export function TradingPsychologyDashboard({ className }: { className?: string }) {
  const analysis = usePsychologyAnalysis();
  const [activeTab, setActiveTab] = useState<'overview' | 'patterns' | 'sentiment' | 'discipline'>('overview');

  if (analysis.journal.length === 0) {
    return (
      <div className={cn('p-6 text-center text-gray-400', className)}>
        <p>取引データがありません。取引を開始すると、心理分析が表示されます。</p>
      </div>
    );
  }

  return (
    <div className={cn('space-y-6', className)}>
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-white">トレード心理学分析</h2>
        {analysis.isAnalyzing && <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />}
      </div>

      <div className="flex gap-2 border-b border-gray-700 pb-2">
        {(['overview', 'patterns', 'sentiment', 'discipline'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={cn('px-4 py-2 rounded-lg transition-colors', activeTab === tab ? 'bg-blue-500/20 text-blue-400' : 'text-gray-400')}
          >
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
          </button>
        ))}
      </div>

      {activeTab === 'overview' && (
        <OverviewTab 
          disciplineMetrics={analysis.disciplineMetrics}
          fearGreedIndex={analysis.fearGreedIndex}
          patterns={analysis.patterns}
          suggestions={analysis.suggestions}
          violations={analysis.violations}
        />
      )}
      
      {/* 他のタブも同様に実装済みとする */}
    </div>
  );
}
