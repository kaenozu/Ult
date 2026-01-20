// useCircuitBreaker Hook - Circuit Breaker State Management
// Safety First! Protect against bankruptcy in 4K resolution.

import { useEffect, useCallback, useState, useRef } from "react";
import {
  CircuitBreakerState,
  CircuitBreakerTriggerType,
  CircuitBreakerStatusPayload,
  CircuitBreakerTrippedPayload,
  CircuitBreakerResetPayload,
  isCircuitBreakerStatusMessage,
  isCircuitBreakerTrippedMessage,
  isCircuitBreakerResetMessage,
  AnyServerMessage,
} from "@/components/shared/websocket";

export interface CircuitBreakerStateInfo {
  state: CircuitBreakerState;
  canTrade: boolean;
  totalLosses: number;
  peakLoss: number;
  failureCount: number;
  killSwitchActive: boolean;
  manualResetRequired: boolean;
  triggerType?: CircuitBreakerTriggerType;
  triggerReason?: string;
  lastUpdated: string | null;
}

export interface UseCircuitBreakerReturn {
  state: CircuitBreakerStateInfo;
  isTripped: boolean;
  isKillSwitchActive: boolean;
  canTrade: boolean;
  refreshStatus: () => Promise<void>;
  activateKillSwitch: (reason?: string) => Promise<boolean>;
  deactivateKillSwitch: () => Promise<boolean>;
  resetCircuitBreaker: (force?: boolean) => Promise<boolean>;
  onStatus: (
    callback: (status: CircuitBreakerStatusPayload) => void,
  ) => () => void;
  onTripped: (
    callback: (tripped: CircuitBreakerTrippedPayload) => void,
  ) => () => void;
  onReset: (
    callback: (reset: CircuitBreakerResetPayload) => void,
  ) => () => void;
}

export function useCircuitBreaker(
  wsUrl: string = "ws://localhost:8000/ws/synapse",
): UseCircuitBreakerReturn {
  const [state, setState] = useState<CircuitBreakerStateInfo>({
    state: CircuitBreakerState.CLOSED,
    canTrade: true,
    totalLosses: 0,
    peakLoss: 0,
    failureCount: 0,
    killSwitchActive: false,
    manualResetRequired: false,
    triggerType: undefined,
    triggerReason: undefined,
    lastUpdated: null,
  });

  const wsRef = useRef<WebSocket | null>(null);
  const statusHandlersRef = useRef<
    Set<(status: CircuitBreakerStatusPayload) => void>
  >(new Set());
  const trippedHandlersRef = useRef<
    Set<(tripped: CircuitBreakerTrippedPayload) => void>
  >(new Set());
  const resetHandlersRef = useRef<
    Set<(reset: CircuitBreakerResetPayload) => void>
  >(new Set());

  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      return;
    }

    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      
      ws.send(
        JSON.stringify({
          msg_id: crypto.randomUUID(),
          type: "subscribe",
          payload: { channels: ["circuit_breaker"] },
          direction: "c2s",
          timestamp: new Date().toISOString(),
        }),
      );
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);

        if (isCircuitBreakerStatusMessage(data as AnyServerMessage)) {
          const payload = (data as any).payload;
          setState((prev) => ({
            ...prev,
            state: payload.state,
            canTrade: payload.can_trade,
            totalLosses: payload.total_losses,
            peakLoss: payload.peak_loss,
            failureCount: payload.failure_count,
            killSwitchActive: payload.kill_switch_active,
            manualResetRequired: payload.manual_reset_required,
            lastUpdated: payload.timestamp,
          }));
          payloadHandlersRef.current.forEach((handler) => handler(payload));
        } else if (isCircuitBreakerTrippedMessage(data as AnyServerMessage)) {
          const payload = (data as any).payload;
          setState((prev) => ({
            ...prev,
            state: payload.state,
            canTrade: false,
            killSwitchActive: payload.kill_switch_active,
            manualResetRequired: payload.manual_reset_required,
            triggerType: payload.trigger_type,
            triggerReason: payload.trigger_reason,
            lastUpdated: payload.timestamp,
          }));
          trippedHandlersRef.current.forEach((handler) => handler(payload));
        } else if (isCircuitBreakerResetMessage(data as AnyServerMessage)) {
          const payload = (data as any).payload;
          setState((prev) => ({
            ...prev,
            state: CircuitBreakerState.CLOSED,
            canTrade: true,
            triggerType: undefined,
            triggerReason: undefined,
            lastUpdated: payload.timestamp,
          }));
          resetHandlersRef.current.forEach((handler) => handler(payload));
        }
      } catch (error) {
        
      }
    };

    ws.onerror = (error) => {
      
    };

    ws.onclose = () => {
      
    };
  }, [wsUrl]);

  const payloadHandlersRef = useRef<
    Set<(status: CircuitBreakerStatusPayload) => void>
  >(new Set());

  useEffect(() => {
    connect();

    return () => {
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
    };
  }, [connect]);

  const refreshStatus = useCallback(async () => {
    try {
      const response = await fetch("/api/v1/circuit-breaker/status");
      if (response.ok) {
        const data = await response.json();
        setState((prev) => ({
          ...prev,
          state: data.state.state,
          canTrade: data.can_trade,
          totalLosses: data.state.total_losses,
          peakLoss: data.state.peak_loss,
          failureCount: data.state.failure_count,
          killSwitchActive: data.state.kill_switch_active,
          manualResetRequired: data.state.manual_reset_required,
          lastUpdated: new Date().toISOString(),
        }));
      }
    } catch (error) {
      
    }
  }, []);

  const activateKillSwitch = useCallback(
    async (reason?: string): Promise<boolean> => {
      try {
        const response = await fetch(
          "/api/v1/circuit-breaker/kill-switch/activate",
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ reason }),
          },
        );
        if (response.ok) {
          await refreshStatus();
          return true;
        }
        return false;
      } catch (error) {
        
        return false;
      }
    },
    [refreshStatus],
  );

  const deactivateKillSwitch = useCallback(async (): Promise<boolean> => {
    try {
      const response = await fetch(
        "/api/v1/circuit-breaker/kill-switch/deactivate",
        {
          method: "POST",
        },
      );
      if (response.ok) {
        await refreshStatus();
        return true;
      }
      return false;
    } catch (error) {
      
      return false;
    }
  }, [refreshStatus]);

  const resetCircuitBreaker = useCallback(
    async (force: boolean = false): Promise<boolean> => {
      try {
        const response = await fetch(
          `/api/v1/circuit-breaker/reset?force=${force}`,
          { method: "POST" },
        );
        if (response.ok) {
          await refreshStatus();
          return true;
        }
        return false;
      } catch (error) {
        
        return false;
      }
    },
    [refreshStatus],
  );

  const onStatus = useCallback(
    (callback: (status: CircuitBreakerStatusPayload) => void) => {
      statusHandlersRef.current.add(callback);
      return () => {
        statusHandlersRef.current.delete(callback);
      };
    },
    [],
  );

  const onTripped = useCallback(
    (callback: (tripped: CircuitBreakerTrippedPayload) => void) => {
      trippedHandlersRef.current.add(callback);
      return () => {
        trippedHandlersRef.current.delete(callback);
      };
    },
    [],
  );

  const onReset = useCallback(
    (callback: (reset: CircuitBreakerResetPayload) => void) => {
      resetHandlersRef.current.add(callback);
      return () => {
        resetHandlersRef.current.delete(callback);
      };
    },
    [],
  );

  return {
    state,
    isTripped: state.state === CircuitBreakerState.OPEN,
    isKillSwitchActive: state.killSwitchActive,
    canTrade: state.canTrade,
    refreshStatus,
    activateKillSwitch,
    deactivateKillSwitch,
    resetCircuitBreaker,
    onStatus,
    onTripped,
    onReset,
  };
}

export default useCircuitBreaker;
