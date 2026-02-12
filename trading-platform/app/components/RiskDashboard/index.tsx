'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/app/components/ui/Card';
import { Portfolio } from '@/app/types';
import { Shield, Activity, BarChart3, Target, PieChart } from 'lucide-react';

import { createPortfolioRiskMonitor, PortfolioRiskReport } from '@/app/lib/risk/PortfolioRiskMonitor';
import { createDynamicPositionSizer } from '@/app/lib/risk/DynamicPositionSizer';
import { createTailRiskHedging } from '@/app/lib/risk/TailRiskHedging';

import { OverviewPanel } from './components/OverviewPanel';
import { PositionSizingPanel } from './components/PositionSizingPanel';
import { HedgingPanel } from './components/HedgingPanel';
import { StressTestPanel } from './components/StressTestPanel';

interface RiskDashboardProps {
  portfolio: Portfolio;
  updateInterval?: number;
}

export function RiskDashboard({ portfolio, updateInterval = 10000 }: RiskDashboardProps) {
  const [riskReport, setRiskReport] = useState<PortfolioRiskReport | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'position_sizing' | 'hedging' | 'stress_test'>('overview');
  const [isLoading, setIsLoading] = useState(true);
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['var', 'warnings']));

  const riskMonitor = useMemo(() => createPortfolioRiskMonitor(), []);
  const positionSizer = useMemo(() => createDynamicPositionSizer(portfolio), [portfolio]);
  const hedgeManager = useMemo(() => createTailRiskHedging(portfolio), [portfolio]);

  useEffect(() => {
    const generateReport = () => {
      try {
        const report = riskMonitor.generateRiskReport(portfolio, 95);
        setRiskReport(report);
        setIsLoading(false);
      } catch (error) {
        console.error('Error generating risk report:', error);
        setIsLoading(false);
      }
    };

    generateReport();
    const interval = setInterval(generateReport, updateInterval);
    return () => clearInterval(interval);
  }, [portfolio, riskMonitor, updateInterval]);

  const toggleSection = (section: string) => {
    setExpandedSections(prev => {
      const newSet = new Set(prev);
      if (newSet.has(section)) newSet.delete(section);
      else newSet.add(section);
      return newSet;
    });
  };

  if (isLoading) {
    return (
      <Card className="bg-[#1e293b] border-[#334155]">
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <Activity className="w-6 h-6 text-blue-400 animate-pulse" />
            <span className="ml-2 text-gray-400">Loading risk analysis...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!riskReport) return null;

  const riskLevelColor = getRiskLevelColor(riskReport.riskLevel);
  const riskLevelBgColor = getRiskLevelBgColor(riskReport.riskLevel);

  return (
    <div className="space-y-4">
      <Card className="bg-[#1e293b] border-[#334155]">
        <CardHeader>
          <CardTitle className="text-white flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Shield className={`w-5 h-5 ${riskLevelColor}`} />
              Advanced Risk Management Dashboard
            </div>
            <div className={`px-3 py-1 rounded-full text-sm font-medium ${riskLevelBgColor} ${riskLevelColor}`}>
              {riskReport.riskLevel.toUpperCase()} ({riskReport.overallRiskScore.toFixed(0)}/100)
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2 mb-4">
            <TabButton active={activeTab === 'overview'} onClick={() => setActiveTab('overview')} icon={<BarChart3 className="w-4 h-4" />} label="Overview" />
            <TabButton active={activeTab === 'position_sizing'} onClick={() => setActiveTab('position_sizing')} icon={<Target className="w-4 h-4" />} label="Position Sizing" />
            <TabButton active={activeTab === 'hedging'} onClick={() => setActiveTab('hedging')} icon={<Shield className="w-4 h-4" />} label="Hedging" />
            <TabButton active={activeTab === 'stress_test'} onClick={() => setActiveTab('stress_test')} icon={<Activity className="w-4 h-4" />} label="Stress Test" />
          </div>
        </CardContent>
      </Card>

      {activeTab === 'overview' && <OverviewPanel riskReport={riskReport} expandedSections={expandedSections} toggleSection={toggleSection} />}
      {activeTab === 'position_sizing' && <PositionSizingPanel portfolio={portfolio} positionSizer={positionSizer} />}
      {activeTab === 'hedging' && <HedgingPanel portfolio={portfolio} hedgeManager={hedgeManager} />}
      {activeTab === 'stress_test' && <StressTestPanel riskReport={riskReport} />}
    </div>
  );
}

function TabButton({ active, onClick, icon, label }: { active: boolean; onClick: () => void; icon: React.ReactNode; label: string }) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
        active ? 'bg-blue-500/20 text-blue-400 border border-blue-500/50' : 'bg-gray-700/50 text-gray-400 hover:bg-gray-700'
      }`}
    >
      {icon}
      <span className="text-sm font-medium">{label}</span>
    </button>
  );
}

function getRiskLevelColor(level: string): string {
  const colors = { low: 'text-green-400', medium: 'text-yellow-400', high: 'text-orange-400', extreme: 'text-red-400' };
  return colors[level as keyof typeof colors] || 'text-gray-400';
}

function getRiskLevelBgColor(level: string): string {
  const colors = { low: 'bg-green-500/20', medium: 'bg-yellow-500/20', high: 'bg-orange-500/20', extreme: 'bg-red-500/20' };
  return colors[level as keyof typeof colors] || 'bg-gray-500/20';
}
