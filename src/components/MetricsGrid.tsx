'use client';

import React from 'react';

interface Metrics {
  responseTime: number;
  errorRate: number;
  throughput: number;
  cpuUsage: number;
  memoryUsage: number;
}

interface MetricsGridProps {
  metrics: Metrics;
}

export const MetricsGrid: React.FC<MetricsGridProps> = ({ metrics }) => (
  <div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4'>
    {[
      {
        label: 'Response Time',
        value: `${metrics.responseTime}ms`,
        unit: 'ms',
        color: '#3b82f6',
      },
      {
        label: 'Error Rate',
        value: `${metrics.errorRate}%`,
        unit: '%',
        color: '#8b5cf6',
      },
      {
        label: 'Throughput',
        value: `${metrics.throughput}`,
        unit: 'req/s',
        color: '#06b6d4',
      },
      {
        label: 'CPU Usage',
        value: `${metrics.cpuUsage}%`,
        unit: '%',
        color: '#f59e0b',
      },
      {
        label: 'Memory Usage',
        value: `${metrics.memoryUsage}%`,
        unit: '%',
        color: '#10b981',
      },
    ].map(metric => (
      <div
        key={metric.label}
        className='bg-white/3 p-5 rounded-xl border border-white/5'
      >
        <div className='text-xs text-gray-400 uppercase tracking-wide mb-2'>
          {metric.label}
        </div>
        <div className='text-2xl font-bold' style={{ color: metric.color }}>
          {metric.value}
        </div>
        <div className='text-xs text-gray-500 mt-1'>{metric.unit}</div>
      </div>
    ))}
  </div>
);
