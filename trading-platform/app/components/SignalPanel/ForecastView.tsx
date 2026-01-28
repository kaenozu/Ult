import { Signal, Stock } from '@/app/types';
import { formatCurrency, cn, getConfidenceColor } from '@/app/lib/utils';

// Const can be passed as prop or kept here if it's constant across app
const FORECAST_CONE = {
  STEPS: 5,
};

interface ForecastViewProps {
  signal: Signal | null;
  stock: Stock;
}

export function ForecastView({ signal, stock }: ForecastViewProps) {
  return (
    <div className="flex-1 overflow-auto space-y-4" role="tabpanel" id="panel-forecast" aria-labelledby="tab-forecast">
      {signal?.forecastCone ? (
        <>
          <div className="text-xs font-bold text-[#92adc9] uppercase tracking-wider mb-2">
            予測コーン（{FORECAST_CONE.STEPS}日先まで）
          </div>
          <div className="bg-[#1a2632] p-3 rounded-lg border border-[#233648]">
            <div className="flex justify-between items-center mb-3">
              <span className="text-[10px] text-[#92adc9]">コーン信頼度</span>
              <span className={cn('text-sm font-bold', getConfidenceColor(signal.forecastCone.confidence))}>
                {signal.forecastCone.confidence}%
              </span>
            </div>
            <div className="space-y-1 text-[10px]">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded bg-red-500/50 border border-red-500/30" />
                <span className="text-red-400">悲観的下限: {formatCurrency(signal.forecastCone.bearish.lower[signal.forecastCone.bearish.lower.length - 1], stock.market === 'japan' ? 'JPY' : 'USD')}</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded bg-red-500/20 border border-red-500/20" />
                <span className="text-red-300">悲観的上限: {formatCurrency(signal.forecastCone.bearish.upper[signal.forecastCone.bearish.upper.length - 1], stock.market === 'japan' ? 'JPY' : 'USD')}</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded bg-blue-500/50 border border-blue-500/30" />
                <span className="text-blue-400">楽観的下限: {formatCurrency(signal.forecastCone.bullish.lower[signal.forecastCone.bullish.lower.length - 1], stock.market === 'japan' ? 'JPY' : 'USD')}</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded bg-blue-500/20 border border-blue-500/20" />
                <span className="text-blue-300">楽観的上限: {formatCurrency(signal.forecastCone.bullish.upper[signal.forecastCone.bullish.upper.length - 1], stock.market === 'japan' ? 'JPY' : 'USD')}</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded bg-gray-500/50 border border-gray-500/30" />
                <span className="text-gray-400">ベースライン: {formatCurrency(signal.forecastCone.base[signal.forecastCone.base.length - 1], stock.market === 'japan' ? 'JPY' : 'USD')}</span>
              </div>
            </div>
          </div>
          <div className="bg-[#1a2632]/50 p-3 rounded-lg border border-dashed border-[#233648]">
            <div className="text-[10px] text-[#92adc9] mb-1">シナリオ説明</div>
            <div className="space-y-1 text-[11px] text-white/80">
              <div className="text-red-300">• 悲観: ボラティリティ拡大、マーケット下落</div>
              <div className="text-blue-300">• 楽観: トレンド継続、サポートライン反発</div>
              <div className="text-[#92adc9] mt-2 pt-2 border-t border-[#233648]/30">
                コーンが狭いほど予測信頼度が高いです
              </div>
            </div>
          </div>
        </>
      ) : (
        <div className="text-xs text-[#92adc9] text-center py-8 bg-[#192633]/20 rounded-lg border border-dashed border-[#233648]">
          予測コーンデータはまだ生成されていません
        </div>
      )}
    </div>
  );
}
