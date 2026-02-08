/**
 * Position Sizing Display
 * 
 * ポジションサイジング計算結果を表示するコンポーネント
 */

'use client';

import { useMemo } from 'react';
import { useRiskManagementStore } from '@/app/store/riskManagementStore';
import { PositionSizingResult } from '@/app/lib/aiAnalytics/PredictiveAnalyticsEngine';
import { cn } from '@/app/lib/utils';
import { TrendingUp, AlertTriangle, DollarSign, Target } from 'lucide-react';

interface PositionSizingDisplayProps {
  result: PositionSizingResult | null;
  loading?: boolean;
  className?: string;
}

export function PositionSizingDisplay({ 
  result, 
  loading = false,
  className 
}: PositionSizingDisplayProps) {
  const { settings } = useRiskManagementStore();
  
  // 警告判定
  const warnings = useMemo(() => {
    if (!result) return [];
    
    const warns: string[] = [];
    
    // 少ない株数の警告
    if (result.recommendedShares < settings.minShares) {
      warns.push(`推奨株数が最小単位（${settings.minShares}株）未満です`);
    }
    
    // 高いポジション比率の警告
    const positionPercent = (result.positionValue / settings.accountEquity) * 100;
    if (positionPercent > settings.maxPositionPercent) {
      warns.push(`ポジション比率が高すぎます（${settings.maxPositionPercent}%超）`);
    }
    
    // 大きな損切り距離の警告
    if (result.stopLossPercent > settings.maxStopLossPercent) {
      warns.push(`損切り距離が大きすぎます（${settings.maxStopLossPercent}%超）`);
    }
    
    return warns;
  }, [
    result, 
    settings.accountEquity, 
    settings.minShares, 
    settings.maxPositionPercent, 
    settings.maxStopLossPercent
  ]);
  
  if (!settings.enabled) {
    return (
      <div className={cn('p-4 bg-[#141e27] rounded-lg border border-[#233648]', className)}>
        <div className="text-center text-[#92adc9] text-sm">
          <p>ポジションサイジング機能は無効です</p>
          <p className="text-xs mt-1">設定から有効化してください</p>
        </div>
      </div>
    );
  }
  
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
  
  if (!result) {
    return (
      <div className={cn('p-4 bg-[#141e27] rounded-lg border border-[#233648]', className)}>
        <div className="text-center text-[#92adc9] text-sm">
          <p>ポジションサイズを計算できません</p>
          <p className="text-xs mt-1">シグナルまたは価格データが不足しています</p>
        </div>
      </div>
    );
  }
  
  const formatCurrency = (value: number): string => {
    return new Intl.NumberFormat('ja-JP', {
      style: 'currency',
      currency: 'JPY',
      maximumFractionDigits: 0,
    }).format(value);
  };
  
  return (
    <div className={cn('bg-[#141e27] rounded-lg border border-[#233648] overflow-hidden', className)}>
      {/* ヘッダー */}
      <div className="bg-[#192633] px-4 py-3 border-b border-[#233648]">
        <div className="flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-primary" />
          <h3 className="text-sm font-bold text-white">推奨ポジションサイズ</h3>
        </div>
      </div>
      
      {/* メイン情報 */}
      <div className="p-4 space-y-4">
        {/* 推奨株数 */}
        <div className="bg-[#192633] rounded-lg p-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-[#92adc9]">推奨購入株数</span>
            <Target className="w-4 h-4 text-primary" />
          </div>
          <div className="text-2xl font-bold text-white">
            {result.recommendedShares.toLocaleString()}
            <span className="text-sm font-normal text-[#92adc9] ml-1">株</span>
          </div>
          <div className="text-xs text-[#92adc9] mt-1">
            ポジション価値: {formatCurrency(result.positionValue)}
          </div>
        </div>
        
        {/* リスク情報 */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-[#192633] rounded-lg p-3">
            <div className="flex items-center gap-1 mb-1">
              <DollarSign className="w-3 h-3 text-red-400" />
              <span className="text-xs text-[#92adc9]">予想最大損失</span>
            </div>
            <div className="text-lg font-bold text-red-400">
              {formatCurrency(result.maxLossAmount)}
            </div>
            <div className="text-xs text-[#92adc9] mt-1">
              {result.riskPercent.toFixed(2)}% リスク
            </div>
          </div>
          
          <div className="bg-[#192633] rounded-lg p-3">
            <div className="flex items-center gap-1 mb-1">
              <AlertTriangle className="w-3 h-3 text-yellow-400" />
              <span className="text-xs text-[#92adc9]">損切り距離</span>
            </div>
            <div className="text-lg font-bold text-yellow-400">
              {result.stopLossPercent.toFixed(2)}%
            </div>
            <div className="text-xs text-[#92adc9] mt-1">
              {formatCurrency(result.stopLossDistance)}/株
            </div>
          </div>
        </div>
        
        {/* 警告 */}
        {warnings.length > 0 && (
          <div className="bg-yellow-900/20 border border-yellow-700/50 rounded-lg p-3">
            <div className="flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-yellow-400 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-xs font-medium text-yellow-400 mb-1">注意事項</p>
                <ul className="text-xs text-yellow-400/80 space-y-1">
                  {warnings.map((warning, index) => (
                    <li key={index}>• {warning}</li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        )}
        
        {/* 詳細理由（折りたたみ可能） */}
        <details className="group">
          <summary className="cursor-pointer text-xs font-medium text-[#92adc9] hover:text-white transition-colors">
            計算の詳細を表示
          </summary>
          <div className="mt-2 space-y-1">
            {result.reasoning.map((reason, index) => (
              <p key={index} className="text-xs text-[#92adc9] pl-2 border-l-2 border-[#233648]">
                {reason}
              </p>
            ))}
          </div>
        </details>
        
        {/* フッター情報 */}
        <div className="pt-2 border-t border-[#233648]">
          <p className="text-xs text-[#92adc9] text-center">
            口座資金: {formatCurrency(settings.accountEquity)} | リスク許容: {settings.riskPerTrade}%
          </p>
        </div>
      </div>
    </div>
  );
}
