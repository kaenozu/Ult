

import { useState } from 'react';
import { Stock, Signal, OHLCV } from '@/app/types';
import { useWebSocketManager } from './hooks/useWebSocketManager';
import { useSignalData } from './hooks/useSignalData';
import { useBacktestControls } from './hooks/useBacktestControls';
import { useKellyPositionSizing } from './hooks/useKellyPositionSizing';
import { SignalFilters } from './components/SignalFilters';
import { WebSocketManager } from './components/WebSocketManager';
import { SignalDetails } from './components/SignalDetails';

/**
 * シグナルパネルコンポーネント
 * 
 * AIが生成した売買シグナル、バックテスト結果、AI性能、価格予測を
 * タブ形式で表示する統合分析パネル。
 * 
 * 主な機能:
 * - シグナル表示
 * - バックテスト実行と結果可視化
 * - AI予測精度の追跡
 * - 価格予測チャート
 * - 自動アラート通知
 * 
 * @component
 * @example
 * ```tsx
 * <SignalPanel 
 *   stock={{ symbol: 'AAPL', name: 'Apple Inc.', market: 'usa' }}
 *   signal={aiGeneratedSignal}
 *   ohlcv={historicalPriceData}
 *   loading={false}
 * />
 * ```
 * 
 * @param {SignalPanelProps} props - コンポーネントのプロパティ
 * @returns {JSX.Element} シグナルパネルUI
 */
export function SignalPanel({ stock, signal, ohlcv = [], loading = false }: SignalPanelProps) {
  const [activeTab, setActiveTab] = useState<'signal' | 'backtest' | 'ai' | 'forecast'>('signal');

  // Custom hooks for separated concerns
  const { wsStatus, liveSignal, reconnect } = useWebSocketManager(stock);
  const { displaySignal, preciseHitRate, calculatingHitRate, error, aiTrades, aiStatusData } = useSignalData(stock, signal, liveSignal);
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
        <WebSocketManager wsStatus={wsStatus} reconnect={reconnect} />
      </div>

      <SignalDetails
        activeTab={activeTab}
        displaySignal={displaySignal}
        stock={stock}
        liveSignal={liveSignal}
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
