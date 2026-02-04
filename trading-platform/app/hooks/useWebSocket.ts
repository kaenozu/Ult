import { useEffect, useRef, useState, useCallback } from 'react';
import { createWebSocketClient, DEFAULT_WS_CONFIG, WebSocketClient } from '@/app/lib/websocket';
import { createMessageBatcher, MessageBatch } from '@/app/lib/websocket/message-batcher';

export type WebSocketStatus = 'CONNECTING' | 'OPEN' | 'CLOSED' | 'ERROR' | 'DISCONNECTED';

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
  const batcherRef = useRef(createMessageBatcher({
    batchWindowMs: 150,
    maxBatchSize: 50,
    enableDeduplication: true,
    enableStats: true,
  }));
  const isInitializedRef = useRef(false);

  // Build WebSocket URL with auth token if available
  const baseUrl = url || DEFAULT_WS_CONFIG.url;
  const authToken = typeof window !== 'undefined' && process.env.NEXT_PUBLIC_WS_AUTH_TOKEN
    ? `${baseUrl}${baseUrl.includes('?') ? '&' : '?'}token=${process.env.NEXT_PUBLIC_WS_AUTH_TOKEN}`
    : baseUrl;

  // Memoized batch handler to update lastMessage with batched messages
  const handleBatch = useCallback((batch: MessageBatch) => {
    // Use the most recent message from the batch
    if (batch.messages.length > 0) {
      const latestMessage = batch.messages[batch.messages.length - 1];
      setLastMessage(latestMessage as WebSocketMessage);
    }
  }, []);

  // Initialize message batcher callback
  useEffect(() => {
    batcherRef.current.onBatch(handleBatch);
  }, [handleBatch]);

  // Initialize WebSocket client
  useEffect(() => {
    if (isInitializedRef.current) return;
    isInitializedRef.current = true;

    if (!isWebSocketEnabled()) {
      console.log('WebSocket: Connection disabled by user');
      // Use setTimeout to avoid synchronous setState in effect
      const timeoutId = setTimeout(() => {
        setStatus('CLOSED');
      }, 0);
      return () => clearTimeout(timeoutId);
    }

    // Create WebSocket client with fallback support
    const client = createWebSocketClient(
      {
        ...DEFAULT_WS_CONFIG,
        url: authToken,
      },
      {
        onConnect: () => {
          console.log('WebSocket connected to:', authToken);
        },
        onMessage: (message) => {
          // Add message to batcher instead of direct setState
          batcherRef.current.addMessage(message);
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
      // Clear the batch callback before flushing to prevent state updates on unmounted component
      const currentBatcher = batcherRef.current;
      currentBatcher.onBatch(() => {});
      currentBatcher.flush(); // Flush any pending messages
      currentBatcher.destroy();
      client.destroy();
      clientRef.current = null;
      isInitializedRef.current = false;
    };
  }, [authToken]);

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



