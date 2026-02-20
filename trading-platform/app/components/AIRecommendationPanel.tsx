'use client';

import { useMemo } from 'react';
import { Signal } from '@/app/types';
import { ConfidenceScorer } from '@/app/lib/services/confidence-scorer';

interface AIRecommendationPanelProps {
  signals: Signal[];
  onSelectSignal?: (signal: Signal) => void;
  maxItems?: number;
}

export function AIRecommendationPanel({ signals, onSelectSignal, maxItems = 5 }: AIRecommendationPanelProps) {
  const scorer = useMemo(() => new ConfidenceScorer(), []);
  
  const rankedSignals = useMemo(() => {
    const scored = signals
      .map(s => ({
        ...s,
        score: scorer.score(s, { trendStrength: s.regimeInfo?.adx || 50 }),
        level: scorer.getConfidenceLevel(scorer.score(s, { trendStrength: s.regimeInfo?.adx || 50 })),
      }))
      .filter(s => s.level === 'HIGH')
      .sort((a, b) => b.score - a.score);
    
    const uniqueBySymbol = new Map<string, typeof scored[0]>();
    for (const s of scored) {
      if (!uniqueBySymbol.has(s.symbol)) {
        uniqueBySymbol.set(s.symbol, s);
      }
    }
    
    return Array.from(uniqueBySymbol.values()).slice(0, maxItems);
  }, [signals, scorer, maxItems]);
  
  if (rankedSignals.length === 0) {
    return (
      <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700">
        <h3 className="text-lg font-semibold text-white mb-3">AI推奨銘柄</h3>
        <p className="text-gray-400 text-sm">現在、高確信の推奨銘柄はありません</p>
      </div>
    );
  }
  
  return (
    <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700">
      <h3 className="text-lg font-semibold text-white mb-3">AI推奨銘柄</h3>
      <div className="space-y-2">
        {rankedSignals.map((signal, index) => (
          <button
            key={`${signal.symbol}-${index}`}
            onClick={() => onSelectSignal?.(signal)}
            className="w-full flex items-center justify-between p-3 rounded-lg bg-gray-700/50 hover:bg-gray-700 transition-colors text-left"
          >
            <div className="flex items-center gap-3">
              <span className={`px-2 py-1 rounded text-xs font-bold ${
                signal.type === 'BUY' ? 'bg-green-500/20 text-green-400' :
                signal.type === 'SELL' ? 'bg-red-500/20 text-red-400' :
                'bg-gray-500/20 text-gray-400'
              }`}>
                {signal.type}
              </span>
              <div>
                <span className="text-white font-medium">{signal.symbol}</span>
                {signal.predictedChange !== undefined && (
                  <span className={`ml-2 text-sm ${
                    signal.predictedChange > 0 ? 'text-green-400' : 'text-red-400'
                  }`}>
                    {signal.predictedChange > 0 ? '+' : ''}{signal.predictedChange.toFixed(1)}%
                  </span>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-yellow-400 font-bold">{signal.score.toFixed(0)}%</span>
              <span className="text-xs text-gray-400">確信度</span>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
