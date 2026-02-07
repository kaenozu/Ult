/**
 * useUnifiedTrading.ts
 *
 * React Hook for the Unified Trading Platform.
 * Provides easy access to all trading functionality from React components.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  UnifiedTradingPlatform,
  PlatformConfig,
  PlatformStatus,
  TradingSignal,
} from '@/app/lib/tradingCore/UnifiedTradingPlatform';
import { PaperPortfolio } from '@/app/lib/paperTrading/PaperTradingEnvironment';
import { AlertTrigger } from '@/app/lib/alerts/AlertSystem';
import { RiskMetrics } from '@/app/lib/risk/AdvancedRiskManager';

interface UseUnifiedTradingReturn {
  // Status
  isRunning: boolean;
  status: PlatformStatus | null;
  
  // Data
  portfolio: PaperPortfolio | null;
  signals: TradingSignal[];
  alerts: AlertTrigger[];
  riskMetrics: RiskMetrics | null;
  
  // Actions
  start: () => Promise<void>;
  stop: () => Promise<void>;
  reset: () => void;
  placeOrder: (
    symbol: string,
    side: 'BUY' | 'SELL',
    quantity: number,
    options?: {
      price?: number;
      stopLoss?: number;
      takeProfit?: number;
      type?: 'MARKET' | 'LIMIT';
    }
  ) => Promise<void>;
  closePosition: (symbol: string) => Promise<void>;
  createAlert: (
    name: string,
    symbol: string,
    type: 'price' | 'volume' | 'rsi' | 'macd' | 'sma' | 'ema' | 'bollinger' | 'atr' | 'price_change' | 'volume_spike' | 'breakout' | 'pattern' | 'custom',
    operator: 'above' | 'below' | 'crosses_above' | 'crosses_below' | 'equals' | 'between',
    value: number | [number, number]
  ) => void;
  updateConfig: (updates: Partial<PlatformConfig>) => void;
  
  // Loading states
  isLoading: boolean;
  error: Error | null;
}

export function useUnifiedTrading(
  initialConfig?: Partial<PlatformConfig>
): UseUnifiedTradingReturn {
  // Platform instance
  const platformRef = useRef<UnifiedTradingPlatform | null>(null);
  
  // State
  const [isRunning, setIsRunning] = useState(false);
  const [status, setStatus] = useState<PlatformStatus | null>(null);
  const [portfolio, setPortfolio] = useState<PaperPortfolio | null>(null);
  const [signals, setSignals] = useState<TradingSignal[]>([]);
  const [alerts, setAlerts] = useState<AlertTrigger[]>([]);
  const [riskMetrics, setRiskMetrics] = useState<RiskMetrics | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  // Initialize platform
  useEffect(() => {
    const { getGlobalTradingPlatform } = require('@/app/lib/tradingCore/UnifiedTradingPlatform');
    platformRef.current = getGlobalTradingPlatform(initialConfig);

    const platform = platformRef.current;
    if (!platform) return;

    // Set up event listeners
    const handleStarted = () => {
      setIsRunning(true);
      setStatus(platform.getStatus());
    };

    const handleStopped = () => {
      setIsRunning(false);
      setStatus(platform.getStatus());
    };

    const handlePortfolioUpdated = () => {
      setPortfolio(platform.getPortfolio());
      setRiskMetrics(platform.getRiskMetrics());
    };

    const handleSignalGenerated = (signal: TradingSignal) => {
      setSignals((prev) => {
        const filtered = prev.filter((s) => s.symbol !== signal.symbol);
        return [...filtered, signal];
      });
    };

    const handleAlert = (alert: AlertTrigger) => {
      setAlerts((prev) => [...prev.slice(-99), alert]);
    };

    const handleError = (err: Error) => {
      setError(err);
      setIsLoading(false);
    };

    platform.on('started', handleStarted);
    platform.on('stopped', handleStopped);
    platform.on('portfolio_updated', handlePortfolioUpdated);
    platform.on('signal_generated', handleSignalGenerated);
    platform.on('alert', handleAlert);
    platform.on('error', handleError);

    // Initial state
    setStatus(platform.getStatus());
    setPortfolio(platform.getPortfolio());
    setSignals(platform.getSignals());
    setRiskMetrics(platform.getRiskMetrics());

    return () => {
      platform.off('started', handleStarted);
      platform.off('stopped', handleStopped);
      platform.off('portfolio_updated', handlePortfolioUpdated);
      platform.off('signal_generated', handleSignalGenerated);
      platform.off('alert', handleAlert);
      platform.off('error', handleError);
    };
  }, [initialConfig]);

  // Actions
  const start = useCallback(async () => {
    if (!platformRef.current) return;
    setIsLoading(true);
    setError(null);
    try {
      await platformRef.current.start();
    } catch (err) {
      setError(err as Error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const stop = useCallback(async () => {
    if (!platformRef.current) return;
    setIsLoading(true);
    try {
      await platformRef.current.stop();
    } catch (err) {
      setError(err as Error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const reset = useCallback(() => {
    if (!platformRef.current) return;
    platformRef.current.reset();
    setSignals([]);
    setAlerts([]);
    setPortfolio(platformRef.current.getPortfolio());
  }, []);

  const placeOrder = useCallback(
    async (
      symbol: string,
      side: 'BUY' | 'SELL',
      quantity: number,
      options?: {
        price?: number;
        stopLoss?: number;
        takeProfit?: number;
        type?: 'MARKET' | 'LIMIT';
      }
    ) => {
      if (!platformRef.current) return;
      setIsLoading(true);
      try {
        await platformRef.current.placeOrder(symbol, side, quantity, options);
      } catch (err) {
        setError(err as Error);
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  const closePosition = useCallback(async (symbol: string) => {
    if (!platformRef.current) return;
    setIsLoading(true);
    try {
      await platformRef.current.closePosition(symbol);
    } catch (err) {
      setError(err as Error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const createAlert = useCallback(
    (
      name: string,
      symbol: string,
      type: 'price' | 'volume' | 'rsi' | 'macd' | 'sma' | 'ema' | 'bollinger' | 'atr' | 'price_change' | 'volume_spike' | 'breakout' | 'pattern' | 'custom',
      operator: 'above' | 'below' | 'crosses_above' | 'crosses_below' | 'equals' | 'between',
      value: number | [number, number]
    ) => {
      if (!platformRef.current) return;
      platformRef.current.createAlert(name, symbol, type, operator, value);
    },
    []
  );

  const updateConfig = useCallback((updates: Partial<PlatformConfig>) => {
    if (!platformRef.current) return;
    platformRef.current.updateConfig(updates);
  }, []);

  return {
    isRunning,
    status,
    portfolio,
    signals,
    alerts,
    riskMetrics,
    start,
    stop,
    reset,
    placeOrder,
    closePosition,
    createAlert,
    updateConfig,
    isLoading,
    error,
  };
}

export default useUnifiedTrading;
