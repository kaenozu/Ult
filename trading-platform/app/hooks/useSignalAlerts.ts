import { useEffect, useRef } from 'react';
import { Stock, Signal } from '@/app/types';

interface UseSignalAlertsProps {
  stock: Stock;
  displaySignal: Signal | null;
  preciseHitRate: number | null;
  calculatingHitRate: boolean;
}

/**
 * Hook for managing signal alerts and notifications
 * Handles browser notifications and sound alerts for trading signals
 */
export function useSignalAlerts({
  stock,
  displaySignal,
  preciseHitRate,
  calculatingHitRate
}: UseSignalAlertsProps) {
  const lastSignalRef = useRef<Signal | null>(null);
  const lastAlertTimeRef = useRef<number>(0);
  const ALERT_COOLDOWN = 60000; // 1 minute cooldown between alerts

  useEffect(() => {
    // Skip if no signal or same as last signal
    if (!displaySignal || displaySignal === lastSignalRef.current) {
      return;
    }

    // Check cooldown
    const now = Date.now();
    if (now - lastAlertTimeRef.current < ALERT_COOLDOWN) {
      return;
    }

    // Update refs
    lastSignalRef.current = displaySignal;
    lastAlertTimeRef.current = now;

    // Show notification if enabled
    if (typeof window !== 'undefined' && 'Notification' in window) {
      if (Notification.permission === 'granted') {
        const hitRateText = preciseHitRate !== null && !calculatingHitRate
          ? ` (精度: ${(preciseHitRate * 100).toFixed(1)}%)`
          : '';
        
        new Notification(`Trading Signal: ${stock.symbol}`, {
          body: `${displaySignal.action.toUpperCase()} - ${displaySignal.reason}${hitRateText}`,
          icon: '/favicon.ico',
          badge: '/favicon.ico',
          tag: `signal-${stock.symbol}`,
          requireInteraction: false,
        });
      }
    }

    // Play sound alert if enabled
    const soundEnabled = localStorage.getItem('trader-pro-sound-enabled') !== 'false';
    if (soundEnabled) {
      try {
        const audio = new Audio('/notification.mp3');
        audio.volume = 0.5;
        audio.play().catch(() => {
          // Ignore autoplay errors
        });
      } catch {
        // Ignore audio errors
      }
    }
  }, [displaySignal, stock.symbol, preciseHitRate, calculatingHitRate]);

  // Request notification permission on mount
  useEffect(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      if (Notification.permission === 'default') {
        Notification.requestPermission().catch(() => {
          // Ignore permission errors
        });
      }
    }
  }, []);
}

export default useSignalAlerts;
