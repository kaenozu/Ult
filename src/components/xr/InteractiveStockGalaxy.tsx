"use client";

import React, { useRef, useState, useMemo, Suspense } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import {
  VRButton,
  ARButton,
  XR,
  createXRStore,
  useXR,
  Interactive,
} from "@react-three/xr";
import { OrbitControls, Text, Html } from "@react-three/drei";
import * as THREE from "three";

const store = createXRStore();

interface StockNode {
  id: string;
  symbol: string;
  sector: string;
  price: number;
  change: number;
  changePercent: number;
  position: [number, number, number];
  size: number;
  velocity: [number, number, number];
  isGrabbed: boolean;
  isExploding?: boolean;
}

interface ExplosionParticle {
  id: string;
  position: [number, number, number];
  velocity: [number, number, number];
  color: string;
  life: number;
}

function GrabbableStock({
  node,
  onGrab,
  onThrow,
  onExplode,
}: {
  node: StockNode;
  onGrab: (node: StockNode) => void;
  onThrow: (node: StockNode, velocity: [number, number, number]) => void;
  onExplode: (node: StockNode) => void;
}) {
  const meshRef = useRef<THREE.Mesh>(null);
  const [hovered, setHovered] = useState(false);
  const { raycaster } = useThree();

  const isLosing = node.changePercent < -2;
  const color = useMemo(() => {
    if (isLosing) return "#ff3333";
    if (node.changePercent > 2) return "#00ff00";
    if (node.changePercent > 0) return "#33ff33";
    return "#ff9933";
  }, [node.changePercent, isLosing]);

  useFrame((state) => {
    if (meshRef.current && !node.isGrabbed) {
      const time = state.clock.elapsedTime;
      meshRef.current.position.y =
        node.position[1] + Math.sin(time + node.id.length) * 0.1;
    }
  });

  const handleGrab = () => {
    if (!node.isGrabbed) {
      onGrab({ ...node, isGrabbed: true });
    }
  };

  const handleThrow = (velocity: [number, number, number]) => {
    onThrow(node, velocity);
  };

  return (
    <Interactive
      onSelectStart={handleGrab}
      onHover={() => setHovered(true)}
      onBlur={() => setHovered(false)}
    >
      <group position={node.position}>
        <mesh ref={meshRef} scale={hovered ? node.size * 1.5 : node.size}>
          <boxGeometry args={[1, 1, 0.2]} />
          <meshStandardMaterial
            color={color}
            emissive={color}
            emissiveIntensity={hovered ? 0.8 : 0.3}
            metalness={0.8}
            roughness={0.2}
            transparent
            opacity={0.9}
          />
        </mesh>

        {/* Stock Chart Display */}
        <group position={[0, 0, 0.11]}>
          <mesh>
            <planeGeometry args={[0.8, 0.6]} />
            <meshBasicMaterial color="#000000" transparent opacity={0.8} />
          </mesh>
          <Text
            position={[0, 0.2, 0.01]}
            fontSize={0.15}
            color="#ffffff"
            anchorX="center"
            anchorY="middle"
          >
            {node.symbol}
          </Text>
          <Text
            position={[0, 0, 0.01]}
            fontSize={0.1}
            color={color}
            anchorX="center"
            anchorY="middle"
          >
            ${node.price.toFixed(2)}
          </Text>
          <Text
            position={[0, -0.15, 0.01]}
            fontSize={0.08}
            color={color}
            anchorX="center"
            anchorY="middle"
          >
            {node.changePercent > 0 ? "+" : ""}
            {node.changePercent.toFixed(2)}%
          </Text>
          {/* Mini chart line */}
          <mesh position={[0, -0.05, 0.02]}>
            <ringGeometry args={[0.2, 0.25, 32]} />
            <meshBasicMaterial color={color} transparent opacity={0.6} />
          </mesh>
        </group>

        {hovered && (
          <Html position={[0, node.size * 2, 0]} center>
            <div className="bg-black/90 text-white p-3 rounded-lg border border-cyan-400 pointer-events-none min-w-[200px]">
              <div className="text-cyan-400 font-bold">{node.symbol}</div>
              <div className="text-sm text-gray-300">{node.sector}</div>
              <div className="text-xs mt-1">
                Price: ${node.price.toFixed(2)}
              </div>
              <div
                className={`text-xs ${isLosing ? "text-red-400" : "text-green-400"}`}
              >
                Change: {node.changePercent > 0 ? "+" : ""}
                {node.changePercent.toFixed(2)}%
              </div>
              {isLosing && (
                <div className="text-xs text-red-500 mt-1 font-bold">
                  🎯 THROW TO EXPLODE!
                </div>
              )}
            </div>
          </Html>
        )}
      </group>
    </Interactive>
  );
}

function ExplosionEffect({ particles }: { particles: ExplosionParticle[] }) {
  return (
    <>
      {particles.map((particle) => (
        <mesh key={particle.id} position={particle.position}>
          <sphereGeometry args={[0.05, 8, 8]} />
          <meshBasicMaterial
            color={particle.color}
            transparent
            opacity={particle.life}
          />
        </mesh>
      ))}
    </>
  );
}

function GalaxyScene({
  stocks,
  onGrabStock,
  onThrowStock,
  onExplodeStock,
  explosions,
}: {
  stocks: StockNode[];
  onGrabStock: (node: StockNode) => void;
  onThrowStock: (node: StockNode, velocity: [number, number, number]) => void;
  onExplodeStock: (node: StockNode) => void;
  explosions: ExplosionParticle[];
}) {
  const groupRef = useRef<THREE.Group>(null);

  useFrame((state) => {
    if (groupRef.current) {
      groupRef.current.rotation.y += 0.001;
    }
  });

  return (
    <group ref={groupRef}>
      <ambientLight intensity={0.3} />
      <pointLight position={[10, 10, 10]} intensity={2} color="#00ffff" />
      <pointLight position={[-10, -10, -10]} intensity={2} color="#ff00ff" />
      <spotLight position={[0, 20, 0]} intensity={1} color="#ffffff" />

      {stocks.map((stock) => (
        <GrabbableStock
          key={stock.id}
          node={stock}
          onGrab={onGrabStock}
          onThrow={onThrowStock}
          onExplode={onExplodeStock}
        />
      ))}

      <ExplosionEffect particles={explosions} />

      <OrbitControls
        enableDamping
        dampingFactor={0.05}
        minDistance={5}
        maxDistance={30}
      />
    </group>
  );
}

function StarBackground() {
  const geometry = useMemo(() => {
    const positions: Float32Array = new Float32Array(8000 * 3);
    for (let i = 0; i < 8000 * 3; i++) {
      positions[i] = (Math.random() - 0.5) * 300;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    return geo;
  }, []);

  return (
    <points geometry={geometry}>
      <pointsMaterial size={0.1} color="#ffffff" transparent opacity={0.6} />
    </points>
  );
}

function HandIndicators() {
  return (
    <>
      <mesh position={[2, 1, 0]}>
        <sphereGeometry args={[0.05, 16, 16]} />
        <meshBasicMaterial color="#00ff00" />
      </mesh>
      <mesh position={[-2, 1, 0]}>
        <sphereGeometry args={[0.05, 16, 16]} />
        <meshBasicMaterial color="#ff00ff" />
      </mesh>
    </>
  );
}

export default function InteractiveStockGalaxy() {
  const [stocks, setStocks] = useState<StockNode[]>([]);
  const [explosions, setExplosions] = useState<ExplosionParticle[]>([]);
  const [grabbedStock, setGrabbedStock] = useState<StockNode | null>(null);

  const stockData = useMemo<StockNode[]>(() => {
    const sectors = [
      "Technology",
      "Healthcare",
      "Financial",
      "Energy",
      "Consumer",
      "Industrial",
      "Materials",
      "Utilities",
    ];

    const symbols = [
      "AAPL",
      "MSFT",
      "GOOGL",
      "AMZN",
      "META",
      "NVDA",
      "TSLA",
      "JPM",
      "V",
      "JNJ",
      "WMT",
      "PG",
      "XOM",
      "CVX",
      "KO",
      "PEP",
      "COST",
      "HD",
      "INTC",
      "AMD",
      "CSCO",
      "ADBE",
      "CRM",
      "NFLX",
    ];

    return symbols.map((symbol, idx) => {
      const angle = (idx / symbols.length) * Math.PI * 2 * 4;
      const radius = 5 + Math.random() * 8;
      const price = 50 + Math.random() * 450;
      const change = (Math.random() - 0.5) * 10;
      const changePercent = (change / price) * 100;

      return {
        id: `${symbol}-${idx}`,
        symbol,
        sector: sectors[idx % sectors.length],
        price,
        change,
        changePercent,
        position: [
          Math.cos(angle) * radius,
          (Math.random() - 0.5) * 8,
          Math.sin(angle) * radius,
        ] as [number, number, number],
        size: 0.3 + Math.random() * 0.4,
        velocity: [0, 0, 0],
        isGrabbed: false,
      };
    });
  }, []);

  React.useEffect(() => {
    setStocks(stockData);
  }, [stockData]);

  const handleGrabStock = (node: StockNode) => {
    setGrabbedStock(node);
    setStocks((prev) =>
      prev.map((s) => (s.id === node.id ? { ...s, isGrabbed: true } : s)),
    );
  };

  const handleThrowStock = (
    node: StockNode,
    velocity: [number, number, number],
  ) => {
    const isLosing = node.changePercent < -2;

    if (
      isLosing &&
      Math.abs(velocity[0]) + Math.abs(velocity[1]) + Math.abs(velocity[2]) > 5
    ) {
      // Explode losing stocks when thrown fast
      createExplosion(node);
      setStocks((prev) => prev.filter((s) => s.id !== node.id));
    } else {
      // Regular throw
      setStocks((prev) =>
        prev.map((s) =>
          s.id === node.id ? { ...s, velocity, isGrabbed: false } : s,
        ),
      );
    }
    setGrabbedStock(null);
  };

  const createExplosion = (node: StockNode) => {
    const newExplosions: ExplosionParticle[] = [];
    const colors = ["#ff3333", "#ff9933", "#ffff33", "#ffffff"];

    for (let i = 0; i < 30; i++) {
      newExplosions.push({
        id: `explosion-${Date.now()}-${i}`,
        position: [...node.position] as [number, number, number],
        velocity: [
          (Math.random() - 0.5) * 0.5,
          Math.random() * 0.5,
          (Math.random() - 0.5) * 0.5,
        ],
        color: colors[Math.floor(Math.random() * colors.length)],
        life: 1.0,
      });
    }

    setExplosions((prev) => [...prev, ...newExplosions]);

    // Fade out explosions
    setTimeout(() => {
      setExplosions((prev) => prev.filter((e) => !newExplosions.includes(e)));
    }, 2000);
  };

  useFrame((state) => {
    // Update thrown stocks
    setStocks((prev) =>
      prev.map((stock) => {
        if (
          !stock.isGrabbed &&
          (stock.velocity[0] !== 0 ||
            stock.velocity[1] !== 0 ||
            stock.velocity[2] !== 0)
        ) {
          const newPos: [number, number, number] = [
            stock.position[0] + stock.velocity[0] * 0.016,
            stock.position[1] + stock.velocity[1] * 0.016,
            stock.position[2] + stock.velocity[2] * 0.016,
          ];
          const newVel: [number, number, number] = [
            stock.velocity[0] * 0.98,
            stock.velocity[1] * 0.98 - 0.1, // gravity
            stock.velocity[2] * 0.98,
          ];

          return { ...stock, position: newPos, velocity: newVel };
        }
        return stock;
      }),
    );

    // Update explosions
    setExplosions((prev) =>
      prev.map((particle) => ({
        ...particle,
        position: [
          particle.position[0] + particle.velocity[0],
          particle.position[1] + particle.velocity[1],
          particle.position[2] + particle.velocity[2],
        ] as [number, number, number],
        velocity: [
          particle.velocity[0] * 0.98,
          particle.velocity[1] * 0.98,
          particle.velocity[2] * 0.98,
        ] as [number, number, number],
        life: particle.life * 0.98,
      })),
    );
  });

  return (
    <div className="relative w-full h-screen bg-black">
      <div className="absolute top-4 left-4 z-10 flex gap-4">
        <VRButton store={store} />
        <ARButton store={store} />
      </div>

      <div className="absolute top-4 right-4 z-10 text-white p-4 bg-black/80 rounded-lg max-w-sm border border-cyan-400/50">
        <h2 className="text-lg font-bold mb-2 text-cyan-400">
          🌌 STOCK GALAXY
        </h2>
        <div className="space-y-1 text-xs">
          <p className="text-green-300">🟢 Gaining Stocks</p>
          <p className="text-red-300">🔴 Losing Stocks</p>
          <p className="text-yellow-300">🟡 Stable/Neutral</p>
          <p className="text-gray-300 mt-2">🎮 VR Controls:</p>
          <p className="text-gray-300">• Grab stocks with hands</p>
          <p className="text-gray-300">• Throw to watch them fly</p>
          <p className="text-red-400 font-bold">
            • Throw losing stocks fast to EXPLODE! 💥
          </p>
          <p className="text-gray-300 mt-2">🖱️ Mouse Controls:</p>
          <p className="text-gray-300">• Drag to rotate</p>
          <p className="text-gray-300">• Scroll to zoom</p>
          <p className="text-gray-300">• Click to select</p>
        </div>
      </div>

      <div className="absolute bottom-4 left-4 z-10 text-white p-3 bg-black/80 rounded-lg border border-cyan-400">
        <div className="text-sm font-bold text-cyan-400 mb-1">
          Active Stocks: {stocks.length}
        </div>
        <div className="text-xs text-gray-300">
          Grabbed: {grabbedStock?.symbol || "None"}
        </div>
        <div className="text-xs text-red-400">
          Explosions: {explosions.length > 0 ? "Active!" : "None"}
        </div>
      </div>

      <Canvas camera={{ position: [0, 0, 20], fov: 60 }}>
        <Suspense fallback={null}>
          <XR store={store}>
            <StarBackground />
            <HandIndicators />
            <GalaxyScene
              stocks={stocks}
              onGrabStock={handleGrabStock}
              onThrowStock={handleThrowStock}
              onExplodeStock={createExplosion}
              explosions={explosions}
            />
          </XR>
        </Suspense>
      </Canvas>
    </div>
  );
}
