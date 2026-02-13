import { OHLCV } from '@/app/types';
import { technicalIndicatorService } from '@/app/lib/TechnicalIndicatorService';

/**
 * 指標計算の純粋ロジック（Worker内外から利用可能）
 */
export function calculateIndicatorsSync(data: OHLCV[]) {
  const closes = data.map(d => d.close);
  
  return {
    rsi: technicalIndicatorService.calculateRSI(closes, 14),
    macd: technicalIndicatorService.calculateMACD(closes, 12, 26, 9),
    sma20: technicalIndicatorService.calculateSMA(closes, 20),
    sma50: technicalIndicatorService.calculateSMA(closes, 50),
    bb: technicalIndicatorService.calculateBollingerBands(closes, 20, 2),
  };
}
