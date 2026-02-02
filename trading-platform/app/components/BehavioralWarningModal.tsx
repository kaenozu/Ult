/**
 * Behavioral Warning Modal Component
 * 
 * Modal dialog that displays behavioral bias warnings before executing trades
 * Requires user confirmation to proceed with trades that trigger warnings
 */

'use client';

import { PsychologyWarning } from '@/app/lib/trading/psychology';
import { cn } from '@/app/lib/utils';

export interface BehavioralWarningModalProps {
  /** Whether the modal is visible */
  isOpen: boolean;
  /** Warnings to display */
  warnings: PsychologyWarning[];
  /** Whether the trade is blocked (cannot proceed) */
  isBlocked: boolean;
  /** Block reason if trade is blocked */
  blockReason?: string;
  /** Callback when user confirms to proceed */
  onConfirm: () => void;
  /** Callback when user cancels */
  onCancel: () => void;
}

export function BehavioralWarningModal({
  isOpen,
  warnings,
  isBlocked,
  blockReason,
  onConfirm,
  onCancel,
}: BehavioralWarningModalProps) {
  if (!isOpen) {
    return null;
  }

  const highSeverityWarnings = warnings.filter(w => w.severity === 'high');
  const mediumSeverityWarnings = warnings.filter(w => w.severity === 'medium');
  const lowSeverityWarnings = warnings.filter(w => w.severity === 'low');

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="bg-[#111a22] border border-[#233648] rounded-lg shadow-2xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className={cn(
          'border-b border-[#233648] px-6 py-4',
          isBlocked ? 'bg-red-500/10' : 'bg-yellow-500/10'
        )}>
          <div className="flex items-center gap-3">
            <div className={cn(
              'flex-shrink-0 w-12 h-12 rounded-full flex items-center justify-center',
              isBlocked ? 'bg-red-500/20 text-red-500' : 'bg-yellow-500/20 text-yellow-500'
            )}>
              {isBlocked ? (
                <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                </svg>
              ) : (
                <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              )}
            </div>
            <div className="flex-1">
              <h2 className={cn(
                'text-xl font-bold',
                isBlocked ? 'text-red-400' : 'text-yellow-400'
              )}>
                {isBlocked ? '取引がブロックされました' : '警告：取引前の確認'}
              </h2>
              <p className="text-[#92adc9] text-sm mt-1">
                {isBlocked
                  ? 'この取引は現在の心理状態により実行できません'
                  : '取引を続行する前に、以下の警告を確認してください'}
              </p>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="px-6 py-4 space-y-4">
          {/* Block Reason */}
          {isBlocked && blockReason && (
            <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <svg className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
                <div className="flex-1">
                  <p className="text-white font-semibold mb-1">ブロック理由</p>
                  <p className="text-white/90 text-sm">{blockReason}</p>
                </div>
              </div>
            </div>
          )}

          {/* High Severity Warnings */}
          {highSeverityWarnings.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-red-400 font-semibold text-sm uppercase tracking-wider">
                重大な警告 ({highSeverityWarnings.length})
              </h3>
              {highSeverityWarnings.map((warning, index) => (
                <WarningCard key={index} warning={warning} />
              ))}
            </div>
          )}

          {/* Medium Severity Warnings */}
          {mediumSeverityWarnings.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-yellow-400 font-semibold text-sm uppercase tracking-wider">
                警告 ({mediumSeverityWarnings.length})
              </h3>
              {mediumSeverityWarnings.map((warning, index) => (
                <WarningCard key={index} warning={warning} />
              ))}
            </div>
          )}

          {/* Low Severity Warnings */}
          {lowSeverityWarnings.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-blue-400 font-semibold text-sm uppercase tracking-wider">
                注意 ({lowSeverityWarnings.length})
              </h3>
              {lowSeverityWarnings.map((warning, index) => (
                <WarningCard key={index} warning={warning} />
              ))}
            </div>
          )}

          {/* Info Box */}
          {!isBlocked && (
            <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <svg className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <div className="flex-1">
                  <p className="text-blue-400 font-semibold mb-1">継続しますか？</p>
                  <p className="text-white/80 text-sm">
                    警告を確認しました。本当に取引を続行する場合は、「取引を続行」ボタンをクリックしてください。
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-[#233648] px-6 py-4 flex gap-3 justify-end">
          <button
            onClick={onCancel}
            className="px-6 py-2.5 bg-[#233648] hover:bg-[#2d4159] text-white rounded-lg transition-colors font-medium"
          >
            {isBlocked ? '閉じる' : 'キャンセル'}
          </button>
          {!isBlocked && (
            <button
              onClick={onConfirm}
              className="px-6 py-2.5 bg-yellow-600 hover:bg-yellow-700 text-white rounded-lg transition-colors font-medium"
            >
              取引を続行
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

interface WarningCardProps {
  warning: PsychologyWarning;
}

function WarningCard({ warning }: WarningCardProps) {
  const severityConfig = {
    high: {
      bg: 'bg-red-500/10',
      border: 'border-red-500/30',
      icon: 'text-red-500',
    },
    medium: {
      bg: 'bg-yellow-500/10',
      border: 'border-yellow-500/30',
      icon: 'text-yellow-500',
    },
    low: {
      bg: 'bg-blue-500/10',
      border: 'border-blue-500/30',
      icon: 'text-blue-500',
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

  return (
    <div className={cn('border rounded-lg p-3', config.bg, config.border)}>
      <div className="flex items-start gap-3">
        <div className={cn('flex-shrink-0', config.icon)}>
          {getWarningIcon()}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-white text-sm font-medium mb-1">{warning.message}</p>
          <div className="bg-[#101922]/50 rounded px-2 py-1.5">
            <p className="text-[#92adc9] text-xs">
              <span className="font-medium">推奨:</span> {warning.recommendation}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
