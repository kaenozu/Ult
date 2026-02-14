/**
 * Pattern Analysis Panel Component
 * 
 * Displays trading patterns discovered from journal analysis
 * with statistical metrics and recommendations.
 */

'use client';

import { useEffect } from 'react';
import { useExtendedJournalStore } from '@/app/store/journalStore';
import { TradePattern } from '@/app/lib/trading/patternRecognition';
import { cn, formatCurrency, formatPercent } from '@/app/lib/utils';

export function PatternAnalysisPanel() {
  const { patternReport, isAnalyzingPatterns, analyzePatterns, initializeAIAdvisor } = useExtendedJournalStore();

  useEffect(() => {
    // Initialize AI advisor on mount
    initializeAIAdvisor();
  }, [initializeAIAdvisor]);

  if (isAnalyzingPatterns) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-[#92adc9]">パターンを分析中...</p>
        </div>
      </div>
    );
  }

  if (!patternReport || patternReport.totalPatterns === 0) {
    return (
      <div className="bg-[#141e27] border border-[#233648] rounded-lg p-6">
        <div className="text-center py-8">
          <svg className="w-16 h-16 mx-auto mb-4 text-[#92adc9] opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
          <h3 className="text-white font-medium mb-2">パターンが見つかりません</h3>
          <p className="text-[#92adc9] text-sm mb-4">
            3回以上の取引が完了すると、パターン分析が有効になります。
          </p>
          <button
            onClick={analyzePatterns}
            className="px-4 py-2 bg-primary text-white text-sm font-medium rounded-lg hover:bg-primary/80 transition-colors"
          >
            再分析
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCard
          title="発見されたパターン"
          value={patternReport.totalPatterns}
          icon={
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          }
        />
        <StatCard
          title="平均勝率"
          value={`${patternReport.avgWinRate.toFixed(1)}%`}
          icon={
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          }
        />
        <StatCard
          title="分析済み取引"
          value={patternReport.totalAnalyzedTrades}
          icon={
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
          }
        />
      </div>

      {/* Top Patterns */}
      <div className="bg-[#141e27] border border-[#233648] rounded-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-white font-semibold">トップパターン</h3>
          <button
            onClick={analyzePatterns}
            className="text-primary text-sm hover:text-primary/80 transition-colors"
          >
            再分析
          </button>
        </div>
        <div className="space-y-3">
          {patternReport.topPatterns.map((pattern) => (
            <PatternCard key={pattern.id} pattern={pattern} />
          ))}
        </div>
      </div>

      {/* Last Updated */}
      <div className="text-center text-xs text-[#92adc9]">
        最終更新: {new Date(patternReport.generatedAt).toLocaleString('ja-JP')}
      </div>
    </div>
  );
}

interface StatCardProps {
  title: string;
  value: string | number;
  icon: React.ReactNode;
}

function StatCard({ title, value, icon }: StatCardProps) {
  return (
    <div className="bg-[#141e27] border border-[#233648] rounded-lg p-4">
      <div className="flex items-center gap-3 mb-2">
        <div className="w-8 h-8 bg-primary/20 rounded-lg flex items-center justify-center text-primary">
          {icon}
        </div>
        <span className="text-[#92adc9] text-sm">{title}</span>
      </div>
      <div className="text-2xl font-bold text-white">{value}</div>
    </div>
  );
}

interface PatternCardProps {
  pattern: TradePattern;
}

function PatternCard({ pattern }: PatternCardProps) {
  const getWinRateColor = (winRate: number) => {
    if (winRate >= 70) return 'text-green-500';
    if (winRate >= 50) return 'text-yellow-500';
    return 'text-red-500';
  };

  const getConfidenceBadge = (confidence: number) => {
    if (confidence >= 0.8) {
      return <span className="px-2 py-0.5 bg-green-500/20 text-green-500 text-xs rounded">高信頼度</span>;
    } else if (confidence >= 0.5) {
      return <span className="px-2 py-0.5 bg-yellow-500/20 text-yellow-500 text-xs rounded">中信頼度</span>;
    }
    return <span className="px-2 py-0.5 bg-red-500/20 text-red-500 text-xs rounded">低信頼度</span>;
  };

  return (
    <div className="bg-[#192633] border border-[#233648] rounded-lg p-4 hover:border-[#324d67] transition-colors">
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <h4 className="text-white font-medium">{pattern.name}</h4>
            {getConfidenceBadge(pattern.confidence)}
          </div>
          <p className="text-[#92adc9] text-sm">{pattern.description}</p>
        </div>
        <div className="text-right">
          <div className={cn('text-2xl font-bold', getWinRateColor(pattern.winRate))}>
            {pattern.winRate.toFixed(1)}%
          </div>
          <div className="text-[#92adc9] text-xs">勝率</div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4 pt-3 border-t border-[#233648]">
        <div>
          <div className="text-[#92adc9] text-xs mb-1">平均利益</div>
          <div className="text-white font-medium">
            {formatCurrency(pattern.avgProfit)}
          </div>
        </div>
        <div>
          <div className="text-[#92adc9] text-xs mb-1">平均利益率</div>
          <div className={cn('font-medium', pattern.avgProfitPercent >= 0 ? 'text-green-500' : 'text-red-500')}>
            {formatPercent(pattern.avgProfitPercent)}
          </div>
        </div>
        <div>
          <div className="text-[#92adc9] text-xs mb-1">サンプル数</div>
          <div className="text-white font-medium">{pattern.sampleSize}</div>
        </div>
      </div>

      {/* Pattern Factors */}
      {Object.keys(pattern.factors).length > 0 && (
        <div className="mt-3 pt-3 border-t border-[#233648]">
          <div className="flex flex-wrap gap-2">
            {Object.entries(pattern.factors).map(([key, value]) => (
              <span
                key={key}
                className="px-2 py-1 bg-[#233648] rounded text-xs text-[#92adc9]"
              >
                {key}: {String(value)}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
