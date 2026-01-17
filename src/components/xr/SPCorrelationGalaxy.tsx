"use client";

import React, { useRef, useState, useMemo, Suspense } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { VRButton, ARButton, XR, createXRStore } from "@react-three/xr";
import { OrbitControls, Text, Html } from "@react-three/drei";
import * as THREE from "three";
import {
  calculatePCA,
  generateMockStockPrices,
  calculateCorrelationMatrix,
  type StockPriceData,
  type PCAResult,
} from "@/lib/pca";

const store = createXRStore();

interface StockNode {
  id: string;
  symbol: string;
  sector: string;
  correlation: number;
  position: [number, number, number];
  size: number;
  loading: number;
  pc1: number;
  pc2: number;
  pc3: number;
}

interface CorrelationGalaxyProps {
  data: StockNode[];
  onNodeClick?: (node: StockNode) => void;
  pcaResult?: PCAResult;
}

function CorrelationNode({
  node,
  onClick,
}: {
  node: StockNode;
  onClick: (node: StockNode) => void;
}) {
  const meshRef = useRef<THREE.Mesh>(null);
  const [hovered, setHovered] = useState(false);

  const color = useMemo(() => {
    const hue = (node.pc1 + 5) / 10;
    const saturation = 0.8;
    const lightness = 0.5 + (node.pc2 / 10) * 0.3;
    return `hsl(${hue * 360}, ${saturation * 100}%, ${lightness * 100}%)`;
  }, [node.pc1, node.pc2]);

  useFrame((state) => {
    if (meshRef.current) {
      const time = state.clock.elapsedTime;
      const floatOffset = Math.sin(time * 0.5 + node.id.length) * 0.05;
      meshRef.current.position.y = node.position[1] + floatOffset;
    }
  });

  return (
    <group position={node.position}>
      <mesh
        ref={meshRef}
        scale={hovered ? node.size * 1.5 : node.size}
        onPointerOver={() => setHovered(true)}
        onPointerOut={() => setHovered(false)}
        onClick={() => onClick(node)}
      >
        <sphereGeometry args={[1, 16, 16]} />
        <meshStandardMaterial
          color={color}
          emissive={color}
          emissiveIntensity={hovered ? 0.8 : 0.2}
          metalness={0.8}
          roughness={0.2}
          transparent
          opacity={0.85}
        />
      </mesh>
      {hovered && (
        <Html position={[0, node.size * 2, 0]} center>
          <div className="bg-black/90 text-white p-3 rounded-lg border border-cyan-400 pointer-events-none min-w-[220px] backdrop-blur-sm">
            <div className="text-cyan-400 font-bold">{node.symbol}</div>
            <div className="text-sm text-gray-300">{node.sector}</div>
            <div className="text-xs mt-2 space-y-1">
              <div className="flex justify-between">
                <span className="text-gray-400">PC1:</span>
                <span className="font-mono">{node.pc1.toFixed(3)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">PC2:</span>
                <span className="font-mono">{node.pc2.toFixed(3)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">PC3:</span>
                <span className="font-mono">{node.pc3.toFixed(3)}</span>
              </div>
            </div>
          </div>
        </Html>
      )}
    </group>
  );
}

function CorrelationConnection({
  start,
  end,
  strength,
}: {
  start: [number, number, number];
  end: [number, number, number];
  strength: number;
}) {
  const opacity = Math.abs(strength) * 0.3;
  const color = strength > 0 ? "#00ffff" : "#ff00ff";

  const midX = (start[0] + end[0]) / 2;
  const midY = (start[1] + end[1]) / 2;
  const midZ = (start[2] + end[2]) / 2;

  return (
    <line>
      <bufferGeometry
        attach="geometry"
        onUpdate={(geo) => {
          geo.setAttribute(
            "position",
            new THREE.Float32BufferAttribute([...start, ...end], 3),
          );
        }}
      />
      <lineBasicMaterial
        attach="material"
        color={color}
        transparent
        opacity={opacity}
        linewidth={1}
      />
    </line>
  );
}

function GalaxyScene({ data, onNodeClick, pcaResult }: CorrelationGalaxyProps) {
  const groupRef = useRef<THREE.Group>(null);

  const connections = useMemo(() => {
    const lines: Array<{
      start: [number, number, number];
      end: [number, number, number];
      strength: number;
    }> = [];

    for (let i = 0; i < data.length; i++) {
      for (let j = i + 1; j < data.length; j++) {
        const dx = data[i].position[0] - data[j].position[0];
        const dy = data[i].position[1] - data[j].position[1];
        const dz = data[i].position[2] - data[j].position[2];
        const distance = Math.sqrt(dx * dx + dy * dy + dz * dz);

        const pcDist = Math.sqrt(
          Math.pow(data[i].pc1 - data[j].pc1, 2) +
            Math.pow(data[i].pc2 - data[j].pc2, 2) +
            Math.pow(data[i].pc3 - data[j].pc3, 2),
        );

        if (distance < 2 && pcDist < 1.5) {
          const strength = 1 - pcDist / 1.5;
          lines.push({
            start: data[i].position,
            end: data[j].position,
            strength,
          });
        }
      }
    }
    return lines;
  }, [data]);

  useFrame((state) => {
    if (groupRef.current) {
      groupRef.current.rotation.y += 0.0003;
    }
  });

  return (
    <group ref={groupRef}>
      <ambientLight intensity={0.2} />
      <pointLight position={[15, 15, 15]} intensity={1.5} color="#00ffff" />
      <pointLight position={[-15, -15, -15]} intensity={1.5} color="#ff00ff" />
      <pointLight position={[0, 20, 0]} intensity={1} color="#ffff00" />

      {data.map((node) => (
        <CorrelationNode
          key={node.id}
          node={node}
          onClick={onNodeClick || (() => {})}
        />
      ))}

      {connections.slice(0, 300).map((conn, idx) => (
        <CorrelationConnection
          key={`conn-${idx}`}
          start={conn.start}
          end={conn.end}
          strength={conn.strength}
        />
      ))}

      <OrbitControls
        enableDamping
        dampingFactor={0.05}
        minDistance={5}
        maxDistance={50}
      />
    </group>
  );
}

function StarField() {
  const geometry = useMemo(() => {
    const positions: Float32Array = new Float32Array(10000 * 3);
    for (let i = 0; i < 10000 * 3; i++) {
      positions[i] = (Math.random() - 0.5) * 300;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    return geo;
  }, []);

  return (
    <points geometry={geometry}>
      <pointsMaterial size={0.05} color="#ffffff" transparent opacity={0.4} />
    </points>
  );
}

function AxesOverlay() {
  return (
    <group>
      <Text
        position={[10, 0, 0]}
        fontSize={0.4}
        color="#ff6666"
        anchorX="center"
        anchorY="middle"
      >
        PC1
      </Text>
      <Text
        position={[0, 10, 0]}
        fontSize={0.4}
        color="#66ff66"
        anchorX="center"
        anchorY="middle"
      >
        PC2
      </Text>
      <Text
        position={[0, 0, 10]}
        fontSize={0.4}
        color="#6666ff"
        anchorX="center"
        anchorY="middle"
      >
        PC3
      </Text>
    </group>
  );
}

export default function SPCorrelationGalaxy() {
  const [selectedNode, setSelectedNode] = useState<StockNode | null>(null);
  const [numStocks, setNumStocks] = useState<number>(500);

  const { stockData, pcaResult, stockNodes } = useMemo(() => {
    const stockData: StockPriceData[] = generateMockStockPrices(numStocks, 120);

    const pcaResult: PCAResult = calculatePCA(stockData, 3);

    const sectors = [
      "Technology",
      "Healthcare",
      "Financial",
      "Energy",
      "Consumer",
      "Industrial",
      "Materials",
      "Utilities",
      "Real Estate",
      "Communication",
    ];

    const stockNodes: StockNode[] = stockData.map((stock, idx) => {
      const pc1 = pcaResult.positions[idx][0];
      const pc2 = pcaResult.positions[idx][1];
      const pc3 = pcaResult.positions[idx][2];

      const scale = 3;
      const position: [number, number, number] = [
        pc1 * scale,
        pc2 * scale,
        pc3 * scale,
      ];

      const distanceFromOrigin = Math.sqrt(pc1 * pc1 + pc2 * pc2 + pc3 * pc3);
      const size = 0.15 + (1 / (distanceFromOrigin + 1)) * 0.2;

      const avgCorrelation =
        stockData.slice(0, Math.min(10, stockData.length)).reduce((sum, s) => {
          return (
            sum +
            Math.abs(
              pc1 * pcaResult.positions[stockData.indexOf(s)][0] +
                pc2 * pcaResult.positions[stockData.indexOf(s)][1] +
                pc3 * pcaResult.positions[stockData.indexOf(s)][2],
            )
          );
        }, 0) / Math.min(10, stockData.length);

      return {
        id: `${stock.symbol}-${idx}`,
        symbol: stock.symbol,
        sector: sectors[idx % sectors.length],
        correlation: avgCorrelation,
        position,
        size,
        loading: 0,
        pc1,
        pc2,
        pc3,
      };
    });

    return { stockData, pcaResult, stockNodes };
  }, [numStocks]);

  const handleNodeClick = (node: StockNode) => {
    setSelectedNode(node);
  };

  return (
    <div className="relative w-full h-screen bg-black">
      <div className="absolute top-4 left-4 z-10 flex gap-4">
        <VRButton store={store} />
        <ARButton store={store} />
      </div>

      <div className="absolute top-4 right-4 z-10 text-white p-4 bg-black/80 rounded-lg max-w-xs border border-cyan-400/50 backdrop-blur-sm">
        <h2 className="text-lg font-bold mb-2 text-cyan-400">
          MARKET MANIFOLD
        </h2>
        <div className="space-y-1 text-xs">
          <p className="text-gray-300">
            PCA-Based 3D Visualization of {numStocks} Stocks
          </p>
          <div className="mt-2 space-y-1">
            <p className="text-red-400">
              🔴 X-Axis: PC1 (Variance:{" "}
              {(pcaResult.explainedVariance[0] * 100).toFixed(1)}%)
            </p>
            <p className="text-green-400">
              🟢 Y-Axis: PC2 (Variance:{" "}
              {(pcaResult.explainedVariance[1] * 100).toFixed(1)}%)
            </p>
            <p className="text-blue-400">
              🔵 Z-Axis: PC3 (Variance:{" "}
              {(pcaResult.explainedVariance[2] * 100).toFixed(1)}%)
            </p>
          </div>
          <p className="text-gray-400 mt-2">
            Total Variance Explained:{" "}
            {(
              pcaResult.explainedVariance.reduce((a, b) => a + b, 0) * 100
            ).toFixed(1)}
            %
          </p>
          <div className="mt-3 pt-3 border-t border-gray-700 space-y-1">
            <p className="text-gray-300">• Drag to rotate</p>
            <p className="text-gray-300">• Scroll to zoom</p>
            <p className="text-gray-300">• Click nodes for details</p>
            <p className="text-gray-300">• VR/AR enabled</p>
          </div>
        </div>
      </div>

      {selectedNode && (
        <div className="absolute bottom-4 left-4 z-10 text-white p-4 bg-black/90 rounded-lg min-w-[320px] border border-cyan-400 backdrop-blur-sm">
          <div className="flex justify-between items-start">
            <div className="flex-1">
              <h3 className="text-xl font-bold text-cyan-400">
                {selectedNode.symbol}
              </h3>
              <p className="text-sm text-gray-300">{selectedNode.sector}</p>
              <div className="mt-3 space-y-2">
                <div>
                  <div className="text-xs text-gray-400">
                    Principal Components
                  </div>
                  <div className="grid grid-cols-3 gap-2 mt-1">
                    <div className="bg-gray-800 p-2 rounded">
                      <div className="text-xs text-red-400">PC1</div>
                      <div className="font-mono text-sm">
                        {selectedNode.pc1.toFixed(3)}
                      </div>
                    </div>
                    <div className="bg-gray-800 p-2 rounded">
                      <div className="text-xs text-green-400">PC2</div>
                      <div className="font-mono text-sm">
                        {selectedNode.pc2.toFixed(3)}
                      </div>
                    </div>
                    <div className="bg-gray-800 p-2 rounded">
                      <div className="text-xs text-blue-400">PC3</div>
                      <div className="font-mono text-sm">
                        {selectedNode.pc3.toFixed(3)}
                      </div>
                    </div>
                  </div>
                </div>
                <div>
                  <div className="text-xs text-gray-400">Correlation Index</div>
                  <div className="text-2xl font-mono">
                    {selectedNode.correlation.toFixed(4)}
                  </div>
                </div>
              </div>
            </div>
            <button
              onClick={() => setSelectedNode(null)}
              className="text-gray-400 hover:text-white ml-4"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      <Canvas camera={{ position: [0, 0, 20], fov: 60 }}>
        <Suspense fallback={null}>
          <XR store={store}>
            <color attach="background" args={["#000008"]} />
            <fog attach="fog" args={["#000008", 30, 80]} />
            <StarField />
            <AxesOverlay />
            <GalaxyScene
              data={stockNodes}
              onNodeClick={handleNodeClick}
              pcaResult={pcaResult}
            />
          </XR>
        </Suspense>
      </Canvas>
    </div>
  );
}
