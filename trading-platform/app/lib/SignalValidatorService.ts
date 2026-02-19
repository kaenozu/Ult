import { OHLCV, Signal } from '@/app/types';
import { devWarn } from '@/app/lib/utils/dev-logger';



export interface ValidationResult {
  hitRate: number;
  totalSignals: number;
  correctSignals: number;
  totalProfit: number;
  totalLoss: number;
  profitFactor: number;
}

/**
 * 予測精度検証エンジン
 * 過去のシグナルと実際の価格データを照合し、的中率と収益性を算出します。
 */
export class SignalValidatorService {
  /**
   * シグナルの的中率と収益性を検証する
   */
  validate(signals: Signal[], history: OHLCV[]): ValidationResult {
    if (signals.length === 0) {
      return { hitRate: 0, totalSignals: 0, correctSignals: 0, totalProfit: 0, totalLoss: 0, profitFactor: 0 };
    }

    let correctCount = 0;
    let totalProfit = 0;
    let totalLoss = 0;
    
    for (const signal of signals) {
      let signalDate: string;
      try {
        const dateValue = (signal as any).predictionDate || signal.timestamp || 0;
        const d = new Date(dateValue);
        if (isNaN(d.getTime())) {
          devWarn(`Invalid signal date: ${dateValue}`);
          continue;
        }
        signalDate = d.toISOString().split('T')[0];
      } catch (e) {
        continue;
      }

      const signalIdx = history.findIndex(h => h.date === signalDate);

      if (signalIdx !== -1 && signalIdx + 1 < history.length) {
        const entryPrice = history[signalIdx].close;
        const nextDay = history[signalIdx + 1];
        const profit = nextDay.close - entryPrice;

        if (signal.type === 'BUY') {
          if (profit > 0) {
            correctCount++;
            totalProfit += profit;
          } else {
            totalLoss += Math.abs(profit);
          }
        } else if (signal.type === 'SELL') {
          if (profit < 0) {
            correctCount++;
            totalProfit += Math.abs(profit);
          } else {
            totalLoss += profit;
          }
        }
      }
    }

    return {
      hitRate: (correctCount / signals.length) * 100,
      totalSignals: signals.length,
      correctSignals: correctCount,
      totalProfit,
      totalLoss,
      profitFactor: totalLoss === 0 ? (totalProfit > 0 ? 99.9 : 0) : totalProfit / totalLoss
    };
  }
}
