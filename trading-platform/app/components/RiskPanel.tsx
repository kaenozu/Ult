/**
 * RiskPanel.tsx
 * 
 * リスク管理パネルコンポーネント
 */

'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/app/components/ui/Card';
import { RiskMetrics } from '@/app/lib/risk/AdvancedRiskManager';
import { Shield, AlertTriangle, TrendingDown, Activity } from 'lucide-react';

interface RiskPanelProps {
  riskMetrics: RiskMetrics | null;
}

export function RiskPanel({ riskMetrics }: RiskPanelProps) {
  if (!riskMetrics) {
    return (
      <Card className="bg-[#1e293b] border-[#334155]">
        <CardContent className="p-6">
          <p className="text-gray-400">No risk data available</p>
        </CardContent>
      </Card>
    );
  }

  const formatPercent = (value: number) => `${value.toFixed(2)}%`;
  const formatNumber = (value: number) => value.toFixed(2);

  return (
    <Card className="bg-[#1e293b] border-[#334155]">
      <CardHeader>
        <CardTitle className="text-white flex items-center gap-2">
          <Shield className="w-5 h-5 text-orange-400" />
          Risk Metrics
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Drawdown */}
        <div className="grid grid-cols-2 gap-4">
          <RiskMetric
            label="Current Drawdown"
            value={formatPercent(riskMetrics.currentDrawdown)}
            icon={<TrendingDown className="w-4 h-4" />}
            color={riskMetrics.currentDrawdown > 10 ? 'red' : riskMetrics.currentDrawdown > 5 ? 'yellow' : 'green'}
          />
          <RiskMetric
            label="Max Drawdown"
            value={formatPercent(riskMetrics.maxDrawdown)}
            icon={<AlertTriangle className="w-4 h-4" />}
            color={riskMetrics.maxDrawdown > 15 ? 'red' : 'yellow'}
          />
        </div>

        {/* Ratios */}
        <div className="grid grid-cols-2 gap-4">
          <RiskMetric
            label="Sharpe Ratio"
            value={formatNumber(riskMetrics.sharpeRatio)}
            icon={<Activity className="w-4 h-4" />}
            color={riskMetrics.sharpeRatio > 1.5 ? 'green' : riskMetrics.sharpeRatio > 1 ? 'yellow' : 'red'}
          />
          <RiskMetric
            label="Sortino Ratio"
            value={formatNumber(riskMetrics.sortinoRatio)}
            icon={<Activity className="w-4 h-4" />}
            color={riskMetrics.sortinoRatio > 2 ? 'green' : riskMetrics.sortinoRatio > 1 ? 'yellow' : 'red'}
          />
        </div>

        {/* VaR and Volatility */}
        <div className="grid grid-cols-2 gap-4">
          <div className="p-3 bg-[#0f172a] rounded-lg">
            <p className="text-xs text-gray-400">VaR (95%)</p>
            <p className="text-lg font-medium text-white">
              {formatPercent(riskMetrics.var)}
            </p>
          </div>
          <div className="p-3 bg-[#0f172a] rounded-lg">
            <p className="text-xs text-gray-400">Volatility</p>
            <p className="text-lg font-medium text-white">
              {formatPercent(riskMetrics.volatility)}
            </p>
          </div>
        </div>

        {/* Leverage and Concentration */}
        <div className="grid grid-cols-2 gap-4">
          <div className="p-3 bg-[#0f172a] rounded-lg">
            <p className="text-xs text-gray-400">Leverage</p>
            <p className={`text-lg font-medium ${riskMetrics.leverage > 2 ? 'text-red-400' : 'text-white'}`}>
              {formatNumber(riskMetrics.leverage)}x
            </p>
          </div>
          <div className="p-3 bg-[#0f172a] rounded-lg">
            <p className="text-xs text-gray-400">Concentration Risk</p>
            <p className={`text-lg font-medium ${riskMetrics.concentrationRisk > 0.5 ? 'text-red-400' : 'text-white'}`}>
              {formatPercent(riskMetrics.concentrationRisk * 100)}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function RiskMetric({
  label,
  value,
  icon,
  color,
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
  color: 'red' | 'yellow' | 'green';
}) {
  const colorClasses = {
    red: 'text-red-400 bg-red-500/10',
    yellow: 'text-yellow-400 bg-yellow-500/10',
    green: 'text-green-400 bg-green-500/10',
  };

  return (
    <div className={`p-3 rounded-lg ${colorClasses[color]}`}>
      <div className="flex items-center gap-2 mb-1">
        {icon}
        <p className="text-xs opacity-80">{label}</p>
      </div>
      <p className="text-lg font-bold">{value}</p>
    </div>
  );
}

export default RiskPanel;
