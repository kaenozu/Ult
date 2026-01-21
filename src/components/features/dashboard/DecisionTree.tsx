'use client';

import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import {
  GitBranch,
  GitBranchPlus,
  Circle,
  ChevronRight,
  Zap,
  AlertTriangle,
  TrendingUp,
} from 'lucide-react';

interface DecisionNode {
  id: string;
  label: string;
  type: 'decision' | 'outcome' | 'analysis';
  confidence: number;
  children?: DecisionNode[];
  position: { x: number; y: number };
  active?: boolean;
  result?: string;
}

interface Connection {
  from: string;
  to: string;
  strength: number;
}

export default function DecisionTree() {
  const [nodes, setNodes] = useState<DecisionNode[]>([]);
  const [connections, setConnections] = useState<Connection[]>([]);
  const [currentPath, setCurrentPath] = useState<string[]>([]);
  const [isGrowing, setIsGrowing] = useState<boolean>(false);

  // Generate decision tree structure
  useEffect(() => {
    if (!isGrowing) return;

    const growInterval = setInterval(() => {
      setNodes(prevNodes => {
        if (prevNodes.length === 0) {
          // Start with root node
          const rootNode: DecisionNode = {
            id: 'root',
            label: 'Market Entry?',
            type: 'decision',
            confidence: 0.85,
            position: { x: 250, y: 50 },
            active: true,
            children: [],
          };
          return [rootNode];
        }

        if (prevNodes.length > 12) {
          setIsGrowing(false);
          return prevNodes;
        }

        // Find active nodes to expand
        const activeNodes = prevNodes.filter(
          n => n.active && (!n.children || n.children.length === 0)
        );

        if (activeNodes.length === 0) return prevNodes;

        const parentNode =
          activeNodes[Math.floor(Math.random() * activeNodes.length)];
        if (!parentNode) return prevNodes;

        const numChildren = Math.random() > 0.5 ? 2 : 3;

        const newNodes: DecisionNode[] = [];
        const newConnections: Connection[] = [];

        for (let i = 0; i < numChildren; i++) {
          const childId = `${parentNode.id}-${i}`;
          const angle = (i - (numChildren - 1) / 2) * (60 / numChildren);
          const distance = 80;

          const childNode: DecisionNode = {
            id: childId,
            label: generateNodeLabel(),
            type: generateNodeType(),
            confidence: Math.random() * 0.4 + 0.6,
            position: {
              x:
                parentNode.position.x +
                Math.sin((angle * Math.PI) / 180) * distance,
              y:
                parentNode.position.y +
                Math.cos((angle * Math.PI) / 180) * distance,
            },
          };

          newNodes.push(childNode);
          newConnections.push({
            from: parentNode.id,
            to: childId,
            strength: Math.random() * 0.5 + 0.5,
          });

          // Update parent node
          parentNode.children = parentNode.children || [];
          parentNode.children.push(childNode);
        }

        // Mark parent as expanded
        parentNode.active = false;

        // Update current path
        if (Math.random() > 0.5) {
          setCurrentPath(prev => [...prev.slice(-3), newNodes[0].id]);
        }

        setConnections(prev => [...prev, ...newConnections]);
        return [...prevNodes, ...newNodes];
      });
    }, 800);

    return () => clearInterval(growInterval);
  }, [isGrowing]);

  const generateNodeLabel = (): string => {
    const labels = [
      'Analyze Volume',
      'Check RSI',
      'Risk Assessment',
      'Momentum Check',
      'Volatility Filter',
      'Sentiment Scan',
      'Support/Resist',
      'Trend Analysis',
      'News Impact',
      'Correlation Check',
      'Buy Signal',
      'Sell Signal',
      'Hold Position',
      'Increase Size',
      'Decrease Risk',
    ];
    return labels[Math.floor(Math.random() * labels.length)];
  };

  const generateNodeType = (): 'decision' | 'outcome' | 'analysis' => {
    const rand = Math.random();
    if (rand < 0.4) return 'decision';
    if (rand < 0.7) return 'analysis';
    return 'outcome';
  };

  const getNodeColor = (node: DecisionNode) => {
    if (currentPath.includes(node.id)) {
      return 'border-yellow-400 bg-yellow-400/10 text-yellow-300';
    }

    switch (node.type) {
      case 'decision':
        return 'border-cyan-400 bg-cyan-400/10 text-cyan-300';
      case 'analysis':
        return 'border-purple-400 bg-purple-400/10 text-purple-300';
      case 'outcome':
        return 'border-emerald-400 bg-emerald-400/10 text-emerald-300';
      default:
        return 'border-gray-600 bg-gray-600/10 text-gray-400';
    }
  };

  const getNodeIcon = (type: string) => {
    switch (type) {
      case 'decision':
        return <GitBranch className='w-3 h-3' />;
      case 'analysis':
        return <AlertTriangle className='w-3 h-3' />;
      case 'outcome':
        return <TrendingUp className='w-3 h-3' />;
      default:
        return <Circle className='w-3 h-3' />;
    }
  };

  const resetTree = () => {
    setNodes([]);
    setConnections([]);
    setCurrentPath([]);
    setIsGrowing(false);
  };

  return (
    <Card className='p-6 border border-purple-500/30 bg-black/40 backdrop-blur-md relative overflow-hidden'>
      {/* Background pattern */}
      <div className='absolute inset-0 opacity-5'>
        <div className='grid grid-cols-10 grid-rows-6 h-full'>
          {Array(60)
            .fill(0)
            .map((_, i) => (
              <div key={i} className='border border-purple-500/20' />
            ))}
        </div>
      </div>

      {/* Header */}
      <div className='relative z-10 flex items-center justify-between mb-6'>
        <div className='flex items-center gap-3'>
          <div className='p-2 rounded-full border border-purple-400 bg-purple-400/20'>
            <GitBranchPlus className='w-5 h-5 text-purple-400' />
          </div>
          <div>
            <h3 className='text-lg font-bold text-white'>DECISION TREE</h3>
            <p className='text-xs text-gray-400'>
              Interactive AI decision path visualization
            </p>
          </div>
        </div>

        <div className='flex gap-2'>
          <button
            onClick={() => setIsGrowing(!isGrowing)}
            className={`px-3 py-1.5 rounded-lg text-xs font-mono transition-all ${
              isGrowing
                ? 'bg-purple-500/20 border border-purple-400 text-purple-400'
                : 'bg-gray-800 border border-gray-600 text-gray-400'
            }`}
          >
            {isGrowing ? 'GROWING' : 'STATIC'}
          </button>
          <button
            onClick={resetTree}
            className='px-3 py-1.5 rounded-lg text-xs font-mono bg-gray-800 border border-gray-600 text-gray-400 hover:border-gray-500 transition-all'
          >
            RESET
          </button>
        </div>
      </div>

      {/* Decision Tree Visualization */}
      <div className='relative z-10 h-80 overflow-hidden rounded-lg border border-purple-500/20 bg-black/20'>
        {nodes.length === 0 ? (
          <div className='flex flex-col items-center justify-center h-full text-gray-500'>
            <GitBranch className='w-12 h-12 mb-3 opacity-50' />
            <p className='text-sm font-mono'>DECISION TREE EMPTY</p>
            <p className='text-xs opacity-60'>
              Click GROWING to visualize AI decisions
            </p>
          </div>
        ) : (
          <svg className='absolute inset-0 w-full h-full'>
            {/* Connections */}
            {connections.map((conn, i) => {
              const fromNode = nodes.find(n => n.id === conn.from);
              const toNode = nodes.find(n => n.id === conn.to);
              if (!fromNode || !toNode) return null;

              return (
                <line
                  key={i}
                  x1={fromNode.position.x}
                  y1={fromNode.position.y}
                  x2={toNode.position.x}
                  y2={toNode.position.y}
                  stroke={
                    currentPath.includes(toNode.id) ? '#facc15' : '#a855f7'
                  }
                  strokeWidth={conn.strength * 2}
                  strokeOpacity={conn.strength * 0.6}
                  className='transition-all duration-300'
                />
              );
            })}
          </svg>
        )}

        {/* Nodes */}
        {nodes.map(node => (
          <div
            key={node.id}
            className={`absolute px-3 py-2 rounded-lg border transition-all duration-300 ${getNodeColor(node)} ${
              node.active ? 'animate-pulse' : ''
            } ${currentPath.includes(node.id) ? 'ring-2 ring-yellow-400 ring-opacity-50' : ''}`}
            style={{
              left: `${node.position.x - 40}px`,
              top: `${node.position.y - 20}px`,
              minWidth: '80px',
              transform: 'translate(0, 0)',
            }}
          >
            <div className='flex items-center gap-1.5'>
              {getNodeIcon(node.type)}
              <span className='text-xs font-medium whitespace-nowrap'>
                {node.label}
              </span>
              {currentPath.includes(node.id) && (
                <ChevronRight className='w-3 h-3 text-yellow-300 animate-pulse' />
              )}
            </div>
            <div className='text-xs opacity-70 mt-1'>
              {(node.confidence * 100).toFixed(0)}%
            </div>
          </div>
        ))}
      </div>

      {/* Current Path Display */}
      {currentPath.length > 0 && (
        <div className='relative z-10 mt-4 p-3 rounded-lg border border-yellow-500/30 bg-yellow-500/10'>
          <div className='flex items-center gap-2 mb-2'>
            <Zap className='w-4 h-4 text-yellow-400' />
            <span className='text-yellow-300 text-xs font-mono'>
              CURRENT DECISION PATH
            </span>
          </div>
          <div className='flex gap-1 items-center flex-wrap'>
            {currentPath.map((nodeId, i) => {
              const node = nodes.find(n => n.id === nodeId);
              return (
                <React.Fragment key={nodeId}>
                  <span className='text-xs text-yellow-200 font-mono'>
                    {node?.label || nodeId}
                  </span>
                  {i < currentPath.length - 1 && (
                    <ChevronRight className='w-3 h-3 text-yellow-500' />
                  )}
                </React.Fragment>
              );
            })}
          </div>
        </div>
      )}

      {/* Legend */}
      <div className='relative z-10 mt-4 flex gap-4 justify-center'>
        <div className='flex items-center gap-1'>
          <div className='w-3 h-3 rounded-full border border-cyan-400 bg-cyan-400/20' />
          <span className='text-xs text-gray-400'>Decision</span>
        </div>
        <div className='flex items-center gap-1'>
          <div className='w-3 h-3 rounded-full border border-purple-400 bg-purple-400/20' />
          <span className='text-xs text-gray-400'>Analysis</span>
        </div>
        <div className='flex items-center gap-1'>
          <div className='w-3 h-3 rounded-full border border-emerald-400 bg-emerald-400/20' />
          <span className='text-xs text-gray-400'>Outcome</span>
        </div>
        <div className='flex items-center gap-1'>
          <div className='w-3 h-3 rounded-full border border-yellow-400 bg-yellow-400/20' />
          <span className='text-xs text-gray-400'>Active Path</span>
        </div>
      </div>
    </Card>
  );
}
