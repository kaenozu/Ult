'use client';

import { useState } from 'react';
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

  const price = orderType === 'MARKET' ? currentPrice : parseFloat(limitPrice);
  const totalCost = price * quantity;
  const canAfford = portfolio.cash >= totalCost;

  const handleOrder = () => {
    if (side === 'BUY' && !canAfford) return;

    // Simulate order execution
    if (side === 'BUY') {
      setCash(portfolio.cash - totalCost);
      addPosition({
        symbol: stock.symbol,
        name: stock.name,
        market: stock.market,
        side: 'LONG', // Simplified: only LONG for now
        quantity: quantity,
        avgPrice: price,
        currentPrice: price,
        entryDate: new Date().toISOString().split('T')[0],
      });
    } else {
        // Sell logic needs position check, but for now assuming we can sell/short
        // Actually store only supports closing existing positions properly via closePosition
        // Let's restrict to BUY for this prototype or implement shorting later
        // Just showing UI for SELL but disabling action if no position
    }

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
    alert(`Order Executed: ${side} ${quantity} @ ${price}`);
  };

  return (
    <div className="bg-[#141e27] p-4 flex flex-col gap-4 border-l border-[#233648] h-full">
      <div className="flex justify-between items-center border-b border-[#233648] pb-2">
        <h3 className="text-white font-bold">Trade {stock.symbol}</h3>
        <span className="text-xs text-[#92adc9]">
            Balance: {formatCurrency(portfolio.cash)}
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
          BUY
        </button>
        <button
          onClick={() => setSide('SELL')}
          className={cn(
            'flex-1 py-2 text-sm font-bold rounded-md transition-all',
            side === 'SELL' ? 'bg-red-600 text-white shadow-lg' : 'text-[#92adc9] hover:text-white'
          )}
        >
          SELL
        </button>
      </div>

      {/* Order Type */}
      <div className="flex flex-col gap-1">
        <label className="text-[10px] uppercase text-[#92adc9] font-bold">Order Type</label>
        <select
          value={orderType}
          onChange={(e) => setOrderType(e.target.value as 'MARKET' | 'LIMIT')}
          className="bg-[#192633] border border-[#233648] rounded text-white text-sm p-2 outline-none focus:border-primary"
        >
          <option value="MARKET">Market</option>
          <option value="LIMIT">Limit</option>
        </select>
      </div>

      {/* Quantity */}
      <div className="flex flex-col gap-1">
        <label className="text-[10px] uppercase text-[#92adc9] font-bold">Quantity</label>
        <input
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
          <label className="text-[10px] uppercase text-[#92adc9] font-bold">Limit Price</label>
          <input
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
            <span className="text-[#92adc9]">Est. Price</span>
            <span className="text-white">{formatCurrency(price)}</span>
        </div>
        <div className="flex justify-between text-sm font-bold">
            <span className="text-[#92adc9]">Total</span>
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
        {side === 'BUY' ? (canAfford ? 'PLACE BUY ORDER' : 'INSUFFICIENT FUNDS') : 'PLACE SELL ORDER'}
      </button>

      {/* Confirmation Modal (Simplified overlay) */}
      {isConfirming && (
        <div className="absolute inset-0 bg-black/80 flex items-center justify-center p-4 z-50 rounded-lg backdrop-blur-sm">
            <div className="bg-[#141e27] border border-[#233648] p-4 rounded-lg w-full max-w-xs shadow-2xl">
                <h4 className="text-white font-bold mb-2">Confirm Order</h4>
                <div className="text-sm text-[#92adc9] mb-4">
                    {side} {quantity} {stock.symbol} @ {orderType === 'MARKET' ? 'Market' : limitPrice}
                </div>
                <div className="flex gap-2">
                    <button 
                        onClick={() => setIsConfirming(false)}
                        className="flex-1 py-2 bg-[#233648] text-white rounded hover:bg-[#324d67]"
                    >
                        Cancel
                    </button>
                    <button 
                        onClick={handleOrder}
                        className={cn(
                            "flex-1 py-2 text-white rounded font-bold",
                            side === 'BUY' ? "bg-green-600 hover:bg-green-500" : "bg-red-600 hover:bg-red-500"
                        )}
                    >
                        Confirm
                    </button>
                </div>
            </div>
        </div>
      )}
    </div>
  );
}
