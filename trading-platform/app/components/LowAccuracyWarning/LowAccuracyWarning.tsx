'use client';

import { AlertTriangle, X } from 'lucide-react';
import { cn } from '@/app/lib/utils';
import { useState } from 'react';

interface LowAccuracyWarningProps {
  hitRate: number;
  symbolName: string;
  signalType: 'BUY' | 'SELL' | 'HOLD';
  threshold?: number;
  onDismiss?: () => void;
  className?: string;
}

/**
 * LowAccuracyWarning - Displays warning when signal appears for low-accuracy symbols
 * 
 * Warns users when:
 * - AI prediction accuracy is below threshold (default: 50%)
 * - A BUY or SELL signal is generated
 * 
 * Purpose: Help users avoid uncertain trades on symbols where AI is not performing well
 * 
 * @param hitRate - Current hit rate percentage (0-100)
 * @param symbolName - Symbol name for display
 * @param signalType - Type of signal (BUY/SELL/HOLD)
 * @param threshold - Hit rate threshold to trigger warning (default: 50)
 * @param onDismiss - Callback when warning is dismissed
 * @param className - Additional CSS classes
 */
export function LowAccuracyWarning({
  hitRate,
  symbolName,
  signalType,
  threshold = 50,
  onDismiss,
  className
}: LowAccuracyWarningProps) {
  const [isDismissed, setIsDismissed] = useState(false);

  // Only show warning for BUY/SELL signals with low accuracy
  const shouldShowWarning = signalType !== 'HOLD' && hitRate < threshold;

  const handleDismiss = () => {
    setIsDismissed(true);
    onDismiss?.();
  };

  if (!shouldShowWarning || isDismissed) {
    return null;
  }

  return (
    <div 
      className={cn(
        "bg-gradient-to-r from-orange-900/30 to-red-900/30 border-l-4 border-orange-500",
        "p-3 rounded-lg backdrop-blur-sm",
        "animate-in slide-in-from-top-2 duration-300",
        className
      )}
      role="alert"
      aria-live="assertive"
    >
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0 mt-0.5">
          <AlertTriangle className="w-5 h-5 text-orange-400 animate-pulse" />
        </div>
        
        <div className="flex-1 space-y-1">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-bold text-orange-300">
              ⚠️ 低精度警告
            </h4>
            {onDismiss && (
              <button
                onClick={handleDismiss}
                className="text-gray-400 hover:text-gray-200 transition-colors"
                aria-label="警告を閉じる"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
          
          <p className="text-xs text-gray-300 leading-relaxed">
            <strong className="text-orange-400">{symbolName}</strong> の AI 予測精度は
            <span className="font-bold text-orange-300 mx-1">{hitRate}%</span>
            です。この銘柄では AI の的中率が低いため、
            <span className="text-yellow-300 font-semibold mx-1">{signalType === 'BUY' ? '買い' : '売り'}シグナル</span>
            の信頼性が低下しています。
          </p>
          
          <p className="text-[10px] text-gray-400 mt-2 italic">
            💡 推奨: 他のテクニカル指標やファンダメンタルズ分析と併用して判断してください。
          </p>
        </div>
      </div>
    </div>
  );
}
