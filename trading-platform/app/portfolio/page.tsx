'use client';

import React, { useState } from 'react';
import { usePortfolioStore } from '@/app/store/portfolioStore';
import { formatCurrency } from '@/app/lib/utils';
import { Header } from '@/app/components/Header';
import { Navigation } from '@/app/components/Navigation';

interface PositionToClose {
    symbol: string;
    quantity: number;
    marketValue: number;
    currentPrice: number;
}

export default function PortfolioPage() {
    const { portfolio, closePosition } = usePortfolioStore();
    const [positionToClose, setPositionToClose] = useState<PositionToClose | null>(null);

    const totalValue = portfolio.cash + portfolio.positions.reduce((acc, pos) => {
        return acc + (pos.quantity * pos.currentPrice);
    }, 0);

    const handleClosePosition = () => {
        if (positionToClose) {
            closePosition(positionToClose.symbol, positionToClose.currentPrice);
            setPositionToClose(null);
        }
    };

    return (
        <div className="flex flex-col h-screen bg-[#101922] text-white overflow-hidden">
            <div className="flex items-center border-b border-[#233648] bg-[#101922] px-4">
                <div className="flex-1">
                    <Header />
                </div>
            </div>

            <div className="flex-1 overflow-auto p-8">
                <div className="max-w-7xl mx-auto space-y-8">

                    {/* Summary Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="bg-[#1e293b] p-6 rounded-xl border border-[#334155] shadow-lg">
                            <h3 className="text-[#94a3b8] text-sm font-bold uppercase tracking-wider mb-2">総資産評価額</h3>
                            <div className="text-3xl font-bold text-white">{formatCurrency(totalValue)}</div>
                        </div>
                        <div className="bg-[#1e293b] p-6 rounded-xl border border-[#334155] shadow-lg">
                            <h3 className="text-[#94a3b8] text-sm font-bold uppercase tracking-wider mb-2">現金残高</h3>
                            <div className="text-3xl font-bold text-[#4ade80]">{formatCurrency(portfolio.cash)}</div>
                        </div>
                        <div className="bg-[#1e293b] p-6 rounded-xl border border-[#334155] shadow-lg">
                            <h3 className="text-[#94a3b8] text-sm font-bold uppercase tracking-wider mb-2">保有銘柄数</h3>
                            <div className="text-3xl font-bold text-white">{portfolio.positions.length} <span className="text-sm font-normal text-[#94a3b8]">銘柄</span></div>
                        </div>
                    </div>

                    {/* Positions Table */}
                    <div className="bg-[#1e293b] rounded-xl border border-[#334155] shadow-lg overflow-hidden">
                        <div className="p-6 border-b border-[#334155]">
                            <h2 className="text-xl font-bold text-white">保有ポジション一覧</h2>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="bg-[#0f172a] text-[#94a3b8] text-sm uppercase">
                                        <th className="p-4 font-semibold">銘柄</th>
                                        <th className="p-4 font-semibold text-right">数量</th>
                                        <th className="p-4 font-semibold text-right">取得単価</th>
                                        <th className="p-4 font-semibold text-right">現在値</th>
                                        <th className="p-4 font-semibold text-right">評価額</th>
                                        <th className="p-4 font-semibold text-right">損益</th>
                                        <th className="p-4 font-semibold text-center">アクション</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-[#334155]">
                                    {portfolio.positions.length === 0 ? (
                                        <tr>
                                            <td colSpan={7} className="p-8 text-center text-[#64748b]">
                                                保有中のポジションはありません
                                            </td>
                                        </tr>
                                    ) : (
                                        portfolio.positions.map((pos) => {
                                            const marketValue = pos.quantity * pos.currentPrice;
                                            const profitLoss = marketValue - (pos.quantity * pos.avgPrice);
                                            const profitLossPercent = (profitLoss / (pos.quantity * pos.avgPrice)) * 100;
                                            const isProfit = profitLoss >= 0;

                                            return (
                                                <tr key={pos.symbol} className="hover:bg-[#334155]/20 transition-colors">
                                                    <td className="p-4">
                                                        <div className="flex flex-col">
                                                            <span className="font-bold text-white text-lg">{pos.symbol}</span>
                                                            <span className="text-xs text-[#94a3b8]">{pos.name || 'Unknown'}</span>
                                                        </div>
                                                    </td>
                                                    <td className="p-4 text-right font-mono text-white">{pos.quantity.toLocaleString()}</td>
                                                    <td className="p-4 text-right font-mono text-[#94a3b8]">{formatCurrency(pos.avgPrice)}</td>
                                                    <td className="p-4 text-right font-mono text-white">{formatCurrency(pos.currentPrice)}</td>
                                                    <td className="p-4 text-right font-mono text-white font-bold">{formatCurrency(marketValue)}</td>
                                                    <td className={`p-4 text-right font-mono font-bold ${isProfit ? 'text-[#4ade80]' : 'text-[#ef4444]'}`}>
                                                        {isProfit ? '+' : ''}{formatCurrency(profitLoss)}
                                                        <br />
                                                        <span className="text-xs">({isProfit ? '+' : ''}{profitLossPercent.toFixed(2)}%)</span>
                                                    </td>
                                                    <td className="p-4 text-center">
                                                        <button
                                                            onClick={() => setPositionToClose({
                                                                symbol: pos.symbol,
                                                                quantity: pos.quantity,
                                                                marketValue,
                                                                currentPrice: pos.currentPrice
                                                            })}
                                                            className="bg-[#ef4444]/10 hover:bg-[#ef4444]/20 text-[#ef4444] border border-[#ef4444]/30 px-3 py-1.5 rounded text-sm font-medium transition-colors"
                                                        >
                                                            売却
                                                        </button>
                                                    </td>
                                                </tr>
                                            );
                                        })
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>

                </div>
            </div>

            {/* Confirmation Modal */}
            {positionToClose && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setPositionToClose(null)}>
                    <div className="bg-[#1e293b] p-6 rounded-xl border border-[#334155] shadow-xl max-w-md" onClick={e => e.stopPropagation()}>
                        <h3 className="text-lg font-bold text-white mb-4">ポジション売却確認</h3>
                        <p className="text-[#94a3b8] mb-2">
                            {positionToClose.symbol} ({positionToClose.quantity}株) を売却しますか？
                        </p>
                        <p className="text-white font-bold mb-6">
                            評価額: {formatCurrency(positionToClose.marketValue)}
                        </p>
                        <div className="flex gap-3 justify-end">
                            <button
                                onClick={() => setPositionToClose(null)}
                                className="px-4 py-2 rounded-lg bg-[#334155] text-white hover:bg-[#475569] transition-colors"
                            >
                                キャンセル
                            </button>
                            <button
                                onClick={handleClosePosition}
                                className="px-4 py-2 rounded-lg bg-[#ef4444] text-white hover:bg-[#dc2626] transition-colors"
                            >
                                売却する
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <Navigation />
        </div>
    );
}
