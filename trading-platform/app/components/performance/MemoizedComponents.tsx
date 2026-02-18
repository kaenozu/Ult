import React, { memo, useMemo, useCallback } from 'react';
import type { Stock, OHLCV, Signal } from '@/app/types';
import { AccuracyBadge } from '@/app/components/AccuracyBadge';

interface MemoizedStockInfoProps {
  stock: Stock;
  accuracyData?: {
    hitRate: number;
    totalTrades: number;
    predictionError?: number;
    loading?: boolean;
  } | null;
  signal?: Signal | null;
  market?: 'japan' | 'usa';
}

/**
 * メモ化された株情報コンポーネント
 * propsが変更されない限り再レンダリングしない
 */
export const MemoizedStockInfo = memo(function MemoizedStockInfo({
  stock,
  accuracyData,
  signal,
  market = 'usa'
}: MemoizedStockInfoProps) {
  // 市場に応じた表示フォーマット
  const formattedPrice = useMemo(() => {
    return market === 'japan' 
      ? `¥${stock.price.toLocaleString()}`
      : `$${stock.price.toFixed(2)}`;
  }, [stock.price, market]);

  // 変動率の色
  const changeColor = useMemo(() => {
    if (stock.change > 0) return 'text-green-400';
    if (stock.change < 0) return 'text-red-400';
    return 'text-gray-400';
  }, [stock.change]);

  const handleClick = useCallback(() => {
  }, []);

  return (
    <div 
      className="flex items-center justify-between p-4 bg-[#1a2330] rounded-lg border border-[#2a3540] hover:border-[#3a4550] transition-colors"
      onClick={handleClick}
    >
      <div className="flex items-center gap-4">
        <div>
          <h3 className="text-lg font-semibold text-white">{stock.symbol}</h3>
          <p className="text-sm text-[#92adc9]">{stock.name}</p>
        </div>
        <div className="text-right">
          <p className="text-xl font-bold text-white">{formattedPrice}</p>
          <p className={`text-sm ${changeColor}`}>
            {stock.change > 0 ? '+' : ''}{stock.change.toFixed(2)} 
            ({stock.changePercent > 0 ? '+' : ''}{stock.changePercent.toFixed(2)}%)
          </p>
        </div>
      </div>
      
      {accuracyData && (
        <AccuracyBadge 
          hitRate={accuracyData.hitRate}
          totalTrades={accuracyData.totalTrades}
          loading={accuracyData.loading}
        />
      )}
      
      {signal && signal.type !== 'HOLD' && (
        <div className={`px-3 py-1 rounded text-sm font-medium ${
          signal.type === 'BUY' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
        }`}>
          {signal.type}
        </div>
      )}
    </div>
  );
}, (prevProps, nextProps) => {
  // カスタム比較関数 - 重要なpropsのみを比較
  return (
    prevProps.stock.symbol === nextProps.stock.symbol &&
    prevProps.stock.price === nextProps.stock.price &&
    prevProps.stock.change === nextProps.stock.change &&
    prevProps.accuracyData?.hitRate === nextProps.accuracyData?.hitRate &&
    prevProps.signal?.type === nextProps.signal?.type
  );
});

interface MemoizedChartDataProps {
  data: OHLCV[];
  children: (processedData: {
    labels: string[];
    prices: number[];
    volumes: number[];
    sma5: number[];
    sma20: number[];
  }) => React.ReactNode;
}

/**
 * チャートデータの前処理をメモ化
 */
export const MemoizedChartData = memo(function MemoizedChartData({
  data,
  children
}: MemoizedChartDataProps) {
  const processedData = useMemo(() => {
    // データの前処理（高コストな計算）
    const labels = data.map(d => d.date);
    const prices = data.map(d => d.close);
    const volumes = data.map(d => d.volume);
    
    // SMA計算
    const calculateSMA = (period: number): number[] => {
      return data.map((_, idx) => {
        if (idx < period - 1) return 0;
        const sum = data
          .slice(idx - period + 1, idx + 1)
          .reduce((acc, d) => acc + d.close, 0);
        return sum / period;
      });
    };
    
    return {
      labels,
      prices,
      volumes,
      sma5: calculateSMA(5),
      sma20: calculateSMA(20)
    };
  }, [data]); // dataが変更された時のみ再計算

  return <>{children(processedData)}</>;
});

interface VirtualListProps<T> {
  items: T[];
  renderItem: (item: T, index: number) => React.ReactNode;
  itemHeight: number;
  containerHeight: number;
  keyExtractor: (item: T, index: number) => string;
  overscan?: number;
}

/**
 * 仮想化リストコンポーネント
 * 表示範囲のアイテムのみをレンダリング
 */
export function VirtualList<T>({
  items,
  renderItem,
  itemHeight,
  containerHeight,
  keyExtractor,
  overscan = 3
}: VirtualListProps<T>) {
  const [scrollTop, setScrollTop] = React.useState(0);
  
  const { startIndex, endIndex, virtualHeight } = useMemo(() => {
    const start = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan);
    const visibleCount = Math.ceil(containerHeight / itemHeight) + overscan * 2;
    const end = Math.min(items.length - 1, start + visibleCount);
    const height = items.length * itemHeight;
    
    return { startIndex: start, endIndex: end, virtualHeight: height };
  }, [scrollTop, items.length, itemHeight, containerHeight, overscan]);
  
  const visibleItems = useMemo(() => {
    return items.slice(startIndex, endIndex + 1).map((item, idx) => ({
      item,
      index: startIndex + idx,
      key: keyExtractor(item, startIndex + idx)
    }));
  }, [items, startIndex, endIndex, keyExtractor]);
  
  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    setScrollTop(e.currentTarget.scrollTop);
  }, []);
  
  return (
    <div 
      style={{ height: containerHeight, overflow: 'auto' }}
      onScroll={handleScroll}
    >
      <div style={{ height: virtualHeight, position: 'relative' }}>
        {visibleItems.map(({ item, index, key }) => (
          <div
            key={key}
            style={{
              position: 'absolute',
              top: index * itemHeight,
              height: itemHeight,
              width: '100%'
            }}
          >
            {renderItem(item, index)}
          </div>
        ))}
      </div>
    </div>
  );
}

import Image from 'next/image';

/**
 * 最適化された画像コンポーネント
 * Next.jsのImageコンポーネントを使用
 */
interface OptimizedImageProps {
  src: string;
  alt: string;
  width: number;
  height: number;
  className?: string;
  priority?: boolean;
}

export const OptimizedImage = memo(function OptimizedImage({
  src,
  alt,
  width,
  height,
  className,
  priority = false
}: OptimizedImageProps) {
  return (
    <div className={`relative ${className}`} style={{ width, height }}>
      <Image
        src={src}
        alt={alt}
        width={width}
        height={height}
        className="object-cover"
        priority={priority}
        loading={priority ? 'eager' : 'lazy'}
      />
    </div>
  );
});
