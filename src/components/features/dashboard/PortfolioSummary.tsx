"use client";

import React from "react";
import { Card } from "@/components/ui/card";
import {
  Wallet,
  TrendingUp,
  PieChart,
  ArrowUpRight,
  DollarSign,
} from "lucide-react";
import { api, getPortfolio } from "@/components/shared/utils/api";
import { useQuery } from "@tanstack/react-query";
import { GlitchText } from "@/components/ui/glitch-text";

import AssetAllocation from "./AssetAllocation";

export default function PortfolioSummary() {
  const { data: portfolio, isLoading } = useQuery({
    queryKey: ["portfolio"],
    queryFn: async () => {
      // Use proxy path for CORS avoidance
      const res = await fetch("/api/v1/portfolio");
      if (!res.ok) throw new Error("Failed to fetch portfolio");
      return res.json();
    },
    refetchInterval: 5000, // Realtime updates 5s
  });

  // Skeleton / Loading state could be added here
  const display = portfolio || {
    total_equity: 0,
    cash: 0,
    unrealized_pnl: 0,
    invested_amount: 0,
  };

  const pnlIsPositive = display.unrealized_pnl >= 0;

  return (
    <div className="flex flex-col gap-4">
      {/* Changed to grid-cols-2 to give more width for currency values */}
      <div className="grid grid-cols-2 gap-4">
        {/* Total Equity */}
        <Card className="glass-panel p-3 md:p-4 border-l-4 border-l-primary flex flex-col justify-between relative overflow-hidden group">
          <div className="absolute inset-0 bg-primary/5 opacity-0 group-hover:opacity-100 transition-opacity" />
          <div className="flex items-center justify-between z-10">
            <span className="text-[10px] md:text-xs text-muted-foreground uppercase tracking-wider truncate mr-2">
              総資産
            </span>
            <Wallet className="w-4 h-4 text-primary shrink-0" />
          </div>
          <div className="mt-2 z-10">
            <h2
              className="text-lg sm:text-xl xl:text-2xl font-bold font-sans tabular-nums tracking-tighter text-foreground truncate"
              title={`¥${display.total_equity.toLocaleString()}`}
            >
              <GlitchText
                text={`¥${display.total_equity.toLocaleString()}`}
                intensity="low"
                color="cyan"
                className="!text-foreground"
              />
            </h2>
          </div>
        </Card>

        {/* Unrealized PnL */}
        <Card
          className={`glass-panel p-3 md:p-4 border-l-4 ${pnlIsPositive ? "border-l-emerald-500" : "border-l-destructive"} flex flex-col justify-between relative overflow-hidden`}
        >
          <div
            className={`absolute inset-0 opacity-0 hover:opacity-10 transition-opacity ${pnlIsPositive ? "bg-emerald-500" : "bg-destructive"}`}
          />
          <div className="flex items-center justify-between z-10">
            <span className="text-[10px] md:text-xs text-muted-foreground uppercase tracking-wider truncate mr-2">
              評価損益
            </span>
            <TrendingUp
              className={`w-4 h-4 shrink-0 ${pnlIsPositive ? "text-emerald-500" : "text-destructive"}`}
            />
          </div>
          <div className="mt-2 z-10">
            <h2
              className={`text-lg sm:text-xl xl:text-2xl font-bold font-sans tabular-nums tracking-tighter truncate ${pnlIsPositive ? "text-emerald-400" : "text-destructive"}`}
            >
              {pnlIsPositive ? (
                `${pnlIsPositive ? "+" : ""}¥${display.unrealized_pnl.toLocaleString()}`
              ) : (
                <GlitchText
                  text={`${pnlIsPositive ? "+" : ""}¥${display.unrealized_pnl.toLocaleString()}`}
                  intensity="medium"
                  color="red"
                  className="!text-destructive"
                />
              )}
            </h2>
          </div>
        </Card>

        {/* Cash */}
        <Card className="glass-panel p-3 md:p-4 border-l-4 border-l-white/20 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[10px] md:text-xs text-muted-foreground uppercase tracking-wider truncate mr-2">
              余力
            </span>
            <DollarSign className="w-4 h-4 text-muted-foreground shrink-0" />
          </div>
          <div className="mt-2">
            <h2 className="text-lg sm:text-xl xl:text-2xl font-bold font-sans tabular-nums tracking-tighter text-foreground/80 truncate">
              ¥{display.cash.toLocaleString()}
            </h2>
          </div>
        </Card>

        {/* Invested */}
        <Card className="glass-panel p-3 md:p-4 border-l-4 border-l-blue-500 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[10px] md:text-xs text-muted-foreground uppercase tracking-wider truncate mr-2">
              投資額
            </span>
            <PieChart className="w-4 h-4 text-blue-500 shrink-0" />
          </div>
          <div className="mt-2">
            <h2 className="text-lg sm:text-xl xl:text-2xl font-bold font-sans tabular-nums tracking-tighter text-foreground/80 truncate">
              ¥{display.invested_amount.toLocaleString()}
            </h2>
          </div>
        </Card>
      </div>

      {/* Sci-Fi Asset Allocation Vis */}
      <div className="glass-map p-4 rounded-xl border border-white/10 relative overflow-hidden min-h-[300px]">
        <div className="absolute top-2 left-4 text-[10px] text-muted-foreground/60 uppercase tracking-[0.3em] z-10">
          Orbital Asset View (資産配分)
        </div>
        <div className="w-full h-full flex items-center justify-center">
          <AssetAllocation />
        </div>
      </div>
    </div>
  );
}
