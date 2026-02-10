import { calculateTradingStats } from '../trading-stats';
import { Order } from '@/app/types';

describe('calculateTradingStats', () => {
  it('should return default stats for empty orders', () => {
    const stats = calculateTradingStats([]);
    expect(stats).toEqual({ winRate: 0.5, avgWin: 0, avgLoss: 0, totalTrades: 0 });
  });

  it('should return default stats for no filled orders', () => {
    const orders: Order[] = [
      { id: '1', symbol: 'AAPL', side: 'BUY', quantity: 10, price: 100, status: 'PENDING', timestamp: 1000 } as any
    ];
    const stats = calculateTradingStats(orders);
    expect(stats).toEqual({ winRate: 0.5, avgWin: 0, avgLoss: 0, totalTrades: 0 });
  });

  it('should calculate stats for a profitable trade', () => {
    const orders: Order[] = [
      { id: '1', symbol: 'AAPL', side: 'BUY', quantity: 10, price: 100, status: 'FILLED', timestamp: 1000 } as any,
      { id: '2', symbol: 'AAPL', side: 'SELL', quantity: 10, price: 110, status: 'FILLED', timestamp: 2000 } as any
    ];

    const stats = calculateTradingStats(orders);

    // Profit = (110 - 100) * 10 = 100
    expect(stats.winRate).toBe(1);
    expect(stats.avgWin).toBe(100);
    expect(stats.avgLoss).toBe(0);
    expect(stats.totalTrades).toBe(2);
  });

  it('should calculate stats for a losing trade', () => {
    const orders: Order[] = [
      { id: '1', symbol: 'AAPL', side: 'BUY', quantity: 10, price: 100, status: 'FILLED', timestamp: 1000 } as any,
      { id: '2', symbol: 'AAPL', side: 'SELL', quantity: 10, price: 90, status: 'FILLED', timestamp: 2000 } as any
    ];

    const stats = calculateTradingStats(orders);

    // Profit = (90 - 100) * 10 = -100 -> Loss 100
    expect(stats.winRate).toBe(0);
    expect(stats.avgWin).toBe(0);
    expect(stats.avgLoss).toBe(100);
    expect(stats.totalTrades).toBe(2);
  });

  it('should calculate stats for mixed trades', () => {
    const orders: Order[] = [
      // Win
      { id: '1', symbol: 'AAPL', side: 'BUY', quantity: 10, price: 100, status: 'FILLED', timestamp: 1000 } as any,
      { id: '2', symbol: 'AAPL', side: 'SELL', quantity: 10, price: 110, status: 'FILLED', timestamp: 2000 } as any,

      // Loss
      { id: '3', symbol: 'MSFT', side: 'BUY', quantity: 10, price: 50, status: 'FILLED', timestamp: 3000 } as any,
      { id: '4', symbol: 'MSFT', side: 'SELL', quantity: 10, price: 40, status: 'FILLED', timestamp: 4000 } as any
    ];

    const stats = calculateTradingStats(orders);

    expect(stats.winRate).toBe(0.5);
    expect(stats.avgWin).toBe(100);
    expect(stats.avgLoss).toBe(100);
    expect(stats.totalTrades).toBe(4);
  });
});
