import { useTradingStore } from '../store/tradingStore';
import { Signal } from '../types';

describe('tradingStore', () => {
  beforeEach(() => {
    useTradingStore.setState(useTradingStore.getInitialState());
  });

  it('toggles theme', () => {
    const { toggleTheme } = useTradingStore.getState();
    expect(useTradingStore.getState().theme).toBe('dark');
    toggleTheme();
    expect(useTradingStore.getState().theme).toBe('light');
  });

  it('manages watchlist', () => {
    const stock = { symbol: 'AAPL', name: 'Apple', price: 150 } as any;
    const { addToWatchlist, removeFromWatchlist, updateStockData } = useTradingStore.getState();

    addToWatchlist(stock);
    expect(useTradingStore.getState().watchlist).toHaveLength(1);

    // Update
    updateStockData('AAPL', { price: 155 });
    expect(useTradingStore.getState().watchlist[0].price).toBe(155);

    removeFromWatchlist('AAPL');
    expect(useTradingStore.getState().watchlist).toHaveLength(0);
  });

  it('batch updates stock data', () => {
    const { addToWatchlist, batchUpdateStockData } = useTradingStore.getState();
    addToWatchlist({ symbol: 'S1', price: 100 } as any);
    addToWatchlist({ symbol: 'S2', price: 200 } as any);

    batchUpdateStockData([
      { symbol: 'S1', data: { price: 110 } },
      { symbol: 'S2', data: { price: 210 } }
    ]);

    const state = useTradingStore.getState();
    expect(state.watchlist.find(s => s.symbol === 'S1')?.price).toBe(110);
    expect(state.watchlist.find(s => s.symbol === 'S2')?.price).toBe(210);
  });

  it('manages portfolio positions including averaging down', () => {
    const { addPosition } = useTradingStore.getState();

    addPosition({ symbol: '7203', side: 'LONG', quantity: 100, avgPrice: 3000, currentPrice: 3000 } as any);
    // Add more of the same
    addPosition({ symbol: '7203', side: 'LONG', quantity: 100, avgPrice: 2800, currentPrice: 2900 } as any);

    const state = useTradingStore.getState();
    expect(state.portfolio.positions).toHaveLength(1);
    expect(state.portfolio.positions[0].quantity).toBe(200);
    expect(state.portfolio.positions[0].avgPrice).toBe(2900); // (3000*100 + 2800*100) / 200
  });

  it('sets cash amount', () => {
    const { setCash } = useTradingStore.getState();
    setCash(5000000);
    expect(useTradingStore.getState().portfolio.cash).toBe(5000000);
  });

  it('manages portfolio positions', () => {
    const position = {
      symbol: 'AAPL',
      side: 'LONG',
      quantity: 10,
      avgPrice: 150,
      currentPrice: 160,
      change: 10
    } as any;

    const { addPosition, closePosition } = useTradingStore.getState();

    addPosition(position);
    closePosition('AAPL', 170);

    const state = useTradingStore.getState();
    expect(state.portfolio.positions).toHaveLength(0);
    expect(state.journal).toHaveLength(1);
    expect(state.journal[0].profit).toBe(200); // (170-150)*10
  });

  describe('processAITrades', () => {
    it('enters a LONG position', () => {
      const signal: Signal = { type: 'BUY', confidence: 90, targetPrice: 110, stopLoss: 90 } as any;
      const { processAITrades } = useTradingStore.getState();
      processAITrades('AAPL', 100, signal);
      expect(useTradingStore.getState().aiStatus.trades).toHaveLength(1);
    });

    it('does nothing on HOLD or low confidence', () => {
      const { processAITrades } = useTradingStore.getState();
      processAITrades('HOLD', 100, { type: 'HOLD', confidence: 90 } as any);
      processAITrades('LOW', 100, { type: 'BUY', confidence: 70 } as any);
      expect(useTradingStore.getState().aiStatus.trades).toHaveLength(0);
    });

    it('closes positions on targets/stoploss', () => {
      const { processAITrades } = useTradingStore.getState();
      // Enter
      processAITrades('EXIT', 100, { type: 'BUY', confidence: 90, targetPrice: 110, stopLoss: 90 } as any);
      // Exit on Target
      processAITrades('EXIT', 115, { type: 'BUY', confidence: 90, targetPrice: 110, stopLoss: 90 } as any);

      const state = useTradingStore.getState();
      expect(state.aiStatus.trades[0].status).toBe('CLOSED');
      expect(state.aiStatus.trades[0].reflection).toContain('利確');
    });

    it('handles market drag reflections', () => {
      const { processAITrades } = useTradingStore.getState();
      processAITrades('DRAG', 100, { type: 'BUY', confidence: 90, targetPrice: 150, stopLoss: 95 } as any);
      processAITrades('DRAG', 90, {
        type: 'BUY',
        stopLoss: 95,
        marketContext: { indexTrend: 'DOWN', correlation: 0.9, indexSymbol: '^N225' }
      } as any);

      const state = useTradingStore.getState();
      expect(state.aiStatus.trades[0].reflection).toContain('市場全体');
    });
  });
});
