'use client';

import { Badge } from '@/app/components/ui/Badge';
import { cn } from '@/app/lib/utils';
import { TrendingUp, TrendingDown, AlertTriangle } from 'lucide-react';

interface AccuracyBadgeProps {
  hitRate: number;
  totalTrades: number;
  predictionError?: number;
  loading?: boolean;
  className?: string;
}

/**
 * AccuracyBadge - Displays real-time prediction accuracy for the current symbol
 * 
 * Shows:
 * - Last 1 year hit rate percentage
 * - Number of total trades analyzed
 * - Visual indicator based on accuracy level
 * - Prediction error (optional)
 * 
 * @param hitRate - Hit rate percentage (0-100)
 * @param totalTrades - Total number of trades analyzed
 * @param predictionError - Optional prediction error metric
 * @param loading - Loading state
 * @param className - Additional CSS classes
 */
export function AccuracyBadge({ 
  hitRate, 
  totalTrades, 
  predictionError,
  loading = false,
  className 
}: AccuracyBadgeProps) {
  // Determine accuracy level and styling
  const getAccuracyLevel = (rate: number): { 
    variant: 'success' | 'default' | 'destructive';
    icon: React.ReactNode;
    label: string;
  } => {
    if (rate >= 60) {
      return {
        variant: 'success',
        icon: <TrendingUp className="w-3 h-3 mr-1" />,
        label: '高精度'
      };
    } else if (rate >= 50) {
      return {
        variant: 'default',
        icon: <TrendingUp className="w-3 h-3 mr-1 opacity-70" />,
        label: '中精度'
      };
    } else {
      return {
        variant: 'destructive',
        icon: <AlertTriangle className="w-3 h-3 mr-1" />,
        label: '低精度'
      };
    }
  };

  if (loading) {
    return (
      <Badge variant="outline" className={cn("animate-pulse", className)}>
        <span className="text-[10px]">計算中...</span>
      </Badge>
    );
  }

  if (totalTrades === 0) {
    return (
      <Badge variant="outline" className={cn("opacity-60", className)}>
        <AlertTriangle className="w-3 h-3 mr-1" />
        <span className="text-[10px]">データ不足</span>
      </Badge>
    );
  }

  const { variant, icon, label } = getAccuracyLevel(hitRate);

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <Badge 
        variant={variant}
        className="flex items-center shadow-sm"
      >
        {icon}
        <div className="flex flex-col items-start leading-tight">
          <span className="text-[9px] opacity-80 font-normal">直近1年間の的中率</span>
          <span className="text-sm font-bold">{hitRate}%</span>
        </div>
      </Badge>
      
      <div className="text-[10px] text-gray-400 flex flex-col">
        <span>{label}</span>
        <span className="opacity-70">{totalTrades}回分析</span>
      </div>

      {predictionError !== undefined && (
        <div className="text-[10px] text-gray-400 flex flex-col">
          <span className="opacity-80">予測誤差</span>
          <span className="font-mono">{(predictionError * 100).toFixed(1)}%</span>
        </div>
      )}
    </div>
  );
}
