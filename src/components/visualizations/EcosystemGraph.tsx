"use client";

import dynamic from "next/dynamic";
import { useState, useEffect } from "react";
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
  regime: string;
  price?: number;
}

interface GhostPersona {
  name: string;
  message: string;
  color: string;
  borderColor: string;
  shadowColor: string;
  animation: string;
}

const GHOST_PERSONAS: Record<string, GhostPersona> = {
  "CRASH (市場崩壊警報)": {
    name: "CIRCUIT BREAKER",
    message:
      "⚠️ SYSTEM FAILURE DETECTED! ALL POSITIONS TERMINATED. MARKET INTEGRITY COMPROMISED.",
    color: "text-red-400",
    borderColor: "border-red-500",
    shadowColor: "shadow-[0_0_30px_rgba(255,0,0,0.4)]",
    animation: "animate-pulse",
  },
  high_volatility: {
    name: "SURVEILLANCE UNIT",
    message:
      "VOLATILITY SPIKE DETECTED. ENHANCED MONITORING PROTOCOLS ACTIVATED.",
    color: "text-yellow-400",
    borderColor: "border-yellow-500",
    shadowColor: "shadow-[0_0_20px_rgba(255,255,0,0.3)]",
    animation: "animate-bounce",
  },
  trending_up: {
    name: "OPTIMIST PRIME",
    message: "MARKET MOMENTUM POSITIVE. OPPORTUNITY MATRIX EXPANDING.",
    color: "text-green-400",
    borderColor: "border-green-500",
    shadowColor: "shadow-[0_0_20px_rgba(0,255,0,0.3)]",
    animation: "",
  },
  trending_down: {
    name: "CAUTION MODULE",
    message: "DOWNTREND CONFIRMED. RISK PARAMETERS ADJUSTED.",
    color: "text-orange-400",
    borderColor: "border-orange-500",
    shadowColor: "shadow-[0_0_20px_rgba(255,165,0,0.3)]",
    animation: "",
  },
  ranging: {
    name: "EQUILIBRIUM CORE",
    message: "MARKET STABILITY MAINTAINED. AWAITING CATALYST SIGNALS.",
    color: "text-cyan-400",
    borderColor: "border-cyan-500",
    shadowColor: "shadow-[0_0_20px_rgba(0,255,255,0.2)]",
    animation: "",
  },
  low_volatility: {
    name: "SERENITY PROTOCOL",
    message: "CALM WATERS DETECTED. LOW-RISK NAVIGATION ENABLED.",
    color: "text-blue-400",
    borderColor: "border-blue-500",
    shadowColor: "shadow-[0_0_15px_rgba(0,0,255,0.2)]",
    animation: "",
  },
};

export default function EcosystemGraph() {
  const [regimeData, setRegimeData] = useState<RegimeData | null>(null);
  const [currentPersona, setCurrentPersona] = useState<GhostPersona | null>(
    null,
  );
  const [wsConnected, setWsConnected] = useState(false);

  useEffect(() => {
    // Connect to WebSocket
    const ws = new WebSocket("ws://localhost:8000/ws/regime");

    ws.onopen = () => {
      console.log("Connected to Realtime Synapse");
      setWsConnected(true);
    };

    ws.onmessage = (event) => {
      try {
        const response = JSON.parse(event.data);
        if (response.type === "regime_update") {
          const data = response.data;
          setRegimeData({
            regime: data.current_regime,
            price: data.strategy?.position_size || 0,
          });

          // Get regime key for persona lookup
          let regimeKey: string;
          const currentRegime = data.current_regime;
          if (currentRegime?.includes("CRASH")) {
            regimeKey = "CRASH (市場崩壊警報)";
          } else if (
            currentRegime?.includes("high_volatility") ||
            currentRegime?.includes("High Volatility")
          ) {
            regimeKey = "high_volatility";
          } else if (
            currentRegime?.includes("trending_up") ||
            currentRegime?.includes("Trending Up")
          ) {
            regimeKey = "trending_up";
          } else if (
            currentRegime?.includes("trending_down") ||
            currentRegime?.includes("Trending Down")
          ) {
            regimeKey = "trending_down";
          } else if (
            currentRegime?.includes("low_volatility") ||
            currentRegime?.includes("Low Volatility")
          ) {
            regimeKey = "low_volatility";
          } else {
            regimeKey = "ranging";
          }

          const persona =
            GHOST_PERSONAS[regimeKey] || GHOST_PERSONAS["ranging"];

          setCurrentPersona(persona);

          // Clear persona after some time (except for CRASH)
          if (regimeKey !== "CRASH (市場崩壊警報)") {
            setTimeout(() => setCurrentPersona(null), 8000);
          }
        }
      } catch (e) {
        console.error("WS Error:", e);
      }
    };

    ws.onclose = () => setWsConnected(false);
    ws.onerror = (error) => {
      console.error("WebSocket error:", error);
      setWsConnected(false);
    };

    return () => {
      ws.close();
    };
  }, []);

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
                regimeData.regime.includes("CRASH")
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
      {currentPersona && (
        <div
          className={`absolute top-20 left-4 z-20 max-w-sm bg-black/80 border p-4 rounded font-mono text-sm backdrop-blur-sm animate-in fade-in slide-in-from-left-4 ${currentPersona.borderColor} ${currentPersona.shadowColor} ${currentPersona.animation}`}
        >
          <div className="flex items-center gap-2 mb-2 border-b border-gray-700 pb-1">
            <div
              className={`w-2 h-2 rounded-full animate-ping ${currentPersona.color.replace("text-", "bg-")}`}
            />
            <span className={`font-bold ${currentPersona.color}`}>
              {currentPersona.name}
            </span>
          </div>
          <div className={currentPersona.color}>{currentPersona.message}</div>
        </div>
      )}

      <ForceGraph3D
        graphData={MOCK_ECOSYSTEM_DATA}
        nodeLabel="name"
        nodeColor={(node) =>
          regimeData?.regime.includes("CRASH")
            ? "#ff0000"
            : (node as EcosystemNode).color
        }
        nodeVal="val"
        nodeRelSize={4}
        linkColor={() => "rgba(0, 255, 255, 0.2)"}
        linkWidth={1}
        linkDirectionalParticles={4}
        linkDirectionalParticleSpeed={() =>
          regimeData?.regime.includes("Volatile") ? 0.02 : 0.005
        }
        linkDirectionalParticleWidth={1.5}
        linkDirectionalParticleColor={() => "#ffffff"}
        backgroundColor="#030305" // Deep void black
        showNavInfo={false}
        enableNodeDrag={false}
        onNodeClick={(node) => {
          // Ghost in the Shell Interaction
          console.log("Ghost accessing:", (node as EcosystemNode).name);
          const analysisPersona: GhostPersona = {
            name: "ANALYSIS UNIT",
            message: `Analyzing ${(node as EcosystemNode).name}... Correlation confirmed. Neural pathways activated.`,
            color: "text-purple-400",
            borderColor: "border-purple-500",
            shadowColor: "shadow-[0_0_20px_rgba(128,0,128,0.3)]",
            animation: "",
          };
          setCurrentPersona(analysisPersona);
          setTimeout(() => setCurrentPersona(null), 4000);
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
}
