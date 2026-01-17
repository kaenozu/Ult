import { useCallback } from "react";
import { useNotifications } from "@/components/notifications/NotificationSystem";

export interface NotificationConfig {
  type: "trade" | "price_alert" | "system" | "portfolio";
  title: string;
  message: string;
  severity: "info" | "warning" | "critical";
  metadata?: Record<string, any>;
  actions?: Array<{
    label: string;
    action: () => void;
    variant?: "primary" | "secondary";
  }>;
}

export function useNotificationManager() {
  const { addNotification } = useNotifications();

  const showTradeAlert = useCallback(
    (
      symbol: string,
      action: "BUY" | "SELL",
      quantity: number,
      price: number,
      onExecute?: () => void,
    ) => {
      addNotification({
        type: "trade",
        title: `${action} ${symbol}`,
        message: `${action} ${quantity} shares @ $${price.toFixed(2)}`,
        severity: "info",
        metadata: { symbol, action, quantity, price },
        actions: onExecute
          ? [
              {
                label: "Execute",
                action: onExecute,
                variant: "primary",
              },
              {
                label: "Dismiss",
                action: () => {},
                variant: "secondary",
              },
            ]
          : undefined,
      });
    },
    [addNotification],
  );

  const showPriceAlert = useCallback(
    (
      symbol: string,
      currentPrice: number,
      changePercent: number,
      threshold?: number,
    ) => {
      const isPositive = changePercent >= 0;
      const severity = Math.abs(changePercent) > 5 ? "critical" : "warning";

      addNotification({
        type: "price_alert",
        title: `Price Alert: ${symbol}`,
        message: `${symbol} is now $${currentPrice.toFixed(2)} (${isPositive ? "+" : ""}${changePercent.toFixed(2)}%)`,
        severity,
        metadata: { symbol, currentPrice, changePercent, threshold },
      });
    },
    [addNotification],
  );

  const showPortfolioAlert = useCallback(
    (dropPercent: number, currentValue: number) => {
      addNotification({
        type: "portfolio",
        title: "Portfolio Drop Alert",
        message: `Portfolio down ${dropPercent.toFixed(2)}% ($${currentValue.toFixed(2)})`,
        severity: dropPercent > 5 ? "critical" : "warning",
        metadata: { dropPercent, currentValue },
      });
    },
    [addNotification],
  );

  const showSystemAlert = useCallback(
    (
      title: string,
      message: string,
      severity: "info" | "warning" | "critical" = "info",
    ) => {
      addNotification({
        type: "system",
        title,
        message,
        severity,
      });
    },
    [addNotification],
  );

  return {
    showTradeAlert,
    showPriceAlert,
    showPortfolioAlert,
    showSystemAlert,
    addNotification,
  };
}
