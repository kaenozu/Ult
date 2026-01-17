import React, { useEffect, useState } from 'react';
import { Bomb, Rocket, Shield, Clock, AlertTriangle } from 'lucide-react';

interface EarningsCountdownProps {
    daysToEarnings?: number | null;
    earningsDate?: string | null;
    ticker: string;
}

export default function EarningsCountdown({ daysToEarnings, earningsDate, ticker }: EarningsCountdownProps) {
    const [mounted, setMounted] = useState(false);

    // Hydration safety: Antigravity's request
    useEffect(() => {
        setMounted(true);
    }, []);

    if (!daysToEarnings && daysToEarnings !== 0) return null;
    if (!mounted) return null; // Avoid server-client mismatch on time calculations

    // Logic: 
    // < 0 days: Passed (Safe) -> Shield
    // 0-3 days: DANGER -> Bomb (Blinking)
    // 3-7 days: CAUTION -> Clock (Yellow)
    // > 7 days: SAFE -> Rocket (Gray/Blue)

    const days = daysToEarnings!;

    if (days < 0) {
        return (
            <div className="flex items-center gap-1 text-[10px] text-emerald-400 bg-emerald-400/10 px-2 py-1 rounded-full border border-emerald-400/20" title={`Earnings passed on ${earningsDate}`}>
                <Shield className="w-3 h-3" />
                <span>PASSED</span>
            </div>
        );
    }

    if (days <= 3) {
        return (
            <div className="flex items-center gap-1 text-[10px] text-red-500 bg-red-500/10 px-2 py-1 rounded-full border border-red-500/50 animate-pulse font-bold" title={`EARNINGS IN ${days} DAYS!`}>
                <Bomb className="w-3 h-3 animate-bounce" />
                <span>T-{days}d</span>
            </div>
        );
    }

    if (days <= 7) {
        return (
            <div className="flex items-center gap-1 text-[10px] text-amber-400 bg-amber-400/10 px-2 py-1 rounded-full border border-amber-400/30" title={`Earnings coming up: ${earningsDate}`}>
                <Clock className="w-3 h-3" />
                <span>{days}d</span>
            </div>
        );
    }

    return (
        <div className="flex items-center gap-1 text-[10px] text-muted-foreground bg-white/5 px-2 py-1 rounded-full border border-white/5" title={`Earnings: ${earningsDate}`}>
            <Rocket className="w-3 h-3 text-cyan-500/50" />
            <span>{days}d</span>
        </div>
    );
}
