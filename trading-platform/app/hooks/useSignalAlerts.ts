import { useState, useEffect, useCallback, useRef } from 'react';
import { Stock, Signal } from '@/app/types';
import { useAlertStore } from '@/app/store/alertStore';

interface UseSignalAlertsProps {
  stock: Stock;
  displaySignal: Signal | null;
  preciseHitRate: { hitRate: number, trades: number };
  calculatingHitRate: boolean;
}

export function useSignalAlerts({ stock, displaySignal, preciseHitRate, calculatingHitRate }: UseSignalAlertsProps) {
  const [previousSignal, setPreviousSignal] = useState<Signal | null>(null);
  const [previousForecastConfidence, setPreviousForecastConfidence] = useState<number | null>(null);
  const { createStockAlert, createCompositeAlert } = useAlertStore();
  
  // Use refs to track previous values without causing re-renders
  const lastHitRateRef = useRef<number | null>(null);
  const breakoutProcessedRef = useRef<string | null>(null);

  // Memoized alert creation functions
  const createAccuracyDropAlert = useCallback((currentHitRate: number, previousHitRate: number) => {
    createStockAlert({
      symbol: stock.symbol,
      alertType: 'ACCURACY_DROP',
      details: {
        hitRate: currentHitRate,
      },
    });
  }, [stock.symbol, createStockAlert]);

  const createTrendReversalAlert = useCallback(() => {
    createStockAlert({
      symbol: stock.symbol,
      alertType: 'TREND_REVERSAL',
      details: {},
    });
  }, [stock.symbol, createStockAlert]);

  const createForecastChangeAlert = useCallback((currentConfidence: number, previousConfidence: number) => {
    createStockAlert({
      symbol: stock.symbol,
      alertType: 'FORECAST_CHANGE',
      details: {
        confidence: currentConfidence,
        previousConfidence,
      },
    });
  }, [stock.symbol, createStockAlert]);

  const createBreakoutAlert = useCallback(() => {
    if (!displaySignal?.supplyDemand) return;
    
    createStockAlert({
      symbol: stock.symbol,
      alertType: 'BREAKOUT',
      details: {
        price: displaySignal.supplyDemand.currentPrice,
        level: displaySignal.supplyDemand.brokenLevel?.level,
        levelType: displaySignal.supplyDemand.brokenLevel?.type,
        confidence: displaySignal.supplyDemand.breakoutConfidence === 'high' ? 85 :
          displaySignal.supplyDemand.breakoutConfidence === 'medium' ? 65 : 45,
      },
    });
  }, [stock.symbol, displaySignal?.supplyDemand, createStockAlert]);

  const createCompositeAlertCallback = useCallback(() => {
    if (!displaySignal?.marketContext) return;
    
    createCompositeAlert({
      symbol: stock.symbol,
      marketTrend: displaySignal.marketContext.indexTrend,
      stockSignal: displaySignal.type,
      correlation: displaySignal.marketContext.correlation || 0,
    });
  }, [stock.symbol, displaySignal?.marketContext, displaySignal?.type, createCompositeAlert]);

  // 的中率変化を監視 - Single responsibility
  useEffect(() => {
    if (calculatingHitRate || preciseHitRate.trades === 0) return;
    
    const currentHitRate = preciseHitRate.hitRate;
    
    // クライアントサイドでのみ実行
    if (typeof window === 'undefined') return;
    
    const storageKey = `hitrate-${stock.symbol}`;
    const previousHitRate = parseInt(localStorage.getItem(storageKey) || '0');
    
    if (previousHitRate > 0 && lastHitRateRef.current !== currentHitRate) {
      const dropPercent = (previousHitRate - currentHitRate) / previousHitRate;
      
      if (dropPercent >= 0.2) {
        createAccuracyDropAlert(currentHitRate, previousHitRate);
      }
      
      localStorage.setItem(storageKey, currentHitRate.toString());
      lastHitRateRef.current = currentHitRate;
    }
  }, [calculatingHitRate, preciseHitRate, stock.symbol, createAccuracyDropAlert]);

  // シグナル変化を監視 - Separate concerns
  useEffect(() => {
    if (!displaySignal || !previousSignal) return;

    // Check for signal type change only
    if (displaySignal.type !== previousSignal.type) {
      createTrendReversalAlert();
    }
  }, [displaySignal, previousSignal, createTrendReversalAlert]);

  // Update previous signal separately
  useEffect(() => {
    setPreviousSignal(displaySignal);
  }, [displaySignal]);

  // 予測コーン信頼度変化を監視
  useEffect(() => {
    if (!displaySignal?.forecastCone || previousForecastConfidence === null) return;

    const currentConfidence = displaySignal.forecastCone.confidence;
    const confidenceChange = Math.abs(currentConfidence - previousForecastConfidence);
    const changePercent = confidenceChange / previousForecastConfidence;

    if (changePercent >= 0.15) {
      createForecastChangeAlert(currentConfidence, previousForecastConfidence);
    }
  }, [displaySignal?.forecastCone, displaySignal?.forecastCone?.confidence, previousForecastConfidence, createForecastChangeAlert]);

  // Update forecast confidence separately
  useEffect(() => {
    if (displaySignal?.forecastCone) {
      setPreviousForecastConfidence(displaySignal.forecastCone.confidence);
    }
  }, [displaySignal?.forecastCone]);

  // ブレイクアウトを監視 - Prevent duplicate alerts
  useEffect(() => {
    if (!displaySignal?.supplyDemand?.breakoutDetected) return;
    
    const breakoutKey = `${stock.symbol}-${displaySignal.supplyDemand.currentPrice}-${displaySignal.supplyDemand.brokenLevel?.level}`;
    
    if (breakoutProcessedRef.current !== breakoutKey) {
      createBreakoutAlert();
      breakoutProcessedRef.current = breakoutKey;
    }
  }, [displaySignal?.supplyDemand?.breakoutDetected, stock.symbol, displaySignal.supplyDemand?.currentPrice, displaySignal.supplyDemand?.brokenLevel?.level, createBreakoutAlert]);

  // 複合アラート（市場相関+シグナル）
  useEffect(() => {
    if (!displaySignal?.marketContext) return;
    createCompositeAlertCallback();
  }, [displaySignal?.marketContext, createCompositeAlertCallback]);
}
