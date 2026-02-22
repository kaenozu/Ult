'use client';

import { useMemo } from 'react';
import { Signal } from '@/app/types';
import { ConfidenceScorer } from '@/app/lib/services/confidence-scorer';
import { useUIStore } from '@/app/store/uiStore';
import { cn } from '@/app/lib/utils';
import { Sparkles, Lightbulb } from 'lucide-react';

interface AIRecommendationPanelProps {
  signals: Signal[];
  onSelectSignal?: (signal: Signal) => void;
  maxItems?: number;
}

export function AIRecommendationPanel({ signals, onSelectSignal, maxItems = 5 }: AIRecommendationPanelProps) {
  const { beginnerMode } = useUIStore();
  const scorer = useMemo(() => new ConfidenceScorer(), []);
  
  const rankedSignals = useMemo(() => {
    const scored = signals
      .map(s => ({
        ...s,
        score: scorer.score(s, { trendStrength: s.regimeInfo?.adx || 50 }),
        level: scorer.getConfidenceLevel(scorer.score(s, { trendStrength: s.regimeInfo?.adx || 50 })),
      }))
      .filter(s => s.level === 'HIGH' || s.level === 'MEDIUM')
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
      <div className="bg-[#141e27] rounded-xl p-6 border border-[#233648] text-center">
        <div className="w-12 h-12 bg-gray-800/50 rounded-full flex items-center justify-center mx-auto mb-3">
          <Sparkles className="w-6 h-6 text-gray-600" />
        </div>
        <h3 className="text-white font-bold mb-1">AI推奨銘柄</h3>
        <p className="text-[#92adc9] text-xs">現在、基準を満たす推奨銘柄はありません</p>
      </div>
    );
  }
  
  return (
    <div className={cn(
      "rounded-xl p-4 border transition-all",
      beginnerMode.enabled ? "bg-yellow-500/5 border-yellow-500/20" : "bg-[#141e27] border-[#233648]"
    )}>
      <div className="flex items-center justify-between mb-4 px-1">
        <h3 className="text-white font-bold flex items-center gap-2 text-sm sm:text-base">
          {beginnerMode.enabled ? <Lightbulb className="w-4 h-4 text-yellow-500" /> : <Sparkles className="w-4 h-4 text-primary" />}
          {beginnerMode.enabled ? '初心者におすすめの銘柄' : 'AI推奨銘柄'}
        </h3>
        {beginnerMode.enabled && (
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-yellow-500/20 text-yellow-500 border border-yellow-500/30">
            高確信度のみ表示
          </span>
        )}
      </div>

      <div className="space-y-2">
        {rankedSignals.map((signal, index) => (
          <button
            key={`${signal.symbol}-${index}`}
            onClick={() => onSelectSignal?.(signal)}
            className={cn(
              "w-full flex items-center justify-between p-3 rounded-lg transition-all group border",
              beginnerMode.enabled 
                ? "bg-white/5 dark:bg-black/20 border-white/5 hover:border-yellow-500/30" 
                : "bg-[#192633]/50 border-transparent hover:bg-[#192633] hover:border-[#233648]"
            )}
          >
            <div className="flex items-center gap-3">
              <div className={cn(
                "px-2.5 py-1 rounded font-black text-[10px] tracking-tighter uppercase",
                signal.type === 'BUY' ? "bg-green-500 text-white shadow-[0_0_10px_rgba(34,197,94,0.3)]" :
                signal.type === 'SELL' ? "bg-red-500 text-white shadow-[0_0_10px_rgba(239,68,68,0.3)]" :
                "bg-gray-500 text-white"
              )}>
                {signal.type === 'BUY' ? '買い' : signal.type === 'SELL' ? '売り' : '維持'}
              </div>
              <div>
                <div className="text-white font-bold text-sm leading-none mb-1">{signal.symbol}</div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-[#92adc9] font-medium">予想変動率:</span>
                  <span className={cn(
                    "text-[10px] font-black",
                    (signal.predictedChange || 0) > 0 ? "text-green-400" : "text-red-400"
                  )}>
                    {(signal.predictedChange || 0) > 0 ? '+' : ''}{(signal.predictedChange || 0).toFixed(1)}%
                  </span>
                </div>
              </div>
            </div>
            <div className="text-right">
              <div className="text-[9px] text-[#92adc9] font-bold uppercase tracking-wider mb-0.5">
                {beginnerMode.enabled ? 'AIの自信度' : '確信度'}
              </div>
              <div className={cn(
                "text-base font-black tabular-nums",
                signal.score >= 80 ? "text-yellow-500" : "text-white"
              )}>
                {signal.score.toFixed(0)}%
              </div>
            </div>
          </button>
        ))}
      </div>
      
      {beginnerMode.enabled && (
        <p className="mt-3 text-[9px] text-gray-500 dark:text-gray-400 text-center leading-relaxed">
          ※AIは過去のパターンから予測していますが、<br/>必ずしも利益を保証するものではありません。
        </p>
      )}
    </div>
  );
}
