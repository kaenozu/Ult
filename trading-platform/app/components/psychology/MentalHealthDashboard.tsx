/**
 * Mental Health Dashboard
 * 
 * Displays comprehensive mental health metrics and psychology status
 */

'use client';

import { useMemo } from 'react';
import type { MentalHealthMetrics, EmotionScore } from '@/app/types/psychology';
import { cn } from '@/app/lib/utils';

interface MentalHealthDashboardProps {
  metrics?: MentalHealthMetrics;
  emotions: EmotionScore[];
  compact?: boolean;
}

export function MentalHealthDashboard({ 
  metrics, 
  emotions,
  compact = false 
}: MentalHealthDashboardProps) {
  const stateColor = useMemo(() => {
    if (!metrics) return 'text-gray-500';
    switch (metrics.state) {
      case 'optimal':
        return 'text-green-500';
      case 'cautious':
        return 'text-yellow-500';
      case 'stressed':
        return 'text-orange-500';
      case 'tilt':
      case 'burnout':
        return 'text-red-500';
      default:
        return 'text-gray-500';
    }
  }, [metrics]);

  const stateLabel = useMemo(() => {
    if (!metrics) return '状態不明';
    switch (metrics.state) {
      case 'optimal':
        return '最適';
      case 'cautious':
        return '慎重';
      case 'stressed':
        return 'ストレス';
      case 'tilt':
        return 'ティルト';
      case 'burnout':
        return 'バーンアウト';
      default:
        return '不明';
    }
  }, [metrics]);

  const getScoreColor = (score: number): string => {
    if (score >= 80) return 'text-green-500';
    if (score >= 60) return 'text-yellow-500';
    if (score >= 40) return 'text-orange-500';
    return 'text-red-500';
  };

  const getScoreBarColor = (score: number): string => {
    if (score >= 80) return 'bg-green-500';
    if (score >= 60) return 'bg-yellow-500';
    if (score >= 40) return 'bg-orange-500';
    return 'bg-red-500';
  };

  if (!metrics) {
    return (
      <div className="bg-[#141e27] border border-[#233648] rounded-lg p-6">
        <h3 className="text-white font-medium mb-4">メンタルヘルス</h3>
        <div className="text-center py-8 text-[#92adc9]">
          <p className="text-sm">データなし</p>
          <p className="text-xs mt-2">トレード履歴から分析します</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-[#141e27] border border-[#233648] rounded-lg p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-white font-medium">メンタルヘルス</h3>
        <div className={cn('flex items-center gap-2', stateColor)}>
          <div className="w-2 h-2 rounded-full bg-current animate-pulse" />
          <span className="text-sm font-medium">{stateLabel}</span>
        </div>
      </div>

      {/* Overall Score */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm text-[#92adc9]">総合スコア</span>
          <span className={cn('text-2xl font-bold', getScoreColor(metrics.overall_score))}>
            {metrics.overall_score.toFixed(0)}
          </span>
        </div>
        <div className="h-2 bg-[#192633] rounded-full overflow-hidden">
          <div
            className={cn('h-full rounded-full transition-all duration-500', getScoreBarColor(metrics.overall_score))}
            style={{ width: `${metrics.overall_score}%` }}
          />
        </div>
      </div>

      {/* Metrics Grid */}
      <div className={cn('grid gap-4', compact ? 'grid-cols-2' : 'grid-cols-2 md:grid-cols-4')}>
        {/* Discipline Score */}
        <div className="space-y-1">
          <div className="text-xs text-[#92adc9]">規律</div>
          <div className={cn('text-lg font-bold', getScoreColor(metrics.discipline_score))}>
            {metrics.discipline_score.toFixed(0)}
          </div>
          <div className="h-1 bg-[#192633] rounded-full overflow-hidden">
            <div
              className={cn('h-full rounded-full', getScoreBarColor(metrics.discipline_score))}
              style={{ width: `${metrics.discipline_score}%` }}
            />
          </div>
        </div>

        {/* Emotional Stability */}
        <div className="space-y-1">
          <div className="text-xs text-[#92adc9]">安定性</div>
          <div className={cn('text-lg font-bold', getScoreColor(metrics.emotional_stability))}>
            {metrics.emotional_stability.toFixed(0)}
          </div>
          <div className="h-1 bg-[#192633] rounded-full overflow-hidden">
            <div
              className={cn('h-full rounded-full', getScoreBarColor(metrics.emotional_stability))}
              style={{ width: `${metrics.emotional_stability}%` }}
            />
          </div>
        </div>

        {/* Stress Level (inverted) */}
        <div className="space-y-1">
          <div className="text-xs text-[#92adc9]">ストレス</div>
          <div className={cn('text-lg font-bold', getScoreColor(100 - metrics.stress_level))}>
            {metrics.stress_level.toFixed(0)}
          </div>
          <div className="h-1 bg-[#192633] rounded-full overflow-hidden">
            <div
              className={cn('h-full rounded-full', getScoreBarColor(100 - metrics.stress_level))}
              style={{ width: `${metrics.stress_level}%` }}
            />
          </div>
        </div>

        {/* Fatigue Level (inverted) */}
        <div className="space-y-1">
          <div className="text-xs text-[#92adc9]">疲労度</div>
          <div className={cn('text-lg font-bold', getScoreColor(100 - metrics.fatigue_level))}>
            {metrics.fatigue_level.toFixed(0)}
          </div>
          <div className="h-1 bg-[#192633] rounded-full overflow-hidden">
            <div
              className={cn('h-full rounded-full', getScoreBarColor(100 - metrics.fatigue_level))}
              style={{ width: `${metrics.fatigue_level}%` }}
            />
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="mt-6 pt-6 border-t border-[#233648] grid grid-cols-2 gap-4 text-xs">
        <div className="flex justify-between">
          <span className="text-[#92adc9]">連続負け日数</span>
          <span className={cn('font-medium', metrics.consecutive_losing_days > 2 ? 'text-red-500' : 'text-white')}>
            {metrics.consecutive_losing_days}
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-[#92adc9]">連続勝ち日数</span>
          <span className="text-green-500 font-medium">{metrics.consecutive_winning_days}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-[#92adc9]">休憩なし日数</span>
          <span className={cn('font-medium', metrics.days_since_break > 14 ? 'text-red-500' : 'text-white')}>
            {metrics.days_since_break}
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-[#92adc9]">ティルトリスク</span>
          <span className={cn('font-medium', metrics.risk_of_tilt > 0.6 ? 'text-red-500' : 'text-green-500')}>
            {(metrics.risk_of_tilt * 100).toFixed(0)}%
          </span>
        </div>
      </div>

      {/* Emotions */}
      {emotions.length > 0 && (
        <div className="mt-6 pt-6 border-t border-[#233648]">
          <div className="text-xs text-[#92adc9] mb-3">検出された感情</div>
          <div className="flex flex-wrap gap-2">
            {emotions.map((emotion, index) => (
              <div
                key={index}
                className="flex items-center gap-2 px-3 py-1 bg-[#192633] rounded-full text-xs"
              >
                <span className="text-white capitalize">{emotion.emotion}</span>
                <span className="text-[#92adc9]">{(emotion.score * 100).toFixed(0)}%</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Warnings */}
      {(metrics.risk_of_tilt > 0.7 || metrics.risk_of_burnout > 0.7 || metrics.state === 'tilt' || metrics.state === 'burnout') && (
        <div className="mt-6 p-4 bg-red-500/10 border border-red-500/30 rounded-lg">
          <div className="flex items-start gap-3">
            <svg className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <div className="flex-1">
              <h4 className="text-red-500 font-medium text-sm mb-2">警告</h4>
              {metrics.recommendations.map((rec, index) => (
                <p key={index} className="text-xs text-red-400 mb-1">{rec}</p>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
