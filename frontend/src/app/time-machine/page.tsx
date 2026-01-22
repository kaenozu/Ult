
"use client";

import React, { useState, useEffect } from "react";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from "recharts";

// Mock Data for when API is not connected
const MOCK_DATA = [
  { date: "2023-01", value: 100 },
  { date: "2023-02", value: 105 },
  { date: "2023-03", value: 102 },
  { date: "2023-04", value: 108 },
];

export default function TimeMachinePage() {
  const [activeTab, setActiveTab] = useState("stress-test");

  // Stress Test State
  const [ticker, setTicker] = useState("7203.T");
  const [packetLoss, setPacketLoss] = useState(0.0);
  const [slippage, setSlippage] = useState(0.0);
  const [simResults, setSimResults] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Replay State
  const [tradeHistory, setTradeHistory] = useState<any[]>([]);
  const [selectedTrade, setSelectedTrade] = useState<any>(null);

  useEffect(() => {
    // Fetch initial history on load
    fetchTradeHistory();
  }, []);

  const fetchTradeHistory = async () => {
    try {
      const res = await fetch("http://localhost:8000/api/v1/replay/history?limit=20");
      if (res.ok) {
        const data = await res.json();
        setTradeHistory(data);
      }
    } catch (e) {
      console.error("Failed to fetch history", e);
    }
  };

  const runSimulation = async () => {
    setLoading(true);
    setError("");
    setSimResults(null);
    try {
      const res = await fetch("http://localhost:8000/api/v1/replay/simulate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ticker: ticker,
          days: 90,
          chaos: {
            packet_loss_prob: Number(packetLoss),
            slippage_std_dev: Number(slippage)
          }
        })
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail || "Simulation failed");
      }

      const data = await res.json();
      setSimResults(data);

    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Helper to merge baseline and chaos curves for Chart
  const getChartData = () => {
    if (!simResults) return [];

    // Assume both curves have same dates/length for simplicity or map by date
    // Curve format: [{date: "...", value: 1.0}, ...]

    const baseline = simResults.baseline.curve || [];
    const chaos = simResults.chaos.curve || [];

    const map = new Map();

    baseline.forEach((p: any) => {
       map.set(p.date, { date: p.date.split("T")[0], baseline: p.value });
    });

    chaos.forEach((p: any) => {
       if (map.has(p.date)) {
           map.get(p.date).chaos = p.value;
       } else {
           map.set(p.date, { date: p.date.split("T")[0], chaos: p.value });
       }
    });

    return Array.from(map.values()).sort((a, b) => a.date.localeCompare(b.date));
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white p-8 font-sans">
      <header className="mb-8">
        <h1 className="text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 to-purple-500">
          The Time Machine ⏳
        </h1>
        <p className="text-gray-400 mt-2">
          Advanced Simulation & Trade Replay Environment
        </p>
      </header>

      {/* Tabs */}
      <div className="flex border-b border-gray-700 mb-6">
        <button
          className={`px-6 py-3 font-medium transition-colors ${
            activeTab === "stress-test"
              ? "border-b-2 border-cyan-400 text-cyan-400"
              : "text-gray-500 hover:text-white"
          }`}
          onClick={() => setActiveTab("stress-test")}
        >
          🛡️ Stress Test Lab (The Shield)
        </button>
        <button
          className={`px-6 py-3 font-medium transition-colors ${
            activeTab === "replay"
              ? "border-b-2 border-purple-400 text-purple-400"
              : "text-gray-500 hover:text-white"
          }`}
          onClick={() => setActiveTab("replay")}
        >
          📽️ Trade Replay (The Cinema)
        </button>
      </div>

      {/* Tab Content: Stress Test */}
      {activeTab === "stress-test" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Controls */}
          <div className="lg:col-span-1 bg-gray-800 p-6 rounded-lg border border-gray-700">
            <h2 className="text-xl font-semibold mb-4 text-cyan-300">Chaos Configuration</h2>

            <div className="mb-4">
              <label className="block text-sm text-gray-400 mb-1">Ticker Symbol</label>
              <input
                type="text"
                value={ticker}
                onChange={(e) => setTicker(e.target.value)}
                className="w-full bg-gray-700 border border-gray-600 rounded p-2 focus:ring-2 focus:ring-cyan-500 outline-none"
              />
            </div>

            <div className="mb-4">
              <label className="block text-sm text-gray-400 mb-1">
                Packet Loss Probability: {(packetLoss * 100).toFixed(0)}%
              </label>
              <input
                type="range"
                min="0" max="0.5" step="0.05"
                value={packetLoss}
                onChange={(e) => setPacketLoss(Number(e.target.value))}
                className="w-full h-2 bg-gray-600 rounded-lg appearance-none cursor-pointer"
              />
              <p className="text-xs text-gray-500 mt-1">Simulates dropped orders/signals.</p>
            </div>

            <div className="mb-6">
              <label className="block text-sm text-gray-400 mb-1">
                Slippage Volatility: {(slippage * 100).toFixed(0)}%
              </label>
              <input
                type="range"
                min="0" max="0.2" step="0.01"
                value={slippage}
                onChange={(e) => setSlippage(Number(e.target.value))}
                className="w-full h-2 bg-gray-600 rounded-lg appearance-none cursor-pointer"
              />
              <p className="text-xs text-gray-500 mt-1">Simulates erratic execution prices.</p>
            </div>

            <button
              onClick={runSimulation}
              disabled={loading}
              className={`w-full py-3 rounded font-bold text-black transition-transform transform active:scale-95 ${
                 loading ? "bg-gray-500 cursor-not-allowed" : "bg-cyan-400 hover:bg-cyan-300"
              }`}
            >
              {loading ? "Simulating..." : "RUN SIMULATION ⚡"}
            </button>

            {error && (
              <div className="mt-4 p-3 bg-red-900/50 border border-red-500 text-red-200 text-sm rounded">
                Error: {error}
              </div>
            )}
          </div>

          {/* Results */}
          <div className="lg:col-span-2 bg-gray-800 p-6 rounded-lg border border-gray-700">
             <h2 className="text-xl font-semibold mb-4 text-white">Simulation Results</h2>

             {simResults ? (
               <div className="h-full">
                  <div className="grid grid-cols-2 gap-4 mb-6">
                     <div className="bg-gray-700/50 p-4 rounded border border-gray-600">
                        <h3 className="text-sm text-gray-400">Baseline Return</h3>
                        <p className="text-2xl font-bold text-green-400">
                          {(simResults.baseline.total_return * 100).toFixed(2)}%
                        </p>
                        <p className="text-xs text-gray-400">Sharpe: {simResults.baseline.sharpe.toFixed(2)}</p>
                     </div>
                     <div className="bg-gray-700/50 p-4 rounded border border-gray-600">
                        <h3 className="text-sm text-gray-400">Chaos Return</h3>
                        <p className={`text-2xl font-bold ${
                            simResults.chaos.total_return < simResults.baseline.total_return
                            ? "text-red-400" : "text-yellow-400"
                        }`}>
                          {(simResults.chaos.total_return * 100).toFixed(2)}%
                        </p>
                        <p className="text-xs text-gray-400">Sharpe: {simResults.chaos.sharpe.toFixed(2)}</p>
                     </div>
                  </div>

                  <div className="h-80 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={getChartData()}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                        <XAxis dataKey="date" stroke="#9CA3AF" />
                        <YAxis stroke="#9CA3AF" />
                        <Tooltip
                          contentStyle={{ backgroundColor: "#1F2937", borderColor: "#374151", color: "#F3F4F6" }}
                        />
                        <Legend />
                        <Line type="monotone" dataKey="baseline" stroke="#34D399" strokeWidth={2} name="Baseline" dot={false} />
                        <Line type="monotone" dataKey="chaos" stroke="#F87171" strokeWidth={2} name="Chaos" dot={false} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
               </div>
             ) : (
               <div className="flex flex-col items-center justify-center h-64 text-gray-500 border-2 border-dashed border-gray-700 rounded-lg">
                  <p className="mb-2">No simulation run yet.</p>
                  <p className="text-sm">Configure parameters and hit RUN.</p>
               </div>
             )}
          </div>
        </div>
      )}

      {/* Tab Content: Replay */}
      {activeTab === "replay" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
           <div className="lg:col-span-1 bg-gray-800 rounded-lg border border-gray-700 overflow-hidden flex flex-col h-[600px]">
              <div className="p-4 bg-gray-700 border-b border-gray-600">
                 <h3 className="font-bold text-white">Recent Trades</h3>
              </div>
              <div className="flex-1 overflow-y-auto p-2 space-y-2">
                 {tradeHistory.map((trade: any, i) => (
                    <div
                      key={i}
                      onClick={() => setSelectedTrade(trade)}
                      className={`p-3 rounded cursor-pointer transition-colors ${
                         selectedTrade === trade ? "bg-purple-900/50 border border-purple-500" : "bg-gray-700/30 hover:bg-gray-700"
                      }`}
                    >
                       <div className="flex justify-between items-center mb-1">
                          <span className="font-bold text-white">{trade.ticker}</span>
                          <span className={`px-2 py-0.5 rounded text-xs font-bold ${
                             trade.action === "BUY" ? "bg-green-900 text-green-300" : "bg-red-900 text-red-300"
                          }`}>
                             {trade.action}
                          </span>
                       </div>
                       <div className="flex justify-between text-xs text-gray-400">
                          <span>{trade.quantity} @ {trade.price}</span>
                          <span>{new Date(trade.timestamp).toLocaleDateString()}</span>
                       </div>
                    </div>
                 ))}
                 {tradeHistory.length === 0 && (
                    <div className="p-4 text-center text-gray-500">No history found.</div>
                 )}
              </div>
           </div>

           <div className="lg:col-span-2 bg-gray-800 p-6 rounded-lg border border-gray-700">
              {selectedTrade ? (
                 <div>
                    <div className="flex items-center justify-between mb-6">
                       <h2 className="text-2xl font-bold text-white">
                          Trade Analysis: {selectedTrade.ticker}
                       </h2>
                       <span className="text-gray-400 text-sm">
                          ID: {selectedTrade.id || "N/A"}
                       </span>
                    </div>

                    <div className="grid grid-cols-2 gap-6 mb-8">
                       <div className="bg-black/30 p-4 rounded border border-gray-700">
                          <h4 className="text-xs text-gray-400 uppercase mb-2">Execution Details</h4>
                          <p><strong>Action:</strong> {selectedTrade.action}</p>
                          <p><strong>Price:</strong> {selectedTrade.price}</p>
                          <p><strong>Quantity:</strong> {selectedTrade.quantity}</p>
                          <p><strong>Total Value:</strong> {(selectedTrade.price * selectedTrade.quantity).toLocaleString()}</p>
                          <p><strong>Strategy:</strong> {selectedTrade.strategy_name || "Manual"}</p>
                       </div>

                       <div className="bg-purple-900/20 p-4 rounded border border-purple-500/30 relative">
                          <h4 className="text-xs text-purple-300 uppercase mb-2">AI Thought Process 🧠</h4>
                          {selectedTrade.thought_context ? (
                             <pre className="text-xs text-gray-300 overflow-auto max-h-40 whitespace-pre-wrap">
                                {JSON.stringify(selectedTrade.thought_context, null, 2)}
                             </pre>
                          ) : (
                             <div className="flex items-center justify-center h-32 text-gray-500 italic">
                                No thought context available for this trade.
                             </div>
                          )}
                       </div>
                    </div>

                    <div className="bg-gray-900 h-64 rounded border border-gray-700 flex items-center justify-center">
                       <p className="text-gray-500">
                          [Chart Snapshot Placeholder: {selectedTrade.ticker} at {selectedTrade.timestamp}]
                       </p>
                    </div>
                 </div>
              ) : (
                 <div className="flex flex-col items-center justify-center h-full text-gray-500">
                    <p className="text-lg">Select a trade to inspect details.</p>
                 </div>
              )}
           </div>
        </div>
      )}
    </div>
  );
}
