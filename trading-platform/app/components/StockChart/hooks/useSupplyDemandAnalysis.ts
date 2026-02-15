import { useMemo } from 'react';
import { OHLCV } from '@/app/types';
import { supplyDemandMaster } from '@/app/lib/supplyDemandMaster';

export const useSupplyDemandAnalysis = (data: OHLCV[]) => {
  const analysis = useMemo(() => {
    if (!data || data.length < 20) return null;
    return supplyDemandMaster.analyze(data);
  }, [data]);

  const chartLevels = useMemo(() => {
    if (!analysis) return [];
    
    // Convert SupplyDemandLevel to the format expected by volumeProfilePlugin
    return analysis.levels.map(level => ({
      price: level.price,
      strength: level.strength
    }));
  }, [analysis]);

  return {
    analysis,
    chartLevels
  };
};
