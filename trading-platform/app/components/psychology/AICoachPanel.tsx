/**
 * AI Coach Panel
 * 
 * Displays AI coaching recommendations and alerts
 */

'use client';

import { useMemo } from 'react';
import type { CoachingRecommendation } from '@/app/types/psychology';
import { cn } from '@/app/lib/utils';

interface AICoachPanelProps {
  recommendations: CoachingRecommendation[];
  onDismiss?: (index: number) => void;
  compact?: boolean;
}

export function AICoachPanel({ 
  recommendations, 
  onDismiss,
  compact = false 
}: AICoachPanelProps) {
  const sortedRecommendations = useMemo(() => {
    const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
    return [...recommendations].sort((a, b) => {
      return priorityOrder[a.priority] - priorityOrder[b.priority];
    });
  }, [recommendations]);

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'urgent':
        return (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        );
      case 'warning':
        return (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
      case 'info':
        return (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
      default: // advice
        return (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
          </svg>
        );
    }
  };

  const getTypeColor = (type: string, priority: string) => {
    if (priority === 'critical') return 'text-red-500 bg-red-500/10 border-red-500/30';
    if (priority === 'high') return 'text-orange-500 bg-orange-500/10 border-orange-500/30';
    if (priority === 'medium') return 'text-yellow-500 bg-yellow-500/10 border-yellow-500/30';
    return 'text-blue-500 bg-blue-500/10 border-blue-500/30';
  };

  const getPriorityLabel = (priority: string) => {
    switch (priority) {
      case 'critical':
        return '緊急';
      case 'high':
        return '高';
      case 'medium':
        return '中';
      case 'low':
        return '低';
      default:
        return '';
    }
  };

  if (sortedRecommendations.length === 0) {
    return (
      <div className="bg-[#141e27] border border-[#233648] rounded-lg p-6">
        <div className="flex items-center gap-3 mb-4">
          <svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <h3 className="text-white font-medium">AIコーチ</h3>
        </div>
        <div className="text-center py-8 text-[#92adc9]">
          <p className="text-sm">良好な状態です</p>
          <p className="text-xs mt-2">新しい推奨事項はありません</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-[#141e27] border border-[#233648] rounded-lg p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <svg className="w-5 h-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
          </svg>
          <h3 className="text-white font-medium">AIコーチ</h3>
        </div>
        <div className="flex items-center gap-2 text-xs text-[#92adc9]">
          <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
          <span>{sortedRecommendations.length}件の推奨事項</span>
        </div>
      </div>

      <div className={cn('space-y-3', compact && 'max-h-96 overflow-y-auto')}>
        {sortedRecommendations.map((recommendation, index) => (
          <div
            key={index}
            className={cn(
              'p-4 rounded-lg border',
              getTypeColor(recommendation.type, recommendation.priority)
            )}
          >
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 mt-0.5">
                {getTypeIcon(recommendation.type)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <h4 className="font-medium text-sm text-white">{recommendation.title}</h4>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className="px-2 py-0.5 text-xs rounded-full bg-current/20 text-current">
                      {getPriorityLabel(recommendation.priority)}
                    </span>
                    {onDismiss && (
                      <button
                        onClick={() => onDismiss(index)}
                        className="text-[#92adc9] hover:text-white transition-colors"
                        aria-label="Dismiss"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    )}
                  </div>
                </div>
                <p className="text-xs text-[#92adc9] mb-3">{recommendation.message}</p>
                {recommendation.actions.length > 0 && (
                  <div className="space-y-1.5">
                    {recommendation.actions.map((action, actionIndex) => (
                      <div key={actionIndex} className="flex items-start gap-2 text-xs">
                        <svg className="w-3 h-3 mt-0.5 flex-shrink-0 text-current" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                        </svg>
                        <span className="text-[#92adc9]">{action}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Critical Warning Banner */}
      {sortedRecommendations.some(r => r.priority === 'critical') && (
        <div className="mt-4 p-3 bg-red-500/20 border border-red-500/50 rounded-lg">
          <div className="flex items-center gap-2 text-red-500 text-sm font-medium">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <span>緊急の対応が必要です</span>
          </div>
        </div>
      )}
    </div>
  );
}
