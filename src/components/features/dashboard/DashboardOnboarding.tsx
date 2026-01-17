'use client';

import React, { useState } from 'react';
import { Power, ShieldCheck, Zap } from 'lucide-react';

export default function DashboardOnboarding() {
    const [loading, setLoading] = useState(false);

    const handleInitialize = async () => {
        setLoading(true);
        try {
            // Call API to reset/initialize portfolio
            // Assuming endpoint exists or we mock it for the vibe check
            // Call API to reset/initialize portfolio
            const res = await fetch('http://localhost:8000/api/v1/settings/reset-portfolio', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ initial_capital: 10000000 })
            });
            if (res.ok) {
                window.location.reload();
            } else {
                console.error("Failed to initialize");
            }
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex flex-col items-center justify-center h-[60vh] text-center space-y-8 animate-fade-in">

            {/* Holographic Logo/Icon */}
            <div className="relative w-32 h-32 flex items-center justify-center">
                <div className="absolute inset-0 border-2 border-dashed border-primary/30 rounded-full animate-spin-slow"></div>
                <div className="absolute inset-2 border border-primary/20 rounded-full"></div>
                <Power className="w-16 h-16 text-primary neon-text animate-pulse" />
            </div>

            <div className="space-y-2 max-w-md">
                <h1 className="text-3xl font-bold tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-primary via-cyan-400 to-primary animate-shine bg-[length:200%_auto]">
                    SYSTEM STANDBY
                </h1>
                <p className="text-muted-foreground font-mono text-sm leading-relaxed">
                    NO ACTIVE NEURAL PATHWAYS DETECTED.<br />
                    CAPITAL INJECTION REQUIRED TO ESTABLISH LINK.
                </p>
            </div>

            <div className="grid grid-cols-2 gap-4 text-xs font-mono text-muted-foreground/50 w-full max-w-sm">
                <div className="flex items-center gap-2 justify-center border border-white/5 p-2 rounded bg-black/20">
                    <ShieldCheck className="w-4 h-4" />
                    SECURE CONNECTION
                </div>
                <div className="flex items-center gap-2 justify-center border border-white/5 p-2 rounded bg-black/20">
                    <Zap className="w-4 h-4" />
                    INSTANT EXECUTION
                </div>
            </div>

            <button
                onClick={handleInitialize}
                disabled={loading}
                className="group relative px-8 py-4 bg-primary/10 hover:bg-primary/20 border border-primary/50 hover:border-primary/80 text-primary rounded-xl transition-all duration-300 overflow-hidden"
            >
                {/* Button Glow Effect */}
                <div className="absolute inset-0 bg-primary/20 blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>

                <span className="relative z-10 font-bold tracking-widest flex items-center gap-2">
                    {loading ? (
                        <>
                            <span className="animate-spin">⟳</span> INITIALIZING...
                        </>
                    ) : (
                        <>
                            <Power className="w-4 h-4" /> INITIALIZE SYSTEM [¥10M]
                        </>
                    )}
                </span>
            </button>

            <div className="text-[10px] text-muted-foreground/30 font-mono">
                G.H.O.S.T PROTOCOL v3.2 READY
            </div>
        </div>
    );
}
