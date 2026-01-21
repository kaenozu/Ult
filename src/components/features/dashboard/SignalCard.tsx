"use client";

import React from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { TrendingUp, TrendingDown, ArrowRight, Zap } from "lucide-react";
import { api, checkHealth, getSignal } from "@/components/shared/utils/api";
import { SignalResponse } from "@/types";
import { useQuery } from "@tanstack/react-query";

interface SignalCardProps {
  ticker: string;
  name: string;
}

export default function SignalCard({ ticker, name }: SignalCardProps) {
  const { data: signal, isLoading } = useQuery({
    queryKey: ["signal", ticker],
    queryFn: () => getSignal(ticker),
    refetchInterval: 30000,
  });

  // Mock data if API fails or loading (for visual dev)
  const displaySignal = signal || {
    signal: 0,
    confidence: 0,
    explanation: "Waiting for analysis...",
    strategy: "N/A",
    entry_price: 0,
    stop_loss: 0,
    take_profit: 0,
  };

  const signalValue = typeof displaySignal.signal === 'number' ? displaySignal.signal : 0;
  const isBullish = signalValue > 0;
  const isBearish = signalValue < 0;
  const isNeutral = signalValue === 0;

  return (
    <Card className="glass-panel border-white/5 p-5 relative overflow-hidden transition-all duration-300 hover:border-primary/30 hover:shadow-[0_0_20px_rgba(0,240,255,0.1)] group flex flex-col justify-between h-full min-h-[180px]">
      {/* Header */}
      <div className="flex justify-between items-start mb-2">
        <div>
          <div className="flex items-baseline gap-2">
            <h3 className="text-2xl font-bold font-sans tracking-tight">
              {ticker}
            </h3>
            <span className="text-xs text-muted-foreground font-medium">
              {name}
            </span>
          </div>
          <div className="text-[10px] text-primary/70 uppercase tracking-widest mt-1">
            Strategy: {displaySignal.strategy}
          </div>
        </div>

        {/* Confidence Ring (Simplified) */}
        <div className="relative flex items-center justify-center w-12 h-12">
          <svg className="w-full h-full transform -rotate-90">
            <circle
              cx="24"
              cy="24"
              r="20"
              stroke="currentColor"
              strokeWidth="4"
              fill="transparent"
              className="text-muted/20"
            />
            <circle
              cx="24"
              cy="24"
              r="20"
              stroke="currentColor"
              strokeWidth="4"
              fill="transparent"
              className={
                isBullish
                  ? "text-primary"
                  : isBearish
                    ? "text-destructive"
                    : "text-muted-foreground"
              }
              strokeDasharray={125.6}
              strokeDashoffset={125.6 * (1 - displaySignal.confidence)}
            />
          </svg>
          <span className="absolute text-xs font-bold">
            {Math.round(displaySignal.confidence * 100)}%
          </span>
        </div>
      </div>

      {/* Signal Status */}
      <div className="mt-2 mb-4">
        {isBullish && (
          <div className="flex items-center gap-2 text-primary neon-text mb-2">
            <TrendingUp className="w-5 h-5" />
            <span className="text-lg font-bold">強気買い</span>
          </div>
        )}
        {isBearish && (
          <div className="flex items-center gap-2 text-destructive neon-text mb-2">
            <TrendingDown className="w-5 h-5" />
            <span className="text-lg font-bold">売り</span>
          </div>
        )}
        {isNeutral && (
          <div className="flex items-center gap-2 text-muted-foreground mb-2">
            <ArrowRight className="w-5 h-5" />
            <span className="text-lg font-bold">様子見</span>
          </div>
        )}

        {/* Actionable Setup (Sniper Mode) */}
        {displaySignal.entry_price && (
          <div className="grid grid-cols-3 gap-2 text-xs font-mono bg-white/5 p-2 rounded mb-2 border border-white/10">
            <div className="flex flex-col">
              <span className="text-muted-foreground">エントリー</span>
              <span className="font-bold text-white">
                ¥{displaySignal.entry_price?.toLocaleString()}
              </span>
            </div>
            <div className="flex flex-col">
              <span className="text-muted-foreground">利確</span>
              <span className="font-bold text-emerald-400">
                ¥{displaySignal.take_profit?.toLocaleString()}
              </span>
            </div>
            <div className="flex flex-col">
              <span className="text-muted-foreground">損切</span>
              <span className="font-bold text-red-400">
                ¥{displaySignal.stop_loss?.toLocaleString()}
              </span>
            </div>
          </div>
        )}

        <p className="text-xs text-muted-foreground mt-1 line-clamp-2 min-h-[2.5em]">
          {displaySignal.explanation}
        </p>
      </div>

      {/* Action */}
      <Button
        variant="outline"
        className="w-full glass-button hover:text-primary hover:border-primary/50 group-hover:bg-primary/5 active:scale-95 transition-all"
        onClick={async () => {
          if (!displaySignal.entry_price) return;
          const confirmed = window.confirm(
            `${ticker}の注文を実行しますか？\n\nEntry: ¥${displaySignal.entry_price}\nStop: ¥${displaySignal.stop_loss}\nTarget: ¥${displaySignal.take_profit}`,
          );
          if (!confirmed) return;

          try {
            const res = await fetch("/api/v1/trades", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                symbol: ticker,
                action: isBullish ? "BUY" : "SELL",
                quantity: 100, // Default 100 shares for paper trading
                price: displaySignal.entry_price,
                order_type: "market",
              }),
            });
            if (res.ok) {
              alert(`注文完了: ${ticker}`);
            } else {
              alert("注文失敗");
            }
          } catch (e) {
            console.error(e);
            alert("通信エラー");
          }
        }}
      >
        <Zap className="w-4 h-4 mr-2" />
        注文実行
      </Button>

      {/* Background Gradient */}
      <div
        className={`absolute -right-10 -bottom-10 w-32 h-32 rounded-full blur-[50px] opacity-10 
        ${isBullish ? "bg-primary" : isBearish ? "bg-destructive" : "bg-gray-500"}`}
      />
    </Card>
  );
}
