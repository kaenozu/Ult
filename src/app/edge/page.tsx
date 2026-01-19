
import React from 'react';
import EdgeInferenceWidget from '@/components/features/edge/EdgeInferenceWidget';

export default function EdgePilotPage() {
    return (
        <div className="min-h-screen bg-black text-white p-8 font-mono">
            <div className="max-w-4xl mx-auto space-y-8">
                <header className="border-b border-green-500/30 pb-4 mb-8">
                    <h1 className="text-3xl font-bold text-green-400 mb-2">
                        &gt; EDGE_INFERENCE_PILOT
                    </h1>
                    <p className="text-slate-400">
                        Running quantized Transformer models directly in your browser.
                        <span className="ml-2 text-xs border border-yellow-500/30 text-yellow-500 px-2 py-0.5 rounded">
                            EXPERIMENTAL
                        </span>
                    </p>
                </header>

                <section className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {/* Left: The Widget */}
                    <div>
                        <h2 className="text-xl text-cyan-400 mb-4 flex items-center gap-2">
                            <span className="w-2 h-2 bg-cyan-500 rounded-full"></span>
                            Live Widget
                        </h2>
                        <EdgeInferenceWidget />
                    </div>

                    {/* Right: Explainer */}
                    <div className="space-y-6 text-sm text-slate-300">
                        <div className="p-4 border border-slate-800 bg-slate-900/50 rounded">
                            <h3 className="text-purple-400 font-bold mb-2">Architecture</h3>
                            <ul className="list-disc pl-4 space-y-2 marker:text-purple-500">
                                <li>
                                    **Engine:** ONNX Runtime via WebAssembly (WASM)
                                </li>
                                <li>
                                    **Model:** DistilBERT (Quantized, ~40MB)
                                </li>
                                <li>
                                    **Privacy:** 100% Client-side. No data leaves your device.
                                </li>
                            </ul>
                        </div>

                        <div className="p-4 border border-slate-800 bg-slate-900/50 rounded">
                            <h3 className="text-green-400 font-bold mb-2">Why Edge?</h3>
                            <p>
                                By moving inference to the client, we achieve zero-latency feedback loops
                                for high-frequency interactions (e.g., typing indicators, real-time news filtering)
                                without costing server GPU cycles.
                            </p>
                        </div>
                    </div>
                </section>
            </div>
        </div>
    );
}
