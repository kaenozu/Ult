'use client';

import React from 'react';
import { BarChart3 } from 'lucide-react';

export default function MarketPage() {
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

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {[1, 2, 3].map((i) => (
                    <div key={i} className="glass-panel p-6 rounded-xl border-white/5 hover:border-cyan-500/30 transition-colors group">
                        <div className="flex justify-between items-start mb-4">
                            <div className="w-12 h-12 bg-black/40 rounded flex items-center justify-center font-mono text-xs text-muted-foreground group-hover:text-cyan-400">
                                720{i}.T
                            </div>
                            <span className="text-xs font-mono text-emerald-400">+1.2%</span>
                        </div>
                        <h3 className="font-bold text-lg mb-1">Toyota Motor Corp</h3>
                        <p className="text-xs text-muted-foreground">Automotive / Manufacturing</p>

                        <div className="mt-4 h-1 bg-white/5 rounded-full overflow-hidden">
                            <div className="h-full w-2/3 bg-cyan-500/50"></div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
