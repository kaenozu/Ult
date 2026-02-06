import { BacktestView } from '../BacktestView';
import { ForecastView } from '../ForecastView';
import { AIPerformanceView } from '../AIPerformanceView';
import { SupplyDemandView } from '../SupplyDemandView';
import { SignalDisplay } from './SignalDisplay';
import { Signal, Stock, BacktestResult, PaperTrade, AIStatus, OHLCV } from '@/app/types';
import { PositionSizeRecommendation } from '@/app/types/risk';

interface SignalDetailsProps {
  activeTab: 'signal' | 'backtest' | 'ai' | 'forecast' | 'supplyDemand';
  displaySignal: Signal;
  stock: Stock;
  ohlcv: OHLCV[];
  backtestResult: BacktestResult | null;
  isBacktesting: boolean;
  preciseHitRate: { hitRate: number; trades: number } | null;
  calculatingHitRate: boolean;
  error: string | null;
  aiTrades: PaperTrade[];
  aiStatusData: AIStatus;
  kellyRecommendation: (PositionSizeRecommendation & { kellyResult?: { confidence: number; warnings: string[] } }) | null;
}

export function SignalDetails({
  activeTab,
  displaySignal,
  stock,
  ohlcv,
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
            isLive={false}
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

    case 'supplyDemand':
      return <SupplyDemandView ohlcv={ohlcv} stock={stock} />;
    
    default:
      return null;
  }
}


