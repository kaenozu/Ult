/**
 * MarketDataPanel.tsx
 * 
 * マーケットデータ表示パネル
 */

'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/app/components/ui/Card';
import { formatCurrency as utilsFormatCurrency } from '@/app/lib/utils';

interface MarketData {
  symbol: string;
  price: number;
  change24h: number;
  volume24h: number;
  high24h: number;
  low24h: number;
}

interface MarketDataPanelProps {
  symbols: string[];
  selectedSymbol: string;
  onSelectSymbol: (symbol: string) => void;
}

// Generate deterministic pseudo-random values based on symbol name
// This avoids Math.random() during render while still giving varied values
const generatePseudoRandom = (symbol: string, seed: number): number => {
  const hash = symbol.split('').reduce((acc, char) => {
    return ((acc << 5) - acc) + char.charCodeAt(0) | 0;
  }, seed);
  return (Math.abs(hash) % 10000) / 10000;
};

const generateMarketData = (symbols: string[]): MarketData[] => {
  return symbols.map((symbol) => {
    const priceSeed = generatePseudoRandom(symbol, 1);
    const changeSeed = generatePseudoRandom(symbol, 2);
    const volumeSeed = generatePseudoRandom(symbol, 3);
    
    return {
      symbol,
      price: priceSeed * 50000 + 10000,
      change24h: (changeSeed - 0.5) * 10,
      volume24h: volumeSeed * 1000000000,
      high24h: 55000,
      low24h: 45000,
    };
  });
};

export function MarketDataPanel({ symbols, selectedSymbol, onSelectSymbol }: MarketDataPanelProps) {
  // Use state to hold market data, initialized outside of render
  const [marketData, setMarketData] = useState<MarketData[]>(() => generateMarketData(symbols));
  
  // Update market data when symbols change
  useEffect(() => {
    setMarketData(generateMarketData(symbols));
  }, [symbols]);

  const formatCurrency = (value: number) => {
    return utilsFormatCurrency(value, 'USD');
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
            <button
              key={data.symbol}
              type="button"
              onClick={() => onSelectSymbol(data.symbol)}
              aria-pressed={selectedSymbol === data.symbol}
              className={`w-full text-left p-4 rounded-lg cursor-pointer transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                selectedSymbol === data.symbol
                  ? 'bg-blue-600/20 border border-blue-500/50'
                  : 'bg-[#0f172a] hover:bg-[#1e293b] border border-transparent'
              }`}
            >
              <span className="flex items-center justify-between">
                <span className="block">
                  <span className="font-bold text-white block">{data.symbol}</span>
                  <span className="text-xs text-gray-400 block">
                    Vol: {formatVolume(data.volume24h)}
                  </span>
                </span>
                <span className="block text-right">
                  <span className="font-medium text-white block">{formatCurrency(data.price)}</span>
                  <span className={`text-sm block ${data.change24h >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                    {formatPercent(data.change24h)}
                  </span>
                </span>
              </span>
              <span className="mt-2 flex justify-between text-xs text-gray-500 block">
                <span>H: {formatCurrency(data.high24h)}</span>
                <span>L: {formatCurrency(data.low24h)}</span>
              </span>
            </button>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

export default MarketDataPanel;
