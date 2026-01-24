import { useTradingStore } from '../store/tradingStore';
import { Stock, Signal } from '../types';

describe('TradingStore Logic Tests', () => {
  const mockStock: Stock = {
    symbol: '7974',
    name: '任天堂',
    market: 'japan',
    sector: 'ゲーム',
    price: 10000,
    change: 0,
    changePercent: 0,
    volume: 1000
  };

  beforeEach(() => {
    // Reset store state before each test
    const { setState } = useTradingStore;
    useTradingStore.persist.clearStorage();
    setState({
      watchlist: [],
      portfolio: {
        positions: [],
        orders: [],
        totalValue: 0,
        totalProfit: 0,
        dailyPnL: 0,
        cash: 1000000,
      },
      journal: [],
      selectedStock: null,
    });
  });

  it('should add a stock to the watchlist and not duplicate it', () => {
    const store = useTradingStore.getState();
    store.addToWatchlist(mockStock);
    
    expect(useTradingStore.getState().watchlist.length).toBe(1);
    expect(useTradingStore.getState().watchlist[0].symbol).toBe('7974');

    // Duplicate check
    useTradingStore.getState().addToWatchlist(mockStock);
    expect(useTradingStore.getState().watchlist.length).toBe(1);
  });

  it('should add a new position and update portfolio values', () => {
    const store = useTradingStore.getState();
    const newPosition = {
      symbol: '7974',
      side: 'LONG' as const,
      quantity: 10,
      avgPrice: 10000,
      currentPrice: 10000,
      change: 0,
      entryDate: new Date().toISOString(),
    };

    store.addPosition(newPosition);
    
    const updatedStore = useTradingStore.getState();
    expect(updatedStore.portfolio.positions.length).toBe(1);
    expect(updatedStore.portfolio.totalValue).toBe(100000); // 10 * 10000
  });

  it('should calculate correct average price when adding to an existing position', () => {
    const store = useTradingStore.getState();
    
    store.addPosition({
      symbol: '7974',
      side: 'LONG',
      quantity: 10,
      avgPrice: 10000,
      currentPrice: 10000,
      change: 0,
      entryDate: '2026-01-01'
    });

    store.addPosition({
      symbol: '7974',
      side: 'LONG',
      quantity: 10,
      avgPrice: 12000,
      currentPrice: 12000,
      change: 0,
      entryDate: '2026-01-02'
    });

    const updatedStore = useTradingStore.getState();
    expect(updatedStore.portfolio.positions[0].quantity).toBe(20);
    expect(updatedStore.portfolio.positions[0].avgPrice).toBe(11000); // (10000*10 + 12000*10) / 20
  });

  it('should close a position and move capital + profit back to cash', () => {
    const store = useTradingStore.getState();
    const initialCash = store.portfolio.cash;

    store.addPosition({
      symbol: 'AAPL',
      side: 'LONG',
      quantity: 10,
      avgPrice: 100, // Cost = 1000
      currentPrice: 100,
      change: 0,
      entryDate: '2026-01-01'
    });

    // Manually adjust cash after adding position (simulate real trade)
    useTradingStore.setState((state) => ({
        portfolio: { ...state.portfolio, cash: initialCash - 1000 }
    }));

    // Close at 120 (Profit = 20 * 10 = 200)
    useTradingStore.getState().closePosition('AAPL', 120);

    const finalStore = useTradingStore.getState();
    expect(finalStore.portfolio.positions.length).toBe(0);
    expect(finalStore.portfolio.cash).toBe(initialCash + 200); // 1000000 - 1000 + 1200
    expect(finalStore.journal.length).toBe(1);
    expect(finalStore.journal[0].profit).toBe(200);
  });

  it('should only initiate AI trade if signal confidence is >= 80%', () => {
    const store = useTradingStore.getState();
    const strongSignal: Signal = {
      symbol: '7974',
      type: 'BUY',
      confidence: 85,
      targetPrice: 11000,
      stopLoss: 9500,
      reason: 'Strong trend',
      predictedChange: 5,
      predictionDate: '2026-01-24',
      accuracy: 70,
      atr: 200,
      predictionError: 1.0,
      volumeResistance: []
    };

    const weakSignal = { ...strongSignal, confidence: 50 };

    // Process weak signal
    store.processAITrades('7974', 10000, weakSignal);
    expect(useTradingStore.getState().aiStatus.trades.length).toBe(0);

    // Process strong signal
    useTradingStore.getState().processAITrades('7974', 10000, strongSignal);
    expect(useTradingStore.getState().aiStatus.trades.length).toBe(1);
    expect(useTradingStore.getState().aiStatus.trades[0].type).toBe('BUY');
  });
});
