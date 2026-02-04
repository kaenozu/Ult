import { BacktestView } from '../BacktestView';
import { ForecastView } from '../ForecastView';
import { AIPerformanceView } from '../AIPerformanceView';
import { SignalDisplay } from './SignalDisplay';
import { Signal, Stock, BacktestResult, PaperTrade, AIStatus, RiskCalculationResult } from '@/app/types';

interface SignalDetailsProps {
  activeTab: 'signal' | 'backtest' | 'ai' | 'forecast';
  displaySignal: Signal;
  stock: Stock;
  liveSignal: Signal | null;
  backtestResult: BacktestResult | null;
  isBacktesting: boolean;
  preciseHitRate: { hitRate: number; trades: number } | null;
  calculatingHitRate: boolean;
  error: string | null;
  aiTrades: PaperTrade[];
  aiStatusData: AIStatus;
  kellyRecommendation: RiskCalculationResult | null;
}

export function SignalDetails({
  activeTab,
  displaySignal,
  stock,
  liveSignal,
  backtestResult,
  isBacktesting,
  preciseHitRate,
  calculatingHitRate,
  error,
  aiTrades,
  aiStatusData,
  kellyRecommendation
}: SignalDetailsProps) {
  switch (activeTab) {
    case 'signal':
      return (
        <div role="tabpanel" id="panel-signal" aria-labelledby="tab-signal">
          <SignalDisplay
            signal={displaySignal}
            stock={stock}
            isLive={!!liveSignal}
            preciseHitRate={preciseHitRate}
            calculatingHitRate={calculatingHitRate}
            error={error}
            kellyRecommendation={kellyRecommendation}
          />
        </div>
      );
    
    case 'backtest':
      return <BacktestView backtestResult={backtestResult} loading={isBacktesting} />;
    
    case 'forecast':
      return <ForecastView signal={displaySignal} stock={stock} />;
    
    case 'ai':
      return <AIPerformanceView aiStatus={aiStatusData} stock={stock} aiTrades={aiTrades} />;
    
    default:
      return null;
  }
}