'use client';

import React from 'react';

type SafetyLevel = 'safe' | 'caution' | 'danger';

interface TrafficLightProps {
  safetyLevel: SafetyLevel;
}

const getTrafficLightColor = (level: SafetyLevel): string => {
  switch (level) {
    case 'safe':
      return '#22c55e';
    case 'caution':
      return '#eab308';
    case 'danger':
      return '#ef4444';
    default:
      return '#22c55e';
  }
};

export const TrafficLight: React.FC<TrafficLightProps> = ({ safetyLevel }) => (
  <div
    className='flex flex-col items-center gap-3 p-5 bg-gradient-to-b from-gray-900 to-gray-800 rounded-xl border border-white/10'
    role='status'
    aria-label={`System safety level: ${safetyLevel}`}
    aria-live='polite'
  >
    <div
      className='w-20 h-50 bg-gray-950 rounded-2xl flex flex-col items-center justify-around py-4 shadow-inner'
      aria-hidden='true'
    >
      {(['danger', 'caution', 'safe'] as SafetyLevel[]).map(level => {
        const isActive = safetyLevel === level;
        const baseColor =
          level === 'danger'
            ? '#ef4444'
            : level === 'caution'
              ? '#eab308'
              : '#22c55e';

        return (
          <div
            key={level}
            className={`w-12 h-12 rounded-full transition-all duration-300 ${
              isActive
                ? `bg-[${baseColor}] shadow-lg`
                : 'bg-gray-700 border-2 border-gray-600'
            }`}
            style={{
              boxShadow: isActive
                ? `0 0 30px ${baseColor}, 0 0 60px ${baseColor}40`
                : 'none',
            }}
            aria-label={`${level} level ${isActive ? 'active' : 'inactive'}`}
          />
        );
      })}
    </div>
    <div
      className='mt-3 px-4 py-2 bg-white/5 rounded-lg text-sm font-semibold uppercase tracking-wide'
      style={{ color: getTrafficLightColor(safetyLevel) }}
      aria-label={`Current system status: ${safetyLevel}`}
    >
      {safetyLevel} System
    </div>
  </div>
);
