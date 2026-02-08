import { useState, useMemo, useCallback, useEffect, useId } from 'react';
import { Stock, OrderSide, OrderType, OHLCV } from '@/app/types';
import { useTradingStore } from '@/app/store/tradingStore';
import { DynamicRiskConfig } from '@/app/lib/DynamicRiskManagement';

interface UseOrderEntryProps {
  stock: Stock;
  currentPrice: number;
}

export function useOrderEntry({ stock, currentPrice }: UseOrderEntryProps) {
  const { portfolio, placeOrder } = useTradingStore();
  const [side, setSide] = useState<OrderSide>('BUY');
  const [orderType, setOrderType] = useState<OrderType>('MARKET');
  const [quantity, setQuantity] = useState<number>(100);
  const [limitPrice, setLimitPrice] = useState<string>(currentPrice.toString());
  const [isConfirming, setIsConfirming] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  
  // Risk management configuration
  const [riskConfig, setRiskConfig] = useState<DynamicRiskConfig>({
    maxRiskPerTrade: 0.02, // 2%
    minRiskRewardRatio: 2.0,
    volatilityMultiplier: 1.0,
    enableTrailingStop: false,
    enableVolatilityAdjustment: true,
    enableDynamicPositionSizing: true,
    trailingStopATRMultiple: 2.0,
    trailingStopMinPercent: 1.0,
  });
  
  const [showRiskSettings, setShowRiskSettings] = useState(false);

  const ids = {
    orderType: useId(),
    quantity: useId(),
    limitPrice: useId(),
    riskSettings: useId(),
    trailingStop: useId(),
    volAdjust: useId(),
    kelly: useId(),
    modalTitle: useId(),
  };

  const cash = portfolio?.cash || 0;
  const parsedPrice = orderType === 'LIMIT' ? parseFloat(limitPrice) : currentPrice;
  const price = isNaN(parsedPrice) ? currentPrice : parsedPrice;
  const totalCost = quantity * price;
  const canAfford = cash >= totalCost;

  const handleOrder = useCallback(async () => {
    try {
      const success = await placeOrder({
        symbol: stock.symbol,
        type: orderType,
        side,
        quantity,
        price: orderType === 'LIMIT' ? price : undefined,
      });

      if (success) {
        setShowSuccess(true);
        setIsConfirming(false);
      } else {
        setErrorMessage('注文の処理中にエラーが発生しました');
      }
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : '予期せぬエラーが発生しました');
    }
  }, [placeOrder, stock.symbol, orderType, side, quantity, price]);

  // Auto-hide success message after 3 seconds with cleanup
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (showSuccess) {
      timer = setTimeout(() => setShowSuccess(false), 3000);
    }
    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [showSuccess]);

  return {
    side,
    setSide,
    orderType,
    setOrderType,
    quantity,
    setQuantity,
    limitPrice,
    setLimitPrice,
    isConfirming,
    setIsConfirming,
    showSuccess,
    setShowSuccess,
    errorMessage,
    setErrorMessage,
    riskConfig,
    setRiskConfig,
    showRiskSettings,
    setShowRiskSettings,
    cash,
    parsedPrice,
    price,
    totalCost,
    canAfford,
    handleOrder,
    ids
  };
}