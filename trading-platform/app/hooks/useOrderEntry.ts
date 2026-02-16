import { useState, useMemo, useCallback, useEffect, useId, Dispatch, SetStateAction } from 'react';
import { Stock, OrderSide, OrderType } from '@/app/types';
import { usePortfolioStore } from '@/app/store/portfolioStore';
import { DynamicRiskConfig } from '@/app/lib/DynamicRiskManagement';

interface UseOrderEntryProps {
  stock: Stock;
  currentPrice: number;
}

interface UseOrderEntryResult {
  // State
  side: OrderSide;
  setSide: (side: OrderSide) => void;
  orderType: OrderType;
  setOrderType: (type: OrderType) => void;
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
    riskSettings: string;
  };
}

export function useOrderEntry({ stock, currentPrice }: UseOrderEntryProps): UseOrderEntryResult {
  const { portfolio, executeOrder } = usePortfolioStore();

  // Local State
  const [side, setSide] = useState<OrderSide>('BUY');
  const [orderType, setOrderType] = useState<OrderType>('MARKET');
  const [quantity, setQuantity] = useState<number>(1);
  const [limitPrice, setLimitPrice] = useState<string>(currentPrice.toString());
  const [isConfirming, setIsConfirming] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Risk management configuration
  const [riskConfig, setRiskConfig] = useState<DynamicRiskConfig>({
    maxRiskPerTrade: 2.0, // 2%
    minRiskRewardRatio: 2.0,
    volatilityMultiplier: 1.0,
    enableTrailingStop: false,
    enableVolatilityAdjustment: true,
    enableDynamicPositionSizing: true,
    trailingStopATRMultiple: 2.0,
    trailingStopMinPercent: 1.0,
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
  const riskSettingsId = useId();

  const ids = useMemo(() => ({
    orderType: orderTypeId,
    quantity: quantityId,
    limitPrice: limitPriceId,
    modalTitle: modalTitleId,
    trailingStop: trailingStopId,
    volAdjust: volAdjustId,
    kelly: kellyId,
    riskSettings: riskSettingsId,
  }), [orderTypeId, quantityId, limitPriceId, modalTitleId, trailingStopId, volAdjustId, kellyId, riskSettingsId]);

  const cash = portfolio?.cash || 0;
  const parsedPrice = orderType === 'LIMIT' ? parseFloat(limitPrice) : currentPrice;
  const price = isNaN(parsedPrice) ? currentPrice : parsedPrice;
  const totalCost = quantity * price;
  const canAfford = cash >= totalCost;

  const handleOrder = useCallback(async () => {
    try {
      const result = executeOrder({
        symbol: stock.symbol,
        orderType, // Mapped from local state 'orderType' to OrderRequest 'orderType'
        side: side === 'BUY' ? 'LONG' : 'SHORT', // Map 'BUY'/'SELL' to 'LONG'/'SHORT' expected by store
        quantity,
        price: orderType === 'LIMIT' ? price : currentPrice,
        name: stock.name, // Add required fields
        market: stock.market,
        riskConfig, // Pass risk configuration to the store
      });

      if (result.success) {
        setShowSuccess(true);
        setIsConfirming(false);
      } else {
        setErrorMessage(result.error || '注文の処理中にエラーが発生しました');
      }
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : '予期せぬエラーが発生しました');
    }
  }, [executeOrder, stock, orderType, side, quantity, price, currentPrice, riskConfig]);

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