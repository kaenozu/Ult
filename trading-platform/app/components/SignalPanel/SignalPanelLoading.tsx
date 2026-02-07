'use client';

export const SignalPanelLoading = function SignalPanelLoading() {
  return (
    <div className="bg-[#141e27] p-4 flex flex-col gap-3 h-full">
      <div className="flex justify-between items-center text-xs">
        <div className="h-4 w-24 bg-[#233648] rounded animate-pulse" />
        <div className="h-4 w-12 bg-[#233648] rounded animate-pulse" />
      </div>
      <div className="flex-1 bg-[#192633]/50 rounded-lg border border-[#233648] animate-pulse flex items-center justify-center">
        <span className="text-[#92adc9]/50 text-xs">市場データを分析中...</span>
      </div>
    </div>
  );
};
