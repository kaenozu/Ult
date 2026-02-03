import { calculateAIStatusMetrics } from '../aiStatus';
import { JournalEntry } from '@/app/types';
import { AI_TRADING } from '@/app/lib/constants';

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

    const expectedRealizedProfit = 100 + 100;
    const expectedUnrealizedProfit = -50;
    expect(result.totalProfit).toBe(expectedRealizedProfit);
    expect(result.virtualBalance).toBe(
      AI_TRADING.INITIAL_VIRTUAL_BALANCE + expectedRealizedProfit + expectedUnrealizedProfit
    );
  });
});
