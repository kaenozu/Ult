"use client";

import dynamic from "next/dynamic";
import { useTheme } from "next-themes";
import { useMemo, useState, useEffect, memo } from "react";
import { Card } from "@/components/ui/card";

// Dynamically import ForceGraph3D to avoid SSR issues
import { MOCK_ECOSYSTEM_DATA, EcosystemNode } from "@/data/mockEcosystem";

const ForceGraph3D = dynamic(() => import("react-force-graph-3d"), {
  ssr: false,
  loading: () => (
    <div className="h-[500px] w-full flex items-center justify-center text-cyan-500 animate-pulse">
      Initializing Neural Link...
    </div>
  ),
});

interface RegimeData {
  regime?: string;
  price?: number;
  current_regime?: string;
  strategy?: {
    strategy: string;
    position_size: number;
    stop_loss: number;
    take_profit: number;
  };
  statistics?: {
    current_regime: string;
    total_observations: number;
    regime_counts: Record<string, number>;
    regime_percentages: Record<string, number>;
    most_common_regime: string;
  };
}

const EcosystemGraph = memo(function EcosystemGraph() {
  const { theme } = useTheme();
  const [regimeData, setRegimeData] = useState<RegimeData | null>(null);
  const [ghostMessage, setGhostMessage] = useState<string | null>(null);
  const [wsConnected, setWsConnected] = useState(false);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);

    // Connect to WebSocket
    const wsUrl =
      process.env.NEXT_PUBLIC_WS_URL || "ws://localhost:8000/ws/regime";
    const ws = new WebSocket(wsUrl);

    ws.onopen = () => {
      console.log("Connected to Realtime Synapse");
      setWsConnected(true);
      ws.send(
        JSON.stringify({
          type: "register",
          user_id: "guest",
          subscriptions: ["all"],
        }),
      );
    };

    ws.onmessage = (event) => {
      try {
        const response = JSON.parse(event.data);
        if (
          response.type === "notification" &&
          response.data.type === "regime_update"
        ) {
          const data = response.data.data;
          setRegimeData({
            regime: data.current_regime || data.regime,
            price: data.strategy?.position_size || 0,
            current_regime: data.current_regime,
            strategy: data.strategy,
            statistics: data.statistics,
          });

          // Trigger Ghost Persona reaction
          if (data.regime === "CRASH (市場崩壊警報)") {
            setGhostMessage(
              "⚠️ CRASH WARNING DETECTED! INITIATING CIRCUIT BREAKER PROTOCOLS.",
            );
          } else if (data.regime.includes("High Volatility")) {
            setGhostMessage(
              "High volatility detected. Surveillance level increased.",
            );
          } else {
            // Clear message after some time or set to neutral
            setTimeout(() => setGhostMessage(null), 5000);
          }
        }
      } catch (e) {
        console.error("WS Error:", e);
      }
    };

    ws.onclose = () => setWsConnected(false);

    return () => {
      ws.close();
    };
  }, []);

  // Cyberpunk theme adjustments
  const bgColor = theme === "dark" ? "#050505" : "#ffffff";

  if (!isMounted) return null;

  return (
    <Card className="w-full h-[600px] overflow-hidden border-cyan-900/50 bg-black relative group">
      <div className="absolute top-4 left-4 z-10 pointer-events-none">
        <h2 className="text-2xl font-bold text-cyan-400 font-mono tracking-tighter">
          NEURAL NEXUS
          <span
            className={`text-xs px-2 py-0.5 rounded ml-2 transition-colors duration-500 ${
              wsConnected
                ? "bg-cyan-900/30 text-cyan-400"
                : "bg-red-900/30 text-red-500"
            }`}
          >
            {wsConnected ? "LIVE SYNAPSE" : "OFFLINE"}
          </span>
          {regimeData && (
            <span
              className={`ml-2 text-xs border px-2 py-0.5 rounded ${
                regimeData.regime?.includes("CRASH")
                  ? "border-red-500 text-red-500 animate-pulse"
                  : "border-cyan-500/30 text-cyan-500/70"
              }`}
            >
              {regimeData.regime}
            </span>
          )}
        </h2>
        <p className="text-xs text-cyan-600/70 font-mono">
          SUPPLY CHAIN & CORRELATION MATRIX
        </p>
      </div>

      {/* Ghost Overlay */}
      {ghostMessage && (
        <div className="absolute top-20 left-4 z-20 max-w-sm bg-black/80 border border-cyan-500/50 p-4 rounded text-cyan-400 font-mono text-sm shadow-[0_0_20px_rgba(0,255,255,0.2)] backdrop-blur-sm animate-in fade-in slide-in-from-left-4">
          <div className="flex items-center gap-2 mb-2 border-b border-cyan-900 pb-1">
            <div className="w-2 h-2 bg-cyan-500 rounded-full animate-ping" />
            <span className="font-bold">GHOST PROTOCOL</span>
          </div>
          <div>{ghostMessage}</div>
        </div>
      )}

      <ForceGraph3D
        graphData={MOCK_ECOSYSTEM_DATA}
        nodeLabel="name"
        nodeColor={(node: any) =>
          regimeData?.regime?.includes("CRASH") ? "#ff0000" : node.color
        }
        nodeVal="val"
        nodeRelSize={4}
        linkColor={() => "rgba(0, 255, 255, 0.2)"}
        linkWidth={1}
        linkDirectionalParticles={4}
        linkDirectionalParticleSpeed={(d) =>
          regimeData?.regime?.includes("Volatile") ? 0.02 : 0.005
        }
        linkDirectionalParticleWidth={1.5}
        linkDirectionalParticleColor={(d: any) => d.particleColor || "#ffffff"}
        backgroundColor="#030305" // Deep void black
        showNavInfo={false}
        enableNodeDrag={false}
        onNodeClick={(node: any) => {
          // Ghost in the Shell Interaction
          console.log("Ghost accessing:", node.name);
          setGhostMessage(`Analyzing ${node.name}... Correlation confirmed.`);
          setTimeout(() => setGhostMessage(null), 3000);
        }}
      />

      {/* Cyberpunk Overlay Grid */}
      <div className="absolute inset-0 pointer-events-none bg-[url('/grid.png')] opacity-10 mix-blend-overlay"></div>
      <div className="absolute bottom-4 right-4 z-10 text-right">
        <div className="flex gap-2 text-xs font-mono text-cyan-500/50">
          <span>NODES: {MOCK_ECOSYSTEM_DATA.nodes.length}</span>
          <span>LINKS: {MOCK_ECOSYSTEM_DATA.links.length}</span>
          {regimeData && <span>Price: {regimeData.price}</span>}
        </div>
      </div>
    </Card>
  );
});

export default EcosystemGraph;
