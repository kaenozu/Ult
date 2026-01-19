
"use client";

import React, { useState, useEffect, useRef } from 'react';
import { Card } from '@/components/ui/card';
import { Zap, Brain, Loader2, Sparkles, AlertTriangle } from 'lucide-react';
import { GlitchText } from '@/components/ui/glitch-text';

export default function EdgeInferenceWidget() {
    // Worker reference
    const worker = useRef<Worker | null>(null);

    // State
    const [status, setStatus] = useState<'loading' | 'ready' | 'analyzing' | 'error'>('loading');
    const [progress, setProgress] = useState<any>(null);
    const [result, setResult] = useState<{ label: string; score: number } | null>(null);
    const [input, setInput] = useState('');
    const [errorMessage, setErrorMessage] = useState<string | null>(null);

    useEffect(() => {
        // Initialize Worker
        if (!worker.current) {
            try {
                // Use public worker file for robustness
                worker.current = new Worker('/edge-worker.js', { type: 'module' });

                worker.current.onmessage = (event) => {
                    const { status, data, result, error } = event.data;

                    if (status === 'alive') {
                        // Worker started
                    } else if (status === 'progress') {
                        setProgress(data);
                        setStatus('loading'); // Still loading model
                    } else if (status === 'complete') {
                        setResult(result[0]); // Pipeline returns array
                        setStatus('ready');
                    } else if (status === 'error') {
                        setErrorMessage(error);
                        setStatus('error');
                    }
                };

                // Set ready after a short delay if no model load is needed immediately or if we want to confirm worker is up
                // Actually, the worker only loads model on first run in our implementation, 
                // but let's assume it's "ready" to accept messages once instantiated.
                setStatus('ready');

            } catch (err) {
                console.error("Worker initialization failed:", err);
                setErrorMessage("Worker init failed. WebWorker not supported?");
                setStatus('error');
            }
        }

        return () => {
            worker.current?.terminate();
        };
    }, []);

    const handleAnalyze = () => {
        if (!worker.current) return;
        setStatus('analyzing');
        setResult(null);
        worker.current.postMessage({ text: input });
    };

    // Calculate Vibe Styles
    const getVibeStyles = () => {
        if (!result) return "border-cyan-500/20 bg-slate-900/50 shadow-none";
        if (result.label === 'POSITIVE') {
            return "border-green-500 bg-green-900/20 shadow-[0_0_50px_-10px_rgba(34,197,94,0.5)] animate-pulse";
        } else {
            return "border-red-500 bg-red-900/20 shadow-[0_0_50px_-10px_rgba(239,68,68,0.5)] animate-pulse";
        }
    };

    return (
        <Card className={`relative overflow-hidden transition-all duration-500 ${getVibeStyles()} p-6`}>
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                    <Brain className="w-5 h-5 text-purple-400" />
                    <h2 className="font-mono text-lg text-white tracking-wider flex items-center gap-2">
                        EDGE_INFERENCE <span className="text-xs text-purple-400 border border-purple-400/30 px-1 rounded">WASM</span>
                    </h2>
                </div>
                {status === 'analyzing' && <Loader2 className="w-4 h-4 text-cyan-400 animate-spin" />}
                {status === 'ready' && <div className="w-2 h-2 bg-green-500 rounded-full shadow-[0_0_10px_rgba(34,197,94,0.8)]" />}
                {status === 'error' && <AlertTriangle className="w-4 h-4 text-red-500" />}
            </div>

            {/* Error Message */}
            {errorMessage && (
                <div className="mb-4 text-xs text-red-400 font-mono bg-red-950/30 p-2 border border-red-500/30 rounded">
                    ERROR: {errorMessage}
                </div>
            )}

            {/* Progress Bar (Model Loading) */}
            {progress && status === 'loading' && (
                <div className="mb-4 space-y-1">
                    <div className="flex justify-between text-xs text-cyan-400 font-mono">
                        <span>LOADING_MODEL: {progress.file}</span>
                        <span>{progress.progress ? Math.round(progress.progress) : 0}%</span>
                    </div>
                    <div className="h-1 bg-slate-800 rounded-full overflow-hidden">
                        <div
                            className="h-full bg-cyan-500 transition-all duration-200"
                            style={{ width: `${progress.progress || 0}%` }}
                        />
                    </div>
                </div>
            )}

            {/* Input Area */}
            <div className="space-y-4">
                <textarea
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder="Enter market news or sentiment text..."
                    className="w-full h-24 bg-slate-950/50 border border-slate-700/50 rounded p-3 text-sm font-mono text-cyan-100 placeholder:text-slate-600 focus:outline-none focus:border-cyan-500/50 transition-colors resize-none"
                    disabled={status === 'analyzing'}
                />

                <button
                    onClick={handleAnalyze}
                    disabled={!input || status === 'analyzing' || status === 'error'}
                    className="w-full py-2 bg-cyan-900/30 border border-cyan-500/30 hover:bg-cyan-500/20 text-cyan-400 font-mono text-sm tracking-wider uppercase transition-all flex items-center justify-center gap-2 group disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    <Zap className="w-4 h-4 group-hover:text-yellow-400 transition-colors" />
                    Analyze Vibe
                </button>
            </div>

            {/* Result Display */}
            {result && (
                <div className="mt-6 text-center animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <div className="text-xs text-slate-400 font-mono mb-1">DETECTED_SENTIMENT</div>
                    <div className="text-3xl font-bold tracking-tighter filter drop-shadow-lg">
                        <GlitchText
                            text={result.label}
                            color={result.label === 'POSITIVE' ? 'green' : 'red'}
                            intensity="high"
                        />
                    </div>
                    <div className="text-xs font-mono mt-2 opacity-70">
                        CONFIDENCE: {(result.score * 100).toFixed(2)}%
                    </div>
                </div>
            )}
        </Card>
    );
}
