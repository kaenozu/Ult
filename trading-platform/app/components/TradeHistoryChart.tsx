/**
 * TradeHistoryChart.tsx
 * 
 * 取引履歴と損益を可視化するコンポーネント
 */

'use client';

import React from 'react';
import { useTradeHistory } from '@/app/lib/hooks/useTradeHistory';

interface TradeHistoryChartProps {
  symbol?: string;
  height?: number;
}

export function TradeHistoryChart({ symbol, height = 400 }: TradeHistoryChartProps) {
  const { trades, isLoading, monthlyPerformance, totalCount } = useTradeHistory();

  // 銘柄でフィルタリング
  const filteredTrades = symbol 
    ? trades.filter(t => t.symbol === symbol)
    : trades;

  // 損益計算
  const calculatePnL = () => {
    const positionMap = new Map<string, { quantity: number; avgPrice: number }>();
    let totalPnL = 0;
    let winningTrades = 0;
    let losingTrades = 0;

    filteredTrades
      .filter(t => t.status === 'FILLED')
      .forEach(trade => {
        const price = trade.price || 0;

        if (trade.side === 'BUY') {
          const current = positionMap.get(trade.symbol);
          if (current) {
            const totalQuantity = current.quantity + trade.quantity;
            const totalCost = current.quantity * current.avgPrice + trade.quantity * price;
            positionMap.set(trade.symbol, {
              quantity: totalQuantity,
              avgPrice: totalCost / totalQuantity,
            });
          } else {
            positionMap.set(trade.symbol, { quantity: trade.quantity, avgPrice: price });
          }
        } else if (trade.side === 'SELL') {
          const position = positionMap.get(trade.symbol);
          if (position && position.quantity > 0) {
            const sellQuantity = Math.min(trade.quantity, position.quantity);
            const pnl = (price - position.avgPrice) * sellQuantity;
            totalPnL += pnl;

            if (pnl > 0) winningTrades++;
            else if (pnl < 0) losingTrades++;

            const remainingQuantity = position.quantity - sellQuantity;
            if (remainingQuantity > 0) {
              positionMap.set(trade.symbol, { ...position, quantity: remainingQuantity });
            } else {
              positionMap.delete(trade.symbol);
            }
          }
        }
      });

    return { totalPnL, winningTrades, losingTrades };
  };

  const { totalPnL, winningTrades, losingTrades } = calculatePnL();
  const winRate = winningTrades + losingTrades > 0 
    ? (winningTrades / (winningTrades + losingTrades) * 100).toFixed(1)
    : '0.0';

  if (isLoading) {
    return (
      <div className="p-6 bg-[#101822] rounded-xl border border-[#1a3a5c]" style={{ height }}>
        <div className="animate-pulse space-y-4">
          <div className="h-4 bg-[#1a3a5c] rounded w-1/4"></div>
          <div className="h-32 bg-[#1a3a5c] rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* サマリーカード */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="p-4 bg-[#101822] rounded-xl border border-[#1a3a5c]">
          <p className="text-xs text-[#5f7a99] mb-1">総取引数</p>
          <p className="text-2xl font-bold text-white">{totalCount}</p>
        </div>
        
        <div className="p-4 bg-[#101822] rounded-xl border border-[#1a3a5c]">
          <p className="text-xs text-[#5f7a99] mb-1">実現損益</p>
          <p className={`text-2xl font-bold ${totalPnL >= 0 ? 'text-green-400' : 'text-red-400'}`}>
            {totalPnL >= 0 ? '+' : ''}{totalPnL.toLocaleString()}円
          </p>
        </div>

        <div className="p-4 bg-[#101822] rounded-xl border border-[#1a3a5c]">
          <p className="text-xs text-[#5f7a99] mb-1">勝率</p>
          <p className="text-2xl font-bold text-white">{winRate}%</p>
          <p className="text-xs text-[#5f7a99]">{winningTrades}勝 {losingTrades}敗</p>
        </div>

        <div className="p-4 bg-[#101822] rounded-xl border border-[#1a3a5c]">
          <p className="text-xs text-[#5f7a99] mb-1">月間パフォーマンス</p>
          <p className="text-2xl font-bold text-white">{monthlyPerformance.length}ヶ月</p>
        </div>
      </div>

      {/* 月次パフォーマンステーブル */}
      {monthlyPerformance.length > 0 && (
        <div className="bg-[#101822] rounded-xl border border-[#1a3a5c] overflow-hidden">
          <div className="px-4 py-3 border-b border-[#1a3a5c]">
            <h3 className="text-sm font-bold text-white">月次パフォーマンス</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-[#0d2137]">
                <tr>
                  <th className="px-4 py-2 text-left text-[#5f7a99]">年月</th>
                  <th className="px-4 py-2 text-right text-[#5f7a99]">取引数</th>
                  <th className="px-4 py-2 text-right text-[#5f7a99]">勝率</th>
                  <th className="px-4 py-2 text-right text-[#5f7a99]">純損益</th>
                  <th className="px-4 py-2 text-right text-[#5f7a99]">PF</th>
                </tr>
              </thead>
              <tbody>
                {monthlyPerformance.slice(0, 12).map((perf) => (
                  <tr key={`${perf.year}-${perf.month}`} className="border-b border-[#1a3a5c] last:border-0">
                    <td className="px-4 py-3 text-white">
                      {perf.year}年{perf.month}月
                    </td>
                    <td className="px-4 py-3 text-right text-white">
                      {perf.totalTrades}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span className={perf.winRate >= 0.5 ? 'text-green-400' : 'text-red-400'}>
                        {(perf.winRate * 100).toFixed(1)}%
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span className={perf.netProfit >= 0 ? 'text-green-400' : 'text-red-400'}>
                        {perf.netProfit >= 0 ? '+' : ''}{perf.netProfit.toLocaleString()}円
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right text-white">
                      {perf.profitFactor === Infinity ? '∞' : perf.profitFactor.toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 最近の取引 */}
      {filteredTrades.length > 0 && (
        <div className="bg-[#101822] rounded-xl border border-[#1a3a5c] overflow-hidden">
          <div className="px-4 py-3 border-b border-[#1a3a5c]">
            <h3 className="text-sm font-bold text-white">最近の取引</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-[#0d2137]">
                <tr>
                  <th className="px-4 py-2 text-left text-[#5f7a99]">日付</th>
                  <th className="px-4 py-2 text-left text-[#5f7a99]">銘柄</th>
                  <th className="px-4 py-2 text-left text-[#5f7a99]">種別</th>
                  <th className="px-4 py-2 text-right text-[#5f7a99]">数量</th>
                  <th className="px-4 py-2 text-right text-[#5f7a99]">価格</th>
                  <th className="px-4 py-2 text-center text-[#5f7a99]">状態</th>
                </tr>
              </thead>
              <tbody>
                {filteredTrades.slice(0, 10).map((trade) => (
                  <tr key={trade.id} className="border-b border-[#1a3a5c] last:border-0">
                    <td className="px-4 py-3 text-white">{trade.date}</td>
                    <td className="px-4 py-3 text-white font-medium">{trade.symbol}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 rounded text-xs font-bold ${
                        trade.side === 'BUY' 
                          ? 'bg-red-500/20 text-red-400' 
                          : 'bg-green-500/20 text-green-400'
                      }`}>
                        {trade.side === 'BUY' ? '買い' : '売り'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right text-white">
                      {trade.quantity.toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-right text-white">
                      {trade.price?.toLocaleString() || '-'}円
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={`text-xs ${
                        trade.status === 'FILLED' 
                          ? 'text-green-400' 
                          : trade.status === 'PENDING'
                          ? 'text-yellow-400'
                          : 'text-gray-400'
                      }`}>
                        {trade.status === 'FILLED' ? '約定' : 
                         trade.status === 'PENDING' ? '注文中' : '取消'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {filteredTrades.length === 0 && !isLoading && (
        <div className="p-12 bg-[#101822] rounded-xl border border-[#1a3a5c] text-center">
          <p className="text-[#5f7a99] mb-2">取引履歴がありません</p>
          <p className="text-xs text-[#5f7a99]">取引を行うと、ここに履歴が表示されます</p>
        </div>
      )}
    </div>
  );
}
