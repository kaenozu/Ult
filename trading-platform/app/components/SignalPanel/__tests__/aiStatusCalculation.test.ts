import { calculateAIStatusMetrics } from '../aiStatus';
import { JournalEntry } from '@/app/types';

describe('calculateAIStatusMetrics', () => {
  it('trades historyに基づいてvirtualBalanceとtotalProfitを算出する', () => {
    const entries: JournalEntry[] = [
      {
        id: 'trade-1',
        symbol: 'AAPL',
        date: '2024-01-01',
        signalType: 'BUY',
        entryPrice: 100,
        exitPrice: 110,
        quantity: 10,
        notes: 'win',
        status: 'CLOSED',
      },
      {
        id: 'trade-2',
        symbol: 'TSLA',
        date: '2024-01-02',
        signalType: 'SELL',
        entryPrice: 200,
        exitPrice: 180,
        quantity: 5,
        notes: 'short win',
        status: 'CLOSED',
      },
      {
        id: 'trade-3',
        symbol: 'MSFT',
        date: '2024-01-03',
        signalType: 'BUY',
        entryPrice: 50,
        exitPrice: 45,
        quantity: 10,
        notes: 'open loss',
        status: 'OPEN',
      },
    ];

    const result = calculateAIStatusMetrics(entries);

    expect(result.realizedProfit).toBe(200);
    expect(result.totalTrades).toBe(2);
    expect(result.winningTrades).toBe(2);
    expect(result.losingTrades).toBe(0);
    expect(result.winRate).toBe(100);
  });

  it('空のjournalで初期値を返す', () => {
    const result = calculateAIStatusMetrics([]);
    expect(result.virtualBalance).toBe(10000000);
    expect(result.totalProfit).toBe(0);
    expect(result.realizedProfit).toBe(0);
    expect(result.unrealizedProfit).toBe(0);
  });

  it('損益計算が正しいことを確認', () => {
    const entries: JournalEntry[] = [
      {
        id: 'trade-1',
        symbol: 'AAPL',
        date: '2024-01-01',
        signalType: 'BUY',
        entryPrice: 150,
        exitPrice: 160,
        quantity: 100,
        notes: 'profit trade',
        status: 'CLOSED',
      },
    ];

    const result = calculateAIStatusMetrics(entries);

    expect(result.realizedProfit).toBe(1000);
    expect(result.virtualBalance).toBe(10001000);
  });
});
