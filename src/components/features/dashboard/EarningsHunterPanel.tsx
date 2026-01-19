"use client";

import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Target, TrendingUp, AlertTriangle, ChevronDown, ChevronUp } from "lucide-react";
import EarningsCountdown from "./EarningsCountdown";
import dynamic from "next/dynamic";

const EdgeNewsRefinery = dynamic(
    () => import("@/components/features/edge/EdgeNewsRefinery"),
    { ssr: false, loading: () => <div className="h-48 bg-purple-900/20 animate-pulse rounded-lg" /> }
);

interface EarningsEvent {
    ticker: string;
    name?: string;
    earnings_date: string;
    days_to_earnings: number;
}

export default function EarningsHunterPanel() {
    const [showEdge, setShowEdge] = useState(false);

    const { data: upcoming, isLoading } = useQuery<EarningsEvent[]>({
        queryKey: ["earnings-hunter"],
        queryFn: async () => {
            const res = await fetch("/api/v1/market/earnings?days=30");
            if (!res.ok) return [];
            return res.json();
        },
        refetchInterval: 60000,
    });

    if (isLoading) {
        return (
            <div className="glass-panel p-4 h-full flex items-center justify-center animate-pulse">
                <Target className="w-6 h-6 text-red-500 animate-spin" />
            </div>
        );
    }

    const events = upcoming || [];

    return (
        <div className="space-y-4">
            <div className="glass-panel p-6 rounded-xl border-red-500/20 shadow-[0_0_15px_rgba(239,68,68,0.1)] relative overflow-hidden">
                {/* Background Decor */}
                <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
                    <Target className="w-32 h-32 text-red-500" />
                </div>

                <div className="flex items-center justify-between mb-6 relative z-10">
                    <div className="flex items-center gap-3">
                        <div className="bg-red-500/10 p-2 rounded-lg border border-red-500/20">
                            <Target className="w-5 h-5 text-red-500" />
                        </div>
                        <div>
                            <h3 className="text-lg font-bold uppercase tracking-widest text-red-500">
                                Earnings Hunter
                            </h3>
                            <span className="text-xs text-red-400/60 font-mono">
                                VOLATILITY CAPTURE PROTOCOL
                            </span>
                        </div>
                    </div>
                    <div className="text-xs font-mono bg-black/40 px-3 py-1 rounded border border-white/5">
                        DETECTED: {events.length}
                    </div>
                </div>

                <div className="space-y-3 relative z-10">
                    {events.length === 0 ? (
                        <div className="text-center py-8 text-muted-foreground text-sm font-mono">
                            NO TARGETS IN RANGE (30 DAYS)
                        </div>
                    ) : (
                        events.map((event) => (
                            <div key={event.ticker} className="flex items-center justify-between bg-black/20 p-3 rounded-lg border border-white/5 hover:border-red-500/30 transition-colors group">
                                <div className="flex items-center gap-3">
                                    <span className="font-bold font-mono text-lg w-16 group-hover:text-red-400 transition-colors">
                                        {event.ticker.replace(".T", "")}
                                    </span>
                                    <div className="flex flex-col">
                                        <span className="text-xs text-muted-foreground">{event.earnings_date}</span>
                                    </div>
                                </div>

                                <div className="flex items-center gap-4">
                                    {/* Volatility Potential Indicator (Mock) */}
                                    <div className="flex items-center gap-1 text-[10px] text-orange-400" title="Implied Volatility High">
                                        <TrendingUp className="w-3 h-3" />
                                        <span>HIGH VOL</span>
                                    </div>

                                    <EarningsCountdown
                                        ticker={event.ticker}
                                        daysToEarnings={event.days_to_earnings}
                                        earningsDate={event.earnings_date}
                                    />

                                    <button className="text-xs bg-red-500/10 hover:bg-red-500/20 text-red-500 border border-red-500/30 px-3 py-1 rounded transition-colors uppercase font-bold tracking-wider">
                                        TRACK
                                    </button>
                                </div>
                            </div>
                        ))
                    )}
                </div>

                {/* Edge AI Toggle */}
                <button
                    onClick={() => setShowEdge(!showEdge)}
                    className="w-full mt-4 pt-4 border-t border-white/5 flex items-center justify-center gap-2 text-xs text-purple-400 hover:text-purple-300 transition-colors"
                >
                    {showEdge ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    <span className="uppercase font-bold tracking-widest">Edge AI News Refinery</span>
                </button>
            </div>

            {/* Edge News Refinery (Collapsible) */}
            {showEdge && <EdgeNewsRefinery />}
        </div>
    );
}
