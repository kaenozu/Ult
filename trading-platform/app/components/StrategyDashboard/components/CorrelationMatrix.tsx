/**
 * CorrelationMatrix Component
 * 
 * 戦略間相関マトリックスを表示
 */

import React, { useMemo, memo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/app/components/ui/Card';
import { StrategyPerformance } from '../types';
import { calculateCorrelations, getCorrelationColor } from '../utils';

interface CorrelationMatrixProps {
  strategies: StrategyPerformance[];
}

/**
 * 相関マトリックスコンポーネント
 */
export const CorrelationMatrix = memo(function CorrelationMatrix({
  strategies,
}: CorrelationMatrixProps) {
  const correlations = useMemo(() => {
    return calculateCorrelations(strategies);
  }, [strategies]);

  if (strategies.length === 0) {
    return null;
  }

  return (
    <Card className="bg-[#1e293b] border-[#334155]">
      <CardHeader>
        <CardTitle className="text-white">戦略間相関マトリックス</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr>
                <th className="text-left text-gray-400 p-2"></th>
                {strategies.map(s => (
                  <th key={s.name} className="text-center text-gray-400 p-2">
                    {s.name}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {strategies.map((s1, i) => (
                <tr key={s1.name}>
                  <td className="text-left text-gray-300 p-2 font-medium">{s1.name}</td>
                  {strategies.map((s2, j) => {
                    const corr = correlations[i][j];
                    const color = getCorrelationColor(corr);
                    return (
                      <td
                        key={s2.name}
                        className="text-center p-2"
                        style={{ backgroundColor: color }}
                      >
                        <span className="text-white font-medium">
                          {corr.toFixed(2)}
                        </span>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
});
