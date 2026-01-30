'use client';

import { Bar } from 'react-chartjs-2';
import { OHLCV } from '@/app/types';
import { CANDLESTICK } from '@/app/lib/constants';

export interface ChartVolumeProps {
  data: OHLCV[];
  labels: string[];
}

export const ChartVolume = function ChartVolume({ data, labels }: ChartVolumeProps) {
  return (
    <div className="absolute bottom-0 left-0 right-0 h-24 pointer-events-none">
      <Bar data={{
        labels,
        datasets: [{
          data: data.map(d => d.volume),
          backgroundColor: data.map((d, i) =>
            i === 0 || d.close >= data[i - 1].close ? CANDLESTICK.BULL_COLOR : CANDLESTICK.BEAR_COLOR
          )
        }]
      }} options={{ responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false }, tooltip: { enabled: false } }, scales: { x: { display: false }, y: { display: false } } }} />
    </div>
  );
};
