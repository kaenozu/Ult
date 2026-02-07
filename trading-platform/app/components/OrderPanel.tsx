'use client';

import { useMemo } from 'react';
import { Stock, OHLCV } from '@/app/types';
import { formatCurrency, cn } from '@/app/lib/utils';
import { useTradingStore } from '@/app/store/tradingStore';
import { useExecuteOrder } from '@/app/store/orderExecutionStore';
import { DynamicRiskMetrics } from './DynamicRiskMetrics';
import { useOrderEntry } from '@/app/hooks/useOrderEntry';
import { TraderHealthCard } from './TraderHealthCard';
import { MarketCorrelationCard } from './MarketCorrelationCard';
import { UnifiedIntelligenceCard } from './UnifiedIntelligenceCard';

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
  const portfolio = useTradingStore((state) => state.portfolio);
  const {
    side,
    setSide,
    orderType,
    setOrderType,
    quantity,
    setQuantity,
    limitPrice,
    setLimitPrice,
    showSuccess,
    setShowSuccess,
    errorMessage,
    setErrorMessage,
    riskConfig,
    setRiskConfig,
    showRiskSettings,
    setShowRiskSettings,
    cash,
    price,
    totalCost,
    canAfford,
    handleOrder,
    ids
  } = useOrderEntry({ stock, currentPrice });

  return (
    <div className="bg-[#141e27] p-4 flex flex-col gap-4 border-l border-[#233648] h-full relative overflow-y-auto">
      {/* Intelligence Cards - comprehensive trading insights */}
      <UnifiedIntelligenceCard stock={stock} />
      <TraderHealthCard />
      <MarketCorrelationCard stock={stock} />

      {/* Success message with proper ARIA role for accessibility */}
      {showSuccess && (
        <div role="status" className="absolute top-4 left-4 right-4 bg-green-600 text-white text-xs font-bold p-3 rounded shadow-lg z-50 animate-in fade-in slide-in-from-top-2">
          注文を送信しました
        </div>
      )}

      {/* Error message with alert role for screen readers */}
      {errorMessage && (
        <div role="alert" className="absolute top-4 left-4 right-4 bg-red-600 text-white text-xs font-bold p-3 rounded shadow-lg z-50 animate-in fade-in slide-in-from-top-2">
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
          type="button"
          onClick={() => setSide('BUY')}
          className={cn(
            "flex-1 py-2 px-4 rounded text-sm font-medium transition-colors",
            side === 'BUY'
              ? "bg-green-600 text-white"
              : "text-[#92adc9] hover:text-white hover:bg-[#233648]"
          )}
          aria-pressed={side === 'BUY'}
        >
          買い
        </button>
        <button
          type="button"
          onClick={() => setSide('SELL')}
          className={cn(
            "flex-1 py-2 px-4 rounded text-sm font-medium transition-colors",
            side === 'SELL'
              ? "bg-red-600 text-white"
              : "text-[#92adc9] hover:text-white hover:bg-[#233648]"
          )}
          aria-pressed={side === 'SELL'}
        >
          売り
        </button>
      </div>

      {/* Order Type Selection */}
      <div className="flex bg-[#192633] rounded-lg p-1" role="group" aria-label="注文タイプの選択">
        <button
          type="button"
          onClick={() => setOrderType('MARKET')}
          className={cn(
            "flex-1 py-2 px-4 rounded text-sm font-medium transition-colors",
            orderType === 'MARKET'
              ? "bg-blue-600 text-white"
              : "text-[#92adc9] hover:text-white hover:bg-[#233648]"
          )}
          aria-pressed={orderType === 'MARKET'}
        >
          成行
        </button>
        <button
          type="button"
          onClick={() => setOrderType('LIMIT')}
          className={cn(
            "flex-1 py-2 px-4 rounded text-sm font-medium transition-colors",
            orderType === 'LIMIT'
              ? "bg-blue-600 text-white"
              : "text-[#92adc9] hover:text-white hover:bg-[#233648]"
          )}
          aria-pressed={orderType === 'LIMIT'}
        >
          指値
        </button>
      </div>

      {/* Quantity Input */}
      <div>
        <label htmlFor={ids.quantity} className="block text-sm text-[#92adc9] mb-1">
          数量 (株)
        </label>
        <input
          id={ids.quantity}
          type="number"
          value={quantity}
          onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
          className="w-full bg-[#192633] border border-[#233648] rounded px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          min="1"
        />
      </div>

      {/* Limit Price Input */}
      {orderType === 'LIMIT' && (
        <div>
          <label htmlFor={ids.limitPrice} className="block text-sm text-[#92adc9] mb-1">
            指値価格
          </label>
          <input
            id={ids.limitPrice}
            type="number"
            value={limitPrice}
            onChange={(e) => setLimitPrice(e.target.value)}
            className="w-full bg-[#192633] border border-[#233648] rounded px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            step="0.01"
          />
        </div>
      )}

      {/* Price and Cost Display */}
      <div className="space-y-2 text-sm">
        <div className="flex justify-between">
          <span className="text-[#92adc9]">現在の価格:</span>
          <span className="text-white font-medium">{formatCurrency(price)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-[#92adc9]">総コスト:</span>
          <span className="text-white font-medium">{formatCurrency(totalCost)}</span>
        </div>
        <div className={`flex justify-between ${canAfford ? 'text-green-400' : 'text-red-400'}`}>
          <span>余力状況:</span>
          <span>{canAfford ? '十分な余力があります' : '余力が不足しています'}</span>
        </div>
      </div>

      {/* Toggle Risk Settings */}
      <div className="border-t border-[#233648] pt-3">
        <button
          type="button"
          onClick={() => setShowRiskSettings(!showRiskSettings)}
          className="flex items-center gap-2 text-sm text-[#92adc9] hover:text-white transition-colors w-full"
          aria-expanded={showRiskSettings}
          aria-controls={ids.kelly}
        >
          <span className={cn(
            "transform transition-transform",
            showRiskSettings ? "rotate-90" : ""
          )}>
            ▶
          </span>
          リスク設定を編集
        </button>

        {showRiskSettings && (
          <div id={ids.kelly} className="mt-3 space-y-4 bg-[#192633] p-3 rounded">
            <div>
              <label className="flex items-center gap-2 text-sm text-[#92adc9]">
                <input
                  type="checkbox"
                  checked={riskConfig.enableTrailingStop}
                  onChange={(e) => setRiskConfig({ ...riskConfig, enableTrailingStop: e.target.checked })}
                  className="rounded border-[#233648] bg-[#141e27] text-blue-600 focus:ring-blue-600"
                />
                トレーリングストップを有効化
              </label>
            </div>
            <div>
              <label className="flex items-center gap-2 text-sm text-[#92adc9]">
                <input
                  type="checkbox"
                  checked={riskConfig.enableVolatilityAdjustment}
                  onChange={(e) => setRiskConfig({ ...riskConfig, enableVolatilityAdjustment: e.target.checked })}
                  className="rounded border-[#233648] bg-[#141e27] text-blue-600 focus:ring-blue-600"
                />
                ボラティリティ調整を有効化
              </label>
            </div>
            <div>
              <label className="flex items-center gap-2 text-sm text-[#92adc9]">
                <input
                  type="checkbox"
                  checked={riskConfig.enableDynamicPositionSizing}
                  onChange={(e) => setRiskConfig({ ...riskConfig, enableDynamicPositionSizing: e.target.checked })}
                  className="rounded border-[#233648] bg-[#141e27] text-blue-600 focus:ring-blue-600"
                />
                動的ポジションサイジングを有効化
              </label>
            </div>
          </div>
        )}
      </div>

      {/* Submit Button */}
      <button
        type="button"
        onClick={handleOrder}
        className={cn(
          "w-full py-3 px-4 rounded font-bold transition-colors",
          canAfford && quantity > 0
            ? side === 'BUY'
              ? "bg-green-600 hover:bg-green-700 text-white"
              : "bg-red-600 hover:bg-red-700 text-white"
            : "bg-gray-600 text-gray-300 cursor-not-allowed"
        )}
        disabled={!canAfford || quantity <= 0}
      >
        {`${side === 'BUY' ? '買い' : '売り'}注文を送信`}
      </button>

      {/* Dynamic Risk Metrics Display */}
      {ohlcv.length > 0 && (
        <DynamicRiskMetrics
          portfolio={portfolio}
          marketData={ohlcv}
          riskConfig={riskConfig}
        />
      )}
    </div>
  );
}
