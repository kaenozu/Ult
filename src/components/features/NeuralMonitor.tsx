"use client";

import React, { useRef, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Sphere, MeshDistortMaterial, Text, Stars } from '@react-three/drei';
import { useNeuralStore } from '@/lib/store/neuralStore';
// import { EdgeAIClient } from '@/lib/ai/EdgeAIClient';
import * as THREE from 'three';
import { useState, useEffect } from 'react';

const BrainCore = () => {
    const meshRef = useRef<THREE.Mesh>(null!);
    const { sentimentScore, sentimentLabel } = useNeuralStore();

    // Color interpolation based on sentiment
    // Red (Negative) <-> Blue (Neutral) <-> Green (Positive)
    // Actually, let's use:
    // NEGATIVE = Red (#ff0055)
    // POSITIVE = Cyan (#00ffcc)
    const targetColor = useMemo(() => {
        return sentimentLabel === 'POSITIVE' ? new THREE.Color("#00ffcc") : new THREE.Color("#ff0055");
    }, [sentimentLabel]);

    useFrame((state) => {
        const time = state.clock.getElapsedTime();

        if (meshRef.current) {
            // Pulse speed based on score intensity
            const pulseSpeed = 1 + (sentimentScore * 2);
            const distortion = 0.3 + (sentimentScore * 0.5);

            // Smoothly interpolate color
            const mat = meshRef.current.material as THREE.MeshStandardMaterial;
            if (mat.color) mat.color.lerp(targetColor, 0.05);

            // Rotate
            meshRef.current.rotation.x = time * 0.2;
            meshRef.current.rotation.y = time * 0.3;

            // Dynamic distortion
            (meshRef.current.material as any).distort = THREE.MathUtils.lerp(
                (meshRef.current.material as any).distort,
                distortion,
                0.1
            );
        }
    });

    return (
        <Sphere args={[1, 64, 64]} ref={meshRef}>
            <MeshDistortMaterial
                color="#00aaff"
                attach="material"
                distort={0.5}
                speed={2}
                roughness={0.2}
                metalness={0.8}
            />
        </Sphere>
    );
};

const NeuralThoughtText = () => {
    const { latestThought, sentimentLabel, sentimentScore } = useNeuralStore();

    return (
        <group position={[0, -2, 0]}>
            <Text
                fontSize={0.2}
                color="white"
                anchorX="center"
                anchorY="middle"
                outlineWidth={0.01}
                outlineColor="black"
            >
                {latestThought}
            </Text>
            <Text
                position={[0, -0.3, 0]}
                fontSize={0.15}
                color={sentimentLabel === 'POSITIVE' ? "#00ffcc" : "#ff0055"}
                anchorX="center"
                anchorY="middle"
            >
                {`${sentimentLabel} (${(sentimentScore * 100).toFixed(1)}%)`}
            </Text>
        </group>
    );
};

export const NeuralMonitor = () => {
    const { isActive, addThought } = useNeuralStore();
    const [inputText, setInputText] = useState("");
    const [isProcessing, setIsProcessing] = useState(false);

    // WebSocket Connection for Backend Thoughts
    useEffect(() => {
        if (!isActive) return;

        const ws = new WebSocket("ws://127.0.0.1:8000/ws/synapse");

        ws.onopen = () => {
            console.log("NeuralMonitor: Connected to Synapse");
            ws.send(JSON.stringify({
                type: "subscribe",
                payload: { channels: ["agent_activity"] },
                direction: "client_to_server",
                msg_id: crypto.randomUUID()
            }));
        };

        ws.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data);
                if (data.type === "agent_activity" && data.payload?.activity_type === "THOUGHT") {
                    const thought = data.payload.data;
                    // Backend thought received
                    addThought(
                        thought.content,
                        thought.sentiment_score || 0.5,
                        thought.sentiment_label || 'NEUTRAL'
                    );
                }
            } catch (e) {
                console.error("NeuralMonitor: WS Error", e);
            }
        };

        return () => {
            ws.close();
        };
    }, [isActive, addThought]);

    /*
    const handleEdgeSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!inputText.trim()) return;

        setIsProcessing(true);
        try {
            const client = EdgeAIClient.getInstance();
            const results = await client.analyze(inputText);

            if (results && results.length > 0) {
                const top = results[0];
                // Normalize score and label if needed
                // Transformers.js often returns label "POSITIVE" or "NEGATIVE"
                // We map it to our store
                addThought(inputText, top.score, top.label.toUpperCase());
            }
            setInputText("");
        } catch (err) {
            console.error("Edge AI Failed:", err);
        } finally {
            setIsProcessing(false);
        }
    };
    */

    const handleEdgeSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        addThought(inputText, 0.5, 'NEUTRAL');
        setInputText("");
    };

    if (!isActive) return null;

    return (
        <div className="fixed inset-0 z-50 pointer-events-none fade-in">
            {/* Background Overlay */}
            <div className="absolute inset-0 bg-black/80 backdrop-blur-sm -z-10" />

            <Canvas camera={{ position: [0, 0, 5] }}>
                <ambientLight intensity={0.5} />
                <pointLight position={[10, 10, 10]} intensity={1} />
                <BrainCore />
                <NeuralThoughtText />
                <Stars radius={100} depth={50} count={5000} factor={4} saturation={0} fade speed={1} />
                <OrbitControls enableZoom={false} enablePan={false} autoRotate autoRotateSpeed={0.5} />
            </Canvas>

            {/* Edge AI Input Interface */}
            <div className="absolute bottom-10 left-1/2 transform -translate-x-1/2 w-full max-w-md pointer-events-auto">
                <form onSubmit={handleEdgeSubmit} className="flex gap-2">
                    <input
                        type="text"
                        value={inputText}
                        onChange={(e) => setInputText(e.target.value)}
                        placeholder="Provide input to Neural Edge..."
                        className="flex-1 bg-black/50 border border-cyan-500/30 rounded px-4 py-2 text-cyan-500 placeholder-cyan-500/50 focus:outline-none focus:border-cyan-500 focus:shadow-[0_0_15px_rgba(0,255,255,0.3)] backdrop-blur-md transition-all"
                    />
                    <button
                        type="submit"
                        disabled={isProcessing}
                        className="bg-cyan-500/20 border border-cyan-500/50 text-cyan-500 px-4 py-2 rounded hover:bg-cyan-500/40 disabled:opacity-50 transition-all font-mono uppercase text-sm"
                    >
                        {isProcessing ? "Thinking..." : "Inject"}
                    </button>
                </form>
            </div>
        </div>
    );
};
