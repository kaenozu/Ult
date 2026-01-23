import { useTradingStore } from '../store/tradingStore';
import { Signal, OHLCV } from '../types';

// Mock current time for consistent testing
const mockDate = '2026-01-23T12:00:00.000Z';
jest.useFakeTimers().setSystemTime(new Date(mockDate));

describe('AI Performance (Auto-Pilot & Reflection) Logic', () => {
  beforeEach(() => {
    // Reset store state before each test
    const store = useTradingStore.getState();
    // Manual reset since we are using persist
    useTradingStore.setState({
      aiStatus: {
        virtualBalance: 1000000,
        totalProfit: 0,
        trades: [],
      }
    });
  });

  it('should open a BUY position when a strong signal (confidence >= 80) is received', () => {
    const { processAITrades } = useTradingStore.getState();
    const mockSignal: Signal = {
      symbol: '7203',
      type: 'BUY',
      confidence: 85,
      targetPrice: 3800,
      stopLoss: 3400,
      reason: 'Strong uptrend',
      predictedChange: 5,
      predictionDate: '2026-01-23',
      atr: 50
    };

    processAITrades('7203', 3600, mockSignal);

    const { aiStatus } = useTradingStore.getState();
    const openTrade = aiStatus.trades.find(t => t.symbol === '7203' && t.status === 'OPEN');

    expect(openTrade).toBeDefined();
    expect(openTrade?.type).toBe('BUY');
    // Entry price should include slippage (3600 * 1.001 = 3603.6)
    expect(openTrade?.entryPrice).toBeCloseTo(3603.6);
    expect(aiStatus.virtualBalance).toBeLessThan(1000000);
  });

  it('should close a position and generate a reflection when target price is hit', () => {
    const { processAITrades } = useTradingStore.getState();
    const mockSignal: Signal = {
      symbol: '7203',
      type: 'BUY',
      confidence: 85,
      targetPrice: 3800,
      stopLoss: 3400,
      reason: 'Strong uptrend',
      predictedChange: 5,
      predictionDate: '2026-01-23',
      atr: 50
    };

    // 1. Open
    processAITrades('7203', 3600, mockSignal);
    
    // 2. Hit Target (Close)
    processAITrades('7203', 3850, mockSignal);

    const { aiStatus } = useTradingStore.getState();
    const closedTrade = aiStatus.trades.find(t => t.symbol === '7203' && t.status === 'CLOSED');

    expect(closedTrade).toBeDefined();
    expect(closedTrade?.exitPrice).toBeDefined();
    expect(closedTrade?.profitPercent).toBeGreaterThan(0);
    expect(closedTrade?.reflection).toContain('利確ターゲット到達');
    expect(aiStatus.totalProfit).toBeGreaterThan(0);
  });

  it('should close a position and generate a reflection when stop loss is hit', () => {
    const { processAITrades } = useTradingStore.getState();
    const mockSignal: Signal = {
      symbol: '7203',
      type: 'BUY',
      confidence: 85,
      targetPrice: 3800,
      stopLoss: 3400,
      reason: 'Strong uptrend',
      predictedChange: 5,
      predictionDate: '2026-01-23',
      atr: 50
    };

    // 1. Open
    processAITrades('7203', 3600, mockSignal);
    
    // 2. Hit Stop Loss (Close)
    processAITrades('7203', 3350, mockSignal);

    const { aiStatus } = useTradingStore.getState();
    const closedTrade = aiStatus.trades.find(t => t.symbol === '7203' && t.status === 'CLOSED');

    expect(closedTrade).toBeDefined();
    expect(closedTrade?.profitPercent).toBeLessThan(0);
    expect(closedTrade?.reflection).toContain('損切りライン接触');
  });
});
