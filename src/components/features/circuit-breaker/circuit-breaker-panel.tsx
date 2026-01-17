// CircuitBreaker Component - Visual Safety Indicator
// Displays circuit breaker status in 4K resolution glory!

"use client";

import React, { useState } from "react";
import { useCircuitBreaker } from "@/components/shared/hooks/useCircuitBreaker";
import { CircuitBreakerState } from "@/components/shared/websocket";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  AlertTriangle,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Power,
  PowerOff,
  RefreshCw,
} from "lucide-react";

interface CircuitBreakerPanelProps {
  compact?: boolean;
  showControls?: boolean;
}

export function CircuitBreakerPanel({
  compact = false,
  showControls = true,
}: CircuitBreakerPanelProps) {
  const {
    state,
    isTripped,
    isKillSwitchActive,
    canTrade,
    refreshStatus,
    activateKillSwitch,
    deactivateKillSwitch,
    resetCircuitBreaker,
    onTripped,
    onReset,
  } = useCircuitBreaker();

  const [isResetting, setIsResetting] = useState(false);
  const [isActivatingKillSwitch, setIsActivatingKillSwitch] = useState(false);

  React.useEffect(() => {
    onTripped((payload) => {
      console.log("Circuit breaker tripped:", payload);
    });
    onReset((payload) => {
      console.log("Circuit breaker reset:", payload);
    });
  }, [onTripped, onReset]);

  const handleActivateKillSwitch = async () => {
    setIsActivatingKillSwitch(true);
    const reason = prompt("Enter reason for activating kill switch:");
    const success = await activateKillSwitch(reason || "Manual activation");
    setIsActivatingKillSwitch(false);
    if (success) {
      alert("Kill switch activated! All trading has been halted.");
    } else {
      alert("Failed to activate kill switch.");
    }
  };

  const handleDeactivateKillSwitch = async () => {
    const success = await deactivateKillSwitch();
    if (success) {
      alert("Kill switch deactivated.");
    } else {
      alert("Failed to deactivate kill switch.");
    }
  };

  const handleReset = async () => {
    setIsResetting(true);
    const success = await resetCircuitBreaker(state.manualResetRequired);
    setIsResetting(false);
    if (success) {
      alert("Circuit breaker reset successfully.");
    } else {
      alert("Failed to reset circuit breaker.");
    }
  };

  const getStatusColor = () => {
    if (isKillSwitchActive) return "text-red-500";
    if (isTripped) return "text-orange-500";
    if (canTrade) return "text-green-500";
    return "text-yellow-500";
  };

  const getStatusBg = () => {
    if (isKillSwitchActive) return "bg-red-500/10 border-red-500";
    if (isTripped) return "bg-orange-500/10 border-orange-500";
    if (canTrade) return "bg-green-500/10 border-green-500";
    return "bg-yellow-500/10 border-yellow-500";
  };

  const getStatusIcon = () => {
    if (isKillSwitchActive)
      return <ShieldAlert className="w-12 h-12 text-red-500" />;
    if (isTripped)
      return <AlertTriangle className="w-12 h-12 text-orange-500" />;
    if (canTrade) return <ShieldCheck className="w-12 h-12 text-green-500" />;
    return <Shield className="w-12 h-12 text-yellow-500" />;
  };

  const getStatusText = () => {
    if (isKillSwitchActive) return "KILL SWITCH ACTIVE";
    if (isTripped) return "CIRCUIT OPEN";
    if (canTrade) return "PROTECTED";
    return "HALF OPEN";
  };

  const getLossPercentage = () => {
    const limit = 100000;
    const percentage = Math.min(
      (Math.abs(state.totalLosses) / limit) * 100,
      100,
    );
    return percentage;
  };

  if (compact) {
    return (
      <div
        className={`flex items-center gap-3 p-3 rounded-lg border ${getStatusBg()} transition-all duration-300`}
      >
        {getStatusIcon()}
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <span className={`font-bold ${getStatusColor()}`}>
              {getStatusText()}
            </span>
            {isKillSwitchActive && (
              <Badge variant="destructive">EMERGENCY</Badge>
            )}
          </div>
          <div className="text-xs text-muted-foreground">
            Losses: ¥{state.totalLosses.toLocaleString()}
          </div>
        </div>
        {showControls && (
          <div className="flex gap-1">
            {isKillSwitchActive ? (
              <Button
                size="sm"
                variant="outline"
                onClick={handleDeactivateKillSwitch}
              >
                <PowerOff className="w-4 h-4" />
              </Button>
            ) : (
              <Button
                size="sm"
                variant="outline"
                onClick={handleActivateKillSwitch}
                disabled={isActivatingKillSwitch}
              >
                <Power className="w-4 h-4" />
              </Button>
            )}
          </div>
        )}
      </div>
    );
  }

  return (
    <Card
      className={`w-full ${getStatusBg()} border-2 transition-all duration-300`}
    >
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Shield className="w-6 h-6" />
            Circuit Breaker
          </CardTitle>
          <div className="flex items-center gap-2">
            {getStatusIcon()}
            <span className={`text-xl font-bold ${getStatusColor()}`}>
              {getStatusText()}
            </span>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="space-y-1">
            <div className="text-xs text-muted-foreground">Total Losses</div>
            <div
              className={`text-lg font-mono ${state.totalLosses < 0 ? "text-red-500" : "text-green-500"}`}
            >
              ¥{state.totalLosses.toLocaleString()}
            </div>
          </div>
          <div className="space-y-1">
            <div className="text-xs text-muted-foreground">Peak Loss</div>
            <div className="text-lg font-mono text-orange-500">
              ¥{state.peakLoss.toLocaleString()}
            </div>
          </div>
          <div className="space-y-1">
            <div className="text-xs text-muted-foreground">Failures</div>
            <div className="text-lg font-mono">{state.failureCount}</div>
          </div>
          <div className="space-y-1">
            <div className="text-xs text-muted-foreground">Status</div>
            <Badge variant={canTrade ? "default" : "destructive"}>
              {canTrade ? "Trading Active" : "Trading Halted"}
            </Badge>
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>Budget Usage</span>
            <span>¥100,000 limit</span>
          </div>
          <Progress value={getLossPercentage()} className="h-2" />
          <div className="text-xs text-right text-muted-foreground">
            {getLossPercentage().toFixed(1)}% used
          </div>
        </div>

        {state.triggerReason && (
          <div className="p-3 bg-destructive/10 rounded-lg border border-destructive/20">
            <div className="text-xs text-muted-foreground mb-1">
              Trigger Reason
            </div>
            <div className="text-sm font-medium text-destructive">
              {state.triggerReason}
            </div>
          </div>
        )}

        {showControls && (
          <div className="flex flex-wrap gap-2 pt-2 border-t">
            {isKillSwitchActive ? (
              <Button
                variant="outline"
                size="sm"
                onClick={handleDeactivateKillSwitch}
                className="gap-1"
              >
                <PowerOff className="w-4 h-4" />
                Deactivate Kill Switch
              </Button>
            ) : (
              <Button
                variant="destructive"
                size="sm"
                onClick={handleActivateKillSwitch}
                disabled={isActivatingKillSwitch}
                className="gap-1"
              >
                <Power className="w-4 h-4" />
                Emergency Kill Switch
              </Button>
            )}
            {isTripped && (
              <Button
                variant="default"
                size="sm"
                onClick={handleReset}
                disabled={isResetting}
                className="gap-1"
              >
                <RefreshCw
                  className={`w-4 h-4 ${isResetting ? "animate-spin" : ""}`}
                />
                Reset Circuit Breaker
              </Button>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={refreshStatus}
              className="gap-1"
            >
              <RefreshCw className="w-4 h-4" />
              Refresh
            </Button>
          </div>
        )}

        {state.manualResetRequired && (
          <div className="text-xs text-orange-500 flex items-center gap-1">
            <AlertTriangle className="w-3 h-3" />
            Manual reset required - automatic reset disabled
          </div>
        )}

        {state.lastUpdated && (
          <div className="text-xs text-muted-foreground text-right">
            Last updated: {new Date(state.lastUpdated).toLocaleString()}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default CircuitBreakerPanel;
