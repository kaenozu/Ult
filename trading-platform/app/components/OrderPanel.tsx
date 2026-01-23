'use client';

import { useState, useMemo } from 'react';
import { Stock } from '@/app/types';
import { formatCurrency, cn, getTickSize, roundToTickSize, getPriceLimit } from '@/app/lib/utils';
import { useTradingStore } from '@/app/store/tradingStore';

interface OrderPanelProps {
  stock: Stock;
  currentPrice: number;
}

export function OrderPanel({ stock, currentPrice }: OrderPanelProps) {
  const { portfolio, addPosition, setCash, addJournalEntry } = useTradingStore();
  const [side, setSide] = useState<'BUY' | 'SELL'>('BUY');
  const [orderType, setOrderType] = useState<'MARKET' | 'LIMIT'>('MARKET');
  const [quantity, setQuantity] = useState<number>(100);
  const [limitPrice, setLimitPrice] = useState<string>(currentPrice.toString());
  const [isConfirming, setIsConfirming] = useState(false);

  const referencePrice = stock.price - stock.change;
  const priceLimit = useMemo(() => {
    if (stock.market === 'usa') return Infinity;
    return getPriceLimit(referencePrice);
  }, [stock.market, referencePrice]);

  const tickSize = useMemo(() => {
    if (stock.market === 'usa') return 0.01;
    const price = parseFloat(limitPrice) || currentPrice;
    return getTickSize(price);
  }, [stock.market, limitPrice, currentPrice]);

  const price = orderType === 'MARKET' ? currentPrice : parseFloat(limitPrice);
  
  // バリデーション: 呼値に合っているか
  const isTickValid = useMemo(() => {
    if (orderType === 'MARKET') return true;
    if (stock.market === 'usa') return true;
    const p = parseFloat(limitPrice);
    if (isNaN(p)) return false;
    return p % tickSize === 0;
  }, [limitPrice, tickSize, orderType, stock.market]);

  // バリデーション: 制限値幅内か
  const isWithinLimit = useMemo(() => {
    if (orderType === 'MARKET' || stock.market === 'usa') return true;
    const p = parseFloat(limitPrice);
    if (isNaN(p)) return false;
    return p >= referencePrice - priceLimit && p <= referencePrice + priceLimit;
  }, [limitPrice, referencePrice, priceLimit, orderType, stock.market]);

  const totalCost = quantity > 0 ? price * quantity : 0;
  const canAfford = portfolio.cash >= totalCost && quantity > 0;
  const isValid = quantity > 0 && isTickValid && isWithinLimit && (side === 'SELL' || canAfford);

  const handleOrder = () => {
    if (quantity <= 0) return;
    if (side === 'BUY' && !canAfford) return;

    // Simulate order execution
    setCash(portfolio.cash - totalCost);
    addPosition({
      symbol: stock.symbol,
      name: stock.name,
      market: stock.market,
      side: side === 'BUY' ? 'LONG' : 'SHORT',
      quantity: quantity,
      avgPrice: price,
      currentPrice: price,
      entryDate: new Date().toISOString().split('T')[0],
    });

    addJournalEntry({
        id: Date.now().toString(),
        symbol: stock.symbol,
        date: new Date().toISOString().split('T')[0],
        signalType: side,
        entryPrice: price,
        exitPrice: 0,
        quantity: quantity,
        profit: 0,
        profitPercent: 0,
        notes: `${orderType} Order`,
        status: 'OPEN'
    });

    setIsConfirming(false);
    alert(`注文を実行しました: ${side === 'BUY' ? '買い' : '空売り'} ${quantity}株 @ ${price}`);
  };

  return (
    <div className="bg-[#141e27] p-4 flex flex-col gap-4 border-l border-[#233648] h-full">
      <div className="flex justify-between items-center border-b border-[#233648] pb-2">
        <h3 className="text-white font-bold">{stock.symbol} を取引</h3>
        <span className="text-xs text-[#92adc9]">
            残高: {formatCurrency(portfolio.cash)}
        </span>
      </div>

      {/* Side Selection */}
      <div className="flex bg-[#192633] rounded-lg p-1">
        <button
          onClick={() => setSide('BUY')}
          className={cn(
            'flex-1 py-2 text-sm font-bold rounded-md transition-all',
            side === 'BUY' ? 'bg-green-600 text-white shadow-lg' : 'text-[#92adc9] hover:text-white'
          )}
        >
          買い
        </button>
        <button
          onClick={() => setSide('SELL')}
          className={cn(
            'flex-1 py-2 text-sm font-bold rounded-md transition-all',
            side === 'SELL' ? 'bg-red-600 text-white shadow-lg' : 'text-[#92adc9] hover:text-white'
          )}
        >
          空売り
        </button>
      </div>

      {/* Order Type */}
      <div className="flex flex-col gap-1">
        <label className="text-[10px] uppercase text-[#92adc9] font-bold">注文種別</label>
        <select
          value={orderType}
          onChange={(e) => setOrderType(e.target.value as 'MARKET' | 'LIMIT')}
          className="bg-[#192633] border border-[#233648] rounded text-white text-sm p-2 outline-none focus:border-primary"
        >
          <option value="MARKET">成行 (Market)</option>
          <option value="LIMIT">指値 (Limit)</option>
        </select>
      </div>

      {/* Quantity */}
      <div className="flex flex-col gap-1">
        <label className="text-[10px] uppercase text-[#92adc9] font-bold">数量 (株)</label>
        <input
          type="number"
          min="1"
          step="100"
          value={quantity}
          onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 0))}
          className="bg-[#192633] border border-[#233648] rounded text-white text-sm p-2 outline-none focus:border-primary"
        />
      </div>

      {/* Limit Price (if LIMIT) */}
      {orderType === 'LIMIT' && (
        <div className="flex flex-col gap-1">
          <div className="flex justify-between">
            <label className="text-[10px] uppercase text-[#92adc9] font-bold">指値価格</label>
            <span className="text-[10px] text-[#92adc9]">呼値: {tickSize}円</span>
          </div>
          <input
            type="number"
            step={tickSize}
            value={limitPrice}
            onChange={(e) => setLimitPrice(e.target.value)}
            className={cn(
              "bg-[#192633] border rounded text-white text-sm p-2 outline-none focus:border-primary",
              (isTickValid && isWithinLimit) ? "border-[#233648]" : "border-red-500"
            )}
          />
          {!isTickValid && (
            <span className="text-[10px] text-red-500">この価格帯の呼値は{tickSize}円単位です。</span>
          )}
          {!isWithinLimit && (
            <span className="text-[10px] text-red-500">
              制限値幅外です ({formatCurrency(referencePrice - priceLimit)} ～ {formatCurrency(referencePrice + priceLimit)})
            </span>
          )}
        </div>
      )}

      {/* Summary */}
      <div className="mt-auto bg-[#192633]/50 rounded-lg p-3 border border-[#233648]">
        <div className="flex justify-between text-xs mb-1">
            <span className="text-[#92adc9]">概算単価</span>
            <span className="text-white">{formatCurrency(price)}</span>
        </div>
        <div className="flex justify-between text-sm font-bold">
            <span className="text-[#92adc9]">合計概算</span>
            <span className="text-white">{formatCurrency(totalCost)}</span>
        </div>
      </div>

      {/* Action Button */}
      <button
        onClick={() => setIsConfirming(true)}
        disabled={!isValid}
        className={cn(
            "w-full py-3 rounded-lg font-bold text-white shadow-lg transition-all",
            side === 'BUY' 
                ? (canAfford ? ((isTickValid && isWithinLimit) ? "bg-green-600 hover:bg-green-500" : "bg-gray-600") : "bg-[#233648] cursor-not-allowed")
                : ((isTickValid && isWithinLimit) ? "bg-red-600 hover:bg-red-500" : "bg-gray-600")
        )}
      >
        {!isTickValid ? '無効な呼値' : !isWithinLimit ? '制限値幅外' : side === 'BUY' ? (canAfford ? '買い注文を発注' : '残高不足') : '空売り注文を発注'}
      </button>

      {/* Confirmation Modal (Simplified overlay) */}
      {isConfirming && (
        <div className="absolute inset-0 bg-black/80 flex items-center justify-center p-4 z-50 rounded-lg backdrop-blur-sm">
            <div className="bg-[#141e27] border border-[#233648] p-4 rounded-lg w-full max-w-xs shadow-2xl">
                <h4 className="text-white font-bold mb-2">注文内容の確認</h4>
                <div className="text-sm text-[#92adc9] mb-4">
                    {side === 'BUY' ? '買い' : '空売り'} {quantity}株 {stock.symbol} @ {orderType === 'MARKET' ? '成行' : `${limitPrice}円`}
                </div>
                <div className="flex gap-2">
                    <button 
                        onClick={() => setIsConfirming(false)}
                        className="flex-1 py-2 bg-[#233648] text-white rounded hover:bg-[#324d67]"
                    >
                        キャンセル
                    </button>
                    <button 
                        onClick={handleOrder}
                        className={cn(
                            "flex-1 py-2 text-white rounded font-bold",
                            side === 'BUY' ? "bg-green-600 hover:bg-green-500" : "bg-red-600 hover:bg-red-500"
                        )}
                    >
                        確定
                    </button>
                </div>
            </div>
        </div>
      )}
    </div>
  );
}
