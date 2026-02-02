/**
 * RiskDashboard.tsx
 *
 * TRADING-028: 高度なリスク管理ダッシュボード
 * 動的ポジションサイジング、ポートフォリオリスク監視、テイルリスクヘッジの
 * 包括的な可視化と管理を提供
 */

'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/app/components/ui/Card';
import { Portfolio } from '@/app/types';
import {
  Shield,
  AlertTriangle,
  TrendingDown,
  Activity,
  PieChart,
  Target,
  DollarSign,
  BarChart3,
  Settings,
  ChevronDown,
  ChevronUp,
  Info,
  CheckCircle,
  XCircle,
} from 'lucide-react';
import {
  createPortfolioRiskMonitor,
  PortfolioRiskReport,
} from '@/app/lib/risk/PortfolioRiskMonitor';
import {
  createDynamicPositionSizer,
  PositionSizingRequest,
  PositionSizingResponse,
} from '@/app/lib/risk/DynamicPositionSizer';
import {
  createTailRiskHedging,
  HedgeRecommendation,
} from '@/app/lib/risk/TailRiskHedging';

interface RiskDashboardProps {
  portfolio: Portfolio;
  updateInterval?: number; // ms
}

export function RiskDashboard({ portfolio, updateInterval = 10000 }: RiskDashboardProps) {
  const [riskReport, setRiskReport] = useState<PortfolioRiskReport | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'position_sizing' | 'hedging' | 'stress_test'>('overview');
  const [isLoading, setIsLoading] = useState(true);
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['var', 'warnings']));

  // リスクモニターとヘッジマネージャーを初期化
  const riskMonitor = useMemo(() => createPortfolioRiskMonitor(), []);
  const positionSizer = useMemo(() => createDynamicPositionSizer(portfolio), [portfolio]);
  const hedgeManager = useMemo(() => createTailRiskHedging(portfolio), [portfolio]);

  // リスクレポートを生成
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

  // セクションの展開/折りたたみを切り替え
  const toggleSection = (section: string) => {
    setExpandedSections(prev => {
      const newSet = new Set(prev);
      if (newSet.has(section)) {
        newSet.delete(section);
      } else {
        newSet.add(section);
      }
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

  if (!riskReport) {
    return (
      <Card className="bg-[#1e293b] border-[#334155]">
        <CardContent className="p-6">
          <p className="text-gray-400">Unable to load risk data</p>
        </CardContent>
      </Card>
    );
  }

  const riskLevelColor = getRiskLevelColor(riskReport.riskLevel);
  const riskLevelBgColor = getRiskLevelBgColor(riskReport.riskLevel);

  return (
    <div className="space-y-4">
      {/* Header */}
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
          {/* Tab Navigation */}
          <div className="flex gap-2 mb-4">
            <TabButton
              active={activeTab === 'overview'}
              onClick={() => setActiveTab('overview')}
              icon={<BarChart3 className="w-4 h-4" />}
              label="Overview"
            />
            <TabButton
              active={activeTab === 'position_sizing'}
              onClick={() => setActiveTab('position_sizing')}
              icon={<Target className="w-4 h-4" />}
              label="Position Sizing"
            />
            <TabButton
              active={activeTab === 'hedging'}
              onClick={() => setActiveTab('hedging')}
              icon={<Shield className="w-4 h-4" />}
              label="Hedging"
            />
            <TabButton
              active={activeTab === 'stress_test'}
              onClick={() => setActiveTab('stress_test')}
              icon={<Activity className="w-4 h-4" />}
              label="Stress Test"
            />
          </div>
        </CardContent>
      </Card>

      {/* Overview Tab */}
      {activeTab === 'overview' && (
        <>
          {/* Warnings and Recommendations */}
          {(riskReport.warnings.length > 0 || riskReport.recommendations.length > 0) && (
            <Card className="bg-[#1e293b] border-[#334155]">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-yellow-400" />
                  Alerts & Recommendations
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {riskReport.warnings.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="text-sm font-medium text-yellow-400">Warnings</h4>
                    {riskReport.warnings.map((warning, idx) => (
                      <div key={idx} className="flex items-start gap-2 p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
                        <XCircle className="w-4 h-4 text-yellow-400 mt-0.5 flex-shrink-0" />
                        <span className="text-sm text-gray-300">{warning}</span>
                      </div>
                    ))}
                  </div>
                )}
                {riskReport.recommendations.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="text-sm font-medium text-blue-400">Recommendations</h4>
                    {riskReport.recommendations.map((rec, idx) => (
                      <div key={idx} className="flex items-start gap-2 p-3 bg-blue-500/10 border border-blue-500/30 rounded-lg">
                        <CheckCircle className="w-4 h-4 text-blue-400 mt-0.5 flex-shrink-0" />
                        <span className="text-sm text-gray-300">{rec}</span>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* VaR Metrics */}
          <CollapsibleSection
            title="Value at Risk (VaR)"
            icon={<DollarSign className="w-4 h-4" />}
            expanded={expandedSections.has('var')}
            onToggle={() => toggleSection('var')}
          >
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <VaRMetric
                label="Daily VaR (95%)"
                value={formatCurrency(riskReport.dailyVar.var95)}
                description="Expected maximum daily loss at 95% confidence"
              />
              <VaRMetric
                label="Daily CVaR (95%)"
                value={formatCurrency(riskReport.dailyVar.cvar95)}
                description="Average loss in worst 5% of cases"
              />
              <VaRMetric
                label="Weekly VaR (95%)"
                value={formatCurrency(riskReport.weeklyVar.var95)}
                description="Expected maximum weekly loss at 95% confidence"
              />
              <VaRMetric
                label="Method"
                value={riskReport.dailyVar.method.toUpperCase()}
                description={riskReport.dailyVar.timeHorizon === 1 ? '1-day horizon' : `${riskReport.dailyVar.timeHorizon}-day horizon`}
              />
            </div>
          </CollapsibleSection>

          {/* Sector Exposure */}
          <CollapsibleSection
            title="Sector Exposure"
            icon={<PieChart className="w-4 h-4" />}
            expanded={expandedSections.has('sector')}
            onToggle={() => toggleSection('sector')}
          >
            <div className="space-y-3">
              {riskReport.sectorExposures.map((sector) => (
                <div key={sector.sector} className="p-3 bg-[#0f172a] rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-white">{sector.sector}</span>
                    <span className={`text-sm font-medium ${
                      sector.percentOfPortfolio > 30 ? 'text-red-400' :
                      sector.percentOfPortfolio > 20 ? 'text-yellow-400' :
                      'text-green-400'
                    }`}>
                      {sector.percentOfPortfolio.toFixed(1)}%
                    </span>
                  </div>
                  <div className="w-full bg-gray-700 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full ${
                        sector.percentOfPortfolio > 30 ? 'bg-red-500' :
                        sector.percentOfPortfolio > 20 ? 'bg-yellow-500' :
                        'bg-green-500'
                      }`}
                      style={{ width: `${Math.min(100, sector.percentOfPortfolio * 2)}%` }}
                    />
                  </div>
                  <div className="mt-2 text-xs text-gray-400">
                    {sector.positionCount} positions • {formatCurrency(sector.totalValue)}
                  </div>
                </div>
              ))}
              <div className="p-3 bg-[#0f172a] rounded-lg">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-400">Concentration Risk</span>
                  <span className={`text-sm font-medium ${
                    riskReport.concentrationRisk > 0.5 ? 'text-red-400' :
                    riskReport.concentrationRisk > 0.3 ? 'text-yellow-400' :
                    'text-green-400'
                  }`}>
                    {(riskReport.concentrationRisk * 100).toFixed(1)}%
                  </span>
                </div>
              </div>
            </div>
          </CollapsibleSection>

          {/* Correlation Analysis */}
          <CollapsibleSection
            title="Correlation Analysis"
            icon={<Activity className="w-4 h-4" />}
            expanded={expandedSections.has('correlation')}
            onToggle={() => toggleSection('correlation')}
          >
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              <div className="p-3 bg-[#0f172a] rounded-lg">
                <p className="text-xs text-gray-400">Average Correlation</p>
                <p className={`text-lg font-medium ${
                  riskReport.avgCorrelation > 0.7 ? 'text-red-400' :
                  riskReport.avgCorrelation > 0.5 ? 'text-yellow-400' :
                  'text-green-400'
                }`}>
                  {riskReport.avgCorrelation.toFixed(3)}
                </p>
              </div>
              <div className="p-3 bg-[#0f172a] rounded-lg">
                <p className="text-xs text-gray-400">Max Correlation</p>
                <p className={`text-lg font-medium ${
                  riskReport.maxCorrelation > 0.8 ? 'text-red-400' :
                  riskReport.maxCorrelation > 0.6 ? 'text-yellow-400' :
                  'text-green-400'
                }`}>
                  {riskReport.maxCorrelation.toFixed(3)}
                </p>
              </div>
              <div className="p-3 bg-[#0f172a] rounded-lg">
                <p className="text-xs text-gray-400">Portfolio Beta</p>
                <p className="text-lg font-medium text-white">
                  {riskReport.portfolioBeta.toFixed(2)}
                </p>
              </div>
            </div>
            {riskReport.correlationPairs.length > 0 && (
              <div className="space-y-2">
                {riskReport.correlationPairs.slice(0, 5).map((pair, idx) => (
                  <div key={idx} className="flex items-center justify-between p-2 bg-[#0f172a] rounded">
                    <span className="text-sm text-gray-300">
                      {pair.symbol1} - {pair.symbol2}
                    </span>
                    <span className={`text-sm font-medium ${
                      Math.abs(pair.correlation) > 0.8 ? 'text-red-400' :
                      Math.abs(pair.correlation) > 0.6 ? 'text-yellow-400' :
                      'text-green-400'
                    }`}>
                      {pair.correlation.toFixed(3)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CollapsibleSection>
        </>
      )}

      {/* Position Sizing Tab */}
      {activeTab === 'position_sizing' && (
        <PositionSizingPanel portfolio={portfolio} positionSizer={positionSizer} />
      )}

      {/* Hedging Tab */}
      {activeTab === 'hedging' && (
        <HedgingPanel portfolio={portfolio} hedgeManager={hedgeManager} />
      )}

      {/* Stress Test Tab */}
      {activeTab === 'stress_test' && (
        <StressTestPanel riskReport={riskReport} />
      )}
    </div>
  );
}

// Tab Button Component
function TabButton({
  active,
  onClick,
  icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
        active
          ? 'bg-blue-500/20 text-blue-400 border border-blue-500/50'
          : 'bg-gray-700/50 text-gray-400 hover:bg-gray-700'
      }`}
    >
      {icon}
      <span className="text-sm font-medium">{label}</span>
    </button>
  );
}

// Collapsible Section Component
function CollapsibleSection({
  title,
  icon,
  expanded,
  onToggle,
  children,
}: {
  title: string;
  icon: React.ReactNode;
  expanded: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  return (
    <Card className="bg-[#1e293b] border-[#334155]">
      <CardHeader
        className="cursor-pointer hover:bg-[#0f172a]/50 transition-colors"
        onClick={onToggle}
      >
        <CardTitle className="text-white flex items-center justify-between">
          <div className="flex items-center gap-2">
            {icon}
            <span className="text-sm">{title}</span>
          </div>
          {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </CardTitle>
      </CardHeader>
      {expanded && <CardContent>{children}</CardContent>}
    </Card>
  );
}

// VaR Metric Component
function VaRMetric({
  label,
  value,
  description,
}: {
  label: string;
  value: string;
  description: string;
}) {
  return (
    <div className="p-3 bg-[#0f172a] rounded-lg">
      <p className="text-xs text-gray-400 mb-1">{label}</p>
      <p className="text-lg font-semibold text-white mb-1">{value}</p>
      <p className="text-xs text-gray-500">{description}</p>
    </div>
  );
}

// Position Sizing Panel Component
function PositionSizingPanel({
  portfolio,
  positionSizer,
}: {
  portfolio: Portfolio;
  positionSizer: ReturnType<typeof createDynamicPositionSizer>;
}) {
  const [symbol, setSymbol] = useState('');
  const [entryPrice, setEntryPrice] = useState('');
  const [stopLoss, setStopLoss] = useState('');
  const [confidence, setConfidence] = useState(75);
  const [volatility, setVolatility] = useState(20);
  const [method, setMethod] = useState<'volatility' | 'kelly' | 'risk_parity' | 'fixed'>('volatility');
  const [sizingResult, setSizingResult] = useState<PositionSizingResponse | null>(null);

  const calculateSizing = () => {
    if (!symbol || !entryPrice) {
      return;
    }

    const request: PositionSizingRequest = {
      symbol,
      entryPrice: parseFloat(entryPrice),
      stopLoss: stopLoss ? parseFloat(stopLoss) : undefined,
      confidence,
      volatility: volatility / 100,
      method,
    };

    const result = positionSizer.calculatePositionSize(request);
    setSizingResult(result);
  };

  return (
    <div className="space-y-4">
      <Card className="bg-[#1e293b] border-[#334155]">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Target className="w-5 h-5 text-blue-400" />
            Dynamic Position Sizing
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-gray-400 mb-1">Symbol</label>
              <input
                type="text"
                value={symbol}
                onChange={(e) => setSymbol(e.target.value.toUpperCase())}
                className="w-full px-3 py-2 bg-[#0f172a] border border-[#334155] rounded-lg text-white text-sm"
                placeholder="AAPL"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">Entry Price</label>
              <input
                type="number"
                value={entryPrice}
                onChange={(e) => setEntryPrice(e.target.value)}
                className="w-full px-3 py-2 bg-[#0f172a] border border-[#334155] rounded-lg text-white text-sm"
                placeholder="150.00"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">Stop Loss (optional)</label>
              <input
                type="number"
                value={stopLoss}
                onChange={(e) => setStopLoss(e.target.value)}
                className="w-full px-3 py-2 bg-[#0f172a] border border-[#334155] rounded-lg text-white text-sm"
                placeholder="145.00"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">Volatility (%)</label>
              <input
                type="number"
                value={volatility}
                onChange={(e) => setVolatility(parseFloat(e.target.value) || 20)}
                className="w-full px-3 py-2 bg-[#0f172a] border border-[#334155] rounded-lg text-white text-sm"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm text-gray-400 mb-1">Confidence: {confidence}%</label>
            <input
              type="range"
              min="0"
              max="100"
              value={confidence}
              onChange={(e) => setConfidence(parseInt(e.target.value))}
              className="w-full"
            />
          </div>

          <div>
            <label className="block text-sm text-gray-400 mb-2">Sizing Method</label>
            <div className="grid grid-cols-2 gap-2">
              {['volatility', 'kelly', 'risk_parity', 'fixed'].map((m) => (
                <button
                  key={m}
                  onClick={() => setMethod(m as any)}
                  className={`px-3 py-2 rounded-lg text-sm transition-colors ${
                    method === m
                      ? 'bg-blue-500/20 text-blue-400 border border-blue-500/50'
                      : 'bg-gray-700/50 text-gray-400'
                  }`}
                >
                  {m.replace('_', ' ').toUpperCase()}
                </button>
              ))}
            </div>
          </div>

          <button
            onClick={calculateSizing}
            className="w-full py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors"
          >
            Calculate Position Size
          </button>

          {sizingResult && (
            <div className="mt-4 p-4 bg-[#0f172a] rounded-lg space-y-3">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-gray-400">Recommended Shares</p>
                  <p className="text-xl font-semibold text-white">{sizingResult.recommendedShares}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-400">Position Value</p>
                  <p className="text-xl font-semibold text-white">{formatCurrency(sizingResult.positionValue)}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-400">Risk Amount</p>
                  <p className="text-xl font-semibold text-yellow-400">{formatCurrency(sizingResult.riskAmount)}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-400">Risk %</p>
                  <p className="text-xl font-semibold text-white">{sizingResult.riskPercent.toFixed(2)}%</p>
                </div>
              </div>

              {sizingResult.reasoning.length > 0 && (
                <div className="mt-3">
                  <p className="text-xs text-gray-400 mb-2">Reasoning:</p>
                  <ul className="space-y-1">
                    {sizingResult.reasoning.map((reason, idx) => (
                      <li key={idx} className="text-xs text-gray-300 flex items-start gap-2">
                        <span className="text-blue-400">•</span>
                        {reason}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {sizingResult.warnings.length > 0 && (
                <div className="mt-3 p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
                  <p className="text-xs text-yellow-400 mb-1">Warnings:</p>
                  <ul className="space-y-1">
                    {sizingResult.warnings.map((warning, idx) => (
                      <li key={idx} className="text-xs text-gray-300 flex items-start gap-2">
                        <AlertTriangle className="w-3 h-3 text-yellow-400 mt-0.5" />
                        {warning}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// Hedging Panel Component
function HedgingPanel({
  portfolio,
  hedgeManager,
}: {
  portfolio: Portfolio;
  hedgeManager: ReturnType<typeof createTailRiskHedging>;
}) {
  const [recommendations, setRecommendations] = useState<HedgeRecommendation[]>([]);

  useEffect(() => {
    const recs = hedgeManager.generateHedgeRecommendations();
    setRecommendations(recs);
  }, [hedgeManager]);

  return (
    <div className="space-y-4">
      <Card className="bg-[#1e293b] border-[#334155]">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Shield className="w-5 h-5 text-blue-400" />
            Tail Risk Hedging Strategies
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {recommendations.map((rec, idx) => (
              <div key={idx} className="p-4 bg-[#0f172a] rounded-lg space-y-3">
                <div className="flex items-start justify-between">
                  <div>
                    <h4 className="text-white font-medium">{rec.strategy.name}</h4>
                    <p className="text-sm text-gray-400 mt-1">{rec.strategy.description}</p>
                  </div>
                  <span className={`px-2 py-1 rounded text-xs font-medium ${
                    rec.strategy.recommendation === 'highly_recommended' ? 'bg-green-500/20 text-green-400' :
                    rec.strategy.recommendation === 'recommended' ? 'bg-blue-500/20 text-blue-400' :
                    'bg-gray-500/20 text-gray-400'
                  }`}>
                    {rec.strategy.recommendation.replace('_', ' ').toUpperCase()}
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <p className="text-xs text-gray-400">Risk Reduction</p>
                    <p className="text-lg font-semibold text-green-400">{rec.riskReduction.toFixed(1)}%</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400">Cost</p>
                    <p className="text-lg font-semibold text-white">{formatCurrency(rec.strategy.cost)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400">Effectiveness</p>
                    <p className="text-lg font-semibold text-white">{rec.strategy.effectiveness}%</p>
                  </div>
                </div>

                <div>
                  <p className="text-xs text-gray-400 mb-2">Implementation Steps:</p>
                  <ul className="space-y-1">
                    {rec.implementationSteps.map((step, stepIdx) => (
                      <li key={stepIdx} className="text-xs text-gray-300 flex items-start gap-2">
                        <span className="text-blue-400">{stepIdx + 1}.</span>
                        {step}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// Stress Test Panel Component
function StressTestPanel({
  riskReport,
}: {
  riskReport: PortfolioRiskReport;
}) {
  return (
    <div className="space-y-4">
      <Card className="bg-[#1e293b] border-[#334155]">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Activity className="w-5 h-5 text-blue-400" />
            Stress Test Results
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {riskReport.stressTestResults.map((result, idx) => (
              <div key={idx} className="p-4 bg-[#0f172a] rounded-lg space-y-3">
                <div>
                  <h4 className="text-white font-medium">{result.scenario.name}</h4>
                  <p className="text-sm text-gray-400 mt-1">{result.scenario.description}</p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-gray-400">Portfolio Impact</p>
                    <p className={`text-lg font-semibold ${
                      result.portfolioImpactPercent < -20 ? 'text-red-400' :
                      result.portfolioImpactPercent < -10 ? 'text-yellow-400' :
                      'text-green-400'
                    }`}>
                      {result.portfolioImpactPercent.toFixed(2)}%
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400">Worst Case Loss</p>
                    <p className="text-lg font-semibold text-red-400">
                      {formatCurrency(result.worstCaseLoss)}
                    </p>
                  </div>
                </div>

                {result.positionImpacts.length > 0 && (
                  <div>
                    <p className="text-xs text-gray-400 mb-2">Position Impacts:</p>
                    <div className="space-y-1">
                      {result.positionImpacts.slice(0, 5).map((impact, impactIdx) => (
                        <div key={impactIdx} className="flex justify-between text-xs">
                          <span className="text-gray-300">{impact.symbol}</span>
                          <span className={`${
                            impact.impactPercent < -20 ? 'text-red-400' :
                            impact.impactPercent < -10 ? 'text-yellow-400' :
                            'text-green-400'
                          }`}>
                            {impact.impactPercent.toFixed(2)}%
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// Utility Functions
function getRiskLevelColor(level: string): string {
  const colors = {
    low: 'text-green-400',
    medium: 'text-yellow-400',
    high: 'text-orange-400',
    extreme: 'text-red-400',
  };
  return colors[level as keyof typeof colors] || 'text-gray-400';
}

function getRiskLevelBgColor(level: string): string {
  const colors = {
    low: 'bg-green-500/20',
    medium: 'bg-yellow-500/20',
    high: 'bg-orange-500/20',
    extreme: 'bg-red-500/20',
  };
  return colors[level as keyof typeof colors] || 'bg-gray-500/20';
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

export default RiskDashboard;
