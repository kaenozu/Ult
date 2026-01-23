'use client';

import { useState, useId } from 'react';
import { Stock } from '@/app/types';
import { formatCurrency, cn } from '@/app/lib/utils';
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

  const orderTypeId = useId();
  const quantityId = useId();
  const limitPriceId = useId();
  const modalTitleId = useId();

  const price = orderType === 'MARKET' ? currentPrice : parseFloat(limitPrice);
  const totalCost = quantity > 0 ? price * quantity : 0;
  const canAfford = portfolio.cash >= totalCost && quantity > 0;

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
      change: stock.change,
      entryDate: new Date().toISOString().split('T')[0],
    });

    addJournalEntry({
        id: Date.now().toString(),
        symbol: stock.symbol,
        date: new Date().toISOString().split('T')[0],
        signalType: side === 'BUY' ? 'BUY' : 'SELL',
        entryPrice: price,
        exitPrice: 0,
        quantity: quantity,
        profit: 0,
        profitPercent: 0,
        notes: `${orderType === 'MARKET' ? '成行' : '指値'}注文`,
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
            余力: {formatCurrency(portfolio.cash)}
        </span>
      </div>

      {/* Side Selection */}
      <div className="flex bg-[#192633] rounded-lg p-1" role="group" aria-label="注文サイドの選択">
        <button
          onClick={() => setSide('BUY')}
          aria-pressed={side === 'BUY'}
          className={cn(
            'flex-1 py-2 text-sm font-bold rounded-md transition-all',
            side === 'BUY' ? 'bg-green-600 text-white shadow-lg' : 'text-[#92adc9] hover:text-white'
          )}
        >
          買い
        </button>
        <button
          onClick={() => setSide('SELL')}
          aria-pressed={side === 'SELL'}
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
        <label htmlFor={orderTypeId} className="text-[10px] uppercase text-[#92adc9] font-bold">注文種別</label>
        <select
          id={orderTypeId}
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
        <label htmlFor={quantityId} className="text-[10px] uppercase text-[#92adc9] font-bold">数量</label>
        <input
          id={quantityId}
          type="number"
          min="1"
          value={quantity}
          onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 0))}
          className="bg-[#192633] border border-[#233648] rounded text-white text-sm p-2 outline-none focus:border-primary"
        />
      </div>

      {/* Limit Price (if LIMIT) */}
      {orderType === 'LIMIT' && (
        <div className="flex flex-col gap-1">
          <label htmlFor={limitPriceId} className="text-[10px] uppercase text-[#92adc9] font-bold">指値価格</label>
          <input
            id={limitPriceId}
            type="number"
            value={limitPrice}
            onChange={(e) => setLimitPrice(e.target.value)}
            className="bg-[#192633] border border-[#233648] rounded text-white text-sm p-2 outline-none focus:border-primary"
          />
        </div>
      )}

      {/* Summary */}
      <div className="mt-auto bg-[#192633]/50 rounded-lg p-3 border border-[#233648]">
        <div className="flex justify-between text-xs mb-1">
            <span className="text-[#92adc9]">概算価格</span>
            <span className="text-white">{formatCurrency(price)}</span>
        </div>
        <div className="flex justify-between text-sm font-bold">
            <span className="text-[#92adc9]">合計概算額</span>
            <span className="text-white">{formatCurrency(totalCost)}</span>
        </div>
      </div>

      {/* Action Button */}
      <button
        onClick={() => setIsConfirming(true)}
        disabled={side === 'BUY' && !canAfford}
        className={cn(
            "w-full py-3 rounded-lg font-bold text-white shadow-lg transition-all",
            side === 'BUY' 
                ? (canAfford ? "bg-green-600 hover:bg-green-500" : "bg-[#233648] cursor-not-allowed")
                : "bg-red-600 hover:bg-red-500"
        )}
      >
        {side === 'BUY' ? (canAfford ? '買い注文を発注' : '資金不足です') : '空売り注文を発注'}
      </button>

      {/* Confirmation Modal */}
      {isConfirming && (
        <div
          className="absolute inset-0 bg-black/80 flex items-center justify-center p-4 z-50 rounded-lg backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-labelledby={modalTitleId}
        >
            <div className="bg-[#141e27] border border-[#233648] p-4 rounded-lg w-full max-w-xs shadow-2xl">
                <h4 id={modalTitleId} className="text-white font-bold mb-2">注文の確認</h4>
                <div className="text-sm text-[#92adc9] mb-4">
                    {side === 'BUY' ? '買い' : '空売り'} {quantity} {stock.symbol} @ {orderType === 'MARKET' ? '成行' : limitPrice}
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
                        注文を確定
                    </button>
                </div>
            </div>
        </div>
      )}
    </div>
  );
}