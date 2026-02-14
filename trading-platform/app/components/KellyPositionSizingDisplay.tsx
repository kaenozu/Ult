/**
 * Kelly Position Sizing Display
 * 
 * Kelly Criterionに基づくポジションサイジング結果を表示するコンポーネント
 */

'use client';

import { PositionSizeRecommendation } from '@/app/types/risk';
import { cn } from '@/app/lib/utils';
import { TrendingUp, AlertTriangle, Target, Activity, Shield } from 'lucide-react';

interface KellyPositionSizingDisplayProps {
  recommendation: PositionSizeRecommendation & { kellyResult?: { confidence: number; warnings: string[] } } | null;
  loading?: boolean;
  className?: string;
  onAdjustSize?: (newSize: number) => void;
}

export function KellyPositionSizingDisplay({ 
  recommendation, 
  loading = false,
  className,
  onAdjustSize,
}: KellyPositionSizingDisplayProps) {
  
  // リスクレベルに応じた色
  const getRiskLevelColor = (level: 'LOW' | 'MEDIUM' | 'HIGH') => {
    switch (level) {
      case 'LOW': return 'text-green-400 bg-green-900/20 border-green-700/50';
      case 'MEDIUM': return 'text-yellow-400 bg-yellow-900/20 border-yellow-700/50';
      case 'HIGH': return 'text-red-400 bg-red-900/20 border-red-700/50';
    }
  };

  const getRiskLevelLabel = (level: 'LOW' | 'MEDIUM' | 'HIGH') => {
    switch (level) {
      case 'LOW': return '低リスク';
      case 'MEDIUM': return '中リスク';
      case 'HIGH': return '高リスク';
    }
  };
  
  const formatCurrency = (value: number): string => {
    return new Intl.NumberFormat('ja-JP', {
      style: 'currency',
      currency: 'JPY',
      maximumFractionDigits: 0,
    }).format(value);
  };

  const formatPercent = (value: number): string => {
    return `${(value * 100).toFixed(2)}%`;
  };
  
  if (loading) {
    return (
      <div className={cn('p-4 bg-[#141e27] rounded-lg border border-[#233648]', className)}>
        <div className="animate-pulse space-y-3">
          <div className="h-4 bg-[#233648] rounded w-3/4"></div>
          <div className="h-4 bg-[#233648] rounded w-1/2"></div>
          <div className="h-4 bg-[#233648] rounded w-2/3"></div>
        </div>
      </div>
    );
  }
  
  if (!recommendation) {
    return (
      <div className={cn('p-4 bg-[#141e27] rounded-lg border border-[#233648]', className)}>
        <div className="text-center text-[#92adc9] text-sm">
          <p>Kelly推奨サイズを計算できません</p>
          <p className="text-xs mt-1">最低10トレード以上の履歴が必要です</p>
        </div>
      </div>
    );
  }
  
  return (
    <div className={cn('bg-[#141e27] rounded-lg border border-[#233648] overflow-hidden', className)}>
      {/* ヘッダー */}
      <div className="bg-[#192633] px-4 py-3 border-b border-[#233648]">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-primary" />
            <h3 className="text-sm font-bold text-white">Kelly推奨ポジションサイズ</h3>
          </div>
          {/* リスクレベルバッジ */}
          <div className={cn(
            'px-3 py-1 rounded-full text-xs font-bold border flex items-center gap-1',
            getRiskLevelColor(recommendation.riskLevel)
          )}>
            <Shield className="w-3 h-3" />
            {getRiskLevelLabel(recommendation.riskLevel)}
          </div>
        </div>
      </div>
      
      {/* メイン情報 */}
      <div className="p-4 space-y-4">
        {/* 最終推奨サイズ */}
        <div className="bg-[#192633] rounded-lg p-4">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs text-[#92adc9]">最終推奨サイズ</span>
            <Target className="w-4 h-4 text-primary" />
          </div>
          <div className="text-3xl font-bold text-white mb-2">
            {formatCurrency(recommendation.finalSize)}
          </div>
          <div className="grid grid-cols-2 gap-2 text-xs text-[#92adc9]">
            <div>
              <span className="block">Kelly基本: </span>
              <span className="text-white">{formatCurrency(recommendation.baseSize)}</span>
            </div>
            {recommendation.volatilityAdjustment && (
              <div>
                <span className="block">ボラティリティ調整: </span>
                <span className="text-white">{recommendation.volatilityAdjustment.adjustmentFactor.toFixed(2)}x</span>
              </div>
            )}
          </div>
        </div>
        
        {/* 信頼度と警告 */}
        {recommendation.kellyResult && (
          <div className="grid grid-cols-2 gap-3">
            {/* 信頼度 */}
            <div className="bg-[#192633] rounded-lg p-3">
              <div className="flex items-center gap-1 mb-1">
                <Activity className="w-3 h-3 text-blue-400" />
                <span className="text-xs text-[#92adc9]">計算信頼度</span>
              </div>
              <div className="text-lg font-bold text-blue-400">
                {(recommendation.kellyResult.confidence * 100).toFixed(0)}%
              </div>
            </div>
            
            {/* 適用制限 */}
            <div className="bg-[#192633] rounded-lg p-3">
              <div className="flex items-center gap-1 mb-1">
                <Shield className="w-3 h-3 text-purple-400" />
                <span className="text-xs text-[#92adc9]">適用制限</span>
              </div>
              <div className="text-lg font-bold text-purple-400">
                {recommendation.constraints.appliedLimits.length}
              </div>
              <div className="text-xs text-[#92adc9] mt-1">
                単一: {recommendation.constraints.singlePositionLimit}%
              </div>
            </div>
          </div>
        )}
        
        {/* ボラティリティ情報 */}
        {recommendation.volatilityAdjustment && (
          <div className="bg-[#192633] rounded-lg p-3">
            <div className="flex items-center gap-1 mb-2">
              <Activity className="w-4 h-4 text-orange-400" />
              <span className="text-xs font-medium text-white">ボラティリティ調整</span>
            </div>
            <div className="grid grid-cols-3 gap-2 text-xs">
              <div>
                <span className="text-[#92adc9] block">実際のATR</span>
                <span className="text-white font-medium">
                  {formatPercent(recommendation.volatilityAdjustment.actualVolatility)}
                </span>
              </div>
              <div>
                <span className="text-[#92adc9] block">目標ATR</span>
                <span className="text-white font-medium">
                  {formatPercent(recommendation.volatilityAdjustment.targetVolatility)}
                </span>
              </div>
              <div>
                <span className="text-[#92adc9] block">調整係数</span>
                <span className="text-white font-medium">
                  {recommendation.volatilityAdjustment.adjustmentFactor.toFixed(2)}x
                </span>
              </div>
            </div>
          </div>
        )}
        
        {/* Kelly警告 */}
        {recommendation.kellyResult?.warnings && recommendation.kellyResult.warnings.length > 0 && (
          <div className="bg-yellow-900/20 border border-yellow-700/50 rounded-lg p-3">
            <div className="flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-yellow-400 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-xs font-medium text-yellow-400 mb-1">Kelly計算の注意事項</p>
                <ul className="text-xs text-yellow-400/80 space-y-1">
                  {recommendation.kellyResult.warnings.map((warning, index) => (
                    <li key={index}>• {warning}</li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        )}
        
        {/* 適用された制限 */}
        {recommendation.constraints.appliedLimits.length > 0 && (
          <div className="bg-blue-900/20 border border-blue-700/50 rounded-lg p-3">
            <div className="flex items-start gap-2">
              <Shield className="w-4 h-4 text-blue-400 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-xs font-medium text-blue-400 mb-1">適用された集中度制限</p>
                <ul className="text-xs text-blue-400/80 space-y-1">
                  {recommendation.constraints.appliedLimits.map((limit, index) => (
                    <li key={index}>• {limit}</li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        )}
        
        {/* サイズ調整ボタン（オプション） */}
        {onAdjustSize && (
          <div className="flex gap-2">
            <button
              onClick={() => onAdjustSize(recommendation.finalSize * 0.5)}
              className="flex-1 px-3 py-2 text-xs font-medium text-white bg-[#192633] rounded-lg hover:bg-[#233648] transition-colors"
            >
              50%に調整
            </button>
            <button
              onClick={() => onAdjustSize(recommendation.finalSize * 0.75)}
              className="flex-1 px-3 py-2 text-xs font-medium text-white bg-[#192633] rounded-lg hover:bg-[#233648] transition-colors"
            >
              75%に調整
            </button>
            <button
              onClick={() => onAdjustSize(recommendation.finalSize)}
              className="flex-1 px-3 py-2 text-xs font-medium text-white bg-primary/20 border border-primary rounded-lg hover:bg-primary/30 transition-colors"
            >
              100%適用
            </button>
          </div>
        )}
        
        {/* フッター情報 */}
        <div className="pt-2 border-t border-[#233648]">
          <p className="text-xs text-[#92adc9] text-center">
            Kelly Criterion: 期待値に基づく最適ポジションサイズ | ½-Kelly法適用済み
          </p>
        </div>
      </div>
    </div>
  );
}
