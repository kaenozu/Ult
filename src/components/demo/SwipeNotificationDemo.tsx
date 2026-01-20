"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useNotificationManager } from "@/components/shared/hooks/useNotificationManager";
import { Badge } from "@/components/ui/badge";
import { Bell, TrendingUp, AlertTriangle, Briefcase, Info } from "lucide-react";

export function SwipeNotificationDemo() {
  const {
    showTradeAlert,
    showPriceAlert,
    showPortfolioAlert,
    showSystemAlert,
  } = useNotificationManager();
  const [isDemoMode, setIsDemoMode] = useState(false);

  const handleTradeExecute = () => {
    
    showSystemAlert(
      "Trade Executed",
      "Your trade has been successfully executed.",
      "info",
    );
  };

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bell className="w-5 h-5" />
          In-App Swipe Notifications
        </CardTitle>
        <CardDescription>
          Experience fast, gesture-based notifications without leaving the app.
          No more context switching!
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <Button
            variant="outline"
            onClick={() =>
              showTradeAlert("AAPL", "BUY", 10, 175.5, handleTradeExecute)
            }
            className="flex items-center gap-2 h-auto p-4 flex-col"
          >
            <TrendingUp className="w-6 h-6 text-green-600" />
            <div className="text-left">
              <div className="font-medium">Trade Alert</div>
              <div className="text-xs text-muted-foreground">
                Test buy notification
              </div>
            </div>
          </Button>

          <Button
            variant="outline"
            onClick={() => showPriceAlert("TSLA", 245.8, -8.5, 5.0)}
            className="flex items-center gap-2 h-auto p-4 flex-col"
          >
            <AlertTriangle className="w-6 h-6 text-yellow-600" />
            <div className="text-left">
              <div className="font-medium">Price Alert</div>
              <div className="text-xs text-muted-foreground">
                Test price drop
              </div>
            </div>
          </Button>

          <Button
            variant="outline"
            onClick={() => showPortfolioAlert(3.2, 125000)}
            className="flex items-center gap-2 h-auto p-4 flex-col"
          >
            <Briefcase className="w-6 h-6 text-red-600" />
            <div className="text-left">
              <div className="font-medium">Portfolio Alert</div>
              <div className="text-xs text-muted-foreground">
                Test portfolio drop
              </div>
            </div>
          </Button>

          <Button
            variant="outline"
            onClick={() =>
              showSystemAlert(
                "System Update",
                "AI trading model updated to v2.4.1",
                "info",
              )
            }
            className="flex items-center gap-2 h-auto p-4 flex-col"
          >
            <Info className="w-6 h-6 text-blue-600" />
            <div className="text-left">
              <div className="font-medium">System Alert</div>
              <div className="text-xs text-muted-foreground">
                Test system message
              </div>
            </div>
          </Button>
        </div>

        <div className="border-t pt-4">
          <div className="flex items-center justify-between mb-3">
            <h4 className="font-medium">How to Use:</h4>
            <Badge variant={isDemoMode ? "default" : "secondary"}>
              {isDemoMode ? "Active" : "Inactive"}
            </Badge>
          </div>

          <div className="space-y-2 text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded bg-red-100 text-red-600 flex items-center justify-center text-xs font-bold">
                ←
              </div>
              <span>Swipe left to dismiss notifications</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded bg-green-100 text-green-600 flex items-center justify-center text-xs font-bold">
                →
              </div>
              <span>Swipe right to execute actions (when available)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded bg-gray-100 text-gray-600 flex items-center justify-center text-xs">
                X
              </div>
              <span>Click X to manually dismiss</span>
            </div>
          </div>
        </div>

        <div className="flex gap-2 pt-2">
          <Button
            onClick={() => {
              showTradeAlert("NVDA", "BUY", 5, 485.2, handleTradeExecute);
              showPriceAlert("GOOGL", 142.5, 3.2, 2.0);
              showSystemAlert(
                "Welcome!",
                "You are now using In-App Swipe notifications!",
                "info",
              );
              setIsDemoMode(true);
            }}
            className="flex-1"
          >
            Try All Notifications
          </Button>

          <Button
            variant="secondary"
            onClick={() => setIsDemoMode(!isDemoMode)}
          >
            {isDemoMode ? "Stop Demo" : "Start Demo"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
