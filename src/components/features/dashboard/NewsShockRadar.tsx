"use client";

import React from "react";
import { useQuery } from "@tanstack/react-query";
import { Radio, AlertTriangle, ShieldCheck, Zap } from "lucide-react";

interface ShockStatus {
    level: "NORMAL" | "WARNING" | "CRITICAL";
    score: number;
    latest_event?: {
        category: string;
        keyword: string;
        title: string;
        timestamp: string;
    };
}

export default function NewsShockRadar() {
    const { data: status, isLoading } = useQuery<ShockStatus>({
        queryKey: ["shock-radar"],
        queryFn: async () => {
            const res = await fetch("/api/v1/security/shock-radar");
            if (!res.ok) return { level: "NORMAL", score: 0.1 };
            return res.json();
        },
        refetchInterval: 15000, // Check every 15s
    });

    if (isLoading) return null;

    const currentLevel = status?.level || "NORMAL";
    const score = status?.score || 0;

    // Visual variants
    const variants = {
        NORMAL: {
            color: "text-emerald-500",
            bg: "bg-emerald-500/10",
            border: "border-emerald-500/30",
            icon: ShieldCheck,
            label: "ALL SYSTEMS STABLE"
        },
        WARNING: {
            color: "text-amber-500",
            bg: "bg-amber-500/10",
            border: "border-amber-500/50",
            icon: Zap,
            label: "ELEVATED RISK"
        },
        CRITICAL: {
            color: "text-red-500",
            bg: "bg-red-500/10",
            border: "border-red-500/80 animate-pulse",
            icon: AlertTriangle,
            label: "IRON DOME ACTIVE"
        }
    };

    const currentVariant = variants[currentLevel];
    const Icon = currentVariant.icon;

    return (
        <div className={`rounded-xl border ${currentVariant.border} ${currentVariant.bg} p-4 flex flex-col gap-3 relative overflow-hidden transition-all duration-500`}>
            {/* Radar Effect Background */}
            <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
                <Radio className={`w-24 h-24 ${currentLevel === 'CRITICAL' ? 'animate-ping' : ''}`} />
            </div>

            <div className="flex items-center justify-between z-10">
                <div className="flex items-center gap-2">
                    <Icon className={`w-5 h-5 ${currentLevel === 'CRITICAL' ? 'animate-bounce' : ''} ${currentVariant.color}`} />
                    <span className={`font-bold font-mono tracking-widest ${currentVariant.color}`}>
                        SHOCK RADAR
                    </span>
                </div>
                <div className={`text-xs font-mono px-2 py-1 rounded bg-black/40 border border-white/5 ${currentVariant.color}`}>
                    IDX: {score.toFixed(2)}
                </div>
            </div>

            <div className="z-10">
                <h4 className={`text-xl font-black uppercase ${currentVariant.color}`}>
                    {currentVariant.label}
                </h4>
                {status?.latest_event && (
                    <div className="mt-2 text-xs font-mono text-muted-foreground border-l-2 border-white/20 pl-2">
                        <div className="text-white/70 mb-1">Testing: Latest Detection</div>
                        <p className="line-clamp-2">{status.latest_event.title}</p>
                        <span className="text-[10px] opacity-70">{new Date(status.latest_event.timestamp).toLocaleTimeString()}</span>
                    </div>
                )}
            </div>

            {/* Progress Bar for Score */}
            <div className="w-full h-1 bg-black/50 mt-2 rounded-full overflow-hidden">
                <div
                    className={`h-full transition-all duration-1000 ${currentVariant.color.replace('text-', 'bg-')}`}
                    style={{ width: `${Math.min(score * 100, 100)}%` }}
                />
            </div>
        </div>
    );
}
