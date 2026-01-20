"use client";

import { useState, useEffect } from "react";
import { useSynapse } from "@/components/shared/hooks/useSynapse";
import {
  CircuitBreakerTrippedMessage,
  CircuitBreakerStatusMessage,
  CircuitBreakerState,
} from "@/components/shared/websocket";
import { AlertOctagon, XCircle, RefreshCw } from "lucide-react";

export function GlobalAlertOverlay() {
  const [isTripped, setIsTripped] = useState(false);
  const [reason, setReason] = useState("");
  const [triggerType, setTriggerType] = useState("");
  const [killSwitchActive, setKillSwitchActive] = useState(false);

  // Connect to WebSocket
  const { subscribe, onMessage, isConnected } = useSynapse({
    url: "ws://localhost:8000/ws/synapse",
    autoReconnect: true,
  });

  // Subscribe to circuit breaker channel on connect
  useEffect(() => {
    if (isConnected) {
      subscribe(["circuit_breaker" as any]); // Type casting as 'circuit_breaker' might not be in the strict type union yet or is 'all'
    }
  }, [isConnected, subscribe]);

  // Handle messages
  useEffect(() => {
    onMessage<CircuitBreakerTrippedMessage>(
      "circuit_breaker_tripped",
      (msg) => {
        setIsTripped(true);
        setReason(msg.payload.trigger_reason);
        setTriggerType(msg.payload.trigger_type);
        setKillSwitchActive(msg.payload.kill_switch_active);
      },
    );

    onMessage<CircuitBreakerStatusMessage>("circuit_breaker_status", (msg) => {
      if (msg.payload.state === CircuitBreakerState.OPEN) {
        setIsTripped(true);
        setKillSwitchActive(msg.payload.kill_switch_active);
        // Status message might not have reason detailed, but we know it's open
      } else {
        setIsTripped(false);
      }
    });

    // Reset handler (can be inferred from status, but explicit event is good too if available)
    // Assuming circuit_breaker_reset event exists or mapped to status
  }, [onMessage]);

  if (!isTripped) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm animate-pulse-slow">
      {/* Red Pulse Background */}
      <div className="absolute inset-0 bg-red-500/10 animate-pulse pointer-events-none" />

      <div className="relative max-w-2xl w-full mx-4 p-8 bg-background border-4 border-red-600 rounded-xl shadow-[0_0_50px_rgba(220,38,38,0.5)] text-center overflow-hidden">
        {/* Scanning Line Effect */}
        <div className="absolute inset-0 bg-[linear-gradient(transparent_50%,rgba(255,0,0,0.1)_50%)] bg-[length:100%_4px] pointer-events-none" />

        <div className="relative z-10 flex flex-col items-center gap-6">
          <div className="p-4 bg-red-600/20 rounded-full ring-4 ring-red-600 animate-bounce">
            <AlertOctagon className="w-24 h-24 text-red-600" />
          </div>

          <div className="space-y-2">
            <h1 className="text-4xl font-black text-red-600 tracking-widest uppercase">
              SYSTEM LOCKDOWN
            </h1>
            <p className="text-xl text-red-400 font-mono border-t border-b border-red-900/50 py-2">
              CIRCUIT BREAKER TRIGGERED
            </p>
          </div>

          <div className="w-full bg-red-950/50 p-6 rounded-lg text-left border border-red-800">
            <div className="grid grid-cols-2 gap-4 font-mono text-sm">
              <div className="text-red-400">TRIGGER TYPE:</div>
              <div className="text-red-100 font-bold uppercase">
                {triggerType || "UNKNOWN"}
              </div>

              <div className="text-red-400">REASON:</div>
              <div className="text-red-100 col-span-2 bg-black/40 p-2 rounded">
                {reason || "System integrity protection activated."}
              </div>

              <div className="text-red-400">STATUS:</div>
              <div className="text-red-100 font-bold flex items-center gap-2">
                <XCircle className="w-4 h-4" /> TRADING HALTED
              </div>
            </div>
          </div>

          {killSwitchActive && (
            <div className="px-4 py-2 bg-red-600 text-white font-bold rounded animate-pulse">
              ⚠️ KILL SWITCH ACTIVE - MANUAL RESET REQUIRED ⚠️
            </div>
          )}

          <div className="text-xs text-red-500 font-mono mt-4">
            Create an emergency patch or contact administrator to restore
            operations.
          </div>
        </div>
      </div>
    </div>
  );
}
