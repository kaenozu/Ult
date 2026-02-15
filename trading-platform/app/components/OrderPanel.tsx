'use client';

import { Stock, OHLCV } from '@/app/types';
import { formatCurrency, cn } from '@/app/lib/utils';
import { useOrderEntry } from '@/app/hooks/useOrderEntry';
import { RiskSettingsPanel } from './RiskSettingsPanel';
import { usePortfolioStore } from '@/app/store/portfolioStore';

/**
 * OrderPanelコンポーネントのプロパティ
 * @property stock - 取引対象の銘柄情報
 * @property currentPrice - 現在の株価
 * @property ohlcv - OHLCVデータ（ボラティリティ計算に使用）
 */
interface OrderPanelProps {
  stock: Stock;
  currentPrice: number;
  ohlcv?: OHLCV[];
}

/**
 * 注文パネルコンポーネント
 *
 * 株式の売買注文を作成・実行するためのUIコンポーネント。
 * 成行注文と指値注文に対応し、動的リスク管理機能を提供する。
 *
 * @component
 * @example
 * ```tsx
 * <OrderPanel
 *   stock={{ symbol: 'AAPL', name: 'Apple Inc.', market: 'usa' }}
 *   currentPrice={150.25}
 *   ohlcv={historicalData}
 * />
 * ```
 *
 * @param {OrderPanelProps} props - コンポーネントのプロパティ
 * @returns {JSX.Element} 注文パネルUI
 */
export function OrderPanel({ stock, currentPrice, ohlcv = [] }: OrderPanelProps) {
  const portfolio = usePortfolioStore((state) => state.portfolio);
  const {
    side, setSide,
    orderType, setOrderType,
    quantity, setQuantity,
    limitPrice, setLimitPrice,
    isConfirming, setIsConfirming,
    showSuccess, 
    errorMessage, setErrorMessage,
    riskConfig, setRiskConfig,
    showRiskSettings, setShowRiskSettings,
    cash,
    price,
    totalCost,
    canAfford,
    handleOrder,
    ids
  } = useOrderEntry({ stock, currentPrice });

  return (
    <div className="bg-[#141e27] p-4 flex flex-col gap-4 border-l border-[#233648] h-full relative">
      {showSuccess && (
        <div 
          role="status"
          className="absolute top-4 left-4 right-4 bg-green-600 text-white text-xs font-bold p-3 rounded shadow-lg z-50 animate-in fade-in slide-in-from-top-2"
        >
          注文を送信しました
        </div>
      )}
      {errorMessage && (
        <div 
          role="alert"
          className="absolute top-4 left-4 right-4 bg-red-600 text-white text-xs font-bold p-3 rounded shadow-lg z-50 animate-in fade-in slide-in-from-top-2"
        >
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
        <label htmlFor={ids.orderType} className="text-[10px] uppercase text-[#92adc9] font-bold">注文種別</label>
        <select
          id={ids.orderType}
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
        <div className="flex justify-between items-center">
          <label htmlFor={ids.quantity} className="text-[10px] uppercase text-[#92adc9] font-bold">数量</label>
          {side === 'BUY' && (
            <button
              type="button"
              onClick={() => {
                if (price > 0 && cash > 0) {
                  const maxQty = Math.floor(cash / price);
                  if (maxQty >= 1) {
                    setQuantity(maxQty);
                  } else {
                    setErrorMessage('現金が足りません');
                    setTimeout(() => setErrorMessage(null), 2000);
                  }
                }
              }}
              disabled={price <= 0 || cash <= 0 || Math.floor(cash / price) < 1}
              className="text-[10px] text-green-400 hover:text-white underline decoration-dotted transition-colors disabled:text-gray-500 disabled:no-underline cursor-pointer disabled:cursor-not-allowed"
              aria-label="最大購入可能数量を入力"
            >
              最大 (Max)
            </button>
          )}
        </div>
        <input
          id={ids.quantity}
          type="number"
          min="1"
          step="1"
          inputMode="numeric"
          pattern="[0-9]*"
          autoComplete="off"
          value={quantity}
          onFocus={(e) => e.target.select()}
          onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 0))}
          className="bg-[#192633] border border-[#233648] rounded text-white text-sm p-2 outline-none focus:border-primary"
        />
      </div>

      {/* Limit Price (if LIMIT) */}
      {orderType === 'LIMIT' && (
        <div className="flex flex-col gap-1">
          <label htmlFor={ids.limitPrice} className="text-[10px] uppercase text-[#92adc9] font-bold">指値価格</label>
          <input
            id={ids.limitPrice}
            type="number"
            step="0.01"
            inputMode="decimal"
            autoComplete="off"
            value={limitPrice}
            onFocus={(e) => e.target.select()}
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
        aria-controls={ids.riskSettings}
        title={showRiskSettings ? "リスク設定を隠す" : "リスク設定を表示"}
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
        <RiskSettingsPanel
          id={ids.riskSettings}
          riskConfig={riskConfig}
          setRiskConfig={setRiskConfig}
          ohlcv={ohlcv}
          portfolio={portfolio}
          ids={ids}
        />
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
          aria-labelledby={ids.modalTitle}
        >
          <div className="bg-[#141e27] border border-[#233648] p-4 rounded-lg w-full max-w-xs shadow-2xl">
            <h4 id={ids.modalTitle} className="text-white font-bold mb-2">注文の確認</h4>
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
