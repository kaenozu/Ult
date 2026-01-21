import { useQuery } from '@tanstack/react-query';
import { getMarketData, getSignal } from '@/components/shared/utils/api';
import { Position } from '@/types';

export function usePositionRow(position: Position) {
  const { ticker, quantity, avg_price } = position;

  // Fetch live market data for PnL
  const { data: market, isLoading: isMarketLoading } = useQuery({
    queryKey: ['market', ticker],
    queryFn: () => getMarketData(ticker),
    refetchInterval: 30000, // Reduced from 10s to 30s
  });

  // Fetch signal for "Sell Alert"
  const { data: signal, isLoading: isSignalLoading } = useQuery({
    queryKey: ['signal', ticker],
    queryFn: () => getSignal(ticker),
    refetchInterval: 300000, // Reduced from 60s to 5min
  });

  const currentPrice = market?.price || 0;
  const pnl = (currentPrice - avg_price) * quantity;
  const pnlPercent =
    avg_price > 0 ? ((currentPrice - avg_price) / avg_price) * 100 : 0;
  const isProfit = pnl >= 0;

  // Alert logic: High profit (>5%) or AI Sell Signal
  const isSellSignal = signal?.signal === 'sell' || signal?.signal === -1;
  const isHighProfit = pnlPercent >= 5.0;
  const showAlert = isSellSignal || isHighProfit;

  return {
    market,
    currentPrice,
    pnl,
    pnlPercent,
    isProfit,
    showAlert,
    isLoading: isMarketLoading || isSignalLoading,
  };
}
