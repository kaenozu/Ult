/**
 * ReturnHeatmap Component
 * 
 * 月次リターンヒートマップを表示
 */

import React, { memo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/app/components/ui/Card';
import { StrategyPerformance } from '../types';

interface ReturnHeatmapProps {
  strategies: StrategyPerformance[];
}

/**
 * 月次リターンヒートマップコンポーネント
 * 
 * 注: 現在は簡易実装。将来的にデータから月次リターンを計算して表示
 */
export const ReturnHeatmap = memo(function ReturnHeatmap({
  strategies,
}: ReturnHeatmapProps) {
  if (strategies.length === 0) {
    return null;
  }

  return (
    <Card className="bg-[#1e293b] border-[#334155]">
      <CardHeader>
        <CardTitle className="text-white">月次リターンヒートマップ</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-gray-400 text-sm">
          月次リターンの視覚化（実装中）
        </p>
      </CardContent>
    </Card>
  );
});
