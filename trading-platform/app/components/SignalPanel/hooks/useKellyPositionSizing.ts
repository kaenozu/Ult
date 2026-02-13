import { useMemo } from 'react';
import { Signal, Stock } from '@/app/types';
import { usePortfolioStore } from '@/app/store/portfolioStore';
import { kellyCalculator } from '@/app/lib/risk/KellyCalculator';
import { calculateTradingStats } from '@/app/lib/utils/trading-stats';

export function useKellyPositionSizing(stock: Stock, displaySignal: Signal | null) {
  const portfolio = usePortfolioStore((state) => state.portfolio);

  const kellyRecommendation = useMemo(() => {
    if (!displaySignal || displaySignal.type === 'HOLD') {
      return null;
    }
    
    try {
      const stats = calculateTradingStats(portfolio.orders);
      // 最低10トレード以上必要
      if (stats.totalTrades < 10) {
        return null;
      }
      
      const portfolioValue = portfolio.cash + portfolio.totalValue;
      return kellyCalculator.getRecommendation(
        { winRate: stats.winRate, avgWin: stats.avgWin, avgLoss: stats.avgLoss, portfolioValue },
        stock.symbol,
        displaySignal?.atr,
        portfolio.positions.map(p => ({ symbol: p.symbol, value: p.currentPrice * p.quantity }))
      );
    } catch (error) {
      console.error('Kelly calculation error:', error);
      return null;
    }
  }, [displaySignal, stock.symbol, portfolio]);

  return kellyRecommendation;
}
