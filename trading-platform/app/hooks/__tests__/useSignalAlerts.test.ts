/**
 * Tests for useSignalAlerts hook
 */

import { renderHook, act } from '@testing-library/react';
import { useSignalAlerts } from '../useSignalAlerts';
import { Stock, Signal } from '@/app/types';
import { useAlertStore } from '@/app/store/alertStore';

// Mock the alert store
jest.mock('@/app/store/alertStore', () => ({
  useAlertStore: jest.fn()
}));

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value;
    },
    clear: () => {
      store = {};
    },
    removeItem: (key: string) => {
      delete store[key];
    },
  };
})();

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock
});

describe('useSignalAlerts', () => {
  let mockStock: Stock;
  let mockSignal: Signal;
  let mockCreateStockAlert: jest.Mock;
  let mockCreateCompositeAlert: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    localStorageMock.clear();
    
    mockStock = {
      symbol: 'AAPL',
      name: 'Apple Inc.',
      price: 150,
      market: 'usa' as const
    };

    mockSignal = {
      symbol: 'AAPL',
      type: 'BUY',
      confidence: 75,
      accuracy: 85,
      targetPrice: 160,
      stopLoss: 145,
      reason: 'Strong buy signal',
      predictedChange: 5.0,
      predictionDate: '2024-01-01'
    };

    mockCreateStockAlert = jest.fn();
    mockCreateCompositeAlert = jest.fn();

    (useAlertStore as jest.Mock).mockReturnValue({
      createStockAlert: mockCreateStockAlert,
      createCompositeAlert: mockCreateCompositeAlert
    });
  });

  describe('hit rate monitoring', () => {
    it('should store hit rate in localStorage', () => {
      const { rerender } = renderHook(
        ({ preciseHitRate }) =>
          useSignalAlerts({
            stock: mockStock,
            displaySignal: mockSignal,
            preciseHitRate,
            calculatingHitRate: false
          }),
        {
          initialProps: {
            preciseHitRate: { hitRate: 80, trades: 10 }
          }
        }
      );

      expect(localStorageMock.getItem(`hitrate-${mockStock.symbol}`)).toBe('80');
    });

    it('should detect accuracy drop and create alert', () => {
      // Set initial hit rate
      localStorageMock.setItem(`hitrate-${mockStock.symbol}`, '80');

      const { rerender } = renderHook(
        ({ preciseHitRate }) =>
          useSignalAlerts({
            stock: mockStock,
            displaySignal: mockSignal,
            preciseHitRate,
            calculatingHitRate: false
          }),
        {
          initialProps: {
            preciseHitRate: { hitRate: 60, trades: 10 }
          }
        }
      );

      expect(mockCreateStockAlert).toHaveBeenCalledWith({
        symbol: mockStock.symbol,
        alertType: 'ACCURACY_DROP',
        details: {
          hitRate: 60
        }
      });
    });

    it('should not create alert for small accuracy changes', () => {
      localStorageMock.setItem(`hitrate-${mockStock.symbol}`, '80');

      const { rerender } = renderHook(
        ({ preciseHitRate }) =>
          useSignalAlerts({
            stock: mockStock,
            displaySignal: mockSignal,
            preciseHitRate,
            calculatingHitRate: false
          }),
        {
          initialProps: {
            preciseHitRate: { hitRate: 75, trades: 10 }
          }
        }
      );

      expect(mockCreateStockAlert).not.toHaveBeenCalledWith(
        expect.objectContaining({
          alertType: 'ACCURACY_DROP'
        })
      );
    });

    it('should not check hit rate when calculating', () => {
      localStorageMock.setItem(`hitrate-${mockStock.symbol}`, '80');

      const { rerender } = renderHook(
        ({ preciseHitRate }) =>
          useSignalAlerts({
            stock: mockStock,
            displaySignal: mockSignal,
            preciseHitRate,
            calculatingHitRate: true
          }),
        {
          initialProps: {
            preciseHitRate: { hitRate: 60, trades: 10 }
          }
        }
      );

      expect(mockCreateStockAlert).not.toHaveBeenCalled();
    });

    it('should handle zero trades', () => {
      const { rerender } = renderHook(
        ({ preciseHitRate }) =>
          useSignalAlerts({
            stock: mockStock,
            displaySignal: mockSignal,
            preciseHitRate,
            calculatingHitRate: false
          }),
        {
          initialProps: {
            preciseHitRate: { hitRate: 0, trades: 0 }
          }
        }
      );

      expect(mockCreateStockAlert).not.toHaveBeenCalled();
    });

    it('should handle first time hit rate tracking', () => {
      const { rerender } = renderHook(
        ({ preciseHitRate }) =>
          useSignalAlerts({
            stock: mockStock,
            displaySignal: mockSignal,
            preciseHitRate,
            calculatingHitRate: false
          }),
        {
          initialProps: {
            preciseHitRate: { hitRate: 75, trades: 5 }
          }
        }
      );

      expect(localStorageMock.getItem(`hitrate-${mockStock.symbol}`)).toBe('75');
      expect(mockCreateStockAlert).not.toHaveBeenCalledWith(
        expect.objectContaining({
          alertType: 'ACCURACY_DROP'
        })
      );
    });
  });

  describe('signal change detection', () => {
    it('should detect trend reversal from BUY to SELL', () => {
      const { rerender } = renderHook(
        ({ signal }) =>
          useSignalAlerts({
            stock: mockStock,
            displaySignal: signal,
            preciseHitRate: { hitRate: 80, trades: 10 },
            calculatingHitRate: false
          }),
        {
          initialProps: {
            signal: { ...mockSignal, type: 'BUY' as const }
          }
        }
      );

      // Change signal to SELL
      rerender({
        signal: { ...mockSignal, type: 'SELL' as const }
      });

      // Wait for effect to run
      act(() => {});

      expect(mockCreateStockAlert).toHaveBeenCalledWith({
        symbol: mockStock.symbol,
        alertType: 'TREND_REVERSAL',
        details: {}
      });
    });

    it('should detect trend reversal from SELL to BUY', () => {
      const { rerender } = renderHook(
        ({ signal }) =>
          useSignalAlerts({
            stock: mockStock,
            displaySignal: signal,
            preciseHitRate: { hitRate: 80, trades: 10 },
            calculatingHitRate: false
          }),
        {
          initialProps: {
            signal: { ...mockSignal, type: 'SELL' as const }
          }
        }
      );

      rerender({
        signal: { ...mockSignal, type: 'BUY' as const }
      });

      act(() => {});

      expect(mockCreateStockAlert).toHaveBeenCalledWith({
        symbol: mockStock.symbol,
        alertType: 'TREND_REVERSAL',
        details: {}
      });
    });

    it('should not alert for same signal type', () => {
      const { rerender } = renderHook(
        ({ signal }) =>
          useSignalAlerts({
            stock: mockStock,
            displaySignal: signal,
            preciseHitRate: { hitRate: 80, trades: 10 },
            calculatingHitRate: false
          }),
        {
          initialProps: {
            signal: { ...mockSignal, type: 'BUY' as const, confidence: 75 }
          }
        }
      );

      rerender({
        signal: { ...mockSignal, type: 'BUY' as const, confidence: 80 }
      });

      act(() => {});

      expect(mockCreateStockAlert).not.toHaveBeenCalledWith(
        expect.objectContaining({
          alertType: 'TREND_REVERSAL'
        })
      );
    });

    it('should handle null signal', () => {
      const { rerender } = renderHook(
        ({ signal }) =>
          useSignalAlerts({
            stock: mockStock,
            displaySignal: signal,
            preciseHitRate: { hitRate: 80, trades: 10 },
            calculatingHitRate: false
          }),
        {
          initialProps: {
            signal: null
          }
        }
      );

      expect(mockCreateStockAlert).not.toHaveBeenCalled();
    });
  });

  describe('forecast confidence monitoring', () => {
    it('should detect significant confidence increase', () => {
      const signalWithCone = {
        ...mockSignal,
        forecastCone: {
          confidence: 70,
          upperBound: 160,
          lowerBound: 140,
          targetDate: '2024-01-10'
        }
      };

      const { rerender } = renderHook(
        ({ signal }) =>
          useSignalAlerts({
            stock: mockStock,
            displaySignal: signal,
            preciseHitRate: { hitRate: 80, trades: 10 },
            calculatingHitRate: false
          }),
        {
          initialProps: {
            signal: signalWithCone
          }
        }
      );

      rerender({
        signal: {
          ...signalWithCone,
          forecastCone: {
            ...signalWithCone.forecastCone,
            confidence: 85
          }
        }
      });

      act(() => {});

      expect(mockCreateStockAlert).toHaveBeenCalledWith({
        symbol: mockStock.symbol,
        alertType: 'FORECAST_CHANGE',
        details: expect.objectContaining({
          confidence: 85,
          previousConfidence: 70
        })
      });
    });

    it('should detect significant confidence decrease', () => {
      const signalWithCone = {
        ...mockSignal,
        forecastCone: {
          confidence: 85,
          upperBound: 160,
          lowerBound: 140,
          targetDate: '2024-01-10'
        }
      };

      const { rerender } = renderHook(
        ({ signal }) =>
          useSignalAlerts({
            stock: mockStock,
            displaySignal: signal,
            preciseHitRate: { hitRate: 80, trades: 10 },
            calculatingHitRate: false
          }),
        {
          initialProps: {
            signal: signalWithCone
          }
        }
      );

      rerender({
        signal: {
          ...signalWithCone,
          forecastCone: {
            ...signalWithCone.forecastCone,
            confidence: 70
          }
        }
      });

      act(() => {});

      expect(mockCreateStockAlert).toHaveBeenCalledWith({
        symbol: mockStock.symbol,
        alertType: 'FORECAST_CHANGE',
        details: expect.objectContaining({
          confidence: 70,
          previousConfidence: 85
        })
      });
    });

    it('should not alert for small confidence changes', () => {
      const signalWithCone = {
        ...mockSignal,
        forecastCone: {
          confidence: 80,
          upperBound: 160,
          lowerBound: 140,
          targetDate: '2024-01-10'
        }
      };

      const { rerender } = renderHook(
        ({ signal }) =>
          useSignalAlerts({
            stock: mockStock,
            displaySignal: signal,
            preciseHitRate: { hitRate: 80, trades: 10 },
            calculatingHitRate: false
          }),
        {
          initialProps: {
            signal: signalWithCone
          }
        }
      );

      rerender({
        signal: {
          ...signalWithCone,
          forecastCone: {
            ...signalWithCone.forecastCone,
            confidence: 85
          }
        }
      });

      act(() => {});

      expect(mockCreateStockAlert).not.toHaveBeenCalledWith(
        expect.objectContaining({
          alertType: 'FORECAST_CHANGE'
        })
      );
    });

    it('should handle signal without forecast cone', () => {
      const { rerender } = renderHook(
        ({ signal }) =>
          useSignalAlerts({
            stock: mockStock,
            displaySignal: signal,
            preciseHitRate: { hitRate: 80, trades: 10 },
            calculatingHitRate: false
          }),
        {
          initialProps: {
            signal: mockSignal
          }
        }
      );

      expect(mockCreateStockAlert).not.toHaveBeenCalledWith(
        expect.objectContaining({
          alertType: 'FORECAST_CHANGE'
        })
      );
    });
  });

  describe('edge cases', () => {
    it('should handle rapid signal changes', () => {
      const { rerender } = renderHook(
        ({ signal }) =>
          useSignalAlerts({
            stock: mockStock,
            displaySignal: signal,
            preciseHitRate: { hitRate: 80, trades: 10 },
            calculatingHitRate: false
          }),
        {
          initialProps: {
            signal: { ...mockSignal, type: 'BUY' as const }
          }
        }
      );

      // Rapidly change signals
      for (let i = 0; i < 5; i++) {
        rerender({
          signal: { ...mockSignal, type: i % 2 === 0 ? ('SELL' as const) : ('BUY' as const) }
        });
        act(() => {});
      }

      // Should have created alerts
      expect(mockCreateStockAlert).toHaveBeenCalled();
    });

    it('should handle multiple stocks independently', () => {
      const stock1 = { ...mockStock, symbol: 'AAPL' };
      const stock2 = { ...mockStock, symbol: 'GOOGL' };

      localStorageMock.setItem('hitrate-AAPL', '80');
      localStorageMock.setItem('hitrate-GOOGL', '85');

      renderHook(() =>
        useSignalAlerts({
          stock: stock1,
          displaySignal: mockSignal,
          preciseHitRate: { hitRate: 60, trades: 10 },
          calculatingHitRate: false
        })
      );

      renderHook(() =>
        useSignalAlerts({
          stock: stock2,
          displaySignal: mockSignal,
          preciseHitRate: { hitRate: 65, trades: 10 },
          calculatingHitRate: false
        })
      );

      expect(mockCreateStockAlert).toHaveBeenCalledTimes(2);
    });

    it('should handle negative hit rates', () => {
      const { rerender } = renderHook(
        ({ preciseHitRate }) =>
          useSignalAlerts({
            stock: mockStock,
            displaySignal: mockSignal,
            preciseHitRate,
            calculatingHitRate: false
          }),
        {
          initialProps: {
            preciseHitRate: { hitRate: -10, trades: 10 }
          }
        }
      );

      expect(localStorageMock.getItem(`hitrate-${mockStock.symbol}`)).toBe('-10');
    });

    it('should handle very high hit rates', () => {
      const { rerender } = renderHook(
        ({ preciseHitRate }) =>
          useSignalAlerts({
            stock: mockStock,
            displaySignal: mockSignal,
            preciseHitRate,
            calculatingHitRate: false
          }),
        {
          initialProps: {
            preciseHitRate: { hitRate: 150, trades: 10 }
          }
        }
      );

      expect(localStorageMock.getItem(`hitrate-${mockStock.symbol}`)).toBe('150');
    });
  });
});
