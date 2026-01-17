'use client'

import React, { useState, useEffect } from 'react'
import { Brain, Activity, Zap } from 'lucide-react'
import { Card } from '@/components/ui/card'

const THOUGHTS = [
    "Analyzing market volatility...",
    "Scanning for arbitrage opportunities...",
    "Monitoring institutional order flow...",
    "Detecting sentiment shift in semiconductor sector...",
    "Optimizing portfolio risk weighting...",
    "Calculating predictive confidence intervals...",
    "Observing macro-economic indicators...",
    "All systems nominal. Waiting for signal..."
]

export default function OracleWidget() {
    const [status, setStatus] = useState<'idle' | 'scanning' | 'thinking'>('scanning')
    const [thought, setThought] = useState(THOUGHTS[0])

    useEffect(() => {
        // Simulate AI Loop
        const interval = setInterval(() => {
            const randomThought = THOUGHTS[Math.floor(Math.random() * THOUGHTS.length)]
            setThought(randomThought)
            setStatus(Math.random() > 0.7 ? 'thinking' : 'scanning')
        }, 4000)

        return () => clearInterval(interval)
    }, [])

    return (
        <Card className="glass-panel border-primary/20 p-6 relative overflow-hidden group">
            {/* Background Pulse */}
            <div className="absolute top-0 right-0 p-3">
                <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${status === 'thinking' ? 'bg-amber-500 animate-pulse' : 'bg-primary animate-pulse'}`} />
                    <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-mono">
                        {status === 'thinking' ? 'PROCESSING' : 'LIVE FEED'}
                    </span>
                </div>
            </div>

            <div className="flex items-center gap-6">
                {/* Visual Core */}
                <div className="relative w-16 h-16 flex items-center justify-center">
                    <div className="absolute inset-0 bg-primary/20 rounded-full animate-ping opacity-20 duration-[3s]" />
                    <div className="absolute inset-2 bg-primary/10 rounded-full border border-primary/30 animate-spin-slow" />
                    <div className="relative z-10 bg-background/50 rounded-full p-3 border border-primary/50 shadow-[0_0_15px_rgba(0,240,255,0.3)]">
                        <Brain className={`w-8 h-8 ${status === 'thinking' ? 'text-amber-400' : 'text-primary'}`} />
                    </div>
                </div>

                {/* Text Stream */}
                <div className="flex-1 space-y-1">
                    <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-widest flex items-center gap-2">
                        <Activity className="w-4 h-4 text-primary" />
                        AI Oracle Logic
                    </h3>
                    <p className="text-lg font-light text-foreground/90 font-mono h-14 flex items-center neon-text min-h-[3.5rem]">
                        {thought}
                        <span className="inline-block w-2 h-4 bg-primary ml-1 animate-pulse" />
                    </p>
                </div>
            </div>

            {/* Decorative lines */}
            <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-primary/50 to-transparent opacity-50" />
        </Card>
    )
}
