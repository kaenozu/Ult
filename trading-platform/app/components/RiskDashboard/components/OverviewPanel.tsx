import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/app/components/ui/Card';
import { PortfolioRiskReport } from '@/app/lib/risk/PortfolioRiskMonitor';
import { formatCurrency } from '@/app/lib/utils';
import {
  AlertTriangle,
  PieChart,
  DollarSign,
  BarChart3,
  Activity,
  ChevronDown,
  ChevronUp,
  XCircle,
  CheckCircle,
} from 'lucide-react';

interface OverviewPanelProps {
  riskReport: PortfolioRiskReport;
  expandedSections: Set<string>;
  toggleSection: (section: string) => void;
}

export function OverviewPanel({ riskReport, expandedSections, toggleSection }: OverviewPanelProps) {
  return (
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
  );
}

// Internal components to keep it clean
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
