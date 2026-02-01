/**
 * Hook for monitoring supply/demand levels and triggering alerts
 */

import { useEffect, useRef } from 'react';
import { OHLCV, Signal } from '@/app/types';
import { useAlertStore } from '@/app/store/alertStore';

interface UseSupplyDemandAlertsProps {
  data: OHLCV[];
  signal: Signal | null;
  symbol: string;
}

const APPROACH_THRESHOLD = 0.01; // 1% threshold for "approaching" alert

export const useSupplyDemandAlerts = ({ data, signal, symbol }: UseSupplyDemandAlertsProps) => {
  const createStockAlert = useAlertStore((state) => state.createStockAlert);
  const previousBreakoutRef = useRef<string | null>(null);
  const previousApproachingRef = useRef<Set<number>>(new Set());

  useEffect(() => {
    if (!signal?.supplyDemand || data.length === 0) return;

    const currentPrice = data[data.length - 1].close;
    const { supplyDemand } = signal;

    // Check for breakout
    if (supplyDemand.breakoutDetected && supplyDemand.brokenLevel) {
      const breakoutKey = `${supplyDemand.brokenLevel.price}-${supplyDemand.brokenLevel.type}`;
      
      // Only alert if this is a new breakout (not previously alerted)
      if (previousBreakoutRef.current !== breakoutKey) {
        createStockAlert({
          symbol,
          alertType: 'BREAKOUT',
          details: {
            price: supplyDemand.brokenLevel.price,
            level: supplyDemand.brokenLevel.level,
            levelType: supplyDemand.brokenLevel.type,
            confidence: supplyDemand.breakoutConfidence === 'high' ? 80 : 
                       supplyDemand.breakoutConfidence === 'medium' ? 60 : 40
          }
        });
        previousBreakoutRef.current = breakoutKey;
      }
    }

    // Check for approaching levels
    const approachingNow = new Set<number>();
    
    // Check resistance levels
    supplyDemand.resistanceLevels.forEach((level) => {
      if (level.level === 'strong' || level.level === 'medium') {
        const distancePercent = Math.abs((level.price - currentPrice) / currentPrice);
        
        if (distancePercent <= APPROACH_THRESHOLD && currentPrice < level.price) {
          approachingNow.add(level.price);
          
          // Only alert if this level wasn't previously being approached
          // Note: Using TREND_REVERSAL type temporarily for approaching levels
          // TODO: Consider adding LEVEL_APPROACHING type in future enhancement
          if (!previousApproachingRef.current.has(level.price)) {
            createStockAlert({
              symbol,
              alertType: 'TREND_REVERSAL',
              details: {
                price: level.price,
                level: level.level,
                levelType: 'resistance',
                confidence: level.strength * 100
              }
            });
          }
        }
      }
    });

    // Check support levels
    supplyDemand.supportLevels.forEach((level) => {
      if (level.level === 'strong' || level.level === 'medium') {
        const distancePercent = Math.abs((level.price - currentPrice) / currentPrice);
        
        if (distancePercent <= APPROACH_THRESHOLD && currentPrice > level.price) {
          approachingNow.add(level.price);
          
          // Only alert if this level wasn't previously being approached
          // Note: Using TREND_REVERSAL type temporarily for approaching levels
          // TODO: Consider adding LEVEL_APPROACHING type in future enhancement
          if (!previousApproachingRef.current.has(level.price)) {
            createStockAlert({
              symbol,
              alertType: 'TREND_REVERSAL',
              details: {
                price: level.price,
                level: level.level,
                levelType: 'support',
                confidence: level.strength * 100
              }
            });
          }
        }
      }
    });

    // Update the tracking set
    previousApproachingRef.current = approachingNow;

  }, [data, signal, symbol, createStockAlert]);
};
