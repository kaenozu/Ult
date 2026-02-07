import { SignalValidatorService } from '../SignalValidatorService';
import { OHLCV, Signal } from '@/app/types';

describe('SignalValidatorService', () => {
  let service: SignalValidatorService;

  beforeEach(() => {
    service = new SignalValidatorService();
  });

  test('正確な的中率を計算できること (100%的中ケース)', () => {
    const historicalData: OHLCV[] = [
      { date: '2026-01-01', open: 100, high: 110, low: 90, close: 105, volume: 1000, symbol: '7203' },
      { date: '2026-01-02', open: 105, high: 115, low: 100, close: 110, volume: 1100, symbol: '7203' },
    ];

    const signals: Signal[] = [
      { 
        symbol: '7203', 
        type: 'BUY', 
        price: 105, 
        timestamp: new Date('2026-01-01').getTime(),
        confidence: 0.8 
      }
    ];

    const result = service.validate(signals, historicalData);
    expect(result.hitRate).toBe(100);
    expect(result.totalSignals).toBe(1);
    expect(result.correctSignals).toBe(1);
  });

  test('シグナルの後に価格が下がった場合に外れと判定されること', () => {
    const historicalData: OHLCV[] = [
      { date: '2026-01-01', open: 100, high: 110, low: 90, close: 105, volume: 1000, symbol: '7203' },
      { date: '2026-01-02', open: 105, high: 105, low: 95, close: 100, volume: 1100, symbol: '7203' },
    ];

    const signals: Signal[] = [
      { 
        symbol: '7203', 
        type: 'BUY', 
        price: 105, 
        timestamp: new Date('2026-01-01').getTime(),
        confidence: 0.8 
      }
    ];

    const result = service.validate(signals, historicalData);
    expect(result.hitRate).toBe(0);
  });

  test('プロフィット・ファクターを正しく計算できること', () => {
    const historicalData: OHLCV[] = [
      { date: '2026-01-01', open: 100, high: 110, low: 90, close: 100, volume: 1000, symbol: '7203' },
      { date: '2026-01-02', open: 100, high: 110, low: 100, close: 110, volume: 1100, symbol: '7203' }, // +10 profit
      { date: '2026-01-03', open: 110, high: 110, low: 100, close: 105, volume: 1200, symbol: '7203' }, // -5 loss
      { date: '2026-01-04', open: 105, high: 105, low: 105, close: 105, volume: 1000, symbol: '7203' },
    ];

    const signals: Signal[] = [
      { symbol: '7203', type: 'BUY', price: 100, timestamp: new Date('2026-01-01').getTime(), confidence: 0.8 },
      { symbol: '7203', type: 'BUY', price: 110, timestamp: new Date('2026-01-02').getTime(), confidence: 0.8 }
    ];

    const result = service.validate(signals, historicalData);
    expect(result.totalProfit).toBe(10);
    expect(result.totalLoss).toBe(5);
    expect(result.profitFactor).toBe(2); // 10 / 5 = 2.0
  });
});
