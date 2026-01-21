"use client";

import React, { useRef, useState, useMemo, Suspense, memo } from "react";
import { Canvas, useFrame, useThree, extend } from "@react-three/fiber";
import {
  VRButton,
  ARButton,
  XR,
  createXRStore,
  useXR,
  Interactive,
} from "@react-three/xr";
import {
  OrbitControls,
  Text,
  Html,
  Float,
  MeshDistortMaterial,
  Sphere,
  Box,
  Torus,
  TorusKnot,
  Icosahedron,
  Stars,
  Cloud,
  GradientTexture,
  Trail,
  Sparkles,
  Image,
  PerspectiveCamera,
} from "@react-three/drei";
import {
  EffectComposer,
  Bloom,
  Vignette,
  Glitch,
  Noise,
  DepthOfField,
} from "@react-three/postprocessing";
import * as THREE from "three";

const store = createXRStore();

interface QuantumNode {
  id: string;
  symbol: string;
  price: number;
  change: number;
  volume: number;
  position: [number, number, number];
  rotation: [number, number, number];
  scale: [number, number, number];
  color: string;
  energy: number;
  consciousness: number;
  quantumState: "superposition" | "entangled" | "collapsed" | "observed";
  connections: string[];
}

interface DataStream {
  id: string;
  from: [number, number, number];
  to: [number, number, number];
  color: string;
  intensity: number;
  speed: number;
  particles: number;
}

interface ThoughtBubble {
  id: string;
  position: [number, number, number];
  text: string;
  emotion: "fear" | "greed" | "hope" | "panic" | "euphoria";
  size: number;
  opacity: number;
}

function QuantumStockNode({
  node,
  onObserve,
  onEntangle,
}: {
  node: QuantumNode;
  onObserve: (node: QuantumNode) => void;
  onEntangle: (node: QuantumNode) => void;
}) {
  const meshRef = useRef<THREE.Mesh>(null);
  const [hovered, setHovered] = useState(false);
  const [observed, setObserved] = useState(false);

  useFrame((state) => {
    if (meshRef.current) {
      const time = state.clock.elapsedTime;

      // Quantum fluctuation
      meshRef.current.position.x =
        node.position[0] + Math.sin(time * 2 + node.id.length) * 0.2;
      meshRef.current.position.y =
        node.position[1] + Math.cos(time * 3 + node.id.length) * 0.2;
      meshRef.current.position.z =
        node.position[2] + Math.sin(time * 1.5 + node.id.length) * 0.2;

      // Consciousness rotation
      meshRef.current.rotation.x += 0.01 * node.consciousness;
      meshRef.current.rotation.y += 0.02 * node.consciousness;
      meshRef.current.rotation.z += 0.005 * node.consciousness;

      // Energy pulsation
      const energyScale = 1 + Math.sin(time * 4) * node.energy * 0.3;
      meshRef.current.scale.setScalar(node.scale[0] * energyScale);
    }
  });

  const handleObserve = () => {
    setObserved(true);
    onObserve({ ...node, quantumState: "observed" });
    setTimeout(() => setObserved(false), 2000);
  };

  const handleEntangle = () => {
    onEntangle(node);
  };

  const getGeometry = () => {
    switch (node.quantumState) {
      case "superposition":
        return <icosahedronGeometry args={[1, 2]} />;
      case "entangled":
        return <torusKnotGeometry args={[0.7, 0.3, 16, 16]} />;
      case "collapsed":
        return <boxGeometry args={[1, 1, 1]} />;
      case "observed":
        return <sphereGeometry args={[1, 32, 32]} />;
      default:
        return <icosahedronGeometry args={[1, 2]} />;
    }
  };

  return (
    <Interactive
      onSelect={handleObserve}
      onSelectEnd={handleEntangle}
      onHover={() => setHovered(true)}
      onBlur={() => setHovered(false)}
    >
      <group position={node.position}>
        <Float speed={2} rotationIntensity={0.5} floatIntensity={0.5}>
          <mesh ref={meshRef} scale={node.scale}>
            {getGeometry()}
            <MeshDistortMaterial
              color={node.color}
              emissive={node.color}
              emissiveIntensity={hovered ? 2 : 1}
              metalness={0.9}
              roughness={0.1}
              distort={0.3}
              speed={2}
              transparent
              opacity={0.8}
            />
          </mesh>
        </Float>

        {/* Quantum Aura */}
        <mesh scale={node.scale.map((s) => s * 2) as [number, number, number]}>
          <sphereGeometry args={[1, 16, 16]} />
          <meshBasicMaterial
            color={node.color}
            transparent
            opacity={0.1}
            side={THREE.BackSide}
          />
        </mesh>

        {/* Energy Particles */}
        {hovered && (
          <Sparkles
            count={20}
            scale={node.scale.map((s) => s * 3) as [number, number, number]}
            size={0.1}
            speed={1}
            opacity={0.8}
            color={node.color}
          />
        )}

        {/* Stock Info Display */}
        <group position={[0, node.scale[1] * 2, 0]}>
          <mesh>
            <planeGeometry args={[2, 1.5]} />
            <meshBasicMaterial color="#000000" transparent opacity={0.9} />
          </mesh>
          <Text
            position={[0, 0.3, 0.01]}
            fontSize={0.3}
            color="#ffffff"
            anchorX="center"
            anchorY="middle"
            font="monospace"
          >
            {node.symbol}
          </Text>
          <Text
            position={[0, 0, 0.01]}
            fontSize={0.2}
            color={node.change > 0 ? "#00ff00" : "#ff0000"}
            anchorX="center"
            anchorY="middle"
            font="monospace"
          >
            ${node.price.toFixed(2)}
          </Text>
          <Text
            position={[0, -0.3, 0.01]}
            fontSize={0.15}
            color="#ffffff"
            anchorX="center"
            anchorY="middle"
          >
            {node.quantumState.toUpperCase()}
          </Text>
        </group>

        {hovered && (
          <Html position={[0, node.scale[1] * 3, 0]} center>
            <div className="bg-black/90 text-white p-4 rounded-lg border border-purple-400 pointer-events-none min-w-[250px] backdrop-blur-sm">
              <div className="text-purple-400 font-bold mb-2">
                {node.symbol}
              </div>
              <div className="text-xs space-y-1">
                <div>Price: ${node.price.toFixed(2)}</div>
                <div
                  className={
                    node.change > 0 ? "text-green-400" : "text-red-400"
                  }
                >
                  Change: {node.change > 0 ? "+" : ""}
                  {node.change.toFixed(2)}
                </div>
                <div>Volume: {node.volume.toLocaleString()}</div>
                <div>Energy: {(node.energy * 100).toFixed(0)}%</div>
                <div>
                  Consciousness: {(node.consciousness * 100).toFixed(0)}%
                </div>
                <div>State: {node.quantumState}</div>
                <div className="text-purple-300 mt-2 font-bold">
                  🧠 OBSERVE to collapse wave function
                </div>
                <div className="text-blue-300 font-bold">
                  🔗 ENTANGLE to connect nodes
                </div>
              </div>
            </div>
          </Html>
        )}

        {observed && (
          <Sparkles
            count={50}
            scale={node.scale.map((s) => s * 5) as [number, number, number]}
            size={0.2}
            speed={3}
            opacity={1}
            color="#ffffff"
          />
        )}
      </group>
    </Interactive>
  );
}

function QuantumDataStream({ stream }: { stream: DataStream }) {
  const lineRef = useRef<any>(null);

  useFrame((state) => {
    if (lineRef.current) {
      const time = state.clock.elapsedTime;
      const offset = (time * stream.speed) % 1;

      // Animate data flow
      const positions = [];
      const segments = 20;
      for (let i = 0; i <= segments; i++) {
        const t = i / segments;
        const x = stream.from[0] + (stream.to[0] - stream.from[0]) * t;
        const y = stream.from[1] + (stream.to[1] - stream.from[1]) * t;
        const z = stream.from[2] + (stream.to[2] - stream.from[2]) * t;

        // Add wave motion
        const wave = Math.sin(t * Math.PI * 4 + time * 2) * 0.1;
        positions.push(x + wave, y, z);
      }

      lineRef.current.geometry.setAttribute(
        "position",
        new THREE.Float32BufferAttribute(positions, 3),
      );
    }
  });

  return (
    <line ref={lineRef}>
      <bufferGeometry />
      <lineBasicMaterial
        color={stream.color}
        transparent
        opacity={stream.intensity}
        linewidth={2}
      />
    </line>
  );
}

function MarketThoughtBubble({ bubble }: { bubble: ThoughtBubble }) {
  const meshRef = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    if (meshRef.current) {
      const time = state.clock.elapsedTime;
      meshRef.current.scale.setScalar(
        bubble.size * (1 + Math.sin(time * 2) * 0.1),
      );
      meshRef.current.position.y =
        bubble.position[1] + Math.sin(time * 3) * 0.2;
    }
  });

  const emotionColors = {
    fear: "#ff0000",
    greed: "#00ff00",
    hope: "#00ffff",
    panic: "#ff00ff",
    euphoria: "#ffff00",
  };

  return (
    <group position={bubble.position}>
      <Float speed={1} rotationIntensity={0.2} floatIntensity={0.3}>
        <mesh ref={meshRef}>
          <sphereGeometry args={[bubble.size, 16, 16]} />
          <meshBasicMaterial
            color={emotionColors[bubble.emotion]}
            transparent
            opacity={bubble.opacity * 0.3}
          />
        </mesh>
      </Float>

      <Text
        position={[0, 0, bubble.size + 0.1]}
        fontSize={bubble.size * 0.3}
        color="#ffffff"
        anchorX="center"
        anchorY="middle"
      >
        {bubble.text}
      </Text>

      <Sparkles
        count={10}
        scale={[bubble.size * 2, bubble.size * 2, bubble.size * 2]}
        size={0.05}
        speed={0.5}
        opacity={bubble.opacity}
        color={emotionColors[bubble.emotion]}
      />
    </group>
  );
}

function QuantumRealm({
  nodes,
  dataStreams,
  thoughtBubbles,
  onObserveNode,
  onEntangleNode,
}: {
  nodes: QuantumNode[];
  dataStreams: DataStream[];
  thoughtBubbles: ThoughtBubble[];
  onObserveNode: (node: QuantumNode) => void;
  onEntangleNode: (node: QuantumNode) => void;
}) {
  const groupRef = useRef<THREE.Group>(null);

  useFrame((state) => {
    if (groupRef.current) {
      groupRef.current.rotation.y += 0.001;
      groupRef.current.rotation.x =
        Math.sin(state.clock.elapsedTime * 0.1) * 0.05;
    }
  });

  return (
    <group ref={groupRef}>
      {/* Quantum Lighting */}
      <ambientLight intensity={0.2} />
      <pointLight position={[10, 10, 10]} intensity={2} color="#ff00ff" />
      <pointLight position={[-10, -10, -10]} intensity={2} color="#00ffff" />
      <pointLight position={[0, 15, 0]} intensity={3} color="#ffffff" />
      <spotLight position={[0, 20, 0]} intensity={1} color="#ffff00" />

      {/* Background Stars */}
      <Stars
        radius={200}
        depth={100}
        count={10000}
        factor={4}
        saturation={0}
        fade
        speed={0.5}
      />

      {/* Quantum Nodes */}
      {nodes.map((node) => (
        <QuantumStockNode
          key={node.id}
          node={node}
          onObserve={onObserveNode}
          onEntangle={onEntangleNode}
        />
      ))}

      {/* Data Streams */}
      {dataStreams.map((stream) => (
        <QuantumDataStream key={stream.id} stream={stream} />
      ))}

      {/* Market Thought Bubbles */}
      {thoughtBubbles.map((bubble) => (
        <MarketThoughtBubble key={bubble.id} bubble={bubble} />
      ))}

      {/* Central Quantum Core */}
      <group position={[0, 0, 0]}>
        <TorusKnot args={[2, 0.5, 128, 32]} scale={[1, 1, 1]}>
          <MeshDistortMaterial
            color="#ffffff"
            emissive="#ffffff"
            emissiveIntensity={2}
            metalness={1}
            roughness={0}
            distort={0.5}
            speed={3}
          />
        </TorusKnot>

        <Sparkles
          count={100}
          scale={[10, 10, 10]}
          size={0.3}
          speed={2}
          opacity={0.8}
          color="#ffffff"
        />
      </group>

      <OrbitControls
        enableDamping
        dampingFactor={0.05}
        minDistance={5}
        maxDistance={50}
        enablePan={true}
        enableZoom={true}
        enableRotate={true}
      />
    </group>
  );
}

const QuantumTradingOracle = memo(function QuantumTradingOracle() {
  const [nodes, setNodes] = useState<QuantumNode[]>([]);
  const [dataStreams, setDataStreams] = useState<DataStream[]>([]);
  const [thoughtBubbles, setThoughtBubbles] = useState<ThoughtBubble[]>([]);
  const [entangledNodes, setEntangledNodes] = useState<Set<string>>(new Set());

  // Generate quantum stock data
  const quantumStockData = useMemo<QuantumNode[]>(() => {
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
    ];

    const quantumStates: (
      | "superposition"
      | "entangled"
      | "collapsed"
      | "observed"
    )[] = ["superposition", "entangled", "collapsed", "observed"];

    return symbols.map((symbol, idx) => {
      const angle = (idx / symbols.length) * Math.PI * 2 * 3;
      const radius = 8 + Math.random() * 12;
      const height = (Math.random() - 0.5) * 10;

      return {
        id: `quantum-${symbol}-${idx}`,
        symbol,
        price: 50 + Math.random() * 500,
        change: (Math.random() - 0.5) * 20,
        volume: Math.floor(Math.random() * 10000000),
        position: [
          Math.cos(angle) * radius,
          height,
          Math.sin(angle) * radius,
        ] as [number, number, number],
        rotation: [
          Math.random() * Math.PI * 2,
          Math.random() * Math.PI * 2,
          Math.random() * Math.PI * 2,
        ] as [number, number, number],
        scale: [
          0.5 + Math.random() * 0.5,
          0.5 + Math.random() * 0.5,
          0.5 + Math.random() * 0.5,
        ] as [number, number, number],
        color: `hsl(${Math.random() * 360}, 70%, 50%)`,
        energy: Math.random(),
        consciousness: Math.random(),
        quantumState:
          quantumStates[Math.floor(Math.random() * quantumStates.length)] ?? "superposition",
        connections: [],
      };
    });
  }, []);

  // Generate data streams
  const streamData = useMemo<DataStream[]>(() => {
    const streams: DataStream[] = [];
    for (let i = 0; i < 20; i++) {
      streams.push({
        id: `stream-${i}`,
        from: [
          (Math.random() - 0.5) * 30,
          (Math.random() - 0.5) * 20,
          (Math.random() - 0.5) * 30,
        ] as [number, number, number],
        to: [
          (Math.random() - 0.5) * 30,
          (Math.random() - 0.5) * 20,
          (Math.random() - 0.5) * 30,
        ] as [number, number, number],
        color: `hsl(${Math.random() * 360}, 100%, 50%)`,
        intensity: 0.3 + Math.random() * 0.7,
        speed: 0.5 + Math.random() * 2,
        particles: Math.floor(Math.random() * 50) + 10,
      });
    }
    return streams;
  }, []);

  // Generate thought bubbles
  const thoughtData = useMemo<ThoughtBubble[]>(() => {
    const thoughts = [
      "BUY!",
      "SELL!",
      "HODL!",
      "MOON!",
      "DUMP!",
      "FOMO!",
      "FUD!",
      "DIAMOND HANDS!",
      "PAPER HANDS!",
      "TO THE MOON!",
      "STONKS!",
      "TENDIES!",
      "APES!",
      "YOLO!",
    ];

    const emotions: ("fear" | "greed" | "hope" | "panic" | "euphoria")[] = [
      "fear",
      "greed",
      "hope",
      "panic",
      "euphoria",
    ];

    return thoughts.map((thought, idx) => ({
      id: `thought-${idx}`,
      position: [
        (Math.random() - 0.5) * 40,
        5 + Math.random() * 10,
        (Math.random() - 0.5) * 40,
      ] as [number, number, number],
      text: thought,
      emotion: emotions[Math.floor(Math.random() * emotions.length)] ?? "hope",
      size: 0.5 + Math.random() * 1,
      opacity: 0.3 + Math.random() * 0.4,
    }));
  }, []);

  React.useEffect(() => {
    setNodes(quantumStockData);
    setDataStreams(streamData);
    setThoughtBubbles(thoughtData);
  }, [quantumStockData, streamData, thoughtData]);

  const handleObserveNode = (node: QuantumNode) => {
    setNodes((prev) =>
      prev.map((n) =>
        n.id === node.id ? { ...n, quantumState: "observed" } : n,
      ),
    );
  };

  const handleEntangleNode = (node: QuantumNode) => {
    const newEntangled = new Set(entangledNodes);
    if (newEntangled.has(node.id)) {
      newEntangled.delete(node.id);
    } else {
      newEntangled.add(node.id);
    }
    setEntangledNodes(newEntangled);

    setNodes((prev) =>
      prev.map((n) => ({
        ...n,
        quantumState: newEntangled.has(n.id) ? "entangled" : n.quantumState,
      })),
    );
  };

  return (
    <div className="relative w-full h-screen bg-black overflow-hidden">
      {/* VR/AR Controls */}
      <div className="absolute top-4 left-4 z-10 flex gap-4">
        <VRButton store={store} />
        <ARButton store={store} />
      </div>

      {/* Oracle Interface */}
      <div className="absolute top-4 right-4 z-10 text-white p-4 bg-black/80 rounded-lg max-w-md border border-purple-400/50 backdrop-blur-sm">
        <h2 className="text-xl font-bold mb-3 text-purple-400">
          🔮 QUANTUM TRADING ORACLE
        </h2>
        <div className="space-y-2 text-xs">
          <p className="text-purple-300">
            🌌 Walk through market consciousness
          </p>
          <p className="text-cyan-300">
            🧠 Observe nodes to collapse wave functions
          </p>
          <p className="text-green-300">
            🔗 Entangle nodes to create quantum correlations
          </p>
          <p className="text-yellow-300">
            💭 Market thoughts float through the ether
          </p>
          <p className="text-red-300">
            ⚡ Energy flows between connected assets
          </p>

          <div className="mt-3 pt-3 border-t border-purple-400/30">
            <p className="text-gray-300 font-bold mb-1">QUANTUM STATES:</p>
            <p className="text-blue-300">
              🔮 Superposition - Infinite possibilities
            </p>
            <p className="text-green-300">🔗 Entangled - Quantum correlation</p>
            <p className="text-red-300">💥 Collapsed - Determined outcome</p>
            <p className="text-white">👁️ Observed - Wave function collapsed</p>
          </div>

          <div className="mt-3 pt-3 border-t border-purple-400/30">
            <p className="text-gray-300 font-bold mb-1">VR CONTROLS:</p>
            <p className="text-gray-300">• Grab nodes to observe</p>
            <p className="text-gray-300">• Throw to entangle</p>
            <p className="text-gray-300">• Walk through the quantum realm</p>
            <p className="text-gray-300">• Touch thought bubbles</p>
          </div>
        </div>
      </div>

      {/* Quantum Status */}
      <div className="absolute bottom-4 left-4 z-10 text-white p-3 bg-black/80 rounded-lg border border-purple-400 backdrop-blur-sm">
        <div className="text-sm font-bold text-purple-400 mb-1">
          Quantum Realm Active
        </div>
        <div className="text-xs text-gray-300">
          Nodes: {nodes.length} | Entangled: {entangledNodes.size}
        </div>
        <div className="text-xs text-gray-300">
          Thoughts: {thoughtBubbles.length} | Streams: {dataStreams.length}
        </div>
        <div className="text-xs text-purple-300 mt-1">
          Consciousness: {Math.floor(Math.random() * 100)}%
        </div>
      </div>

      {/* Main Canvas */}
      <Canvas camera={{ position: [0, 5, 25], fov: 75 }}>
        <Suspense fallback={null}>
          <XR store={store}>
            <QuantumRealm
              nodes={nodes}
              dataStreams={dataStreams}
              thoughtBubbles={thoughtBubbles}
              onObserveNode={handleObserveNode}
              onEntangleNode={handleEntangleNode}
            />
          </XR>

          {/* Post-processing Effects */}
          <EffectComposer>
            <Bloom
              intensity={2}
              luminanceThreshold={0.2}
              luminanceSmoothing={0.9}
              radius={0.8}
            />
            <Vignette eskil={false} offset={0.1} darkness={0.8} />
            <Glitch
              delay={new THREE.Vector2(1.5, 3.5)}
              duration={new THREE.Vector2(0.2, 0.4)}
              strength={new THREE.Vector2(0.1, 0.3)}
              chromaticAberrationOffset={new THREE.Vector2(0.5, 0.5)}
            />
            <Noise opacity={0.1} />
            <DepthOfField
              focusDistance={0.02}
              focalLength={0.2}
              bokehScale={4}
              height={480}
            />
          </EffectComposer>
        </Suspense>
      </Canvas>
    </div>
  );
});

export default QuantumTradingOracle;
