import { OHLCV } from '@/app/types';
import { technicalIndicatorService } from '@/app/lib/TechnicalIndicatorService';
import { accuracyService } from '@/app/lib/AccuracyService';
import { RSI_CONFIG, SMA_CONFIG } from '@/app/constants';

/**
 * 指標計算の純粋ロジック（Worker内外から利用可能）
 */
export function calculateIndicatorsSync(data: OHLCV[]) {
  const closes = data.map(d => d.close);
  
  const rsi = new Map<number, number[]>();
  const sma = new Map<number, number[]>();

  // Calculate all RSI periods
  for (const p of RSI_CONFIG.PERIOD_OPTIONS) {
    rsi.set(p, technicalIndicatorService.calculateRSI(closes, p));
  }

  // Calculate all SMA periods
  for (const p of SMA_CONFIG.PERIOD_OPTIONS) {
    sma.set(p, technicalIndicatorService.calculateSMA(closes, p));
  }

  return {
    rsi,
    sma,
    atr: accuracyService.calculateBatchSimpleATR(data),
    macd: technicalIndicatorService.calculateMACD(closes, 12, 26, 9),
    sma20: sma.get(20) || technicalIndicatorService.calculateSMA(closes, 20),
    sma50: sma.get(50) || technicalIndicatorService.calculateSMA(closes, 50),
    bb: technicalIndicatorService.calculateBollingerBands(closes, 20, 2),
  };
}
