import { OHLCV, Signal } from '@/app/types';
import { technicalIndicatorService } from './TechnicalIndicatorService';
import { SignalValidatorService } from './SignalValidatorService';

/**
 * 銘柄別パラメータ・オプティマイザー
 * 特定の銘柄の過去データに最適なテクニカル指標のパラメータを特定します。
 */
export class ParameterOptimizerService {
  private validator = new SignalValidatorService();

  /**
   * 最も的中率の高いRSI期間を特定する
   */
  async findBestRSIPeriod(ohlcv: OHLCV[], periods: number[]): Promise<number> {
    if (ohlcv.length < 30) return periods[0] || 14;

    let bestPeriod = periods[0] || 14;
    let maxHitRate = -1;

    const closes = ohlcv.map(d => d.close);

    for (const period of periods) {
      const rsiValues = technicalIndicatorService.calculateRSI(closes, period);

      // RSIに基づいたバックテスト用シグナルの生成
      // (例: 30以下で買いシグナル)
      const mockSignals: Signal[] = [];
      for (let i = period; i < rsiValues.length - 1; i++) {
        if (rsiValues[i] <= 30) {
          mockSignals.push({
            symbol: ohlcv[0].symbol,
            type: 'BUY',
            price: ohlcv[i].close,
            timestamp: new Date(ohlcv[i].date).getTime(),
            confidence: 0.5
          });
        }
      }

      if (mockSignals.length > 0) {
        const validation = this.validator.validate(mockSignals, ohlcv);
        if (validation.hitRate > maxHitRate) {
          maxHitRate = validation.hitRate;
          bestPeriod = period;
        }
      }
    }

    return bestPeriod;
  }

  /**
   * 最も的中率の高いSMA(単純移動平均)期間を特定する
   */
  async findBestSMAPeriod(ohlcv: OHLCV[], periods: number[]): Promise<number> {
    // 同様のロジックでSMAの最適化も実装可能
    return periods[0] || 20;
  }
}

export const parameterOptimizerService = new ParameterOptimizerService();
