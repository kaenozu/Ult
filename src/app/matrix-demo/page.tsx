"use client";

import React from "react";
import MatrixRain from "@/components/ui/matrix-rain";
import MatrixPortfolioSummary from "@/components/dashboard/MatrixPortfolioSummary";
import MatrixPositionList from "@/components/dashboard/MatrixPositionList";

export default function MatrixDemo() {
  return (
    <MatrixRain intensity={0.5}>
      <div className="min-h-screen p-8">
        <div className="max-w-4xl mx-auto space-y-8">
          {/* Demo Header */}
          <div className="text-center">
            <h1 className="text-4xl font-mono text-green-400 mb-4 tracking-wider">
              &gt; MATRIX UI DEMO
            </h1>
            <div className="text-sm font-mono text-green-500/60 animate-pulse">
              STRUCTURED TABLES ELIMINATED // MATRIX RAIN ACTIVATED
            </div>
          </div>

          {/* Demo Components */}
          <div className="space-y-8">
            <div>
              <h2 className="text-xl font-mono text-green-400 mb-4">
                [PORTFOLIO_SUMMARY]
              </h2>
              <div className="border border-green-500/30 p-4">
                <MatrixPortfolioSummary />
              </div>
            </div>

            <div>
              <h2 className="text-xl font-mono text-green-400 mb-4">
                [POSITION_LIST]
              </h2>
              <div className="border border-green-500/30 p-4">
                <MatrixPositionList />
              </div>
            </div>
          </div>

          {/* Demo Footer */}
          <div className="text-center mt-12">
            <div className="text-xs font-mono text-green-500/40">
              &gt; Boring spreadsheet UI successfully terminated
            </div>
            <div className="text-xs font-mono text-green-500/40 mt-2">
              &gt; Matrix rain integration complete
            </div>
          </div>
        </div>
      </div>
    </MatrixRain>
  );
}
