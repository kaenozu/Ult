import { useState, useId, useCallback, useMemo, useEffect, Dispatch, SetStateAction } from 'react';
import { Stock, OHLCV } from '@/app/types';
import { useTradingStore } from '@/app/store/tradingStore';
import { useExecuteOrder } from '@/app/store/orderExecutionStore';
import { DynamicRiskConfig } from '@/app/lib/DynamicRiskManagement';
import { OrderRequest, OrderResult } from '@/app/types/order';

interface UseOrderEntryProps {
  stock: Stock;
  currentPrice: number;
}

interface UseOrderEntryResult {
  // State
  side: 'BUY' | 'SELL';
  setSide: (side: 'BUY' | 'SELL') => void;
  orderType: 'MARKET' | 'LIMIT';
  setOrderType: (type: 'MARKET' | 'LIMIT') => void;
  quantity: number;
  setQuantity: (q: number) => void;
  limitPrice: string;
  setLimitPrice: (p: string) => void;
  isConfirming: boolean;
  setIsConfirming: (v: boolean) => void;
  showSuccess: boolean;
  setShowSuccess: (v: boolean) => void;
  errorMessage: string | null;
  setErrorMessage: (msg: string | null) => void;
  riskConfig: DynamicRiskConfig;
  setRiskConfig: Dispatch<SetStateAction<DynamicRiskConfig>>;
  showRiskSettings: boolean;
  setShowRiskSettings: (v: boolean) => void;

  // Derived Values
  cash: number;
  parsedPrice: number;
  price: number;
  totalCost: number;
  canAfford: boolean;

  // Handlers
  handleOrder: () => void;

  // IDs
  ids: {
    orderType: string;
    quantity: string;
    limitPrice: string;
    modalTitle: string;
    trailingStop: string;
    volAdjust: string;
    kelly: string;
  };
}

export function useOrderEntry({ stock, currentPrice }: UseOrderEntryProps): UseOrderEntryResult {
  // Store Access
  const cash = useTradingStore((state) => state.portfolio.cash);
  const executeOrder = useExecuteOrder();

  // Local State
  const [side, setSide] = useState<'BUY' | 'SELL'>('BUY');
  const [orderType, setOrderType] = useState<'MARKET' | 'LIMIT'>('MARKET');
  const [quantity, setQuantity] = useState<number>(100);
  const [limitPrice, setLimitPrice] = useState<string>(currentPrice.toString());
  const [isConfirming, setIsConfirming] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Risk Management Config
  const [riskConfig, setRiskConfig] = useState<DynamicRiskConfig>({
    enableTrailingStop: true,
    trailingStopATRMultiple: 2.0,
    trailingStopMinPercent: 1.0,
    enableVolatilityAdjustment: true,
    volatilityMultiplier: 1.5,
    enableDynamicPositionSizing: true,
    maxRiskPerTrade: 2.0,
    minRiskRewardRatio: 2.0,
  });
  const [showRiskSettings, setShowRiskSettings] = useState(false);

  // ID Generation (stable across renders)
  const orderTypeId = useId();
  const quantityId = useId();
  const limitPriceId = useId();
  const modalTitleId = useId();
  const trailingStopId = useId();
  const volAdjustId = useId();
  const kellyId = useId();

  const ids = useMemo(() => ({
    orderType: orderTypeId,
    quantity: quantityId,
    limitPrice: limitPriceId,
    modalTitle: modalTitleId,
    trailingStop: trailingStopId,
    volAdjust: volAdjustId,
    kelly: kellyId,
  }), [orderTypeId, quantityId, limitPriceId, modalTitleId, trailingStopId, volAdjustId, kellyId]);

  // Derived Values
  const parsedPrice = parseFloat(limitPrice);
  const price = orderType === 'MARKET'
    ? currentPrice
    : (Number.isNaN(parsedPrice) || parsedPrice <= 0 ? currentPrice : parsedPrice);

  const totalCost = quantity > 0 ? price * quantity : 0;
  const canAfford = cash >= totalCost && quantity > 0;

  // Order Execution Handler
  const handleOrder = useCallback(() => {
    if (quantity <= 0) return;
    if (side === 'BUY' && !canAfford) return;

    // Clear previous errors
    setErrorMessage(null);

    // Construct Order Request
    const orderRequest: OrderRequest = {
      symbol: stock.symbol,
      name: stock.name,
      market: stock.market,
      side: side === 'BUY' ? 'LONG' : 'SHORT',
      quantity: quantity,
      price: price,
      orderType: orderType,
      riskConfig: riskConfig,
    };

    // Execute Order
    const result: OrderResult = executeOrder(orderRequest);

    if (result.success) {
      setIsConfirming(false);
      setShowSuccess(true);
    } else {
      setErrorMessage(result.error || '注文の実行に失敗しました');
    }
  }, [
    canAfford,
    executeOrder,
    orderType,
    price,
    quantity,
    riskConfig,
    side,
    stock.market,
    stock.name,
    stock.symbol
  ]);

  // Auto-hide success message after 3 seconds with cleanup
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (showSuccess) {
      timer = setTimeout(() => setShowSuccess(false), 3000);
    }
    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [showSuccess, setShowSuccess]);

  return {
    side, setSide,
    orderType, setOrderType,
    quantity, setQuantity,
    limitPrice, setLimitPrice,
    isConfirming, setIsConfirming,
    showSuccess, setShowSuccess,
    errorMessage, setErrorMessage,
    riskConfig, setRiskConfig,
    showRiskSettings, setShowRiskSettings,
    cash,
    parsedPrice,
    price,
    totalCost,
    canAfford,
    handleOrder,
    ids
  };
}

// Auto-hide success message after 3 seconds with cleanup
useEffect(() => {
  let timer: NodeJS.Timeout;
  if (showSuccess) {
    timer = setTimeout(() => setShowSuccess(false), 3000);
  }
  return () => {
    if (timer) clearTimeout(timer);
  };
}, [showSuccess, setShowSuccess]);
