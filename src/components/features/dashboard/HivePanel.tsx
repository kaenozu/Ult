'use client';

import React from 'react';
import { Card } from '@/components/ui/card';
import { useQuery } from '@tanstack/react-query';
import { getSignal } from '@/components/shared/utils/api';
import {
  ShieldAlert,
  TrendingUp,
  TrendingDown,
  Newspaper,
  Vote,
  AlertTriangle,
  CheckCircle2,
} from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

interface HivePanelProps {
  ticker: string;
}

export default function HivePanel({ ticker }: HivePanelProps) {
  const { data: signal, isLoading } = useQuery({
    queryKey: ['hive_signal', ticker],
    queryFn: () => getSignal(ticker, 'CONSENSUS'), // Force Hive mode
    refetchInterval: 10000,
  });

  if (isLoading) {
    return <Skeleton className='w-full h-[300px] rounded-xl' />;
  }

  if (!signal) return null;

  const details = signal.details || {};
  const consensusScore = signal.consensus_score || 0;

  // Safe accessors
  const techVote = details.tech_vote || 0;
  const newsVote = details.news_vote || 0;
  const riskVote = details.risk_vote || 0;
  const riskScore = details.risk_score || 0;

  const isVetoed = signal.explanation.includes('VETO');

  const getVoteColor = (vote: number) => {
    if (vote > 0.1) return 'text-emerald-400';
    if (vote < -0.1) return 'text-red-400';
    return 'text-gray-400';
  };

  return (
    <Card className='glass-panel p-6 border-white/10 relative overflow-hidden'>
      <div className='flex items-center justify-between mb-6'>
        <h2 className='text-xl font-bold tracking-tight flex items-center gap-2 neon-text'>
          <Vote className='w-5 h-5 text-primary' />
          The Hive Consensus
        </h2>
        <div className='text-xs text-muted-foreground uppercase tracking-widest'>
          Weighted Voting System
        </div>
      </div>

      {/* Agents Row - Now 4 Agents */}
      <div className='grid grid-cols-2 md:grid-cols-4 gap-4 mb-6'>
        {/* Tech Agent */}
        <div className='bg-black/20 rounded-lg p-3 border border-white/5 flex flex-col items-center text-center'>
          <div className='w-10 h-10 rounded-full bg-blue-500/10 flex items-center justify-center mb-2'>
            <TrendingUp className='w-5 h-5 text-blue-400' />
          </div>
          <div className='text-xs font-bold text-muted-foreground mb-1'>
            Strategist
          </div>
          <div
            className={`text-lg font-mono font-bold ${getVoteColor(techVote)}`}
          >
            {techVote > 0 ? '+' : ''}
            {techVote.toFixed(2)}
          </div>
          <div className='text-[#555] text-[10px] mt-1'>Weight: 40%</div>
        </div>

        {/* News Agent */}
        <div className='bg-black/20 rounded-lg p-3 border border-white/5 flex flex-col items-center text-center'>
          <div className='w-10 h-10 rounded-full bg-yellow-500/10 flex items-center justify-center mb-2'>
            <Newspaper className='w-5 h-5 text-yellow-400' />
          </div>
          <div className='text-xs font-bold text-muted-foreground mb-1'>
            Observer
          </div>
          <div
            className={`text-lg font-mono font-bold ${getVoteColor(newsVote)}`}
          >
            {newsVote > 0 ? '+' : ''}
            {newsVote.toFixed(2)}
          </div>
          <div className='text-[#555] text-[10px] mt-1'>Weight: 30%</div>
        </div>

        {/* Vision Agent (New) */}
        <div className='bg-black/20 rounded-lg p-3 border border-white/5 flex flex-col items-center text-center'>
          <div className='w-10 h-10 rounded-full bg-purple-500/10 flex items-center justify-center mb-2'>
            {/* Eye icon */}
            <svg
              className='w-5 h-5 text-purple-400'
              fill='none'
              viewBox='0 0 24 24'
              stroke='currentColor'
            >
              <path
                strokeLinecap='round'
                strokeLinejoin='round'
                strokeWidth={2}
                d='M15 12a3 3 0 11-6 0 3 3 0 016 0z'
              />
              <path
                strokeLinecap='round'
                strokeLinejoin='round'
                strokeWidth={2}
                d='M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z'
              />
            </svg>
          </div>
          <div className='text-xs font-bold text-muted-foreground mb-1'>
            Seer
          </div>
          <div
            className={`text-lg font-mono font-bold ${getVoteColor(signal.details?.vision_vote || 0)}`}
          >
            {(signal.details?.vision_vote || 0) > 0 ? '+' : ''}
            {(signal.details?.vision_vote || 0).toFixed(2)}
          </div>
          <div className='text-[#555] text-[10px] mt-1'>Weight: 20%</div>
        </div>

        {/* Risk Agent */}
        <div
          className={`bg-black/20 rounded-lg p-3 border ${riskScore > 0.7 ? 'border-red-500/50 bg-red-900/10' : 'border-white/5'} flex flex-col items-center text-center transition-all`}
        >
          <div className='w-10 h-10 rounded-full bg-red-500/10 flex items-center justify-center mb-2'>
            {isVetoed ? (
              <AlertTriangle className='w-5 h-5 text-red-500 animate-pulse' />
            ) : (
              <ShieldAlert className='w-5 h-5 text-red-400' />
            )}
          </div>
          <div className='text-xs font-bold text-muted-foreground mb-1'>
            Guardian
          </div>
          <div
            className={`text-lg font-mono font-bold ${getVoteColor(riskVote)}`}
          >
            {riskVote.toFixed(2)}
          </div>
          <div className='text-[10px] mt-1 text-red-400/80'>
            Risk: {(riskScore * 100).toFixed(0)}%{/* W: 10% */}
          </div>
        </div>
      </div>

      {/* Consensus Result */}
      <div className='relative bg-white/5 rounded-xl p-4 border border-white/10'>
        <div className='absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-transparent via-primary to-transparent opacity-50' />

        <div className='flex justify-between items-center mb-2'>
          <span className='text-sm text-gray-400'>Final Verdict</span>
          <span className='font-mono text-xs text-gray-500'>
            Score: {consensusScore.toFixed(2)}
          </span>
        </div>

        <div className='flex items-center gap-3'>
          {isVetoed ? (
            <div className='flex items-center gap-2 text-red-500'>
              <AlertTriangle className='w-8 h-8' />
              <span className='text-2xl font-black tracking-tighter'>
                VETOED
              </span>
            </div>
          ) : signal.signal === 1 ? (
            <div className='flex items-center gap-2 text-emerald-400'>
              <CheckCircle2 className='w-8 h-8' />
              <span className='text-2xl font-black tracking-tighter'>BUY</span>
            </div>
          ) : signal.signal === -1 ? (
            <div className='flex items-center gap-2 text-red-400'>
              <TrendingDown className='w-8 h-8' />
              <span className='text-2xl font-black tracking-tighter'>SELL</span>
            </div>
          ) : (
            <div className='flex items-center gap-2 text-gray-400'>
              <Vote className='w-8 h-8' />
              <span className='text-2xl font-black tracking-tighter'>HOLD</span>
            </div>
          )}
        </div>

        <div className='mt-3 pt-3 border-t border-white/5 text-xs text-gray-400 leading-relaxed font-mono'>
          {signal.explanation}
        </div>
      </div>
    </Card>
  );
}
