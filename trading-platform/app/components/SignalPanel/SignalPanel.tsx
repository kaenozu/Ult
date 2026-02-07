import React, { useState } from 'react';
import { Stock, Signal, OHLCV } from '@/app/types';
import { useSignalData } from './hooks/useSignalData';
import { useBacktestControls } from './hooks/useBacktestControls';
import { useKellyPositionSizing } from './hooks/useKellyPositionSizing';
import { SignalFilters } from './components/SignalFilters';
import { SignalDetails } from './components/SignalDetails';

/**
 * SignalPanelコンポーネントのプロパティ
 * @property stock - 分析対象の銘柄情報
 * @property signal - AIが生成した売買シグナル
 * @property ohlcv - 価格履歴データ（バックテストと分析に使用）
 * @property loading - データ読み込み中フラグ
 */
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
 * 
 * @param {SignalPanelProps} props - コンポーネントのプロパティ
 * @returns {JSX.Element} シグナルパネルUI
 */
export function SignalPanel({ stock, signal, ohlcv = [], loading = false }: SignalPanelProps) {
  const [activeTab, setActiveTab] = useState<'signal' | 'backtest' | 'ai' | 'forecast' | 'supplyDemand'>('signal');

  // Custom hooks for separated concerns
  // Passed ohlcv to useSignalData for enhanced accuracy calculation
  const { displaySignal, preciseHitRate, calculatingHitRate, error, aiTrades, aiStatusData } = useSignalData(stock, signal, ohlcv);
  const { backtestResult, isBacktesting } = useBacktestControls(stock, ohlcv, activeTab, loading);
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
        ohlcv={ohlcv}
        backtestResult={backtestResult}
        isBacktesting={isBacktesting}
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