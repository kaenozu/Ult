'use client';

import { useState, useId } from 'react';
import { Stock, OHLCV } from '@/app/types';
import { formatCurrency, cn } from '@/app/lib/utils';
import { usePortfolioStore } from '@/app/store/portfolioStore';
import { useExecuteOrderAtomicV2 } from '@/app/store/orderExecutionStore';
import { DynamicRiskConfig } from '@/app/lib/DynamicRiskManagement';
import { DynamicRiskMetrics } from './DynamicRiskMetrics';
import { OrderRequest } from '@/app/types/order';

interface OrderPanelProps {
  stock: Stock;
  currentPrice: number;
  ohlcv?: OHLCV[];
}

export function OrderPanel({ stock, currentPrice, ohlcv = [] }: OrderPanelProps) {
  const { portfolio } = usePortfolioStore();
  const executeOrderAtomicV2 = useExecuteOrderAtomicV2();
  const cash = portfolio.cash;
  const [side, setSide] = useState<'BUY' | 'SELL'>('BUY');
  const [orderType, setOrderType] = useState<'MARKET' | 'LIMIT'>('MARKET');
  const [quantity, setQuantity] = useState<number>(100);
  const [limitPrice, setLimitPrice] = useState<string>(currentPrice.toString());
  const [isConfirming, setIsConfirming] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // 動的リスク管理設定
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

  const orderTypeId = useId();
  const quantityId = useId();
  const limitPriceId = useId();
  const modalTitleId = useId();

  const price = orderType === 'MARKET' ? currentPrice : parseFloat(limitPrice);
  const totalCost = quantity > 0 ? price * quantity : 0;
  const canAfford = cash >= totalCost && quantity > 0;

  const handleOrder = () => {
    if (quantity <= 0) return;
    if (side === 'BUY' && !canAfford) return;

    // Clear any previous error
    setErrorMessage(null);

    // 注文リクエスト作成
    const orderRequest: OrderRequest = {
      symbol: stock.symbol,
      name: stock.name,
      market: stock.market,
      side: side === 'BUY' ? 'LONG' : 'SHORT',
      quantity: quantity,
      price: price,
      orderType: orderType,
    };

    // アトミックな注文実行
    const result = executeOrderAtomicV2(orderRequest);

    if (result.success) {
      // 注文成功
      setIsConfirming(false);
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 3000);
    } else {
      // 注文失敗
      setErrorMessage(result.error || '注文の実行に失敗しました');
    }
  };

  return (
    <div className="bg-[#141e27] p-4 flex flex-col gap-4 border-l border-[#233648] h-full relative">
      {showSuccess && (
        <div className="absolute top-4 left-4 right-4 bg-green-600 text-white text-xs font-bold p-3 rounded shadow-lg z-50 animate-in fade-in slide-in-from-top-2">
          注文を送信しました
        </div>
      )}
      {errorMessage && (
        <div className="absolute top-4 left-4 right-4 bg-red-600 text-white text-xs font-bold p-3 rounded shadow-lg z-50 animate-in fade-in slide-in-from-top-2">
          {errorMessage}
          <button 
            onClick={() => setErrorMessage(null)}
            className="ml-2 text-white/80 hover:text-white"
            aria-label="エラーを閉じる"
          >
            ✕
          </button>
        </div>
      )}
      <div className="flex justify-between items-center border-b border-[#233648] pb-2">
        <h3 className="text-white font-bold">{stock.symbol} を取引</h3>
        <span className="text-xs text-[#92adc9]">
          余力: {formatCurrency(cash)}
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

      {/* Risk Management Settings Toggle */}
      <button
        onClick={() => setShowRiskSettings(!showRiskSettings)}
        className="flex items-center justify-between w-full py-2 text-xs font-bold text-[#92adc9] hover:text-white transition-colors border-t border-[#233648] mt-2"
        aria-expanded={showRiskSettings}
      >
        <span>リスク管理設定</span>
        <svg
          className={cn("w-4 h-4 transition-transform", showRiskSettings && "rotate-180")}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Risk Management Settings Panel */}
      {showRiskSettings && (
        <div className="bg-[#192633] rounded-lg p-3 border border-[#233648] space-y-3">
          {/* Trailing Stop Toggle */}
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-[#92adc9]">トレイリングストップ</span>
            <button
              onClick={() => setRiskConfig(prev => ({ ...prev, enableTrailingStop: !prev.enableTrailingStop }))}
              className={cn(
                "relative inline-flex h-5 w-9 items-center rounded-full transition-colors",
                riskConfig.enableTrailingStop ? "bg-green-500" : "bg-[#233648]"
              )}
              role="switch"
              aria-checked={riskConfig.enableTrailingStop}
            >
              <span
                className={cn(
                  "inline-block h-3 w-3 transform rounded-full bg-white transition-transform",
                  riskConfig.enableTrailingStop ? "translate-x-5" : "translate-x-1"
                )}
              />
            </button>
          </div>

          {/* Volatility Adjustment Toggle */}
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-[#92adc9]">ボラティリティ調整</span>
            <button
              onClick={() => setRiskConfig(prev => ({ ...prev, enableVolatilityAdjustment: !prev.enableVolatilityAdjustment }))}
              className={cn(
                "relative inline-flex h-5 w-9 items-center rounded-full transition-colors",
                riskConfig.enableVolatilityAdjustment ? "bg-green-500" : "bg-[#233648]"
              )}
              role="switch"
              aria-checked={riskConfig.enableVolatilityAdjustment}
            >
              <span
                className={cn(
                  "inline-block h-3 w-3 transform rounded-full bg-white transition-transform",
                  riskConfig.enableVolatilityAdjustment ? "translate-x-5" : "translate-x-1"
                )}
              />
            </button>
          </div>

          {/* Kelly-based Position Sizing Toggle */}
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-[#92adc9]">ケリー基準ポジションサイジング</span>
            <button
              onClick={() => setRiskConfig(prev => ({ ...prev, enableDynamicPositionSizing: !prev.enableDynamicPositionSizing }))}
              className={cn(
                "relative inline-flex h-5 w-9 items-center rounded-full transition-colors",
                riskConfig.enableDynamicPositionSizing ? "bg-green-500" : "bg-[#233648]"
              )}
              role="switch"
              aria-checked={riskConfig.enableDynamicPositionSizing}
            >
              <span
                className={cn(
                  "inline-block h-3 w-3 transform rounded-full bg-white transition-transform",
                  riskConfig.enableDynamicPositionSizing ? "translate-x-5" : "translate-x-1"
                )}
              />
            </button>
          </div>

          {/* Volatility Level Selector */}
          <div className="pt-2 border-t border-[#233648]/50">
            <span className="text-[10px] text-[#92adc9] block mb-2">ボラティリティ係数</span>
            <div className="grid grid-cols-4 gap-1">
              {[
                { value: 1.3, label: '低', color: 'bg-blue-500' },
                { value: 1.0, label: '中', color: 'bg-yellow-500' },
                { value: 0.7, label: '高', color: 'bg-orange-500' },
                { value: 0.4, label: '極端', color: 'bg-red-500' },
              ].map(({ value, label, color }) => (
                <button
                  key={value}
                  onClick={() => setRiskConfig(prev => ({ ...prev, volatilityMultiplier: value }))}
                  className={cn(
                    "px-2 py-1 text-[10px] font-bold rounded transition-all",
                    riskConfig.volatilityMultiplier === value
                      ? `${color} text-white`
                      : "bg-[#233648] text-[#92adc9] hover:text-white"
                  )}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Risk Metrics Display */}
          {ohlcv.length > 0 && (
            <div className="pt-2 border-t border-[#233648]/50 space-y-2">
              <span className="text-[10px] text-[#92adc9] block">計算されたリスク指標</span>
              <DynamicRiskMetrics
                stock={stock}
                currentPrice={price}
                side={side}
                ohlcv={ohlcv}
                cash={cash}
                config={riskConfig}
              />
            </div>
          )}
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
        {side === 'BUY' ? (canAfford ? '\u8CB7\u3044\u6CE8\u6587\u3092\u767A\u6CE8' : '\u8CC7\u91D1\u4E0D\u8DB3\u3067\u3059') : '\u7A7A\u58F2\u308A\u6CE8\u6587\u3092\u767A\u6CE8'}
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