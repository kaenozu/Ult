import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/app/components/ui/Card';
import { Portfolio } from '@/app/types';
import { formatCurrency } from '@/app/lib/utils';
import { Target, AlertTriangle } from 'lucide-react';
import {
  createDynamicPositionSizer,
  PositionSizingRequest,
  PositionSizingResponse,
} from '@/app/lib/risk/DynamicPositionSizer';

interface PositionSizingPanelProps {
  portfolio: Portfolio;
  positionSizer: ReturnType<typeof createDynamicPositionSizer>;
}

export function PositionSizingPanel({ portfolio, positionSizer }: PositionSizingPanelProps) {
  const [symbol, setSymbol] = useState('');
  const [entryPrice, setEntryPrice] = useState('');
  const [stopLoss, setStopLoss] = useState('');
  const [confidence, setConfidence] = useState(75);
  const [volatility, setVolatility] = useState(20);
  const [method, setMethod] = useState<'volatility' | 'kelly' | 'risk_parity' | 'fixed'>('volatility');
  const [sizingResult, setSizingResult] = useState<PositionSizingResponse | null>(null);

  const calculateSizing = () => {
    if (!symbol || !entryPrice) return;

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
