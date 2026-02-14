/**
 * RiskMonitoringDashboard.tsx
 * 
 * TRADING-023: リアルタイムリスク監視ダッシュボード
 * Phase 2: リスク監視と警告
 * 
 * リアルタイムリスクメトリクス、アラート、個別ポジションリスクを表示
 */

'use client';

import React, { useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/app/components/ui/Card';
import { 
  Shield, 
  AlertTriangle, 
  TrendingDown, 
  Activity,
  Bell,
  AlertCircle,
  XCircle,
} from 'lucide-react';
import { useRiskMonitoringStore, getRiskLevelColor, getRiskLevelBgColor, getAlertSeverityColor } from '@/app/store/riskMonitoringStore';
import { Portfolio } from '@/app/types';

interface RiskMonitoringDashboardProps {
  portfolio: Portfolio;
  updateInterval?: number; // ms
}

export function RiskMonitoringDashboard({ portfolio, updateInterval = 5000 }: RiskMonitoringDashboardProps) {
  const {
    currentRisk,
    positionRisks,
    unreadAlertCount,
    isMonitoringEnabled,
    blockNewOrders,
    updateRisk,
    updatePositionRisk,
    markAlertsRead,
    getActiveAlerts,
  } = useRiskMonitoringStore();

  // ポートフォリオリスクを定期的に更新
  useEffect(() => {
    if (!isMonitoringEnabled) {
      return;
    }

    // 初回更新
    updateRisk(portfolio);

    // 定期更新
    const interval = setInterval(() => {
      updateRisk(portfolio);
      
      // 各ポジションのリスクも更新
      const totalValue = portfolio.totalValue + portfolio.cash;
      portfolio.positions.forEach(position => {
        updatePositionRisk(position, totalValue);
      });
    }, updateInterval);

    return () => clearInterval(interval);
  }, [portfolio, isMonitoringEnabled, updateInterval, updateRisk, updatePositionRisk]);

  const activeAlerts = useMemo(() => getActiveAlerts(), [getActiveAlerts]);

  if (!isMonitoringEnabled) {
    return (
      <Card className="bg-[#1e293b] border-[#334155]">
        <CardContent className="p-6">
          <p className="text-gray-400">Risk monitoring is disabled</p>
        </CardContent>
      </Card>
    );
  }

  if (!currentRisk) {
    return (
      <Card className="bg-[#1e293b] border-[#334155]">
        <CardContent className="p-6">
          <p className="text-gray-400">Calculating risk metrics...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Risk Overview Card */}
      <Card className="bg-[#1e293b] border-[#334155]">
        <CardHeader>
          <CardTitle className="text-white flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Shield className={`w-5 h-5 ${getRiskLevelColor(currentRisk.riskLevel)}`} />
              リアルタイムリスク監視
            </div>
            <div className={`px-3 py-1 rounded-full text-sm font-medium ${getRiskLevelBgColor(currentRisk.riskLevel)} ${getRiskLevelColor(currentRisk.riskLevel)}`}>
              {currentRisk.riskLevel.toUpperCase()}
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Block Orders Warning */}
          {blockNewOrders && (
            <div className="p-4 bg-red-500/20 border border-red-500/50 rounded-lg flex items-center gap-3">
              <XCircle className="w-5 h-5 text-red-400" />
              <div>
                <p className="text-red-400 font-medium">新規注文がブロックされています</p>
                <p className="text-red-300 text-sm">リスク水準が危険域に達したため、新規注文を停止しています</p>
              </div>
            </div>
          )}

          {/* Main Risk Metrics */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <RiskMetric
              label="総合リスク"
              value={`${currentRisk.totalRiskPercent.toFixed(1)}%`}
              icon={<Activity className="w-4 h-4" />}
              color={getRiskLevelColor(currentRisk.riskLevel)}
              subtitle={`使用資金: ${currentRisk.usedCapitalPercent.toFixed(1)}%`}
            />
            <RiskMetric
              label="未実現損益"
              value={formatCurrency(currentRisk.unrealizedPnL)}
              icon={<TrendingDown className="w-4 h-4" />}
              color={currentRisk.unrealizedPnL >= 0 ? 'text-green-400' : 'text-red-400'}
              subtitle={`${currentRisk.unrealizedPnLPercent >= 0 ? '+' : ''}${currentRisk.unrealizedPnLPercent.toFixed(2)}%`}
            />
            <RiskMetric
              label="現在のドローダウン"
              value={`${currentRisk.currentDrawdown.toFixed(2)}%`}
              icon={<TrendingDown className="w-4 h-4" />}
              color={currentRisk.currentDrawdown > 15 ? 'text-red-400' : currentRisk.currentDrawdown > 10 ? 'text-yellow-400' : 'text-green-400'}
              subtitle={`最大: ${currentRisk.maxDrawdown.toFixed(2)}%`}
            />
            <RiskMetric
              label="本日の損失"
              value={`${currentRisk.dailyLossPercent.toFixed(2)}%`}
              icon={<AlertTriangle className="w-4 h-4" />}
              color={currentRisk.dailyLossPercent > 3 ? 'text-red-400' : 'text-gray-400'}
              subtitle={formatCurrency(currentRisk.dailyLoss)}
            />
          </div>

          {/* VaR and Volatility */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="p-3 bg-[#0f172a] rounded-lg">
              <p className="text-xs text-gray-400">VaR (95%)</p>
              <p className="text-lg font-medium text-white">
                {formatCurrency(currentRisk.var95)}
              </p>
            </div>
            <div className="p-3 bg-[#0f172a] rounded-lg">
              <p className="text-xs text-gray-400">CVaR (95%)</p>
              <p className="text-lg font-medium text-white">
                {formatCurrency(currentRisk.cvar95)}
              </p>
            </div>
            <div className="p-3 bg-[#0f172a] rounded-lg">
              <p className="text-xs text-gray-400">ボラティリティ</p>
              <p className="text-lg font-medium text-white">
                {currentRisk.portfolioVolatility.toFixed(2)}%
              </p>
            </div>
            <div className="p-3 bg-[#0f172a] rounded-lg">
              <p className="text-xs text-gray-400">集中リスク</p>
              <p className={`text-lg font-medium ${currentRisk.concentrationRisk > 0.5 ? 'text-red-400' : 'text-white'}`}>
                {(currentRisk.concentrationRisk * 100).toFixed(1)}%
              </p>
            </div>
          </div>

          {/* Correlation Risk */}
          <div className="p-3 bg-[#0f172a] rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-400">相関リスク</p>
                <p className={`text-lg font-medium ${currentRisk.correlationRisk > 0.7 ? 'text-red-400' : 'text-white'}`}>
                  {(currentRisk.correlationRisk * 100).toFixed(1)}%
                </p>
              </div>
              <div className="text-right">
                <p className="text-xs text-gray-400">平均相関係数</p>
                <p className="text-lg font-medium text-white">
                  {currentRisk.avgCorrelation.toFixed(3)}
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Alerts Card */}
      {activeAlerts.length > 0 && (
        <Card className="bg-[#1e293b] border-[#334155]">
          <CardHeader>
            <CardTitle className="text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Bell className="w-5 h-5 text-orange-400" />
                アクティブアラート
                {unreadAlertCount > 0 && (
                  <span className="px-2 py-1 bg-red-500 text-white text-xs rounded-full">
                    {unreadAlertCount}
                  </span>
                )}
              </div>
              <button
                onClick={markAlertsRead}
                className="text-sm text-blue-400 hover:text-blue-300"
              >
                既読にする
              </button>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {activeAlerts.map(alert => (
              <AlertItem key={alert.id} alert={alert} />
            ))}
          </CardContent>
        </Card>
      )}

      {/* Position Risks Card */}
      {positionRisks.size > 0 && (
        <Card className="bg-[#1e293b] border-[#334155]">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Activity className="w-5 h-5 text-blue-400" />
              個別ポジションリスク
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {Array.from(positionRisks.values()).map(risk => (
                <PositionRiskItem key={risk.symbol} risk={risk} />
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// ============================================================================
// Sub Components
// ============================================================================

interface RiskMetricProps {
  label: string;
  value: string;
  icon: React.ReactNode;
  color: string;
  subtitle?: string;
}

function RiskMetric({ label, value, icon, color, subtitle }: RiskMetricProps) {
  return (
    <div className="p-3 bg-[#0f172a] rounded-lg">
      <div className="flex items-center gap-2 mb-1">
        <span className={color}>{icon}</span>
        <p className="text-xs text-gray-400">{label}</p>
      </div>
      <p className={`text-lg font-medium ${color}`}>{value}</p>
      {subtitle && (
        <p className="text-xs text-gray-500 mt-1">{subtitle}</p>
      )}
    </div>
  );
}

interface AlertItemProps {
  alert: {
    id: string;
    type: string;
    severity: string;
    message: string;
    currentValue: number;
    thresholdValue: number;
    actionRequired?: string;
  };
}

function AlertItem({ alert }: AlertItemProps) {
  const severityColor = getAlertSeverityColor(alert.severity);
  const Icon = alert.severity === 'critical' ? AlertCircle : AlertTriangle;

  return (
    <div className={`p-3 rounded-lg border ${
      alert.severity === 'critical' 
        ? 'bg-red-500/10 border-red-500/30'
        : alert.severity === 'high'
        ? 'bg-orange-500/10 border-orange-500/30'
        : 'bg-yellow-500/10 border-yellow-500/30'
    }`}>
      <div className="flex items-start gap-3">
        <Icon className={`w-5 h-5 ${severityColor} flex-shrink-0 mt-0.5`} />
        <div className="flex-1">
          <p className={`font-medium ${severityColor}`}>{alert.message}</p>
          <p className="text-sm text-gray-400 mt-1">
            現在値: {alert.currentValue.toFixed(2)} / 閾値: {alert.thresholdValue.toFixed(2)}
          </p>
          {alert.actionRequired && (
            <p className="text-sm text-orange-300 mt-2">
              <strong>対応:</strong> {alert.actionRequired}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

interface PositionRiskItemProps {
  risk: {
    symbol: string;
    positionValue: number;
    positionPercent: number;
    unrealizedPnL: number;
    unrealizedPnLPercent: number;
    volatility: number;
    var95: number;
    riskContribution: number;
    stopLossDistance: number;
  };
}

function PositionRiskItem({ risk }: PositionRiskItemProps) {
  const pnlColor = risk.unrealizedPnL >= 0 ? 'text-green-400' : 'text-red-400';

  return (
    <div className="p-3 bg-[#0f172a] rounded-lg">
      <div className="flex items-center justify-between mb-2">
        <h4 className="font-medium text-white">{risk.symbol}</h4>
        <span className={`text-sm font-medium ${pnlColor}`}>
          {risk.unrealizedPnL >= 0 ? '+' : ''}{formatCurrency(risk.unrealizedPnL)}
          {' '}({risk.unrealizedPnLPercent >= 0 ? '+' : ''}{risk.unrealizedPnLPercent.toFixed(2)}%)
        </span>
      </div>
      <div className="grid grid-cols-3 gap-3 text-xs">
        <div>
          <p className="text-gray-400">ポジション比率</p>
          <p className="text-white font-medium">{risk.positionPercent.toFixed(1)}%</p>
        </div>
        <div>
          <p className="text-gray-400">ボラティリティ</p>
          <p className="text-white font-medium">{risk.volatility.toFixed(1)}%</p>
        </div>
        <div>
          <p className="text-gray-400">VaR (95%)</p>
          <p className="text-white font-medium">{formatCurrency(risk.var95)}</p>
        </div>
      </div>
      {risk.stopLossDistance > 0 && (
        <div className="mt-2 pt-2 border-t border-gray-700">
          <p className="text-xs text-gray-400">
            ストップロスまで: <span className="text-white font-medium">{risk.stopLossDistance.toFixed(2)}%</span>
          </p>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// Utilities
// ============================================================================

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('ja-JP', {
    style: 'currency',
    currency: 'JPY',
    maximumFractionDigits: 0,
  }).format(value);
}

export default RiskMonitoringDashboard;
