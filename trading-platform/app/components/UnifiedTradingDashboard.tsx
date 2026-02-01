/**
 * UnifiedTradingDashboard.tsx
 * 
 * 統合トレーディングプラットフォームのメインダッシュボードコンポーネント。
 * 全機能へのアクセスと可視化を提供します。
 */

'use client';

import React, { useState, useEffect } from 'react';
import { useUnifiedTrading } from '@/app/hooks/useUnifiedTrading';
import { Card, CardContent, CardHeader, CardTitle } from '@/app/components/ui/Card';
import { Button } from '@/app/components/ui/Button';
import { Badge } from '@/app/components/ui/Badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/app/components/ui/Tabs';
import { cn } from '@/app/lib/utils';
import { 
  Play, 
  Square, 
  RotateCcw, 
  TrendingUp, 
  TrendingDown, 
  AlertTriangle,
  Activity,
  Wallet,
  BarChart3,
  Bell,
  Settings,
  Shield
} from 'lucide-react';

// Sub-components
import { PortfolioPanel } from './PortfolioPanel';
import { SignalPanel } from './SignalPanel';
import { RiskPanel } from './RiskPanel';
import { AlertPanel } from './AlertPanel';
import { MarketDataPanel } from './MarketDataPanel';
import { BacktestPanel } from './BacktestPanel';

export function UnifiedTradingDashboard() {
  const {
    isRunning,
    status,
    portfolio,
    signals,
    alerts,
    riskMetrics,
    start,
    stop,
    reset,
    placeOrder,
    closePosition,
    createAlert,
    updateConfig,
    isLoading,
    error,
  } = useUnifiedTrading({
    mode: 'paper',
    initialCapital: 1000000,
    aiEnabled: true,
    sentimentEnabled: true,
    autoTrading: false,
    symbols: ['BTCUSD', 'ETHUSD', 'SOLUSD', 'ADAUSD'],
  });

  const [activeTab, setActiveTab] = useState('overview');
  const [selectedSymbol, setSelectedSymbol] = useState('BTCUSD');

  // Format currency
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('ja-JP', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
    }).format(value);
  };

  // Format percentage
  const formatPercent = (value: number) => {
    return `${value >= 0 ? '+' : ''}${value.toFixed(2)}%`;
  };

  return (
    <div className="min-h-screen bg-[#0a0e14] text-white">
      {/* Header */}
      <header className="border-b border-[#1e293b] bg-[#0f172a] px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">
              Pro Trading Platform
            </h1>
            <Badge 
              variant={isRunning ? 'success' : 'secondary'}
              className={isRunning ? 'bg-green-500/20 text-green-400' : 'bg-gray-500/20 text-gray-400'}
            >
              {isRunning ? 'Running' : 'Stopped'}
            </Badge>
            {status?.mode && (
              <Badge variant="outline" className="border-blue-500/30 text-blue-400">
                {status.mode.toUpperCase()} MODE
              </Badge>
            )}
          </div>

          <div className="flex items-center gap-3">
            {error && (
              <div className="flex items-center gap-2 text-red-400 text-sm">
                <AlertTriangle className="w-4 h-4" />
                <span>{error.message}</span>
              </div>
            )}
            
            <Button
              variant="outline"
              size="sm"
              onClick={reset}
              disabled={isLoading || isRunning}
              className="border-[#334155] hover:bg-[#1e293b]"
            >
              <RotateCcw className="w-4 h-4 mr-2" />
              Reset
            </Button>

            {isRunning ? (
              <Button
                variant="destructive"
                size="sm"
                onClick={stop}
                disabled={isLoading}
              >
                <Square className="w-4 h-4 mr-2" />
                Stop
              </Button>
            ) : (
              <Button
                variant="default"
                size="sm"
                onClick={start}
                disabled={isLoading}
                className="bg-green-600 hover:bg-green-700"
              >
                <Play className="w-4 h-4 mr-2" />
                Start
              </Button>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="p-6">
        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <Card className="bg-[#1e293b] border-[#334155]">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-400">Total Value</p>
                  <p className="text-2xl font-bold text-white">
                    {portfolio ? formatCurrency(portfolio.totalValue) : '-'}
                  </p>
                </div>
                <Wallet className="w-8 h-8 text-blue-400" />
              </div>
              {portfolio && (
                <p className={`text-sm mt-2 ${portfolio.totalPnL >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                  {formatPercent(portfolio.totalPnLPercent)} ({formatCurrency(portfolio.totalPnL)})
                </p>
              )}
            </CardContent>
          </Card>

          <Card className="bg-[#1e293b] border-[#334155]">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-400">Daily P&L</p>
                  <p className={`text-2xl font-bold ${portfolio && portfolio.dailyPnL >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                    {portfolio ? formatCurrency(portfolio.dailyPnL) : '-'}
                  </p>
                </div>
                <Activity className="w-8 h-8 text-cyan-400" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-[#1e293b] border-[#334155]">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-400">Active Signals</p>
                  <p className="text-2xl font-bold text-white">{signals.length}</p>
                </div>
                <BarChart3 className="w-8 h-8 text-purple-400" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-[#1e293b] border-[#334155]">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-400">Risk Level</p>
                  <p className={`text-2xl font-bold ${
                    riskMetrics && riskMetrics.currentDrawdown > 10 ? 'text-red-400' : 
                    riskMetrics && riskMetrics.currentDrawdown > 5 ? 'text-yellow-400' : 'text-green-400'
                  }`}>
                    {riskMetrics ? `${riskMetrics.currentDrawdown.toFixed(1)}%` : '-'}
                  </p>
                </div>
                <Shield className="w-8 h-8 text-orange-400" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <TabsList className="bg-[#1e293b] border border-[#334155]">
            <TabsTrigger value="overview" className="data-[state=active]:bg-[#334155]">
              Overview
            </TabsTrigger>
            <TabsTrigger value="portfolio" className="data-[state=active]:bg-[#334155]">
              Portfolio
            </TabsTrigger>
            <TabsTrigger value="signals" className="data-[state=active]:bg-[#334155]">
              Signals
            </TabsTrigger>
            <TabsTrigger value="risk" className="data-[state=active]:bg-[#334155]">
              Risk
            </TabsTrigger>
            <TabsTrigger value="alerts" className="data-[state=active]:bg-[#334155]">
              Alerts
              {alerts.length > 0 && (
                <span className="ml-2 px-2 py-0.5 text-xs bg-red-500 rounded-full">
                  {alerts.length}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="market" className="data-[state=active]:bg-[#334155]">
              Market Data
            </TabsTrigger>
            <TabsTrigger value="backtest" className="data-[state=active]:bg-[#334155]">
              Backtest
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <PortfolioPanel portfolio={portfolio} onClosePosition={closePosition} />
              <div className="bg-[#141e27] p-4 rounded-lg">
                <h3 className="text-sm font-medium text-[#92adc9] mb-3">取引シグナル</h3>
                <div className="space-y-2">
                  {signals && signals.length > 0 ? (
                    signals.slice(0, 5).map((sig) => (
                      <div key={sig.symbol} className="flex justify-between items-center p-2 bg-[#192633] rounded">
                        <div>
                          <span className="font-bold text-white">{sig.symbol}</span>
                          <span className={cn(
                            "ml-2 text-xs px-2 py-0.5 rounded",
                            sig.direction === 'BUY' ? "bg-green-500/20 text-green-400" : 
                            sig.direction === 'SELL' ? "bg-red-500/20 text-red-400" : "bg-gray-500/20 text-gray-400"
                          )}>
                            {sig.direction}
                          </span>
                        </div>
                        <span className="text-xs text-[#92adc9">{sig.confidence}%</span>
                      </div>
                    ))
                  ) : (
                    <p className="text-xs text-[#92adc9] text-center py-4">シグナルなし</p>
                  )}
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="portfolio">
            <PortfolioPanel 
              portfolio={portfolio} 
              onClosePosition={closePosition}
              detailed 
            />
          </TabsContent>

          <TabsContent value="signals">
            <div className="bg-[#141e27] p-4 rounded-lg">
              <h3 className="text-sm font-medium text-[#92adc9] mb-3">シグナル詳細</h3>
              <div className="space-y-4">
                {signals && signals.length > 0 ? (
                  signals.map((sig) => (
                    <div key={sig.symbol} className="p-4 bg-[#192633] rounded-lg">
                      <div className="flex justify-between items-center mb-2">
                        <span className="font-bold text-white text-lg">{sig.symbol}</span>
                        <span className={cn(
                          "text-xs px-2 py-1 rounded",
                          sig.direction === 'BUY' ? "bg-green-500/20 text-green-400" : 
                          sig.direction === 'SELL' ? "bg-red-500/20 text-red-400" : "bg-gray-500/20 text-gray-400"
                        )}>
                          {sig.direction}
                        </span>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div className="flex justify-between">
                          <span className="text-[#92adc9]">信頼度:</span>
                          <span className="text-white">{sig.confidence}%</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-[#92adc9]">エントリー:</span>
                          <span className="text-white">${sig.entryPrice.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-[#92adc9]">利益目標:</span>
                          <span className="text-white">${sig.targetPrice.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-[#92adc9]">損切り:</span>
                          <span className="text-white">${sig.stopLoss.toFixed(2)}</span>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-[#92adc9] text-center py-4">シグナルなし</p>
                )}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="risk">
            <RiskPanel riskMetrics={riskMetrics} />
          </TabsContent>

          <TabsContent value="alerts">
            <AlertPanel symbol={selectedSymbol} />
          </TabsContent>

          <TabsContent value="market">
            <MarketDataPanel 
              symbols={['BTCUSD', 'ETHUSD', 'SOLUSD', 'ADAUSD']}
              selectedSymbol={selectedSymbol}
              onSelectSymbol={setSelectedSymbol}
            />
          </TabsContent>

          <TabsContent value="backtest">
            <BacktestPanel />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}

export default UnifiedTradingDashboard;
