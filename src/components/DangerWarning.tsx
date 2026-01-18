'use client';

import React from 'react';

interface DangerWarningProps {
  isDangerous: boolean;
  warningPulse: boolean;
}

export const DangerWarning: React.FC<DangerWarningProps> = ({
  isDangerous,
  warningPulse,
}) => {
  if (!isDangerous) return null;

  return (
    <div className='fixed inset-0 bg-red-500/10 flex items-center justify-center pointer-events-none z-50'>
      <div
        className='bg-red-500/90 px-12 py-6 rounded-xl shadow-2xl'
        style={{
          animation: warningPulse ? 'pulse 0.5s ease-in-out infinite' : 'none',
          boxShadow: '0 0 60px rgba(239, 68, 68, 0.5)',
        }}
      >
        <h1 className='m-0 text-5xl font-black text-white uppercase tracking-widest text-shadow'>
          ⚠️ WARNING ⚠️
        </h1>
        <p className='mt-4 text-2xl font-semibold text-white text-center'>
          DANGEROUS BOT DETECTED
        </p>
      </div>
    </div>
  );
};
