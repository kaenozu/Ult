'use client';

import React, { useState, useEffect } from 'react';
import { performanceMonitor } from '@/app/lib/performance/monitor';

interface MetricCardProps {
  title: string;
  value: string;
  unit?: string;
  trend?: 'up' | 'down' | 'neutral';
  threshold?: number;
  currentValue?: number;
}

interface PerformanceMetrics {
  renderTimes: number[];
  apiCallDurations: number[];
  websocketMessageRates: number[];
  cacheHitRates: number[];
}

const MetricCard: React.FC<MetricCardProps> = ({ 
  title, 
  value, 
  unit, 
  trend,
  threshold,
  currentValue 
}) => {
  const getTrendColor = () => {
    if (trend === 'up') return 'text-red-500';
    if (trend === 'down') return 'text-green-500';
    return 'text-gray-500';
  };

  const getBackgroundColor = () => {
    if (threshold && currentValue) {
      if (currentValue > threshold) return 'bg-red-50 border-red-200';
      return 'bg-green-50 border-green-200';
    }
    return 'bg-white border-gray-200';
  };

  return (
    <div className={`p-4 rounded-lg border ${getBackgroundColor()} shadow-sm`}>
      <h3 className="text-sm font-medium text-gray-600 mb-2">{title}</h3>
      <div className="flex items-baseline gap-2">
        <span className="text-2xl font-bold">{value}</span>
        {unit && <span className="text-sm text-gray-500">{unit}</span>}
      </div>
      {trend && (
        <div className={`text-xs mt-2 ${getTrendColor()}`}>
          {trend === 'up' ? '↑' : trend === 'down' ? '↓' : '→'}
        </div>
      )}
    </div>
  );
};

interface PerformanceChartProps {
  data: number[];
  label: string;
  color: string;
  threshold?: number;
}

const PerformanceChart: React.FC<PerformanceChartProps> = ({ 
  data, 
  label, 
  color,
  threshold 
}) => {
  const max = Math.max(...data, threshold || 0);
  const min = Math.min(...data, 0);
  const range = max - min;
  
  const points = data.map((value, index) => {
    const x = (index / (data.length - 1)) * 100;
    const y = ((value - min) / range) * 100;
    return `${x},${100 - y}`;
  }).join(' ');

  const thresholdY = threshold ? ((threshold - min) / range) * 100 : null;

  return (
    <div className="h-32 w-full bg-gray-50 rounded-lg p-2">
      <svg viewBox="0 0 100 100" className="w-full h-full">
        <polyline
          fill="none"
          stroke={color}
          strokeWidth="2"
          points={points}
        />
        {thresholdY !== null && (
          <line
            x1="0"
            y1={100 - thresholdY}
            x2="100"
            y2={100 - thresholdY}
            stroke="#ef4444"
            strokeWidth="1"
            strokeDasharray="4"
          />
        )}
        <text x="2" y="10" fontSize="8" fill="#6b7280">
          {label}
        </text>
        {thresholdY !== null && (
          <text x="98" y={100 - thresholdY - 2} fontSize="6" fill="#ef4444" textAnchor="end">
            Threshold: {threshold}
          </text>
        )}
      </svg>
    </div>
  );
};

export const PerformanceDashboard: React.FC = () => {
  const [metrics, setMetrics] = useState<PerformanceMetrics>({
    renderTimes: [],
    apiCallDurations: [],
    websocketMessageRates: [],
    cacheHitRates: [],
  });
  const [alerts, setAlerts] = useState<string[]>([]);

  useEffect(() => {
    const interval = setInterval(() => {
      const currentMetrics = performanceMonitor.getMetrics();
      
      setMetrics({
        renderTimes: currentMetrics.renderTimes.slice(-20),
        apiCallDurations: currentMetrics.apiCallDurations.slice(-20),
        websocketMessageRates: currentMetrics.websocketMessageRates.slice(-20),
        cacheHitRates: currentMetrics.cacheHitRates.slice(-20),
      });

      // Check for performance degradation
      const newAlerts: string[] = [];
      
      const avgRenderTime = currentMetrics.renderTimes.length > 0
        ? currentMetrics.renderTimes.reduce((a, b) => a + b, 0) / currentMetrics.renderTimes.length
        : 0;
      
      if (avgRenderTime > 100) {
        newAlerts.push('Render time exceeds 100ms threshold');
      }

      const avgApiTime = currentMetrics.apiCallDurations.length > 0
        ? currentMetrics.apiCallDurations.reduce((a, b) => a + b, 0) / currentMetrics.apiCallDurations.length
        : 0;
      
      if (avgApiTime > 500) {
        newAlerts.push('API call duration exceeds 500ms threshold');
      }

      const latestCacheHitRate = currentMetrics.cacheHitRates.length > 0
        ? currentMetrics.cacheHitRates[currentMetrics.cacheHitRates.length - 1]
        : 0;
      
      if (latestCacheHitRate < 70) {
        newAlerts.push('Cache hit rate below 70%');
      }

      setAlerts(newAlerts);
    }, 1000); // Update every second

    return () => clearInterval(interval);
  }, []);

  const calculateAverage = (data: number[]): number => {
    if (data.length === 0) return 0;
    return data.reduce((a, b) => a + b, 0) / data.length;
  };

  const calculateTrend = (data: number[]): 'up' | 'down' | 'neutral' => {
    if (data.length < 2) return 'neutral';
    const recent = data.slice(-5);
    const earlier = data.slice(-10, -5);
    if (recent.length === 0 || earlier.length === 0) return 'neutral';
    
    const recentAvg = recent.reduce((a, b) => a + b, 0) / recent.length;
    const earlierAvg = earlier.reduce((a, b) => a + b, 0) / earlier.length;
    
    if (recentAvg > earlierAvg * 1.1) return 'up';
    if (recentAvg < earlierAvg * 0.9) return 'down';
    return 'neutral';
  };

  const exportMetrics = () => {
    const exportData = {
      timestamp: new Date().toISOString(),
      metrics: performanceMonitor.getMetrics(),
    };
    
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `performance-metrics-${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="p-6 bg-gray-100 min-h-screen">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold text-gray-900">Performance Dashboard</h1>
          <button
            onClick={exportMetrics}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Export Metrics
          </button>
        </div>

        {/* Alerts Section */}
        {alerts.length > 0 && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <h2 className="text-lg font-semibold text-red-800 mb-2">Performance Alerts</h2>
            <ul className="space-y-1">
              {alerts.map((alert, index) => (
                <li key={index} className="text-red-700 flex items-center gap-2">
                  <span className="text-red-500">⚠</span>
                  {alert}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Metrics Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <MetricCard
            title="Average Render Time"
            value={calculateAverage(metrics.renderTimes).toFixed(2)}
            unit="ms"
            trend={calculateTrend(metrics.renderTimes)}
            threshold={100}
            currentValue={calculateAverage(metrics.renderTimes)}
          />
          <MetricCard
            title="Average API Duration"
            value={calculateAverage(metrics.apiCallDurations).toFixed(2)}
            unit="ms"
            trend={calculateTrend(metrics.apiCallDurations)}
            threshold={500}
            currentValue={calculateAverage(metrics.apiCallDurations)}
          />
          <MetricCard
            title="WebSocket Message Rate"
            value={calculateAverage(metrics.websocketMessageRates).toFixed(2)}
            unit="msg/s"
            trend={calculateTrend(metrics.websocketMessageRates)}
          />
          <MetricCard
            title="Cache Hit Rate"
            value={calculateAverage(metrics.cacheHitRates).toFixed(1)}
            unit="%"
            trend={calculateTrend(metrics.cacheHitRates)}
            threshold={70}
            currentValue={calculateAverage(metrics.cacheHitRates)}
          />
        </div>

        {/* Charts Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white rounded-lg shadow-sm p-4">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Render Times</h2>
            <PerformanceChart
              data={metrics.renderTimes}
              label="Render Time (ms)"
              color="#3b82f6"
              threshold={100}
            />
          </div>
          <div className="bg-white rounded-lg shadow-sm p-4">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">API Call Durations</h2>
            <PerformanceChart
              data={metrics.apiCallDurations}
              label="API Duration (ms)"
              color="#8b5cf6"
              threshold={500}
            />
          </div>
          <div className="bg-white rounded-lg shadow-sm p-4">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">WebSocket Message Rates</h2>
            <PerformanceChart
              data={metrics.websocketMessageRates}
              label="Messages/sec"
              color="#10b981"
            />
          </div>
          <div className="bg-white rounded-lg shadow-sm p-4">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Cache Hit Rates</h2>
            <PerformanceChart
              data={metrics.cacheHitRates}
              label="Hit Rate (%)"
              color="#f59e0b"
              threshold={70}
            />
          </div>
        </div>

        {/* Summary Section */}
        <div className="mt-6 bg-white rounded-lg shadow-sm p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Performance Summary</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <div className="text-sm text-gray-600">Total Measurements</div>
              <div className="text-2xl font-bold text-gray-900">
                {metrics.renderTimes.length + metrics.apiCallDurations.length}
              </div>
            </div>
            <div>
              <div className="text-sm text-gray-600">Active Alerts</div>
              <div className="text-2xl font-bold text-gray-900">{alerts.length}</div>
            </div>
            <div>
              <div className="text-sm text-gray-600">Last Updated</div>
              <div className="text-lg font-semibold text-gray-900">
                {new Date().toLocaleTimeString()}
              </div>
            </div>
            <div>
              <div className="text-sm text-gray-600">Status</div>
              <div className={`text-lg font-semibold ${alerts.length > 0 ? 'text-red-600' : 'text-green-600'}`}>
                {alerts.length > 0 ? 'Degraded' : 'Healthy'}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PerformanceDashboard;

import React, { useState, useEffect } from 'react';
import { performanceMonitor } from '@/app/lib/performance/monitor';

interface MetricCardProps {
  title: string;
  value: string;
  unit?: string;
  trend?: 'up' | 'down' | 'neutral';
  threshold?: number;
  currentValue?: number;
}

interface PerformanceMetrics {
  renderTimes: number[];
  apiCallDurations: number[];
  websocketMessageRates: number[];
  cacheHitRates: number[];
}

const MetricCard: React.FC<MetricCardProps> = ({ 
  title, 
  value, 
  unit, 
  trend,
  threshold,
  currentValue 
}) => {
  const getTrendColor = () => {
    if (trend === 'up') return 'text-red-500';
    if (trend === 'down') return 'text-green-500';
    return 'text-gray-500';
  };

  const getBackgroundColor = () => {
    if (threshold && currentValue) {
      if (currentValue > threshold) return 'bg-red-50 border-red-200';
      return 'bg-green-50 border-green-200';
    }
    return 'bg-white border-gray-200';
  };

  return (
    <div className={`p-4 rounded-lg border ${getBackgroundColor()} shadow-sm`}>
      <h3 className="text-sm font-medium text-gray-600 mb-2">{title}</h3>
      <div className="flex items-baseline gap-2">
        <span className="text-2xl font-bold">{value}</span>
        {unit && <span className="text-sm text-gray-500">{unit}</span>}
      </div>
      {trend && (
        <div className={`text-xs mt-2 ${getTrendColor()}`}>
          {trend === 'up' ? '↑' : trend === 'down' ? '↓' : '→'}
        </div>
      )}
    </div>
  );
};

interface PerformanceChartProps {
  data: number[];
  label: string;
  color: string;
  threshold?: number;
}

const PerformanceChart: React.FC<PerformanceChartProps> = ({ 
  data, 
  label, 
  color,
  threshold 
}) => {
  const max = Math.max(...data, threshold || 0);
  const min = Math.min(...data, 0);
  const range = max - min;
  
  const points = data.map((value, index) => {
    const x = (index / (data.length - 1)) * 100;
    const y = ((value - min) / range) * 100;
    return `${x},${100 - y}`;
  }).join(' ');

  const thresholdY = threshold ? ((threshold - min) / range) * 100 : null;

  return (
    <div className="h-32 w-full bg-gray-50 rounded-lg p-2">
      <svg viewBox="0 0 100 100" className="w-full h-full">
        <polyline
          fill="none"
          stroke={color}
          strokeWidth="2"
          points={points}
        />
        {thresholdY !== null && (
          <line
            x1="0"
            y1={100 - thresholdY}
            x2="100"
            y2={100 - thresholdY}
            stroke="#ef4444"
            strokeWidth="1"
            strokeDasharray="4"
          />
        )}
        <text x="2" y="10" fontSize="8" fill="#6b7280">
          {label}
        </text>
        {thresholdY !== null && (
          <text x="98" y={100 - thresholdY - 2} fontSize="6" fill="#ef4444" textAnchor="end">
            Threshold: {threshold}
          </text>
        )}
      </svg>
    </div>
  );
};

export const PerformanceDashboard: React.FC = () => {
  const [metrics, setMetrics] = useState<PerformanceMetrics>({
    renderTimes: [],
    apiCallDurations: [],
    websocketMessageRates: [],
    cacheHitRates: [],
  });
  const [alerts, setAlerts] = useState<string[]>([]);

  useEffect(() => {
    const interval = setInterval(() => {
      const currentMetrics = performanceMonitor.getMetrics();
      
      setMetrics({
        renderTimes: currentMetrics.renderTimes.slice(-20),
        apiCallDurations: currentMetrics.apiCallDurations.slice(-20),
        websocketMessageRates: currentMetrics.websocketMessageRates.slice(-20),
        cacheHitRates: currentMetrics.cacheHitRates.slice(-20),
      });

      // Check for performance degradation
      const newAlerts: string[] = [];
      
      const avgRenderTime = currentMetrics.renderTimes.length > 0
        ? currentMetrics.renderTimes.reduce((a, b) => a + b, 0) / currentMetrics.renderTimes.length
        : 0;
      
      if (avgRenderTime > 100) {
        newAlerts.push('Render time exceeds 100ms threshold');
      }

      const avgApiTime = currentMetrics.apiCallDurations.length > 0
        ? currentMetrics.apiCallDurations.reduce((a, b) => a + b, 0) / currentMetrics.apiCallDurations.length
        : 0;
      
      if (avgApiTime > 500) {
        newAlerts.push('API call duration exceeds 500ms threshold');
      }

      const latestCacheHitRate = currentMetrics.cacheHitRates.length > 0
        ? currentMetrics.cacheHitRates[currentMetrics.cacheHitRates.length - 1]
        : 0;
      
      if (latestCacheHitRate < 70) {
        newAlerts.push('Cache hit rate below 70%');
      }

      setAlerts(newAlerts);
    }, 1000); // Update every second

    return () => clearInterval(interval);
  }, []);

  const calculateAverage = (data: number[]): number => {
    if (data.length === 0) return 0;
    return data.reduce((a, b) => a + b, 0) / data.length;
  };

  const calculateTrend = (data: number[]): 'up' | 'down' | 'neutral' => {
    if (data.length < 2) return 'neutral';
    const recent = data.slice(-5);
    const earlier = data.slice(-10, -5);
    if (recent.length === 0 || earlier.length === 0) return 'neutral';
    
    const recentAvg = recent.reduce((a, b) => a + b, 0) / recent.length;
    const earlierAvg = earlier.reduce((a, b) => a + b, 0) / earlier.length;
    
    if (recentAvg > earlierAvg * 1.1) return 'up';
    if (recentAvg < earlierAvg * 0.9) return 'down';
    return 'neutral';
  };

  const exportMetrics = () => {
    const exportData = {
      timestamp: new Date().toISOString(),
      metrics: performanceMonitor.getMetrics(),
    };
    
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `performance-metrics-${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="p-6 bg-gray-100 min-h-screen">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold text-gray-900">Performance Dashboard</h1>
          <button
            onClick={exportMetrics}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Export Metrics
          </button>
        </div>

        {/* Alerts Section */}
        {alerts.length > 0 && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <h2 className="text-lg font-semibold text-red-800 mb-2">Performance Alerts</h2>
            <ul className="space-y-1">
              {alerts.map((alert, index) => (
                <li key={index} className="text-red-700 flex items-center gap-2">
                  <span className="text-red-500">⚠</span>
                  {alert}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Metrics Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <MetricCard
            title="Average Render Time"
            value={calculateAverage(metrics.renderTimes).toFixed(2)}
            unit="ms"
            trend={calculateTrend(metrics.renderTimes)}
            threshold={100}
            currentValue={calculateAverage(metrics.renderTimes)}
          />
          <MetricCard
            title="Average API Duration"
            value={calculateAverage(metrics.apiCallDurations).toFixed(2)}
            unit="ms"
            trend={calculateTrend(metrics.apiCallDurations)}
            threshold={500}
            currentValue={calculateAverage(metrics.apiCallDurations)}
          />
          <MetricCard
            title="WebSocket Message Rate"
            value={calculateAverage(metrics.websocketMessageRates).toFixed(2)}
            unit="msg/s"
            trend={calculateTrend(metrics.websocketMessageRates)}
          />
          <MetricCard
            title="Cache Hit Rate"
            value={calculateAverage(metrics.cacheHitRates).toFixed(1)}
            unit="%"
            trend={calculateTrend(metrics.cacheHitRates)}
            threshold={70}
            currentValue={calculateAverage(metrics.cacheHitRates)}
          />
        </div>

        {/* Charts Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white rounded-lg shadow-sm p-4">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Render Times</h2>
            <PerformanceChart
              data={metrics.renderTimes}
              label="Render Time (ms)"
              color="#3b82f6"
              threshold={100}
            />
          </div>
          <div className="bg-white rounded-lg shadow-sm p-4">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">API Call Durations</h2>
            <PerformanceChart
              data={metrics.apiCallDurations}
              label="API Duration (ms)"
              color="#8b5cf6"
              threshold={500}
            />
          </div>
          <div className="bg-white rounded-lg shadow-sm p-4">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">WebSocket Message Rates</h2>
            <PerformanceChart
              data={metrics.websocketMessageRates}
              label="Messages/sec"
              color="#10b981"
            />
          </div>
          <div className="bg-white rounded-lg shadow-sm p-4">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Cache Hit Rates</h2>
            <PerformanceChart
              data={metrics.cacheHitRates}
              label="Hit Rate (%)"
              color="#f59e0b"
              threshold={70}
            />
          </div>
        </div>

        {/* Summary Section */}
        <div className="mt-6 bg-white rounded-lg shadow-sm p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Performance Summary</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <div className="text-sm text-gray-600">Total Measurements</div>
              <div className="text-2xl font-bold text-gray-900">
                {metrics.renderTimes.length + metrics.apiCallDurations.length}
              </div>
            </div>
            <div>
              <div className="text-sm text-gray-600">Active Alerts</div>
              <div className="text-2xl font-bold text-gray-900">{alerts.length}</div>
            </div>
            <div>
              <div className="text-sm text-gray-600">Last Updated</div>
              <div className="text-lg font-semibold text-gray-900">
                {new Date().toLocaleTimeString()}
              </div>
            </div>
            <div>
              <div className="text-sm text-gray-600">Status</div>
              <div className={`text-lg font-semibold ${alerts.length > 0 ? 'text-red-600' : 'text-green-600'}`}>
                {alerts.length > 0 ? 'Degraded' : 'Healthy'}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PerformanceDashboard;

