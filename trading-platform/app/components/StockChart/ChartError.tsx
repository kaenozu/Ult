'use client';

export interface ChartErrorProps {
  error: string | null;
  height: number;
}

export const ChartError = function ChartError({ error, height }: ChartErrorProps) {
  return (
    <div className="relative w-full flex items-center justify-center bg-red-500/10 border border-red-500/50 rounded" style={{ height }}>
      <div className="text-center p-4">
        <p className="text-red-400 font-bold">データの取得に失敗しました</p>
        <p className="text-red-300 text-sm mt-1">{error}</p>
      </div>
    </div>
  );
};
