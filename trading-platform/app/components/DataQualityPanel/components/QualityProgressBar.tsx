/**
 * 品質プログレスバーコンポーネント
 *
 * @module DataQualityPanel/components/QualityProgressBar
 */

import React from 'react';
import { cn } from '@/app/lib/utils';
import { getQualityColor } from '../utils';

/**
 * QualityProgressBarコンポーネントのプロパティ
 */
export interface QualityProgressBarProps {
  /** 品質スコア（0-100） */
  score: number;
  /** プログレスバーのラベル */
  label: string;
  /** しきい値を表示するか（デフォルト: true） */
  showThreshold?: boolean;
}

/**
 * 品質スコアを視覚的に表示するプログレスバーコンポーネント
 *
 * スコアに応じて色が変わり、目標値との差分を表示できます。
 *
 * @param props - コンポーネントのプロパティ
 * @returns プログレスバーUI
 *
 * @example
 * <QualityProgressBar
 *   score={85}
 *   label="全体品質スコア"
 *   showThreshold={true}
 * />
 */
export const QualityProgressBar: React.FC<QualityProgressBarProps> = ({ score, label, showThreshold = true }) => {
  const getStatusColor = () => {
    if (score >= 90) return 'bg-green-500';
    if (score >= 75) return 'bg-blue-500';
    if (score >= 60) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-xs">
        <span className="text-[#92adc9]">{label}</span>
        <span className={cn('font-bold', getQualityColor(score))}>{score.toFixed(0)}%</span>
      </div>
      <div className="h-2 bg-[#233648] rounded-full overflow-hidden">
        <div
          className={cn('h-full transition-all duration-500', getStatusColor())}
          style={{ width: `${score}%` }}
        />
      </div>
      {showThreshold && (
        <div className="flex justify-between text-[10px] text-[#92adc9]">
          <span>目標: 90%</span>
          <span className={score >= 90 ? 'text-green-400' : 'text-yellow-400'}>
            {score >= 90 ? '✓' : `${90 - score}%残`}
          </span>
        </div>
      )}
    </div>
  );
};
