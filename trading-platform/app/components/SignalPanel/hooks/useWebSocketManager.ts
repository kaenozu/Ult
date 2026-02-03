import { useState, useEffect, useCallback } from 'react';
import { Stock, Signal } from '@/app/types';
import { useWebSocket } from '@/app/hooks/useWebSocket';
import { getWebSocketUrl } from '@/app/lib/utils';

export function useWebSocketManager(stock: Stock) {
  const { status: wsStatus, lastMessage, connect, disconnect, reconnect } = useWebSocket(getWebSocketUrl('/ws/signals'));
  const [liveSignal, setLiveSignal] = useState<Signal | null>(null);

  // Handle signal updates with proper dependency management
  useEffect(() => {
    if (!lastMessage || lastMessage.type !== 'SIGNAL_UPDATE') return;
    
    const data = lastMessage.data as { symbol: string } | undefined;
    if (data?.symbol === stock.symbol) {
      // Use setTimeout to defer state update and avoid synchronous setState in effect
      setTimeout(() => {
        setLiveSignal(lastMessage.data as Signal);
      }, 0);
    }
  }, [lastMessage, stock.symbol]);

  // Reset live signal when stock changes
  useEffect(() => {
    setTimeout(() => {
      setLiveSignal(null);
    }, 0);
  }, [stock.symbol]);

  return {
    wsStatus,
    liveSignal,
    reconnect
  };
}