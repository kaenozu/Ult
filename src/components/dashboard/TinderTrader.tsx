"use client";

import React, { useState, useEffect, useCallback } from "react";
import TinderTradeCard from "./TinderTradeCard";
import { useQuery } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Sparkles,
  Zap,
  Trophy,
  Flame,
  Target,
  TrendingUp,
  RefreshCw,
  Play,
  Pause,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useSoundEffects } from "@/lib/sounds";

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

interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: React.ReactNode;
  unlocked: boolean;
}

export default function TinderTrader() {
  const [currentSignalIndex, setCurrentSignalIndex] = useState(0);
  const [stats, setStats] = useState<TradeStats>({
    streak: 0,
    total: 0,
    accuracy: 0,
    level: 1,
    experience: 0,
  });
  const [showAchievement, setShowAchievement] = useState<Achievement | null>(
    null,
  );
  const [isPaused, setIsPaused] = useState(false);
  const { playSwipeSound, playAchievementSound } = useSoundEffects();

  // Mock trade signals
  const { data: signals = [], isLoading } = useQuery({
    queryKey: ["trade-signals"],
    queryFn: async (): Promise<TradeSignal[]> => {
      // Mock data - in production this would come from your AI signals API
      return [
        {
          id: "1",
          ticker: "6857.T",
          name: "アドバンテスト",
          price: 8420,
          change: 3.2,
          confidence: 87,
          action: "BUY",
          reason:
            "Strong earnings momentum + semiconductor demand surge. Technical indicators show bullish divergence with RSI oversold bounce.",
          risk: "MEDIUM",
          potential: 12.5,
        },
        {
          id: "2",
          ticker: "8035.T",
          name: "東京エレクトロン",
          price: 28500,
          change: -1.8,
          confidence: 72,
          action: "SELL",
          reason:
            "Overbought conditions + profit-taking signals. MACD showing bearish crossover with decreasing volume.",
          risk: "LOW",
          potential: 8.3,
        },
        {
          id: "3",
          ticker: "6758.T",
          name: "ソニーG",
          price: 12450,
          change: 1.5,
          confidence: 91,
          action: "BUY",
          reason:
            "PlayStation sales exceeding expectations + entertainment division growth. Breaking above key resistance level.",
          risk: "LOW",
          potential: 15.7,
        },
        {
          id: "4",
          ticker: "9984.T",
          name: "ソフトバンクG",
          price: 1850,
          change: -2.3,
          confidence: 68,
          action: "SELL",
          reason:
            "Tech sector rotation + high valuations concerns. Support level at ¥1,800 with increasing selling pressure.",
          risk: "HIGH",
          potential: 6.8,
        },
        {
          id: "5",
          ticker: "6920.T",
          name: "レーザーテック",
          price: 15600,
          change: 4.1,
          confidence: 85,
          action: "BUY",
          reason:
            "EUV equipment demand boom + new orders secured. Breaking out of consolidation pattern with high volume.",
          risk: "MEDIUM",
          potential: 18.2,
        },
      ];
    },
    refetchInterval: 30000,
  });

  const achievements: Achievement[] = [
    {
      id: "first_trade",
      name: "First Swipe",
      description: "Made your first trade decision",
      icon: <Sparkles className="h-4 w-4" />,
      unlocked: stats.total > 0,
    },
    {
      id: "streak_5",
      name: "Hot Hand",
      description: "5 decisions in a row",
      icon: <Flame className="h-4 w-4" />,
      unlocked: stats.streak >= 5,
    },
    {
      id: "streak_10",
      name: "Trading Master",
      description: "10 decisions in a row",
      icon: <Trophy className="h-4 w-4" />,
      unlocked: stats.streak >= 10,
    },
    {
      id: "accuracy_80",
      name: "Sharpshooter",
      description: "80% accuracy over 20 trades",
      icon: <Target className="h-4 w-4" />,
      unlocked: stats.total >= 20 && stats.accuracy >= 80,
    },
    {
      id: "level_5",
      name: "Expert Trader",
      description: "Reached level 5",
      icon: <Zap className="h-4 w-4" />,
      unlocked: stats.level >= 5,
    },
  ];

  const checkAchievements = useCallback(() => {
    achievements.forEach((achievement) => {
      if (achievement.unlocked && !showAchievement) {
        setShowAchievement(achievement);
        playAchievementSound();
        setTimeout(() => setShowAchievement(null), 3000);
      }
    });
  }, [achievements, showAchievement, playAchievementSound]);

  useEffect(() => {
    checkAchievements();
  }, [stats, checkAchievements]);

  const handleDecision = useCallback(
    (signalId: string, decision: "BUY" | "SELL" | "SKIP") => {
      const newTotal = stats.total + 1;
      const newStreak = decision !== "SKIP" ? stats.streak + 1 : 0;
      const newExperience = Math.min(
        100,
        stats.experience + (decision !== "SKIP" ? 10 : 5),
      );
      const newLevel = newExperience >= 100 ? stats.level + 1 : stats.level;

      setStats((prev) => ({
        ...prev,
        total: newTotal,
        streak: newStreak,
        experience: newExperience >= 100 ? 0 : newExperience,
        level: newLevel,
        accuracy: Math.round((prev.streak / Math.max(1, newTotal)) * 100),
      }));

      // Play swipe sound
      if (decision !== "SKIP") {
        playSwipeSound();
      }

      // Move to next signal
      setTimeout(() => {
        setCurrentSignalIndex((prev) => (prev + 1) % signals.length);
      }, 300);
    },
    [stats, signals.length, playSwipeSound],
  );

  const currentSignal = signals[currentSignalIndex];

  if (isLoading || !currentSignal) {
    return (
      <Card className="w-full h-[700px] bg-gradient-to-br from-slate-900 via-purple-900/20 to-slate-900 border border-purple-500/30">
        <CardContent className="h-full flex items-center justify-center">
          <div className="text-center space-y-4">
            <RefreshCw className="h-12 w-12 animate-spin text-purple-400" />
            <p className="text-xl text-muted-foreground">Finding trades...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="relative w-full h-full">
      {/* Achievement Popup */}
      <Dialog open={!!showAchievement}>
        <DialogContent className="bg-gradient-to-br from-yellow-500/20 to-orange-500/20 border-yellow-500/50">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-yellow-400">
              {showAchievement?.icon}
              Achievement Unlocked!
            </DialogTitle>
            <DialogDescription>
              <div className="text-center space-y-2">
                <p className="text-lg font-bold text-white">
                  {showAchievement?.name}
                </p>
                <p className="text-sm text-white/80">
                  {showAchievement?.description}
                </p>
              </div>
            </DialogDescription>
          </DialogHeader>
        </DialogContent>
      </Dialog>

      {/* Main Game Interface */}
      <Card className="w-full h-full bg-gradient-to-br from-slate-900 via-purple-900/10 to-slate-900 border border-purple-500/30">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-xl">
              <Sparkles className="h-6 w-6 text-purple-400" />
              Tinder for Stocks
              <Badge className="bg-purple-500/20 text-purple-300 border-purple-500/30">
                SEMI-AUTO
              </Badge>
            </CardTitle>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsPaused(!isPaused)}
              className="bg-purple-500/10 border-purple-500/30 text-purple-300"
            >
              {isPaused ? (
                <Play className="h-4 w-4" />
              ) : (
                <Pause className="h-4 w-4" />
              )}
            </Button>
          </div>

          {/* Stats Bar */}
          <div className="grid grid-cols-5 gap-4">
            <div className="text-center">
              <div className="flex items-center justify-center gap-1">
                <Flame className="h-4 w-4 text-orange-400" />
                <span className="text-lg font-bold">{stats.streak}</span>
              </div>
              <p className="text-xs text-muted-foreground">Streak</p>
            </div>
            <div className="text-center">
              <div className="flex items-center justify-center gap-1">
                <Target className="h-4 w-4 text-blue-400" />
                <span className="text-lg font-bold">{stats.total}</span>
              </div>
              <p className="text-xs text-muted-foreground">Total</p>
            </div>
            <div className="text-center">
              <div className="flex items-center justify-center gap-1">
                <TrendingUp className="h-4 w-4 text-emerald-400" />
                <span className="text-lg font-bold">{stats.accuracy}%</span>
              </div>
              <p className="text-xs text-muted-foreground">Accuracy</p>
            </div>
            <div className="text-center">
              <div className="flex items-center justify-center gap-1">
                <Trophy className="h-4 w-4 text-yellow-400" />
                <span className="text-lg font-bold">{stats.level}</span>
              </div>
              <p className="text-xs text-muted-foreground">Level</p>
            </div>
            <div className="text-center">
              <div className="text-xs text-muted-foreground mb-1">XP</div>
              <Progress value={stats.experience} className="h-2" />
            </div>
          </div>
        </CardHeader>

        <CardContent className="h-[600px] relative">
          <TinderTradeCard
            signal={currentSignal}
            onDecision={handleDecision}
            stats={stats}
          />
        </CardContent>
      </Card>

      {/* Achievement Progress Bar */}
      <div className="absolute bottom-4 left-4 right-4 bg-slate-900/90 backdrop-blur rounded-lg p-3">
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-muted-foreground">
            Achievements
          </span>
          <div className="flex-1 flex gap-1">
            {achievements.map((achievement) => (
              <div
                key={achievement.id}
                className={cn(
                  "w-8 h-8 rounded-full flex items-center justify-center",
                  achievement.unlocked
                    ? "bg-gradient-to-r from-yellow-500 to-orange-500 text-white"
                    : "bg-slate-700 text-slate-500",
                )}
              >
                {achievement.icon}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
