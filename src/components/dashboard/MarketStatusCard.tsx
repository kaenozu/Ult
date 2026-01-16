'use client';

import { useState, useEffect } from 'react';
import { useRegimeStream } from '@/hooks/useSynapse';
import { MarketRegime } from '@/types/websocket';
import { Activity, TrendingUp, TrendingDown, AlertTriangle } from 'lucide-react';

export default function MarketStatusCard() {
    const [regime, setRegime] = useState<MarketRegime>(MarketRegime.SIDEWAYS);
    const [confidence, setConfidence] = useState<number>(0);
    const [vibe, setVibe] = useState<'neutral' | 'bull' | 'bear' | 'panic'>('neutral');
    const [message, setMessage] = useState<string>("Initializing Synapse...");
    const [serverTime, setServerTime] = useState<string>("--:--:--");

    useRegimeStream((message) => {
        const payload = message.payload;
        setRegime(payload.regime);
        setConfidence(payload.confidence);
        setServerTime(new Date(payload.timestamp).toLocaleTimeString());

        switch (payload.regime) {
            case MarketRegime.BULL:
                setVibe('bull');
                setMessage("TO THE MOON! 🚀");
                break;
            case MarketRegime.BEAR:
                setVibe('bear');
                setMessage("Time to be careful 🐻");
                break;
            case MarketRegime.CRASH:
                setVibe('panic');
                setMessage("SELL EVERYTHING! 🔥");
                break;
            case MarketRegime.VOLATILE:
                setVibe('panic');
                setMessage("Choppy Waters 🌊");
                break;
            case MarketRegime.SIDEWAYS:
            default:
                setVibe('neutral');
                setMessage("Steady as she goes 😐");
        }
    });

    // Vibe styles
    const vibeStyles = {
        neutral: "border-white/10 bg-white/5",
        bull: "border-emerald-500/50 bg-emerald-500/10 shadow-[0_0_30px_-5px_rgba(16,185,129,0.3)]",
        bear: "border-rose-500/50 bg-rose-500/10",
        panic: "border-rose-600 bg-rose-600/20 animate-pulse border-2",
    };

    const textStyles = {
        neutral: "text-muted-foreground",
        bull: "text-emerald-400 font-bold neon-text-green",
        bear: "text-rose-400 font-bold",
        panic: "text-rose-500 font-black tracking-widest uppercase",
    };

    return (
        <div className={`p-6 rounded-xl border transition-all duration-500 ${vibeStyles[vibe]} min-h-[200px] flex flex-col justify-between relative overflow-hidden group`}>
            {/* Vibe Background Effect for Bull/Panic */}
            {vibe === 'bull' && <div className="absolute inset-0 bg-emerald-500/5 blur-3xl -z-10 group-hover:bg-emerald-500/10 transition-colors" />}
            {vibe === 'panic' && <div className="absolute inset-0 bg-rose-500/10 blur-xl -z-10 animate-pulse" />}

            <div className="flex justify-between items-start">
                <div className="flex items-center gap-2">
                    <Activity className={`w-5 h-5 ${vibe === 'panic' ? 'animate-bounce text-rose-500' : 'text-muted-foreground'}`} />
                    <h2 className="font-mono text-sm uppercase tracking-wider opacity-70">Market Regime</h2>
                </div>
                <div className="font-mono text-xs opacity-50">{serverTime}</div>
            </div>

            <div className="text-center py-4 z-10">
                <div className={`text-3xl md:text-5xl mb-2 transition-all duration-300 ${textStyles[vibe]}`}>
                    {regime}
                </div>
                <div className="flex items-center justify-center gap-2 text-sm opacity-80 font-mono">
                    {vibe === 'bull' && <TrendingUp className="w-4 h-4 text-emerald-400" />}
                    {vibe === 'bear' && <TrendingDown className="w-4 h-4 text-rose-400" />}
                    {vibe === 'panic' && <AlertTriangle className="w-4 h-4 text-rose-600" />}
                    {vibe === 'neutral' && <span className="text-xs">⚖️</span>}
                    CONF: {(confidence * 100).toFixed(0)}%
                </div>
            </div>

            <div className="mt-auto pt-4 border-t border-white/5 z-10">
                <div className={`text-center font-bold text-lg font-mono typewriter`}>
                    {message}
                </div>
            </div>
        </div>
    );
}
