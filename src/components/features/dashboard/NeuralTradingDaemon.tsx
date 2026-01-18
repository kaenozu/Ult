"use client";

import React from "react";
import { Zap, Activity, BrainCircuit } from "lucide-react";
import { useNeuralStore } from "@/lib/store/neuralStore";

export default function NeuralTradingDaemon() {
  const { latestThought, sentimentScore, sentimentLabel } = useNeuralStore();

  // Mock calculation of multiplier for visualization
  // In real app, this should come from WS "ACTION" message details
  const neuralMultiplier = sentimentScore > 0 ? 1.0 + (sentimentScore * 0.1) : 1.0;
  const kellyFraction = sentimentScore > 0.8 ? "80%" : "50%";

  return (
    <div className="glass-panel p-6 rounded-xl border-cyan-500/20 shadow-[0_0_15px_rgba(6,182,212,0.1)] relative overflow-hidden">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-lg border ${sentimentLabel === 'POSITIVE' ? 'bg-cyan-500/10 border-cyan-500/30' : 'bg-rose-500/10 border-rose-500/30'}`}>
            <BrainCircuit className={`w-5 h-5 ${sentimentLabel === 'POSITIVE' ? 'text-cyan-400' : 'text-rose-400'}`} />
          </div>
          <div>
            <h3 className="text-lg font-bold uppercase tracking-widest text-cyan-500">
              Neural Daemon
            </h3>
            <span className="text-xs text-cyan-400/60 font-mono">
              SENTIMENT-DRIVEN EXECUTION
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Activity className="w-4 h-4 text-cyan-500 animate-pulse" />
          <span className="text-xs font-mono text-cyan-500">ACTIVE</span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="bg-black/30 p-3 rounded border border-white/5">
          <span className="text-[10px] text-muted-foreground uppercase">Neural Multiplier</span>
          <div className="text-2xl font-mono font-bold text-cyan-400">
            x{neuralMultiplier.toFixed(2)}
          </div>
          <div className="text-[10px] text-cyan-500/50 mt-1">
            Adjusting position size based on {sentimentLabel} conviction.
          </div>
        </div>

        <div className="bg-black/30 p-3 rounded border border-white/5">
          <span className="text-[10px] text-muted-foreground uppercase">Kelly Fraction</span>
          <div className="text-2xl font-mono font-bold text-emerald-400">
            {kellyFraction}
          </div>
          <div className="text-[10px] text-emerald-500/50 mt-1">
            Risk allocation per trade.
          </div>
        </div>
      </div>

      <div className="mt-4 pt-4 border-t border-white/5">
        <div className="flex justify-between items-center text-xs font-mono text-muted-foreground mb-2">
          <span>LATEST INSTRUCTION</span>
          <span>{new Date().toLocaleTimeString()}</span>
        </div>
        <div className="font-mono text-sm text-cyan-100/80 bg-cyan-950/30 p-2 rounded border border-cyan-500/20">
          {">"} {latestThought}
        </div>
      </div>

    </div>
  );
}
