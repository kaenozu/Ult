import { cn, getConfidenceColor } from '@/app/lib/utils';
import { Signal } from '@/app/types';

interface SignalFiltersProps {
  activeTab: 'signal' | 'backtest' | 'ai' | 'forecast';
  setActiveTab: (tab: 'signal' | 'backtest' | 'ai' | 'forecast') => void;
  displaySignal: Signal | null;
}

export function SignalFilters({ activeTab, setActiveTab, displaySignal }: SignalFiltersProps) {
  // Helper for tab props to ensure accessibility and DRY
  const getTabProps = (tabName: 'signal' | 'backtest' | 'ai' | 'forecast', label: string) => ({
    role: 'tab',
    id: `tab-${tabName}`,
    'aria-selected': activeTab === tabName,
    'aria-controls': `panel-${tabName}`,
    tabIndex: activeTab === tabName ? 0 : -1,
    onClick: () => setActiveTab(tabName),
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

      {activeTab === 'signal' && displaySignal && (
        <div className="flex items-center gap-2 text-xs">
          <span className="text-[#92adc9]">信頼度:</span>
          <span className={cn('font-bold', getConfidenceColor(displaySignal.confidence))}>
            {displaySignal.confidence}%
          </span>
        </div>
      )}
    </div>
  );
}