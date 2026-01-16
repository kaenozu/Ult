'use client';

import React from 'react';
import { Wallet } from 'lucide-react';

export default function PortfolioPage() {
    return (
        <div className="space-y-6">
            <header className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-primary/10 rounded-lg border border-primary/20">
                        <Wallet className="w-6 h-6 text-primary" />
                    </div>
                    <h1 className="text-2xl font-bold tracking-tight text-white/90">
                        PORTFOLIO <span className="text-primary neon-text">LEDGER</span>
                    </h1>
                </div>
            </header>

            <div className="glass-panel p-12 rounded-xl flex flex-col items-center justify-center min-h-[400px] text-center space-y-4">
                <div className="w-16 h-16 rounded-full bg-white/5 border border-white/10 flex items-center justify-center animate-pulse">
                    <Wallet className="w-8 h-8 text-muted-foreground" />
                </div>
                <h2 className="text-xl font-mono text-muted-foreground">NO POSITIONS DETECTED</h2>
                <p className="text-sm text-muted-foreground/50 max-w-sm">
                    Your portfolio is currently empty. Initialize the system or execute trades to populate the ledger.
                </p>
            </div>
        </div>
    );
}
