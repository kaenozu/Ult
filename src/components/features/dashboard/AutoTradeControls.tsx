"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getAutoTradeStatus, configureAutoTrade } from "@/components/shared/utils/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Bot,
  Settings2,
  Activity,
  ShieldCheck,
  PlayCircle,
  StopCircle,
  Heart,
  Sparkles,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useState } from "react";
import TinderTrader from "./TinderTrader";

export default function AutoTradeControls() {
  const queryClient = useQueryClient();
  const [budget, setBudget] = useState("50000");
  const [mode, setMode] = useState<"auto" | "semi-auto" | "off">("off");
  const [showTinderTrader, setShowTinderTrader] = useState(false);

  // Fetch Status
  const { data: status, isLoading } = useQuery({
    queryKey: ["autotrade"],
    queryFn: getAutoTradeStatus,
    refetchInterval: 15000, // Poll every 15s for status updates (reduced from 5s)
  });

  // Toggle Mutation
  const toggleMutation = useMutation({
    mutationFn: (enabled: boolean) => configureAutoTrade({ enabled }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["autotrade"] }),
  });

  // Config Mutation
  const configMutation = useMutation({
    mutationFn: (cfg: { max_budget_per_trade: number }) =>
      configureAutoTrade(cfg),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["autotrade"] }),
  });

  if (isLoading || !status)
    return <div className="h-32 bg-muted/20 animate-pulse rounded-lg" />;

  const isRunning = status.is_running;

  const handleToggle = (checked: boolean) => {
    toggleMutation.mutate(checked);
  };

  const handleSaveConfig = () => {
    configMutation.mutate({ max_budget_per_trade: Number(budget) });
  };

  const handleModeChange = (newMode: "auto" | "semi-auto" | "off") => {
    setMode(newMode);
    if (newMode === "semi-auto") {
      setShowTinderTrader(true);
    } else {
      setShowTinderTrader(false);
    }
    toggleMutation.mutate(newMode !== "off");
  };

  return (
    <>
      <Card
        className={`border-none shadow-lg transition-all duration-500 ${mode !== "off" ? "bg-gradient-to-r from-emerald-950/30 to-background border-l-4 border-l-emerald-500" : "bg-muted/10"}`}
      >
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-xl font-bold flex items-center gap-2">
            <Bot
              className={`h-6 w-6 ${mode !== "off" ? "text-emerald-400 animate-pulse" : "text-muted-foreground"}`}
            />
            {mode === "semi-auto" ? (
              <>
                <Heart className="h-5 w-5 text-pink-400" />
                Tinder Mode
              </>
            ) : (
              "Auto-Pilot"
            )}
            {mode !== "off" && (
              <Badge
                variant="default"
                className={
                  mode === "semi-auto"
                    ? "bg-pink-600 ml-2"
                    : "bg-emerald-600 ml-2"
                }
              >
                {mode === "semi-auto" ? "SEMIAUTO" : "RUNNING"}
              </Badge>
            )}
          </CardTitle>
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-muted-foreground">
              {mode === "off"
                ? "OFF"
                : mode === "semi-auto"
                  ? "SEMIAUTO"
                  : "AUTO"}
            </span>
            <Switch
              checked={mode !== "off"}
              onCheckedChange={(checked) =>
                handleModeChange(checked ? "semi-auto" : "off")
              }
              className="data-[state=checked]:bg-pink-500"
            />
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between text-sm">
            <div className="space-y-1">
              <div className="flex items-center gap-1.5 text-muted-foreground">
                <Activity className="h-3.5 w-3.5" />
                Status:{" "}
                <span
                  className={
                    mode !== "off"
                      ? "text-emerald-400 font-mono"
                      : "text-slate-400 font-mono"
                  }
                >
                  {status.scan_status}
                </span>
              </div>
              <div className="flex items-center gap-1.5 text-muted-foreground">
                <ShieldCheck className="h-3.5 w-3.5" />
                Max Invest:{" "}
                <span className="font-mono text-foreground">
                  ¥{status.config?.max_budget_per_trade.toLocaleString()}
                </span>
              </div>
            </div>

            <div className="flex gap-2">
              {mode === "semi-auto" && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowTinderTrader(!showTinderTrader)}
                  className="gap-2 bg-pink-500/10 border-pink-500/30 text-pink-300 hover:bg-pink-500/20"
                >
                  <Sparkles className="h-4 w-4" />
                  {showTinderTrader ? "Hide" : "Show"} Tinder
                </Button>
              )}
              <Dialog>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm" className="gap-2">
                    <Settings2 className="h-4 w-4" />
                    Config
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Auto-Pilot Settings</DialogTitle>
                    <DialogDescription>
                      Configure risk limits and budget for autonomous trading.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="grid gap-4 py-4">
                    <div className="grid grid-cols-4 items-center gap-4">
                      <Label htmlFor="budget" className="text-right">
                        Budget / Trade
                      </Label>
                      <Input
                        id="budget"
                        type="number"
                        value={budget}
                        onChange={(e) => setBudget(e.target.value)}
                        className="col-span-3"
                      />
                      <span className="text-xs text-muted-foreground col-start-2 col-span-3">
                        (Default: ¥50,000) - Maximum amount to invest in a
                        single trade.
                      </span>
                    </div>
                  </div>
                  <DialogFooter>
                    <Button type="submit" onClick={handleSaveConfig}>
                      Save Changes
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
          </div>

          {mode === "semi-auto" && (
            <div className="mt-4 p-2 bg-pink-500/10 rounded border border-pink-500/20 text-xs text-pink-200/80 flex gap-2 items-center">
              <Heart className="h-4 w-4 shrink-0" />
              Swipe Right to Buy, Left to Sell - You control the trades!
            </div>
          )}
          {mode === "auto" && (
            <div className="mt-4 p-2 bg-emerald-500/10 rounded border border-emerald-500/20 text-xs text-emerald-200/80 flex gap-2 items-center">
              <PlayCircle className="h-4 w-4 shrink-0" />
              System is autonomously scanning for High-Confidence Signals...
            </div>
          )}
        </CardContent>
      </Card>

      {showTinderTrader && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm p-4">
          <div className="h-full max-w-4xl mx-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                <Heart className="h-6 w-6 text-pink-400" />
                Tinder for Stocks
              </h2>
              <Button
                variant="outline"
                onClick={() => setShowTinderTrader(false)}
                className="bg-red-500/10 border-red-500/30 text-red-300 hover:bg-red-500/20"
              >
                Close
              </Button>
            </div>
            <TinderTrader />
          </div>
        </div>
      )}
    </>
  );
}
