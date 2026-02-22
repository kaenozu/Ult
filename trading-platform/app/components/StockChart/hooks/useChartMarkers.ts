/**
 * useChartMarkers.ts
 * 
 * AI確信度マーカーの表示を管理
 */

import { useEffect } from 'react';
import { ISeriesApi, Time } from 'lightweight-charts';
import { OHLCV, Signal } from '@/app/types';

export function useChartMarkers(
  candleSeriesRef: React.RefObject<ISeriesApi<'Candlestick'> | null>,
  data: OHLCV[],
  signal: Signal | null
) {
  useEffect(() => {
    if (!candleSeriesRef.current || data.length === 0) return;

    const markers: any[] = [];
    if (signal && signal.confidence >= 60) {
      const time = data[data.length - 1].date as Time;
      const isBuy = signal.type === 'BUY';
      
      markers.push({
        time: time,
        position: isBuy ? 'belowBar' : 'aboveBar',
        color: isBuy ? '#22c55e' : '#ef4444',
        shape: isBuy ? 'arrowUp' : 'arrowDown',
        text: `AI確信度: ${signal.confidence}%`,
        size: 2,
      });
      
      if (signal.reason) {
         const simpleReason = signal.reason.split('。')[0];
         markers.push({
            time: time,
            position: isBuy ? 'belowBar' : 'aboveBar',
            color: '#fbbf24',
            shape: 'circle',
            text: simpleReason.length > 10 ? simpleReason.substring(0, 10) + '...' : simpleReason,
            size: 0,
         });
      }
    }
    
    if (candleSeriesRef.current && typeof candleSeriesRef.current.setMarkers === 'function') {
      candleSeriesRef.current.setMarkers(markers);
    }
  }, [data, signal, candleSeriesRef]);
}
