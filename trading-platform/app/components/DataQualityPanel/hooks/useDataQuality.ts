import { useState, useEffect, useCallback } from 'react';
import type { CacheStats } from '@/app/lib/data/cache/SmartDataCache';
import { QualityMetrics, DataSourceHealth } from '../types';

export const useDataQuality = (updateInterval: number = 1000) => {
  const [qualityMetrics, setQualityMetrics] = useState<QualityMetrics>({
    overallScore: 0,
    dataFreshness: 'poor',
    cachePerformance: 'poor',
    anomalyCount: 0,
    validationPassRate: 0,
  });

  const [dataSources, setDataSources] = useState<DataSourceHealth[]>([
    { source: 'Yahoo Finance', status: 'offline', latency: 0, lastUpdate: 0, qualityScore: 0 },
  ]);

  const [cacheStats, setCacheStats] = useState<CacheStats>({
    hits: 0,
    misses: 0,
    hitRate: 0,
    size: 0,
    maxSize: 0,
    evictions: 0,
  });

  const [anomalies, setAnomalies] = useState<string[]>([]);

  const fetchMetrics = useCallback(async () => {
    try {
      const res = await fetch(`/api/data-quality?t=${Date.now()}`);
      if (!res.ok) return;
      const data = await res.json();

      if (data.type === 'global') {
        const stats = data.cacheStats as CacheStats;
        setCacheStats(stats);

        if (data.dataSources) {
          setDataSources(data.dataSources);
        }

        const overallScore = data.overallScore || 0;

        setQualityMetrics({
          overallScore,
          dataFreshness: overallScore >= 90 ? 'excellent' : overallScore >= 75 ? 'good' : overallScore >= 60 ? 'fair' : 'poor',
          cachePerformance: stats.hitRate >= 0.9 ? 'excellent' : stats.hitRate >= 0.7 ? 'good' : stats.hitRate >= 0.5 ? 'fair' : 'poor',
          anomalyCount: data.anomalies?.length || 0,
          validationPassRate: overallScore,
        });

        if (data.anomalies) {
          setAnomalies(data.anomalies);
        }
      }
    } catch (e) {
      console.error('Failed to fetch data quality metrics', e);
    }
  }, []);

  useEffect(() => {
    fetchMetrics();
    const interval = setInterval(fetchMetrics, updateInterval);
    return () => clearInterval(interval);
  }, [fetchMetrics, updateInterval]);

  const refresh = useCallback(() => {
    fetchMetrics();
  }, [fetchMetrics]);

  return {
    qualityMetrics,
    dataSources,
    cacheStats,
    anomalies,
    refresh
  };
};
