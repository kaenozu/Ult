'use client';

import { cn, getConfidenceColor } from '@/app/lib/utils';
import { Signal } from '@/app/types';

export interface SignalPanelTabsProps {
  activeTab: 'signal' | 'backtest' | 'ai' | 'forecast';
  onTabChange: (tab: 'signal' | 'backtest' | 'ai' | 'forecast') => void;
  signal: Signal | null;
  wsStatus: 'OPEN' | 'CONNECTING' | 'ERROR' | 'CLOSED';
  onReconnect?: () => void;
}

export const SignalPanelTabs = function SignalPanelTabs({
  activeTab,
  onTabChange,
  signal,
  wsStatus,
  onReconnect,
}: SignalPanelTabsProps) {
  const getTabProps = (tabName: 'signal' | 'backtest' | 'ai' | 'forecast', label: string) => ({
    role: 'tab' as const,
    id: `tab-${tabName}`,
    'aria-selected': activeTab === tabName,
    'aria-controls': `panel-${tabName}`,
    tabIndex: activeTab === tabName ? 0 : -1,
    onClick: () => onTabChange(tabName),
    className: cn(
      'px-3 py-1 text-xs font-medium rounded transition-colors focus:outline-none focus:ring-2 focus:ring-[#233648]',
      activeTab === tabName ? 'bg-[#233648] text-white' : 'text-[#92adc9] hover:text-white'
    ),
    children: label
  });

  return (
    <div className="flex justify-between items-center mb-2">
      {/* Tab List */}
      <div className="flex bg-[#192633] rounded-lg p-0.5 gap-0.5" role="tablist" aria-label="分析パネル">
        <button {...getTabProps('signal', 'シグナル')} />
        <button {...getTabProps('backtest', 'バックテスト')} />
        <button {...getTabProps('forecast', '予測コーン')} />
        <button {...getTabProps('ai', 'AI戦績')} />
      </div>

      <div className="flex items-center gap-3">
        {activeTab === 'signal' && signal && (
          <div className="flex items-center gap-2 text-xs">
            <span className="text-[#92adc9]">信頼度:</span>
            <span className={cn('font-bold', getConfidenceColor(signal.confidence))}>
              {signal.confidence}%
            </span>
          </div>
        )}
        <div className="flex items-center gap-1.5">
          <div className={cn(
            'w-2 h-2 rounded-full',
            wsStatus === 'OPEN' ? 'bg-green-500' :
              wsStatus === 'CONNECTING' ? 'bg-yellow-500' :
                wsStatus === 'ERROR' ? 'bg-red-500' :
                  'bg-gray-500'
          )} />
          <span className="text-[10px] text-[#92adc9]">
            {wsStatus === 'OPEN' ? '接続済' :
              wsStatus === 'CONNECTING' ? '接続中...' :
                wsStatus === 'ERROR' ? 'エラー' :
                  '未接続'}
          </span>
          {wsStatus === 'ERROR' || wsStatus === 'CLOSED' ? (
            <button
              onClick={onReconnect}
              className="text-[10px] text-blue-400 hover:text-blue-300 underline"
              title="WebSocketを再接続"
            >
              再接続
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
};
