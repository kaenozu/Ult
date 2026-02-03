import { useState, useCallback, useEffect } from 'react';
import { Stock, Signal } from '@/app/types';
import { useWebSocket } from '@/app/hooks/useWebSocket';
import { getWebSocketUrl } from '@/app/lib/utils';

export function useWebSocketManager(stock: Stock) {
  const { status: wsStatus, lastMessage, connect, disconnect, reconnect } = useWebSocket(getWebSocketUrl('/ws/signals'));
  const [liveSignal, setLiveSignal] = useState<Signal | null>(null);

  const handleWebSocketMessage = useCallback(() => {
    if (lastMessage && lastMessage.type === 'SIGNAL_UPDATE') {
      const data = lastMessage.data as { symbol: string } | undefined;
      if (data && data.symbol === stock.symbol) {
        setLiveSignal(lastMessage.data as Signal);
      }
    }
  }, [lastMessage, stock.symbol]);

  useEffect(() => {
    handleWebSocketMessage();
  }, [handleWebSocketMessage]);

  useEffect(() => {
    setLiveSignal(null);
  }, [stock.symbol]);

  return {
    wsStatus,
    liveSignal,
    reconnect
  };
}