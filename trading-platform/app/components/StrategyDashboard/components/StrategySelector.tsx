/**
 * StrategySelector Component
 * 
 * 戦略選択とビューモード切替を行うヘッダーコンポーネント
 */

import React, { memo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/app/components/ui/Card';
import { Button } from '@/app/components/ui/Button';
import { BarChart3 } from 'lucide-react';
import { StrategyPerformance, ViewMode } from '../types';

interface StrategySelectorProps {
  strategies: StrategyPerformance[];
  selectedStrategies: string[];
  viewMode: ViewMode;
  showComparison: boolean;
  onToggleStrategy: (name: string) => void;
  onViewModeChange: (mode: ViewMode) => void;
}

/**
 * 戦略セレクターコンポーネント
 */
export const StrategySelector = memo(function StrategySelector({
  strategies,
  selectedStrategies,
  viewMode,
  showComparison,
  onToggleStrategy,
  onViewModeChange,
}: StrategySelectorProps) {
  return (
    <Card className="bg-[#1e293b] border-[#334155]">
      <CardHeader>
        <CardTitle className="text-white flex items-center gap-2">
          <BarChart3 className="w-6 h-6 text-purple-400" />
          戦略評価ダッシュボード
        </CardTitle>
      </CardHeader>
      <CardContent>
        {/* 戦略選択ボタン */}
        <div className="flex gap-2 flex-wrap">
          {strategies.map(strategy => (
            <Button
              key={strategy.name}
              onClick={() => onToggleStrategy(strategy.name)}
              variant={selectedStrategies.includes(strategy.name) ? 'default' : 'outline'}
              className={`text-sm ${
                selectedStrategies.includes(strategy.name)
                  ? 'bg-purple-600 hover:bg-purple-700'
                  : 'border-gray-600 text-gray-300 hover:bg-gray-700'
              }`}
            >
              <div
                className="w-3 h-3 rounded-full mr-2"
                style={{ backgroundColor: strategy.color }}
              />
              {strategy.name}
            </Button>
          ))}
        </div>

        {/* ビューモード切替ボタン */}
        <div className="flex gap-2 mt-4">
          <Button
            onClick={() => onViewModeChange('overview')}
            variant={viewMode === 'overview' ? 'default' : 'outline'}
            className="text-sm"
          >
            概要
          </Button>
          <Button
            onClick={() => onViewModeChange('detailed')}
            variant={viewMode === 'detailed' ? 'default' : 'outline'}
            className="text-sm"
          >
            詳細
          </Button>
          {showComparison && (
            <Button
              onClick={() => onViewModeChange('comparison')}
              variant={viewMode === 'comparison' ? 'default' : 'outline'}
              className="text-sm"
            >
              比較分析
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
});
