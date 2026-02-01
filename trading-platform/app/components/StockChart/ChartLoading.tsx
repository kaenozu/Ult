'use client';

export interface ChartLoadingProps {
  height: number;
}

export const ChartLoading = function ChartLoading({ height }: ChartLoadingProps) {
  return (
    <div className="relative w-full bg-[#131b23] border border-[#233648] rounded animate-pulse" style={{ height }}>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <div className="h-8 w-8 border-2 border-[#3b82f6] border-t-transparent rounded-full animate-spin mb-2"></div>
        <p className="text-xs text-[#92adc9]">データを取得中...</p>
      </div>
    </div>
  );
};
