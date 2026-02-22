// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { cn, getConfidenceColor } from '@/app/lib/utils';
import { Signal } from '@/app/types';

interface SignalFiltersProps {
  activeTab: 'signal' | 'backtest' | 'ai' | 'forecast' | 'supplyDemand';
  setActiveTab: (tab: 'signal' | 'backtest' | 'ai' | 'forecast' | 'supplyDemand') => void;
  displaySignal: Signal | null;
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function SignalFilters({ activeTab, setActiveTab, displaySignal }: SignalFiltersProps) {
  // Helper for tab props to ensure accessibility and DRY
  const getTabProps = (tabName: 'signal' | 'backtest' | 'ai' | 'forecast' | 'supplyDemand', label: string) => ({
    role: 'tab',
    id: `tab-${tabName}`,
    'aria-selected': activeTab === tabName,
    'aria-controls': `panel-${tabName}`,
    tabIndex: activeTab === tabName ? 0 : -1,
    onClick: () => setActiveTab(tabName),
    className: cn(
      'px-2 py-1 text-[10px] font-medium rounded transition-colors focus:outline-none focus:ring-2 focus:ring-[#233648]',
      activeTab === tabName ? 'bg-[#233648] text-white' : 'text-[#92adc9] hover:text-white'
    ),
    children: label
  });

  return (
    <div className="flex justify-between items-center mb-2">
      {/* Tab List */}
      <div className="flex bg-[#192633] rounded-lg p-0.5 gap-0.5" role="tablist" aria-label="分析パネル">
        <button {...getTabProps('signal', 'シグナル')} />
        <button {...getTabProps('backtest', 'テスト')} />
        <button {...getTabProps('forecast', '予測')} />
        <button {...getTabProps('ai', '戦績')} />
        <button {...getTabProps('supplyDemand', '需給')} />
      </div>

    </div>
  );
}
