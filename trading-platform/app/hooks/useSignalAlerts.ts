import { useState, useEffect } from 'react';
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

  // 的中率変化を監視
  useEffect(() => {
    if (!calculatingHitRate && preciseHitRate.trades > 0) {
      const currentHitRate = preciseHitRate.hitRate;

      // クライアントサイドでのみ実行
      if (typeof window !== 'undefined') {
        const previousHitRate = parseInt(localStorage.getItem(`hitrate-${stock.symbol}`) || '0');

        if (previousHitRate > 0) {
          const dropPercent = (previousHitRate - currentHitRate) / previousHitRate;

          if (dropPercent >= 0.2) {
            createStockAlert({
              symbol: stock.symbol,
              alertType: 'ACCURACY_DROP',
              details: {
                hitRate: currentHitRate,
              },
            });
          }
        }

        localStorage.setItem(`hitrate-${stock.symbol}`, currentHitRate.toString());
      }
    }
  }, [calculatingHitRate, preciseHitRate, stock.symbol, createStockAlert]);

  // シグナル変化を監視してアラートを生成
  useEffect(() => {
    if (!displaySignal) return;

    if (!previousSignal) {
        return;
    }

    if (displaySignal.type !== previousSignal.type) {
      createStockAlert({
        symbol: stock.symbol,
        alertType: 'TREND_REVERSAL',
        details: {},
      });
    }
  }, [displaySignal, previousSignal, stock.symbol, createStockAlert]);

  // Update previous signal when displaySignal changes
  useEffect(() => {
    if (displaySignal) {
      setPreviousSignal(displaySignal);
    }
  }, [displaySignal]);

  // 予測コーン信頼度変化を監視
  useEffect(() => {
    if (!displaySignal?.forecastCone) return;

    const currentConfidence = displaySignal.forecastCone.confidence;

    if (previousForecastConfidence !== null) {
      const confidenceChange = Math.abs(currentConfidence - previousForecastConfidence);
      const changePercent = confidenceChange / previousForecastConfidence;

      if (changePercent >= 0.15) {
        createStockAlert({
          symbol: stock.symbol,
          alertType: 'FORECAST_CHANGE',
          details: {
            confidence: currentConfidence,
            previousConfidence: previousForecastConfidence,
          },
        });
      }
    }
  }, [displaySignal?.forecastCone?.confidence, previousForecastConfidence, stock.symbol, createStockAlert]);

  // Update previous forecast confidence when displaySignal changes
  useEffect(() => {
    if (displaySignal?.forecastCone) {
      setPreviousForecastConfidence(displaySignal.forecastCone.confidence);
    }
  }, [displaySignal?.forecastCone]);

  // ブレイクアウトを監視
  useEffect(() => {
    if (!displaySignal?.supplyDemand?.breakoutDetected) return;

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
  }, [displaySignal?.supplyDemand?.breakoutDetected, displaySignal?.supplyDemand, stock.symbol, createStockAlert]);

  // 複合アラート（市場相関+シグナル）
  useEffect(() => {
    if (!displaySignal?.marketContext || !displaySignal) return;

    createCompositeAlert({
      symbol: stock.symbol,
      marketTrend: displaySignal.marketContext.indexTrend,
      stockSignal: displaySignal.type,
      correlation: displaySignal.marketContext.correlation || 0,
    });
  }, [displaySignal?.marketContext, displaySignal?.type, stock.symbol, createCompositeAlert]);
}
