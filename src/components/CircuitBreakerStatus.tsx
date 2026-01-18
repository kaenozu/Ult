'use client';

import React from 'react';

type CircuitBreakerState = 'closed' | 'open' | 'half_open';

interface CircuitBreakerStatusProps {
  circuitBreaker: {
    status: CircuitBreakerState;
    lastTripped: string | null;
    tripCount: number;
    healthScore: number;
  };
}

export const CircuitBreakerStatus: React.FC<CircuitBreakerStatusProps> = ({
  circuitBreaker,
}) => (
  <div className='bg-gradient-to-br from-gray-800 to-gray-900 rounded-xl p-6 border border-white/10'>
    <div className='flex items-center gap-3 mb-5'>
      <div
        className={`w-3 h-3 rounded-full ${
          circuitBreaker.status === 'closed'
            ? 'bg-green-500 shadow-green-500'
            : circuitBreaker.status === 'open'
              ? 'bg-red-500 shadow-red-500'
              : 'bg-yellow-500 shadow-yellow-500'
        }`}
        style={{
          boxShadow:
            circuitBreaker.status === 'closed'
              ? '0 0 10px #22c55e'
              : '0 0 10px #ef4444',
        }}
      />
      <h2 className='m-0 text-xl font-bold text-white uppercase tracking-wide'>
        CIRCUIT BREAKER STATUS
      </h2>
    </div>

    <div className='grid grid-cols-2 gap-4'>
      <div className='bg-white/3 p-4 rounded-lg border border-white/5'>
        <div className='text-xs text-gray-400 uppercase tracking-wide mb-2'>
          State
        </div>
        <div
          className={`text-2xl font-bold uppercase ${
            circuitBreaker.status === 'closed'
              ? 'text-green-500'
              : circuitBreaker.status === 'open'
                ? 'text-red-500'
                : 'text-yellow-500'
          }`}
        >
          {circuitBreaker.status.replace('_', ' ')}
        </div>
      </div>

      <div className='bg-white/3 p-4 rounded-lg border border-white/5'>
        <div className='text-xs text-gray-400 uppercase tracking-wide mb-2'>
          Health Score
        </div>
        <div className='text-2xl font-bold text-white'>
          {circuitBreaker.healthScore}%
        </div>
      </div>

      <div className='bg-white/3 p-4 rounded-lg border border-white/5'>
        <div className='text-xs text-gray-400 uppercase tracking-wide mb-2'>
          Trip Count
        </div>
        <div className='text-2xl font-bold text-white'>
          {circuitBreaker.tripCount}
        </div>
      </div>

      <div className='bg-white/3 p-4 rounded-lg border border-white/5'>
        <div className='text-xs text-gray-400 uppercase tracking-wide mb-2'>
          Last Tripped
        </div>
        <div className='text-sm font-medium text-white'>
          {circuitBreaker.lastTripped || 'Never'}
        </div>
      </div>
    </div>
  </div>
);
