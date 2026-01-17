"use client";

import React, { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import {
  Brain,
  Zap,
  Activity,
  Network,
  Eye,
  TrendingUp,
  AlertTriangle,
} from "lucide-react";

interface ThoughtNode {
  id: string;
  text: string;
  confidence: number;
  category: "analysis" | "prediction" | "risk" | "opportunity";
  timestamp: Date;
  connections?: string[];
  keywords?: string[];
}

interface NeuralActivity {
  layer: number;
  activation: number;
  pattern: number[];
}

export default function VisualThinking() {
  const [thoughts, setThoughts] = useState<ThoughtNode[]>([]);
  const [currentThought, setCurrentThought] = useState<string>("");
  const [isThinking, setIsThinking] = useState<boolean>(false);
  const [neuralActivity, setNeuralActivity] = useState<NeuralActivity[]>([]);
  const [decisionPath, setDecisionPath] = useState<string[]>([]);

  // Simulate AI thinking process
  useEffect(() => {
    const thinkingInterval = setInterval(() => {
      if (!isThinking) return;

      // Generate random thought
      const thoughtTemplates = [
        {
          text: "Analyzing market sentiment...",
          category: "analysis" as const,
          keywords: ["sentiment", "market"],
        },
        {
          text: "Detecting unusual volume patterns",
          category: "risk" as const,
          keywords: ["volume", "anomaly"],
        },
        {
          text: "Calculating entry probability",
          category: "prediction" as const,
          keywords: ["entry", "probability"],
        },
        {
          text: "Identifying arbitrage opportunity",
          category: "opportunity" as const,
          keywords: ["arbitrage", "spread"],
        },
        {
          text: "Cross-referencing news feeds",
          category: "analysis" as const,
          keywords: ["news", "correlation"],
        },
        {
          text: "Risk threshold assessment",
          category: "risk" as const,
          keywords: ["risk", "threshold"],
        },
        {
          text: "Momentum divergence detected",
          category: "opportunity" as const,
          keywords: ["momentum", "divergence"],
        },
        {
          text: "Volatility expansion forecast",
          category: "prediction" as const,
          keywords: ["volatility", "forecast"],
        },
      ];

      const template =
        thoughtTemplates[Math.floor(Math.random() * thoughtTemplates.length)];
      const newThought: ThoughtNode = {
        id: Date.now().toString(),
        text: template.text,
        confidence: Math.random() * 0.4 + 0.6,
        category: template.category,
        timestamp: new Date(),
        keywords: template.keywords,
        connections: thoughts.slice(-2).map((t) => t.id),
      };

      setThoughts((prev) => [...prev.slice(-8), newThought]);
      setCurrentThought(template.text);

      // Update decision path
      if (Math.random() > 0.6) {
        setDecisionPath((prev) => [...prev.slice(-4), template.category]);
      }

      // Clear current thought after display
      setTimeout(() => setCurrentThought(""), 2000);
    }, 1500);

    return () => clearInterval(thinkingInterval);
  }, [isThinking, thoughts]);

  // Simulate neural network activity
  useEffect(() => {
    const neuralInterval = setInterval(() => {
      if (!isThinking) return;

      const layers = 4;
      const activity: NeuralActivity[] = [];

      for (let i = 0; i < layers; i++) {
        activity.push({
          layer: i,
          activation: Math.random(),
          pattern: Array(8)
            .fill(0)
            .map(() => Math.random()),
        });
      }

      setNeuralActivity(activity);
    }, 100);

    return () => clearInterval(neuralInterval);
  }, [isThinking]);

  const getCategoryColor = (category: ThoughtNode["category"]) => {
    switch (category) {
      case "analysis":
        return "text-blue-400 border-blue-500/50 bg-blue-500/10";
      case "prediction":
        return "text-emerald-400 border-emerald-500/50 bg-emerald-500/10";
      case "risk":
        return "text-red-400 border-red-500/50 bg-red-500/10";
      case "opportunity":
        return "text-yellow-400 border-yellow-500/50 bg-yellow-500/10";
    }
  };

  const getCategoryIcon = (category: ThoughtNode["category"]) => {
    switch (category) {
      case "analysis":
        return <Activity className="w-4 h-4" />;
      case "prediction":
        return <TrendingUp className="w-4 h-4" />;
      case "risk":
        return <AlertTriangle className="w-4 h-4" />;
      case "opportunity":
        return <Zap className="w-4 h-4" />;
    }
  };

  return (
    <Card className="p-6 border border-cyan-500/30 bg-black/40 backdrop-blur-md relative overflow-hidden">
      {/* Background grid effect */}
      <div className="absolute inset-0 opacity-10">
        <div className="grid grid-cols-12 grid-rows-6 h-full">
          {Array(72)
            .fill(0)
            .map((_, i) => (
              <div key={i} className="border border-cyan-500/20" />
            ))}
        </div>
      </div>

      {/* Header */}
      <div className="relative z-10 flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div
            className={`p-2 rounded-full border ${isThinking ? "border-cyan-400 bg-cyan-400/20 animate-pulse" : "border-gray-600"}`}
          >
            <Brain className="w-5 h-5 text-cyan-400" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-white">NEURAL THINKING</h3>
            <p className="text-xs text-gray-400">
              Real-time AI reasoning visualization
            </p>
          </div>
        </div>

        <button
          onClick={() => setIsThinking(!isThinking)}
          className={`px-4 py-2 rounded-lg text-sm font-mono transition-all ${
            isThinking
              ? "bg-cyan-500/20 border border-cyan-400 text-cyan-400 hover:bg-cyan-500/30"
              : "bg-gray-800 border border-gray-600 text-gray-400 hover:border-gray-500"
          }`}
        >
          {isThinking ? "THINKING" : "IDLE"}
        </button>
      </div>

      {/* Current Thought Display */}
      {isThinking && currentThought && (
        <div className="relative z-10 mb-6 p-4 rounded-lg border border-cyan-500/30 bg-gradient-to-r from-cyan-500/10 to-transparent animate-pulse">
          <div className="flex items-center gap-2">
            <Eye className="w-4 h-4 text-cyan-400" />
            <span className="text-cyan-300 font-mono text-sm">
              {currentThought}
            </span>
          </div>
        </div>
      )}

      {/* Neural Network Visualization */}
      {isThinking && (
        <div className="relative z-10 mb-6 p-4 rounded-lg border border-purple-500/30 bg-purple-500/5">
          <div className="flex items-center gap-2 mb-3">
            <Network className="w-4 h-4 text-purple-400" />
            <span className="text-purple-300 text-xs font-mono">
              NEURAL ACTIVITY
            </span>
          </div>
          <div className="flex gap-2 justify-center">
            {neuralActivity.map((layer, i) => (
              <div key={i} className="flex flex-col gap-1">
                {layer.pattern.map((activation, j) => (
                  <div
                    key={j}
                    className="w-2 h-2 rounded-full transition-all duration-100"
                    style={{
                      backgroundColor: `rgba(168, 85, 247, ${activation})`,
                      boxShadow:
                        activation > 0.7
                          ? `0 0 8px rgba(168, 85, 247, ${activation})`
                          : "none",
                    }}
                  />
                ))}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Decision Path */}
      {decisionPath.length > 0 && (
        <div className="relative z-10 mb-6">
          <div className="flex items-center gap-2 mb-3">
            <Zap className="w-4 h-4 text-yellow-400" />
            <span className="text-yellow-300 text-xs font-mono">
              DECISION PATH
            </span>
          </div>
          <div className="flex gap-2 flex-wrap">
            {decisionPath.map((path, i) => (
              <span
                key={i}
                className={`px-2 py-1 rounded text-xs font-mono border ${
                  path === "analysis"
                    ? "border-blue-400/30 text-blue-400"
                    : path === "prediction"
                      ? "border-emerald-400/30 text-emerald-400"
                      : path === "risk"
                        ? "border-red-400/30 text-red-400"
                        : "border-yellow-400/30 text-yellow-400"
                }`}
              >
                {path}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Thought Stream */}
      <div className="relative z-10">
        <div className="flex items-center gap-2 mb-3">
          <Activity className="w-4 h-4 text-cyan-400" />
          <span className="text-cyan-300 text-xs font-mono">
            THOUGHT STREAM
          </span>
        </div>
        <div className="space-y-2 max-h-60 overflow-y-auto">
          {thoughts.map((thought) => (
            <div
              key={thought.id}
              className={`p-3 rounded-lg border transition-all duration-300 ${getCategoryColor(thought.category)}`}
            >
              <div className="flex items-start gap-2">
                <div className="mt-0.5">
                  {getCategoryIcon(thought.category)}
                </div>
                <div className="flex-1">
                  <p className="text-sm text-white font-medium">
                    {thought.text}
                  </p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-xs opacity-60">
                      {(thought.confidence * 100).toFixed(0)}% confidence
                    </span>
                    {thought.keywords &&
                      thought.keywords.map((keyword, i) => (
                        <span key={i} className="text-xs opacity-40">
                          #{keyword}
                        </span>
                      ))}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* No thinking state */}
      {!isThinking && thoughts.length === 0 && (
        <div className="relative z-10 flex flex-col items-center justify-center py-12 text-gray-500">
          <Brain className="w-12 h-12 mb-3 opacity-50" />
          <p className="text-sm font-mono">NEURAL NETWORK IDLE</p>
          <p className="text-xs opacity-60">
            Click THINKING to activate AI reasoning
          </p>
        </div>
      )}
    </Card>
  );
}
