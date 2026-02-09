/**
 * SharpeRatioProgressChart Component
 * 
 * シャープレシオ推移を表示
 */

import React, { memo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/app/components/ui/Card';
import { Activity } from 'lucide-react';
import { StrategyPerformance } from '../types';

interface SharpeRatioProgressChartProps {
  strategies: StrategyPerformance[];
}

/**
 * シャープレシオ推移
 */
export const SharpeRatioProgressChart = memo(function SharpeRatioProgressChart({
  strategies,
}: SharpeRatioProgressChartProps) {
  return (
    <Card className="bg-[#1e293b] border-[#334155]">
      <CardHeader>
        <CardTitle className="text-white flex items-center gap-2">
          <Activity className="w-5 h-5 text-blue-400" />
          シャープレシオ推移
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {strategies.map(strategy => (
            <div key={strategy.name} className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-300">{strategy.name}</span>
                <span className="text-sm font-medium text-white">
                  {strategy.result.metrics.sharpeRatio.toFixed(2)}
                </span>
              </div>
              <div className="w-full bg-gray-700 rounded-full h-2">
                <div
                  className="h-2 rounded-full"
                  style={{
                    width: `${Math.min(100, (strategy.result.metrics.sharpeRatio / 3) * 100)}%`,
                    backgroundColor: strategy.color,
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
});
