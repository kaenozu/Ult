import { useState } from 'react';
import { Stock, Signal, OHLCV } from '@/app/types';
import { useSignalData } from './hooks/useSignalData';
import { useKellyPositionSizing } from './hooks/useKellyPositionSizing';
import { SignalFilters } from './components/SignalFilters';
import { SignalDetails } from './components/SignalDetails';

interface SignalPanelProps {
  stock: Stock;
  signal: Signal | null;
  ohlcv?: OHLCV[];
  loading?: boolean;
}

/**
 * シグナルパネルコンポーネント
 * 
 * AIが生成した売買シグナル、バックテスト結果、AI性能、価格予測を
 * タブ形式で表示する統合分析パネル。
 */
export function SignalPanel({ stock, signal, ohlcv = [], loading = false }: SignalPanelProps) {
  const [activeTab, setActiveTab] = useState<'signal' | 'ai' | 'forecast'>('signal');

  // Custom hooks for separated concerns
  // Passed ohlcv to useSignalData for enhanced accuracy calculation
  const { displaySignal, preciseHitRate, calculatingHitRate, error, aiTrades, aiStatusData } = useSignalData(stock, signal, ohlcv);
  
  const kellyRecommendation = useKellyPositionSizing(stock, displaySignal);

  if (loading || !displaySignal) {
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
  }

  return (
    <div className="bg-[#141e27] p-4 flex flex-col gap-3 h-full">
      <div className="flex justify-between items-center">
        <SignalFilters
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          displaySignal={displaySignal}
        />
      </div>

      <SignalDetails
        activeTab={activeTab}
        displaySignal={displaySignal}
        stock={stock}
        preciseHitRate={preciseHitRate}
        calculatingHitRate={calculatingHitRate}
        error={error}
        aiTrades={aiTrades}
        aiStatusData={aiStatusData}
        kellyRecommendation={kellyRecommendation}
      />
    </div>
  );
}