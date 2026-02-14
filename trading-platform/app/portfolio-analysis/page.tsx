'use client';

/**
 * Portfolio Analysis Page
 * 
 * ポートフォリオ分析ダッシュボードのメインページ
 */

import { PortfolioAnalysisDashboard } from '@/app/components/PortfolioAnalysisDashboard';
import { Navigation } from '@/app/components/Navigation';

export default function PortfolioAnalysisPage() {
  return (
    <div className="min-h-screen bg-[#0a0e14]">
      <Navigation />
      <main className="pt-16">
        <PortfolioAnalysisDashboard />
      </main>
    </div>
  );
}
