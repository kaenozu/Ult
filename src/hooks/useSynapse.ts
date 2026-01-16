// Strictly Typed WebSocket Hook (React)
// Phase 3: Realtime Synapse

import { useEffect, useRef, useCallback, useState } from "react";
import {
  MessageFactory,
  MessageHandlerMap,
  AnyClientMessage,
  isAnyServerMessage,
  RegimeUpdateMessage,
  PriceAlertMessage,
  PortfolioUpdateMessage,
  SubscribeMessage,
  UnsubscribeMessage,
  GetStatusMessage,
} from "@/types/websocket";

// ============================================================================
// CONFIGURATION
// ============================================================================

interface WebSocketConfig {
  url: string;
  autoReconnect?: boolean;
  reconnectInterval?: number;
  maxReconnectAttempts?: number;
  pingInterval?: number;
  userId?: string;
}

type ConnectionState = "disconnected" | "connecting" | "connected" | "error";

// ============================================================================
// HOOK
// ============================================================================

interface UseSynapseReturn {
  // Connection state
  state: ConnectionState;
  isConnected: boolean;
  connectionId: string | null;

  // Actions
  connect: () => void;
  disconnect: () => void;
  send: (message: AnyClientMessage) => void;
  subscribe: (
    channels: (
      | "regime"
      | "price_alerts"
      | "portfolio_updates"
      | "trades"
      | "all"
    )[],
  ) => void;
  unsubscribe: (
    channels: (
      | "regime"
      | "price_alerts"
      | "portfolio_updates"
      | "trades"
      | "all"
    )[],
  ) => void;
  getStatus: () => void;

  // Handlers
  onMessage: <
    T extends RegimeUpdateMessage | PriceAlertMessage | PortfolioUpdateMessage,
  >(
    type: T["type"],
    handler: (message: T) => void,
  ) => void;
  onError: (handler: (error: Error) => void) => () => void;
  onStateChange: (handler: (state: ConnectionState) => void) => () => void;

  // Internal
  removeHandler: (type: string) => void;
  clearHandlers: () => void;
}

export function useSynapse(config: WebSocketConfig): UseSynapseReturn {
  const {
    url,
    autoReconnect = true,
    reconnectInterval = 3000,
    maxReconnectAttempts = 10,
    pingInterval = 30000,
    userId,
  } = config;

  // State
  const [state, setState] = useState<ConnectionState>("disconnected");
  const [connectionId, setConnectionId] = useState<string | null>(null);

  // Refs
  const wsRef = useRef<WebSocket | null>(null);
  const handlersRef = useRef<MessageHandlerMap>({});
  const errorHandlersRef = useRef<Set<(error: Error) => void>>(new Set());
  const stateHandlersRef = useRef<Set<(state: ConnectionState) => void>>(
    new Set(),
  );
  const reconnectAttemptsRef = useRef(0);
  const pingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Connection state setter (memoized)
  const setStateInternal = useCallback((newState: ConnectionState) => {
    setState(newState);
    stateHandlersRef.current.forEach((handler) => handler(newState));
  }, []);

  // ============================================================================
  // CONNECTION MANAGEMENT
  // ============================================================================

  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      console.warn("WebSocket already connected");
      return;
    }

    setStateInternal("connecting");

    try {
      const ws = new WebSocket(url);
      wsRef.current = ws;

      ws.onopen = () => {
        console.log("WebSocket connected");
        setStateInternal("connected");
        reconnectAttemptsRef.current = 0;

        // Send initial subscription if userId provided
        if (userId) {
          const subscribeMsg = MessageFactory.subscribe(["all"], userId);
          ws.send(JSON.stringify(subscribeMsg));
        }

        // Start ping interval
        if (pingIntervalRef.current) clearInterval(pingIntervalRef.current);
        pingIntervalRef.current = setInterval(() => {
          const pingMsg = MessageFactory.ping(Date.now());
          ws.send(JSON.stringify(pingMsg));
        }, pingInterval);
      };

      ws.onmessage = async (event) => {
        try {
          const data = JSON.parse(event.data);

          // Validate message structure
          if (!isAnyServerMessage(data)) {
            console.error("Invalid message received:", data);
            return;
          }

          // Get handler for message type
          const handler =
            handlersRef.current[data.type as keyof MessageHandlerMap];
          if (handler) {
            await handler(data as any);
          }
        } catch (error) {
          console.error("Error processing message:", error);
          errorHandlersRef.current.forEach((handler) =>
            handler(error as Error),
          );
        }
      };

      ws.onerror = (error) => {
        console.error("WebSocket error:", error);
        setStateInternal("error");
        const err = new Error("WebSocket connection error");
        errorHandlersRef.current.forEach((handler) => handler(err));
      };

      ws.onclose = (event) => {
        console.log("WebSocket closed:", event.code, event.reason);
        setStateInternal("disconnected");

        // Clear ping interval
        if (pingIntervalRef.current) {
          clearInterval(pingIntervalRef.current);
          pingIntervalRef.current = null;
        }

        // Auto reconnect
        if (
          autoReconnect &&
          reconnectAttemptsRef.current < maxReconnectAttempts
        ) {
          reconnectAttemptsRef.current++;
          console.log(
            `Reconnecting... Attempt ${reconnectAttemptsRef.current}`,
          );
          reconnectTimeoutRef.current = setTimeout(connect, reconnectInterval);
        }
      };
    } catch (error) {
      console.error("Failed to create WebSocket connection:", error);
      setStateInternal("error");
      errorHandlersRef.current.forEach((handler) => handler(error as Error));
    }
  }, [
    url,
    autoReconnect,
    reconnectInterval,
    maxReconnectAttempts,
    pingInterval,
    userId,
    setStateInternal,
  ]);

  const disconnect = useCallback(() => {
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    if (pingIntervalRef.current) {
      clearInterval(pingIntervalRef.current);
      pingIntervalRef.current = null;
    }
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    setStateInternal("disconnected");
  }, [setStateInternal]);

  // ============================================================================
  // MESSAGE SENDING
  // ============================================================================

  const send = useCallback((message: AnyClientMessage) => {
    if (wsRef.current?.readyState !== WebSocket.OPEN) {
      console.warn("WebSocket not connected, cannot send message");
      return;
    }
    wsRef.current.send(JSON.stringify(message));
  }, []);

  const subscribe = useCallback(
    (
      channels: (
        | "regime"
        | "price_alerts"
        | "portfolio_updates"
        | "trades"
        | "all"
      )[],
    ) => {
      const message = MessageFactory.subscribe(channels, userId);
      send(message);
    },
    [send, userId],
  );

  const unsubscribe = useCallback(
    (
      channels: (
        | "regime"
        | "price_alerts"
        | "portfolio_updates"
        | "trades"
        | "all"
      )[],
    ) => {
      const message = MessageFactory.unsubscribe(channels);
      send(message);
    },
    [send],
  );

  const getStatus = useCallback(() => {
    const message = MessageFactory.getStatus(true);
    send(message);
  }, [send]);

  // ============================================================================
  // HANDLERS
  // ============================================================================

  const onMessage = useCallback(
    <
      T extends
        | RegimeUpdateMessage
        | PriceAlertMessage
        | PortfolioUpdateMessage,
    >(
      type: T["type"],
      handler: (message: T) => void,
    ) => {
      handlersRef.current[type as keyof MessageHandlerMap] = handler as any;
    },
    [],
  );

  const onError = useCallback((handler: (error: Error) => void) => {
    errorHandlersRef.current.add(handler);
    return () => {
      errorHandlersRef.current.delete(handler);
    };
  }, []);

  const onStateChange = useCallback(
    (handler: (state: ConnectionState) => void) => {
      stateHandlersRef.current.add(handler);
      return () => {
        stateHandlersRef.current.delete(handler);
      };
    },
    [],
  );

  const removeHandler = useCallback((type: string) => {
    delete handlersRef.current[type as keyof MessageHandlerMap];
  }, []);

  const clearHandlers = useCallback(() => {
    handlersRef.current = {};
  }, []);

  // ============================================================================
  // LIFECYCLE
  // ============================================================================

  useEffect(() => {
    // Auto-connect on mount
    connect();

    // Cleanup on unmount
    return () => {
      disconnect();
    };
  }, []); // Empty deps - only run on mount

  return {
    state,
    isConnected: state === "connected",
    connectionId,

    connect,
    disconnect,
    send,
    subscribe,
    unsubscribe,
    getStatus,

    onMessage,
    onError,
    onStateChange,

    removeHandler,
    clearHandlers,
  };
}

// ============================================================================
// CONVENIENCE HOOKS
// ============================================================================

export function useRegimeStream(
  callback: (message: RegimeUpdateMessage) => void,
) {
  const { onMessage } = useSynapse({ url: "ws://localhost:8000/ws/synapse" });

  useEffect(() => {
    onMessage<RegimeUpdateMessage>("regime_update", callback);
  }, [onMessage, callback]);
}

export function usePriceAlerts(callback: (message: PriceAlertMessage) => void) {
  const { onMessage } = useSynapse({ url: "ws://localhost:8000/ws/synapse" });

  useEffect(() => {
    onMessage<PriceAlertMessage>("price_alert", callback);
  }, [onMessage, callback]);
}

export function usePortfolioUpdates(
  callback: (message: PortfolioUpdateMessage) => void,
) {
  const { onMessage } = useSynapse({ url: "ws://localhost:8000/ws/synapse" });

  useEffect(() => {
    onMessage<PortfolioUpdateMessage>("portfolio_update", callback);
  }, [onMessage, callback]);
}
