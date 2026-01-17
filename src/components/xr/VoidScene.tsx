"use client";

import React, { useRef, useState } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, Stars, Grid } from "@react-three/drei";
import { EffectComposer, Bloom } from "@react-three/postprocessing";

function MarketCore() {
    const meshRef = useRef<any>(null);

    useFrame((state, delta) => {
        if (meshRef.current) {
            meshRef.current.rotation.y += delta * 0.2;
            meshRef.current.rotation.x += delta * 0.1;
        }
    });

    return (
        <mesh ref={meshRef}>
            <icosahedronGeometry args={[1, 1]} />
            <meshStandardMaterial
                color="#00ffff"
                emissive="#00ffff"
                emissiveIntensity={2}
                wireframe
            />
        </mesh>
    );
}

export default function VoidScene() {
    return (
        <div className="w-full h-[600px] bg-black rounded-lg overflow-hidden border border-zinc-800 shadow-2xl relative">
            <div className="absolute top-4 left-4 z-10 text-zinc-500 font-mono text-xs pointer-events-none">
                THE_VOID_TERMINAL // PRE_ALPHA
            </div>

            <Canvas camera={{ position: [0, 2, 5], fov: 60 }}>
                <color attach="background" args={["#050505"]} />
                <fog attach="fog" args={["#050505", 5, 20]} />

                {/* Lighting */}
                <ambientLight intensity={0.5} />
                <pointLight position={[10, 10, 10]} intensity={1} />

                {/* Environment */}
                <Stars radius={100} depth={50} count={5000} factor={4} saturation={0} fade speed={1} />
                <Grid
                    infiniteGrid
                    fadeDistance={30}
                    sectionColor="#ffffff"
                    cellColor="#444444"
                    sectionThickness={1}
                    cellThickness={0.5}
                />

                {/* Objects */}
                <MarketCore />

                {/* Controls */}
                <OrbitControls makeDefault />

                {/* Post Processing */}
                {/* Note: PostProcessing might require specific setup in Next.js, verify output */}
            </Canvas>
        </div>
    );
}
