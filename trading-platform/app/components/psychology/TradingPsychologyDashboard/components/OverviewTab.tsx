import React from 'react';
import { cn } from '@/app/lib/utils';
import { TradingPattern, ImprovementSuggestion } from '@/app/lib/psychology/AITradingCoach';
import { FearGreedIndex } from '@/app/lib/psychology/SentimentAnalyzer';
import { RuleViolation } from '@/app/lib/psychology/DisciplineMonitor';

interface DisciplineMetricsDisplay {
  overall: number;
  planAdherence: number;
  emotionalControl: number;
  lossManagement: number;
  journalConsistency: number;
  coolingOffCompliance: number;
}

interface OverviewTabProps {
  disciplineMetrics: DisciplineMetricsDisplay;
  fearGreedIndex: FearGreedIndex | null;
  patterns: TradingPattern[];
  suggestions: ImprovementSuggestion[];
  violations: RuleViolation[];
}

export function OverviewTab({ 
  disciplineMetrics, 
  fearGreedIndex, 
  patterns, 
  suggestions, 
  violations 
}: OverviewTabProps) {
  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-400';
    if (score >= 60) return 'text-yellow-400';
    return 'text-red-400';
  };

  const getScoreBgColor = (score: number) => {
    if (score >= 80) return 'bg-green-500/20 border-green-500/50';
    if (score >= 60) return 'bg-yellow-500/20 border-yellow-500/50';
    return 'bg-red-500/20 border-red-500/50';
  };

  const getPriorityColor = (priority: string) => {
    if (priority === 'high') return 'bg-red-500/20 text-red-400 border-red-500/50';
    if (priority === 'medium') return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/50';
    return 'bg-blue-500/20 text-blue-400 border-blue-500/50';
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* 規律スコア */}
        <div className={cn('p-4 rounded-lg border', getScoreBgColor(disciplineMetrics.overall))}>
          <div className="text-sm text-gray-400 mb-1">規律スコア</div>
          <div className={cn('text-3xl font-bold', getScoreColor(disciplineMetrics.overall))}>{disciplineMetrics.overall}</div>
          <div className="mt-2 space-y-1 text-xs">
            <MetricRow label="計画遵守" value={disciplineMetrics.planAdherence} color={getScoreColor(disciplineMetrics.planAdherence)} />
            <MetricRow label="感情管理" value={disciplineMetrics.emotionalControl} color={getScoreColor(disciplineMetrics.emotionalControl)} />
            <MetricRow label="損失管理" value={disciplineMetrics.lossManagement} color={getScoreColor(disciplineMetrics.lossManagement)} />
          </div>
        </div>

        {/* Fear & Greed */}
        {fearGreedIndex && (
          <div className={cn('p-4 rounded-lg border', fearGreedIndex.current < 40 ? 'bg-green-500/20 border-green-500/50' : fearGreedIndex.current < 60 ? 'bg-yellow-500/20 border-yellow-500/50' : 'bg-red-500/20 border-red-500/50')}>
            <div className="text-sm text-gray-400 mb-1">恐怖 & 貪欲指数</div>
            <div className="text-3xl font-bold text-white">{fearGreedIndex.current}</div>
            <div className="text-sm text-gray-300 mt-1">{fearGreedIndex.label}</div>
          </div>
        )}

        {/* Counts */}
        <div className="p-4 rounded-lg border border-gray-700 bg-gray-800/50">
          <div className="text-sm text-gray-400 mb-1">検出されたパターン</div>
          <div className="text-3xl font-bold text-white">{patterns.length}</div>
          <div className="mt-2 text-xs text-gray-400">ルール違反: <span className="text-red-400">{violations.length}</span></div>
        </div>
      </div>

      {/* Top Suggestions */}
      {suggestions.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-lg font-semibold text-white">主な改善提案</h3>
          {suggestions.slice(0, 2).map((s, i) => (
            <div key={i} className={cn('p-4 rounded-lg border', getPriorityColor(s.priority))}>
              <h4 className="font-semibold text-white">{s.title}</h4>
              <p className="text-sm text-gray-300">{s.description}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function MetricRow({ label, value, color }: { label: string, value: number, color: string }) {
  return (
    <div className="flex justify-between">
      <span className="text-gray-400">{label}</span>
      <span className={color}>{value.toFixed(1)}</span>
    </div>
  );
}
