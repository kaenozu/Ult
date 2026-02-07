import React, { useMemo } from 'react';
import { OHLCV, Stock } from '@/app/types';
import { supplyDemandMaster, SupplyDemandLevel } from '@/app/lib/supplyDemandMaster';
import { formatCurrency } from '@/app/lib/utils';
import { TrendingUp, TrendingDown, AlertCircle } from 'lucide-react';

interface SupplyDemandViewProps {
  ohlcv: OHLCV[];
  stock: Stock;
}

export function SupplyDemandView({ ohlcv, stock }: SupplyDemandViewProps) {
  const analysis = useMemo(() => {
    if (!ohlcv || ohlcv.length < 20) return null;
    return supplyDemandMaster.analyze(ohlcv);
  }, [ohlcv]);

  if (!analysis) {
    return (
      <div className="p-4 text-center text-[#92adc9]">
        分析に必要なデータが不足しています。
      </div>
    );
  }

  const { levels, nearestSupport, nearestResistance, breakout, nextBreakoutPrediction } = analysis;

  return (
    <div className="flex flex-col gap-4 animate-fade-in" role="tabpanel" id="panel-supplyDemand">
      {/* Summary Section */}
      <div className="grid grid-cols-2 gap-2">
        <div className="bg-[#192633] p-3 rounded-lg border border-[#233648]">
          <div className="text-[10px] text-[#92adc9] uppercase mb-1">直近レジスタンス</div>
          <div className="text-lg font-bold text-red-400">
            {nearestResistance ? formatCurrency(nearestResistance.price, stock.market === 'japan' ? 'JPY' : 'USD') : '---'}
          </div>
          {nearestResistance && (
            <div className="text-[10px] text-[#92adc9]">強度: {supplyDemandMaster.getStrengthDescription(nearestResistance.strength)}</div>
          )}
        </div>
        <div className="bg-[#192633] p-3 rounded-lg border border-[#233648]">
          <div className="text-[10px] text-[#92adc9] uppercase mb-1">直近サポート</div>
          <div className="text-lg font-bold text-green-400">
            {nearestSupport ? formatCurrency(nearestSupport.price, stock.market === 'japan' ? 'JPY' : 'USD') : '---'}
          </div>
          {nearestSupport && (
            <div className="text-[10px] text-[#92adc9]">強度: {supplyDemandMaster.getStrengthDescription(nearestSupport.strength)}</div>
          )}
        </div>
      </div>

      {/* Breakout Alert */}
      {breakout && (
        <div className={`p-3 rounded-lg border flex items-center gap-3 ${
          breakout.direction === 'up' 
            ? 'bg-green-500/10 border-green-500/30 text-green-400' 
            : 'bg-red-500/10 border-red-500/30 text-red-400'
        }`}>
          {breakout.direction === 'up' ? <TrendingUp size={20} /> : <TrendingDown size={20} />}
          <div>
            <div className="text-sm font-bold">
              {breakout.direction === 'up' ? '上方ブレイクアウト検出' : '下方ブレイクアウト検出'}
            </div>
            <div className="text-[10px] opacity-80">
              {breakout.volumeConfirmation ? '出来高を伴う強いブレイク' : '出来高不足の可能性あり'}
            </div>
          </div>
        </div>
      )}

      {/* Predictions */}
      <div className="bg-[#192633] p-4 rounded-lg border border-[#233648]">
        <h4 className="text-xs font-bold text-white mb-3 flex items-center gap-2">
          <AlertCircle size={14} className="text-primary" />
          ブレイクアウト予測
        </h4>
        <div className="space-y-3">
          {nextBreakoutPrediction.bullish ? (
            <div>
              <div className="flex justify-between text-[10px] mb-1">
                <span className="text-[#92adc9]">上方ブレイク可能性</span>
                <span className="text-green-400 font-bold">{nextBreakoutPrediction.bullish.probability.toFixed(1)}%</span>
              </div>
              <div className="w-full bg-[#101922] h-1.5 rounded-full overflow-hidden">
                <div 
                  className="bg-green-500 h-full transition-all duration-500" 
                  style={{ width: `${nextBreakoutPrediction.bullish.probability}%` }}
                />
              </div>
            </div>
          ) : (
            <div className="text-[10px] text-[#92adc9]">近傍に上方ブレイク対象のレジスタンスはありません。</div>
          )}

          {nextBreakoutPrediction.bearish ? (
            <div>
              <div className="flex justify-between text-[10px] mb-1">
                <span className="text-[#92adc9]">下方ブレイク可能性</span>
                <span className="text-red-400 font-bold">{nextBreakoutPrediction.bearish.probability.toFixed(1)}%</span>
              </div>
              <div className="w-full bg-[#101922] h-1.5 rounded-full overflow-hidden">
                <div 
                  className="bg-red-500 h-full transition-all duration-500" 
                  style={{ width: `${nextBreakoutPrediction.bearish.probability}%` }}
                />
              </div>
            </div>
          ) : (
            <div className="text-[10px] text-[#92adc9]">近傍に下方ブレイク対象のサポートはありません。</div>
          )}
        </div>
      </div>

      {/* Levels List */}
      <div className="flex-1">
        <h4 className="text-xs font-bold text-[#92adc9] mb-2 uppercase tracking-wider">検出された重要レベル</h4>
        <div className="space-y-1 max-h-48 overflow-y-auto pr-1 custom-scrollbar">
          {levels.slice(0, 10).map((level) => (
            <div key={`${level.type}-${level.price}`} className="flex items-center justify-between p-2 bg-[#192633]/30 rounded hover:bg-[#192633]/50 transition-colors border border-transparent hover:border-[#233648]">
              <div className="flex items-center gap-2">
                <div className={`w-1 h-6 rounded-full ${level.type === 'SUPPORT' ? 'bg-green-500' : 'bg-red-500'}`} />
                <div>
                  <div className="text-xs font-bold text-white">
                    {formatCurrency(level.price, stock.market === 'japan' ? 'JPY' : 'USD')}
                  </div>
                  <div className="text-[9px] text-[#92adc9]">{level.type === 'SUPPORT' ? 'サポート' : 'レジスタンス'}</div>
                </div>
              </div>
              <div className="text-right">
                <div className="text-[10px] text-white">{level.touches}回反発</div>
                <div className="text-[9px] text-[#92adc9]">最終: {level.lastTouchDate}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
