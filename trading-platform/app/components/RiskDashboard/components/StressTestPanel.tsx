import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/app/components/ui/Card';
import { PortfolioRiskReport } from '@/app/lib/risk/PortfolioRiskMonitor';
import { formatCurrency } from '@/app/lib/utils';
import { Activity } from 'lucide-react';

interface StressTestPanelProps {
  riskReport: PortfolioRiskReport;
}

export function StressTestPanel({ riskReport }: StressTestPanelProps) {
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
