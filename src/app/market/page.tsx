'use client';

import React from 'react';
import { BarChart3 } from 'lucide-react';

import { getWatchlist, WatchlistItem } from '@/lib/api';
import { useQuery } from '@tanstack/react-query';
import NeuralLoader from '@/components/dashboard/NeuralLoader';
import EarningsCountdown from '@/components/dashboard/EarningsCountdown';
import MarketStatusCard from '@/components/dashboard/MarketStatusCard';

export default function MarketPage() {
    const { data: watchlist, isLoading, isError, error } = useQuery({
        queryKey: ['watchlist'],
        queryFn: getWatchlist,
        refetchInterval: 10000,
    });

    if (isLoading) {
        return <NeuralLoader />;
    }

    if (isError) {
        return (
            <div className="p-10 text-center border border-red-500/50 bg-red-500/10 rounded-xl">
                <h3 className="text-red-400 font-bold mb-2">SIGNAL LOST</h3>
                <p className="text-sm text-muted-foreground">Unable to establish connection with Market Oracle.</p>
                <div className="mt-4 text-xs font-mono text-red-300 bg-black/50 p-2 rounded">
                    {error instanceof Error ? error.message : 'Unknown Error'}
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <header className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-cyan-500/10 rounded-lg border border-cyan-500/20">
                        <BarChart3 className="w-6 h-6 text-cyan-400" />
                    </div>
                    <h1 className="text-2xl font-bold tracking-tight text-white/90">
                        MARKET <span className="text-cyan-400 neon-text">SCANNER</span>
                    </h1>
                </div>
            </header>

            <div className="grid grid-cols-1 mb-6">
                <MarketStatusCard />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {watchlist?.map((item) => (
                    <div key={item.ticker} className={`glass-panel p-6 rounded-xl border-white/5 hover:border-cyan-500/30 transition-colors group ${item.signal !== 0 ? 'border-l-4 ' + (item.signal > 0 ? 'border-l-emerald-500' : 'border-l-red-500') : ''}`}>
                        <div className="flex justify-between items-start mb-4">
                            <div className="flex flex-col">
                                <span className="font-mono text-xs text-muted-foreground group-hover:text-cyan-400">{item.ticker}</span>
                                <h3 className="font-bold text-lg mb-1 truncate">{item.name}</h3>
                            </div>
                            <div className="text-right">
                                <div className={`text-md font-mono ${item.change_percent >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                                    {item.change_percent > 0 ? '+' : ''}{item.change_percent.toFixed(2)}%
                                </div>
                                <div className="text-xs text-muted-foreground">¥{item.price.toLocaleString()}</div>
                                <div className="mt-1 flex justify-end">
                                    <EarningsCountdown
                                        ticker={item.ticker}
                                        daysToEarnings={item.days_to_earnings}
                                        earningsDate={item.earnings_date}
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="flex justify-between items-center mt-4">
                            <span className="text-xs text-muted-foreground">{item.sector}</span>
                            {item.signal !== 0 && (
                                <span className={`text-xs font-bold px-2 py-1 rounded ${item.signal > 0 ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'}`}>
                                    {item.signal > 0 ? 'BUY SIGNAL' : 'SELL SIGNAL'} ({item.confidence.toFixed(2)})
                                </span>
                            )}
                        </div>

                        <div className="mt-4 h-1 bg-white/5 rounded-full overflow-hidden">
                            <div
                                className={`h-full transition-all duration-500 ${item.signal > 0 ? 'bg-emerald-500' : item.signal < 0 ? 'bg-rose-500' : 'bg-cyan-500/30'}`}
                                style={{ width: item.signal !== 0 ? `${item.confidence * 100}%` : '0%' }}
                            ></div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
