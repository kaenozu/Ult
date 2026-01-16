'use client';

import React, { useState, useEffect } from 'react';
import {
    Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer,
    LineChart, Line, XAxis, YAxis, Tooltip
} from 'recharts';
import { Activity, Cpu, Wifi, AlertTriangle, ShieldCheck } from 'lucide-react';

const MOCK_DATA = [
    { subject: 'Latency', A: 80, fullMark: 150 }, // Low is good, but for radar we might invert or scale
    { subject: 'Error Rate', A: 95, fullMark: 100 }, // High is good (invert logic: 100 - error %)
    { subject: 'CPU Load', A: 70, fullMark: 100 },
    { subject: 'Memory', A: 60, fullMark: 100 },
    { subject: 'API Limit', A: 85, fullMark: 100 },
];

const MOCK_LOGS = [
    { id: 1, type: 'info', msg: 'System initialized. Neural link established.', time: '10:00:01' },
    { id: 2, type: 'success', msg: 'Market data feed active (WebSocket).', time: '10:00:03' },
    { id: 3, type: 'warning', msg: 'High volatility detected in Sector 3.', time: '10:05:12' },
    { id: 4, type: 'info', msg: 'AI Advisor analyzing 7203.T...', time: '10:06:45' },
    { id: 5, type: 'info', msg: 'Rebalancing calculation started.', time: '10:07:00' },
];

export default function SystemMonitor() {
    const [mounted, setMounted] = useState(false);
    const [latencyData, setLatencyData] = useState<{ time: string, value: number }[]>([]);

    useEffect(() => {
        setMounted(true);
        // Simulate heartbeat
        const interval = setInterval(() => {
            setLatencyData(prev => {
                const now = new Date();
                const newData = {
                    time: `${now.getSeconds()}`,
                    value: Math.floor(Math.random() * 50) + 20
                };
                return [...prev.slice(-20), newData];
            });
        }, 1000);
        return () => clearInterval(interval);
    }, []);

    if (!mounted) return null;

    return (
        <div className="glass-panel p-4 rounded-xl border-primary/20 shadow-[0_0_20px_rgba(0,255,255,0.05)] h-full flex flex-col">
            <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-bold uppercase tracking-widest text-primary flex items-center gap-2">
                    <Activity className="w-4 h-4" /> System Vitals
                </h3>
                <span className="text-xs font-mono text-emerald-400 animate-pulse">● ONLINE</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 flex-1">
                {/* Visuals: Radar & Line */}
                <div className="flex flex-col gap-2 relative">
                    {/* Radar Chart Background */}
                    <div className="h-40 w-full relative z-10">
                        <ResponsiveContainer width="100%" height="100%">
                            <RadarChart cx="50%" cy="50%" outerRadius="80%" data={MOCK_DATA}>
                                <PolarGrid stroke="#334155" />
                                <PolarAngleAxis dataKey="subject" tick={{ fill: '#94a3b8', fontSize: 10 }} />
                                <PolarRadiusAxis angle={30} domain={[0, 150]} tick={false} axisLine={false} />
                                <Radar
                                    name="System Health"
                                    dataKey="A"
                                    stroke="var(--primary)"
                                    strokeWidth={2}
                                    fill="var(--primary)"
                                    fillOpacity={0.2}
                                />
                            </RadarChart>
                        </ResponsiveContainer>
                    </div>

                    {/* Latency Strip */}
                    <div className="h-12 w-full mt-auto bg-black/20 rounded border border-white/5 p-1">
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={latencyData}>
                                <Line type="monotone" dataKey="value" stroke="#10b981" strokeWidth={2} dot={false} />
                                <YAxis hide domain={[0, 100]} />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Text Log */}
                <div className="bg-black/40 rounded border border-white/5 p-2 font-mono text-xs overflow-hidden flex flex-col relative">
                    <div className="absolute top-0 right-0 p-1">
                        <ShieldCheck className="w-3 h-3 text-emerald-500" />
                    </div>
                    <div className="flex-1 overflow-y-auto custom-scrollbar space-y-1">
                        {MOCK_LOGS.map((log) => (
                            <div key={log.id} className="flex gap-2 opacity-80 hover:opacity-100 transition-opacity">
                                <span className="text-muted-foreground w-12 shrink-0">[{log.time}]</span>
                                <span className={
                                    log.type === 'error' ? 'text-destructive' :
                                        log.type === 'warning' ? 'text-orange-400' :
                                            log.type === 'success' ? 'text-emerald-400' :
                                                'text-cyan-300'
                                }>
                                    {log.type === 'error' ? 'ERR' : log.type === 'warning' ? 'WARN' : 'INFO'}: {log.msg}
                                </span>
                            </div>
                        ))}
                        <div className="text-muted-foreground/50 animate-pulse">_</div>
                    </div>
                </div>
            </div>
        </div>
    );
}
