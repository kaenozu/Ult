/**
 * PortfolioPanel.tsx
 * 
 * ポートフォリオ表示コンポーネント
 */

'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/app/components/ui/Card';
import { Button } from '@/app/components/ui/Button';
import { PaperPortfolio, PaperPosition } from '@/app/lib/paperTrading/PaperTradingEnvironment';
import { TrendingUp, TrendingDown, X } from 'lucide-react';

interface PortfolioPanelProps {
  portfolio: PaperPortfolio | null;
  onClosePosition?: (symbol: string) => Promise<void>;
  detailed?: boolean;
}

export const PortfolioPanel = React.memo(function PortfolioPanel({ portfolio, onClosePosition, detailed = false }: PortfolioPanelProps) {
  if (!portfolio) {
    return (
      <Card className="bg-[#1e293b] border-[#334155]">
        <CardContent className="p-6">
          <p className="text-gray-400">No portfolio data available</p>
        </CardContent>
      </Card>
    );
  }

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

  return (
    <Card className="bg-[#1e293b] border-[#334155]">
      <CardHeader>
        <CardTitle className="text-white flex items-center gap-2">
          Portfolio
          <span className={`text-sm ${portfolio.totalPnL >= 0 ? 'text-green-400' : 'text-red-400'}`}>
            {formatPercent(portfolio.totalPnLPercent)}
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {/* Summary */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div>
            <p className="text-sm text-gray-400">Total Value</p>
            <p className="text-xl font-bold text-white">{formatCurrency(portfolio.totalValue)}</p>
          </div>
          <div>
            <p className="text-sm text-gray-400">Cash</p>
            <p className="text-xl font-bold text-white">{formatCurrency(portfolio.cash)}</p>
          </div>
          <div>
            <p className="text-sm text-gray-400">Total P&L</p>
            <p className={`text-xl font-bold ${portfolio.totalPnL >= 0 ? 'text-green-400' : 'text-red-400'}`}>
              {formatCurrency(portfolio.totalPnL)}
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-400">Daily P&L</p>
            <p className={`text-xl font-bold ${portfolio.dailyPnL >= 0 ? 'text-green-400' : 'text-red-400'}`}>
              {formatCurrency(portfolio.dailyPnL)}
            </p>
          </div>
        </div>

        {/* Positions */}
        {detailed && portfolio.positions.length > 0 && (
          <div className="space-y-3">
            <h4 className="text-sm font-medium text-gray-300">Positions</h4>
            {portfolio.positions.map((position) => (
              <PositionRow
                key={position.id}
                position={position}
                onClose={onClosePosition}
              />
            ))}
          </div>
        )}

        {!detailed && portfolio.positions.length > 0 && (
          <div className="mt-4">
            <p className="text-sm text-gray-400">
              {portfolio.positions.length} active position(s)
            </p>
          </div>
        )}

        {portfolio.positions.length === 0 && (
          <p className="text-gray-400 text-sm">No active positions</p>
        )}
      </CardContent>
    </Card>
  );
});

function PositionRow({
  position,
  onClose,
}: {
  position: PaperPosition;
  onClose?: (symbol: string) => Promise<void>;
}) {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
    }).format(value);
  };

  return (
    <div className="flex items-center justify-between p-3 bg-[#0f172a] rounded-lg">
      <div className="flex items-center gap-3">
        <div className={`p-2 rounded ${position.side === 'LONG' ? 'bg-green-500/20' : 'bg-red-500/20'}`}>
          {position.side === 'LONG' ? (
            <TrendingUp className="w-4 h-4 text-green-400" />
          ) : (
            <TrendingDown className="w-4 h-4 text-red-400" />
          )}
        </div>
        <div>
          <p className="font-medium text-white">{position.symbol}</p>
          <p className="text-xs text-gray-400">
            {position.quantity} @ {formatCurrency(position.entryPrice)}
          </p>
        </div>
      </div>
      <div className="text-right">
        <p className={`font-medium ${position.unrealizedPnL >= 0 ? 'text-green-400' : 'text-red-400'}`}>
          {formatCurrency(position.unrealizedPnL)}
        </p>
        <p className="text-xs text-gray-400">
          {position.unrealizedPnLPercent >= 0 ? '+' : ''}
          {position.unrealizedPnLPercent.toFixed(2)}%
        </p>
      </div>
      {onClose && (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onClose(position.symbol)}
          className="ml-2 text-red-400 hover:text-red-300 hover:bg-red-500/10"
        >
          <X className="w-4 h-4" />
        </Button>
      )}
    </div>
  );
}

export default PortfolioPanel;
