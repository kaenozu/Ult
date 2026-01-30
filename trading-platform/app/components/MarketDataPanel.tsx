/**
 * MarketDataPanel.tsx
 * 
 * マーケットデータ表示パネル
 */

'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/app/components/ui/Card';

interface MarketDataPanelProps {
  symbols: string[];
  selectedSymbol: string;
  onSelectSymbol: (symbol: string) => void;
}

export function MarketDataPanel({ symbols, selectedSymbol, onSelectSymbol }: MarketDataPanelProps) {
  // Simulated market data for display
  const marketData = symbols.map(symbol => ({
    symbol,
    price: Math.random() * 50000 + 10000,
    change24h: (Math.random() - 0.5) * 10,
    volume24h: Math.random() * 1000000000,
    high24h: 55000,
    low24h: 45000,
  }));

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
    }).format(value);
  };

  const formatPercent = (value: number) => {
    return `${value >= 0 ? '+' : ''}${value.toFixed(2)}%`;
  };

  const formatVolume = (value: number) => {
    if (value >= 1e9) return `${(value / 1e9).toFixed(2)}B`;
    if (value >= 1e6) return `${(value / 1e6).toFixed(2)}M`;
    if (value >= 1e3) return `${(value / 1e3).toFixed(2)}K`;
    return value.toFixed(2);
  };

  return (
    <Card className="bg-[#1e293b] border-[#334155]">
      <CardHeader>
        <CardTitle className="text-white">Market Data</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {marketData.map((data) => (
            <div
              key={data.symbol}
              onClick={() => onSelectSymbol(data.symbol)}
              className={`p-4 rounded-lg cursor-pointer transition-colors ${
                selectedSymbol === data.symbol
                  ? 'bg-blue-600/20 border border-blue-500/50'
                  : 'bg-[#0f172a] hover:bg-[#1e293b]'
              }`}
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-bold text-white">{data.symbol}</p>
                  <p className="text-xs text-gray-400">
                    Vol: {formatVolume(data.volume24h)}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-medium text-white">{formatCurrency(data.price)}</p>
                  <p className={`text-sm ${data.change24h >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                    {formatPercent(data.change24h)}
                  </p>
                </div>
              </div>
              <div className="mt-2 flex justify-between text-xs text-gray-500">
                <span>H: {formatCurrency(data.high24h)}</span>
                <span>L: {formatCurrency(data.low24h)}</span>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

export default MarketDataPanel;
