import { useMemo } from 'react';
import { Signal } from '@/app/types';
import { useTradingStore } from '@/app/store/tradingStore';

export function useKellyPositionSizing(stock: any, displaySignal: Signal | null) {
  const calculatePositionSize = useTradingStore((state) => state.calculatePositionSize);
  const getPortfolioStats = useTradingStore((state) => state.getPortfolioStats);

  const kellyRecommendation = useMemo(() => {
    if (!displaySignal || displaySignal.type === 'HOLD') {
      return null;
    }
    
    try {
      const stats = getPortfolioStats();
      // 最低10トレード以上必要
      if (stats.totalTrades < 10) {
        return null;
      }
      
      return calculatePositionSize(stock.symbol, displaySignal);
    } catch (error) {
      console.error('Kelly calculation error:', error);
      return null;
    }
  }, [displaySignal, stock.symbol, calculatePositionSize, getPortfolioStats]);

  return kellyRecommendation;
}