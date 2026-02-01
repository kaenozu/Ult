/**
 * Psychology Warning Panel Component
 * 
 * Displays psychological bias warnings and recommendations
 * to help traders maintain discipline.
 */

'use client';

import { useState, useEffect } from 'react';
import { useExtendedJournalStore } from '@/app/store/journalStoreExtended';
import { PsychologyWarning } from '@/app/lib/trading/psychology';
import { cn } from '@/app/lib/utils';

export function PsychologyWarningPanel() {
  const { activeWarnings, clearWarnings, psychologyState } = useExtendedJournalStore();
  const [isVisible, setIsVisible] = useState(true);

  // Auto-hide after 30 seconds for low severity warnings
  useEffect(() => {
    const lowSeverityWarnings = activeWarnings.filter(w => w.severity === 'low');
    if (lowSeverityWarnings.length > 0) {
      const timer = setTimeout(() => {
        setIsVisible(false);
      }, 30000);
      return () => clearTimeout(timer);
    }
  }, [activeWarnings]);

  if (!isVisible || activeWarnings.length === 0) {
    return null;
  }

  const shouldPauseTrading = psychologyState.consecutiveLosses >= 5;

  return (
    <div className="fixed top-4 right-4 z-50 max-w-md w-full">
      {/* Critical Warning Banner */}
      {shouldPauseTrading && (
        <div className="mb-4 bg-red-600/95 backdrop-blur-sm border-2 border-red-500 rounded-lg shadow-xl p-4 animate-pulse">
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <div className="flex-1">
              <h3 className="text-white font-bold text-lg mb-1">取引を一時停止してください</h3>
              <p className="text-white/90 text-sm mb-2">
                {psychologyState.consecutiveLosses}連敗中です。感情が落ち着くまで取引を控えてください。
              </p>
              <button
                onClick={() => setIsVisible(false)}
                className="bg-white/20 hover:bg-white/30 text-white text-xs px-3 py-1.5 rounded transition-colors"
              >
                閉じる
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Warning Cards */}
      <div className="space-y-3">
        {activeWarnings
          .sort((a, b) => {
            const severityOrder = { high: 0, medium: 1, low: 2 };
            return severityOrder[a.severity] - severityOrder[b.severity];
          })
          .map((warning) => (
            <WarningCard
              key={warning.id}
              warning={warning}
              onDismiss={() => clearWarnings()}
            />
          ))}
      </div>

      {/* Clear All Button */}
      {activeWarnings.length > 1 && (
        <button
          onClick={clearWarnings}
          className="mt-3 w-full bg-[#233648] hover:bg-[#2d4159] text-[#92adc9] text-xs py-2 rounded transition-colors"
        >
          すべての警告をクリア
        </button>
      )}
    </div>
  );
}

interface WarningCardProps {
  warning: PsychologyWarning;
  onDismiss: () => void;
}

function WarningCard({ warning, onDismiss }: WarningCardProps) {
  const severityConfig = {
    high: {
      bg: 'bg-red-500/10',
      border: 'border-red-500/50',
      icon: 'bg-red-500/20 text-red-500',
      title: 'text-red-400',
    },
    medium: {
      bg: 'bg-yellow-500/10',
      border: 'border-yellow-500/50',
      icon: 'bg-yellow-500/20 text-yellow-500',
      title: 'text-yellow-400',
    },
    low: {
      bg: 'bg-blue-500/10',
      border: 'border-blue-500/50',
      icon: 'bg-blue-500/20 text-blue-500',
      title: 'text-blue-400',
    },
  };

  const config = severityConfig[warning.severity];

  const getWarningIcon = () => {
    switch (warning.type) {
      case 'consecutive_losses':
        return (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 17h8m0 0V9m0 8l-8-8-4 4-6-6" />
          </svg>
        );
      case 'over_trading':
        return (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
      case 'revenge_trading':
        return (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 18.657A8 8 0 016.343 7.343S7 9 9 10c0-2 .5-5 2.986-7C14 5 16.09 5.777 17.656 7.343A7.975 7.975 0 0120 13a7.975 7.975 0 01-2.343 5.657z" />
          </svg>
        );
      case 'risk_management':
        return (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
          </svg>
        );
      case 'emotional_state':
        return (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
      default:
        return (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
    }
  };

  const getWarningTitle = () => {
    switch (warning.type) {
      case 'consecutive_losses':
        return '連敗警告';
      case 'over_trading':
        return '過度な取引';
      case 'revenge_trading':
        return '復讐トレード';
      case 'risk_management':
        return 'リスク管理';
      case 'emotional_state':
        return '感情的状態';
      default:
        return '警告';
    }
  };

  return (
    <div className={cn('border rounded-lg p-4 shadow-lg backdrop-blur-sm', config.bg, config.border)}>
      <div className="flex items-start gap-3">
        <div className={cn('flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center', config.icon)}>
          {getWarningIcon()}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2 mb-1">
            <h4 className={cn('font-semibold text-sm', config.title)}>
              {getWarningTitle()}
            </h4>
            <button
              onClick={onDismiss}
              className="flex-shrink-0 text-[#92adc9] hover:text-white transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <p className="text-white text-sm mb-2">{warning.message}</p>
          <div className="bg-[#101922]/50 rounded p-2">
            <p className="text-[#92adc9] text-xs">
              <span className="font-medium">推奨事項:</span> {warning.recommendation}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
