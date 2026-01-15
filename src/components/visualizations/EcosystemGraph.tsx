'use client';

import dynamic from 'next/dynamic';
import { useTheme } from 'next-themes';
import { useMemo, useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';

// Dynamically import ForceGraph3D to avoid SSR issues
const ForceGraph3D = dynamic(() => import('react-force-graph-3d'), {
    ssr: false,
    loading: () => <div className="h-[500px] w-full flex items-center justify-center text-cyan-500 animate-pulse">Initializing Neural Link...</div>
});

const MOCK_DATA = {
    nodes: [
        { id: 'NVDA', name: 'NVIDIA', group: 'US', val: 30, color: '#76b900' },
        { id: 'TSM', name: 'TSMC', group: 'TW', val: 25, color: '#ff0000' },
        { id: 'ASML', name: 'ASML', group: 'EU', val: 20, color: '#003399' },
        { id: '8035.T', name: 'Tokyo Electron', group: 'JP', val: 18, color: '#00ffff' },
        { id: '6723.T', name: 'Renesas', group: 'JP', val: 15, color: '#0088ff' },
        { id: '9984.T', name: 'SoftBank Group', group: 'JP', val: 22, color: '#cccccc' },
        { id: '6857.T', name: 'Advantest', group: 'JP', val: 12, color: '#ff9900' },
        { id: 'AAPL', name: 'Apple', group: 'US', val: 28, color: '#aaaaaa' },
        { id: 'INTC', name: 'Intel', group: 'US', val: 15, color: '#0071c5' },
        { id: 'AMD', name: 'AMD', group: 'US', val: 18, color: '#ed1c24' },
        { id: 'MSFT', name: 'Microsoft', group: 'US', val: 25, color: '#00a4ef' },
        { id: 'GOOGL', name: 'Google', group: 'US', val: 24, color: '#34a853' },
        { id: 'SONY', name: 'Sony', group: 'JP', val: 20, color: '#000000' },
    ],
    links: [
        { source: 'TSM', target: 'NVDA', particleColor: '#00ff00' }, // Foundry
        { source: 'ASML', target: 'TSM', particleColor: '#00ffff' }, // Lithography
        { source: '8035.T', target: 'TSM', particleColor: '#00ffff' }, // Equipment
        { source: '8035.T', target: 'INTC', particleColor: '#00ffff' },
        { source: '6857.T', target: 'NVDA', particleColor: '#ff9900' }, // Testing
        { source: '9984.T', target: 'NVDA', particleColor: '#ff00ff' }, // Investment/Arm
        { source: 'AAPL', target: 'TSM', particleColor: '#00ff00' },
        { source: 'AMD', target: 'TSM', particleColor: '#00ff00' },
        { source: '6723.T', target: '8035.T', particleColor: '#aaaaaa' }, // Correlation
        { source: 'MSFT', target: 'NVDA', particleColor: '#76b900' }, // AI Demand
        { source: 'GOOGL', target: 'NVDA', particleColor: '#76b900' }, // AI Demand
        { source: 'SONY', target: 'TSM', particleColor: '#00ff00' },
        { source: 'INTC', target: 'ASML', particleColor: '#003399' },
    ]
};

export default function EcosystemGraph() {
    const { theme } = useTheme();
    const [isMounted, setIsMounted] = useState(false);

    useEffect(() => {
        setIsMounted(true);
    }, []);

    // Cyberpunk theme adjustments
    const bgColor = theme === 'dark' ? '#050505' : '#ffffff';

    if (!isMounted) return null;

    return (
        <Card className="w-full h-[600px] overflow-hidden border-cyan-900/50 bg-black relative group">
            <div className="absolute top-4 left-4 z-10 pointer-events-none">
                <h2 className="text-2xl font-bold text-cyan-400 font-mono tracking-tighter">
                    NEURAL NEXUS <span className="text-xs text-white/50 bg-cyan-900/30 px-2 py-0.5 rounded ml-2">LIVE</span>
                </h2>
                <p className="text-xs text-cyan-600/70 font-mono">SUPPLY CHAIN & CORRELATION MATRIX</p>
            </div>

            <ForceGraph3D
                graphData={MOCK_DATA}
                nodeLabel="name"
                nodeColor="color"
                nodeVal="val"
                nodeRelSize={4}
                linkColor={() => 'rgba(0, 255, 255, 0.2)'}
                linkWidth={1}
                bgLabel="Neural Nexus"
                linkDirectionalParticles={4}
                linkDirectionalParticleSpeed={d => 0.005}
                linkDirectionalParticleWidth={1.5}
                linkDirectionalParticleColor={(d: any) => d.particleColor || '#ffffff'}
                backgroundColor="#030305" // Deep void black
                showNavInfo={false}
                enableNodeDrag={false}
                onNodeClick={(node: any) => {
                    // Future interaction: Focus on node or open details
                    console.log("Focused on:", node.name);
                }}
            />

            {/* Cyberpunk Overlay Grid */}
            <div className="absolute inset-0 pointer-events-none bg-[url('/grid.png')] opacity-10 mix-blend-overlay"></div>
            <div className="absolute bottom-4 right-4 z-10 text-right">
                <div className="flex gap-2 text-xs font-mono text-cyan-500/50">
                    <span>NODES: {MOCK_DATA.nodes.length}</span>
                    <span>LINKS: {MOCK_DATA.links.length}</span>
                </div>
            </div>
        </Card>
    );
}
