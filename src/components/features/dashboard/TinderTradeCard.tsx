"use client";

import React, { useState, useRef } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Heart,
  X,
  Zap,
  Target,
  Trophy,
  Flame,
  Star,
  ArrowRight,
  ArrowLeft,
} from "lucide-react";
import { cn } from "@/components/shared/utils/utils";
import { useSoundEffects } from "@/components/shared/utils/sounds";

interface TradeSignal {
  id: string;
  ticker: string;
  name: string;
  price: number;
  change: number;
  confidence: number;
  action: "BUY" | "SELL";
  reason: string;
  risk: "LOW" | "MEDIUM" | "HIGH";
  potential: number;
}

interface TradeStats {
  streak: number;
  total: number;
  accuracy: number;
  level: number;
  experience: number;
}

interface TinderTradeCardProps {
  signal: TradeSignal;
  onDecision: (signalId: string, decision: "BUY" | "SELL" | "SKIP") => void;
  stats: TradeStats;
}

export default function TinderTradeCard({
  signal,
  onDecision,
  stats,
}: TinderTradeCardProps) {
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0, rotate: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [decision, setDecision] = useState<"BUY" | "SELL" | "SKIP" | null>(
    null,
  );
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [pendingAction, setPendingAction] = useState<
    "BUY" | "SELL" | "SKIP" | null
  >(null);
  const [holdProgress, setHoldProgress] = useState(0);
  const [isHolding, setIsHolding] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);
  const { playSwipeSound } = useSoundEffects();
  const startX = useRef(0);
  const startY = useRef(0);
  const holdTimerRef = useRef<NodeJS.Timeout | null>(null);

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    startX.current = e.clientX - dragOffset.x;
    startY.current = e.clientY - dragOffset.y;
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    const newX = e.clientX - startX.current;
    const newY = e.clientY - startY.current;
    setDragOffset({ x: newX, y: newY, rotate: 0 });

    // Determine decision based on drag direction
    if (Math.abs(newX) > 100) {
      if (newX > 0) {
        setDecision("BUY");
      } else {
        setDecision("SELL");
      }
    } else {
      setDecision(null);
    }
  };

  const handleMouseUp = () => {
    if (!isDragging) return;
    setIsDragging(false);

    if (decision) {
      initiateConfirmation(decision);
    } else {
      // Reset position if no decision
      setDragOffset({ x: 0, y: 0, rotate: 0 });
    }
  };

  const initiateConfirmation = (action: "BUY" | "SELL" | "SKIP") => {
    setPendingAction(action);
    setShowConfirmation(true);
    setHoldProgress(0);
    setIsHolding(false);
  };

  const startHold = () => {
    if (!pendingAction) return;
    setIsHolding(true);
    const duration = 1500; // 1.5 seconds to confirm
    const interval = 50; // update every 50ms
    const steps = duration / interval;
    let currentStep = 0;

    holdTimerRef.current = setInterval(() => {
      currentStep++;
      const progress = (currentStep / steps) * 100;
      setHoldProgress(progress);

      if (currentStep >= steps) {
        if (holdTimerRef.current) {
          clearInterval(holdTimerRef.current);
        }
        confirmAction();
      }
    }, interval);
  };

  const stopHold = () => {
    if (holdTimerRef.current) {
      clearInterval(holdTimerRef.current);
    }
    setIsHolding(false);
    setHoldProgress(0);
  };

  const confirmAction = () => {
    if (pendingAction && pendingAction !== "SKIP") {
      handleDecision(pendingAction);
    } else if (pendingAction === "SKIP") {
      handleDecision("SKIP");
    }
    setShowConfirmation(false);
    setPendingAction(null);
    setHoldProgress(0);
  };

  const cancelConfirmation = () => {
    if (holdTimerRef.current) {
      clearInterval(holdTimerRef.current);
    }
    setShowConfirmation(false);
    setPendingAction(null);
    setHoldProgress(0);
    setIsHolding(false);
  };

  const handleDecision = (action: "BUY" | "SELL" | "SKIP") => {
    onDecision(signal.id, action);

    // Animate card away
    if (action === "BUY") {
      setDragOffset({ x: 500, y: -50, rotate: 30 });
    } else if (action === "SELL") {
      setDragOffset({ x: -500, y: -50, rotate: -30 });
    }

    setTimeout(() => {
      setDragOffset({ x: 0, y: 0, rotate: 0 });
      setDecision(null);
    }, 300);
  };

  const getRiskColor = (risk: string) => {
    switch (risk) {
      case "LOW":
        return "bg-emerald-500";
      case "MEDIUM":
        return "bg-yellow-500";
      case "HIGH":
        return "bg-red-500";
      default:
        return "bg-gray-500";
    }
  };

  const getActionColor = (action: string) => {
    return action === "BUY" ? "text-emerald-400" : "text-red-400";
  };

  const rotation = dragOffset.x * 0.1;
  const opacity = Math.max(0, 1 - Math.abs(dragOffset.x) / 500);

  return (
    <div className="relative w-full h-full flex items-center justify-center">
      {/* Confirmation Modal */}
      {showConfirmation && pendingAction && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-slate-900 border border-purple-500/50 rounded-xl p-6 max-w-sm mx-4 shadow-2xl">
            <div className="text-center mb-6">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-slate-800 flex items-center justify-center">
                {pendingAction === "BUY" ? (
                  <Heart className="h-8 w-8 text-emerald-400" />
                ) : pendingAction === "SELL" ? (
                  <X className="h-8 w-8 text-red-400" />
                ) : (
                  <ArrowRight className="h-8 w-8 text-gray-400" />
                )}
              </div>
              <h3 className="text-xl font-bold text-white mb-2">
                Confirm {pendingAction}?
              </h3>
              <p className="text-sm text-white/60">
                {pendingAction === "BUY"
                  ? `Buy ${signal.ticker} at ¥${signal.price.toLocaleString()}`
                  : pendingAction === "SELL"
                    ? `Sell ${signal.ticker} at ¥${signal.price.toLocaleString()}`
                    : `Skip ${signal.ticker}`}
              </p>
              <p className="text-xs text-yellow-400 mt-2">
                Hold button for 1.5s to confirm
              </p>
            </div>

            {/* Hold to Confirm Button */}
            <div className="relative">
              <Button
                size="lg"
                className={cn(
                  "w-full font-bold text-lg transition-all",
                  pendingAction === "BUY"
                    ? "bg-emerald-600 hover:bg-emerald-500"
                    : pendingAction === "SELL"
                      ? "bg-red-600 hover:bg-red-500"
                      : "bg-gray-600 hover:bg-gray-500",
                )}
                onMouseDown={startHold}
                onMouseUp={stopHold}
                onMouseLeave={stopHold}
                onTouchStart={startHold}
                onTouchEnd={stopHold}
              >
                {isHolding ? "Confirming..." : `HOLD TO ${pendingAction}`}
              </Button>
              {holdProgress > 0 && (
                <div
                  className="absolute bottom-0 left-0 h-1 bg-white rounded-full transition-all duration-50"
                  style={{ width: `${holdProgress}%` }}
                />
              )}
            </div>

            {/* Double Click Alternative */}
            <Button
              variant="ghost"
              size="sm"
              onClick={confirmAction}
              className="w-full mt-3 text-white/60 hover:text-white"
            >
              Or double-click to confirm
            </Button>

            {/* Cancel Button */}
            <Button
              variant="outline"
              size="sm"
              onClick={cancelConfirmation}
              className="w-full mt-2 border-slate-600 text-slate-400 hover:text-white hover:border-white"
            >
              Cancel
            </Button>
          </div>
        </div>
      )}

      {/* Decision Indicators */}
      {isDragging && (
        <>
          <div className="absolute top-20 left-10 z-20">
            <div
              className={cn(
                "flex items-center gap-2 px-4 py-2 rounded-full font-bold text-2xl animate-pulse",
                decision === "SELL" ? "bg-red-500 text-white" : "opacity-30",
              )}
            >
              <X className="h-8 w-8" />
              SELL
            </div>
          </div>
          <div className="absolute top-20 right-10 z-20">
            <div
              className={cn(
                "flex items-center gap-2 px-4 py-2 rounded-full font-bold text-2xl animate-pulse",
                decision === "BUY" ? "bg-emerald-500 text-white" : "opacity-30",
              )}
            >
              <Heart className="h-8 w-8" />
              BUY
            </div>
          </div>
        </>
      )}

      {/* Stats Bar */}
      <div className="absolute top-0 left-0 right-0 z-10 p-4">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Flame className="h-5 w-5 text-orange-400" />
            <span className="text-lg font-bold">{stats.streak} Streak</span>
          </div>
          <div className="flex items-center gap-2">
            <Trophy className="h-5 w-5 text-yellow-400" />
            <span className="text-lg font-bold">Level {stats.level}</span>
          </div>
        </div>
        <Progress value={stats.experience} className="h-2" />
      </div>

      {/* Trade Card */}
      <div
        ref={cardRef}
        className="relative cursor-grab active:cursor-grabbing"
        style={{
          transform: `translateX(${dragOffset.x}px) translateY(${dragOffset.y}px) rotate(${rotation}deg)`,
          opacity,
          transition: isDragging ? "none" : "all 0.3s ease",
        }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        <Card className="w-80 h-[600px] bg-gradient-to-br from-slate-900 via-purple-900/20 to-slate-900 border border-purple-500/30 shadow-2xl">
          <CardContent className="p-0 h-full flex flex-col">
            {/* Header */}
            <div className="relative h-48 bg-gradient-to-br from-purple-600/20 to-pink-600/20 p-4 flex items-center justify-center">
              <div className="absolute top-2 left-2">
                <Badge
                  className={cn("text-xs font-bold", getRiskColor(signal.risk))}
                >
                  {signal.risk}
                </Badge>
              </div>
              <div className="text-center">
                <h1 className="text-3xl font-bold text-white mb-1">
                  {signal.ticker}
                </h1>
                <p className="text-sm text-white/80">{signal.name}</p>
                <div className="flex items-center justify-center gap-4 mt-3">
                  <div>
                    <p className="text-2xl font-bold text-white">
                      ¥{signal.price.toLocaleString()}
                    </p>
                    <p
                      className={cn(
                        "text-sm font-medium",
                        getActionColor(signal.action),
                      )}
                    >
                      {signal.action} · {signal.change > 0 ? "+" : ""}
                      {signal.change}%
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Content */}
            <div className="flex-1 p-4 space-y-4">
              {/* AI Confidence */}
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">
                  AI Confidence
                </span>
                <div className="flex items-center gap-2">
                  <Progress value={signal.confidence} className="w-20 h-2" />
                  <span className="text-sm font-medium">
                    {signal.confidence}%
                  </span>
                </div>
              </div>

              {/* Potential Returns */}
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Potential</span>
                <div className="flex items-center gap-1">
                  <Zap className="h-4 w-4 text-yellow-400" />
                  <span className="font-medium text-yellow-400">
                    +{signal.potential}%
                  </span>
                </div>
              </div>

              {/* AI Reasoning */}
              <div className="bg-gradient-to-r from-blue-500/10 to-purple-500/10 rounded-lg p-3 border border-blue-500/20">
                <div className="flex items-center gap-2 mb-2">
                  <Target className="h-4 w-4 text-blue-400" />
                  <span className="text-sm font-medium text-blue-400">
                    AI Analysis
                  </span>
                </div>
                <p className="text-xs text-white/80 leading-relaxed">
                  {signal.reason}
                </p>
              </div>

              {/* Fun Achievement */}
              {stats.streak > 5 && (
                <div className="flex items-center justify-center gap-2 p-2 bg-gradient-to-r from-yellow-500/20 to-orange-500/20 rounded-lg border border-yellow-500/30">
                  <Star className="h-4 w-4 text-yellow-400 animate-pulse" />
                  <span className="text-xs font-medium text-yellow-400">
                    Hot Streak Master!
                  </span>
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="p-4 flex gap-3">
              <Button
                variant="outline"
                size="lg"
                onClick={() => initiateConfirmation("SELL")}
                className="flex-1 bg-red-500/10 border-red-500/30 text-red-400 hover:bg-red-500/20 hover:text-red-300"
              >
                <ArrowLeft className="h-5 w-5 mr-2" />
                SELL
              </Button>
              <Button
                variant="outline"
                size="lg"
                onClick={() => initiateConfirmation("SKIP")}
                className="px-4 bg-gray-500/10 border-gray-500/30 text-gray-400 hover:bg-gray-500/20"
              >
                SKIP
              </Button>
              <Button
                variant="outline"
                size="lg"
                onClick={() => initiateConfirmation("BUY")}
                className="flex-1 bg-emerald-500/10 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20 hover:text-emerald-300"
              >
                <ArrowRight className="h-5 w-5 mr-2" />
                BUY
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
