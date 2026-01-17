"use client";

import React, { useRef, useState, Suspense } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { VRButton, ARButton, XR, useXRInputSourceState } from "@react-three/xr";
import { Physics, useBox } from "@react-three/cannon";
import { Line } from "@react-three/drei";
import * as THREE from "three";
import { createXRStore } from "@react-three/xr";

const store = createXRStore();

// Floating chart component with physics
function FloatingChart({
  position,
  data,
  color,
  onGrab,
}: {
  position: [number, number, number];
  data: number[];
  color: string;
  onGrab: (id: string) => void;
}) {
  const meshRef = useRef<THREE.Mesh>(null);
  const [isGrabbed, setIsGrabbed] = useState(false);
  const [hovered, setHovered] = useState(false);

  const [ref, api] = useBox(() => ({
    mass: 1,
    position,
    args: [2, 1.5, 0.1],
    type: "Dynamic",
  }));

  useFrame((state) => {
    if (meshRef.current && !isGrabbed) {
      // Gentle floating animation
      meshRef.current.rotation.y += 0.005;
      meshRef.current.position.y += Math.sin(state.clock.elapsedTime) * 0.002;
    }
  });

  const handlePointerDown = () => {
    setIsGrabbed(true);
    onGrab(`chart-${position.join("-")}`);
  };

  const handlePointerUp = () => {
    setIsGrabbed(false);
  };

  return (
    <group ref={ref}>
      <mesh
        ref={meshRef}
        onPointerDown={handlePointerDown}
        onPointerUp={handlePointerUp}
        onPointerOver={() => setHovered(true)}
        onPointerOut={() => setHovered(false)}
      >
        <boxGeometry args={[2, 1.5, 0.1]} />
        <meshStandardMaterial
          color={isGrabbed ? "#ff006e" : color}
          emissive={hovered ? color : "#000000"}
          emissiveIntensity={hovered ? 0.3 : 0}
          metalness={0.8}
          roughness={0.2}
        />
      </mesh>

      {/* Chart bars */}
      {data.map((value, index) => {
        const width = 2;
        const height = 1.5;
        const barWidth = width / data.length;
        const barHeight = (value / 100) * height;
        const x = -width / 2 + index * barWidth + barWidth / 2;
        const y = -height / 2 + barHeight / 2;

        return (
          <mesh key={index} position={[x, y, 0.06]}>
            <boxGeometry args={[barWidth * 0.8, barHeight, 0.05]} />
            <meshStandardMaterial
              color="#00ffff"
              emissive="#00ffff"
              emissiveIntensity={0.5}
              metalness={1}
              roughness={0}
            />
          </mesh>
        );
      })}

      {/* Neon outline */}
      <Line
        points={[
          [-1, -0.75, 0.05],
          [1, -0.75, 0.05],
          [1, 0.75, 0.05],
          [-1, 0.75, 0.05],
          [-1, -0.75, 0.05],
        ]}
        color={color}
        lineWidth={2}
        transparent
        opacity={0.8}
      />
    </group>
  );
}

// Infinite canvas grid
function InfiniteCanvas() {
  const gridRef = useRef<THREE.Group>(null);

  useFrame((state) => {
    if (gridRef.current) {
      // Move grid with camera for infinite effect
      const cameraPosition = state.camera.position;
      gridRef.current.position.x = Math.floor(cameraPosition.x / 10) * 10;
      gridRef.current.position.z = Math.floor(cameraPosition.z / 10) * 10;
    }
  });

  return (
    <group ref={gridRef}>
      {Array.from({ length: 10 }).map((_, i) =>
        Array.from({ length: 10 }).map((_, j) => (
          <mesh
            key={`${i}-${j}`}
            position={[i * 10 - 50, -2, j * 10 - 50]}
            rotation={[-Math.PI / 2, 0, 0]}
          >
            <planeGeometry args={[10, 10]} />
            <meshStandardMaterial color="#001122" transparent opacity={0.3} />
          </mesh>
        )),
      )}
    </group>
  );
}

// Neon atmosphere effects
function NeonAtmosphere() {
  return (
    <>
      {/* Ambient lights */}
      <ambientLight intensity={0.2} color="#001133" />

      {/* Neon accent lights */}
      <pointLight position={[10, 10, 10]} color="#ff006e" intensity={2} />
      <pointLight position={[-10, 10, 10]} color="#00ffff" intensity={2} />
      <pointLight position={[0, -10, -10]} color="#ffff00" intensity={1.5} />
      <pointLight position={[10, -10, -10]} color="#ff00ff" intensity={1.5} />

      {/* Fog for depth */}
      <fog attach="fog" args={["#000011", 10, 100]} />
    </>
  );
}

// Camera setup for XR
function XRCamera() {
  const { camera } = useThree();

  useFrame(() => {
    camera.position.set(0, 1.6, 0); // Eye level
  });

  return null;
}

// Main XR Scene
function XRScene() {
  const [charts, setCharts] = useState([
    {
      id: "1",
      position: [0, 2, -5] as [number, number, number],
      data: [65, 80, 45, 90, 70],
      color: "#ff006e",
    },
    {
      id: "2",
      position: [-3, 1, -4] as [number, number, number],
      data: [30, 60, 85, 40, 75],
      color: "#00ffff",
    },
    {
      id: "3",
      position: [3, 1, -6] as [number, number, number],
      data: [50, 70, 30, 95, 60],
      color: "#ffff00",
    },
    {
      id: "4",
      position: [0, 3, -8] as [number, number, number],
      data: [80, 45, 70, 55, 90],
      color: "#ff00ff",
    },
  ]);

  const handleChartGrab = (chartId: string) => {
    console.log(`Grabbed chart: ${chartId}`);
  };

  return (
    <>
      <NeonAtmosphere />
      <Physics gravity={[0, -9.8, 0]}>
        <InfiniteCanvas />

        {/* Floating charts */}
        {charts.map((chart) => (
          <FloatingChart
            key={chart.id}
            position={chart.position}
            data={chart.data}
            color={chart.color}
            onGrab={handleChartGrab}
          />
        ))}
      </Physics>

      <XRCamera />
    </>
  );
}

// Main component
export default function MinorityReportXR() {
  return (
    <div className="relative w-full h-screen bg-black">
      {/* XR Entry Buttons */}
      <div className="absolute top-4 left-4 z-10 flex gap-4">
        <VRButton store={store} />
        <ARButton store={store} />
      </div>

      {/* Instructions */}
      <div className="absolute top-4 right-4 z-10 text-white p-4 bg-black/50 rounded-lg max-w-sm">
        <h2 className="text-lg font-bold mb-2 text-cyan-400">
          MINORITY REPORT INTERFACE
        </h2>
        <div className="space-y-2 text-sm">
          <p className="text-cyan-300">🎮 Use VR/AR controllers to interact</p>
          <p className="text-cyan-300">📊 Touch charts to grab and throw</p>
          <p className="text-cyan-300">✨ Neon data visualization</p>
          <p className="text-cyan-300">∞ Infinite canvas space</p>
        </div>
      </div>

      {/* 3D Canvas */}
      <Canvas camera={{ position: [0, 1.6, 0], fov: 75 }}>
        <Suspense fallback={null}>
          <XR store={store}>
            <XRScene />
          </XR>
        </Suspense>
      </Canvas>
    </div>
  );
}
