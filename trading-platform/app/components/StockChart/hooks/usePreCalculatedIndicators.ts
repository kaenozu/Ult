import { useMemo } from 'react';
import { OHLCV } from '@/app/types';
import { technicalIndicatorService } from '@/app/lib/TechnicalIndicatorService';
import { accuracyService } from '@/app/lib/AccuracyService';
import { RSI_CONFIG, SMA_CONFIG } from '@/app/lib/constants';

interface PreCalculatedIndicators {
  rsi: Map<number, number[]>;
  sma: Map<number, number[]>;
  atr: number[];
}

export const usePreCalculatedIndicators = (data: OHLCV[]): PreCalculatedIndicators => {
  return useMemo(() => {
    const closes = data.map(d => d.close);
    const rsi = new Map<number, number[]>();
    const sma = new Map<number, number[]>();

    // Calculate RSI for all configured periods
    for (const rsiP of RSI_CONFIG.PERIOD_OPTIONS) {
      rsi.set(rsiP, technicalIndicatorService.calculateRSI(closes, rsiP));
    }

    // Calculate SMA for all configured periods
    for (const smaP of SMA_CONFIG.PERIOD_OPTIONS) {
      sma.set(smaP, technicalIndicatorService.calculateSMA(closes, smaP));
    }

    // Calculate ATR once for the entire dataset
    const atr = accuracyService.calculateBatchSimpleATR(data);

    return { rsi, sma, atr };
  }, [data]);
};
