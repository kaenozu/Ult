"use client";

import React from "react";
import MatrixRain from "@/components/ui/matrix-rain";
import MatrixPortfolioSummary from "@/components/features/dashboard/MatrixPortfolioSummary";
import MatrixPositionList from "@/components/features/dashboard/MatrixPositionList";
import { Wallet } from "lucide-react";

export default function PortfolioPage() {
  return (
    <MatrixRain intensity={0.4}>
      <div className="space-y-6">
        <header className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 border border-green-500/60 bg-black/80">
              <Wallet className="w-6 h-6 text-green-400" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-green-400 font-mono">
              &gt; PORTFOLIO MATRIX
            </h1>
          </div>
        </header>

        <div className="space-y-8">
          <MatrixPortfolioSummary />
          <MatrixPositionList />
        </div>
      </div>
    </MatrixRain>
  );
}
