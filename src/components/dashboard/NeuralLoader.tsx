import React from 'react';
import { BrainCircuit, Radio } from 'lucide-react';

export default function NeuralLoader() {
    return (
        <div className="flex flex-col items-center justify-center min-h-[400px] w-full bg-black/20 rounded-xl border border-white/5 backdrop-blur-sm">
            <div className="relative mr-4">
                {/* Core Ring */}
                <div className="w-24 h-24 border-4 border-cyan-500/20 rounded-full animate-[spin_3s_linear_infinite]" />

                {/* Inner Ring Reverse */}
                <div className="absolute top-2 left-2 w-20 h-20 border-4 border-fuchsia-500/20 rounded-full animate-[spin_4s_linear_infinite_reverse] border-t-transparent" />

                {/* Pulse Ring */}
                <div className="absolute top-0 left-0 w-24 h-24 border-2 border-cyan-400/50 rounded-full animate-ping opacity-20" />

                {/* Center Icon */}
                <div className="absolute inset-0 flex items-center justify-center">
                    <BrainCircuit className="w-8 h-8 text-cyan-400 animate-pulse" />
                </div>
            </div>

            <div className="mt-8 text-center space-y-2">
                <h3 className="text-xl font-bold tracking-[0.2em] text-cyan-400 neon-text animate-pulse">
                    NEURAL DIVE
                </h3>
                <div className="flex items-center justify-center gap-2 text-xs text-fuchsia-400/70 font-mono">
                    <Radio className="w-3 h-3 animate-bounce" />
                    <span>SYNCHRONIZING MARKET DATA STREAMS...</span>
                </div>
            </div>

            {/* Decorative Lines */}
            <div className="mt-6 flex gap-1">
                <div className="w-16 h-1 bg-cyan-500/50 rounded-full animate-[pulse_1s_ease-in-out_infinite]" />
                <div className="w-4 h-1 bg-fuchsia-500/50 rounded-full animate-[pulse_1.5s_ease-in-out_infinite]" />
                <div className="w-16 h-1 bg-cyan-500/50 rounded-full animate-[pulse_1s_ease-in-out_infinite]" />
            </div>
        </div>
    );
}
