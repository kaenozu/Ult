'use client';

import React, {
  useState,
  useRef,
  useEffect,
  useMemo,
  useCallback,
} from 'react';
import * as THREE from 'three';
import { Canvas } from '@react-three/fiber';
import { Suspense } from 'react';
import { ARButton, VRButton, XR } from '@react-three/xr';
import { OrbitControls } from '@react-three/drei';
import { useWebSocket } from '@/components/shared/hooks/useSynapse';

// Define types
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
}

interface ExplosionParticle {
  id: string;
  position: [number, number, number];
  velocity: [number, number, number];
  life: number;
  color: string;
}

interface StockStarProps {
  node: StockNode;
  onGrab: (id: string) => void;
  isGrabbed: boolean;
}

// Stock Star component
const StockStar: React.FC<StockStarProps> = ({ node, onGrab, isGrabbed }) => {
  const meshRef = useRef<THREE.Mesh>(null);
  const [hovered, setHovered] = useState(false);

  const color = useMemo(() => {
    if (node.changePercent > 5) return '#22c55e'; // Green
    if (node.changePercent < -5) return '#ef4444'; // Red
    return '#3b82f6'; // Blue
  }, [node.changePercent]);

  return (
    <mesh
      ref={meshRef}
      position={node.position}
      scale={isGrabbed ? 1.5 : hovered ? 1.2 : 1}
      onClick={() => onGrab(node.id)}
      onPointerOver={() => setHovered(true)}
      onPointerOut={() => setHovered(false)}
    >
      <sphereGeometry args={[node.size, 16, 16]} />
      <meshStandardMaterial color={color} />
    </mesh>
  );
};

// Explosion Particle component
const ExplosionParticle: React.FC<{ particle: ExplosionParticle }> = ({
  particle,
}) => {
  const meshRef = useRef<THREE.Mesh>(null);

  return (
    <mesh ref={meshRef} position={particle.position}>
      <sphereGeometry args={[0.1, 8, 8]} />
      <meshStandardMaterial color={particle.color} />
    </mesh>
  );
};

// Stock Galaxy Scene
const StockGalaxyScene: React.FC<{
  stocks: StockNode[];
  explosions: ExplosionParticle[];
  onGrabStock: (id: string) => void;
  onThrowStock: (id: string, velocity: [number, number, number]) => void;
  onExplodeStock: (id: string) => void;
}> = ({ stocks, explosions, onGrabStock, onThrowStock, onExplodeStock }) => {
  const [grabbedStock, setGrabbedStock] = useState<string | null>(null);
  const [grabOffset, setGrabOffset] = useState<[number, number, number]>([
    0, 0, 0,
  ]);

  const handleGrabStock = useCallback(
    (stockId: string) => {
      setGrabbedStock(stockId);
      const stock = stocks.find(s => s.id === stockId);
      if (stock) {
        setGrabOffset(stock.position);
      }
    },
    [stocks]
  );

  const handleThrowStock = useCallback(
    (stockId: string, velocity: [number, number, number]) => {
      onThrowStock(stockId, velocity);
      setGrabbedStock(null);
    },
    [onThrowStock]
  );

  return (
    <>
      <ambientLight intensity={0.5} />

      {stocks.map(stock => (
        <StockStar
          key={stock.id}
          node={stock}
          onGrab={handleGrabStock}
          isGrabbed={stock.id === grabbedStock}
        />
      ))}

      {explosions.map(particle => (
        <ExplosionParticle key={particle.id} particle={particle} />
      ))}

      <OrbitControls enablePan={true} enableZoom={true} enableRotate={true} />
    </>
  );
};

// Main Interactive Stock Galaxy Component
const InteractiveStockGalaxy: React.FC = () => {
  const { lastMessage, sendMessage } = useWebSocket('galaxy');
  const [stocks, setStocks] = useState<StockNode[]>([]);
  const [explosions, setExplosions] = useState<ExplosionParticle[]>([]);

  // Initialize mock stock data
  useEffect(() => {
    const mockStocks: StockNode[] = [
      {
        id: '1',
        symbol: 'AAPL',
        sector: 'Technology',
        price: 150.25,
        change: 2.5,
        changePercent: 1.69,
        position: [0, 0, 0],
        size: 1.0,
        velocity: [0, 0, 0],
        isGrabbed: false,
      },
      {
        id: '2',
        symbol: 'GOOGL',
        sector: 'Technology',
        price: 2800.5,
        change: -10.25,
        changePercent: -0.36,
        position: [3, 2, 1],
        size: 1.2,
        velocity: [0, 0, 0],
        isGrabbed: false,
      },
      {
        id: '3',
        symbol: 'MSFT',
        sector: 'Technology',
        price: 305.75,
        change: 5.25,
        changePercent: 1.75,
        position: [-2, 1, -1],
        size: 0.9,
        velocity: [0, 0, 0],
        isGrabbed: false,
      },
    ];
    setStocks(mockStocks);
  }, []);

<<<<<<< HEAD
  // Handle WebSocket updates
  useEffect(() => {
    if (lastMessage) {
      try {
        const data = JSON.parse(lastMessage.data);
        if (data.type === 'stock_update') {
          setStocks(prev =>
            prev.map(stock =>
              stock.id === data.stock_id ? { ...stock, ...data.data } : stock
            )
          );
        }
      } catch (error) {
        // Handle error silently in production
      }
    }
  }, [lastMessage]);

  const handleGrabStock = useCallback((stockId: string) => {
    setStocks(prev =>
      prev.map(stock =>
        stock.id === stockId ? { ...stock, isGrabbed: true } : stock
      )
    );
  }, []);

  const handleThrowStock = useCallback(
    (stockId: string, velocity: [number, number, number]) => {
      setStocks(prev =>
        prev.map(stock =>
          stock.id === stockId
            ? { ...stock, velocity, isGrabbed: false }
            : stock
        )
      );
    },
    []
  );

  const createExplosion = useCallback(
    (stockId: string) => {
      const stock = stocks.find(s => s.id === stockId);
      if (!stock) return;

      const newExplosions: ExplosionParticle[] = [];
      const colors = ['#ff3333', '#ff9933', '#ffff33', '#ffffff'];

      for (let i = 0; i < 20; i++) {
        newExplosions.push({
          id: `explosion_${Date.now()}_${i}`,
          position: [...stock.position] as [number, number, number],
          velocity: [
            (Math.random() - 0.5) * 2,
            Math.random() * 2,
            (Math.random() - 0.5) * 2,
          ],
          life: 1.0,
          color: colors[Math.floor(Math.random() * colors.length)],
        });
      }

      setExplosions(prev => [...prev, ...newExplosions]);

      // Remove the exploded stock
      setStocks(prev => prev.filter(s => s.id !== stockId));
    },
    [stocks]
  );

  // Update explosions
  useEffect(() => {
    const interval = setInterval(() => {
      setExplosions(prev =>
        prev
          .map(particle => ({
            ...particle,
            position: [
              particle.position[0] + particle.velocity[0] * 0.1,
              particle.position[1] + particle.velocity[1] * 0.1,
              particle.position[2] + particle.velocity[2] * 0.1,
            ],
            life: particle.life - 0.02,
          }))
          .filter(particle => particle.life > 0)
      );
    }, 50);

    return () => clearInterval(interval);
=======
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

  // Animation loop for stocks and explosions (using useEffect since this is outside Canvas)
  React.useEffect(() => {
    let animationId: number;

    const animate = () => {
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

      animationId = requestAnimationFrame(animate);
    };

    animationId = requestAnimationFrame(animate);

    return () => cancelAnimationFrame(animationId);
>>>>>>> main
  }, []);

  return (
    <div style={{ width: '100vw', height: '100vh' }}>
      <Canvas camera={{ position: [0, 5, 10], fov: 60 }}>
        <XR>
          <Suspense fallback={null}>
            <StockGalaxyScene
              stocks={stocks}
              explosions={explosions}
              onGrabStock={handleGrabStock}
              onThrowStock={handleThrowStock}
              onExplodeStock={createExplosion}
            />
          </Suspense>
        </XR>
      </Canvas>
      <VRButton />
      <ARButton />
    </div>
  );
<<<<<<< HEAD
};
=======
});
>>>>>>> main

export default InteractiveStockGalaxy;
