"use client";

import { useState } from "react";
import { usePriceAlerts } from "@/components/shared/hooks/connection";
import { AlertTriangle, TrendingUp, TrendingDown, Info } from "lucide-react";

interface PriceAlert {
  symbol: string;
  price: number;
  change_percent: number;
  severity: "low" | "medium" | "high" | "critical";
  message: string;
  timestamp: string;
}

export default function PriceAlertsComponent() {
  const [alerts, setAlerts] = useState<PriceAlert[]>([]);

  usePriceAlerts((message) => {
    const newAlert: PriceAlert = {
      symbol: message.payload.ticker,
      price: message.payload.current_price,
      change_percent: message.payload.change_percent,
      severity: message.payload.severity,
      message: `${message.payload.name || message.payload.ticker} ${message.payload.alert_type === "threshold" ? "threshold breach" : message.payload.alert_type === "movement" ? "significant movement" : "gap detected"}`,
      timestamp: message.payload.timestamp,
    };

    setAlerts((prev) => [newAlert, ...prev.slice(0, 4)]); // Keep latest 5 alerts
  });

  const getSeverityStyles = (severity: string) => {
    switch (severity) {
      case "critical":
        return "border-red-600 bg-red-600/20 text-red-400 animate-pulse";
      case "high":
        return "border-rose-500 bg-rose-500/10 text-rose-400";
      case "medium":
        return "border-amber-500 bg-amber-500/10 text-amber-400";
      case "low":
      default:
        return "border-blue-500 bg-blue-500/10 text-blue-400";
    }
  };

  const getIcon = (severity: string) => {
    switch (severity) {
      case "critical":
        return (
          <AlertTriangle className="w-4 h-4 text-red-500 animate-bounce" />
        );
      case "high":
        return <AlertTriangle className="w-4 h-4 text-rose-500" />;
      case "medium":
        return <Info className="w-4 h-4 text-amber-500" />;
      case "low":
      default:
        return <Info className="w-4 h-4 text-blue-500" />;
    }
  };

  const formatTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  };

  if (alerts.length === 0) {
    return (
      <div className="p-6 rounded-xl border border-white/10 bg-white/5 min-h-[200px] flex flex-col justify-center items-center">
        <div className="text-muted-foreground text-center">
          <Info className="w-8 h-8 mx-auto mb-2 opacity-50" />
          <div className="font-mono text-sm">NO PRICE ALERTS</div>
          <div className="text-xs opacity-50 mt-1">
            Waiting for market activity...
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 rounded-xl border border-white/10 bg-white/5 min-h-[200px] flex flex-col">
      <div className="flex items-center gap-2 mb-4">
        <AlertTriangle className="w-5 h-5 text-muted-foreground" />
        <h2 className="font-mono text-sm uppercase tracking-wider opacity-70">
          Price Alerts
        </h2>
        {alerts.length > 0 && (
          <span className="ml-auto text-xs font-mono bg-primary/20 px-2 py-1 rounded">
            {alerts.length} Active
          </span>
        )}
      </div>

      <div className="flex-1 space-y-3 overflow-y-auto">
        {alerts.map((alert, index) => (
          <div
            key={`${alert.symbol}-${alert.timestamp}-${index}`}
            className={`p-3 rounded-lg border ${getSeverityStyles(alert.severity)} transition-all duration-300 hover:scale-[1.02]`}
          >
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-2 flex-1 min-w-0">
                {getIcon(alert.severity)}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-sm font-bold">
                      {alert.symbol}
                    </span>
                    <span className="text-xs opacity-70">
                      ${alert.price.toFixed(2)}
                    </span>
                  </div>
                  <div className="text-xs opacity-80 mt-1 truncate">
                    {alert.message}
                  </div>
                </div>
              </div>
              <div className="text-right">
                <div
                  className={`text-xs font-mono ${alert.change_percent > 0
                      ? "text-emerald-400"
                      : alert.change_percent < 0
                        ? "text-rose-400"
                        : "text-muted-foreground"
                    }`}
                >
                  {alert.change_percent > 0 && "+"}
                  {alert.change_percent.toFixed(2)}%
                </div>
                <div className="text-xs opacity-50 font-mono">
                  {formatTime(alert.timestamp)}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
