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
import AssetAllocation from "./AssetAllocation";
import { GlitchText } from "@/components/ui/glitch-text";

interface MatrixDataCard {
  title: string;
  value: string;
  icon: React.ReactNode;
  color: string;
  glitch?: boolean;
}

function MatrixDataCard({
  title,
  value,
  icon,
  color,
  glitch = false,
}: MatrixDataCard) {
  const getColorClass = (c: string) => {
    switch (c) {
      case "green":
        return {
          border: "border-green-500/40",
          text: "text-green-400",
          bg: "from-green-500/5 to-transparent",
        };
      case "emerald":
        return {
          border: "border-emerald-500/40",
          text: "text-emerald-400",
          bg: "from-emerald-500/5 to-transparent",
        };
      case "red":
        return {
          border: "border-red-500/40",
          text: "text-red-400",
          bg: "from-red-500/5 to-transparent",
        };
      case "blue":
        return {
          border: "border-blue-500/40",
          text: "text-blue-400",
          bg: "from-blue-500/5 to-transparent",
        };
      case "cyan":
        return {
          border: "border-cyan-500/40",
          text: "text-cyan-400",
          bg: "from-cyan-500/5 to-transparent",
        };
      default:
        return {
          border: "border-green-500/40",
          text: "text-green-400",
          bg: "from-green-500/5 to-transparent",
        };
    }
  };

  const colors = getColorClass(color);

  return (
    <div
      className={`
      relative border ${colors.border} bg-slate-900/40 backdrop-blur-md p-4
      ${glitch ? "animate-pulse" : ""}
      hover:${colors.border.replace("40", "70")} hover:bg-slate-900/50 transition-all duration-300 group
    `}
    >
      <div className="absolute inset-0 bg-gradient-to-b ${colors.bg} opacity-50 pointer-events-none" />

      <div className="flex items-center justify-between mb-2 relative z-10">
        <span
          className={`text-xs ${colors.text}/80 font-mono uppercase tracking-wider`}
        >
          [{title}]
        </span>
        <div className={colors.text}>{icon}</div>
      </div>

      <div className="text-xl font-mono text-white tracking-wider break-all relative z-10 drop-shadow-lg">
        <GlitchText
          text={value}
          intensity={glitch ? "high" : "low"}
          color={
            color === "green" || color === "emerald"
              ? "green"
              : color === "red"
                ? "red"
                : color === "blue"
                  ? "cyan"
                  : "cyan"
          }
          className="!text-white !drop-shadow-lg"
        />
      </div>

      <div
        className="absolute bottom-1 right-2 text-[8px] font-mono text-green-500/20 opacity-0 
        group-hover:opacity-100 transition-opacity duration-500"
      >
        {Math.random() > 0.5 ? "ACTIVE" : "STREAM"}
      </div>
    </div>
  );
}

export default function MatrixPortfolioSummary() {
  const { data: portfolio, isLoading } = useQuery({
    queryKey: ["portfolio"],
    queryFn: async () => {
      const res = await fetch("/api/v1/portfolio");
      if (!res.ok) throw new Error("Failed to fetch portfolio");
      return res.json();
    },
    refetchInterval: 5000,
  });

  const display = portfolio || {
    total_equity: 0,
    cash: 0,
    unrealized_pnl: 0,
    invested_amount: 0,
  };

  const pnlIsPositive = display.unrealized_pnl >= 0;

  return (
    <div className="space-y-6 p-6">
      {/* Matrix Grid Header */}
      <div className="text-center mb-8">
        <h1 className="text-3xl font-mono text-green-400 mb-2 tracking-wider">
          &gt; PORTFOLIO MATRIX INITIALIZED
        </h1>
        <div className="text-xs font-mono text-green-500/60 animate-pulse">
          SYSTEM ONLINE // REALTIME DATA STREAM ACTIVE
        </div>
      </div>

      {/* Data Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <MatrixDataCard
          title="TOTAL_ASSETS"
          value={`¥${display.total_equity.toLocaleString()}`}
          icon={<Wallet className="w-4 h-4" />}
          color="green"
          glitch={Math.random() > 0.7}
        />

        <MatrixDataCard
          title="PnL_STATUS"
          value={`${pnlIsPositive ? "+" : ""}¥${display.unrealized_pnl.toLocaleString()}`}
          icon={<TrendingUp className="w-4 h-4" />}
          color={pnlIsPositive ? "emerald" : "red"}
          glitch={!pnlIsPositive}
        />

        <MatrixDataCard
          title="CASH_FLOW"
          value={`¥${display.cash.toLocaleString()}`}
          icon={<DollarSign className="w-4 h-4" />}
          color="blue"
        />

        <MatrixDataCard
          title="INVESTED"
          value={`¥${display.invested_amount.toLocaleString()}`}
          icon={<PieChart className="w-4 h-4" />}
          color="cyan"
        />
      </div>

      {/* Asset Allocation Matrix */}
      <div className="border border-green-500/40 bg-slate-900/40 backdrop-blur-md p-6 rounded-none">
        <div className="text-xs font-mono text-green-400/80 uppercase tracking-wider mb-4 relative z-10">
          <GlitchText
            text="[ASSET_ALLOCATION_MATRIX]"
            intensity="low"
            color="green"
            className="!text-green-400/80"
          />
        </div>
        <div className="h-[300px] flex items-center justify-center relative z-10">
          <AssetAllocation />
        </div>
      </div>
    </div>
  );
}
