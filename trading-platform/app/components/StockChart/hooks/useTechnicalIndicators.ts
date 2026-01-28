import { useMemo } from 'react';
import { technicalIndicatorService } from '@/app/lib/TechnicalIndicatorService';
import { SMA_CONFIG, BOLLINGER_BANDS } from '@/app/lib/constants';

export const useTechnicalIndicators = (prices: number[]) => {
  const sma20 = useMemo(() => technicalIndicatorService.calculateSMA(prices, SMA_CONFIG.SHORT_PERIOD), [prices]);

  const { upper, lower } = useMemo(() =>
    technicalIndicatorService.calculateBollingerBands(prices, SMA_CONFIG.SHORT_PERIOD, BOLLINGER_BANDS.STD_DEVIATION),
    [prices]
  );

  return { sma20, upper, lower };
};
