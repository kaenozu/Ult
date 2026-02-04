/**
 * useResilientWebSocket Hook
 *
 * React hook for using the resilient WebSocket client with automatic
 * connection management, reconnection handling, and state synchronization.
 */

import { useEffect, useRef, useState, useCallback } from 'react';
import {
  createResilientWebSocketClient,
  DEFAULT_RESILIENT_WS_CONFIG,
  ResilientWebSocketClient,
  WebSocketStatus,
  WebSocketMessage,
  WebSocketError,
  StateTransition,
  mapToLegacyStatus,
  ConnectionMetrics,
} from '@/app/lib/websocket-resilient';

// Re-export types for backward compatibility
export type { 
  WebSocketStatus, 
  WebSocketMessage, 
  WebSocketError, 
  StateTransition,
  ConnectionMetrics,
};

/**
 * Hook options
 */
interface UseResilientWebSocketOptions {
  url?: string;
  enabled?: boolean;
  onMessage?: (message: WebSocketMessage) => void;
  onError?: (error: WebSocketError) => void;
  onStatusChange?: (status: WebSocketStatus) => void;
  fallbackDataFetcher?: () => Promise<unknown>;
  reconnectOnMount?: boolean;
}

/**
 * Hook return value
 */
interface UseResilientWebSocketReturn {
  status: WebSocketStatus;
  isConnected: boolean;
  lastMessage: WebSocketMessage | null;
  error: WebSocketError | null;
  metrics: ConnectionMetrics | null;
  sendMessage: (message: Omit<WebSocketMessage, 'id' | 'timestamp'>) => boolean;
  connect: () => void;
  disconnect: () => void;
  reconnect: () => void;
  connectionDuration: number;
  stateHistory: StateTransition[];
}

const WS_ENABLED_KEY = 'trader-pro-websocket-enabled';

/**
 * Check if WebSocket is enabled in localStorage
 */
function isWebSocketEnabled(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    const enabled = localStorage.getItem(WS_ENABLED_KEY);
    return enabled !== 'false';
  } catch {
    return true;
  }
}

/**
 * Set WebSocket enabled state in localStorage
 */
function setWebSocketEnabled(enabled: boolean): void {
  if (typeof window !== 'undefined') {
    localStorage.setItem(WS_ENABLED_KEY, String(enabled));
  }
}

/**
 * React hook for resilient WebSocket connections
 */
export function useResilientWebSocket(
  options: UseResilientWebSocketOptions = {}
): UseResilientWebSocketReturn {
  const {
    url,
    enabled = true,
    onMessage,
    onError,
    onStatusChange,
    fallbackDataFetcher,
    reconnectOnMount = true,
  } = options;

  // State
  const [status, setStatus] = useState<WebSocketStatus>('CLOSED');
  const [lastMessage, setLastMessage] = useState<WebSocketMessage | null>(null);
  const [error, setError] = useState<WebSocketError | null>(null);
  const [metrics, setMetrics] = useState<ConnectionMetrics | null>(null);
  const [connectionDuration, setConnectionDuration] = useState(0);
  const [stateHistory, setStateHistory] = useState<StateTransition[]>([]);

  // Refs
  const clientRef = useRef<ResilientWebSocketClient | null>(null);
  const isInitializedRef = useRef(false);
  const durationIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Build WebSocket URL
  const wsUrl = url || DEFAULT_RESILIENT_WS_CONFIG.url;

  /**
   * Initialize WebSocket client
   */
  useEffect(() => {
    if (isInitializedRef.current) return;
    isInitializedRef.current = true;

    if (!enabled || !isWebSocketEnabled()) {
      console.log('[useResilientWebSocket] Connection disabled');
      return;
    }

    // Create resilient WebSocket client
    const client = createResilientWebSocketClient(
      {
        ...DEFAULT_RESILIENT_WS_CONFIG,
        url: wsUrl,
      },
      {
        onOpen: () => {
          console.log('[useResilientWebSocket] Connected');
        },
        onMessage: (message) => {
          setLastMessage(message);
          onMessage?.(message);
        },
        onError: (err) => {
          console.error('[useResilientWebSocket] Error:', err);
          setError(err);
          onError?.(err);
        },
        onClose: () => {
          console.log('[useResilientWebSocket] Disconnected');
        },
        onStatusChange: (newStatus) => {
          setStatus(newStatus);
          onStatusChange?.(newStatus);
        },
        onStateTransition: (transition) => {
          setStateHistory(prev => [...prev, transition]);
        },
        onMetricsUpdate: (newMetrics) => {
          setMetrics(newMetrics);
        },
        fallbackDataFetcher,
      }
    );

    clientRef.current = client;

    // Start connection if enabled
    if (reconnectOnMount) {
      client.connect();
    }

    // Cleanup
    return () => {
      client.destroy();
      clientRef.current = null;
      if (durationIntervalRef.current) {
        clearInterval(durationIntervalRef.current);
      }
    };
  }, [wsUrl, enabled, reconnectOnMount, onMessage, onError, onStatusChange, fallbackDataFetcher]);

  /**
   * Update connection duration
   */
  useEffect(() => {
    if (status === 'OPEN') {
      durationIntervalRef.current = setInterval(() => {
        if (clientRef.current) {
          const duration = clientRef.current.getConnectionDuration();
          // Only update if duration actually changed
          setConnectionDuration(prev => prev !== duration ? duration : prev);
        }
      }, 1000);
    } else {
      if (durationIntervalRef.current) {
        clearInterval(durationIntervalRef.current);
        durationIntervalRef.current = null;
      }
      // Reset duration when connection is not open (but not when closed)
      if (status !== 'CLOSED') {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setConnectionDuration(0);
      }
    }

    return () => {
      if (durationIntervalRef.current) {
        clearInterval(durationIntervalRef.current);
        durationIntervalRef.current = null;
      }
    };
  }, [status]);

  /**
   * Send message through WebSocket
   */
  const sendMessage = useCallback(
    (message: Omit<WebSocketMessage, 'id' | 'timestamp'>): boolean => {
      if (!clientRef.current) {
        console.warn('[useResilientWebSocket] Client not initialized');
        return false;
      }

      return clientRef.current.send(message);
    },
    []
  );

  /**
   * Connect to WebSocket
   */
  const connect = useCallback((): void => {
    if (!clientRef.current) {
      console.warn('[useResilientWebSocket] Client not initialized');
      return;
    }

    setWebSocketEnabled(true);
    clientRef.current.connect();
  }, []);

  /**
   * Disconnect from WebSocket
   */
  const disconnect = useCallback((): void => {
    if (!clientRef.current) {
      console.warn('[useResilientWebSocket] Client not initialized');
      return;
    }

    setWebSocketEnabled(false);
    clientRef.current.disconnect();
  }, []);

  /**
   * Reconnect to WebSocket
   */
  const reconnect = useCallback((): void => {
    if (!clientRef.current) {
      console.warn('[useResilientWebSocket] Client not initialized');
      return;
    }

    setWebSocketEnabled(true);
    clientRef.current.reconnect();
  }, []);

  return {
    status,
    isConnected: status === 'OPEN',
    lastMessage,
    error,
    metrics,
    sendMessage,
    connect,
    disconnect,
    reconnect,
    connectionDuration,
    stateHistory,
  };
}

/**
 * Legacy hook for backward compatibility
 * Maps new status to legacy status format
 */
export function useWebSocketLegacy(url?: string) {
  const result = useResilientWebSocket({ url });

  return {
    ...result,
    // Map to legacy status for backward compatibility
    status: mapToLegacyStatus(result.status),
  };
}

export default useResilientWebSocket;
