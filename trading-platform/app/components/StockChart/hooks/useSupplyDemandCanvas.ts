/**
 * useSupplyDemandCanvas.ts
 * 
 * 需給の壁（ボリュームプロファイル）の描画を管理
 */

import { useRef, useEffect } from 'react';
import { IChartApi, ISeriesApi, IPriceLine } from 'lightweight-charts';
import { OHLCV } from '@/app/types';
import { supplyDemandMaster } from '@/app/lib/supplyDemandMaster';

export function useSupplyDemandCanvas(
  chartRef: React.RefObject<IChartApi | null>,
  candleSeriesRef: React.RefObject<ISeriesApi<'Candlestick'> | null>,
  data: OHLCV[],
  showSupplyDemandWall: boolean,
  height: number,
  containerWidth: number
) {
  const wallCanvasRef = useRef<HTMLCanvasElement>(null);
  const priceLinesRef = useRef<IPriceLine[]>([]);

  useEffect(() => {
    if (!showSupplyDemandWall || data.length <= 20 || !chartRef.current || !candleSeriesRef.current || !wallCanvasRef.current) {
      if (!showSupplyDemandWall && candleSeriesRef.current) {
        priceLinesRef.current.forEach(line => candleSeriesRef.current!.removePriceLine(line));
        priceLinesRef.current = [];
        const ctx = wallCanvasRef.current?.getContext('2d');
        if (ctx) ctx.clearRect(0, 0, wallCanvasRef.current!.width, wallCanvasRef.current!.height);
      }
      return;
    }

    const wallData = supplyDemandMaster.getWallData(data);
    const canvas = wallCanvasRef.current;
    const ctx = canvas.getContext('2d');
    const series = candleSeriesRef.current;
    
    if (ctx) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const width = canvas.width;
      
      // Remove old price lines
      priceLinesRef.current.forEach(line => series.removePriceLine(line));
      priceLinesRef.current = [];
      
      wallData.buckets.forEach(bucket => {
        const y = series.priceToCoordinate(bucket.price);
        if (y !== null) {
           const barWidth = (bucket.volume / wallData.maxVolume) * (width * 0.3);
           const barHeight = Math.max(2, (height / wallData.buckets.length) * 0.8);
           
           ctx.fillStyle = bucket.type === 'SUPPORT' 
              ? 'rgba(34, 197, 94, 0.2)' 
              : bucket.type === 'RESISTANCE' 
                 ? 'rgba(239, 68, 68, 0.2)' 
                 : 'rgba(146, 173, 201, 0.1)';
           
           if (bucket.isWall) {
              ctx.fillStyle = bucket.type === 'SUPPORT' 
                 ? 'rgba(34, 197, 94, 0.4)' 
                 : 'rgba(239, 68, 68, 0.4)';
                 
              const line = series.createPriceLine({
                 price: bucket.price,
                 color: bucket.type === 'SUPPORT' ? 'rgba(34, 197, 94, 0.3)' : 'rgba(239, 68, 68, 0.3)',
                 lineWidth: 1,
                 lineStyle: 2,
                 axisLabelVisible: true,
                 title: bucket.type === 'SUPPORT' ? '需給の壁(S)' : '需給の壁(R)',
              });
              priceLinesRef.current.push(line);
           }
           
           ctx.fillRect(width - barWidth, y - barHeight / 2, barWidth, barHeight);
        }
      });
    }
  }, [data, showSupplyDemandWall, height, containerWidth, chartRef, candleSeriesRef]);

  return { wallCanvasRef };
}
