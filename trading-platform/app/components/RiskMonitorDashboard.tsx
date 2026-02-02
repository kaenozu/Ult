/**
 * Risk Monitor Dashboard
 * 
 * リアルタイムでリスクエクスポージャーと制限使用率を監視する
 * ダッシュボードコンポーネント
 */

'use client';

import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/app/components/ui/Card';
import { Progress } from '@/app/components/ui/progress';
import { Badge } from '@/app/components/ui/Badge';
import { Alert, AlertDescription, AlertTitle } from '@/app/components/ui/alert';
import { getGlobalRiskManager } from '@/app/lib/risk/AdvancedRiskManager';
import type { RiskAlert, RiskLimits } from '@/app/lib/risk/AdvancedRiskManager';
import { AlertCircle, TrendingDown, TrendingUp, Shield, Activity } from 'lucide-react';

interface RiskStatus {
  limits: RiskLimits;
  usage: {
    dailyLossPercent: number;
    maxDrawdownPercent: number;
    leverageRatio: number;
    concentrationRisk: number;
    cashReservePercent: number;
  };
  isHalted: boolean;
  recentAlerts: RiskAlert[];
}

interface RiskMetrics {
  var: number;
  cvar: number;
  sharpeRatio: number;
  sortinoRatio: number;
  maxDrawdown: number;
  currentDrawdown: number;
  volatility: number;
  beta: number;
  leverage: number;
  concentrationRisk: number;
}

export default function RiskMonitorDashboard() {
  const [riskStatus, setRiskStatus] = useState<RiskStatus | null>(null);
  const [riskMetrics, setRiskMetrics] = useState<RiskMetrics | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const updateRiskData = () => {
      try {
        const manager = getGlobalRiskManager();
        const status = manager.getRiskStatus();
        const metrics = manager.getRiskMetrics();
        
        setRiskStatus(status);
        setRiskMetrics(metrics);
        setIsLoading(false);
      } catch (error) {
        console.error('Failed to fetch risk data:', error);
        setIsLoading(false);
      }
    };

    // Initial load
    updateRiskData();

    // Update every 5 seconds
    const interval = setInterval(updateRiskData, 5000);

    // Listen to risk manager events
    const manager = getGlobalRiskManager();
    const handleRiskAlert = () => updateRiskData();
    const handleMetricsUpdate = () => updateRiskData();

    manager.on('risk_alert', handleRiskAlert);
    manager.on('metrics_updated', handleMetricsUpdate);

    return () => {
      clearInterval(interval);
      manager.off('risk_alert', handleRiskAlert);
      manager.off('metrics_updated', handleMetricsUpdate);
    };
  }, []);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Loading risk data...</div>
      </div>
    );
  }

  if (!riskStatus || !riskMetrics) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">No risk data available</div>
      </div>
    );
  }

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical':
        return 'destructive';
      case 'high':
        return 'destructive';
      case 'medium':
        return 'default';
      case 'low':
        return 'secondary';
      default:
        return 'default';
    }
  };

  const getUsageColor = (current: number, limit: number, inverse = false) => {
    const percent = inverse ? (current / limit) * 100 : (current / limit) * 100;
    if (percent > 90) return 'text-red-500';
    if (percent > 70) return 'text-yellow-500';
    return 'text-green-500';
  };

  const formatPercent = (value: number) => {
    return `${Math.abs(value).toFixed(2)}%`;
  };

  return (
    <div className="space-y-4">
      {/* Trading Status Banner */}
      {riskStatus.isHalted && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Trading Halted</AlertTitle>
          <AlertDescription>
            Trading has been automatically halted due to risk limit violations.
            Please review your positions and risk parameters.
          </AlertDescription>
        </Alert>
      )}

      {/* Risk Limits Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Daily Loss */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <TrendingDown className="h-4 w-4" />
              Daily Loss
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-2xl font-bold">
                  {formatPercent(riskStatus.usage.dailyLossPercent)}
                </span>
                <Badge variant={riskStatus.usage.dailyLossPercent >= riskStatus.limits.maxDailyLoss ? 'destructive' : 'secondary'}>
                  Limit: {formatPercent(riskStatus.limits.maxDailyLoss)}
                </Badge>
              </div>
              <Progress 
                value={(riskStatus.usage.dailyLossPercent / riskStatus.limits.maxDailyLoss) * 100} 
                className="h-2"
              />
              <p className="text-xs text-gray-500">
                {((riskStatus.usage.dailyLossPercent / riskStatus.limits.maxDailyLoss) * 100).toFixed(1)}% of limit used
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Drawdown */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <TrendingDown className="h-4 w-4" />
              Drawdown
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-2xl font-bold">
                  {formatPercent(riskStatus.usage.maxDrawdownPercent)}
                </span>
                <Badge variant={riskStatus.usage.maxDrawdownPercent >= riskStatus.limits.maxDrawdown ? 'destructive' : 'secondary'}>
                  Limit: {formatPercent(riskStatus.limits.maxDrawdown)}
                </Badge>
              </div>
              <Progress 
                value={(riskStatus.usage.maxDrawdownPercent / riskStatus.limits.maxDrawdown) * 100} 
                className="h-2"
              />
              <p className="text-xs text-gray-500">
                Max: {formatPercent(riskMetrics.maxDrawdown * 100)}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Leverage */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Activity className="h-4 w-4" />
              Leverage
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-2xl font-bold">
                  {riskStatus.usage.leverageRatio.toFixed(2)}x
                </span>
                <Badge variant={riskStatus.usage.leverageRatio >= riskStatus.limits.maxLeverage ? 'destructive' : 'secondary'}>
                  Limit: {riskStatus.limits.maxLeverage.toFixed(2)}x
                </Badge>
              </div>
              <Progress 
                value={(riskStatus.usage.leverageRatio / riskStatus.limits.maxLeverage) * 100} 
                className="h-2"
              />
              <p className="text-xs text-gray-500">
                {((riskStatus.usage.leverageRatio / riskStatus.limits.maxLeverage) * 100).toFixed(1)}% of limit used
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Concentration Risk */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Shield className="h-4 w-4" />
              Concentration Risk
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-2xl font-bold">
                  {formatPercent(riskStatus.usage.concentrationRisk * 100)}
                </span>
                <Badge variant={riskStatus.usage.concentrationRisk > 0.5 ? 'destructive' : 'secondary'}>
                  Target: &lt;50%
                </Badge>
              </div>
              <Progress 
                value={riskStatus.usage.concentrationRisk * 100} 
                className="h-2"
              />
              <p className="text-xs text-gray-500">
                HHI-based concentration index
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Cash Reserve */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Cash Reserve
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-2xl font-bold">
                  {formatPercent(riskStatus.usage.cashReservePercent)}
                </span>
                <Badge variant={riskStatus.usage.cashReservePercent < riskStatus.limits.minCashReserve ? 'destructive' : 'secondary'}>
                  Min: {formatPercent(riskStatus.limits.minCashReserve)}
                </Badge>
              </div>
              <Progress 
                value={(riskStatus.usage.cashReservePercent / 100) * 100} 
                className="h-2"
              />
              <p className="text-xs text-gray-500">
                Cash available for trading
              </p>
            </div>
          </CardContent>
        </Card>

        {/* VaR & CVaR */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Activity className="h-4 w-4" />
              Value at Risk
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <div>
                  <div className="text-sm text-gray-500">VaR (95%)</div>
                  <div className="text-xl font-bold">
                    ${riskMetrics.var.toLocaleString()}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm text-gray-500">CVaR (95%)</div>
                  <div className="text-xl font-bold">
                    ${riskMetrics.cvar.toLocaleString()}
                  </div>
                </div>
              </div>
              <p className="text-xs text-gray-500">
                Expected maximum loss in worst 5% scenarios
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Risk Metrics Details */}
      <Card>
        <CardHeader>
          <CardTitle>Risk Metrics</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <div className="text-sm text-gray-500">Sharpe Ratio</div>
              <div className="text-2xl font-bold">{riskMetrics.sharpeRatio.toFixed(2)}</div>
            </div>
            <div>
              <div className="text-sm text-gray-500">Sortino Ratio</div>
              <div className="text-2xl font-bold">{riskMetrics.sortinoRatio.toFixed(2)}</div>
            </div>
            <div>
              <div className="text-sm text-gray-500">Volatility</div>
              <div className="text-2xl font-bold">{formatPercent(riskMetrics.volatility * 100)}</div>
            </div>
            <div>
              <div className="text-sm text-gray-500">Beta</div>
              <div className="text-2xl font-bold">{riskMetrics.beta.toFixed(2)}</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Recent Alerts */}
      {riskStatus.recentAlerts.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Recent Risk Alerts</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {riskStatus.recentAlerts.slice().reverse().map((alert, idx) => (
                <Alert key={idx} variant={alert.severity === 'critical' || alert.severity === 'high' ? 'destructive' : 'default'}>
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle className="capitalize">
                    {alert.type.replace(/_/g, ' ')} - {alert.severity}
                  </AlertTitle>
                  <AlertDescription>
                    {alert.message}
                    <span className="text-xs ml-2 text-gray-500">
                      {new Date(alert.timestamp).toLocaleTimeString()}
                    </span>
                  </AlertDescription>
                </Alert>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
