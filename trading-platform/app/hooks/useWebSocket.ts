import { useEffect, useRef, useState, useCallback } from 'react';
import { createWebSocketClient, DEFAULT_WS_CONFIG, WebSocketClient } from '@/app/lib/websocket';

export type WebSocketStatus = 'CONNECTING' | 'OPEN' | 'CLOSED' | 'ERROR';

interface WebSocketMessage {
  type: string;
  data: unknown;
  timestamp?: number;
}

const WS_ENABLED_KEY = 'trader-pro-websocket-enabled';

function isWebSocketEnabled(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    const enabled = localStorage.getItem(WS_ENABLED_KEY);
    return enabled !== 'false';
  } catch {
    return true;
  }
}

function setWebSocketEnabled(enabled: boolean) {
  if (typeof window !== 'undefined') {
    localStorage.setItem(WS_ENABLED_KEY, String(enabled));
  }
}

export function useWebSocket(url?: string) {
  const [status, setStatus] = useState<WebSocketStatus>('CLOSED');
  const [lastMessage, setLastMessage] = useState<WebSocketMessage | null>(null);
  const clientRef = useRef<WebSocketClient | null>(null);
  const isInitializedRef = useRef(false);

  // Build WebSocket URL
  const wsUrl = url || DEFAULT_WS_CONFIG.url;

  // Initialize WebSocket client
  useEffect(() => {
    if (isInitializedRef.current) return;
    isInitializedRef.current = true;

    if (!isWebSocketEnabled()) {
      console.log('WebSocket: Connection disabled by user');
      setStatus('CLOSED');
      return;
    }

    // Create WebSocket client with fallback support
    const client = createWebSocketClient(
      {
        ...DEFAULT_WS_CONFIG,
        url: wsUrl,
      },
      {
        onOpen: () => {
          console.log('WebSocket connected to:', wsUrl);
        },
        onMessage: (message) => {
          setLastMessage(message);
        },
        onError: () => {
          console.error('WebSocket error occurred');
        },
        onClose: (event) => {
          console.log('WebSocket closed:', event.code, event.reason);
        },
        onStatusChange: (newStatus) => {
          setStatus(newStatus);
        },
      }
    );

    clientRef.current = client;

    // Auto-connect on mount
    client.connect();

    // Cleanup on unmount
    return () => {
      client.destroy();
      clientRef.current = null;
      isInitializedRef.current = false;
    };
  }, [wsUrl]);

  const connect = useCallback(() => {
    if (clientRef.current) {
      setWebSocketEnabled(true);
      clientRef.current.connect();
    }
  }, []);

  const disconnect = useCallback(() => {
    if (clientRef.current) {
      clientRef.current.disconnect();
    }
  }, []);

  const reconnect = useCallback(() => {
    if (clientRef.current) {
      setWebSocketEnabled(true);
      clientRef.current.reconnect();
    }
  }, []);

  const sendMessage = useCallback((msg: unknown) => {
    if (clientRef.current) {
      const message: WebSocketMessage = typeof msg === 'object' && msg !== null
        ? { type: (msg as any).type || 'message', data: msg }
        : { type: 'message', data: msg };

      return clientRef.current.send(message);
    }
    return false;
  }, []);

  return {
    status,
    lastMessage,
    sendMessage,
    connect,
    disconnect,
    reconnect,
    isConnected: status === 'OPEN',
  };
}

// Export types for external use
export type { WebSocketMessage, WebSocketClient } from '@/app/lib/websocket';
