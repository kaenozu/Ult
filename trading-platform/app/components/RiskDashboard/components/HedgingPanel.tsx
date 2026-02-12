import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/app/components/ui/Card';
import { formatCurrency } from '@/app/lib/utils';
import { Shield } from 'lucide-react';
import {
  createTailRiskHedging,
  HedgeRecommendation,
} from '@/app/lib/risk/TailRiskHedging';

interface HedgingPanelProps {
  hedgeManager: ReturnType<typeof createTailRiskHedging>;
}

export function HedgingPanel({ hedgeManager }: HedgingPanelProps) {
  const recommendations = useMemo(() => {
    return hedgeManager.generateHedgeRecommendations();
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
                    <h4 className="text-white font-medium">
                      {rec.strategy.type === 'put_option' ? 'Put Option Hedge' :
                       rec.strategy.type === 'vix_futures' ? 'VIX Futures Hedge' :
                       rec.strategy.type === 'inverse_etf' ? 'Inverse ETF Hedge' :
                       rec.strategy.type}
                    </h4>
                    <p className="text-sm text-gray-400 mt-1">
                      {rec.strategy.type === 'put_option' ? `Purchase put options on SPY to protect against market declines. Cost: ${formatCurrency(rec.strategy.cost)}.` :
                       rec.strategy.type === 'vix_futures' ? `Hold VIX futures to gain from volatility spikes. Cost: ${formatCurrency(rec.strategy.cost)}.` :
                       rec.strategy.type === 'inverse_etf' ? `Hold inverse ETF (SH) for daily inverse correlation. Cost: ${formatCurrency(rec.strategy.cost)}.` :
                       `Hedge strategy with expected protection of ${rec.strategy.expectedProtection.toFixed(1)}%`}
                    </p>
                  </div>
                  <span className={`px-2 py-1 rounded text-xs font-medium ${
                    rec.implementationPriority === 'high' ? 'bg-green-500/20 text-green-400' :
                    rec.implementationPriority === 'medium' ? 'bg-blue-500/20 text-blue-400' :
                    'bg-gray-500/20 text-gray-400'
                  }`}>
                    {rec.implementationPriority.toUpperCase()}
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
                    <p className="text-lg font-semibold text-white">{rec.effectiveness.toFixed(1)}%</p>
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
