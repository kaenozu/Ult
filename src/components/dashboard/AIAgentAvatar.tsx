'use client';

import React, { useEffect, useState } from 'react';

type AgentState = 'IDLE' | 'TALKING' | 'THINKING' | 'ERROR';

export default function AIAgentAvatar({ state = 'IDLE' }: { state?: AgentState }) {

    // Random waveform generation for visual effect
    const [bars, setBars] = useState<number[]>(Array(12).fill(20));

    useEffect(() => {
        const interval = setInterval(() => {
            setBars(prev => prev.map(() => {
                const base = state === 'IDLE' ? 20 : state === 'TALKING' ? 60 : 40;
                const noise = Math.random() * (state === 'IDLE' ? 10 : 50);
                return Math.min(100, Math.max(10, base + noise));
            }));
        }, 100);
        return () => clearInterval(interval);
    }, [state]);

    // Glitch effect class
    const glitchClass = state === 'ERROR' ? 'animate-pulse text-red-500' : 'text-cyan-400';

    return (
        <div className={`glass-panel p-6 rounded-2xl border-white/10 flex flex-col items-center justify-center relative overflow-hidden transition-all duration-500 ${state === 'ERROR' ? 'border-red-500/50 shadow-[0_0_50px_rgba(255,0,0,0.2)]' : 'shadow-[0_0_30px_rgba(0,255,255,0.1)]'}`}>

            {/* Background Aura */}
            <div className={`absolute inset-0 bg-gradient-to-t from-primary/10 to-transparent opacity-50 ${state === 'ERROR' ? 'from-red-900/20' : ''}`} />

            {/* Avatar Visual (Waveform Circle) */}
            <div className="relative w-32 h-32 flex items-center justify-center mb-4">
                {/* Core Spirit */}
                <div className={`absolute w-full h-full rounded-full border-2 ${glitchClass} opacity-20 animate-spin-slow`} style={{ borderStyle: 'dashed' }} />
                <div className={`absolute w-24 h-24 rounded-full bg-primary/10 blur-xl ${state === 'ERROR' ? 'bg-red-500/20' : ''}`} />

                {/* Waveform Bars */}
                <div className="flex gap-1 items-center justify-center h-16 transform scale-y-1">
                    {bars.map((height, i) => (
                        <div
                            key={i}
                            className={`w-1 rounded-full transition-all duration-75 ${state === 'ERROR' ? 'bg-red-500' : 'bg-cyan-400'}`}
                            style={{
                                height: `${height}%`,
                                opacity: Math.max(0.3, height / 100)
                            }}
                        />
                    ))}
                </div>
            </div>

            {/* Status Text */}
            <div className="text-center z-10">
                <h2 className={`text-xl font-bold tracking-widest neon-text ${state === 'ERROR' ? 'text-red-500' : 'text-primary'}`}>
                    G.H.O.S.T
                </h2>
                <p className="text-xs font-mono text-muted-foreground mt-1">
                    {state === 'IDLE' ? 'STANDING BY' :
                        state === 'TALKING' ? 'TRANSMITTING...' :
                            state === 'THINKING' ? 'PROCESSING...' :
                                'SYSTEM FAILURE'}
                </p>
            </div>

            {/* Corner Deco */}
            <div className="absolute top-2 left-2 w-2 h-2 border-t border-l border-white/50" />
            <div className="absolute top-2 right-2 w-2 h-2 border-t border-r border-white/50" />
            <div className="absolute bottom-2 left-2 w-2 h-2 border-b border-l border-white/50" />
            <div className="absolute bottom-2 right-2 w-2 h-2 border-b border-r border-white/50" />
        </div>
    );
}
