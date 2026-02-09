
import { act } from '@testing-library/react';
import { usePortfolioStore } from '../portfolioStore';
import { AI_TRADING } from '@/app/lib/constants';
import type { Order } from '@/app/types';

// Mock RiskManagementService to prevent order modification
jest.mock('../../lib/services/RiskManagementService', () => ({
  getRiskManagementService: () => ({
    validateOrder: (order: Partial<Order>) => ({ allowed: true, adjustedQuantity: order.quantity, reasons: [] }),
    updateRiskMetrics: () => ({}),
  })
}));

// Mock localStorage for Zustand persist
const localStorageMock = (function() {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value.toString();
    },
    clear: () => {
      store = {};
    },
    removeItem: (key: string) => {
      delete store[key];
    }
  };
})();

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock
});

describe('PortfolioStore', () => {
  beforeEach(() => {
    // Reset store state
    const { portfolio } = usePortfolioStore.getState();
    usePortfolioStore.setState({
      portfolio: {
        ...portfolio,
        positions: [],
        orders: [], // Ensure orders array is also reset
        cash: 1000000, // Explicit start cash
        totalValue: 0,
        totalProfit: 0,
        dailyPnL: 0,
      }
    });
  });

  it('executeOrder should atomically update cash and add a new position', () => {
    const { executeOrder } = usePortfolioStore.getState();
    const initialCash = 1000000;
    const price = 1000;
    const quantity = 100;
    const totalCost = price * quantity;

    act(() => {
      executeOrder({
        symbol: 'TEST',
        name: 'Test Stock',
        market: 'japan',
        side: 'LONG',
        quantity: quantity,
        price: price,
        orderType: 'MARKET'
      });
    });

    const state = usePortfolioStore.getState();
    expect(state.portfolio.cash).toBe(initialCash - totalCost);
    expect(state.portfolio.positions).toHaveLength(1);
    expect(state.portfolio.positions[0]).toEqual(expect.objectContaining({
      symbol: 'TEST',
      quantity: quantity,
      avgPrice: price,
      side: 'LONG'
    }));
  });

  it('executeOrder should average down correctly when adding to existing position', () => {
    const { executeOrder } = usePortfolioStore.getState();

    // First order: 100 @ 1000
    act(() => {
      executeOrder({
        symbol: 'TEST',
        name: 'Test Stock',
        market: 'japan',
        side: 'LONG',
        quantity: 100,
        price: 1000,
        orderType: 'MARKET'
      });
    });

    // Second order: 100 @ 2000
    act(() => {
      executeOrder({
        symbol: 'TEST',
        name: 'Test Stock',
        market: 'japan',
        side: 'LONG',
        quantity: 100,
        price: 2000,
        orderType: 'MARKET'
      });
    });

    const state = usePortfolioStore.getState();
    const expectedAvgPrice = (100 * 1000 + 100 * 2000) / 200; // 1500
    const expectedCash = 1000000 - (100 * 1000) - (100 * 2000);

    expect(state.portfolio.cash).toBe(expectedCash);
    expect(state.portfolio.positions).toHaveLength(1);
    expect(state.portfolio.positions[0].quantity).toBe(200);
    expect(state.portfolio.positions[0].avgPrice).toBe(expectedAvgPrice);
  });

  it('executeOrder should not execute if cash is insufficient', () => {
    const { executeOrder } = usePortfolioStore.getState();

    // Set low cash
    usePortfolioStore.setState({
        portfolio: {
            ...usePortfolioStore.getState().portfolio,
            cash: 500
        }
    });

    act(() => {
      executeOrder({
        symbol: 'TEST',
        name: 'Test Stock',
        market: 'japan',
        side: 'LONG',
        quantity: 100,
        price: 1000, // Cost 100,000 > 500
        orderType: 'MARKET'
      });
    });

    const state = usePortfolioStore.getState();
    expect(state.portfolio.cash).toBe(500); // Unchanged
    expect(state.portfolio.positions).toHaveLength(0); // No position added
  });
});
