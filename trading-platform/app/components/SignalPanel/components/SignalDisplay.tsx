import { Signal, Stock } from '@/app/types';
import { PositionSizeRecommendation } from '@/app/types/risk';

import { SignalCard } from '../../SignalCard';
import { LowAccuracyWarning } from '@/app/components/LowAccuracyWarning';
import { KellyPositionSizingDisplay } from '@/app/components/KellyPositionSizingDisplay';

interface SignalDisplayProps {
  signal: Signal;
  stock: Stock;
  isLive: boolean;
  preciseHitRate: { hitRate: number; trades: number } | null;
  calculatingHitRate: boolean;
  error: string | null;
  kellyRecommendation: (PositionSizeRecommendation & { kellyResult?: { confidence: number; warnings: string[] } }) | null;
}

export function SignalDisplay({
  signal,
  stock,
  isLive,
  preciseHitRate,
  calculatingHitRate,
  error,
  kellyRecommendation
}: SignalDisplayProps) {
  return (
    <div className="flex-1 flex flex-col gap-3 overflow-y-auto">
      {/* Low Accuracy Warning - only show with 5+ trades for statistical significance */}
      {signal && signal.type !== 'HOLD' && preciseHitRate && preciseHitRate.trades >= 5 && (
        <LowAccuracyWarning
          hitRate={preciseHitRate.hitRate}
          symbolName={stock.name}
          signalType={signal.type}
          threshold={50}
        />
      )}

      <SignalCard
        signal={signal}
        stock={stock}
        isLive={isLive}
        aiHitRate={preciseHitRate?.hitRate || 0}
        _aiTradesCount={preciseHitRate?.trades || 0}
        _calculatingHitRate={calculatingHitRate}
        _error={error}
      />

      {/* Kelly Position Sizing Display */}
      {signal.type !== 'HOLD' && (
        <KellyPositionSizingDisplay
          recommendation={kellyRecommendation}
          loading={false}
        />
      )}
    </div>
  );
}

