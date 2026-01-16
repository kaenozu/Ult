'use client'

import React, { useEffect, useState } from 'react'
import { ArrowUp, ArrowDown, Activity } from 'lucide-react'

interface MacroData {
    symbol: string
    name: string
    price: number
    change_percent: number
    trend: 'up' | 'down' | 'neutral'
}

export default function MacroStrip() {
    const [indicators, setIndicators] = useState<MacroData[]>([])

    useEffect(() => {
        const fetchMacro = async () => {
            try {
                const res = await fetch('/api/v1/macro')
                if (res.ok) {
                    const data = await res.json()
                    setIndicators(data)
                }
            } catch (e) {
                console.error("Failed to fetch macro data", e)
            }
        }

        fetchMacro()
        const interval = setInterval(fetchMacro, 60000) // Update every minute
        return () => clearInterval(interval)
    }, [])

    if (indicators.length === 0) return null

    // Determine global market "temperature"
    const upCount = indicators.filter(i => i.trend === 'up').length
    const downCount = indicators.filter(i => i.trend === 'down').length
    const marketMood = upCount > downCount ? 'risk-on' : 'risk-off'
    const isRiskOn = marketMood === 'risk-on'

    return (
        <div className="w-full h-12 glass-panel border-b border-white/5 flex items-center px-6 overflow-hidden relative z-20">

            {/* Dynamic Background Tint based on Mood */}
            <div className={`absolute inset-0 opacity-10 ${isRiskOn ? 'bg-emerald-500/20' : 'bg-red-500/20'} pointer-events-none transition-colors duration-1000`} />

            <div className="flex items-center gap-2 mr-6 text-muted-foreground text-xs uppercase tracking-widest font-bold">
                <Activity className={`w-4 h-4 ${isRiskOn ? 'text-emerald-400' : 'text-red-400'}`} />
                <span>Macro Winds</span>
            </div>

            <div className="flex gap-8 overflow-x-auto no-scrollbar">
                {indicators.map((item) => (
                    <div key={item.symbol} className="flex items-center gap-3 min-w-max">
                        <span className="text-xs font-bold text-muted-foreground">{item.name}</span>
                        <div className="flex items-baseline gap-1">
                            <span className="text-sm font-mono text-white font-bold">
                                {item.price.toLocaleString()}
                            </span>
                            <span className={`text-xs font-mono flex items-center ${item.trend === 'up' ? 'text-emerald-400' : item.trend === 'down' ? 'text-red-400' : 'text-gray-400'}`}>
                                {item.trend === 'up' ? <ArrowUp className="w-3 h-3" /> : item.trend === 'down' ? <ArrowDown className="w-3 h-3" /> : null}
                                {Math.abs(item.change_percent)}%
                            </span>
                        </div>
                    </div>
                ))}
            </div>

            <div className="ml-auto text-[10px] text-muted-foreground font-mono opacity-50">
                LIVE FEED
            </div>
        </div>
    )
}
