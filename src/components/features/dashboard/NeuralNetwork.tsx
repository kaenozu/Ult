"use client";

import React, { useState, useEffect, useRef } from "react";
import { Card } from "@/components/ui/card";
import { Brain, Zap, Activity, Cpu } from "lucide-react";

interface Neuron {
  id: string;
  layer: number;
  x: number;
  y: number;
  activation: number;
  type: "input" | "hidden" | "output";
  label?: string;
}

interface Connection {
  from: string;
  to: string;
  weight: number;
  active: boolean;
}

export default function NeuralNetwork() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [neurons, setNeurons] = useState<Neuron[]>([]);
  const [connections, setConnections] = useState<Connection[]>([]);
  const [dataFlow, setDataFlow] = useState<
    { x: number; y: number; target: string; progress: number }[]
  >([]);

  // Initialize neural network structure
  useEffect(() => {
    const layers = [4, 6, 5, 3]; // Input, Hidden1, Hidden2, Output
    const newNeurons: Neuron[] = [];
    const newConnections: Connection[] = [];

    let neuronId = 0;
    layers.forEach((neuronCount, layerIndex) => {
      const layerType =
        layerIndex === 0
          ? "input"
          : layerIndex === layers.length - 1
            ? "output"
            : "hidden";

      for (let i = 0; i < neuronCount; i++) {
        const neuron: Neuron = {
          id: `neuron-${neuronId}`,
          layer: layerIndex,
          x: (layerIndex / (layers.length - 1)) * 400 + 50,
          y: ((i + 1) / (neuronCount + 1)) * 300 + 50,
          activation: Math.random() * 0.3,
          type: layerType,
          label:
            layerType === "input"
              ? ["Price", "Volume", "RSI", "News"][i]
              : layerType === "output"
                ? ["Buy", "Hold", "Sell"][i]
                : undefined,
        };
        newNeurons.push(neuron);
        neuronId++;
      }
    });

    // Create connections
    for (let l = 0; l < layers.length - 1; l++) {
      const currentLayer = newNeurons.filter((n) => n.layer === l);
      const nextLayer = newNeurons.filter((n) => n.layer === l + 1);

      currentLayer.forEach((fromNeuron) => {
        nextLayer.forEach((toNeuron) => {
          newConnections.push({
            from: fromNeuron.id,
            to: toNeuron.id,
            weight: Math.random() * 2 - 1,
            active: false,
          });
        });
      });
    }

    setNeurons(newNeurons);
    setConnections(newConnections);
  }, []);

  // Animate neural network processing
  useEffect(() => {
    if (!isProcessing) return;

    const processingInterval = setInterval(() => {
      // Update neuron activations
      setNeurons((prev) =>
        prev.map((neuron) => {
          if (neuron.type === "input") {
            return { ...neuron, activation: Math.random() * 0.8 + 0.2 };
          }
          return {
            ...neuron,
            activation: Math.max(
              0.1,
              Math.min(1, neuron.activation + (Math.random() - 0.5) * 0.3),
            ),
          };
        }),
      );

      // Update connections
      setConnections((prev) =>
        prev.map((conn) => ({
          ...conn,
          active: Math.random() > 0.7,
          weight: Math.max(
            -1,
            Math.min(1, conn.weight + (Math.random() - 0.5) * 0.1),
          ),
        })),
      );

      // Create data flow particles
      setDataFlow((prev) => {
        const activeConnections = connections.filter(
          (c) => Math.random() > 0.8,
        );
        const newParticles = activeConnections.map((conn) => {
          const fromNeuron = neurons.find((n) => n.id === conn.from);
          return {
            x: fromNeuron?.x || 0,
            y: fromNeuron?.y || 0,
            target: conn.to,
            progress: 0,
          };
        });

        // Update existing particles
        const updated = prev
          .map((p) => ({
            ...p,
            progress: p.progress + 0.05,
          }))
          .filter((p) => p.progress < 1);

        return [...updated, ...newParticles];
      });
    }, 100);

    return () => clearInterval(processingInterval);
  }, [isProcessing, connections, neurons]);

  // Draw on canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Draw connections
      connections.forEach((conn) => {
        const fromNeuron = neurons.find((n) => n.id === conn.from);
        const toNeuron = neurons.find((n) => n.id === conn.to);
        if (!fromNeuron || !toNeuron) return;

        ctx.beginPath();
        ctx.moveTo(fromNeuron.x, fromNeuron.y);
        ctx.lineTo(toNeuron.x, toNeuron.y);

        const opacity = conn.active ? 0.8 : 0.1;
        const color = conn.weight > 0 ? "168, 85, 247" : "239, 68, 68";
        ctx.strokeStyle = `rgba(${color}, ${opacity})`;
        ctx.lineWidth = Math.abs(conn.weight) * 2;
        ctx.stroke();
      });

      // Draw data flow particles
      dataFlow.forEach((particle) => {
        const targetNeuron = neurons.find((n) => n.id === particle.target);
        if (!targetNeuron) return;

        const sourceNeuron = connections.find((c) => c.to === particle.target);
        const fromNeuron = neurons.find((n) => n.id === sourceNeuron?.from);
        if (!fromNeuron) return;

        const x =
          fromNeuron.x + (targetNeuron.x - fromNeuron.x) * particle.progress;
        const y =
          fromNeuron.y + (targetNeuron.y - fromNeuron.y) * particle.progress;

        ctx.beginPath();
        ctx.arc(x, y, 3, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(34, 211, 238, 0.8)";
        ctx.fill();

        // Glow effect
        ctx.shadowBlur = 10;
        ctx.shadowColor = "rgba(34, 211, 238, 0.5)";
        ctx.fill();
        ctx.shadowBlur = 0;
      });

      // Draw neurons
      neurons.forEach((neuron) => {
        // Neuron glow
        const gradient = ctx.createRadialGradient(
          neuron.x,
          neuron.y,
          0,
          neuron.x,
          neuron.y,
          15,
        );

        if (neuron.type === "input") {
          gradient.addColorStop(0, `rgba(34, 211, 238, ${neuron.activation})`);
          gradient.addColorStop(1, "rgba(34, 211, 238, 0)");
        } else if (neuron.type === "output") {
          gradient.addColorStop(0, `rgba(16, 185, 129, ${neuron.activation})`);
          gradient.addColorStop(1, "rgba(16, 185, 129, 0)");
        } else {
          gradient.addColorStop(0, `rgba(168, 85, 247, ${neuron.activation})`);
          gradient.addColorStop(1, "rgba(168, 85, 247, 0)");
        }

        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(neuron.x, neuron.y, 15, 0, Math.PI * 2);
        ctx.fill();

        // Neuron core
        ctx.beginPath();
        ctx.arc(neuron.x, neuron.y, 6, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255, 255, 255, ${0.8 + neuron.activation * 0.2})`;
        ctx.fill();

        // Labels
        if (neuron.label) {
          ctx.fillStyle = "rgba(255, 255, 255, 0.6)";
          ctx.font = "10px monospace";
          ctx.textAlign = "center";
          ctx.fillText(neuron.label, neuron.x, neuron.y - 20);
        }
      });

      requestAnimationFrame(animate);
    };

    animate();
  }, [neurons, connections, dataFlow]);

  const getNetworkStats = () => {
    const avgActivation =
      neurons.reduce((sum, n) => sum + n.activation, 0) / (neurons.length || 1);
    const activeConnections = connections.filter((c) => c.active).length;
    const totalWeight = connections.reduce(
      (sum, c) => sum + Math.abs(c.weight),
      0,
    );

    return {
      avgActivation: (avgActivation * 100).toFixed(1),
      activeConnections: `${activeConnections}/${connections.length}`,
      totalWeight: totalWeight.toFixed(2),
      processingSpeed: `${(Math.random() * 50 + 50).toFixed(1)} ms`,
    };
  };

  const stats = getNetworkStats();

  return (
    <Card className="p-6 border border-emerald-500/30 bg-black/40 backdrop-blur-md relative overflow-hidden">
      {/* Background grid */}
      <div className="absolute inset-0 opacity-5">
        <div className="grid grid-cols-12 grid-rows-8 h-full">
          {Array(96)
            .fill(0)
            .map((_, i) => (
              <div key={i} className="border border-emerald-500/20" />
            ))}
        </div>
      </div>

      {/* Header */}
      <div className="relative z-10 flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div
            className={`p-2 rounded-full border ${isProcessing ? "border-emerald-400 bg-emerald-400/20 animate-pulse" : "border-gray-600"}`}
          >
            <Brain className="w-5 h-5 text-emerald-400" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-white">NEURAL NETWORK</h3>
            <p className="text-xs text-gray-400">
              Real-time deep learning visualization
            </p>
          </div>
        </div>

        <button
          onClick={() => setIsProcessing(!isProcessing)}
          className={`px-4 py-2 rounded-lg text-sm font-mono transition-all ${
            isProcessing
              ? "bg-emerald-500/20 border border-emerald-400 text-emerald-400 hover:bg-emerald-500/30"
              : "bg-gray-800 border border-gray-600 text-gray-400 hover:border-gray-500"
          }`}
        >
          {isProcessing ? "PROCESSING" : "IDLE"}
        </button>
      </div>

      {/* Canvas Visualization */}
      <div className="relative z-10 mb-6">
        <canvas
          ref={canvasRef}
          width={500}
          height={400}
          className="w-full h-full rounded-lg border border-emerald-500/20 bg-black/40"
        />

        {neurons.length === 0 && (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-500">
            <Cpu className="w-12 h-12 mb-3 opacity-50" />
            <p className="text-sm font-mono">NETWORK OFFLINE</p>
            <p className="text-xs opacity-60">
              Click PROCESSING to activate neural network
            </p>
          </div>
        )}
      </div>

      {/* Network Statistics */}
      <div className="relative z-10 grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="p-3 rounded-lg border border-cyan-500/30 bg-cyan-500/10">
          <div className="flex items-center gap-2 mb-1">
            <Activity className="w-3 h-3 text-cyan-400" />
            <span className="text-xs text-cyan-300 font-mono">
              AVG ACTIVATION
            </span>
          </div>
          <div className="text-lg font-bold text-white">
            {stats.avgActivation}%
          </div>
        </div>

        <div className="p-3 rounded-lg border border-purple-500/30 bg-purple-500/10">
          <div className="flex items-center gap-2 mb-1">
            <Zap className="w-3 h-3 text-purple-400" />
            <span className="text-xs text-purple-300 font-mono">
              ACTIVE PATHS
            </span>
          </div>
          <div className="text-lg font-bold text-white">
            {stats.activeConnections}
          </div>
        </div>

        <div className="p-3 rounded-lg border border-emerald-500/30 bg-emerald-500/10">
          <div className="flex items-center gap-2 mb-1">
            <Cpu className="w-3 h-3 text-emerald-400" />
            <span className="text-xs text-emerald-300 font-mono">
              WEIGHT SUM
            </span>
          </div>
          <div className="text-lg font-bold text-white">
            {stats.totalWeight}
          </div>
        </div>

        <div className="p-3 rounded-lg border border-yellow-500/30 bg-yellow-500/10">
          <div className="flex items-center gap-2 mb-1">
            <Brain className="w-3 h-3 text-yellow-400" />
            <span className="text-xs text-yellow-300 font-mono">LATENCY</span>
          </div>
          <div className="text-lg font-bold text-white">
            {stats.processingSpeed}
          </div>
        </div>
      </div>

      {/* Layer Legend */}
      <div className="relative z-10 mt-4 flex gap-4 justify-center">
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded-full bg-cyan-400" />
          <span className="text-xs text-gray-400">Input Layer</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded-full bg-purple-400" />
          <span className="text-xs text-gray-400">Hidden Layers</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded-full bg-emerald-400" />
          <span className="text-xs text-gray-400">Output Layer</span>
        </div>
      </div>
    </Card>
  );
}
